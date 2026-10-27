/** Transport & abuse protections: CORS/CSRF, headers, limits, error hygiene, production safeguards. */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { loadConfig } from '../src/config';
import { startApi, STAFF, type Api } from './helpers';

let api: Api;
before(async () => {
  api = await startApi();
});
after(() => api.close());

test('CORS: allowed origins get credentials; foreign origins cannot preflight or write', async () => {
  const ok = await api.req('OPTIONS', '/v1/me/actions', { headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');
  const evilPre = await api.req('OPTIONS', '/v1/me/actions', { headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(evilPre.status, 403);
  // A cross-site form/fetch can't change state even if a cookie would be sent.
  const s = await api.loginUser();
  const evil = await api.req('POST', '/v1/me/actions', { token: s.accessToken, body: { action: { type: 'ADD_WATER', ml: 100 } }, headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.status, 403);
  const evilRefresh = await api.req('POST', '/v1/auth/refresh', { body: {}, headers: { Origin: 'https://evil.example' } });
  assert.equal(evilRefresh.status, 403);
});

test('security headers on every response; health data is never cached', async () => {
  const r = await api.req('GET', '/v1/health');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.headers.get('content-security-policy') ?? '', /default-src 'none'/);
});

test('request hygiene: size limit, JSON only, malformed JSON, unknown routes, wrong methods', async () => {
  assert.equal((await api.req('POST', '/v1/contact', { raw: JSON.stringify({ x: 'a'.repeat(600 * 1024) }) })).status, 413);
  assert.equal((await api.req('POST', '/v1/auth/login', { raw: 'email=a&password=b', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 415);
  assert.equal((await api.req('POST', '/v1/auth/login', { raw: '{bad json' })).status, 400);
  assert.equal((await api.req('GET', '/v1/nope')).status, 404);
  assert.equal((await api.req('DELETE', '/v1/health')).status, 405);
});

test('errors never leak internals', async () => {
  const r = await api.req('POST', '/v1/auth/login', { raw: '{bad json' });
  const text = JSON.stringify(r.body);
  assert.ok(!/at .*\.ts:\d+|stack|node_modules/i.test(text));
  assert.deepEqual(Object.keys(r.body.error).sort(), ['code', 'message']);
});

test('tokens are never accepted from the URL', async () => {
  const s = await api.loginUser();
  assert.equal((await api.req('GET', `/v1/me/state?access_token=${s.accessToken}`)).status, 401);
});

test('production config: demo seed refused, dev helpers absent', async () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production', SEED_DEMO: 'true' }), /must not be enabled in production/);
  const prod = loadConfig({ NODE_ENV: 'production' });
  assert.equal(prod.devTools, false);
  assert.equal(prod.seedDemo, false);
  const p = await startApi({ ...prod, port: 0 });
  try {
    assert.equal((await p.req('GET', '/v1/dev/outbox')).status, 404);
    assert.equal((await p.req('GET', '/v1/dev/mfa-code?email=x')).status, 404);
    assert.equal((await p.req('POST', '/v1/auth/login', { body: { email: 'aisha@example.com', password: 'Test-only-pass-2026' } })).status, 401, 'no demo accounts in production');
    assert.match((await p.req('GET', '/v1/health')).headers.get('strict-transport-security') ?? '', /max-age/);
  } finally {
    await p.close();
  }
});

test('contact form → support queue, validated and rate limited', async () => {
  assert.equal((await api.req('POST', '/v1/contact', { body: { name: 'A', email: 'x', topic: 'general', message: 'hi' } })).status, 400);
  const ok = await api.req('POST', '/v1/contact', { body: { name: 'Test Person', email: 'test.person@example.test', topic: 'privacy', message: 'Please export my data, thank you.' } });
  assert.equal(ok.status, 202);
  // The typed email is unverified: the ticket is never linked to an account or auto-escalated.
  const ticket = api.store.admin.support.find((s) => s.id === ok.body.reference)!;
  assert.equal(ticket.userId, 'guest');
  assert.equal(ticket.priority, 'normal');
  assert.match(ticket.subject, /^\[unverified sender\]/);
  let last = 0;
  for (let i = 0; i < api.config.rate.contactPerHour + 1; i++) last = (await api.req('POST', '/v1/contact', { body: { name: 'Test Person', email: 'test.person@example.test', topic: 'general', message: 'Spam spam spam spam' } })).status;
  assert.equal(last, 429);
});

test('global per-IP rate limit', async () => {
  const p = await startApi({ rate: { ...api.config.rate, globalPerWindow: 5 } });
  try {
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await p.req('GET', '/v1/health')).status);
    assert.ok(codes.slice(0, 5).every((c) => c === 200));
    assert.equal(codes[6], 429);
  } finally {
    await p.close();
  }
});

test('audit log never contains health values', async () => {
  const s = await api.loginUser();
  await api.act(s.accessToken, { type: 'ADD_WATER', ml: 777 });
  const st = await api.loginStaff(STAFF.owner);
  const id = api.store.byEmail('aisha@example.com')!.id;
  await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: st.accessToken, body: { reason: 'Troubleshooting a sync issue reported by the user' } });
  const dump = JSON.stringify(api.store.admin.audit);
  for (const needle of ['777', 'flowByDay', 'symptomIds', 'bbtCelsius', 'mucus', '"mood"']) assert.ok(!dump.includes(needle), needle);
});

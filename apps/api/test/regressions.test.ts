/**
 * Regression tests for the independent security reviews of the API (2026-10-26). Each test replays a
 * confirmed exploit (A–Q in the first review, R–S in the review of the four-role model) against the
 * fix, using synthetic accounts only.
 */
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { after, before, test } from 'node:test';
import { todayISO } from '@healthx/shared';
import { PRIVILEGED_CAPABILITIES, SAFETY_CHECKLIST, type ContentItem } from '@healthx/shared/admin';
import { migrateLegacyAccounts } from '../src/accounts';
import { hashPasswordAsync, verifyPasswordAsync } from '../src/crypto';
import { PW, startApi, STAFF, type Api } from './helpers';

let api: Api;
const t: Record<string, string> = {};
before(async () => {
  api = await startApi();
  for (const k of ['owner', 'admin', 'content_manager', 'reviewer', 'former_support', 'former_analyst'] as const) t[k] = (await api.loginStaff(STAFF[k])).accessToken;
});
after(() => api.close());

const NEW_PW = 'Synthetic#Pass2026';
const allChecked = () => Object.fromEntries(SAFETY_CHECKLIST.map((s) => [s.key, true]));
const get = (id: string) => api.store.admin.content.find((c) => c.id === id)!;
const move = (token: string, id: string, patch: Partial<ContentItem>) => api.adminAct(token, { type: 'UPSERT_CONTENT', item: { ...get(id), ...patch } });
const register = (email: string, name = 'Synthetic Tester') =>
  api.req('POST', '/v1/auth/register', { body: { name, email, password: NEW_PW, acceptTerms: true }, headers: { 'X-Client': 'mobile' } });
/** Token from the newest outbox message to `to` whose subject matches. */
const linkToken = (to: string, subject: RegExp, param: string) => new URL(api.store.outbox.find((m) => m.to === to && subject.test(m.subject))!.link).searchParams.get(param)!;
const draft = (id: string): ContentItem => ({
  id,
  title: `Regression article ${id}`,
  description: 'Synthetic test content.',
  type: 'article',
  category: 'cycle',
  topic: 'Period basics',
  tags: [],
  durationMin: 3,
  lifeStage: 'all',
  language: 'English',
  author: 'ignored',
  medicalReviewer: '',
  reviewDate: null,
  references: ['Synthetic reference'],
  publishedDate: null,
  updatedDate: '2026-01-01',
  scheduledFor: null,
  status: 'draft',
  version: 1,
  body: 'Original text by the content manager.',
  media: null,
  safetyChecks: {},
  history: [],
});
/** Raw request so the Host header can be set (fetch doesn't allow it). */
const rawStatus = (path: string, headers: Record<string, string>) =>
  new Promise<number>((resolve, reject) => {
    const req = request(api.url + path, { headers }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.end();
  });

test('A · authenticator codes are limited per account, not per sign-in attempt', async () => {
  const email = STAFF.former_analyst;
  const acc = api.store.byEmail(email)!;
  const wrong = () => String((Number(api.mfaCode(email)) + 500_000) % 1_000_000).padStart(6, '0');
  let locked = false;
  for (let round = 0; round < 4 && !locked; round++) {
    const l = await api.req('POST', '/v1/auth/login', { body: { email, password: PW } });
    if (l.status === 429) locked = true;
    for (let i = 0; i < 5 && !locked; i++) if ((await api.req('POST', '/v1/auth/mfa/verify', { body: { mfaToken: l.body.mfaToken, code: wrong() } })).status === 429) locked = true;
  }
  assert.ok(locked, `locked after ${api.config.rate.mfaFailuresPerAccount} wrong codes across sign-ins`);
  assert.equal((await api.req('POST', '/v1/auth/login', { body: { email, password: PW } })).status, 429, 'the right password doesn’t reset the lock');
  assert.ok(api.store.admin.audit.some((e) => e.action === 'staff.mfa_lockout' && e.actorId === acc.id));
  acc.mfaLockedUntil = 0; // end the lock created by this test
  await api.loginStaff(email);
});

test('B · registering someone else’s email can’t pre-hijack their account', async () => {
  const victim = 'victim.preclaim@example.test';
  const reg = await register(victim, 'Attacker');
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.emailVerified, false);
  const sess = api.store.sessionByRefresh(reg.body.refreshToken).session!;
  assert.ok(sess.refreshExp - Date.now() <= api.config.unverifiedRefreshTtlMs, 'short refresh lifetime until verified');
  // The real owner signs in with a link sent to their inbox…
  await api.req('POST', '/v1/auth/magic-link', { body: { email: victim } });
  const v = await api.req('POST', '/v1/auth/magic-link/verify', { body: { token: linkToken(victim, /sign-in link/, 'magic') }, headers: { 'X-Client': 'mobile' } });
  assert.equal(v.status, 200);
  assert.equal(v.body.user.emailVerified, true);
  // …which ends the earlier sessions and removes the password set by whoever registered.
  assert.equal((await api.req('GET', '/v1/me/state', { token: reg.body.accessToken })).status, 401);
  assert.equal((await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: reg.body.refreshToken } })).status, 401);
  assert.equal((await api.req('POST', '/v1/auth/login', { body: { email: victim, password: NEW_PW } })).status, 401);
  assert.equal((await api.req('GET', '/v1/me/state', { token: v.body.accessToken })).status, 200);
});

test('B · email verification link is single-use', async () => {
  const addr = 'verify.flow@example.test';
  assert.equal((await register(addr)).status, 201);
  const token = linkToken(addr, /Confirm your HealthX email/, 'token');
  assert.equal((await api.req('POST', '/v1/auth/verify-email', { body: { token } })).status, 200);
  assert.equal(api.store.byEmail(addr)!.emailVerified, true);
  assert.equal((await api.req('POST', '/v1/auth/verify-email', { body: { token } })).status, 400);
});

test('C · reviewer name and version history are server-written', async () => {
  const live = api.store.admin.content.find((c) => c.status === 'published')!;
  const reviewer = live.medicalReviewer;
  const n = api.store.admin.audit.length;
  assert.equal((await move(t.content_manager, live.id, { medicalReviewer: 'Dr. Forged Name' })).status, 200);
  assert.equal(get(live.id).medicalReviewer, reviewer);
  assert.equal(api.store.admin.audit.length, n, 'a request that changes nothing writes no audit entry');
  const versions = live.versions?.length ?? 0;
  const forged = [{ version: 99, title: 'Forged', description: '', body: 'Forged history', savedAt: '2020-01-01', savedBy: 'Someone else' }];
  const r = await move(t.content_manager, live.id, { body: 'New wording for the next version.', version: live.version + 1, status: 'medical_review', versions: forged });
  assert.equal(r.status, 200);
  const next = get(live.id);
  assert.equal(next.versions!.length, versions + 1, 'one server snapshot added');
  assert.equal(next.versions!.at(-1)!.body, live.body, 'the snapshot is the previous live text');
  assert.ok(!JSON.stringify(next.versions).includes('Forged'));
  assert.equal(next.medicalReviewer, '', 'the new version has no reviewer until it is reviewed');
});

test('D · whoever edited a version can’t approve it, and medical + compliance approval are two people', async () => {
  assert.equal((await api.adminAct(t.content_manager, { type: 'UPSERT_CONTENT', item: draft('sod1') })).status, 200);
  assert.equal((await move(t.admin, 'sod1', { body: 'Text rewritten by the admin.' })).status, 200);
  assert.equal((await move(t.admin, 'sod1', { status: 'medical_review' })).status, 200);
  assert.equal((await move(t.reviewer, 'sod1', { status: 'compliance_review', safetyChecks: allChecked() })).status, 200);
  const own = await move(t.admin, 'sod1', { status: 'published' });
  assert.equal(own.status, 403);
  assert.match(own.body.error.message, /wrote or edited/);
  assert.equal((await api.req('GET', '/v1/content/sod1')).status, 404);
  // Test setup: the Medical Content Reviewer role also holds compliance_review.
  const defaults = api.store.admin.permissions;
  api.store.admin.permissions = { ...defaults, medical_content_reviewer: [...defaults.medical_content_reviewer, 'compliance_review'] };
  const twice = await move(t.reviewer, 'sod1', { status: 'approved' });
  api.store.admin.permissions = defaults;
  assert.equal(twice.status, 403);
  assert.match(twice.body.error.message, /someone other than the medical reviewer/);
  assert.equal((await move(t.owner, 'sod1', { status: 'approved' })).status, 200, 'an uninvolved person can');
});

test('E · approving a template publishes exactly the proposed wording', async () => {
  const tpl = api.store.admin.templates.find((x) => x.healthRelated && x.status === 'live')!;
  const cur = () => api.store.admin.templates.find((x) => x.key === tpl.key)!;
  assert.equal((await api.adminAct(t.content_manager, { type: 'UPSERT_TEMPLATE', template: { ...tpl, status: 'pending_review', proposed: { title: 'Proposed title', body: 'Proposed body' } } })).status, 200);
  const sneaky = await api.adminAct(t.reviewer, { type: 'UPSERT_TEMPLATE', template: { ...cur(), status: 'live', title: 'Reviewer-only title', body: 'Text nobody proposed', discreetBody: 'Unreviewed discreet text' } });
  assert.equal(sneaky.status, 409);
  assert.equal((await api.adminAct(t.reviewer, { type: 'UPSERT_TEMPLATE', template: { ...cur(), status: 'live', title: 'Proposed title', body: 'Proposed body' } })).status, 200);
  assert.equal(cur().status, 'live');
  assert.equal(cur().title, 'Proposed title');
  assert.equal(cur().body, 'Proposed body');
  assert.equal(cur().discreetBody, tpl.discreetBody);
  assert.equal(cur().version, tpl.version + 1);
});

test('F · erasure only happens by completing a tracked deletion request, and it scrubs copies of the identity', async () => {
  const addr = 'delete.me@example.test';
  const reg = await register(addr, 'Deletable Person');
  const id = reg.body.user.id;
  const contact = await api.req('POST', '/v1/contact', { body: { name: 'Deletable Person', email: addr, topic: 'account', message: 'Please help me with my account.' } });
  assert.equal((await api.adminAct(t.former_support, { type: 'UPDATE_USER', id, patch: { status: 'deleted' } })).status, 409);
  assert.ok(api.store.userStates.has(id), 'no direct hard delete');
  assert.equal((await api.adminAct(t.former_support, { type: 'UPDATE_USER', id, patch: { status: 'deletion_pending' } })).status, 200);
  const pr = api.store.admin.privacy.find((p) => p.userId === id && p.type === 'deletion' && p.status === 'new')!;
  assert.ok(pr, 'a deletion request is opened');
  // Two-person rule: whoever opened it can't also complete it.
  assert.equal((await api.adminAct(t.former_support, { type: 'UPSERT_PRIVACY', request: { ...pr, status: 'completed' } })).status, 403);
  assert.ok(api.store.userStates.has(id), 'still not erased');
  assert.equal((await api.adminAct(t.admin, { type: 'UPSERT_PRIVACY', request: { ...pr, status: 'completed' } })).status, 200);
  assert.equal(api.store.accounts.get(id)!.status, 'deleted');
  assert.ok(!api.store.userStates.has(id));
  const ticket = JSON.stringify(api.store.admin.support.find((s) => s.id === contact.body.reference));
  assert.ok(!ticket.includes(addr) && !ticket.includes('Deletable Person'), 'support copy scrubbed');
  assert.ok(!api.store.outbox.some((m) => m.to === addr), 'queued emails removed');
});

test('G · app-user writes must reference existing records; state size and write rate are capped', async () => {
  const u = (await api.loginUser()).accessToken;
  const today = todayISO();
  for (const a of [
    { type: 'LOG_SYMPTOMS', date: today, entries: [{ symptomId: 'x'.repeat(90), severity: 'mild' }] },
    { type: 'TOGGLE_HABIT', habitId: 'nope', date: today },
    { type: 'TOGGLE_BOOKMARK', articleId: 'nope' },
    { type: 'MARK_ARTICLE_READ', articleId: 'nope' },
    { type: 'DISMISS_INSIGHT', id: 'anything-at-all' },
    { type: 'TOGGLE_LIKE_POST', id: 'nope' },
    { type: 'BLOCK_AUTHOR', author: 'Nobody' },
  ]) {
    assert.equal((await api.act(u, a)).status, 404, a.type);
  }
  const small = await startApi();
  try {
    const s = (await small.loginUser()).accessToken;
    small.config.limits.maxUserStateBytes = Buffer.byteLength(JSON.stringify(small.store.userStates.get('usr_aisha'))) + 20_000;
    let status = 200;
    for (let i = 0; i < 400 && status === 200; i++) status = (await small.act(s, { type: 'ADD_MEAL', meal: { date: today, meal: 'snack', name: 'n'.repeat(100), kcal: 1, protein: 1, carbs: 1, fat: 1, fiber: 1 } })).status;
    assert.equal(status, 413);
  } finally {
    await small.close();
  }
  const limited = await startApi({ rate: { ...api.config.rate, userWritesPerWindow: 3 } });
  try {
    const s = (await limited.loginUser()).accessToken;
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await limited.act(s, { type: 'ADD_WATER', ml: 100 })).status);
    assert.deepEqual(codes, [200, 200, 200, 429]);
  } finally {
    await limited.close();
  }
});

test('H · development helpers answer only to this machine', async () => {
  assert.equal((await api.req('GET', '/v1/dev/outbox')).status, 200);
  assert.equal((await api.req('GET', '/v1/dev/outbox', { headers: { 'X-Forwarded-For': '203.0.113.9' } })).status, 404, 'proxied for a remote client');
  assert.equal(await rawStatus('/v1/dev/outbox', { Host: 'attacker.example' }), 404, 'DNS rebinding');
  assert.equal(await rawStatus(`/v1/dev/mfa-code?email=${encodeURIComponent(STAFF.owner)}`, { Host: 'attacker.example:4000' }), 404);
});

test('J · staff can’t create support requests or change whose request it is', async () => {
  const forged = await api.adminAct(t.former_support, {
    type: 'UPSERT_SUPPORT',
    request: { id: 'sr_forged', status: 'open', priority: 'high', userId: 'usr_aisha', userName: 'Aisha Kapoor', userEmail: 'aisha@example.com', type: 'data_export', subject: 'x', createdAt: '2020-01-01', channel: 'email', assignee: null, notes: [] },
  });
  assert.equal(forged.status, 404);
  const real = api.store.admin.support[0];
  const r = await api.adminAct(t.former_support, { type: 'UPSERT_SUPPORT', request: { ...real, userEmail: 42, userId: 'usr_aisha', createdAt: '2020-01-01', extra: { anything: 1 }, status: 'in_progress' } });
  assert.equal(r.status, 200);
  const now = api.store.admin.support.find((x) => x.id === real.id)!;
  assert.equal(now.status, 'in_progress');
  assert.equal(now.userEmail, real.userEmail);
  assert.equal(now.userId, real.userId);
  assert.equal(now.createdAt, real.createdAt);
  assert.ok(!('extra' in now));
  for (const k of ['owner', 'former_support']) assert.equal((await api.req('GET', '/v1/admin/state', { token: t[k] })).status, 200, k);
});

test('K · staff can’t take another person’s name; audit entries carry the account id', async () => {
  const sa = api.store.byEmail(STAFF.owner)!;
  const cm = api.store.byEmail(STAFF.content_manager)!;
  const other = api.store.byEmail(STAFF.reviewer)!.name;
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: cm.id, patch: { name: other } })).status, 409);
  // Renaming yourself is refused before any name check: nobody changes their own account (see R).
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: sa.id, patch: { name: other } })).status, 403);
  const flag = api.store.admin.flags[0];
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_FLAG', key: flag.key, env: 'dev', patch: { rollout: (flag.env.dev.rollout + 7) % 100 } })).status, 200);
  const e = api.store.admin.audit[0];
  assert.equal(e.action, 'flag.update');
  assert.equal(e.actorId, sa.id);
  assert.equal(e.actorEmail, sa.email);
});

test('L · prototype keys in record routes are just “not found”', async () => {
  const u = (await api.loginUser()).accessToken;
  for (const c of ['__proto__', 'constructor', 'hasOwnProperty', 'toString']) assert.equal((await api.req('GET', `/v1/me/records/${c}/x`, { token: u })).status, 404, c);
});

test('M · withdrawing the integrations consent disconnects every health source', async () => {
  const reg = await register('consent.flow@example.test');
  const tok = reg.body.accessToken;
  const state = () => api.store.userStates.get(reg.body.user.id)!;
  assert.equal((await api.act(tok, { type: 'SET_CONSENT', id: 'health_integrations', granted: true })).status, 200);
  const conn = state().connections.find((c) => !c.connected && c.phase !== 3)!;
  assert.equal((await api.act(tok, { type: 'TOGGLE_CONNECTION', id: conn.id })).status, 200);
  assert.ok(state().connections.find((c) => c.id === conn.id)!.connected);
  assert.equal((await api.act(tok, { type: 'SET_CONSENT', id: 'health_integrations', granted: false })).status, 200);
  assert.ok(state().connections.every((c) => !c.connected));
});

test('N · length limits count the stored text, not the trimmed text', async () => {
  const u = (await api.loginUser()).accessToken;
  const padded = 'ab' + ' '.repeat(100_000);
  assert.equal((await api.act(u, { type: 'ADD_GOAL', goal: { title: padded, metric: 'steps', target: 1, unit: 'x', period: 'daily' } })).status, 400);
  assert.equal((await api.act(u, { type: 'UPDATE_PROFILE', patch: { name: padded } })).status, 400);
});

test('O · deeply nested or malformed taxonomy can’t poison the admin console', async () => {
  const deep = '['.repeat(20_000) + ']'.repeat(20_000);
  const raw = `{"action":{"type":"SET_TAXONOMY","taxonomy":{"categories":[${deep}],"tags":[]}}}`;
  const r = await api.req('POST', '/v1/admin/actions', { token: t.content_manager, raw });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /nested too deeply/);
  assert.equal((await api.adminAct(t.content_manager, { type: 'SET_TAXONOMY', taxonomy: { categories: [[[]]], tags: [] } })).status, 400);
  assert.equal((await api.adminAct(t.content_manager, { type: 'SET_TAXONOMY', taxonomy: { categories: [], tags: [] } })).status, 409, 'built-in categories stay');
  for (const k of ['owner', 'former_analyst', 'content_manager']) assert.equal((await api.req('GET', '/v1/admin/state', { token: t[k] })).status, 200, k);
});

test('P · no-op writes leave no audit entry; the log is never truncated; admin writes are rate limited', async () => {
  const me = STAFF.former_analyst;
  await api.adminAct(t.former_analyst, { type: 'UPDATE_ACCOUNT', email: me, patch: { language: 'English' } });
  const n = api.store.admin.audit.length;
  for (let i = 0; i < 5; i++) assert.equal((await api.adminAct(t.former_analyst, { type: 'UPDATE_ACCOUNT', email: me, patch: { language: 'English' } })).status, 200);
  assert.equal(api.store.admin.audit.length, n);
  for (const patch of [{ passwordChangedAt: '2030-01-01' }, { sessions: [] }]) assert.equal((await api.adminAct(t.former_analyst, { type: 'UPDATE_ACCOUNT', email: me, patch })).status, 400, Object.keys(patch)[0]);
  const marker = api.store.admin.audit[0].id;
  for (let i = 0; i < 6000; i++) api.store.audit({ actor: 'Regression test', role: 'system', action: 'test.fill', target: 'x' }, '127.0.0.1');
  assert.ok(api.store.admin.audit.some((e) => e.id === marker), 'older entries are kept');
  api.store.admin.audit = api.store.admin.audit.filter((e) => e.action !== 'test.fill'); // remove only this test's entries
  const limited = await startApi({ rate: { ...api.config.rate, adminWritesPerWindow: 2 } });
  try {
    const s = (await limited.loginStaff(STAFF.admin)).accessToken;
    const flag = limited.store.admin.flags[0].key;
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await limited.adminAct(s, { type: 'UPDATE_FLAG', key: flag, env: 'dev', patch: { rollout: 10 + i } })).status);
    assert.deepEqual(codes, [200, 200, 429]);
  } finally {
    await limited.close();
  }
});

test('Q · password spraying is limited per address and per account; hashing is asynchronous', async () => {
  const p = await startApi({ rate: { ...api.config.rate, loginFailuresPerIp: 10, loginPerAccount: 5 } });
  try {
    const spray: number[] = [];
    for (let i = 0; i < 12; i++) spray.push((await p.req('POST', '/v1/auth/login', { body: { email: `spray${i}@example.test`, password: 'Guess-1234' } })).status);
    assert.equal(spray.at(-1), 429, 'one address, many accounts');
    const one: number[] = [];
    for (let i = 0; i < 6; i++) one.push((await p.req('POST', '/v1/auth/login', { body: { email: 'aisha@example.com', password: 'Guess-1234' }, headers: { 'X-Forwarded-For': `198.51.100.${i + 1}` } })).status);
    assert.equal(one.at(-1), 429, 'one account, many addresses');
  } finally {
    await p.close();
  }
  const h = await hashPasswordAsync('x-password-1');
  assert.equal(await verifyPasswordAsync('x-password-1', h), true);
  assert.equal(await verifyPasswordAsync('wrong-password', h), false);
});

test('staff deactivation ends sessions at once and blocks sign-in until reactivated', async () => {
  const s = await api.loginStaff(STAFF.content_manager2);
  const acc = api.store.byEmail(STAFF.content_manager2)!;
  assert.equal((await api.adminAct(t.admin, { type: 'UPDATE_STAFF', id: acc.id, patch: { status: 'deactivated' } })).status, 403, 'needs manage_staff');
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: acc.id, patch: { status: 'deactivated' } })).status, 200);
  assert.equal((await api.req('GET', '/v1/admin/state', { token: s.accessToken })).status, 401);
  assert.equal((await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: s.refreshToken } })).status, 401);
  assert.equal((await api.req('POST', '/v1/auth/login', { body: { email: STAFF.content_manager2, password: PW } })).status, 403);
  const staff = (await api.req('GET', '/v1/admin/state', { token: t.owner })).body.state.staff;
  assert.equal(staff.find((m: { id: string }) => m.id === acc.id).status, 'deactivated');
  assert.ok(api.store.admin.audit.some((e) => e.action === 'staff.deactivate' && e.target === acc.email));
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: acc.id, patch: { status: 'active' } })).status, 200);
  await api.loginStaff(STAFF.content_manager2);
  const sa = api.store.byEmail(STAFF.owner)!;
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: sa.id, patch: { status: 'deactivated' } })).status, 403, 'not yourself');
});

test('staff sessions end after the idle timeout and after the absolute lifetime', async () => {
  const s = await api.loginStaff(STAFF.former_support);
  api.store.sessionByRefresh(s.refreshToken).session!.lastSeenAt = new Date(Date.now() - (api.store.admin.settings.sessionTimeoutMin + 1) * 60_000).toISOString();
  assert.equal((await api.req('GET', '/v1/admin/state', { token: s.accessToken })).status, 401, 'idle too long');
  const s2 = await api.loginStaff(STAFF.admin2);
  api.store.sessionByRefresh(s2.refreshToken).session!.absoluteExp = Date.now() - 1;
  assert.equal((await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: s2.refreshToken } })).status, 401, 'past the absolute lifetime');
});

test('changing the password invalidates outstanding reset links', async () => {
  const addr = 'pw.change@example.test';
  const reg = await register(addr);
  await api.req('POST', '/v1/auth/password/forgot', { body: { email: addr } });
  const token = linkToken(addr, /Reset your HealthX password/, 'token');
  assert.equal((await api.req('POST', '/v1/auth/password/change', { token: reg.body.accessToken, body: { currentPassword: NEW_PW, newPassword: 'Another#Pass2027' } })).status, 204);
  assert.equal((await api.req('POST', '/v1/auth/password/reset', { body: { token, newPassword: 'Attacker#Pass2028' } })).status, 400);
});

test('the free trial ends on the server and can be used once', async () => {
  const addr = 'trial.flow@example.test';
  const reg = await register(addr);
  const tok = reg.body.accessToken;
  assert.equal((await api.req('POST', '/v1/me/subscription/trial', { token: tok })).status, 200);
  assert.equal((await api.req('GET', '/v1/me/state', { token: tok })).body.state.profile.plan, 'premium');
  api.store.byEmail(addr)!.trialEndsAt = new Date(Date.now() - 1000).toISOString();
  assert.equal((await api.req('GET', '/v1/me/state', { token: tok })).body.state.profile.plan, 'free');
  assert.equal((await api.req('POST', '/v1/me/subscription/trial', { token: tok })).status, 409);
});

test('campaigns: no simulated “sent” state and no client-supplied reach or delivery numbers', async () => {
  const base = { ...api.store.admin.campaigns[0], id: 'cmp_regression', reach: 999_999, delivered: 999_999, opened: 999_999 };
  assert.equal((await api.adminAct(t.admin, { type: 'UPSERT_CAMPAIGN', campaign: { ...base, status: 'sent' } })).status, 501);
  const at = new Date(Date.now() + 3600_000).toISOString();
  assert.equal((await api.adminAct(t.admin, { type: 'UPSERT_CAMPAIGN', campaign: { ...base, status: 'scheduled', schedule: at } })).status, 200);
  const saved = api.store.admin.campaigns.find((c) => c.id === 'cmp_regression')!;
  assert.notEqual(saved.reach, 999_999);
  assert.equal(saved.delivered, undefined);
  assert.equal(saved.opened, undefined);
});

test('permission matrix: nobody edits their own role; privileged permissions belong to individual Admins', async () => {
  assert.equal((await api.adminAct(t.owner, { type: 'SET_PERMISSION', role: 'admin', cap: 'medical_review', granted: true })).status, 403);
  // A role row can never carry privileged permissions — even if the matrix is edited behind the API's back.
  const defaults = api.store.admin.permissions;
  api.store.admin.permissions = { ...defaults, admin: [...defaults.admin, 'manage_permissions'] };
  try {
    assert.equal((await api.adminAct(t.admin, { type: 'SET_PERMISSION', role: 'content_manager', cap: 'view_users', granted: true })).status, 403, 'privileges never come from a role row');
  } finally {
    api.store.admin.permissions = defaults;
  }
  // Test setup: Alex (Admin) holds manage_permissions as an individual privilege.
  const alex = api.store.byEmail(STAFF.admin)!;
  alex.privileges = ['manage_permissions'];
  try {
    assert.equal((await api.adminAct(t.admin, { type: 'SET_PERMISSION', role: 'content_manager', cap: 'manage_permissions', granted: true })).status, 403, 'privileged permissions never go in a row');
    assert.equal((await api.adminAct(t.admin, { type: 'SET_PERMISSION', role: 'admin', cap: 'view_users', granted: false })).status, 403, 'own role');
    assert.equal((await api.adminAct(t.admin, { type: 'SET_PERMISSION', role: 'content_manager', cap: 'view_staff', granted: true })).status, 200);
    assert.equal((await api.adminAct(t.admin, { type: 'RESET_PERMISSIONS' })).status, 200);
  } finally {
    alex.privileges = [];
  }
});

test('R · renaming staff is checked like any other staff change, and names can’t impersonate a colleague', async () => {
  const owner = api.store.byEmail(STAFF.owner)!;
  const alex = api.store.byEmail(STAFF.admin)!;
  const cm = api.store.byEmail(STAFF.content_manager)!;
  const taken = api.store.byEmail(STAFF.reviewer)!.name;
  const names = () => [owner.name, alex.name, cm.name];
  const original = names();
  const auditLen = api.store.admin.audit.length;
  const rename = (id: string, name: string) => api.adminAct(t.admin, { type: 'UPDATE_STAFF', id, patch: { name } });
  // Test setup: Alex (Admin) manages staff but holds no other privileged permission.
  alex.privileges = ['manage_staff'];
  try {
    assert.equal((await rename(owner.id, 'Renamed Owner')).status, 403, 'someone holding powers Alex lacks');
    assert.equal((await rename(alex.id, 'Self Renamed')).status, 403, 'own account');
    // Lookalikes of a colleague's name count as that name.
    const fullWidth = [...taken].map((c) => (c === ' ' ? c : String.fromCharCode(c.charCodeAt(0) + 0xfee0))).join('');
    for (const lookalike of [taken.replace(' ', '​ '), taken.toUpperCase().replace(' ', '   '), fullWidth]) {
      assert.equal((await rename(cm.id, lookalike)).status, 409, JSON.stringify(lookalike));
    }
    const invite = { type: 'INVITE_STAFF', member: { name: taken.replace(' ', '⁠ '), email: 'lookalike.reviewer@healthx.example', role: 'medical_content_reviewer' } };
    assert.equal((await api.adminAct(t.admin, invite)).status, 409, 'invite');
    // Text-direction overrides and invisible-only names are refused outright.
    assert.equal((await rename(cm.id, '‮' + [...taken].reverse().join(''))).status, 400);
    assert.equal((await rename(cm.id, '​​​')).status, 400);
    // A refused part refuses the whole change: a role change can't slip through next to a taken name.
    assert.equal((await api.adminAct(t.admin, { type: 'UPDATE_STAFF', id: cm.id, patch: { role: 'medical_content_reviewer', name: taken } })).status, 409);
    assert.equal(cm.role, 'content_manager');
    assert.deepEqual(names(), original, 'no name changed');
    assert.equal(api.store.admin.audit.length, auditLen, 'refused changes leave no audit entry');
    // A legitimate rename works and is audited under the real actor.
    assert.equal((await rename(cm.id, `${original[2]} N.`)).status, 200);
    assert.ok(api.store.admin.audit.some((e) => e.action === 'staff.update' && e.actorId === alex.id && e.detail === `name: ${original[2]} → ${original[2]} N.`));
  } finally {
    alex.privileges = [];
    cm.name = original[2];
  }
});

test('S · migration carries privileged permissions over only for a former Super Admin', async () => {
  const p = await startApi();
  try {
    const neha = await p.loginStaff(STAFF.former_support);
    // Records stored before the consolidation — some carrying stray privileged permissions.
    const legacy: [string, string, string[]][] = [
      [STAFF.owner, 'super_admin', []],
      [STAFF.former_support, 'support_agent', ['manage_staff', 'break_glass']],
      [STAFF.former_analyst, 'analyst', ['manage_permissions']],
      [STAFF.reviewer, 'medical_reviewer', ['manage_settings']],
    ];
    for (const [email, role, privileges] of legacy) Object.assign(p.store.byEmail(email)!, { role, privileges });
    migrateLegacyAccounts(p.store);
    assert.deepEqual([...p.store.byEmail(STAFF.owner)!.privileges].sort(), [...PRIVILEGED_CAPABILITIES].sort());
    for (const who of ['former_support', 'former_analyst', 'reviewer'] as const) assert.deepEqual(p.store.byEmail(STAFF[who])!.privileges, [], who);
    // The migrated session can't use them either.
    const invite = { type: 'INVITE_STAFF', member: { name: 'Not Invited', email: 'not.invited@healthx.example', role: 'content_manager' } };
    assert.equal((await p.adminAct(neha.accessToken, invite)).status, 403);
    const userId = p.store.byEmail('aisha@example.com')!.id;
    const glass = await p.req('POST', `/v1/admin/users/${userId}/break-glass`, { token: neha.accessToken, body: { reason: 'Regression test — must be refused.' } });
    assert.equal(glass.status, 403);
  } finally {
    await p.close();
  }
});

/** Authentication & session integration tests (SRS §47/§48, plan MVP-01, A-04). */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { PW, startApi, STAFF, type Api } from './helpers';

let api: Api;
before(async () => {
  api = await startApi({ accessTtlMs: 1500 });
});
after(() => api.close());

test('register: validates input, rejects duplicates, starts a fresh account at onboarding', async () => {
  const bad = await api.req('POST', '/v1/auth/register', { body: { name: 'A', email: 'nope', password: 'x', acceptTerms: true } });
  assert.equal(bad.status, 400);
  const noTerms = await api.req('POST', '/v1/auth/register', { body: { name: 'Test One', email: 'test.one@example.test', password: 'Wellness#2026', acceptTerms: false } });
  assert.equal(noTerms.status, 400);
  const ok = await api.req('POST', '/v1/auth/register', { body: { name: 'Test One', email: 'test.one@example.test', password: 'Wellness#2026', acceptTerms: true }, headers: { 'X-Client': 'mobile' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.user.role, 'end_user');
  assert.ok(ok.body.accessToken && ok.body.refreshToken);
  const st = await api.req('GET', '/v1/me/state', { token: ok.body.accessToken });
  assert.equal(st.status, 200);
  assert.equal(st.body.state.auth.onboarded, false);
  assert.equal(st.body.state.periods.length, 0);
  const dup = await api.req('POST', '/v1/auth/register', { body: { name: 'Test One', email: 'TEST.ONE@example.test', password: 'Wellness#2026', acceptTerms: true } });
  assert.equal(dup.status, 409);
  assert.equal(api.store.byEmail('test.one@example.test')!.passwordHash!.startsWith('scrypt$'), true, 'password is stored hashed');
});

test('register ignores any role/status the client tries to set', async () => {
  const r = await api.req('POST', '/v1/auth/register', { body: { name: 'Evil', email: 'evil@example.test', password: 'Wellness#2026', acceptTerms: true, role: 'super_admin' } });
  assert.equal(r.status, 400, 'unknown fields are rejected');
});

test('login: generic error for wrong password and unknown email', async () => {
  const a = await api.req('POST', '/v1/auth/login', { body: { email: 'aisha@example.com', password: 'wrong-password' } });
  const b = await api.req('POST', '/v1/auth/login', { body: { email: 'nobody@example.test', password: 'wrong-password' } });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.error.message, b.body.error.message);
});

test('login: repeated failures are rate-limited (lockout)', async () => {
  const email = 'riya.test@example.com';
  let last = 0;
  for (let i = 0; i < api.config.rate.loginAttempts + 1; i++) last = (await api.req('POST', '/v1/auth/login', { body: { email, password: 'wrong-password' } })).status;
  assert.equal(last, 429);
  const evenRight = await api.req('POST', '/v1/auth/login', { body: { email, password: PW } });
  assert.equal(evenRight.status, 429, 'correct password still blocked during lockout');
  assert.ok(evenRight.headers.get('retry-after'));
  api.store.rate.reset(`login:127.0.0.1:${email}`);
  api.store.rate.reset(`login:::1:${email}`);
  api.store.rate.reset(`login:::ffff:127.0.0.1:${email}`);
});

test('staff: password alone is not enough — MFA required, wrong and replayed codes fail', async () => {
  const r1 = await api.req('POST', '/v1/auth/login', { body: { email: STAFF.admin, password: PW } });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.mfaRequired, true);
  assert.equal(r1.body.accessToken, undefined);
  const code = api.mfaCode(STAFF.admin);
  const wrong = await api.req('POST', '/v1/auth/mfa/verify', { body: { mfaToken: r1.body.mfaToken, code: code === '123456' ? '654321' : '123456' } });
  assert.equal(wrong.status, 401);
  const ok = await api.req('POST', '/v1/auth/mfa/verify', { body: { mfaToken: r1.body.mfaToken, code } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.accessToken);
  // Same code again on a new sign-in attempt → replay rejected.
  const r2 = await api.req('POST', '/v1/auth/login', { body: { email: STAFF.admin, password: PW } });
  const replay = await api.req('POST', '/v1/auth/mfa/verify', { body: { mfaToken: r2.body.mfaToken, code } });
  assert.equal(replay.status, 401);
  // The used MFA token can't be reused either.
  const reuse = await api.req('POST', '/v1/auth/mfa/verify', { body: { mfaToken: r1.body.mfaToken, code } });
  assert.equal(reuse.status, 401);
});

test('magic links are not available for staff accounts', async () => {
  await api.req('POST', '/v1/auth/magic-link', { body: { email: STAFF.owner } });
  assert.equal(api.store.outbox.filter((m) => m.to === STAFF.owner).length, 0);
});

test('refresh: rotates tokens; reusing an old refresh token revokes the whole session family', async () => {
  const s = await api.loginUser();
  const r1 = await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: s.refreshToken } });
  assert.equal(r1.status, 200);
  assert.notEqual(r1.body.refreshToken, s.refreshToken);
  const reuse = await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: s.refreshToken } });
  assert.equal(reuse.status, 401);
  const afterTheft = await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: r1.body.refreshToken } });
  assert.equal(afterTheft.status, 401, 'the legitimate newer token is revoked too');
  const st = await api.req('GET', '/v1/me/state', { token: r1.body.accessToken });
  assert.equal(st.status, 401);
});

test('access tokens expire; refresh issues a new one', async () => {
  const s = await api.loginUser();
  assert.equal((await api.req('GET', '/v1/auth/me', { token: s.accessToken })).status, 200);
  await new Promise((r) => setTimeout(r, 1700));
  assert.equal((await api.req('GET', '/v1/auth/me', { token: s.accessToken })).status, 401, 'expired access token');
  const r = await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: s.refreshToken } });
  assert.equal(r.status, 200);
  assert.equal((await api.req('GET', '/v1/auth/me', { token: r.body.accessToken })).status, 200);
});

test('web clients get the refresh token only as an HttpOnly SameSite=Strict cookie', async () => {
  const r = await api.req('POST', '/v1/auth/login', { body: { email: 'aisha@example.com', password: PW }, headers: { 'X-Client': 'web' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.refreshToken, undefined);
  const cookie = r.headers.get('set-cookie') ?? '';
  assert.match(cookie, /hx_rt=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const refreshed = await api.req('POST', '/v1/auth/refresh', { headers: { Cookie: cookie.split(';')[0], 'X-Client': 'web' } });
  assert.equal(refreshed.status, 200);
});

test('logout revokes the session; logout-all revokes every device', async () => {
  const a = await api.loginUser();
  const b = await api.loginUser();
  assert.equal((await api.req('POST', '/v1/auth/logout', { token: a.accessToken })).status, 204);
  assert.equal((await api.req('GET', '/v1/me/state', { token: a.accessToken })).status, 401);
  assert.equal((await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: a.refreshToken } })).status, 401);
  assert.equal((await api.req('GET', '/v1/me/state', { token: b.accessToken })).status, 200, 'other device still signed in');
  const c = await api.loginUser();
  assert.equal((await api.req('POST', '/v1/auth/logout-all', { token: c.accessToken })).status, 204);
  assert.equal((await api.req('GET', '/v1/me/state', { token: b.accessToken })).status, 401);
});

test('sessions list + revoking a session id that belongs to someone else returns 404', async () => {
  const a = await api.loginUser('aisha@example.com');
  const r = await api.loginUser('riya.test@example.com');
  const list = await api.req('GET', '/v1/auth/sessions', { token: r.accessToken });
  const riyaSession = list.body.sessions.find((s: { current: boolean }) => s.current).id;
  assert.equal((await api.req('DELETE', `/v1/auth/sessions/${riyaSession}`, { token: a.accessToken })).status, 404);
  assert.equal((await api.req('GET', '/v1/me/state', { token: r.accessToken })).status, 200);
});

test('password reset: generic response, single-use token, old sessions revoked', async () => {
  const s = await api.loginUser('riya.test@example.com');
  const unknown = await api.req('POST', '/v1/auth/password/forgot', { body: { email: 'nobody@example.test' } });
  const known = await api.req('POST', '/v1/auth/password/forgot', { body: { email: 'riya.test@example.com' } });
  assert.equal(unknown.status, 202);
  assert.deepEqual(unknown.body, known.body);
  const link = api.store.outbox.find((m) => m.to === 'riya.test@example.com')!.link;
  const token = new URL(link).searchParams.get('token')!;
  const weak = await api.req('POST', '/v1/auth/password/reset', { body: { token, newPassword: 'short' } });
  assert.equal(weak.status, 400);
  assert.equal((await api.req('POST', '/v1/auth/password/reset', { body: { token, newPassword: 'New-pass-2026!' } })).status, 204);
  assert.equal((await api.req('POST', '/v1/auth/password/reset', { body: { token, newPassword: 'Other-pass-2026!' } })).status, 400, 'single use');
  assert.equal((await api.req('GET', '/v1/me/state', { token: s.accessToken })).status, 401, 'sessions revoked after reset');
  assert.equal((await api.req('POST', '/v1/auth/login', { body: { email: 'riya.test@example.com', password: 'New-pass-2026!' } })).status, 200);
  api.store.byEmail('riya.test@example.com')!.passwordHash = (await import('../src/crypto')).hashPassword(PW);
});

test('magic link: single-use sign-in for app users', async () => {
  await api.req('POST', '/v1/auth/magic-link', { body: { email: 'aisha@example.com' } });
  const link = api.store.outbox.find((m) => m.to === 'aisha@example.com' && m.subject.includes('sign-in'))!.link;
  const token = new URL(link).searchParams.get('magic')!;
  const r = await api.req('POST', '/v1/auth/magic-link/verify', { body: { token }, headers: { 'X-Client': 'mobile' } });
  assert.equal(r.status, 200);
  assert.equal((await api.req('POST', '/v1/auth/magic-link/verify', { body: { token } })).status, 400);
});

test('password change requires the current password and signs out other devices', async () => {
  const a = await api.loginUser('aisha@example.com');
  const b = await api.loginUser('aisha@example.com');
  assert.equal((await api.req('POST', '/v1/auth/password/change', { token: a.accessToken, body: { currentPassword: 'wrong', newPassword: 'Another-pass-1' } })).status, 400);
  assert.equal((await api.req('POST', '/v1/auth/password/change', { token: a.accessToken, body: { currentPassword: PW, newPassword: 'Another-pass-1' } })).status, 204);
  assert.equal((await api.req('GET', '/v1/me/state', { token: a.accessToken })).status, 200);
  assert.equal((await api.req('GET', '/v1/me/state', { token: b.accessToken })).status, 401);
  await api.req('POST', '/v1/auth/password/change', { token: a.accessToken, body: { currentPassword: 'Another-pass-1', newPassword: PW } });
});

test('Apple/Google sign-in report that they are not configured (no fake success)', async () => {
  const r = await api.req('POST', '/v1/auth/oauth/google', { body: {} });
  assert.equal(r.status, 501);
});

test('Web Admin uses its own refresh cookie, so it never signs the user app out (same origin)', async () => {
  const user = await api.req('POST', '/v1/auth/login', { body: { email: 'aisha@example.com', password: PW }, headers: { 'X-Client': 'web' } });
  const s1 = await api.req('POST', '/v1/auth/login', { body: { email: STAFF.former_analyst, password: PW }, headers: { 'X-Client': 'web-admin' } });
  const staff = await api.req('POST', '/v1/auth/mfa/verify', { body: { mfaToken: s1.body.mfaToken, code: api.mfaCode(STAFF.former_analyst) }, headers: { 'X-Client': 'web-admin' } });
  const userCookie = (user.headers.get('set-cookie') ?? '').split(';')[0];
  const adminCookie = (staff.headers.get('set-cookie') ?? '').split(';')[0];
  assert.match(userCookie, /^hx_rt=/);
  assert.match(adminCookie, /^hx_rta=/);
  const both = `${userCookie}; ${adminCookie}`;
  const ru = await api.req('POST', '/v1/auth/refresh', { headers: { Cookie: both, 'X-Client': 'web' } });
  const ra = await api.req('POST', '/v1/auth/refresh', { headers: { Cookie: both, 'X-Client': 'web-admin' } });
  assert.equal(ru.body.user.role, 'end_user');
  assert.equal(ra.body.user.role, 'admin', 'the former Analyst is an Admin now');
});

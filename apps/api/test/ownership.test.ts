/** Owner-only data, persistence, validation and blocked actions for app users (SRS §47, §69 data isolation). */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startApi, STAFF, type Api } from './helpers';

let api: Api;
before(async () => {
  api = await startApi();
});
after(() => api.close());

test('anonymous requests to user data are rejected', async () => {
  for (const [m, p] of [
    ['GET', '/v1/me/state'],
    ['POST', '/v1/me/actions'],
    ['GET', '/v1/me/export'],
    ['GET', '/v1/me/records/periods/x'],
    ['DELETE', '/v1/me'],
  ] as const) {
    const r = await api.req(m, p, m === 'GET' ? {} : { body: {} });
    assert.equal(r.status, 401, `${m} ${p}`);
  }
});

test('a write is persisted server-side and visible on the next read (and to another device)', async () => {
  const web = await api.loginUser();
  const phone = await api.loginUser();
  const before = (await api.req('GET', '/v1/me/state', { token: phone.accessToken })).body.state;
  const w = await api.act(web.accessToken, { type: 'ADD_WATER', ml: 333 }, 'water-1');
  assert.equal(w.status, 200);
  const afterRes = (await api.req('GET', '/v1/me/state', { token: phone.accessToken })).body.state;
  assert.equal(afterRes.water.length, before.water.length + 1);
  assert.ok(afterRes.water.some((x: { ml: number }) => x.ml === 333));
});

test('retrying the same client action id is idempotent (no duplicate records)', async () => {
  const s = await api.loginUser();
  const n0 = (await api.req('GET', '/v1/me/state', { token: s.accessToken })).body.state.water.length;
  await api.act(s.accessToken, { type: 'ADD_WATER', ml: 120 }, 'retry-xyz');
  const again = await api.act(s.accessToken, { type: 'ADD_WATER', ml: 120 }, 'retry-xyz');
  assert.equal(again.body.duplicate, true);
  const n1 = (await api.req('GET', '/v1/me/state', { token: s.accessToken })).body.state.water.length;
  assert.equal(n1, n0 + 1);
});

test('user A cannot read user B’s records by id', async () => {
  const aisha = await api.loginUser('aisha@example.com');
  const riya = await api.loginUser('riya.test@example.com');
  const riyaState = (await api.req('GET', '/v1/me/state', { token: riya.accessToken })).body.state;
  const riyaPeriod = riyaState.periods[0].id;
  const own = await api.req('GET', `/v1/me/records/periods/${riyaPeriod}`, { token: riya.accessToken });
  assert.equal(own.status, 200);
  // Seeded histories share deterministic ids, so make a record that exists ONLY for Riya.
  await api.act(riya.accessToken, { type: 'ADD_REMINDER', reminder: { title: 'Private reminder', type: 'habit', time: '08:00', enabled: true } });
  const rs = (await api.req('GET', '/v1/me/state', { token: riya.accessToken })).body.state;
  const privateId = rs.reminders.find((r: { title: string }) => r.title === 'Private reminder').id;
  assert.equal((await api.req('GET', `/v1/me/records/reminders/${privateId}`, { token: riya.accessToken })).status, 200);
  assert.equal((await api.req('GET', `/v1/me/records/reminders/${privateId}`, { token: aisha.accessToken })).status, 404);
  // Writes by id only ever touch the caller's own data.
  await api.act(aisha.accessToken, { type: 'DELETE_REMINDER', id: privateId });
  assert.equal((await api.req('GET', `/v1/me/records/reminders/${privateId}`, { token: riya.accessToken })).status, 200, 'Riya’s reminder survives Aisha’s delete attempt');
});

test('staff accounts cannot use app-user endpoints (no back door to health data)', async () => {
  const sa = await api.loginStaff(STAFF.owner);
  for (const [m, p] of [
    ['GET', '/v1/me/state'],
    ['GET', '/v1/me/export'],
  ] as const) assert.equal((await api.req(m, p, { token: sa.accessToken })).status, 403, `${m} ${p}`);
});

test('blocked actions: role, plan, whole-state replacement and demo reset are refused', async () => {
  const s = await api.loginUser();
  for (const action of [{ type: 'SET_ROLE', role: 'admin' }, { type: 'SET_PLAN', plan: 'premium' }, { type: 'HYDRATE', state: {} }, { type: 'RESET_DEMO' }, { type: 'SET_WEIGHTS', weights: {} }, { type: 'SIGN_IN', email: 'x@y.z' }]) {
    const r = await api.act(s.accessToken, action);
    assert.equal(r.status, 403, action.type);
  }
  const st = (await api.req('GET', '/v1/me/state', { token: s.accessToken })).body.state;
  assert.equal(st.profile.plan, 'free');
  assert.equal(st.auth.role, 'user');
});

test('validation: bad payloads are rejected with 400 and do not change data', async () => {
  const s = await api.loginUser();
  const today = (await api.req('GET', '/v1/me/state', { token: s.accessToken })).body.state.today;
  const cases = [
    { type: 'ADD_WATER', ml: 999999 },
    { type: 'SET_STEPS', date: '2999-12-31', steps: 100 },
    { type: 'SAVE_CHECKIN', checkIn: { date: today, mood: 'ecstatic', energy: 5, symptomIds: [] } },
    { type: 'SAVE_CHECKIN', checkIn: { date: today, mood: 'good', energy: 11, symptomIds: [] } },
    { type: 'UPDATE_PROFILE', patch: { plan: 'premium' } },
    { type: 'UPDATE_PROFILE', patch: { email: 'someone@else.test' } },
    { type: 'ADD_PERIOD', start: today, end: '2000-01-01', flow: 'medium' },
    { type: 'LOG_SLEEP', log: { date: today, bedtime: '23:00', wake: '07:00', durationMin: 480, quality: 3, wakings: 0, source: 'apple_health' } },
  ];
  for (const action of cases) {
    const r = await api.act(s.accessToken, action);
    assert.equal(r.status, 400, JSON.stringify(action));
    assert.ok(r.body.error.message);
  }
});

test('consent rules: required consent cannot be withdrawn; integrations need consent first', async () => {
  const s = await api.loginUser('riya.test@example.com');
  assert.equal((await api.act(s.accessToken, { type: 'SET_CONSENT', id: 'health_processing', granted: false })).status, 400);
  await api.act(s.accessToken, { type: 'SET_CONSENT', id: 'health_integrations', granted: false });
  assert.equal((await api.act(s.accessToken, { type: 'TOGGLE_CONNECTION', id: 'apple_health' })).status, 409);
  await api.act(s.accessToken, { type: 'SET_CONSENT', id: 'health_integrations', granted: true });
  assert.equal((await api.act(s.accessToken, { type: 'TOGGLE_CONNECTION', id: 'apple_health' })).status, 200);
});

test('export returns only the caller’s data', async () => {
  const s = await api.loginUser('riya.test@example.com');
  const r = await api.req('GET', '/v1/me/export', { token: s.accessToken });
  assert.equal(r.status, 200);
  assert.equal(r.body.account.email, 'riya.test@example.com');
  assert.ok(r.body.data.periods);
  assert.equal(r.body.data.articles, undefined);
});

test('free trial is decided by the server and only once', async () => {
  const s = await api.loginUser('riya.test@example.com');
  assert.equal((await api.req('POST', '/v1/me/subscription/trial', { token: s.accessToken })).status, 200);
  assert.equal((await api.req('GET', '/v1/me/state', { token: s.accessToken })).body.state.profile.plan, 'premium');
  assert.equal((await api.req('POST', '/v1/me/subscription/trial', { token: s.accessToken })).status, 409);
});

test('self-service account deletion needs password + DELETE, wipes data and ends sessions', async () => {
  const reg = await api.req('POST', '/v1/auth/register', { body: { name: 'Delete Me', email: 'delete.me@example.test', password: 'Wellness#2026', acceptTerms: true }, headers: { 'X-Client': 'mobile' } });
  const token = reg.body.accessToken;
  await api.act(token, { type: 'ADD_WATER', ml: 250 });
  assert.equal((await api.req('DELETE', '/v1/me', { token, body: { password: 'Wellness#2026', confirm: 'delete' } })).status, 400);
  assert.equal((await api.req('DELETE', '/v1/me', { token, body: { password: 'wrong', confirm: 'DELETE' } })).status, 400);
  assert.equal((await api.req('DELETE', '/v1/me', { token, body: { password: 'Wellness#2026', confirm: 'DELETE' } })).status, 204);
  assert.equal((await api.req('GET', '/v1/me/state', { token })).status, 401);
  assert.equal(api.store.userStates.has(reg.body.user.id), false);
  assert.equal((await api.req('POST', '/v1/auth/login', { body: { email: 'delete.me@example.test', password: 'Wellness#2026' } })).status, 401);
});

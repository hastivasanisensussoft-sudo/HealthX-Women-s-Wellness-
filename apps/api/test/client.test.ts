/** Contract test: the shared ApiClient (used by web + mobile) against a real API instance. */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ApiClient, ApiError } from '@healthx/shared';
import { PW, startApi, STAFF, type Api } from './helpers';

let api: Api;
before(async () => {
  api = await startApi({ accessTtlMs: 1200 });
});
after(() => api.close());

const memoryStore = () => {
  let v: string | null = null;
  return { get: async () => v, set: async (t: string | null) => void (v = t), peek: () => v };
};

test('mobile client: login, read state, write, and see the write from a second device', async () => {
  const s1 = memoryStore();
  const phone = new ApiClient({ baseUrl: api.url, client: 'mobile', tokenStore: s1 });
  const r = await phone.login('aisha@example.com', PW);
  assert.equal(r.kind, 'session');
  assert.ok(s1.peek(), 'refresh token kept in the token store');
  const st = await phone.getState();
  assert.ok(st.periods.length > 0);
  await phone.sendAction({ type: 'ADD_WATER', ml: 444 });

  const tablet = new ApiClient({ baseUrl: api.url, client: 'mobile', tokenStore: memoryStore() });
  await tablet.login('aisha@example.com', PW);
  assert.ok((await tablet.getState()).water.some((w) => w.ml === 444), 'same account, same data on another device');
});

test('client refreshes transparently after the access token expires; restores a session on app start', async () => {
  const store = memoryStore();
  const c = new ApiClient({ baseUrl: api.url, client: 'mobile', tokenStore: store });
  await c.login('riya.test@example.com', PW);
  await new Promise((r) => setTimeout(r, 1400));
  const st = await c.getState(); // 401 → refresh → retry
  assert.ok(st.profile.name);
  const restarted = new ApiClient({ baseUrl: api.url, client: 'mobile', tokenStore: store });
  assert.equal(await restarted.refresh(), true, 'cold start restores from the stored refresh token');
  assert.ok((await restarted.getState()).profile);
});

test('session end: logout clears tokens; a revoked session triggers onSessionEnd', async () => {
  const store = memoryStore();
  let ended = 0;
  const c = new ApiClient({ baseUrl: api.url, client: 'mobile', tokenStore: store, onSessionEnd: () => void (ended += 1) });
  await c.login('aisha@example.com', PW);
  const other = new ApiClient({ baseUrl: api.url, client: 'mobile', tokenStore: memoryStore() });
  await other.login('aisha@example.com', PW);
  await other.logoutAll();
  await assert.rejects(c.getState(), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.equal(ended, 1);
  assert.equal(store.peek(), null);
  assert.equal(c.signedIn, false);
});

test('staff sign-in through the client requires the MFA step', async () => {
  const c = new ApiClient({ baseUrl: api.url, client: 'mobile', tokenStore: memoryStore() });
  const r = await c.login(STAFF.content_manager, PW);
  assert.equal(r.kind, 'mfa');
  assert.equal(c.signedIn, false);
  if (r.kind === 'mfa') await c.verifyMfa(r.mfaToken, api.mfaCode(STAFF.content_manager));
  const st = await c.adminState();
  assert.equal(st.session?.role, 'content_manager');
  await assert.rejects(c.adminAction({ type: 'RESET_PERMISSIONS' }), (e: unknown) => e instanceof ApiError && e.status === 403);
});

test('network failure surfaces as an offline ApiError', async () => {
  const c = new ApiClient({ baseUrl: 'http://127.0.0.1:1', client: 'mobile' });
  await assert.rejects(c.health(), (e: unknown) => e instanceof ApiError && e.offline);
});

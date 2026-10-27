/** Server-side RBAC for the four SRS roles (§6, §47): direct API calls, escalation attempts, minimisation. */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startApi, STAFF, type Api } from './helpers';

let api: Api;
let tok: Record<string, string> = {};
before(async () => {
  api = await startApi();
  for (const [k, email] of Object.entries(STAFF)) tok[k] = (await api.loginStaff(email)).accessToken;
  tok.end_user = (await api.loginUser()).accessToken;
});
after(() => api.close());

const anyUser = () => [...api.store.accounts.values()].find((a) => a.role === 'end_user' && a.synthetic && a.status === 'active')!;
/** Every Admin account, with and without privileged permissions (former Super Admin, Admin, Support Agent, Analyst). */
const ADMINS = ['owner', 'admin', 'admin2', 'former_support', 'former_analyst'];
let inviteSeq = 0;
/** One privacy request for the whole matrix row: the first allowed account moves it, later ones are no-ops. */
let privacyId: string | undefined;
const privacyRow = () => {
  privacyId ??= api.store.admin.privacy.find((p) => p.status === 'new')!.id;
  return api.store.admin.privacy.find((p) => p.id === privacyId)!;
};

test('admin endpoints: anonymous → 401, end user → 403, every staff account → 200', async () => {
  assert.equal((await api.req('GET', '/v1/admin/state')).status, 401);
  assert.equal((await api.req('GET', '/v1/admin/state', { token: tok.end_user })).status, 403);
  for (const k of Object.keys(STAFF)) assert.equal((await api.req('GET', '/v1/admin/state', { token: tok[k] })).status, 200, k);
});

/** One representative mutation per capability, and which accounts may perform it. */
const MATRIX: { name: string; action: () => unknown; allowed: string[] }[] = [
  { name: 'deactivate user', action: () => ({ type: 'UPDATE_USER', id: anyUser().id, patch: { status: 'deactivated' } }), allowed: ADMINS },
  { name: 'change permission matrix (privileged)', action: () => ({ type: 'SET_PERMISSION', role: 'content_manager', cap: 'view_audit', granted: false }), allowed: ['owner'] },
  { name: 'invite staff (privileged)', action: () => ({ type: 'INVITE_STAFF', member: { name: `Invitee ${++inviteSeq}`, email: `invitee${inviteSeq}@healthx.example`, role: 'content_manager' } }), allowed: ['owner'] },
  { name: 'admin settings (privileged)', action: () => ({ type: 'UPDATE_SETTINGS', settings: { ...api.store.admin.settings } }), allowed: ['owner'] },
  { name: 'feature flag', action: () => ({ type: 'UPDATE_FLAG', key: api.store.admin.flags[0].key, env: 'dev', patch: { enabled: true } }), allowed: ADMINS },
  { name: 'tracking defaults', action: () => ({ type: 'SET_DEFAULTS', defaults: { waterMl: 2500, sleepHours: 7.5 } }), allowed: ADMINS },
  { name: 'support queue (former Support Agent)', action: () => ({ type: 'UPSERT_SUPPORT', request: { ...api.store.admin.support[0], status: 'in_progress' } }), allowed: ADMINS },
  { name: 'privacy request (former Support Agent)', action: () => ({ type: 'UPSERT_PRIVACY', request: { ...privacyRow(), status: 'in_progress' } }), allowed: ADMINS },
  { name: 'media upload', action: () => ({ type: 'ADD_MEDIA', asset: { id: `m_${Math.random().toString(36).slice(2)}`, name: 'x.jpg', kind: 'image', mime: 'image/jpeg', size: 1000 } }), allowed: [...ADMINS, 'content_manager', 'content_manager2'] },
  { name: 'campaign', action: () => ({ type: 'UPSERT_CAMPAIGN', campaign: { ...api.store.admin.campaigns[0], id: `c_${Math.random().toString(36).slice(2)}`, status: 'draft' } }), allowed: ADMINS },
  { name: 'refund', action: () => ({ type: 'ADD_REFUND', refund: { userId: anyUser().id, amount: 5, reason: 'Duplicate charge' } }), allowed: ADMINS },
];

test('capability matrix enforced on direct API calls for every account', async () => {
  for (const m of MATRIX) {
    for (const who of [...Object.keys(STAFF), 'end_user']) {
      const r = await api.adminAct(tok[who], m.action());
      const expected = m.allowed.includes(who) ? 200 : 403;
      assert.equal(r.status, expected, `${m.name} as ${who}: got ${r.status} ${JSON.stringify(r.body?.error ?? '')}`);
    }
    // Restore any user deactivated by an allowed account so later rows have an active user.
    for (const a of api.store.accounts.values()) if (a.synthetic && a.status === 'deactivated' && !api.store.syntheticUsers.get(a.id)?.status.startsWith('deact')) a.status = 'active';
  }
});

test('Content Managers and Medical Content Reviewers cannot perform admin operations, even with crafted requests', async () => {
  for (const who of ['content_manager', 'reviewer']) {
    for (const action of [
      { type: 'UPDATE_USER', id: anyUser().id, patch: { plan: 'premium' } },
      { type: 'UPSERT_SUPPORT', request: api.store.admin.support[0] },
      { type: 'RESET_PERMISSIONS' },
      { type: 'SET_PERMISSION', role: 'content_manager', cap: 'view_users', granted: true },
      { type: 'INVITE_STAFF', member: { name: 'Sneaky Person', email: `sneaky.${who}@healthx.example`, role: 'admin' } },
      { type: 'UPDATE_ACCOUNT', email: STAFF.owner, patch: { language: 'x' } },
    ]) {
      assert.equal((await api.adminAct(tok[who], action)).status, 403, `${who}: ${action.type}`);
    }
  }
});

test('Admins without privileged permissions cannot use them', async () => {
  const id = api.store.byEmail('aisha@example.com')!.id;
  for (const who of ['admin', 'former_support', 'former_analyst']) {
    assert.equal((await api.adminAct(tok[who], { type: 'RESET_PERMISSIONS' })).status, 403, `${who} reset`);
    assert.equal((await api.adminAct(tok[who], { type: 'UPDATE_SETTINGS', settings: { ...api.store.admin.settings } })).status, 403, `${who} settings`);
    assert.equal((await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok[who], body: { reason: 'Investigating a sync issue' } })).status, 403, `${who} break-glass`);
  }
});

test('privilege escalation attempts are refused', async () => {
  const admin = api.store.byEmail(STAFF.admin)!;
  const owner = api.store.byEmail(STAFF.owner)!;
  // An Admin without manage_staff can't hand themselves privileged permissions or edit the matrix.
  assert.equal((await api.adminAct(tok.admin, { type: 'UPDATE_STAFF', id: admin.id, patch: { privileges: ['manage_staff'] } })).status, 403);
  assert.equal((await api.adminAct(tok.admin, { type: 'SET_PERMISSION', role: 'content_manager', cap: 'view_users', granted: true })).status, 403);
  // The owner can't change their own role, permissions or status.
  assert.equal((await api.adminAct(tok.owner, { type: 'UPDATE_STAFF', id: owner.id, patch: { role: 'content_manager' } })).status, 403);
  assert.equal((await api.adminAct(tok.owner, { type: 'UPDATE_STAFF', id: owner.id, patch: { privileges: [] } })).status, 403);
  assert.equal((await api.adminAct(tok.owner, { type: 'UPDATE_STAFF', id: owner.id, patch: { status: 'deactivated' } })).status, 403);
  // Nobody edits their own role's row; privileged permissions never go in any row; End User stays empty.
  assert.equal((await api.adminAct(tok.owner, { type: 'SET_PERMISSION', role: 'admin', cap: 'view_users', granted: false })).status, 403);
  for (const role of ['content_manager', 'medical_content_reviewer', 'admin']) {
    assert.equal((await api.adminAct(tok.owner, { type: 'SET_PERMISSION', role, cap: 'manage_staff', granted: true })).status, 403, `${role}.manage_staff`);
  }
  assert.equal((await api.adminAct(tok.owner, { type: 'SET_PERMISSION', role: 'end_user', cap: 'view_users', granted: true })).status, 403);
  assert.equal((await api.adminAct(tok.owner, { type: 'SET_PERMISSION', role: 'content_manager', cap: 'medical_review', granted: true })).status, 403, 'clinical sign-off is fixed');
  // Client-supplied "LOG"/"SIGN_IN" can't forge audit entries or sessions.
  const n = api.store.admin.audit.length;
  assert.equal((await api.adminAct(tok.owner, { type: 'LOG', entry: { actor: 'Someone else', role: 'admin', action: 'forged', target: 'x' } })).status, 200);
  assert.equal(api.store.admin.audit.length, n, 'client log entries are ignored');
  assert.equal((await api.adminAct(tok.owner, { type: 'SIGN_IN', session: { name: 'x', email: 'x', role: 'admin', privileges: ['manage_staff'], signedInAt: '' } })).status, 400);
});

test('role changes and revoked permissions take effect on the very next request', async () => {
  const cm2 = api.store.byEmail(STAFF.content_manager2)!;
  assert.equal((await api.adminAct(tok.content_manager2, { type: 'ADD_MEDIA', asset: { name: 'a.jpg', kind: 'image', mime: 'image/jpeg', size: 10 } })).status, 200);
  assert.equal((await api.adminAct(tok.owner, { type: 'UPDATE_STAFF', id: cm2.id, patch: { role: 'medical_content_reviewer' } })).status, 200);
  assert.equal((await api.adminAct(tok.content_manager2, { type: 'ADD_MEDIA', asset: { name: 'b.jpg', kind: 'image', mime: 'image/jpeg', size: 10 } })).status, 403, 'no longer a Content Manager');
  await api.adminAct(tok.owner, { type: 'UPDATE_STAFF', id: cm2.id, patch: { role: 'content_manager' } });
  // Revoke a capability from a role in the matrix.
  const tpl = api.store.admin.templates.find((x) => !x.healthRelated)!;
  assert.equal((await api.adminAct(tok.owner, { type: 'SET_PERMISSION', role: 'content_manager', cap: 'edit_templates', granted: false })).status, 200);
  assert.equal((await api.adminAct(tok.content_manager, { type: 'UPSERT_TEMPLATE', template: { ...tpl, body: `${tpl.body} (edited)` } })).status, 403);
  assert.equal((await api.adminAct(tok.owner, { type: 'RESET_PERMISSIONS' })).status, 200);
  // Revoke a privileged permission from one Admin.
  const admin2 = api.store.byEmail(STAFF.admin2)!;
  const id = api.store.byEmail('aisha@example.com')!.id;
  assert.equal((await api.adminAct(tok.owner, { type: 'UPDATE_STAFF', id: admin2.id, patch: { privileges: ['break_glass'] } })).status, 200);
  assert.equal((await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok.admin2, body: { reason: 'User asked for help with a sync problem' } })).status, 200);
  assert.equal((await api.adminAct(tok.owner, { type: 'UPDATE_STAFF', id: admin2.id, patch: { privileges: [] } })).status, 200);
  assert.equal((await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok.admin2, body: { reason: 'User asked for help with a sync problem' } })).status, 403);
});

test('deactivating an app user ends their sessions immediately and blocks sign-in', async () => {
  const riya = await api.loginUser('riya.test@example.com');
  const acc = api.store.byEmail('riya.test@example.com')!;
  assert.equal((await api.adminAct(tok.admin, { type: 'UPDATE_USER', id: acc.id, patch: { status: 'deactivated' } })).status, 200);
  assert.equal((await api.req('GET', '/v1/me/state', { token: riya.accessToken })).status, 401);
  assert.equal((await api.req('POST', '/v1/auth/refresh', { body: { refreshToken: riya.refreshToken } })).status, 401);
  assert.equal((await api.req('POST', '/v1/auth/login', { body: { email: 'riya.test@example.com', password: 'Test-only-pass-2026' } })).status, 403);
  assert.equal((await api.adminAct(tok.admin, { type: 'UPDATE_USER', id: acc.id, patch: { status: 'active' } })).status, 200);
  assert.equal((await api.req('POST', '/v1/auth/login', { body: { email: 'riya.test@example.com', password: 'Test-only-pass-2026' } })).status, 200);
});

test('data minimisation: no health data in admin views; masked emails; content roles see no accounts', async () => {
  for (const who of ['former_support', 'former_analyst', 'owner']) {
    const st = (await api.req('GET', '/v1/admin/state', { token: tok[who] })).body.state;
    assert.ok(st.users.length > 0, who);
    const row = JSON.stringify(st.users);
    for (const k of ['periods', 'checkIns', 'symptomLogs', 'mood', 'fertility', 'flowByDay', 'sleep']) assert.ok(!row.includes(`"${k}"`), `${who}: no ${k} in user rows`);
    assert.ok(st.users.every((u: { email: string }) => u.email.includes('***')), `${who}: emails masked`);
  }
  for (const who of ['content_manager', 'reviewer']) {
    const st = (await api.req('GET', '/v1/admin/state', { token: tok[who] })).body.state;
    assert.equal(st.users.length, 0, `${who} sees no user accounts`);
    assert.equal(st.audit.length, 0, `${who} can't read the audit log`);
    assert.equal(st.support.length, 0, `${who} has no support queue`);
  }
});

test('email reveal and break-glass are capability-gated and audited', async () => {
  const id = api.store.byEmail('aisha@example.com')!.id;
  assert.equal((await api.req('POST', `/v1/admin/users/${id}/reveal-email`, { token: tok.content_manager })).status, 403);
  const rev = await api.req('POST', `/v1/admin/users/${id}/reveal-email`, { token: tok.former_support });
  assert.equal(rev.status, 200);
  assert.equal(rev.body.email, 'aisha@example.com');
  assert.ok(api.store.admin.audit.some((e) => e.action === 'user.email_revealed' && e.target === id));
  assert.equal((await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok.admin, body: { reason: 'Investigating a sync issue' } })).status, 403);
  assert.equal((await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok.owner, body: { reason: 'short' } })).status, 400);
  const bg = await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok.owner, body: { reason: 'User consented to troubleshooting a sync issue' } });
  assert.equal(bg.status, 200);
  assert.ok(bg.body.categories.every((c: Record<string, unknown>) => Object.keys(c).sort().join() === 'count,label'), 'only categories and counts');
});

test('audit log: written server-side with the real actor; readable only with view_audit', async () => {
  const flag = api.store.admin.flags[1].key;
  await api.adminAct(tok.admin, { type: 'UPDATE_FLAG', key: flag, env: 'staging', patch: { rollout: 25 } });
  const e = api.store.admin.audit.find((x) => x.action === 'flag.update' && x.target.startsWith(flag))!;
  assert.equal(e.actor, api.store.byEmail(STAFF.admin)!.name);
  assert.equal(e.actorId, api.store.byEmail(STAFF.admin)!.id);
  assert.equal(api.store.admin.flags[1].lastChangedBy, e.actor, 'lastChangedBy comes from the session, not the client');
  assert.equal((await api.req('GET', '/v1/admin/audit', { token: tok.content_manager })).status, 403);
  assert.equal((await api.req('GET', '/v1/admin/audit', { token: tok.reviewer })).status, 403);
  assert.equal((await api.req('GET', '/v1/admin/audit', { token: tok.former_analyst })).status, 200);
});

test('staff invite → accept → MFA-enrolled sign-in; invites need manage_staff and start without privileges', async () => {
  assert.equal((await api.adminAct(tok.owner, { type: 'INVITE_STAFF', member: { name: 'New Reviewer', email: 'new.reviewer@healthx.example', role: 'medical_content_reviewer' } })).status, 200);
  const link = api.store.outbox.find((m) => m.to === 'new.reviewer@healthx.example')!.link;
  const acc = await api.req('POST', '/v1/auth/invite/accept', { body: { token: new URL(link).searchParams.get('token'), password: 'Reviewer-pass-2026' } });
  assert.equal(acc.status, 200);
  assert.match(acc.body.otpauthUrl, /^otpauth:\/\/totp\//);
  const s = await api.req('POST', '/v1/auth/login', { body: { email: 'new.reviewer@healthx.example', password: 'Reviewer-pass-2026' } });
  assert.equal(s.body.mfaRequired, true);
  assert.equal(api.store.byEmail('new.reviewer@healthx.example')!.role, 'medical_content_reviewer');
  // A new Admin starts without privileged permissions, whatever the request says.
  assert.equal((await api.adminAct(tok.owner, { type: 'INVITE_STAFF', member: { name: 'New Admin', email: 'new.admin@healthx.example', role: 'admin', privileges: ['manage_staff'] } })).status, 200);
  assert.deepEqual(api.store.byEmail('new.admin@healthx.example')!.privileges, []);
  assert.equal((await api.adminAct(tok.admin, { type: 'INVITE_STAFF', member: { name: 'Another Admin', email: 'another.admin@healthx.example', role: 'admin' } })).status, 403, 'needs manage_staff');
});

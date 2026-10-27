/**
 * The four SRS roles (§6.1–§6.4) after the seven-to-four consolidation: account mapping, refusal of
 * retired role ids, migration of stored legacy accounts, merged Admin functions and per-account
 * privileged permissions. Synthetic accounts only.
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ALL_ROLES, PRIVILEGED_CAPABILITIES, type Capability } from '@healthx/shared/admin';
import { migrateLegacyAccounts } from '../src/accounts';
import { startApi, STAFF, type Api } from './helpers';

let api: Api;
const t: Record<string, string> = {};
before(async () => {
  api = await startApi();
  for (const k of ['owner', 'admin', 'admin2', 'former_support', 'former_analyst', 'content_manager', 'reviewer'] as const) t[k] = (await api.loginStaff(STAFF[k])).accessToken;
});
after(() => api.close());

const acc = (email: string) => api.store.byEmail(email)!;
const caps = async (token: string): Promise<Capability[]> => (await api.req('GET', '/v1/auth/me', { token })).body.capabilities;

test('exactly the four SRS roles exist, and every seeded account was mapped as planned', () => {
  for (const a of api.store.accounts.values()) assert.ok((ALL_ROLES as string[]).includes(a.role), `${a.email}: ${a.role}`);
  const expect: [string, string, readonly string[]][] = [
    ['sam.rivera@healthx.example', 'admin', PRIVILEGED_CAPABILITIES], // former Super Admin
    ['alex.morgan@healthx.example', 'admin', []],
    ['ritu.sharma@healthx.example', 'admin', []],
    ['neha.joshi@healthx.example', 'admin', []], // former Support Agent
    ['tom.becker@healthx.example', 'admin', []], // former Support Agent
    ['kenji.watanabe@healthx.example', 'admin', []], // former Analyst
    ['priya.nair@healthx.example', 'content_manager', []],
    ['daniel.okafor@healthx.example', 'content_manager', []],
    ['jordan.lee@healthx.example', 'content_manager', []], // invited
    ['meera.iyer@healthx.example', 'medical_content_reviewer', []], // former Medical Reviewer
    ['sarah.thompson@healthx.example', 'medical_content_reviewer', []],
  ];
  for (const [email, role, privileges] of expect) {
    assert.equal(acc(email).role, role, email);
    assert.deepEqual([...acc(email).privileges].sort(), [...privileges].sort(), `${email} privileges`);
  }
  assert.equal(acc('aisha@example.com').role, 'end_user');
  assert.deepEqual(acc('aisha@example.com').privileges, []);
});

test('retired role ids can never be assigned again', async () => {
  const cm = acc(STAFF.content_manager);
  for (const legacy of ['super_admin', 'support_agent', 'analyst', 'medical_reviewer']) {
    const inv = await api.adminAct(t.owner, { type: 'INVITE_STAFF', member: { name: `Legacy ${legacy}`, email: `legacy.${legacy}@healthx.example`, role: legacy } });
    assert.equal(inv.status, 400, `invite as ${legacy}`);
    assert.match(inv.body.error.message, /no longer a role — it was merged into (Admin|Medical Content Reviewer)/);
    assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: cm.id, patch: { role: legacy } })).status, 400, `promote to ${legacy}`);
    assert.equal((await api.adminAct(t.owner, { type: 'SET_PERMISSION', role: legacy, cap: 'view_users', granted: true })).status, 400, `matrix row ${legacy}`);
  }
  assert.equal(cm.role, 'content_manager', 'nothing changed');
  assert.equal(api.store.byEmail('legacy.super_admin@healthx.example'), undefined);
});

test('registration can’t assign any staff role; app users never reach the Web Admin', async () => {
  for (const role of ['admin', 'content_manager', 'medical_content_reviewer', 'super_admin']) {
    const r = await api.req('POST', '/v1/auth/register', { body: { name: 'Role Seeker', email: `seeker.${role}@example.test`, password: 'Wellness#2026', acceptTerms: true, role } });
    assert.equal(r.status, 400, role);
  }
  const ok = await api.req('POST', '/v1/auth/register', { body: { name: 'Plain User', email: 'plain.user@example.test', password: 'Wellness#2026', acceptTerms: true }, headers: { 'X-Client': 'mobile' } });
  assert.equal(ok.body.user.role, 'end_user');
  assert.equal((await api.req('GET', '/v1/admin/state', { token: ok.body.accessToken })).status, 403);
  // The app's own reducer action for roles is refused server-side too.
  assert.equal((await api.act(ok.body.accessToken, { type: 'SET_ROLE', role: 'admin' })).status, 403);
});

test('accounts stored under the seven roles migrate in place: same ids, same data, sessions pick up the new role', async () => {
  const p = await startApi();
  try {
    const neha = await p.loginStaff(STAFF.former_support);
    const aisha = await p.loginUser();
    // Simulate data written before the consolidation.
    const legacy: [string, string][] = [
      [STAFF.owner, 'super_admin'],
      [STAFF.former_support, 'support_agent'],
      [STAFF.former_analyst, 'analyst'],
      [STAFF.reviewer, 'medical_reviewer'],
    ];
    for (const [email, role] of legacy) {
      const a = p.store.byEmail(email)!;
      (a as { role: string }).role = role;
      a.privileges = [];
    }
    const appData = JSON.stringify([...p.store.userStates.entries()]);
    const ids = [...p.store.accounts.keys()].sort();
    // A legacy role id grants nothing (fails closed) until migrated.
    assert.equal((await p.req('GET', '/v1/admin/state', { token: neha.accessToken })).status, 403);
    const changed = migrateLegacyAccounts(p.store);
    assert.deepEqual(changed.map((c) => `${c.from}→${c.to}`).sort(), ['analyst→admin', 'medical_reviewer→medical_content_reviewer', 'super_admin→admin', 'support_agent→admin']);
    assert.equal(p.store.byEmail(STAFF.owner)!.role, 'admin');
    assert.deepEqual([...p.store.byEmail(STAFF.owner)!.privileges].sort(), [...PRIVILEGED_CAPABILITIES].sort());
    assert.deepEqual(p.store.byEmail(STAFF.former_support)!.privileges, []);
    assert.deepEqual(p.store.byEmail(STAFF.former_analyst)!.privileges, []);
    assert.equal(p.store.byEmail(STAFF.reviewer)!.role, 'medical_content_reviewer');
    assert.deepEqual([...p.store.accounts.keys()].sort(), ids, 'no account added or removed');
    assert.equal(JSON.stringify([...p.store.userStates.entries()]), appData, 'app users’ data untouched');
    assert.equal(p.store.admin.audit.filter((e) => e.action === 'staff.role_migrated').length, 4, 'each mapping is audited');
    // The existing session works again, now with the Admin capabilities (and no privileged ones).
    const me = await p.req('GET', '/v1/auth/me', { token: neha.accessToken });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.role, 'admin');
    assert.ok(me.body.capabilities.includes('manage_support') && me.body.capabilities.includes('view_analytics'));
    assert.ok(!me.body.capabilities.includes('manage_staff'));
    assert.equal((await p.req('GET', '/v1/me/state', { token: aisha.accessToken })).status, 200, 'app sessions unaffected');
    assert.deepEqual(migrateLegacyAccounts(p.store), [], 'running it again changes nothing');
  } finally {
    await p.close();
  }
});

test('Admin keeps the former Support Agent and Analyst functions', async () => {
  for (const who of ['former_support', 'former_analyst', 'admin']) {
    const c = await caps(t[who]);
    for (const cap of ['view_users', 'manage_support', 'process_data_requests', 'resend_verification', 'view_analytics', 'export_reports', 'view_audit'] as const) assert.ok(c.includes(cap), `${who}: ${cap}`);
  }
  const req = api.store.admin.support.find((s) => s.status === 'open')!;
  assert.equal((await api.adminAct(t.former_analyst, { type: 'UPSERT_SUPPORT', request: { ...req, status: 'in_progress' } })).status, 200);
  const st = (await api.req('GET', '/v1/admin/state', { token: t.former_support })).body.state;
  assert.ok(st.support.length > 0 && st.privacy.length > 0 && st.users.length > 0);
});

test('privileged permissions: held per Admin, granted only by someone who holds them', async () => {
  const admin2 = acc(STAFF.admin2);
  const owner = acc(STAFF.owner);
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: admin2.id, patch: { privileges: ['manage_staff'] } })).status, 200);
  assert.ok(api.store.admin.audit.some((e) => e.action === 'staff.privileges' && e.target === admin2.email && e.actorId === owner.id));
  assert.equal((await api.adminAct(t.admin2, { type: 'INVITE_STAFF', member: { name: 'Fresh Writer', email: 'fresh.writer@healthx.example', role: 'content_manager' } })).status, 200, 'manage_staff works at once');
  const alex = acc(STAFF.admin);
  assert.equal((await api.adminAct(t.admin2, { type: 'UPDATE_STAFF', id: alex.id, patch: { privileges: ['manage_permissions'] } })).status, 403, 'can’t grant what you don’t hold');
  assert.equal((await api.adminAct(t.admin2, { type: 'UPDATE_STAFF', id: alex.id, patch: { privileges: ['manage_staff'] } })).status, 200, 'can grant what you hold');
  assert.equal((await api.adminAct(t.admin2, { type: 'UPDATE_STAFF', id: owner.id, patch: { status: 'deactivated' } })).status, 403, 'can’t touch someone with more powers');
  assert.equal((await api.adminAct(t.admin2, { type: 'UPDATE_STAFF', id: owner.id, patch: { role: 'content_manager' } })).status, 403);
  assert.equal((await api.adminAct(t.admin2, { type: 'UPDATE_STAFF', id: admin2.id, patch: { privileges: [] } })).status, 403, 'not your own');
  // Privileged permissions only exist on Admin accounts.
  const cm = acc(STAFF.content_manager);
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: cm.id, patch: { privileges: ['break_glass'] } })).status, 200);
  assert.deepEqual(cm.privileges, [], 'ignored for a Content Manager');
  // Demoting an Admin removes their privileged permissions with the role.
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: alex.id, patch: { role: 'content_manager' } })).status, 200);
  assert.deepEqual(alex.privileges, []);
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: alex.id, patch: { role: 'admin' } })).status, 200);
  assert.deepEqual(alex.privileges, [], 'promotion doesn’t bring them back');
  // Revocation applies on the next request.
  assert.equal((await api.adminAct(t.owner, { type: 'UPDATE_STAFF', id: admin2.id, patch: { privileges: [] } })).status, 200);
  assert.equal((await api.adminAct(t.admin2, { type: 'INVITE_STAFF', member: { name: 'Late Invite', email: 'late.invite@healthx.example', role: 'content_manager' } })).status, 403);
  assert.ok(!(await caps(t.admin2)).includes('manage_staff'));
});

test('each role gets only its own admin areas (server projection)', async () => {
  const st = async (who: string) => (await api.req('GET', '/v1/admin/state', { token: t[who] })).body.state;
  const cm = await st('content_manager');
  assert.ok(cm.content.length > 0 && cm.media.length > 0);
  assert.equal(cm.users.length + cm.support.length + cm.privacy.length + cm.refunds.length + cm.audit.length, 0);
  const rv = await st('reviewer');
  assert.ok(rv.content.length > 0 && rv.templates.length > 0);
  assert.equal(rv.users.length + rv.support.length + rv.audit.length + rv.flags.length, 0);
  const ad = await st('former_analyst');
  assert.ok(ad.users.length > 0 && ad.support.length > 0 && ad.audit.length > 0 && ad.flags.length > 0 && ad.content.length > 0);
  assert.deepEqual(ad.session.privileges, []);
  const ow = await st('owner');
  assert.deepEqual([...ow.session.privileges].sort(), [...PRIVILEGED_CAPABILITIES].sort());
  assert.ok(ow.staff.every((m: { role: string }) => (ALL_ROLES as string[]).includes(m.role)), 'staff list uses canonical roles only');
});

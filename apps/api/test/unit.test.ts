/** Unit tests: password hashing, TOTP, validators, permission model, workflow table, allowlist. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitialState, todayISO } from '@healthx/shared';
import {
  ALL_ROLES,
  canWith,
  DEFAULT_PERMISSIONS,
  initialAdminState,
  isLockedCell,
  isStaffRole,
  LEGACY_ROLES,
  migrateAdminState,
  migratePermissionMatrix,
  migrateRole,
  PRIVILEGED_CAPABILITIES,
  privilegesForLegacyRole,
} from '@healthx/shared/admin';
import { allowedTransitions } from '../src/contentWorkflow';
import { hashPassword, hotp, verifyPassword, verifyTotp, totpStep } from '../src/crypto';
import { BLOCKED, validateUserAction } from '../src/userActions';
import { email, password } from '../src/validate';

test('password hashing: verifies the right password, rejects others, salts each hash', () => {
  const h1 = hashPassword('Correct horse 1');
  const h2 = hashPassword('Correct horse 1');
  assert.notEqual(h1, h2);
  assert.match(h1, /^scrypt\$16384\$8\$1\$/);
  assert.equal(verifyPassword('Correct horse 1', h1), true);
  assert.equal(verifyPassword('correct horse 1', h1), false);
  assert.equal(verifyPassword('anything', null), false);
});

test('HOTP matches the RFC 4226 test vectors', () => {
  // Secret "12345678901234567890" in base32.
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.deepEqual([0, 1, 2, 9].map((c) => hotp(secret, c)), ['755224', '287082', '359152', '520489']);
});

test('TOTP accepts ±1 step, rejects replays of an already used step', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  const now = Date.now();
  const code = hotp(secret, totpStep(now));
  const step = verifyTotp(secret, code, 0, now);
  assert.equal(step, totpStep(now));
  assert.equal(verifyTotp(secret, code, step!, now), null, 'same step cannot be reused');
  const near = [-1, 0, 1].map((d) => hotp(secret, totpStep(now) + d));
  const wrong = ['111111', '222222', '333333', '444444'].find((c) => !near.includes(c))!;
  assert.equal(verifyTotp(secret, wrong, 0, now), null);
  assert.equal(verifyTotp(secret, 'abc123', 0, now), null);
});

test('validators: email and password policy', () => {
  assert.equal(email(' Riya@Example.COM '), 'riya@example.com');
  assert.throws(() => email('not-an-email'));
  assert.throws(() => password('short'));
  assert.throws(() => password('password'));
  assert.throws(() => password('aaaaaaaaaa'));
  assert.equal(password('Wellness#2026'), 'Wellness#2026');
});

test('permission model: exactly the four SRS roles, least privilege per role', () => {
  assert.deepEqual(ALL_ROLES, ['end_user', 'content_manager', 'medical_content_reviewer', 'admin']);
  assert.deepEqual(Object.keys(DEFAULT_PERMISSIONS).sort(), [...ALL_ROLES].sort());
  const p = DEFAULT_PERMISSIONS;
  // Admin carries the former Admin, Support Agent and Analyst functions…
  for (const cap of ['view_users', 'manage_user_status', 'manage_support', 'process_data_requests', 'view_analytics', 'export_reports', 'manage_subscriptions', 'manage_notifications', 'manage_config', 'manage_flags', 'view_audit', 'compliance_review', 'publish_content'] as const) {
    assert.equal(canWith(p, 'admin', cap), true, `admin should have ${cap}`);
  }
  // …but no clinical sign-off, and the former Super Admin powers only as per-account privileges.
  assert.equal(canWith(p, 'admin', 'medical_review'), false);
  assert.equal(canWith(p, 'admin', 'review_templates'), false);
  for (const cap of PRIVILEGED_CAPABILITIES) {
    assert.equal(canWith(p, 'admin', cap), false, `${cap} is never granted by role`);
    assert.equal(canWith(p, 'admin', cap, [cap]), true, `${cap} through the account's own privileges`);
    assert.equal(canWith(p, 'content_manager', cap, [cap]), false, 'privileges only count on Admin accounts');
  }
  assert.equal(canWith(p, 'medical_content_reviewer', 'medical_review'), true);
  assert.equal(canWith(p, 'medical_content_reviewer', 'review_templates'), true);
  for (const cap of ['publish_content', 'edit_content', 'view_users', 'compliance_review'] as const) assert.equal(canWith(p, 'medical_content_reviewer', cap), false, `reviewer must not ${cap}`);
  assert.equal(canWith(p, 'content_manager', 'edit_content'), true);
  assert.equal(canWith(p, 'content_manager', 'publish_content'), true, '§6.2: schedule/publish — the workflow only allows it after both approvals');
  for (const cap of ['medical_review', 'compliance_review', 'view_users', 'view_audit'] as const) assert.equal(canWith(p, 'content_manager', cap), false, `content manager must not ${cap}`);
  assert.deepEqual(p.end_user, []);
  assert.equal(isLockedCell('admin', 'manage_permissions'), true, 'privileged permissions are never per role');
  assert.equal(isLockedCell('content_manager', 'medical_review'), true, 'clinical sign-off is fixed');
  assert.equal(isLockedCell('end_user', 'view_users'), true);
  assert.equal(isLockedCell('content_manager', 'publish_content'), false);
});

test('retired roles: mapped only by migration, never valid as roles', () => {
  assert.equal(migrateRole('super_admin'), 'admin');
  assert.equal(migrateRole('support_agent'), 'admin');
  assert.equal(migrateRole('analyst'), 'admin');
  assert.equal(migrateRole('medical_reviewer'), 'medical_content_reviewer');
  assert.equal(migrateRole('content_manager'), 'content_manager');
  assert.equal(migrateRole('end_user'), 'end_user');
  for (const bad of ['owner', '__proto__', 'constructor', '', 42]) assert.equal(migrateRole(bad), null, String(bad));
  assert.deepEqual([...privilegesForLegacyRole('super_admin')].sort(), [...PRIVILEGED_CAPABILITIES].sort());
  for (const r of ['support_agent', 'analyst', 'admin']) assert.deepEqual(privilegesForLegacyRole(r), [], r);
  for (const legacy of Object.keys(LEGACY_ROLES)) assert.equal(isStaffRole(legacy), false, legacy);
  // A stored seven-role matrix: retired rows dropped, the reviewer row carried over, locked cells reset.
  const m = migratePermissionMatrix({
    super_admin: ['manage_permissions'],
    analyst: ['view_analytics'],
    medical_reviewer: ['admin_access', 'view_content', 'medical_review', 'review_templates', 'view_notifications'],
    content_manager: ['admin_access', 'edit_content', 'medical_review', 'view_staff'],
    admin: ['admin_access', 'manage_permissions'],
  });
  assert.deepEqual(Object.keys(m).sort(), [...ALL_ROLES].sort());
  assert.ok(m.medical_content_reviewer.includes('medical_review'));
  assert.ok(m.content_manager.includes('view_staff'), 'a customised cell is kept');
  assert.ok(!m.content_manager.includes('medical_review'), 'clinical sign-off reset');
  assert.ok(!m.admin.includes('manage_permissions'), 'privileged permissions never per role');
});

test('offline Web Admin state: stray privileged permissions on stored staff are dropped (only a former Super Admin keeps any)', () => {
  const v4 = initialAdminState();
  const stray = ['manage_staff', 'break_glass'];
  const v3 = {
    ...v4,
    version: 3,
    staff: [
      { ...v4.staff[1], role: 'admin', privileges: stray },
      { ...v4.staff.find((m) => m.email.startsWith('neha'))!, role: 'support_agent', privileges: stray },
      { ...v4.staff.find((m) => m.email.startsWith('kenji'))!, role: 'analyst', privileges: stray },
      { ...v4.staff.find((m) => m.email.startsWith('meera'))!, role: 'medical_reviewer', privileges: stray },
    ],
    session: null,
  };
  const out = migrateAdminState(v3)!;
  assert.equal(out.staff.length, 4);
  for (const m of out.staff) assert.deepEqual(m.privileges, [], m.email);
});

test('offline Web Admin state saved under the seven roles migrates to the four roles', () => {
  const v4 = initialAdminState();
  const legacyStaff = [
    { ...v4.staff[0], role: 'super_admin', privileges: undefined },
    { ...v4.staff[1], role: 'admin', privileges: undefined },
    { ...v4.staff.find((m) => m.email.startsWith('neha'))!, role: 'support_agent', privileges: undefined },
    { ...v4.staff.find((m) => m.email.startsWith('kenji'))!, role: 'analyst', privileges: undefined },
    { ...v4.staff.find((m) => m.email.startsWith('meera'))!, role: 'medical_reviewer', privileges: undefined },
    { ...v4.staff.find((m) => m.email.startsWith('priya'))!, role: 'content_manager', privileges: undefined },
    { ...v4.staff[0], id: 'st_gone', email: 'gone@healthx.example', role: 'chief_wizard', privileges: undefined },
  ];
  const v3 = {
    ...v4,
    version: 3,
    staff: legacyStaff,
    session: { name: 'Sam Rivera', email: 'sam.rivera@healthx.example', role: 'super_admin', signedInAt: '2026-10-01T00:00:00Z' },
    permissions: { ...DEFAULT_PERMISSIONS, super_admin: ['admin_access'], support_agent: [], analyst: [] },
    audit: [{ id: 'au_1', at: '2026-10-01T00:00:00Z', actor: 'Sam Rivera', role: 'super_admin', action: 'flag.update', target: 'x', ip: '1.2.3.4' }],
  };
  const out = migrateAdminState(v3)!;
  assert.equal(out.version, 4);
  const by = (e: string) => out.staff.find((m) => m.email.startsWith(e))!;
  assert.equal(by('sam').role, 'admin');
  assert.deepEqual([...by('sam').privileges].sort(), [...PRIVILEGED_CAPABILITIES].sort(), 'former Super Admin keeps those powers as privileges');
  assert.equal(by('alex').role, 'admin');
  assert.deepEqual(by('alex').privileges, []);
  assert.equal(by('neha').role, 'admin');
  assert.deepEqual(by('neha').privileges, [], 'former Support Agent gains no privileged permissions');
  assert.equal(by('kenji').role, 'admin');
  assert.deepEqual(by('kenji').privileges, []);
  assert.equal(by('meera').role, 'medical_content_reviewer');
  assert.equal(by('priya').role, 'content_manager');
  assert.equal(out.staff.length, legacyStaff.length - 1, 'an unknown role is dropped, not guessed');
  assert.equal(out.session!.role, 'admin');
  assert.deepEqual([...out.session!.privileges].sort(), [...PRIVILEGED_CAPABILITIES].sort());
  assert.deepEqual(Object.keys(out.permissions).sort(), [...ALL_ROLES].sort());
  assert.equal(out.audit[0].role, 'super_admin', 'history keeps the role it was written with');
  assert.equal(out.content.length, v4.content.length, 'content is untouched');
  assert.equal(migrateAdminState({ version: 2 }), null, 'older or unknown versions are not loaded');
});

test('workflow table: no shortcuts from draft to live', () => {
  assert.deepEqual(allowedTransitions('draft').sort(), ['archived', 'medical_review']);
  assert.ok(!allowedTransitions('medical_review').includes('published'));
  assert.ok(!allowedTransitions('changes_requested').includes('approved'));
  assert.ok(allowedTransitions('compliance_review').includes('published'));
});

test('user action allowlist blocks identity/entitlement changes and validates payloads', () => {
  const state = createInitialState(todayISO());
  const ctx = { today: state.today, state };
  for (const type of BLOCKED) assert.throws(() => validateUserAction({ type }, ctx), /can’t be performed/);
  assert.throws(() => validateUserAction({ type: 'UPDATE_PROFILE', patch: { plan: 'premium' } }, ctx), /can’t be set/);
  assert.throws(() => validateUserAction({ type: 'UPDATE_PROFILE', patch: { email: 'x@y.com' } }, ctx), /can’t be set/);
  assert.throws(() => validateUserAction({ type: 'ADD_WATER', ml: -5 }, ctx), /between/);
  assert.throws(() => validateUserAction({ type: 'SET_STEPS', date: '2999-01-01', steps: 10 }, ctx), /future/);
  assert.throws(() => validateUserAction({ type: 'NOPE' }, ctx), /Unknown action/);
  assert.doesNotThrow(() => validateUserAction({ type: 'ADD_WATER', ml: 250 }, ctx));
});

/** Content lifecycle (SRS §39/§40): Draft → Medical review → Compliance → Published, enforced server-side. */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { SAFETY_CHECKLIST, type ContentItem } from '@healthx/shared/admin';
import { startApi, STAFF, type Api } from './helpers';

let api: Api;
const t: Record<string, string> = {};
before(async () => {
  api = await startApi();
  for (const k of ['owner', 'admin', 'content_manager', 'content_manager2', 'reviewer', 'former_support', 'former_analyst'] as const) t[k] = (await api.loginStaff(STAFF[k])).accessToken;
  t.user = (await api.loginUser()).accessToken;
});
after(() => api.close());

const get = (id: string) => api.store.admin.content.find((c) => c.id === id)!;
const allChecked = () => Object.fromEntries(SAFETY_CHECKLIST.map((s) => [s.key, true]));
const draft = (id: string): ContentItem => ({
  id,
  title: `Test article ${id}`,
  description: 'A synthetic article used by the automated tests.',
  type: 'article',
  category: 'cycle',
  topic: 'Period basics',
  tags: [],
  durationMin: 4,
  lifeStage: 'all',
  language: 'English',
  author: 'Whoever the client claims',
  medicalReviewer: '',
  reviewDate: null,
  references: ['Synthetic reference'],
  publishedDate: null,
  updatedDate: '2026-01-01',
  scheduledFor: null,
  status: 'draft',
  version: 1,
  body: 'First paragraph.\n\nSecond paragraph.',
  media: null,
  safetyChecks: {},
  history: [],
});
const move = (token: string, id: string, patch: Partial<ContentItem>, note?: string) => {
  const cur = get(id);
  const history = note ? [...cur.history, { at: new Date().toISOString(), actor: 'client', role: 'admin' as const, action: 'x', note, version: cur.version }] : cur.history;
  return api.adminAct(token, { type: 'UPSERT_CONTENT', item: { ...cur, ...patch, history } });
};

test('full lifecycle: writer → medical reviewer → compliance → published → visible to app users', async () => {
  const create = await api.adminAct(t.content_manager, { type: 'UPSERT_CONTENT', item: draft('t1') });
  assert.equal(create.status, 200);
  assert.equal(get('t1').author, api.store.byEmail(STAFF.content_manager)!.name, 'author comes from the session');
  assert.equal(get('t1').status, 'draft');
  assert.equal((await move(t.content_manager, 't1', { status: 'medical_review' })).status, 200);
  assert.equal((await move(t.reviewer, 't1', { status: 'compliance_review', safetyChecks: allChecked() })).status, 200);
  assert.equal(get('t1').medicalReviewer, api.store.byEmail(STAFF.reviewer)!.name);
  assert.ok(get('t1').reviewDate);
  // Not yet public.
  assert.equal((await api.req('GET', '/v1/content/t1')).status, 404);
  assert.equal((await move(t.admin, 't1', { status: 'published' })).status, 200);
  assert.equal(get('t1').status, 'published');
  const pub = await api.req('GET', '/v1/content/t1');
  assert.equal(pub.status, 200);
  assert.deepEqual(pub.body.item.body, ['First paragraph.', 'Second paragraph.']);
  const st = (await api.req('GET', '/v1/me/state', { token: t.user })).body.state;
  assert.ok(st.articles.some((a: { id: string }) => a.id === 't1'), 'appears in the app library');
  const actions = get('t1').history.map((h) => h.action);
  assert.deepEqual(actions, ['Created draft', 'Submitted for medical review', 'Medical review approved', 'Compliance approved · Published']);
  for (const a of ['content.create', 'content.submit_review', 'content.medical_approve', 'content.compliance_publish']) assert.ok(api.store.admin.audit.some((e) => e.action === a), a);
});

test('separation of duties: an author cannot approve their own content', async () => {
  // Clinical sign-off can't be granted to the Admin role (fixed cell, and it's the actor's own role)…
  assert.equal((await api.adminAct(t.owner, { type: 'SET_PERMISSION', role: 'admin', cap: 'medical_review', granted: true })).status, 403);
  // …so test setup gives the Admin role medical_review directly, to check SoD independently of those guards.
  await api.adminAct(t.owner, { type: 'UPSERT_CONTENT', item: draft('t2') });
  await move(t.owner, 't2', { status: 'medical_review' });
  const defaults = api.store.admin.permissions;
  api.store.admin.permissions = { ...defaults, admin: [...defaults.admin, 'medical_review'] };
  const self = await move(t.owner, 't2', { status: 'compliance_review', safetyChecks: allChecked() });
  assert.equal(self.status, 403);
  assert.match(self.body.error.message, /wrote/);
  api.store.admin.permissions = defaults;
  // A Medical Content Reviewer can.
  assert.equal((await move(t.reviewer, 't2', { status: 'compliance_review', safetyChecks: allChecked() })).status, 200);
  // …and the author can't do the compliance approval either; another Admin can.
  assert.equal((await move(t.owner, 't2', { status: 'approved' })).status, 403);
  assert.equal((await move(t.admin, 't2', { status: 'approved' })).status, 200);
});

test('illegal transitions and missing permissions are rejected', async () => {
  await api.adminAct(t.content_manager, { type: 'UPSERT_CONTENT', item: draft('t3') });
  assert.equal((await move(t.content_manager, 't3', { status: 'published' })).status, 409, 'draft → published');
  assert.equal((await move(t.content_manager, 't3', { status: 'approved' })).status, 409, 'draft → approved');
  await move(t.content_manager, 't3', { status: 'medical_review' });
  assert.equal((await move(t.content_manager2, 't3', { status: 'compliance_review' })).status, 403, 'Content Managers cannot medically approve');
  assert.equal((await move(t.former_analyst, 't3', { status: 'compliance_review' })).status, 403, 'Admins cannot medically approve');
  assert.equal((await move(t.reviewer, 't3', { status: 'archived' })).status, 409, 'nothing archives content in review');
  assert.equal((await api.adminAct(t.user, { type: 'UPSERT_CONTENT', item: { ...get('t3'), status: 'archived' } })).status, 403, 'app users have no admin access');
  assert.equal((await move(t.content_manager, 't3', { body: 'Sneaky edit during review' })).status, 409, 'no edits while in review');
  assert.equal((await move(t.reviewer, 't3', { status: 'changes_requested' })).status, 400, 'returning content needs a comment');
  assert.equal((await move(t.reviewer, 't3', { status: 'changes_requested' }, 'Please add a reference for paragraph 2.')).status, 200);
  assert.equal(get('t3').history.at(-1)!.note, 'Please add a reference for paragraph 2.');
  assert.equal((await move(t.content_manager, 't3', { body: 'Fixed paragraph.\n\nWith reference.' })).status, 200, 'editable again');
});

test('approval is gated on the safety checklist, which only the medical reviewer can complete', async () => {
  await api.adminAct(t.content_manager, { type: 'UPSERT_CONTENT', item: draft('t4') });
  await move(t.content_manager, 't4', { status: 'medical_review' });
  assert.equal((await move(t.content_manager, 't4', { safetyChecks: allChecked() })).status, 403, 'authors can’t pre-tick the checklist');
  const partial = await move(t.reviewer, 't4', { status: 'compliance_review', safetyChecks: { non_diagnostic: true } });
  assert.equal(partial.status, 409, 'medical approval needs the complete checklist');
  assert.match(partial.body.error.message, /safety checklist/);
  assert.equal((await move(t.reviewer, 't4', { status: 'compliance_review', safetyChecks: allChecked() })).status, 200);
  assert.equal((await move(t.admin, 't4', { status: 'approved', safetyChecks: { ...allChecked(), non_diagnostic: false } })).status, 403, 'compliance can’t change the reviewer’s sign-off');
  // An item that reached compliance with an incomplete checklist (e.g. legacy data) can't be approved.
  get('t4').safetyChecks = { ...allChecked(), non_diagnostic: false };
  const r = await move(t.admin, 't4', { status: 'approved' });
  assert.equal(r.status, 409);
  assert.match(r.body.error.message, /safety checklist/);
  get('t4').safetyChecks = allChecked();
  assert.equal((await move(t.admin, 't4', { status: 'approved' })).status, 200);
});

test('archiving removes content from the public library; publishing again needs a new reviewed version', async () => {
  const id = 'a_period_basics';
  assert.equal((await api.req('GET', `/v1/content/${id}`)).status, 200);
  assert.equal((await move(t.content_manager, id, { status: 'archived' })).status, 200);
  assert.equal((await api.req('GET', `/v1/content/${id}`)).status, 404);
  const st = (await api.req('GET', '/v1/me/state', { token: t.user })).body.state;
  assert.ok(!st.articles.some((a: { id: string }) => a.id === id));
  assert.equal((await move(t.content_manager, id, { status: 'published' })).status, 409);
  assert.equal((await move(t.content_manager, id, { status: 'draft' })).status, 200, 'restore to draft');
});

test('editing a live article creates a new version that goes back through medical review', async () => {
  const id = 'a_skin_cycle';
  const cur = get(id);
  assert.equal((await move(t.content_manager, id, { body: 'Changed live body' })).status, 409);
  const r = await move(t.content_manager, id, { body: 'Updated body for v2', version: cur.version + 1, status: 'medical_review' });
  assert.equal(r.status, 200);
  assert.equal(get(id).status, 'medical_review');
  assert.equal(get(id).version, cur.version + 1);
  assert.ok(Object.values(get(id).safetyChecks).every((v) => v === false), 'checklist resets for the new version');
});

test('scheduled content publishes automatically when its time comes', async () => {
  await api.adminAct(t.content_manager, { type: 'UPSERT_CONTENT', item: draft('t5') });
  await move(t.content_manager, 't5', { status: 'medical_review' });
  await move(t.reviewer, 't5', { status: 'compliance_review', safetyChecks: allChecked() });
  await move(t.admin, 't5', { status: 'approved' });
  assert.equal((await move(t.content_manager, 't5', { status: 'scheduled', scheduledFor: new Date(Date.now() - 1000).toISOString() })).status, 400, 'past times rejected');
  assert.equal((await move(t.content_manager, 't5', { status: 'scheduled', scheduledFor: new Date(Date.now() + 1500).toISOString() })).status, 200);
  assert.equal((await api.req('GET', '/v1/content/t5')).status, 404);
  await new Promise((r) => setTimeout(r, 1700));
  assert.equal((await api.req('GET', '/v1/content/t5')).status, 200);
  assert.ok(api.store.admin.audit.some((e) => e.action === 'content.publish_scheduled'));
});

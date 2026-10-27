/**
 * Mobile-app activity reaching the Web Admin (SRS §53/§54), health-records access (A-15: Admin, permission,
 * reason, 30 minutes, audited), and Web Admin configuration reaching the app (§31, §33, §37, §41).
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { buildDailyPlan, createInitialState, defaultPlanLibrary } from '@healthx/shared';
import { PW, startApi, STAFF, type Api } from './helpers';

let api: Api;
const tok: Record<string, string> = {};
const MOBILE = { 'X-Client': 'mobile' };

before(async () => {
  api = await startApi();
  for (const [k, email] of Object.entries(STAFF)) tok[k] = (await api.loginStaff(email)).accessToken;
});
after(() => api.close());

const register = async (email: string) => {
  const r = await api.req('POST', '/v1/auth/register', { body: { name: 'Test Person', email, password: PW, acceptTerms: true }, headers: MOBILE });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body as { accessToken: string; user: { id: string } };
};
const eventsOf = (id: string) => api.store.activity.get(id) ?? [];
const userState = async (token: string) => (await api.req('GET', '/v1/me/state', { token })).body.state;

test('sign-up, sign-in and every data write from the mobile app are recorded — without health values', async () => {
  const u = await register('activity.one@example.com');
  assert.equal(eventsOf(u.user.id)[0].event, 'user_registered');
  assert.equal(eventsOf(u.user.id)[0].source, 'mobile');
  await api.req('POST', '/v1/auth/logout', { token: u.accessToken });
  const s = await api.loginUser('activity.one@example.com');
  assert.equal(eventsOf(u.user.id)[0].event, 'user_logged_in');
  assert.equal(eventsOf(u.user.id)[0].detail, 'password');

  await api.act(s.accessToken, { type: 'ADD_WATER', ml: 777 });
  await api.act(s.accessToken, { type: 'LOG_SYMPTOMS', date: (await userState(s.accessToken)).today, entries: [{ symptomId: 'cramps', severity: 'severe' }] });
  await api.act(s.accessToken, { type: 'SET_MODE', mode: 'pregnancy' });
  const names = eventsOf(u.user.id).map((e) => e.event);
  for (const n of ['water_logged', 'symptom_logged', 'life_stage_changed', 'user_logged_out']) assert.ok(names.includes(n), n);
  const dump = JSON.stringify(eventsOf(u.user.id));
  for (const needle of ['777', 'cramps', 'severe', 'pregnancy']) assert.ok(!dump.includes(needle), `activity must not contain "${needle}"`);
});

test('app-usage events are recorded only with analytics consent, and only known names and safe details', async () => {
  const u = await register('activity.two@example.com');
  const id = u.user.id;
  const before = eventsOf(id).length;
  const off = await api.req('POST', '/v1/me/events', { token: u.accessToken, body: { events: [{ name: 'screen_viewed', detail: '/cycle' }] } });
  assert.equal(off.status, 202);
  assert.equal(off.body.recorded, 0, 'analytics consent is off for new accounts');
  assert.equal(eventsOf(id).length, before);

  await api.act(u.accessToken, { type: 'SET_CONSENT', id: 'analytics', granted: true });
  const on = await api.req('POST', '/v1/me/events', { token: u.accessToken, body: { events: [{ name: 'app_opened' }, { name: 'screen_viewed', detail: '/life-stage/[mode]' }] } });
  assert.equal(on.body.recorded, 2);
  assert.equal(eventsOf(id)[0].detail, '/life-stage/[mode]');

  assert.equal((await api.req('POST', '/v1/me/events', { token: u.accessToken, body: { events: [{ name: 'diagnosis_made' }] } })).status, 400);
  const freeText = await api.req('POST', '/v1/me/events', { token: u.accessToken, body: { events: [{ name: 'app_opened' }, { name: 'ai_question_asked', detail: 'why am I so tired?' }] } });
  assert.equal(freeText.status, 400, 'free text is refused');
  assert.equal(eventsOf(id)[0].detail, '/life-stage/[mode]', 'a refused batch records nothing');
  assert.equal((await api.req('POST', '/v1/me/events', { token: tok.owner, body: { events: [] } })).status, 403, 'staff can’t post app events');
});

test('user overview and activity: Admins only; never health values', async () => {
  const id = api.store.byEmail('aisha@example.com')!.id;
  for (const k of ['content_manager', 'reviewer']) {
    assert.equal((await api.req('GET', `/v1/admin/users/${id}/overview`, { token: tok[k] })).status, 403, k);
    assert.equal((await api.req('GET', `/v1/admin/users/${id}/activity`, { token: tok[k] })).status, 403, k);
    assert.equal((await api.req('GET', '/v1/admin/activity', { token: tok[k] })).status, 403, k);
  }
  const r = await api.req('GET', `/v1/admin/users/${id}/overview`, { token: tok.former_support });
  assert.equal(r.status, 200);
  assert.match(r.body.overview.user.email, /\*\*\*@/, 'email is masked');
  assert.ok(r.body.overview.stats.total > 0, 'seeded history is visible');
  assert.ok(r.body.overview.stats.seedEvents > 0, 'and labelled as seed');
  const body = JSON.stringify(r.body);
  for (const needle of ['flowByDay', 'symptomIds', 'bbtCelsius', '"dob"', 'weightKg', 'heightCm', 'kcal', 'durationMin']) assert.ok(!body.includes(needle), needle);
  assert.ok(api.store.admin.audit.some((e) => e.action === 'user.activity_viewed' && e.target === id), 'opening a person’s activity is audited');

  const page = await api.req('GET', `/v1/admin/users/${id}/activity?category=cycle&size=5`, { token: tok.former_support });
  assert.equal(page.status, 200);
  assert.ok(page.body.events.length <= 5 && page.body.events.every((e: { category: string }) => e.category === 'cycle'));
  assert.equal((await api.req('GET', `/v1/admin/users/${id}/activity?category=nope`, { token: tok.former_support })).status, 400);
  assert.equal((await api.req('GET', '/v1/admin/users/stf_does_not_exist/overview', { token: tok.owner })).status, 404);
  const staffId = api.store.byEmail(STAFF.reviewer)!.id;
  assert.equal((await api.req('GET', `/v1/admin/users/${staffId}/overview`, { token: tok.owner })).status, 404, 'staff accounts are not app users');
});

test('activity feed, KPI summary and content engagement are capability-scoped', async () => {
  const s = await api.loginUser();
  await api.act(s.accessToken, { type: 'MARK_ARTICLE_READ', articleId: 'a_cycle_phases' });
  const feed = await api.req('GET', '/v1/admin/activity?limit=5', { token: tok.former_analyst });
  assert.equal(feed.status, 200);
  assert.equal(feed.body.events[0].userName, 'Aisha Kapoor');
  const sum = await api.req('GET', '/v1/admin/activity/summary?days=30', { token: tok.former_analyst });
  assert.equal(sum.status, 200);
  assert.ok(sum.body.summary.engagement.dau >= 1);
  assert.ok(sum.body.summary.topContent.some((c: { id: string }) => c.id === 'a_cycle_phases'));
  assert.ok(Array.isArray(sum.body.summary.recent));
  for (const k of ['content_manager', 'reviewer']) {
    assert.equal((await api.req('GET', '/v1/admin/activity/summary', { token: tok[k] })).status, 403, k);
    const eng = await api.req('GET', '/v1/admin/content/engagement', { token: tok[k] });
    assert.equal(eng.status, 200, k);
    assert.ok(!JSON.stringify(eng.body).includes('usr_'), 'content engagement carries no user ids');
  }
  assert.equal((await api.req('GET', '/v1/admin/content/engagement', { token: s.accessToken })).status, 403);
});

test('health records: break-glass permission + reason → 30-minute grant; every view audited; ends early or expires', async () => {
  const s = await api.loginUser();
  await api.act(s.accessToken, { type: 'ADD_WATER', ml: 731 });
  const id = api.store.byEmail('aisha@example.com')!.id;
  const health = (t: string) => api.req('GET', `/v1/admin/users/${id}/health`, { token: t });

  for (const k of ['former_support', 'content_manager', 'reviewer']) {
    assert.equal((await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok[k], body: { reason: 'Investigating a sync issue' } })).status, 403, k);
    assert.equal((await health(tok[k])).status, 403, k);
  }
  assert.equal((await health(tok.owner)).status, 403, 'no grant yet');
  assert.equal((await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok.owner, body: { reason: 'short' } })).status, 400);
  const g = await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok.owner, body: { reason: 'User asked support to check a sync problem' } });
  assert.equal(g.status, 200);
  assert.ok(g.body.expiresInSec > 1700 && g.body.expiresInSec <= 1800, 'about 30 minutes');

  const h = await health(tok.owner);
  assert.equal(h.status, 200);
  assert.ok(h.body.record.water.some((w: { ml: number }) => w.ml === 731), 'the records themselves');
  assert.equal(h.body.record.articles.length, 0, 'catalogues are left out');
  assert.equal(h.body.reason, 'User asked support to check a sync problem');
  assert.ok(api.store.admin.audit.some((e) => e.action === 'user.health_viewed' && e.target === id));
  assert.ok(api.store.admin.audit.every((e) => !`${e.target} ${e.detail ?? ''}`.includes('731')), 'the audit log never contains health values');

  assert.equal((await health(tok.admin2)).status, 403, 'a grant belongs to one person');
  assert.equal((await api.req('DELETE', `/v1/admin/users/${id}/break-glass`, { token: tok.owner })).status, 204);
  assert.equal((await health(tok.owner)).status, 403, 'ended early');
  assert.ok(api.store.admin.audit.some((e) => e.action === 'user.health_access_ended' && e.target === id));

  await api.req('POST', `/v1/admin/users/${id}/break-glass`, { token: tok.owner, body: { reason: 'Second look at the same sync problem' } });
  const grant = [...api.store.healthGrants.values()].find((x) => x.userId === id)!;
  grant.expiresAt = Date.now() - 1;
  assert.equal((await health(tok.owner)).status, 403, 'expired');
});

test('internal notes: Admins only, audited, erased with the account', async () => {
  const u = await register('activity.notes@example.com');
  const id = u.user.id;
  assert.equal((await api.req('POST', `/v1/admin/users/${id}/notes`, { token: tok.content_manager, body: { text: 'hello' } })).status, 403);
  const n = await api.req('POST', `/v1/admin/users/${id}/notes`, { token: tok.former_support, body: { text: 'Called about sync; resolved.' } });
  assert.equal(n.status, 201);
  assert.equal(n.body.note.by, api.store.byEmail(STAFF.former_support)!.name, 'author from the session');
  assert.equal((await api.req('POST', `/v1/admin/users/${id}/notes`, { token: tok.former_support, body: { text: '   ' } })).status, 400);
  const ov = await api.req('GET', `/v1/admin/users/${id}/overview`, { token: tok.former_support });
  assert.equal(ov.body.overview.notes[0].text, 'Called about sync; resolved.');
  assert.ok(api.store.admin.audit.some((e) => e.action === 'user.note_added' && e.target === id && !String(e.detail ?? '').includes('sync')));

  assert.equal((await api.req('DELETE', '/v1/me', { token: u.accessToken, body: { password: PW, confirm: 'DELETE' } })).status, 204);
  assert.equal(api.store.activity.has(id), false, 'activity erased (§42)');
  assert.equal(api.store.userNotes.has(id), false, 'notes erased');
});

test('daily plans: Content Manager edits, a Medical Content Reviewer approves, the app receives approved templates only', async () => {
  const base = { slot: 'mindfulness', title: 'Two-minute gratitude note', detail: 'Write down one good thing from today', icon: 'book-open', when: 'always', lifeStages: [], order: 35 };
  const created = await api.adminAct(tok.content_manager, { type: 'UPSERT_PLAN_TEMPLATE', template: { ...base, itemId: 'plan_gratitude', status: 'draft' } });
  assert.equal(created.status, 200);
  const t = created.body.state.planTemplates.find((x: { itemId: string }) => x.itemId === 'plan_gratitude');
  assert.equal(t.status, 'draft');
  assert.equal((await api.adminAct(tok.reviewer, { type: 'REVIEW_PLAN_TEMPLATE', id: t.id, decision: 'approve' })).status, 409, 'drafts can’t be approved');
  assert.equal((await api.adminAct(tok.content_manager, { type: 'UPSERT_PLAN_TEMPLATE', template: { ...base, id: t.id, detail: 'This will cure your stress', status: 'in_review' } })).status, 400, 'unsafe wording refused');
  assert.equal((await api.adminAct(tok.content_manager, { type: 'SET_PLAN_TEMPLATE_STATUS', id: t.id, status: 'in_review' })).status, 200);
  assert.equal((await api.adminAct(tok.content_manager, { type: 'REVIEW_PLAN_TEMPLATE', id: t.id, decision: 'approve' })).status, 403, 'Content Managers can’t approve');
  assert.equal((await api.adminAct(tok.owner, { type: 'REVIEW_PLAN_TEMPLATE', id: t.id, decision: 'approve' })).status, 403, 'nor can Admins (clinical sign-off)');
  assert.equal((await api.adminAct(tok.reviewer, { type: 'REVIEW_PLAN_TEMPLATE', id: t.id, decision: 'changes' })).status, 400, 'sending back needs a note');

  const s = await api.loginUser('riya.test@example.com');
  assert.ok(!(await userState(s.accessToken)).managed.planLibrary.some((x: { id: string }) => x.id === t.id), 'not live while in review');
  const ok = await api.adminAct(tok.reviewer, { type: 'REVIEW_PLAN_TEMPLATE', id: t.id, decision: 'approve' });
  assert.equal(ok.status, 200);
  assert.ok(api.store.admin.audit.some((e) => e.action === 'plan.template_approve'));
  const st = await userState(s.accessToken);
  assert.ok(st.managed.planLibrary.some((x: { id: string }) => x.id === t.id), 'live after approval');
  await api.act(s.accessToken, { type: 'REGENERATE_PLAN' });
  assert.ok((await userState(s.accessToken)).plan.items.some((i: { id: string }) => i.id === 'plan_gratitude'), 'in the user’s plan');

  // Editing an approved template takes it out of the live library until it is approved again.
  await api.adminAct(tok.content_manager, { type: 'UPSERT_PLAN_TEMPLATE', template: { ...base, id: t.id, title: 'Gratitude note', status: 'in_review' } });
  assert.ok(!(await userState(s.accessToken)).managed.planLibrary.some((x: { id: string }) => x.id === t.id));
  assert.equal((await api.adminAct(tok.reviewer, { type: 'UPSERT_PLAN_TEMPLATE', template: { ...base, itemId: 'plan_x', status: 'draft' } })).status, 403, 'reviewers don’t write templates');
});

test('the built-in plan library reproduces the original Phase 1 plan', () => {
  const s = createInitialState('2026-10-27');
  const today = s.today;
  const lowEnergy = { ...s, checkIns: [...s.checkIns.filter((c) => c.date !== today), { date: today, mood: 'low' as const, energy: 3, stress: 7, symptomIds: [] }] };
  const goals = { ...s, profile: { ...s.profile, goals: ['improve_fitness' as const, 'track_symptoms' as const] }, checkIns: s.checkIns.filter((c) => c.date !== today) };
  const plan = (x: typeof s) => buildDailyPlan(x, today, defaultPlanLibrary()).map((i) => `${i.id}:${i.title}:${i.detail}`);
  assert.deepEqual(plan(lowEnergy).slice(0, 3), ['plan_water:Drink water:2.4 L goal · spread it through the day', 'plan_walk:10-minute gentle walk:Low-energy day — keep it light', 'plan_breathe:5-minute breathing:Your stress was higher today']);
  assert.deepEqual(plan(goals), [
    'plan_water:Drink water:2.4 L goal · spread it through the day',
    'plan_walk:20-minute walk or workout:Any pace that feels good',
    'plan_breathe:5-minute breathing:A short reset',
    'plan_breakfast:Healthy breakfast:Include some protein and fibre',
    `plan_sleep:Sleep before target time:Aim for ${s.sleepTargetHours} h tonight`,
    'plan_symptoms:Log how your body feels:Symptoms take 10 seconds',
  ]);
  const pregnancyOnly = defaultPlanLibrary().concat({ ...defaultPlanLibrary()[0], id: 'pt_p', itemId: 'plan_p', lifeStages: ['pregnancy'], order: 99 });
  assert.ok(!buildDailyPlan(s, today, pregnancyOnly).some((i) => i.id === 'plan_p'), 'life-stage templates only for that stage');
  assert.ok(buildDailyPlan({ ...s, profile: { ...s.profile, mode: 'pregnancy' } }, today, pregnancyOnly).some((i) => i.id === 'plan_p'));
});

test('configuration reaches the app: score weights, insight rules, staff-added symptoms, tracking defaults', async () => {
  const s = await api.loginUser('riya.test@example.com');
  const weights = { activity: 30, sleep: 20, hydration: 10, nutrition: 10, habits: 15, mood: 15 };
  assert.equal((await api.adminAct(tok.content_manager, { type: 'SET_SCORE_WEIGHTS', weights })).status, 403);
  assert.equal((await api.adminAct(tok.admin, { type: 'SET_SCORE_WEIGHTS', weights: { ...weights, mood: 20 } })).status, 400, 'must total 100');
  assert.equal((await api.adminAct(tok.admin, { type: 'SET_SCORE_WEIGHTS', weights })).status, 200);
  assert.deepEqual((await userState(s.accessToken)).weights, weights);

  const rule = api.store.admin.rules[0].id;
  await api.adminAct(tok.admin, { type: 'TOGGLE_RULE', id: rule });
  assert.ok((await userState(s.accessToken)).managed.disabledRules.includes(rule));

  const add = await api.adminAct(tok.admin, { type: 'ADD_SYMPTOM', label: 'Jaw tension', category: 'physical' });
  assert.equal(add.status, 200);
  const sym = api.store.admin.customSymptoms.find((c) => c.label === 'Jaw tension')!;
  const st = await userState(s.accessToken);
  assert.ok(st.symptomDefs.some((d: { id: string }) => d.id === sym.id));
  assert.equal((await api.act(s.accessToken, { type: 'LOG_SYMPTOMS', date: st.today, entries: [{ symptomId: sym.id, severity: 'mild' }] })).status, 200, 'the app can log it');

  await api.adminAct(tok.admin, { type: 'SET_DEFAULTS', defaults: { waterMl: 2800, sleepHours: 8 } });
  const u = await register('activity.defaults@example.com');
  const fresh = await userState(u.accessToken);
  assert.equal(fresh.waterTargetMl, 2800);
  assert.equal(fresh.sleepTargetHours, 8);
});

test('campaigns: in-app delivery to matching inboxes, safety wording, opens counted without identities', async () => {
  const s = await api.loginUser();
  // Aisha's demo profile has content notifications off; she turns them on (people who keep them off are skipped).
  const prefs = (await userState(s.accessToken)).notificationPrefs;
  await api.act(s.accessToken, { type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...prefs, types: { ...prefs.types, content: { ...prefs.types.content, enabled: true } } } });
  const campaign = { id: 'cmp_test_inapp', name: 'Autumn reading list', title: 'New articles for you', body: 'Three new reads on sleep and stress are in Learn.', segment: { plan: 'any', countries: [], language: 'any', lastActive: '7d', appVersion: 'any' }, schedule: null, status: 'draft' };
  assert.equal((await api.adminAct(tok.owner, { type: 'UPSERT_CAMPAIGN', campaign })).status, 200);
  assert.equal((await api.adminAct(tok.content_manager, { type: 'DELIVER_CAMPAIGN', id: campaign.id })).status, 403, 'Content Managers can view but not send');
  const sent = await api.adminAct(tok.owner, { type: 'DELIVER_CAMPAIGN', id: campaign.id });
  assert.equal(sent.status, 200);
  const c = sent.body.state.campaigns.find((x: { id: string }) => x.id === campaign.id);
  assert.equal(c.status, 'sent');
  assert.equal(c.channel, 'in_app');
  assert.ok(c.delivered >= 1);
  const inbox = (await userState(s.accessToken)).notifications;
  assert.ok(inbox.some((n: { id: string; title: string }) => n.id === `cmp_${campaign.id}` && n.title === 'New articles for you'));
  assert.equal((await api.adminAct(tok.owner, { type: 'DELIVER_CAMPAIGN', id: campaign.id })).status, 409, 'sent once');
  await api.act(s.accessToken, { type: 'MARK_NOTIFICATION_READ', id: `cmp_${campaign.id}` });
  const after = (await api.req('GET', '/v1/admin/state', { token: tok.owner })).body.state.campaigns.find((x: { id: string }) => x.id === campaign.id);
  assert.equal(after.opened, 1);

  const unsafe = { ...campaign, id: 'cmp_test_unsafe', body: 'A guaranteed way to boost fertility.' };
  await api.adminAct(tok.owner, { type: 'UPSERT_CAMPAIGN', campaign: unsafe });
  assert.equal((await api.adminAct(tok.owner, { type: 'DELIVER_CAMPAIGN', id: unsafe.id })).status, 400);
});

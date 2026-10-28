// Mobile app → Web Admin, end to end, against ONE disposable in-memory API:
// - a person signs up and onboards in the mobile app (Expo web export) and uses it (water, symptoms, an
//   article, the AI coach);
// - an Admin sees all of it in the Web Admin (App activity feed, profile + timeline), opens the health records
//   only after an audited, reason-stated grant, and Content Managers / Medical Content Reviewers can't;
// - Web Admin work reaches the app: an approved daily-plan item and an in-app campaign.
// The test account is deleted at the end (its activity with it).
//
//   HEALTHX_API=http://127.0.0.1:4104 HX_API=http://127.0.0.1:4104 HX_WEB=http://127.0.0.1:5184 \
//     node mobile-admin.mjs http://127.0.0.1:8096 <outDir>
// Note: the mobile app runs as its web build in desktop Chrome — not a native device.
import { chromium } from 'playwright-core';
import { API, serverView } from './mobile-api.mjs';
import { BASE, STAFF, apiSession, go, newContext, newStaffPage, reporter, watchErrors } from './admin-api-lib.mjs';

const [mobile = 'http://127.0.0.1:8096', outDir = '.'] = process.argv.slice(2);
const { ok, step, done } = reporter();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const tag = Date.now().toString(36);
const EMAIL = `mobile.admin+${tag}@example.com`;
const PASSWORD = 'Wellness#2026e2e';
const NAME = `Asha Test ${tag.slice(-4)}`;
const PLAN_TITLE = `Gratitude note ${tag.slice(-4)}`;
const CAMPAIGN_TITLE = `New reads ${tag.slice(-4)}`;
const allErrors = [];
let userId = null;

const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mob = await mobCtx.newPage();
const apiFailures = [];
mob.on('pageerror', (e) => allErrors.push(`mobile pageerror ${e.message}`));
mob.on('console', (m) => m.type() === 'error' && allErrors.push(`mobile console ${m.text().slice(0, 160)}`));
mob.on('response', (r) => /\/v1\//.test(r.url()) && r.status() >= 400 && apiFailures.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`));

const until = async (fn, ms = 8000, every = 250) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn().catch(() => null);
    if (v) return v;
    if (Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, every));
  }
};
const cont = () => mob.getByRole('button', { name: /Get started|Continue|Agree & continue/ }).last().click();
const waitText = (page, t, timeout = 8000) => page.getByText(t, { exact: false }).first().waitFor({ timeout });
/** react-native-web's AppState follows document visibility: hidden → visible = app back in the foreground (sync). */
const foreground = (page) =>
  page.evaluate(async () => {
    let state = 'hidden';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 300));
    state = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
  });
const owner = await apiSession(STAFF.owner[0] ?? STAFF.owner);
const adminGet = async (path) => {
  const r = await fetch(API + path, { headers: { authorization: `Bearer ${owner.token}`, 'x-client': 'web-admin' } });
  return { status: r.status, body: await r.json().catch(() => undefined) };
};
/** The whole timeline: actions, plus the "App usage" module (screen views, app opens) that the default view hides. */
const activity = async () => [
  ...((await adminGet(`/v1/admin/users/${userId}/activity?size=200`)).body?.events ?? []),
  ...((await adminGet(`/v1/admin/users/${userId}/activity?size=200&category=app`)).body?.events ?? []),
];

// ---------------------------------------------------------------------------------------------
// 1. The person signs up and onboards in the mobile app, allowing product analytics.
await step('mobile: sign up and onboard (analytics allowed)', async () => {
  await mob.goto(mobile + '/signup', { waitUntil: 'load' });
  await mob.evaluate(() => localStorage.clear());
  await mob.goto(mobile + '/signup', { waitUntil: 'load' });
  await mob.getByLabel('Name').first().fill(NAME);
  await mob.getByLabel('Email').first().fill(EMAIL);
  await mob.getByLabel('Password', { exact: true }).first().fill(PASSWORD);
  await mob.getByRole('checkbox').first().click();
  await mob.getByText('Create account', { exact: true }).click();
  await waitText(mob, 'Tell us about yourself');
  await mob.getByLabel('Day').fill('12');
  await mob.getByLabel('Month').fill('3');
  await mob.getByLabel('Year').fill('1996');
  await waitText(mob, 'Your privacy, your choice');
  await mob.getByLabel('Product analytics').click();
  await cont();
  await waitText(mob, 'Tell us about your cycle');
  await mob.getByText('Skip', { exact: true }).click();
  await waitText(mob, 'Choose your profile picture');
  await cont();
  await waitText(mob, 'What are your goals?');
  await mob.getByRole('checkbox', { name: 'Track symptoms' }).click();
  await cont();
  await waitText(mob, 'Choose your plan');
  await cont(); // Continue with Free
  await waitText(mob, 'Gentle reminders that help');
  await mob.getByText('Not now', { exact: true }).click();
  await mob.waitForURL('**/home', { timeout: 10000 });
  const v = await serverView(EMAIL, PASSWORD);
  const st = await v.state();
  userId = v.user.id;
  await v.close();
  ok(st.auth.onboarded && st.consents.find((c) => c.id === 'analytics')?.granted, 'server: onboarded with analytics consent on');
});

// 2. Everyday use in the app.
await step('mobile: log water and symptoms, read an article, ask the coach', async () => {
  await mob.goto(mobile + '/hydration', { waitUntil: 'load' });
  await mob.getByText('+ 250 ml', { exact: true }).click();
  await mob.goto(mobile + '/symptoms', { waitUntil: 'load' });
  await mob.getByRole('button', { name: 'Cramps', exact: true }).first().click();
  await mob.getByText(/Save symptoms/).click();
  await mob.waitForTimeout(600);
  await mob.goto(mobile + '/learn/a_period_basics', { waitUntil: 'load' });
  await mob.waitForTimeout(1200);
  // The coach is a Premium feature: start the server-granted free trial first.
  await mob.goto(mobile + '/premium', { waitUntil: 'load' });
  await mob.getByRole('button', { name: 'Start 7-day free trial' }).click();
  await mob.getByRole('button', { name: 'Cancel Premium' }).waitFor({ timeout: 8000 });
  await mob.goto(mobile + '/coach', { waitUntil: 'load' });
  await mob.getByLabel('Message the coach').fill('How can I sleep better?');
  await mob.getByLabel('Send', { exact: true }).click();
  await mob.waitForTimeout(5000); // usage events are batched for ~4 s
  const v = await serverView(EMAIL, PASSWORD);
  const st = await v.state();
  await v.close();
  ok(st.water.some((w) => w.date === st.today && w.ml === 250) && st.symptomLogs.some((l) => l.symptomId === 'cramps'), 'server stored the water and the symptom');
});

await step('API: every step is in the person’s activity — without values', async () => {
  const want = ['user_registered', 'onboarding_completed', 'water_logged', 'symptom_logged', 'content_opened', 'content_viewed', 'ai_question_asked', 'screen_viewed', 'app_opened'];
  const evs = await until(async () => {
    const e = await activity();
    return want.every((n) => e.some((x) => x.event === n)) ? e : null;
  }, 10000);
  const names = new Set((evs ?? (await activity())).map((e) => e.event));
  for (const n of want) ok(names.has(n), `activity has ${n}`);
  const dump = JSON.stringify(evs ?? []);
  ok(!/cramps|250|sleep better/i.test(dump), 'activity holds no values, symptom names or question text');
  ok((evs ?? []).filter((e) => e.event !== 'user_registered' && e.event !== 'user_logged_in').every((e) => e.source === 'mobile'), 'events are attributed to the mobile app');
});

// ---------------------------------------------------------------------------------------------
// 3. Admin: App activity feed, profile, timeline, audited health records.
let sam = null;
await step('Admin: App activity shows the person live', async () => {
  sam = await newStaffPage(browser, STAFF.owner[0] ?? STAFF.owner);
  await go(sam.page, '/admin/activity', 1200);
  await waitText(sam.page, 'Live · recorded from the mobile app');
  await sam.page.getByRole('link', { name: NAME }).first().waitFor({ timeout: 8000 });
  ok(true, 'feed names the person (links to their profile)');
  ok((await sam.page.getByText('Logged water').count()) > 0, 'feed shows "Logged water"');
  await sam.page.screenshot({ path: `${outDir}/admin-app-activity.png`, fullPage: true });
});

await step('Admin: profile overview and activity timeline', async () => {
  await sam.page.getByRole('link', { name: NAME }).first().click();
  await sam.page.waitForURL(`**/admin/users/${userId}`, { timeout: 8000 });
  await waitText(sam.page, 'Recent activity');
  for (const t of ['Logged symptoms', 'Asked the AI coach a question']) ok((await sam.page.getByText(t).count()) > 0, `overview lists "${t}"`);
  ok((await sam.page.getByText('Cramps').count()) === 0, 'overview shows no symptom names');
  await sam.page.getByRole('tab', { name: 'Activity' }).click();
  await waitText(sam.page, 'Activity timeline');
  ok((await sam.page.getByText('Completed onboarding').count()) > 0, 'timeline lists "Completed onboarding"');
  await sam.page.getByLabel('Module').selectOption('hydration');
  await sam.page.waitForTimeout(800);
  ok((await sam.page.getByText('Logged water').count()) > 0 && (await sam.page.getByText('Logged symptoms').count()) === 0, 'timeline filters by module');
  await sam.page.screenshot({ path: `${outDir}/admin-user-activity.png`, fullPage: true });
});

await step('Admin: health records need a reason, then show the logs (audited)', async () => {
  await sam.page.getByRole('tab', { name: 'Health records' }).click();
  await waitText(sam.page, 'Open health records');
  ok((await sam.page.getByText('Cramps').count()) === 0, 'records hidden before access');
  await sam.page.getByRole('button', { name: 'Request access' }).click();
  ok((await sam.page.getByText('Enter a support ticket ID like SUP-1042.').count()) > 0, 'ticket required');
  await sam.page.locator('#hr-ticket').fill('SUP-2048');
  await sam.page.locator('#hr-reason').fill('User asked support to check their symptom log after an app update.');
  await sam.page.getByRole('checkbox').first().click();
  await sam.page.getByRole('button', { name: 'Request access' }).click();
  await waitText(sam.page, 'Break-glass access active');
  await waitText(sam.page, 'Cycle & period');
  ok((await sam.page.getByText('Cramps').count()) > 0, 'symptom log visible during the grant');
  ok((await sam.page.getByText('0.3 L').count()) + (await sam.page.getByText('0.2 L').count()) > 0, 'hydration totals visible');
  await sam.page.screenshot({ path: `${outDir}/admin-health-records.png`, fullPage: true });
  const audit = (await adminGet('/v1/admin/audit?size=200')).body.entries;
  ok(audit.some((e) => e.action === 'user.break_glass' && e.target === userId && e.detail.includes('SUP-2048')), 'audit: grant with ticket and reason');
  ok(audit.some((e) => e.action === 'user.health_viewed' && e.target === userId), 'audit: health records viewed');
  ok(!audit.some((e) => /cramps/i.test(`${e.detail ?? ''}`)), 'audit holds no health values');
  await sam.page.getByRole('button', { name: 'End access now' }).click();
  await waitText(sam.page, 'Open health records');
  ok((await adminGet(`/v1/admin/users/${userId}/health`)).status === 403, 'API refuses the records after access ends');
});

await step('Admin without the break-glass permission can see activity but not records', async () => {
  const neha = await newStaffPage(browser, STAFF.former_support[0] ?? STAFF.former_support);
  await go(neha.page, `/admin/users/${userId}?tab=health`, 1000);
  await waitText(neha.page, 'Health records are restricted');
  ok((await neha.page.getByRole('button', { name: 'Request access' }).count()) === 0, 'no request form');
  allErrors.push(...neha.errors);
  await neha.ctx.close();
});

for (const [who, persona] of [
  ['Content Manager', 'content_manager'],
  ['Medical Content Reviewer', 'reviewer'],
]) {
  await step(`${who}: no user pages, no activity`, async () => {
    const s = await newStaffPage(browser, STAFF[persona][0] ?? STAFF[persona]);
    ok((await s.page.locator('nav[aria-label=Admin] a[href="/admin/activity"]').count()) === 0, `${who}: no App activity in the menu`);
    await go(s.page, `/admin/users/${userId}`, 900);
    ok((await s.page.getByText(NAME).count()) === 0, `${who}: profile route shows nothing about the person`);
    const r = await fetch(API + `/v1/admin/users/${userId}/overview`, { headers: { authorization: `Bearer ${s.server.token}`, 'x-client': 'web-admin' } });
    ok(r.status === 403, `${who}: API refuses the overview (${r.status})`);
    allErrors.push(...s.errors);
    await s.ctx.close();
  });
}

// ---------------------------------------------------------------------------------------------
// 4. Web Admin → app: daily-plan item (CM writes, MCR approves) and an in-app campaign.
await step('Daily plans: Content Manager submits, Medical Content Reviewer approves, the app shows it', async () => {
  const cm = await newStaffPage(browser, STAFF.content_manager[0] ?? STAFF.content_manager);
  await go(cm.page, '/admin/plans', 900);
  await cm.page.getByRole('button', { name: 'New plan item' }).click();
  await cm.page.locator('#pt-title').fill(PLAN_TITLE);
  await cm.page.locator('#pt-detail').fill('Write down one good thing from today');
  await cm.page.locator('#pt-order').fill('12');
  await cm.page.getByRole('button', { name: 'Submit for review' }).click();
  await waitText(cm.page, 'Sent for medical review');
  allErrors.push(...cm.errors);
  await cm.ctx.close();

  const mcr = await newStaffPage(browser, STAFF.reviewer[0] ?? STAFF.reviewer);
  await go(mcr.page, '/admin/plans', 900);
  await mcr.page.getByRole('button', { name: `Actions for ${PLAN_TITLE}` }).click();
  await mcr.page.getByRole('menuitem', { name: 'Review…' }).click();
  await mcr.page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
  await waitText(mcr.page, 'Approved — live in the app');
  allErrors.push(...mcr.errors);
  await mcr.ctx.close();

  await mob.goto(mobile + '/plan', { waitUntil: 'load' });
  await foreground(mob);
  await mob.waitForTimeout(1500);
  await mob.getByText('Refresh plan', { exact: true }).click();
  ok(!!(await until(() => mob.getByText(PLAN_TITLE).first().isVisible(), 8000)), 'the approved item is in the person’s plan');
  await mob.screenshot({ path: `${outDir}/mobile-plan.png` });
});

await step('Campaign: Admin sends in-app now → it appears in the app’s notifications', async () => {
  // The person turns on content notifications (people who keep them off are skipped).
  const v = await serverView(EMAIL, PASSWORD);
  const st = await v.state();
  await v.close();
  if (!st.notificationPrefs.types.content.enabled) {
    await mob.goto(mobile + '/notification-settings', { waitUntil: 'load' });
    await mob.getByLabel(/New content|Content/).first().click();
    await mob.waitForTimeout(800);
  }
  await go(sam.page, '/admin/notifications/campaigns', 900);
  await sam.page.getByRole('button', { name: 'New campaign' }).click();
  await sam.page.locator('#cmp-name').fill(`E2E in-app ${tag}`);
  await sam.page.locator('#cmp-title').fill(CAMPAIGN_TITLE);
  await sam.page.locator('#cmp-body').fill('Three new reads on sleep and stress are in Learn.');
  await sam.page.getByRole('radio', { name: 'Now · in-app' }).click();
  await sam.page.getByRole('dialog').getByRole('button', { name: 'Send now' }).click();
  await waitText(sam.page, 'Sent to in-app inboxes');
  await mob.goto(mobile + '/notifications', { waitUntil: 'load' });
  await foreground(mob);
  ok(!!(await until(() => mob.getByText(CAMPAIGN_TITLE).first().isVisible(), 10000)), 'campaign is in the app’s notifications');
  await mob.screenshot({ path: `${outDir}/mobile-campaign.png` });
});

// ---------------------------------------------------------------------------------------------
// 5. Clean up: delete the test account in the app's API; its activity goes with it.
await step('cleanup: delete the test account → activity erased', async () => {
  const l = await fetch(API + '/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }).then((r) => r.json());
  const del = await fetch(API + '/v1/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile', Authorization: 'Bearer ' + l.accessToken }, body: JSON.stringify({ password: PASSWORD, confirm: 'DELETE' }) });
  ok(del.status === 204, `account deleted (${del.status})`);
  ok((await activity()).length === 0, 'its activity is gone');
});

if (sam) {
  allErrors.push(...sam.errors);
  await sam.ctx.close();
}
await mobCtx.close();
await browser.close();
const unexpected = apiFailures.filter((f) => !/^401 /.test(f));
console.log('mobile API non-2xx: ' + (apiFailures.join(', ') || 'none'));
process.exit(done([...allErrors, ...unexpected.map((f) => `mobile API ${f}`)]));

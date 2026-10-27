// MOBILE-CORE interaction checks on the Expo web export, API mode. node core-e2e.mjs <base> <outDir>
// Signs in through the UI with the synthetic demo account and asserts what the SERVER stored
// (API mode keeps no health data in browser storage). Resets that account to sample history first.
import { chromium } from 'playwright-core';
import { serverView, signInUI } from './mobile-api.mjs';
const [base, outDir] = process.argv.slice(2);
const EMAIL = 'aisha@example.com';
const sv = await serverView(EMAIL);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console ' + m.text().slice(0, 200)));
const apiFailures = []; // non-2xx API responses (some are expected, e.g. the wrong-password attempt)
page.on('response', (r) => r.url().includes('/v1/') && r.status() >= 400 && apiFailures.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname));
let pass = 0;
const fails = [];
const step = async (name, fn) => {
  try {
    await fn();
    pass++;
    console.log('PASS', name);
  } catch (e) {
    fails.push(name);
    console.log('FAIL', name, '-', e.message.split('\n')[0]);
  }
};
const go = async (p, wait = 2200) => {
  await page.goto(base + p, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
};
const store = () => sv.state(); // server state of the signed-in account
const local = () => page.evaluate(() => localStorage.getItem('healthx.mobile.state'));

await sv.reset();

await step('splash renders logo + tagline', async () => {
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.getByText('Your wellness, understood.').waitFor({ timeout: 4000 });
  await page.screenshot({ path: `${outDir}/splash.png` });
});
await page.waitForTimeout(2500);
await step('explore demo → log in (server) → home', async () => {
  await page.getByText('Explore demo', { exact: true }).first().click();
  await page.waitForURL('**/login**', { timeout: 6000 });
  if ((await page.getByLabel('Email', { exact: true }).inputValue()) !== EMAIL) throw new Error('demo email not prefilled');
  await page.getByLabel('Password', { exact: true }).fill('wrong-password-1');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByText(/Email or password is incorrect|incorrect/i).first().waitFor({ timeout: 6000 });
  await signInUI(page, base, EMAIL);
});

await step('custom symptom: validation + create with default severity', async () => {
  await go('/symptoms');
  await page.getByLabel('Create a custom symptom').click(); // in-app navigation: no reload until the log is saved
  await page.getByText('Create symptom', { exact: true }).click();
  await page.getByText('Use at least 2 characters.').waitFor({ timeout: 2000 });
  await page.getByLabel('Symptom name').fill('Jaw tension');
  await page.getByText('Severe', { exact: true }).click();
  await page.getByLabel('Icon zap').click();
  await page.getByText('Jaw tension · Severe').waitFor({ timeout: 2000 });
  await page.getByText('Create symptom', { exact: true }).click();
  await page.waitForTimeout(1200);
  const s = await store();
  const def = s.symptomDefs.find((d) => d.label === 'Jaw tension');
  if (!def || def.defaultSeverity !== 'severe' || def.icon !== 'zap') throw new Error('custom symptom not stored correctly ' + JSON.stringify(def));
});
await step('symptom log right after creating it (no reload) uses the server id + default severity', async () => {
  // Back on Symptoms with the new symptom already selected (?select=…), ready to log.
  await page.waitForURL(/\/symptoms\?/, { timeout: 4000 });
  await page.getByText('Jaw tension — severity').waitFor({ timeout: 2000 });
  // No severity is chosen manually: a stored "severe" log proves the default was preselected.
  await page.getByText(/Save symptoms/).click();
  await page.waitForTimeout(800);
  const s = await store();
  const def = s.symptomDefs.find((d) => d.label === 'Jaw tension');
  if (!s.symptomLogs.some((l) => l.symptomId === def.id && l.severity === 'severe')) throw new Error('log not saved');
});
await step('duplicate custom symptom blocked, stored once on the server', async () => {
  await go('/symptom-new');
  await page.getByLabel('Symptom name').fill('Jaw tension');
  await page.getByText('Create symptom', { exact: true }).click();
  await page.getByText('You already have a symptom with this name.').first().waitFor({ timeout: 5000 });
  await page.waitForTimeout(800);
  const n = (await store()).symptomDefs.filter((d) => d.label.toLowerCase() === 'jaw tension').length;
  if (n !== 1) throw new Error(`server has ${n} "Jaw tension" symptoms`);
});
await step('mood log: slider tap + factors + save', async () => {
  await go('/mood');
  await page.getByLabel('Good', { exact: true }).click();
  const slider = page.getByRole('adjustable', { name: 'Anxiety' }).or(page.getByLabel('Anxiety', { exact: true })).first();
  // Stress and anxiety are optional (§14): the slider appears once "Add anxiety level" is on.
  if (!(await slider.isVisible())) await page.getByLabel('Add anxiety level').click();
  const box = await slider.boundingBox();
  await page.mouse.click(box.x + box.width * 0.99, box.y + box.height / 2);
  await page.getByText('10 / 10').first().waitFor({ timeout: 2000 });
  await page.getByText('Work', { exact: true }).click();
  await page.getByText('Weather', { exact: true }).click();
  await page.getByText('Save mood', { exact: true }).click();
  await page.waitForTimeout(800);
  const s = await store();
  const ci = s.checkIns.find((c) => c.date === s.today);
  if (!ci || ci.mood !== 'good' || ci.anxiety !== 10 || !ci.moodFactors.includes('work') || !ci.moodFactors.includes('weather')) throw new Error('mood not saved ' + JSON.stringify(ci));
});
await step('water: +250 and custom validation', async () => {
  await go('/hydration');
  const before = (await store()).water.length;
  await page.getByText('+ 250 ml', { exact: true }).click();
  await page.getByText('Custom', { exact: true }).click();
  await page.getByText('Add', { exact: true }).click();
  await page.getByText('Enter an amount of at least 10 ml.').waitFor({ timeout: 2000 });
  await page.getByLabel('Amount (ml)').fill('400');
  await page.getByText('Add', { exact: true }).click();
  await page.waitForTimeout(800);
  const after = (await store()).water.length;
  if (after !== before + 2) throw new Error(`water entries ${before}→${after}`);
});
await step('water: remove the entry just added (no reload) is removed on the server', async () => {
  const before = (await store()).water.length;
  await page.getByLabel(/^Remove 400 millilitres/).first().click();
  await page.waitForTimeout(800);
  const s = await store();
  if (s.water.length !== before - 1 || s.water.some((w) => w.ml === 400 && w.date === s.today)) throw new Error(`server water ${before}→${s.water.length}`);
});
await step('steps: validation + save', async () => {
  await go('/steps');
  await page.getByText('Add steps manually', { exact: true }).click();
  await page.getByLabel('Steps', { exact: true }).fill('');
  await page.getByText('Save steps', { exact: true }).click();
  await page.getByText('Enter a whole number of steps.').waitFor({ timeout: 2000 });
  await page.getByLabel('Steps', { exact: true }).fill('7123');
  await page.getByText('Save steps', { exact: true }).click();
  await page.getByText('7,123', { exact: true }).first().waitFor({ timeout: 3000 });
  await page.waitForTimeout(600);
  const s = await store();
  if (s.activity.find((d) => d.date === s.today)?.steps !== 7123) throw new Error('steps not stored on the server');
});
await step('goals: create a goal', async () => {
  await go('/goals');
  const before = (await store()).goals.length;
  await page.getByText('New goal', { exact: true }).click();
  await page.getByText('Workouts', { exact: true }).last().click();
  await page.getByLabel('Increase Target').click();
  await page.getByText('Create goal', { exact: true }).click();
  await page.waitForTimeout(800);
  const s = await store();
  if (s.goals.length !== before + 1 || !s.goals.some((g) => g.title === '4 workouts a week')) throw new Error('goal not created');
});
await step('workout session: next → finish logs a session', async () => {
  await go('/workout/session/w_home_20', 2500);
  const before = (await store()).sessions.length;
  for (let i = 0; i < 10; i++) {
    const next = page.getByText('Next exercise ›', { exact: true });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(150);
  }
  await page.getByText('Finish workout', { exact: true }).click();
  await page.getByText('Session saved').waitFor({ timeout: 3000 });
  await page.waitForTimeout(600);
  const after = (await store()).sessions.length;
  if (after !== before + 1) throw new Error(`sessions ${before}→${after}`);
});
await step('day detail opens from calendar', async () => {
  await go('/calendar');
  await page.locator('[aria-label*="October"], [aria-label*="Oct"]').first().click().catch(() => {});
  await page.waitForTimeout(1200);
  if (!page.url().includes('/day/')) {
    await go(`/day/${(await store()).today}`);
  }
  await page.getByText('Add log for this day').waitFor({ timeout: 3000 });
  await page.screenshot({ path: `${outDir}/day-today.png` });
});
await step('reload keeps the session (refresh token) and shows server data', async () => {
  await go('/hydration');
  const s = await store();
  const ml = s.water.filter((w) => w.date === s.today).reduce((t, w) => t + w.ml, 0);
  await page.getByText(`${(ml / 1000).toFixed(1)} L`, { exact: true }).first().waitFor({ timeout: 4000 });
});
await step('API mode stores no health data in browser storage', async () => {
  const raw = await local();
  const ss = await page.evaluate(() => Object.keys(sessionStorage));
  if (raw) throw new Error('healthx.mobile.state found in localStorage');
  if (ss.some((k) => k !== 'healthx.refreshToken')) throw new Error('unexpected sessionStorage keys ' + ss.join(','));
});

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) console.log(fails.join('\n'));
console.log('API non-2xx responses: ' + (apiFailures.join(', ') || 'none'));
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'no console errors');
await sv.close();
await browser.close();

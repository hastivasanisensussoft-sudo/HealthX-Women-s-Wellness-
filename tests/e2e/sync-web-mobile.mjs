// Cross-device check: the web user app (Vite, :5183 → /api proxy) and the mobile app (Expo web export, :8095)
// signed in as the same synthetic demo user on the same disposable in-memory API (:4103).
// node sync-web-mobile.mjs <mobileBase> <webBase> <outDir>
// Note: both clients run in desktop Chrome — this is the mobile app's web build, not a native device.
import { chromium } from 'playwright-core';
import { API, DEMO_PASSWORD, serverView, signInUI } from './mobile-api.mjs';
const [mobile = 'http://127.0.0.1:8095', web = 'http://127.0.0.1:5183', outDir = '.'] = process.argv.slice(2);
const AISHA = 'aisha@example.com';
const RIYA = 'riya.test@example.com';
const tag = Date.now().toString(36).slice(-4);
const SYMPTOM = `Sync check ${tag}`;
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const apiFailures = [];
const watch = (page, who) => {
  page.on('pageerror', (e) => errors.push(`${who} pageerror ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${who} console ${m.text().slice(0, 160)}`));
  page.on('response', (r) => /\/v1\//.test(r.url()) && r.status() >= 400 && apiFailures.push(`${who} ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`));
  return page;
};
const webPage = watch(await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(), 'web');
const mob = watch(await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(), 'mobile');
const riya = watch(await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(), 'riya-mobile');

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
const until = async (fn, ms = 6000, every = 250) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, every));
  }
};
const visibleText = (page, t) => page.getByText(t, { exact: true }).first().isVisible().catch(() => false);
/** react-native-web's AppState follows document visibility: hidden → visible is "app returns to the foreground". */
const foreground = (page) =>
  page.evaluate(async () => {
    let state = 'hidden';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 200));
    state = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
  });
const webLogin = async (email) => {
  await webPage.goto(web + '/login', { waitUntil: 'load' });
  await webPage.locator('#email').fill(email);
  await webPage.locator('#password').fill(DEMO_PASSWORD);
  await webPage.getByRole('button', { name: 'Log in', exact: true }).click();
  await webPage.waitForURL(/\/app(\/|$)/, { timeout: 10000 });
};
const todayWater = async (email) => {
  const v = await serverView(email);
  try {
    const s = await v.state();
    return s.water.filter((w) => w.date === s.today).map((w) => w.ml);
  } finally {
    await v.close();
  }
};

// Fresh sample history for the demo user (disposable in-memory API).
{
  const v = await serverView(AISHA);
  await v.reset();
  await v.close();
}

await step('same user signs in on web and on mobile', async () => {
  await webLogin(AISHA);
  await signInUI(mob, mobile, AISHA);
});
await step('web → mobile: water logged on web appears on mobile after returning to the foreground', async () => {
  await mob.goto(mobile + '/hydration', { waitUntil: 'load' });
  await mob.getByText('Today', { exact: true }).first().waitFor({ timeout: 8000 });
  if (await visibleText(mob, '333 ml')) throw new Error('333 ml already shown before the web write');
  await webPage.goto(web + '/app/hydration', { waitUntil: 'load' });
  await webPage.getByLabel('Custom amount in ml').fill('333');
  await webPage.getByRole('button', { name: 'Add', exact: true }).click();
  if (!(await until(async () => (await todayWater(AISHA)).includes(333)))) throw new Error('web write never reached the server');
  await mob.waitForTimeout(500);
  if (await visibleText(mob, '333 ml')) throw new Error('mobile changed before any refresh trigger (unexpected)');
  await foreground(mob);
  if (!(await until(() => visibleText(mob, '333 ml'), 5000))) throw new Error('333 ml not shown on mobile after foreground');
  await mob.screenshot({ path: `${outDir}/sync-mobile-water.png` });
});
await step('web → mobile: periodic sync (≤ 30 s) without any interaction', async () => {
  await webPage.getByLabel('Custom amount in ml').fill('444');
  await webPage.getByRole('button', { name: 'Add', exact: true }).click();
  if (!(await until(async () => (await todayWater(AISHA)).includes(444)))) throw new Error('web write never reached the server');
  const t0 = Date.now();
  if (!(await until(() => visibleText(mob, '444 ml'), 36000, 500))) throw new Error('444 ml not shown on mobile within 36 s');
  console.log(`   appeared on mobile after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
});
await step('mobile → web: custom symptom created + logged on mobile appears on web', async () => {
  await mob.goto(mobile + '/symptom-new', { waitUntil: 'load' });
  await mob.getByLabel('Symptom name').fill(SYMPTOM);
  await mob.getByText('Create symptom', { exact: true }).click();
  await mob.waitForTimeout(800);
  await mob.goto(mobile + '/symptoms', { waitUntil: 'load' });
  await mob.getByRole('button', { name: SYMPTOM, exact: true }).first().click();
  await mob.getByText(/Save symptoms/).click();
  const v = await serverView(AISHA);
  const stored = await until(async () => {
    const s = await v.state();
    const def = s.symptomDefs.find((d) => d.label === SYMPTOM);
    return def && s.symptomLogs.some((l) => l.symptomId === def.id && l.date === s.today);
  });
  await v.close();
  if (!stored) throw new Error('mobile symptom not stored on the server');
  await webPage.goto(web + '/app/symptoms', { waitUntil: 'load' });
  await webPage.getByText(SYMPTOM).first().waitFor({ timeout: 8000 });
  await webPage.screenshot({ path: `${outDir}/sync-web-symptom.png` });
});
await step('isolation: a second user (Riya) does not see Aisha’s new entries', async () => {
  await signInUI(riya, mobile, RIYA);
  await riya.goto(mobile + '/hydration', { waitUntil: 'load' });
  await riya.getByText('Today', { exact: true }).first().waitFor({ timeout: 8000 });
  if ((await visibleText(riya, '333 ml')) || (await visibleText(riya, '444 ml'))) throw new Error('Aisha’s water visible to Riya');
  await riya.goto(mobile + '/symptoms', { waitUntil: 'load' });
  await riya.waitForTimeout(1500);
  if (await riya.getByText(SYMPTOM).count()) throw new Error('Aisha’s custom symptom visible to Riya');
  const v = await serverView(RIYA);
  const s = await v.state();
  await v.close();
  if (s.symptomDefs.some((d) => d.label === SYMPTOM)) throw new Error('Riya’s server state has Aisha’s symptom');
  if (s.profile.email && s.profile.email !== RIYA) throw new Error('wrong profile ' + s.profile.email);
});
await step('sign-out on mobile does not sign out the web session', async () => {
  await mob.goto(mobile + '/settings', { waitUntil: 'load' });
  await mob.getByText('Sign out', { exact: true }).last().click();
  await mob.waitForURL('**/welcome', { timeout: 6000 });
  await webPage.goto(web + '/app/hydration', { waitUntil: 'load' });
  await webPage.getByLabel('Custom amount in ml').fill('111');
  await webPage.getByRole('button', { name: 'Add', exact: true }).click();
  if (!(await until(async () => (await todayWater(AISHA)).includes(111)))) throw new Error('web could not write after mobile sign-out');
  if (!/\/app\/hydration/.test(webPage.url())) throw new Error('web left the app: ' + webPage.url());
});
await step('sign out of all devices (from mobile) ends the web session too, but not Riya’s', async () => {
  await signInUI(mob, mobile, AISHA);
  await mob.goto(mobile + '/settings', { waitUntil: 'load' });
  await mob.getByText('Sign out of all devices', { exact: true }).click();
  await mob.waitForURL('**/welcome', { timeout: 6000 });
  // Web: the next request (reload / focus / 30 s poll) finds the session revoked.
  await webPage.goto(web + '/app/hydration', { waitUntil: 'load' });
  await webPage.waitForURL(/\/login/, { timeout: 10000 });
  await webPage.screenshot({ path: `${outDir}/sync-web-after-logout-all.png` });
  // Riya (another account) is unaffected.
  await riya.goto(mobile + '/hydration', { waitUntil: 'load' });
  await riya.getByText('Today', { exact: true }).first().waitFor({ timeout: 8000 });
  if (riya.url().includes('/welcome') || riya.url().includes('/login')) throw new Error('Riya was signed out');
});

await step('log out of all devices (from web) → mobile returns to Log in with a message on foreground', async () => {
  await signInUI(mob, mobile, AISHA);
  await webLogin(AISHA);
  await webPage.goto(web + '/app/profile', { waitUntil: 'load' });
  await webPage.getByRole('button', { name: 'Log out of all devices' }).click();
  await webPage.getByRole('button', { name: 'Log out all', exact: true }).click();
  await webPage.waitForURL(/\/login/, { timeout: 10000 });
  await foreground(mob);
  await mob.waitForURL('**/login**', { timeout: 8000 });
  await mob.getByText('Your session ended — please sign in again.').first().waitFor({ timeout: 4000 });
  await mob.waitForTimeout(1500); // must settle on Log in (not bounce to Welcome)
  if (!new URL(mob.url()).pathname.startsWith('/login')) throw new Error('settled on ' + mob.url());
  await mob.getByText('Welcome back', { exact: true }).first().waitFor({ timeout: 3000 });
  await mob.screenshot({ path: `${outDir}/sync-mobile-session-ended.png` });
  if (await mob.evaluate(() => sessionStorage.getItem('healthx.refreshToken'))) throw new Error('mobile kept a refresh token');
});

console.log(`\n${pass} passed, ${fails.length} failed${fails.length ? ': ' + fails.join(' | ') : ''}`);
console.log('API non-2xx responses: ' + (apiFailures.join(', ') || 'none'));
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'no console errors');
await browser.close();

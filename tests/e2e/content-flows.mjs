// Interaction checks for the MOBILE-CONTENT screens on the Expo web export, API mode.
// node content-flows.mjs <base>. Uses the synthetic demo account (reset to sample history first) and,
// for trial / export / delete, a disposable account registered for this run and deleted by the test.
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { API, registerDisposable, serverView, signInUI } from './mobile-api.mjs';
const base = process.argv[2] ?? 'http://127.0.0.1:8095';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 200)));
const apiFailures = [];
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
const go = async (p) => {
  await page.goto(base + p, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
};
const visible = (t, opts = {}) => page.getByText(t, { exact: true, ...opts }).first().isVisible();

const aisha = await serverView('aisha@example.com');
await aisha.reset();
const store = () => aisha.state();
await signInUI(page, base, 'aisha@example.com');

await step('library: Audio filter shows only audio Quick Help', async () => {
  await go('/learn');
  await page.getByLabel('Audio', { exact: true }).click();
  await page.waitForTimeout(400);
  if (!(await visible('SOS: fall back asleep'))) throw new Error('audio item missing');
  if (await visible('Sitali breathing to cool down')) throw new Error('video item still shown');
  await page.getByLabel('Audio', { exact: true }).click();
});
await step('library: Audio + 30 min → empty state + clear', async () => {
  await page.getByLabel('Audio', { exact: true }).click();
  await page.getByLabel('30 min', { exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByText('Nothing matches').first().waitFor({ timeout: 2000 });
  await page.getByText('Clear filters', { exact: true }).first().click();
  await page.waitForTimeout(300);
  if (!(await visible('Sitali breathing to cool down'))) throw new Error('not cleared');
});
await step('library: heart toggles favorites + Favorites filter (stored on server)', async () => {
  const before = (await store()).bookmarks.length;
  await page.getByLabel('Add to favorites').first().click();
  await page.getByText('Added to favorites').first().waitFor({ timeout: 2000 });
  await page.getByLabel('Favorites', { exact: true }).click();
  await page.waitForTimeout(400);
  if (!(await visible('Migraine & tension days: a gentle neck and eye routine'))) throw new Error('favorite not listed');
  const after = (await store()).bookmarks.length;
  if (after !== before + 1) throw new Error(`server bookmarks ${before}→${after}`);
});
await step('library → Most Asked Questions → FAQ detail', async () => {
  await page.getByLabel('Favorites', { exact: true }).click();
  await page.getByLabel('Most asked questions').click();
  await page.getByText('Finding the right gynecologist').first().waitFor({ timeout: 4000 });
  await page.getByLabel('Question: Finding the right gynecologist').click();
  // Articles come from the server's published content, with the reviewer recorded by the content workflow.
  await page.getByText(/^Medically reviewed by .+/).first().waitFor({ timeout: 4000 });
  if (!page.url().endsWith('/learn/faq_gynecologist')) throw new Error('not on the FAQ detail: ' + page.url());
});
await step('player: play advances, pause, +15 s', async () => {
  await go('/learn/q_sitali');
  await page.getByLabel(/^Play video, 5 minutes/).click();
  await page.getByText('Now playing').first().waitFor({ timeout: 4000 });
  await page.getByLabel('Play', { exact: true }).click();
  await page.waitForTimeout(2300);
  if (await visible('0:00')) throw new Error('timer did not advance');
  await page.getByLabel('Pause', { exact: true }).click();
  const before = await page.getByText(/^0:0\d$/).first().innerText();
  await page.getByLabel('Forward 15 seconds').click();
  await page.waitForTimeout(200);
  const after = await page.getByText(/^0:\d\d$/).first().innerText();
  const sec = (t) => Number(t.split(':')[1]);
  if (sec(after) - sec(before) !== 15) throw new Error(`skip ${before} → ${after}`);
});
await step('community: like increments (stored on server)', async () => {
  await go('/community');
  const like = page.getByLabel('Like', { exact: true }).first();
  await like.click();
  await page.getByLabel('Unlike', { exact: true }).first().waitFor({ timeout: 2000 });
  if (!(await visible('25'))) throw new Error('count not 25');
  await page.waitForTimeout(500);
  if (!(await store()).community.posts.some((p) => p.liked && p.likes === 25)) throw new Error('like not stored');
});
await step('community: post validation + publish (stored on server)', async () => {
  await page.getByText('New post', { exact: true }).last().click();
  await page.getByText('Post', { exact: true }).last().click();
  await page.getByText('Write at least 3 characters.').first().waitFor({ timeout: 2000 });
  await page.getByLabel('Your post').fill('Short evening walks help me unwind.');
  await page.getByText('Post', { exact: true }).last().click();
  await page.getByText('Short evening walks help me unwind.').first().waitFor({ timeout: 3000 });
  await page.waitForTimeout(500);
  if (!(await store()).community.posts.some((p) => p.mine && p.text === 'Short evening walks help me unwind.')) throw new Error('post not stored');
});
await step('community: report hides post text', async () => {
  await page.getByText('All', { exact: true }).first().click();
  await page.getByLabel('Report post by Meera R.').click();
  await page.getByText('Report', { exact: true }).last().click();
  await page.getByText('You reported this post. It’s hidden for you while moderators review it.').first().waitFor({ timeout: 3000 });
  await page.waitForTimeout(500);
  if (!(await store()).community.posts.some((p) => p.author === 'Meera R.' && p.reported)) throw new Error('report not stored');
});
await step('community: block hides author', async () => {
  await page.getByLabel('Block Sana P.').click();
  await page.getByText('Block', { exact: true }).last().click();
  await page.waitForTimeout(500);
  if (await visible('Sana P.')) throw new Error('blocked author still visible');
  await page.getByText(/Hidden: posts from 1 blocked member/).first().waitFor({ timeout: 2000 });
  if (!(await store()).community.blocked.length) throw new Error('block not stored');
});
await step('offline: banner + FAQ load error + retry online', async () => {
  await go('/learn');
  await page.getByLabel('Most asked questions').click(); // load the FAQ route chunk while online (web export code-splits routes)
  await page.getByText('Finding the right gynecologist').first().waitFor({ timeout: 4000 });
  await page.getByLabel('Go back').last().click();
  await page.getByText('Quick Help', { exact: true }).first().waitFor({ timeout: 3000 });
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.getByText(/You’re offline/).first().waitFor({ timeout: 3000 });
  await page.getByLabel('Most asked questions').click();
  await page.getByText('Couldn’t load content').first().waitFor({ timeout: 4000 });
  await ctx.setOffline(false);
  await page.getByText('Try again', { exact: true }).first().click();
  await page.getByText('Finding the right gynecologist').first().waitFor({ timeout: 4000 });
});
await ctx.setOffline(false);
await step('offline write: toast + rolled back after re-sync', async () => {
  await go('/hydration');
  const before = (await store()).water.length;
  await ctx.setOffline(true);
  await page.getByText('+ 250 ml', { exact: true }).click();
  await page.getByText('Not saved — can’t reach the HealthX server.').first().waitFor({ timeout: 5000 });
  await ctx.setOffline(false);
  await go('/hydration'); // a reload (or the 30 s / foreground sync) re-fetches the server state
  const after = (await store()).water.length;
  if (after !== before) throw new Error(`server water ${before}→${after}`);
});
await step('insights: Monthly + Cycle report periods (Premium preview on Free)', async () => {
  if ((await store()).profile.plan !== 'free') throw new Error('demo account is not on Free');
  await go('/insights?tab=weekly');
  await page.getByRole('tablist').filter({ hasText: 'Monthly' }).getByText('Monthly', { exact: true }).click();
  await page.getByText('Your last 30 days').first().waitFor({ timeout: 5000 });
  await page.getByText('Monthly & cycle reports', { exact: true }).first().waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Start 7-day free trial' }).first().waitFor({ timeout: 3000 });
  await page.getByRole('tablist').filter({ hasText: 'Monthly' }).getByText('Cycle', { exact: true }).click();
  await page.getByText('This cycle so far').first().waitFor({ timeout: 5000 });
});
await step('integrations: consent prompt → connect shows data-type toggles (server)', async () => {
  await go('/integrations');
  await page.getByText('Connect Apple Health', { exact: true }).click();
  await page.getByText('Allow health integrations?').first().waitFor({ timeout: 3000 });
  await page.getByText('Allow & connect', { exact: true }).click();
  await page.getByText(/Connected · synced/).first().waitFor({ timeout: 4000 });
  await page.getByText('Disconnect Apple Health', { exact: true }).waitFor({ timeout: 2000 });
  await page.waitForTimeout(500);
  const s = await store();
  if (!s.connections.find((c) => c.id === 'apple_health')?.connected) throw new Error('connection not stored');
  if (!s.consents.find((c) => c.id === 'health_integrations')?.granted) throw new Error('consent not stored');
});
await step('privacy: withdraw optional consents (server)', async () => {
  await go('/privacy');
  await page.getByText('Withdraw optional consents', { exact: true }).click();
  await page.getByText(/Withdrew \d optional consent|No optional consents are on/).first().waitFor({ timeout: 3000 });
  await page.waitForTimeout(600);
  const s = await store();
  const on = s.consents.filter((c) => !c.required && c.granted).map((c) => c.id);
  if (on.length) throw new Error('still granted on server: ' + on.join(','));
  // Withdrawing health-integrations consent also disconnects every connection (shared reducer).
  if (s.connections.some((c) => c.connected)) throw new Error('connections still connected on server');
});
await step('sign out (profile) → welcome; server session ended', async () => {
  await go('/profile');
  await page.getByText('Sign out', { exact: true }).last().click();
  await page.waitForURL('**/welcome', { timeout: 6000 });
  const t = await page.evaluate(() => sessionStorage.getItem('healthx.refreshToken'));
  if (t) throw new Error('refresh token left in storage');
  await go('/home');
  await page.waitForURL('**/welcome', { timeout: 6000 });
});

// ----- disposable account: trial, export, delete -----
const temp = await registerDisposable('mobile.content');
const tv = await serverView(temp.email, temp.password);
await tv.reset(); // sample history so the account lands on Home
await step('disposable account signs in through the UI', async () => {
  await signInUI(page, base, temp.email, temp.password);
});
await step('premium: start trial → active (server) → back to free → second trial refused', async () => {
  await go('/premium');
  await page.getByLabel('Monthly, ₹249 / month').click();
  await page.getByText('Start 7-day free trial', { exact: true }).click();
  await page.getByText('Free trial active').first().waitFor({ timeout: 4000 });
  // The end date comes from the server's reply (7 days from now).
  await page.getByText(/Trial ends .* · 7 days left/).first().waitFor({ timeout: 4000 });
  if ((await tv.state()).profile.plan !== 'premium') throw new Error('plan not premium on server');
  await page.getByText('Cancel Premium', { exact: true }).click();
  await page.getByText('Switch back to Free?').first().waitFor({ timeout: 4000 });
  await page.getByText('Switch to Free', { exact: true }).click();
  await page.getByText('Start 7-day free trial', { exact: true }).waitFor({ timeout: 4000 });
  if ((await tv.state()).profile.plan !== 'free') throw new Error('plan not free on server');
  await page.getByText('Start 7-day free trial', { exact: true }).click();
  await page.getByText('You’ve already used your free trial.').first().waitFor({ timeout: 4000 });
  if ((await tv.state()).profile.plan !== 'free') throw new Error('second trial granted');
});
await step('privacy: export downloads this account’s JSON from the server', async () => {
  await go('/privacy');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByText('Export my data', { exact: true }).last().click()]);
  const json = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  const text = JSON.stringify(json);
  if (!text.includes(temp.email)) throw new Error('export does not contain the account email');
  if (text.includes('aisha@example.com')) throw new Error('export contains another user');
  console.log('   export:', dl.suggestedFilename(), Object.keys(json).join(', '));
});
await step('delete account: gated, wrong password refused, then deleted on server', async () => {
  await go('/delete-account');
  const btn = page.getByLabel('Delete permanently');
  if ((await btn.getAttribute('aria-disabled')) !== 'true') throw new Error('delete button not disabled before password + DELETE');
  await btn.click({ force: true });
  await page.waitForTimeout(1000);
  if (!page.url().endsWith('/delete-account')) throw new Error('delete ran without password + DELETE');
  await page.getByLabel('Password', { exact: true }).fill('not-my-password');
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await btn.click();
  await page.getByText('Your password is incorrect.').first().waitFor({ timeout: 5000 });
  await page.getByLabel('Password', { exact: true }).fill(temp.password);
  await btn.click();
  await page.waitForURL('**/welcome', { timeout: 6000 });
  const r = await fetch(API + '/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' }, body: JSON.stringify({ email: temp.email, password: temp.password }) });
  if (r.status !== 401) throw new Error('deleted account can still sign in: ' + r.status);
});

console.log(`\n${pass} passed, ${fails.length} failed${fails.length ? ': ' + fails.join(' | ') : ''}`);
console.log('API non-2xx responses: ' + (apiFailures.join(', ') || 'none'));
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 15).join('\n') : 'no console errors');
await aisha.close();
await browser.close();

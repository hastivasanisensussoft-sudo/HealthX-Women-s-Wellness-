// Mobile (Expo web export) connection + auth edge cases, API mode. node mobile-connection.mjs <base> <outDir>
// - API unreachable → "Can’t reach the HealthX server" → Try again → Use offline demo (no requests sent)
// - offline demo persists on the device and survives reload; Connect → back to the server
// - staff account → Web Admin message; Apple/Google → server "not configured"; magic link end to end
import { chromium } from 'playwright-core';
import { API, serverView } from './mobile-api.mjs';
const [base = 'http://127.0.0.1:8095', outDir = '.'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console ' + m.text().slice(0, 160)));
let apiRequests = 0;
page.on('request', (r) => r.url().startsWith(API) && apiRequests++);
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
const BANNER = 'Offline demo — data stays on this device; nothing is sent to a server.';
const block = () => ctx.route(API + '/**', (r) => r.abort('connectionrefused'));
const unblock = () => ctx.unroute(API + '/**');

await block();
await step('API unreachable → clear error screen with the server address', async () => {
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.getByText('Can’t reach the HealthX server').waitFor({ timeout: 8000 });
  await page.getByText(`Server: ${API}`).waitFor({ timeout: 2000 });
  await page.screenshot({ path: `${outDir}/conn-unreachable.png` });
});
await step('Try again while still unreachable keeps the error screen', async () => {
  await page.getByText('Try again', { exact: true }).click();
  await page.waitForTimeout(1500);
  await page.getByText('Can’t reach the HealthX server').waitFor({ timeout: 4000 });
});
let before = 0;
await step('Use offline demo → banner, sample data, and no API requests', async () => {
  await page.getByText('Use offline demo', { exact: true }).click();
  await page.getByText(BANNER).waitFor({ timeout: 6000 });
  await page.getByText('Explore demo', { exact: true }).first().click();
  await page.getByText('Wellness Score').first().waitFor({ timeout: 8000 });
  before = apiRequests;
  await page.goto(base + '/hydration', { waitUntil: 'load' });
  await page.getByText(BANNER).waitFor({ timeout: 6000 });
  await page.getByText('+ 250 ml', { exact: true }).click();
  await page.waitForTimeout(800);
  if (apiRequests !== before) throw new Error(`${apiRequests - before} API request(s) attempted in offline demo`);
  await page.screenshot({ path: `${outDir}/conn-offline-demo.png` });
});
await step('offline demo choice + data persist on the device across reload', async () => {
  const n1 = await page.evaluate(() => JSON.parse(localStorage.getItem('healthx.mobile.state')).water.length);
  await page.reload({ waitUntil: 'load' });
  await page.getByText(BANNER).waitFor({ timeout: 6000 });
  await page.waitForTimeout(800);
  const n2 = await page.evaluate(() => JSON.parse(localStorage.getItem('healthx.mobile.state')).water.length);
  if (n1 !== n2 || !n1) throw new Error(`water ${n1} → ${n2}`);
  if (apiRequests !== before) throw new Error('API contacted after reload in offline demo');
});
await unblock();
await step('Connect → back to the server: banner gone, signed out, sign-in works', async () => {
  await page.getByText('Connect', { exact: true }).click();
  await page.getByText('Explore demo', { exact: true }).first().waitFor({ timeout: 10000 });
  if (await page.getByText(BANNER).count()) throw new Error('offline banner still shown');
  if (await page.evaluate(() => localStorage.getItem('healthx.mobile.offlineDemo'))) throw new Error('offline choice not cleared');
  await page.getByText('Explore demo', { exact: true }).first().click();
  await page.waitForURL('**/login**', { timeout: 6000 });
});
await step('staff account is sent to the Web Admin (no app session)', async () => {
  await page.goto(base + '/login?email=' + encodeURIComponent('sam.rivera@healthx.example'), { waitUntil: 'load' });
  await page.getByLabel('Password', { exact: true }).fill(process.env.HEALTHX_DEMO_PASSWORD ?? 'HealthX-demo-2026');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByText('Staff accounts sign in to the HealthX Web Admin, not the app.').waitFor({ timeout: 6000 });
  if (!page.url().includes('/login')) throw new Error('left the login screen');
  if (await page.evaluate(() => sessionStorage.getItem('healthx.refreshToken'))) throw new Error('a token was stored');
});
await step('Apple / Google show the server’s “not configured” message', async () => {
  await page.getByText(/Continue with Google/).first().click();
  await page.getByText(/need OAuth client credentials/).first().waitFor({ timeout: 6000 });
  if (!page.url().includes('/login')) throw new Error('navigated away');
});
await step('magic link: request → link from the dev outbox → signed in', async () => {
  await page.goto(base + '/login?email=' + encodeURIComponent('riya.test@example.com'), { waitUntil: 'load' });
  await page.getByText('Email me a magic link', { exact: true }).click();
  await page.getByText(/If an account exists for riya\.test@example\.com/).waitFor({ timeout: 6000 });
  const box = await (await fetch(API + '/v1/dev/outbox?to=' + encodeURIComponent('riya.test@example.com'))).json();
  const mails = box.messages ?? [];
  const link = mails.find((m) => /magic=/.test(m.link ?? ''))?.link;
  if (!link) throw new Error('no magic link in the dev outbox: ' + JSON.stringify(box).slice(0, 200));
  const url = new URL(link);
  if (url.origin !== base) throw new Error('link points at ' + url.origin);
  await page.goto(link, { waitUntil: 'load' });
  await page.getByText('Wellness Score').first().waitFor({ timeout: 10000 });
  const v = await serverView('riya.test@example.com');
  const sessions = await v.sessions();
  await v.close();
  if (!sessions.some((s) => s.client === 'mobile')) throw new Error('no mobile session on the server');
  // single use
  const again = await fetch(API + '/v1/auth/magic-link/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' }, body: JSON.stringify({ token: url.searchParams.get('magic') }) });
  if (again.ok) throw new Error('magic link worked twice');
});

console.log(`\n${pass} passed, ${fails.length} failed${fails.length ? ': ' + fails.join(' | ') : ''}`);
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 15).join('\n') : 'no console errors');
await browser.close();

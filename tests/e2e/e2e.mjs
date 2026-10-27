// Core user journey (web) against the real API: signup → onboarding → logging → coach → export.
// usage: node e2e.mjs [--base=http://127.0.0.1:5181]   (offline demo: add --demo to run against the browser-only demo)
import { B, deleteDisposable, harness, serverState, stamp } from './hx-lib.mjs';

const DEMO = process.argv.includes('--demo');
const t = harness();
const { ctx, page } = await t.newPage();
const email = `riya.${stamp}@example.test`;
const password = 'Wellness#2026';
if (DEMO) {
  await page.goto(B + '/login');
  await page.evaluate(() => (localStorage.clear(), localStorage.setItem('healthx.offlineDemo', '1')));
}

await t.step('signup validation shows errors', async () => {
  await page.goto(B + '/signup');
  await page.click('button[type=submit]');
  await page.getByText('Please enter your name.').waitFor({ timeout: 5000 });
});
await t.step('signup → onboarding', async () => {
  await page.fill('#name', 'Riya');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('input[type=checkbox]');
  await page.click('button[type=submit]');
  await page.waitForURL('**/onboarding', { timeout: 8000 });
});
await t.step('onboarding flow (goals → about → privacy → cycle → reminders) → sample data → dashboard', async () => {
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByText('Step 1 of 5').waitFor({ timeout: 3000 });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Choose at least one goal').waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: /Understand my cycle/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.fill('#ob-dob', '1998-05-10');
  await page.getByRole('radio', { name: 'Avatar 2' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Agree & continue' }).click();
  await page.getByText('Please accept the terms').waitFor({ timeout: 2000 });
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Agree & continue' }).click();
  await page.getByText('Is your cycle regular?').waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Gentle reminders that help').waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: 'Not now' }).click();
  await page.getByRole('button', { name: /Explore with sample data/ }).click();
  await page.waitForURL('**/app', { timeout: 10000 });
  await page.getByText(/Riya/).first().waitFor({ timeout: 5000 });
});
await t.step('quick add water updates hydration', async () => {
  await page.getByRole('button', { name: '+ 250 ml' }).click();
  await page.getByText('+250 ml water').waitFor({ timeout: 3000 });
});
await t.step('daily check-in save', async () => {
  await page.goto(B + '/app/check-in');
  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByRole('button', { name: /None today/ }).click();
  await page.getByRole('button', { name: /Save check-in|Update check-in/ }).click();
  await page.getByText('Thanks for checking in').waitFor({ timeout: 4000 });
});
await t.step('log period from cycle page', async () => {
  await page.goto(B + '/app/cycle');
  await page.getByRole('button', { name: 'Log period' }).first().click();
  await page.getByRole('button', { name: 'Save period' }).click();
  await page.getByText('Period logged').waitFor({ timeout: 3000 });
  await page.getByText(/Period day 1|Menstrual phase/).first().waitFor({ timeout: 3000 });
});
await t.step('coach declines diagnosis', async () => {
  await page.goto(B + '/app/coach');
  await page.fill('input[aria-label="Message the coach"]', 'Do I have PCOS?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText(/can't diagnose conditions/).waitFor({ timeout: 4000 });
});
await t.step('coach redirects emergency', async () => {
  await page.fill('input[aria-label="Message the coach"]', 'I have chest pain');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText('Please seek help now').waitFor({ timeout: 4000 });
});
await t.step('everything above survived a reload (server state, not the browser)', async () => {
  // (The coach chat itself is not stored anywhere — by design it lives only in the open page.)
  await page.goto(B + '/app/cycle');
  await page.reload();
  await page.getByText(/Period day 1|Menstrual phase/).first().waitFor({ timeout: 8000 });
  if (DEMO) return;
  const today = new Date().toLocaleDateString('en-CA');
  const st = await serverState(page);
  if (!st.periods.some((p) => p.start === today)) throw new Error('period not on the server');
  if (!st.water.some((w) => w.date === today && w.ml === 250)) throw new Error('water not on the server');
  if (st.checkIns.find((c) => c.date === today)?.mood !== 'good') throw new Error('check-in not on the server');
});
await t.step('export data downloads JSON', async () => {
  await page.goto(B + '/app/privacy');
  await page.getByRole('button', { name: 'Export data' }).click();
  if (DEMO) await page.fill('#pv-pw', 'password123'); // the offline demo asks for a (simulated) password
  const dl = page.waitForEvent('download', { timeout: 8000 });
  await page.getByRole('button', { name: 'Start export' }).click();
  const d = await dl;
  console.log('   downloaded', d.suggestedFilename());
});
await t.step('an app-user session does not open the Web Admin (staff sign in separately)', async () => {
  await page.goto(B + '/admin');
  await page.locator('input[type=password]').first().waitFor({ timeout: 8000 });
  if (!new URL(page.url()).pathname.startsWith('/admin/login')) throw new Error(`at ${page.url()}`);
});

if (!DEMO) {
  const s = await deleteDisposable({ email, password });
  if (s !== 204 && s !== 200) console.log(`   cleanup: ${email} → ${s}`);
}
await ctx.close();
await t.done();

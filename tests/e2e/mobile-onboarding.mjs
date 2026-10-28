// Mobile sign-up + onboarding order check on the Expo web export, API mode: the 9-step flow, consent before cycle data,
// a skipped cycle step saving nothing assumed, and the 7-day trial chosen on the plan step.
// Registers a disposable account (unique per run) through the UI, checks what the server stored, then deletes it.
import { chromium } from 'playwright-core';
import { API, serverView } from './mobile-api.mjs';
const base = process.argv[2] ?? 'http://127.0.0.1:8095';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
const apiFailures = [];
page.on('response', (r) => r.url().includes('/v1/') && r.status() >= 400 && apiFailures.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname));
const expect = async (text) => {
  console.log('  … waiting for', text);
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 6000 });
};
const cont = () => page.getByRole('button', { name: /Get started|Continue|Agree & continue/ }).last().click();
const EMAIL = `priya.onboarding+${Date.now().toString(36)}@example.com`;
const PASSWORD = 'Wellness#2026';
let ok = true;
try {
  await page.goto(base + '/signup', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(base + '/signup', { waitUntil: 'load' });
  await page.getByLabel('Name').first().fill('Priya');
  await page.getByLabel('Email').first().fill('aisha@example.com');
  await page.getByLabel('Password', { exact: true }).first().fill(PASSWORD);
  await page.getByRole('checkbox').first().click();
  await page.getByText('Create account', { exact: true }).click();
  await expect('An account with this email already exists');
  console.log('PASS server error shown inline for an existing email');
  await page.getByLabel('Email').first().fill(EMAIL);
  await page.getByText('Create account', { exact: true }).click();
  // The flow: 1 Welcome → 2 Sign up → 3 About you (+ consent) → 4 Cycle → 5 Avatar → 6 Goals → 7 Plan → 8 Notifications → 9 Home.
  await expect('Tell us about yourself');
  await expect('Step 3 of 9');
  console.log('PASS account created on the server → onboarding step 3 of 9 (about you)');
  await page.getByLabel('Day').fill('12');
  await page.getByLabel('Month').fill('3');
  await page.getByLabel('Year').fill('1996');
  await expect('Your privacy, your choice');
  if (await page.getByText('Tell us about your cycle').count()) throw new Error('cycle questions shown before consent');
  console.log('PASS consent closes step 3, before any cycle questions');
  await cont();
  await expect('Tell us about your cycle');
  await expect('Step 4 of 9');
  console.log('PASS step 4/9 is cycle');
  await cont();
  await expect('Pick the first day of your last period');
  console.log('PASS cycle validation shown');
  await page.getByText('Skip', { exact: true }).click();
  await expect('Choose your profile picture');
  console.log('PASS Skip on cycle → step 5/9 avatar & profile image');
  await cont();
  await expect('What are your goals?');
  console.log('PASS step 6/9 is goals');
  await cont();
  await expect('Choose your plan');
  console.log('PASS step 7/9 is the subscription plan');
  await page.getByRole('radio', { name: /^Premium plan/ }).click();
  await page.getByRole('button', { name: 'Start 7-day free trial' }).click();
  await expect('Gentle reminders that help');
  await expect('Step 8 of 9');
  console.log('PASS trial started → step 8/9 notification preferences');
  await page.getByText('Not now', { exact: true }).click();
  await page.waitForURL('**/home', { timeout: 8000 });
  console.log('PASS finish → home (step 9)');
  await page.waitForTimeout(800);
  const sv = await serverView(EMAIL, PASSWORD);
  const st = await sv.state();
  console.log(`server state: onboarded=${st.auth?.onboarded} name=${st.profile?.name} plan=${st.profile?.plan} lastPeriodStart=${st.cycleProfile?.lastPeriodStart} healthConsent=${st.consents?.find((c) => c.id === 'health_processing')?.granted} periods=${st.periods.length}`);
  if (!st.auth?.onboarded) throw new Error('onboarding not stored on the server');
  console.log('PASS onboarding stored on the server');
  if (st.profile?.plan !== 'premium') throw new Error('trial chosen in onboarding but the server plan is ' + st.profile?.plan);
  console.log('PASS the server granted the 7-day trial chosen in onboarding');
  // Skipping the cycle step saves "not known" — never an assumed cycle length.
  const cp = st.cycleProfile;
  if (cp.lastPeriodStart !== null || cp.typicalCycleLength !== null || cp.typicalPeriodLength !== null || cp.regularity !== 'not_sure') throw new Error('skip saved assumed cycle values: ' + JSON.stringify(cp));
  console.log('PASS skipped cycle step saved nothing assumed');
  await page.reload({ waitUntil: 'load' });
  await page.getByText('Wellness Score').first().waitFor({ timeout: 8000 });
  console.log('PASS reload → still signed in, lands on Home');
  const local = await page.evaluate(() => localStorage.getItem('healthx.mobile.state'));
  if (local) throw new Error('health state cached in localStorage');
  console.log('PASS nothing cached in localStorage');
  await sv.close();

  // Email confirmation: new accounts start unverified.
  const HINT = 'Confirm your email — open the link we sent you.';
  await page.getByText(HINT).first().waitFor({ timeout: 4000 });
  console.log('PASS confirm-email hint shown for the new (unverified) account');
  const confirmations = async () => (await (await fetch(API + '/v1/dev/outbox?to=' + encodeURIComponent(EMAIL))).json()).messages.filter((m) => /\/verify-email\?token=/.test(m.link ?? ''));
  const n1 = (await confirmations()).length;
  await page.getByLabel('Resend confirmation email').click();
  await expect('Confirmation email sent');
  const mails = await confirmations();
  if (mails.length !== n1 + 1) throw new Error(`confirmation emails ${n1} → ${mails.length}`);
  console.log(`PASS resend → new confirmation email in the dev outbox (${n1} → ${mails.length})`);
  const link = mails[0].link; // newest first
  if (new URL(link).origin !== base) throw new Error('link points at ' + new URL(link).origin);
  await page.goto(link, { waitUntil: 'load' });
  await expect('Your email is confirmed');
  console.log('PASS confirmation link → /verify-email confirms the address');
  const again = await fetch(API + '/v1/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' }, body: JSON.stringify({ token: new URL(link).searchParams.get('token') }) });
  console.log(`  (reusing the same link → ${again.status})`);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText('Wellness Score').first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(600);
  if (await page.getByText(HINT).count()) throw new Error('hint still shown after confirming');
  console.log('PASS hint gone after confirming');
} catch (e) {
  ok = false;
  console.log('FAIL', e.message.split('\n')[0]);
}
// Clean up: delete only the account this test created.
const login = await fetch(API + '/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
if (login.ok) {
  const { accessToken } = await login.json();
  const del = await fetch(API + '/v1/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile', Authorization: 'Bearer ' + accessToken }, body: JSON.stringify({ password: PASSWORD, confirm: 'DELETE' }) });
  console.log('cleanup: deleted test account →', del.status);
}
console.log(ok ? 'onboarding order OK' : 'onboarding FAILED');
console.log('API non-2xx responses: ' + (apiFailures.join(', ') || 'none'));
console.log(errors.length ? 'console errors:\n' + [...new Set(errors)].join('\n') : 'no console errors');
await browser.close();

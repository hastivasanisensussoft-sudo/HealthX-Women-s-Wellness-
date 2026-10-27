// The web outside the Web Admin, after the end-user web app was retired (people use the mobile app):
// - every public website page at desktop and phone width (heading, no 404, no horizontal overflow, no errors);
// - header calls to action lead to "Get the app" and staff sign-in;
// - retired routes (/app/*, /signup, /login, /onboarding, /forgot-password) redirect to "Get the app";
// - account links from emails still work on the web: password reset (end to end, disposable account),
//   email confirmation, and the magic-link hand-off to the app (the single-use token is never redeemed here).
// usage: node site-nav.mjs [--base=http://127.0.0.1:5184]   (Vite proxying /api to a disposable API)
import { B, api, harness, outboxLink, registerDisposable, deleteDisposable } from './hx-lib.mjs';

const t = harness();
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const info = (page) =>
  page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    notFound: /page not found/i.test(document.body.innerText),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    path: location.pathname,
  }));

const SITE = ['/', '/about', '/features', '/how-it-works', '/pricing', '/faq', '/contact', '/get-the-app', '/terms', '/privacy-policy'];

for (const w of [1440, 390]) {
  const { page, ctx } = await t.newPage({ viewport: { width: w, height: w > 500 ? 900 : 844 } });
  await t.step(`site @${w}: every public page renders without overflow`, async () => {
    for (const p of SITE) {
      await page.goto(B + p, { waitUntil: 'networkidle' });
      await page.locator('h1').first().waitFor({ timeout: 8000 }).catch(() => undefined); // lazy route chunks
      const i = await info(page);
      expect(i.h1 && !i.notFound, `${p}: h1 "${i.h1}" notFound=${i.notFound}`);
      expect(i.overflow <= 1, `${p}: horizontal overflow ${i.overflow}px`);
    }
  });
  await t.step(`site @${w}: calls to action lead to the app page and staff sign-in`, async () => {
    await page.goto(B + '/', { waitUntil: 'networkidle' });
    if (w < 500) await page.getByRole('button', { name: 'Open menu' }).click();
    const header = page.locator('header');
    expect((await header.locator('a[href="/get-the-app"]').count()) > 0, 'no "Get the app" in the header');
    expect((await header.locator('a[href="/admin/login"]').count()) > 0, 'no staff sign-in in the header');
    expect((await page.locator('a[href="/signup"], a[href="/login"], a[href="/app"]').count()) === 0, 'links into the retired web app remain');
    await header.locator('a[href="/get-the-app"]:visible').first().click();
    await page.waitForURL('**/get-the-app');
    await page.getByRole('heading', { name: /HealthX lives/ }).waitFor({ timeout: 5000 });
  });
  await ctx.close();
}

{
  const { page } = await t.newPage();
  await t.step('retired web-app routes redirect to "Get the app"', async () => {
    for (const p of ['/app', '/app/cycle', '/app/settings/appearance', '/signup', '/login', '/onboarding', '/forgot-password']) {
      await page.goto(B + p, { waitUntil: 'networkidle' });
      expect(new URL(page.url()).pathname === '/get-the-app', `${p} → ${new URL(page.url()).pathname}`);
    }
  });

  await t.step('magic link hands off to the app without redeeming the token', async () => {
    await page.goto(B + '/login?magic=abc123token', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Continue in the HealthX app' }).waitFor({ timeout: 5000 });
    const href = await page.getByRole('link', { name: 'Open in the HealthX app' }).getAttribute('href');
    expect(href === 'healthx://login?magic=abc123token', `deep link ${href}`);
  });

  await t.step('email confirmation and reset pages handle missing or used links', async () => {
    await page.goto(B + '/verify-email', { waitUntil: 'networkidle' });
    await page.getByText('This link has expired or was already used').waitFor({ timeout: 5000 });
    await page.goto(B + '/reset-password', { waitUntil: 'networkidle' });
    await page.getByText('This link has expired or was already used').waitFor({ timeout: 5000 });
  });

  // A real reset for an account created by this test (the API answers from its dev outbox).
  const acct = await registerDisposable('site.reset');
  const NEW_PW = 'Fresh#Password2026';
  await t.step('password reset from an emailed link, then the new password works in the app API', async () => {
    const r = await api('POST', '/v1/auth/password/forgot', { body: { email: acct.email } });
    expect(r.status === 202, `forgot → ${r.status}`);
    const link = await outboxLink(acct.email, /Reset your HealthX password/);
    expect(!!link, 'no reset link in the dev outbox');
    const u = new URL(link);
    await page.goto(B + u.pathname + u.search, { waitUntil: 'networkidle' });
    await page.locator('#rp-pw').fill(NEW_PW);
    await page.locator('#rp-confirm').fill(NEW_PW);
    await page.getByRole('button', { name: 'Update password' }).click();
    await page.getByText('Your password has been changed').waitFor({ timeout: 6000 });
    await page.getByText('Open the HealthX app on your phone').first().waitFor();
    const login = await api('POST', '/v1/auth/login', { body: { email: acct.email, password: NEW_PW }, headers: { 'X-Client': 'mobile' } });
    expect(login.status === 200, `login with the new password → ${login.status}`);
    acct.password = NEW_PW;
  });
  await deleteDisposable(acct);
}

await t.done();

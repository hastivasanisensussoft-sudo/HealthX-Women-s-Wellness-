// E2E for the web user app in API mode (real HealthX API behind the Vite /api proxy).
// usage: node e2e-api-user.mjs [--base=http://127.0.0.1:5181]
// Data changes happen in disposable accounts created here (deleted at the end); the seeded demo
// accounts are only read, except one reminder Aisha creates for the isolation check (removed again).
import { readFile } from 'node:fs/promises';
import { api, B, deleteDisposable, DEMO_PW, harness, outboxLink, registerDisposable, serverState, stamp, staffToken, uiLogin } from './hx-lib.mjs';

// Deliberate negative tests — these API errors are the expected outcome.
const t = harness({
  expected: [
    /^400 POST \/api\/v1\/auth\/register$/, // common password
    /^409 POST \/api\/v1\/auth\/register$/, // duplicate email
    /^400 POST \/api\/v1\/auth\/password\/reset$/, // reused link
    /^400 POST \/api\/v1\/auth\/magic-link\/verify$/, // reused link
    /^400 DELETE \/api\/v1\/me$/, // wrong password on delete
    /^501 POST \/api\/v1\/auth\/oauth\/(google|apple)$/, // social sign-in not configured
    /^404 GET \/api\/v1\/me\/records\/reminders\//, // cross-account read
    /^401 GET \/api\/v1\/me\/state$/, // after logout-all on another device
    /^409 POST \/api\/v1\/me\/actions$/, // stale optimistic change rejected
    /^409 POST \/api\/v1\/me\/subscription\/trial$/, // second trial
    /^401 POST \/api\/v1\/auth\/logout$/, // sign-out right after account deletion (the server already revoked the session)
  ],
});
const waitHeading = (page, re, timeout = 8000) => page.getByRole('heading', { level: 1, name: re }).first().waitFor({ timeout });
const toast = (page, text) => page.getByRole('status').or(page.getByRole('alert')).filter({ hasText: text }).first();
const cleanup = [];
const today = new Date().toLocaleDateString('en-CA');

// ---------- register → onboarding → log data → persists ----------
{
  const email = `eve.${stamp}@example.test`;
  const pw = 'Wellness#2026e2e';
  cleanup.push({ email, password: pw });
  const { ctx, page } = await t.newPage();
  await t.step('register: the server’s password policy (common password) is shown on the password field', async () => {
    await page.goto(B + '/signup');
    await page.locator('#name').fill('Eve Test');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('healthx1'); // passes the client strength hint, refused by the server
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.getByText('Choose a less common password.').waitFor({ timeout: 5000 });
    if (!page.url().endsWith('/signup')) throw new Error('left the signup page');
  });
  await t.step('register a new account → onboarding (server says not onboarded yet)', async () => {
    await page.locator('#password').fill(pw);
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForURL('**/onboarding', { timeout: 8000 });
  });
  await t.step('duplicate email is refused by the server and shown on the email field', async () => {
    const p2 = await t.newPage();
    await p2.page.goto(B + '/signup');
    await p2.page.locator('#name').fill('Eve Again');
    await p2.page.locator('#email').fill(email);
    await p2.page.locator('#password').fill(pw);
    await p2.page.getByRole('checkbox').first().check();
    await p2.page.getByRole('button', { name: 'Create account' }).click();
    await p2.page.getByText(/already exists/i).waitFor({ timeout: 5000 });
    await p2.ctx.close();
  });
  await t.step('onboarding (start fresh) completes through the API', async () => {
    await page.getByRole('button', { name: 'Get started' }).click();
    await page.getByRole('button', { name: /Understand my cycle/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.fill('#ob-dob', '1995-04-02');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Agree & continue' }).click();
    await page.getByText('Is your cycle regular?').waitFor({ timeout: 4000 });
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Not now' }).click();
    await page.getByRole('button', { name: /Start fresh/ }).click();
    await page.waitForURL('**/app', { timeout: 8000 });
    await waitHeading(page, /Eve/);
    const st = await serverState(page);
    if (!st.auth.onboarded || st.profile.name !== 'Eve Test') throw new Error('onboarding not stored on the server');
  });
  await t.step('log water, a symptom and a period in the UI → reload → all three come back from the server', async () => {
    await page.goto(B + '/app/hydration');
    await waitHeading(page, /Hydration/);
    await page.getByRole('button', { name: /\+250/ }).first().click();
    await page.goto(B + '/app/symptoms');
    await waitHeading(page, /Symptom tracking/);
    await page.getByRole('button', { name: /^Headache/ }).first().click();
    await page.getByRole('button', { name: 'Save symptoms' }).click();
    await page.getByText(/Symptoms saved/).waitFor({ timeout: 4000 });
    await page.goto(B + '/app/cycle');
    await waitHeading(page, /Period tracking/);
    await page.getByRole('button', { name: 'Log period' }).first().click();
    await page.getByRole('button', { name: 'Save period' }).click();
    await page.getByText('Period logged').first().waitFor({ timeout: 4000 });
    await page.waitForTimeout(1000); // let the send queue drain
    await page.reload();
    await waitHeading(page, /Period tracking/);
    await page.getByText(/Period day 1|Menstrual phase/).first().waitFor({ timeout: 5000 });
    const st = await serverState(page);
    if (!st.water.some((w) => w.ml === 250 && w.date === today)) throw new Error('water not on the server');
    if (!st.symptomLogs.some((l) => l.symptomId === 'headache' && l.date === today)) throw new Error('symptom not on the server');
    if (!st.periods.some((p) => p.start === today)) throw new Error('period not on the server');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    if (keys.includes('healthx.demo.state')) throw new Error(`health data in localStorage (${keys.join(', ')})`);
  });
  await t.step('logout → protected page redirects to login → log in again → data still there', async () => {
    await page.goto(B + '/app');
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login', { timeout: 5000 });
    await page.goto(B + '/app/hydration');
    await page.waitForURL('**/login', { timeout: 5000 });
    await uiLogin(page, email, pw);
    if (!new URL(page.url()).pathname.startsWith('/app')) throw new Error(`landed on ${page.url()}`);
    await page.goto(B + '/app/hydration');
    await page.getByText('250 ml').first().waitFor({ timeout: 5000 });
  });
  await t.step('email confirmation: banner + “Not confirmed” until the emailed link is opened, then “Verified”', async () => {
    await page.goto(B + '/app/profile');
    await page.getByText('Please confirm your email').waitFor({ timeout: 5000 });
    await page.getByText('Not confirmed').waitFor({ timeout: 3000 });
    const link = new URL(await outboxLink(email, /confirm/i));
    await page.goto(B + link.pathname + link.search);
    await page.getByText('Your email is confirmed').waitFor({ timeout: 6000 });
    await page.getByRole('link', { name: 'Continue to HealthX' }).click();
    await page.waitForURL('**/app', { timeout: 5000 });
    await page.goto(B + '/app/profile');
    await page.getByText('Verified', { exact: true }).waitFor({ timeout: 5000 });
    if (await page.getByText('Please confirm your email').count()) throw new Error('banner still shown');
    const again = await api('POST', '/v1/auth/verify-email', { body: { token: link.searchParams.get('token') } });
    if (again.status !== 400) throw new Error(`link reusable (${again.status})`);
  });
  await ctx.close();
}

// ---------- cross-account isolation ----------
await t.step('cross-account: Riya can’t see a reminder Aisha created (UI + direct API 404)', async () => {
  const a = await t.newPage();
  await uiLogin(a.page, 'aisha@example.com');
  const title = `Aisha private ${stamp}`;
  // Aisha creates a reminder with her real browser session, then reads its server id back.
  const id = await a.page.evaluate(async (title) => {
    const r = await fetch('/api/v1/auth/refresh', { method: 'POST', headers: { 'X-Client': 'web' }, credentials: 'include' });
    const { accessToken } = await r.json();
    const h = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const add = await fetch('/api/v1/me/actions', { method: 'POST', headers: h, body: JSON.stringify({ action: { type: 'ADD_REMINDER', reminder: { title, type: 'habit', time: '07:30', enabled: true } } }) });
    if (!add.ok) return null;
    const st = (await (await fetch('/api/v1/me/state', { headers: h })).json()).state;
    return st.reminders.find((x) => x.title === title)?.id ?? null;
  }, title);
  if (!id) throw new Error('setup failed');
  const own = await a.page.evaluate(async (id) => {
    const { accessToken } = await (await fetch('/api/v1/auth/refresh', { method: 'POST', headers: { 'X-Client': 'web' }, credentials: 'include' })).json();
    return (await fetch(`/api/v1/me/records/reminders/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })).status;
  }, id);
  if (own !== 200) throw new Error(`owner can’t read her own record (${own})`);
  const r = await t.newPage();
  await uiLogin(r.page, 'riya.test@example.com');
  await r.page.goto(B + '/app/notifications');
  await waitHeading(r.page, /Notifications/);
  if (await r.page.getByText(title).count()) throw new Error('Aisha’s reminder visible to Riya');
  const status = await r.page.evaluate(async (id) => {
    const { accessToken } = await (await fetch('/api/v1/auth/refresh', { method: 'POST', headers: { 'X-Client': 'web' }, credentials: 'include' })).json();
    return (await fetch(`/api/v1/me/records/reminders/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })).status;
  }, id);
  if (status !== 404) throw new Error(`expected 404 for Riya, got ${status}`);
  // Clean up the record this test created.
  const del = await a.page.evaluate(async (id) => {
    const { accessToken } = await (await fetch('/api/v1/auth/refresh', { method: 'POST', headers: { 'X-Client': 'web' }, credentials: 'include' })).json();
    return (await fetch('/api/v1/me/actions', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: { type: 'DELETE_REMINDER', id } }) })).status;
  }, id);
  if (del !== 200) throw new Error(`cleanup failed (${del})`);
  await a.ctx.close();
  await r.ctx.close();
});

// ---------- forgot / reset password + magic link ----------
await t.step('forgot password → link from the dev outbox → reset (validation, single use) → sign in with the new password', async () => {
  const acct = await registerDisposable('reset', 'Original#2026');
  cleanup.push({ email: acct.email, password: 'Changed#2026x' });
  const { ctx, page } = await t.newPage();
  await page.goto(B + '/forgot-password');
  await page.locator('#email').fill(acct.email);
  await page.getByRole('button', { name: 'Send link' }).click();
  await page.getByText(/Resend link in/).waitFor({ timeout: 5000 });
  const link = await outboxLink(acct.email, /reset/i);
  const token = new URL(link).searchParams.get('token');
  await page.goto(`${B}/reset-password?token=${token}`);
  await page.locator('#rp-pw').fill('Changed#2026x');
  await page.locator('#rp-confirm').fill('Changed#2026');
  await page.getByRole('button', { name: 'Update password' }).click();
  await page.getByText('Passwords don’t match.').waitFor({ timeout: 3000 });
  await page.locator('#rp-confirm').fill('Changed#2026x');
  await page.getByRole('button', { name: 'Update password' }).click();
  await page.getByText('Your password has been changed').waitFor({ timeout: 5000 });
  await page.waitForURL('**/login', { timeout: 5000 });
  await page.goto(`${B}/reset-password?token=${token}`);
  await page.locator('#rp-pw').fill('Another#2026x');
  await page.locator('#rp-confirm').fill('Another#2026x');
  await page.getByRole('button', { name: 'Update password' }).click();
  await page.getByText(/expired or was already used/).waitFor({ timeout: 5000 });
  const old = await api('POST', '/v1/auth/login', { body: { email: acct.email, password: 'Original#2026' } });
  if (old.status !== 401) throw new Error(`old password still works (${old.status})`);
  await uiLogin(page, acct.email, 'Changed#2026x');
  if (!page.url().endsWith('/onboarding')) throw new Error(`landed on ${page.url()}`);
  await ctx.close();
});

await t.step('magic link sign-in works once (second use is refused)', async () => {
  const { ctx, page } = await t.newPage();
  await page.goto(B + '/login');
  await page.getByRole('radio', { name: 'Magic link' }).click();
  await page.locator('#email').fill('aisha@example.com');
  await page.getByRole('button', { name: 'Email me a magic link' }).click();
  await page.getByText('Check your inbox').waitFor({ timeout: 5000 });
  const link = new URL(await outboxLink('aisha@example.com', /sign.?in|magic/i));
  await page.goto(B + link.pathname + link.search);
  await page.waitForURL('**/app', { timeout: 8000 });
  await waitHeading(page, /Aisha/);
  const p2 = await t.newPage();
  await p2.page.goto(B + link.pathname + link.search);
  await p2.page.getByText(/expired or was already used/).waitFor({ timeout: 6000 });
  await p2.ctx.close();
  await ctx.close();
});

// ---------- delete account ----------
await t.step('delete account: wrong password refused; password + DELETE erases it and signs out', async () => {
  const acct = await registerDisposable('delete', 'Delete#2026x');
  const { ctx, page } = await t.newPage();
  await uiLogin(page, acct.email, acct.password);
  // The account has data: load sample data the way Settings does (server endpoint for the user's own data).
  const sample = await api('POST', '/v1/me/data/sample', { token: acct.token });
  if (sample.status !== 200) throw new Error(`sample data ${sample.status}`);
  await page.goto(B + '/app/privacy');
  await waitHeading(page, /Privacy/);
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await page.locator('#pv-pw').fill('not-my-password');
  await page.locator('#pv-confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await page.getByText(/password is incorrect/i).waitFor({ timeout: 5000 });
  await page.locator('#pv-pw').fill(acct.password);
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await page.waitForURL(B + '/', { timeout: 8000 });
  const login = await api('POST', '/v1/auth/login', { body: { email: acct.email, password: acct.password } });
  if (login.status !== 401) throw new Error(`deleted account can still log in (${login.status})`);
  const old = await api('GET', '/v1/me/state', { token: acct.token });
  if (old.status !== 401) throw new Error(`old access token still reads data (${old.status})`);
  await ctx.close();
});

await t.step('export downloads the signed-in user’s own data from the server', async () => {
  const { ctx, page } = await t.newPage();
  await uiLogin(page, 'riya.test@example.com');
  await page.goto(B + '/app/privacy');
  await page.getByRole('button', { name: 'Export data' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: 'Start export' }).click()]);
  const json = JSON.parse(await readFile(await dl.path(), 'utf8'));
  if (json.account?.email !== 'riya.test@example.com' || !Array.isArray(json.data?.periods)) throw new Error('unexpected export content');
  if (JSON.stringify(json).includes('aisha@example.com')) throw new Error('export contains another user’s data');
  await ctx.close();
});

// ---------- contact form → support queue ----------
await t.step('contact form → new support request with a reference, visible (masked) to an Admin', async () => {
  const { ctx, page } = await t.newPage();
  await page.goto(B + '/contact');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByText(/enter your name|your name/i).first().waitFor({ timeout: 3000 });
  await page.locator('#ct-name').fill('Contact Tester');
  await page.locator('#ct-email').fill(`contact.${stamp}@example.test`);
  await page.locator('#ct-topic').selectOption('privacy');
  await page.getByText('We can’t act on account data from this form').waitFor({ timeout: 2000 });
  await page.locator('#ct-msg').fill(`Please export my data — ref ${stamp}`);
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByText('Your reference is').waitFor({ timeout: 6000 });
  const ref = (await page.locator('b.font-mono').innerText()).trim();
  const token = await staffToken('alex.morgan@healthx.example');
  const st = await api('GET', '/v1/admin/state', { token });
  const req = st.body.state.support.find((s) => s.id === ref);
  if (!req) throw new Error(`support request ${ref} not found for admin`);
  // Contact-form senders are unverified: never linked to an account, flagged in the subject.
  if (req.userId !== 'guest' || !req.subject.startsWith('[unverified sender] [privacy]')) throw new Error(`unexpected request shape: ${req.userId} / ${req.subject}`);
  if (!req.userEmail.includes('***')) throw new Error('email not masked for staff');
  await ctx.close();
});

// ---------- session end ----------
await t.step('session revoked from another device (logout-all) → app returns to login with “Your session ended”', async () => {
  const { ctx, page } = await t.newPage();
  await uiLogin(page, 'riya.test@example.com');
  const other = await api('POST', '/v1/auth/login', { body: { email: 'riya.test@example.com', password: DEMO_PW }, headers: { 'X-Client': 'mobile' } });
  const out = await api('POST', '/v1/auth/logout-all', { token: other.body.accessToken });
  if (out.status !== 204 && out.status !== 200) throw new Error(`logout-all ${out.status}`);
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); // the app re-syncs on focus
  await page.waitForURL('**/login', { timeout: 8000 });
  await page.getByText('Your session ended').waitFor({ timeout: 4000 });
  await ctx.close();
});

await t.step('staff account on the app login gets “staff sign in at /admin” and stays out of the app', async () => {
  const { ctx, page } = await t.newPage();
  await page.goto(B + '/login');
  await page.locator('#email').fill('alex.morgan@healthx.example');
  await page.locator('#password').fill(DEMO_PW);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByText(/staff account/i).waitFor({ timeout: 5000 });
  await page.goto(B + '/app');
  await page.waitForURL('**/login', { timeout: 5000 });
  await ctx.close();
});

await t.step('Apple/Google sign-in shows the honest “not configured” message (no fake success)', async () => {
  const { ctx, page } = await t.newPage();
  await page.goto(B + '/login');
  await page.getByRole('button', { name: 'Google' }).click();
  await page.getByText(/isn’t configured in this environment/).waitFor({ timeout: 4000 });
  if (page.url().includes('/app')) throw new Error('reached the app');
  await ctx.close();
});

// ---------- server decides: optimistic rollback + trial ----------
{
  const acct = await registerDisposable('rollback');
  cleanup.push(acct);
  await api('POST', '/v1/me/data/sample', { token: acct.token }); // onboarded account with sample history
  await api('POST', '/v1/me/actions', { token: acct.token, body: { action: { type: 'SET_CONSENT', id: 'health_integrations', granted: true } } });
  const { ctx, page } = await t.newPage();
  await uiLogin(page, acct.email, acct.password);
  await t.step('stale optimistic change (consent revoked on another device) → server 409 → error toast and the UI rolls back', async () => {
    await page.goto(B + '/app/integrations');
    await waitHeading(page, /Health integrations/);
    // "Another device" (e.g. the mobile app) withdraws the consent; this tab hasn't re-synced yet.
    const r = await api('POST', '/v1/me/actions', { token: acct.token, body: { action: { type: 'SET_CONSENT', id: 'health_integrations', granted: false } } });
    if (r.status !== 200) throw new Error(`revoke consent ${r.status}`);
    await page.getByRole('button', { name: 'Connect', exact: true }).first().click();
    await page.getByText(/connected \(simulated\)/).first().waitFor({ timeout: 5000 }); // optimistic success first…
    await toast(page, 'Turn on the health-integrations consent first.').waitFor({ timeout: 8000 }); // …then the server says no
    // After the rollback the page shows exactly the server's state (withdrawing the consent disconnected everything).
    const st = await serverState(page);
    if (st.consents.find((c) => c.id === 'health_integrations')?.granted) throw new Error('consent still granted on the server');
    const serverConnected = st.connections.filter((c) => c.connected).length;
    await page.waitForFunction((n) => [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Disconnect').length === n, serverConnected, { timeout: 5000 });
  });
  await t.step('free trial is a server decision: start → cancel → a second start is refused and the plan stays Free', async () => {
    await page.goto(B + '/app/subscription');
    await waitHeading(page, /Subscription/);
    await page.getByRole('button', { name: 'Start 7-day free trial' }).click();
    await toast(page, 'Welcome to Premium').waitFor({ timeout: 6000 });
    await page.getByText('You’re on Premium').waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Downgrade to Free' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel Premium' }).click();
    await toast(page, 'Premium cancelled').waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: 'Start 7-day free trial' }).click();
    await toast(page, 'You’ve already used your free trial.').waitFor({ timeout: 6000 });
    if (await page.getByText('You’re on Premium').count()) throw new Error('UI shows Premium after refusal');
    if ((await serverState(page)).profile.plan !== 'free') throw new Error('server plan is not free');
  });
  await t.step('re-saving today’s check-in after its custom symptom was archived still saves (stale id dropped, no 404)', async () => {
    const label = `Knee ache ${stamp}`;
    const act = (action) => api('POST', '/v1/me/actions', { token: acct.token, body: { action } });
    await act({ type: 'ADD_CUSTOM_SYMPTOM', label, category: 'physical' });
    const st0 = (await api('GET', '/v1/me/state', { token: acct.token })).body.state;
    const sid = st0.symptomDefs.find((s) => s.label === label)?.id;
    if (!sid) throw new Error('setup: custom symptom');
    const r1 = await act({ type: 'SAVE_CHECKIN', checkIn: { date: st0.today, mood: 'good', energy: 6, symptomIds: [sid] } });
    const r2 = await act({ type: 'ARCHIVE_CUSTOM_SYMPTOM', id: sid });
    if (r1.status !== 200 || r2.status !== 200) throw new Error(`setup: ${r1.status}/${r2.status}`);
    await page.goto(B + '/app/mood'); // fresh load: today's check-in still lists the archived symptom
    await waitHeading(page, /Mood/);
    await page.getByRole('radiogroup', { name: 'Mood' }).getByRole('radio').nth(0).click();
    await page.getByRole('button', { name: 'Save mood & energy' }).click();
    await page.getByText('Mood & energy saved').waitFor({ timeout: 3000 });
    await page.waitForTimeout(1000);
    if (await page.getByText('Couldn’t save that').count()) throw new Error('server refused the re-save');
    const ci = (await serverState(page)).checkIns.find((c) => c.date === st0.today);
    if (!ci || ci.mood === 'good' || ci.symptomIds.includes(sid)) throw new Error(`server check-in ${JSON.stringify(ci)}`);
  });
  await ctx.close();
}

// ---------- several tabs, one session ----------
await t.step('several tabs of one account stay signed in when they open and re-sync at the same moment (5 rounds)', async () => {
  let out = 0;
  for (let round = 0; round < 5; round++) {
    const { ctx, page: a } = await t.newPage();
    try {
      await uiLogin(a, 'riya.test@example.com');
      // Tabs opened together (session restore) …
      const tabs = await Promise.all([0, 1, 2].map(() => ctx.newPage()));
      const notes = [];
      tabs.forEach((p, i) => {
        p.on('crash', () => notes.push(`tab${i} crashed`));
        p.on('pageerror', (e) => notes.push(`tab${i} pageerror: ${e.message}`));
        p.on('response', (r) => r.url().includes('/api/') && r.status() >= 400 && notes.push(`tab${i} ${r.status()} ${new URL(r.url()).pathname}`));
      });
      await Promise.all(tabs.map((p, i) => p.goto(B + ['/app/sleep', '/app/mood', '/app/cycle'][i])));
      const shown = await Promise.all(
        tabs.map((p) =>
          p.locator('main h1').first().waitFor({ timeout: 10000 }).then(
            () => null,
            async () => `${new URL(p.url()).pathname}: “${(await p.locator('body').innerText({ timeout: 3000 }).catch(() => '(page not responding)')).slice(0, 60).replace(/\s+/g, ' ')}”`,
          ),
        ),
      );
      if (shown.some(Boolean)) throw new Error(`round ${round}: tab didn’t open the app → ${shown.filter(Boolean).join(' | ')} [${notes.join('; ')}]`);
      // … then every tab re-syncs at once (each one's access token was replaced by another tab's renewal).
      await Promise.all([a, ...tabs].map((p) => p.evaluate(() => window.dispatchEvent(new Event('focus')))));
      await a.waitForTimeout(2500);
      out += [a, ...tabs].filter((p) => new URL(p.url()).pathname === '/login').length;
    } finally {
      await ctx.close();
    }
  }
  if (out) throw new Error(`${out} tab(s) were signed out`);
});

// ---------- offline demo toggle ----------
await t.step('offline demo toggle: banner + browser-only mode, then Connect to server returns to API mode', async () => {
  const { ctx, page } = await t.newPage();
  await page.goto(B + '/login');
  await page.evaluate(() => localStorage.setItem('healthx.offlineDemo', '1'));
  await page.goto(B + '/app');
  await page.getByText('data stays in this browser, nothing is checked by a server').waitFor({ timeout: 6000 });
  await page.getByRole('button', { name: 'Connect to server' }).first().click();
  await page.waitForLoadState('load');
  await page.goto(B + '/app');
  await page.waitForURL('**/login', { timeout: 8000 });
  if (await page.getByRole('button', { name: 'Connect to server' }).count()) throw new Error('still in offline demo');
  await ctx.close();
});

// ---------- cleanup: accounts this run created ----------
for (const c of cleanup) {
  const s = await deleteDisposable(c);
  if (s !== 204 && s !== 200) console.log(`   cleanup: ${c.email} → ${s}`);
}
await t.done();

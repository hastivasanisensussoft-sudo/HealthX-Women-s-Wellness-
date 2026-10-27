// Functional checks for the mockup-merge admin pages. node admin-flow4.mjs <base>
import { chromium } from 'playwright-core';
const B = process.argv[2] ?? 'http://127.0.0.1:5173';
// Picker order (four SRS roles): [0] End User, [1] Content Manager, [2] Medical Content Reviewer, [3] Admin.
const ROLE = { admin: 3, medical: 2, content: 1 };
const browser = await chromium.launch({ channel: 'chrome' });
let pass = 0;
const fails = [];
const errs = [];
const ok = (c, n) => (c ? (pass++, console.log('PASS', n)) : (fails.push(n), console.log('FAIL', n)));
const step = async (n, fn) => {
  try {
    await fn();
  } catch (e) {
    fails.push(`${n}: ${e.message.split('\n')[0]}`);
    console.log('FAIL', n, '-', e.message.split('\n')[0]);
  }
};

async function login(idx, w = 1440) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => localStorage.setItem('healthx.offlineDemo', '1')); // offline demo (role picker); see admin-api.mjs for the API flows
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`pageerror ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`console ${m.text().slice(0, 160)}`));
  await page.goto(B + '/admin/login', { waitUntil: 'networkidle' });
  await page.fill('#adm-email', 'demo@healthx.example');
  await page.fill('#adm-pw', 'demo-password');
  await page.click('button[type=submit]');
  await page.waitForSelector('#adm-code');
  await page.fill('#adm-code', '246810');
  await page.click('button[type=submit]');
  await page.waitForSelector('[role=radiogroup]');
  await (await page.$$('[role=radiogroup] [role=radio]'))[idx].click();
  await page.click('text=Enter admin portal');
  await page.waitForTimeout(700);
  return { ctx, page };
}
const go = async (page, path) => {
  await page.goto(B + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
};
const adminState = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('healthx.admin.state') || '{}'));

// 1. Forgot password
await step('forgot password', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('healthx.offlineDemo', '1')); // offline demo (role picker); see admin-api.mjs for the API flows
  const page = await ctx.newPage();
  await page.goto(B + '/admin/login', { waitUntil: 'networkidle' });
  await page.click('text=Forgot password?');
  await page.fill('#adm-reset', 'not-an-email');
  await page.click('button:has-text("Send reset link")');
  ok((await page.getByText('Enter a valid work email address.').count()) > 0, 'forgot password: invalid email rejected');
  await page.fill('#adm-reset', 'anyone@healthx.example');
  await page.click('button:has-text("Send reset link")');
  await page.getByText('If this email belongs to a staff account').waitFor({ timeout: 4000 });
  ok((await page.getByText('expires in 30 minutes').count()) > 0, 'forgot password: generic confirmation + 30-min expiry');
  await page.click('button:has-text("Back to sign in")');
  ok(await page.locator('#adm-pw').isVisible(), 'forgot password: back to sign in');
  await ctx.close();
});

// 2. Privacy requests as Admin (former Support Agent function)
await step('privacy requests', async () => {
  const { ctx, page } = await login(ROLE.admin);
  await go(page, '/admin/privacy-requests');
  const text = await page.locator('main').innerText();
  ok(!/[a-z]{3,}\.[a-z]{3,}@example\.com/.test(text), 'privacy: emails are masked in the table');
  ok(!/(cycle length|last period|BBT|mucus|symptom:|mood:)/i.test(text), 'privacy: no health values on the page');
  // export: start → generate
  await page.getByRole('row', { name: /PR-2222/ }).click();
  await page.getByRole('button', { name: 'Start processing' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Generate & send export' }).click();
  await page.waitForTimeout(1800);
  ok((await page.locator('[role=dialog]').getByText('Completed').count()) > 0, 'privacy: export request processed to Completed');
  await page.keyboard.press('Escape');
  // deletion requires DELETE
  await page.getByRole('row', { name: /PR-2223/ }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  ok((await page.getByText('Type DELETE to confirm permanent deletion.').count()) > 0, 'privacy: deletion needs typed DELETE');
  await page.fill('#pr-del', 'DELETE');
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await page.waitForTimeout(1800);
  const st = await adminState(page);
  const pr = st.privacy.find((r) => r.id === 'PR-2223');
  const u = st.users.find((x) => x.id === pr.userId);
  ok(pr.status === 'completed' && u.status === 'deleted', 'privacy: deletion completes and user is deleted');
  ok(st.audit.some((a) => a.action === 'privacy.deletion_completed') && st.audit.some((a) => a.action === 'privacy.export_completed'), 'privacy: audit entries written');
  await ctx.close();
});

// 3. Media library as Content Manager
await step('media library', async () => {
  const { ctx, page } = await login(ROLE.content);
  await go(page, '/admin/media');
  await page.setInputFiles('input[aria-label="Upload media files"]', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  ok((await page.getByText(/notes\.txt: unsupported type/).count()) > 0, 'media: unsupported type rejected');
  await page.setInputFiles('input[aria-label="Upload media files"]', { name: 'demo-upload.png', mimeType: 'image/png', buffer: Buffer.alloc(2048, 1) });
  await page.getByText('Uploaded (simulated)').waitFor({ timeout: 5000 });
  ok((await page.getByRole('button', { name: /demo-upload\.png/ }).count()) > 0, 'media: valid upload appears in grid');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.locator('[role=dialog]').getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(300);
  ok((await page.getByRole('button', { name: /demo-upload\.png/ }).count()) === 0, 'media: unused file deleted');
  await page.getByRole('button', { name: /journaling\.jpg/ }).click();
  ok(await page.getByRole('button', { name: 'Delete' }).isDisabled(), 'media: in-use file cannot be deleted');
  await page.getByRole('radio', { name: 'Audio' }).click().catch(() => page.getByText('Audio', { exact: true }).click());
  await page.waitForTimeout(200);
  const names = await page.locator('ul[aria-label="Media files"] li button').allInnerTexts();
  ok(names.length > 0 && names.every((t) => /Audio/.test(t)), 'media: audio filter');
  await ctx.close();
});

// 4. Categories & tags as Content Manager
await step('categories', async () => {
  const { ctx, page } = await login(ROLE.content);
  await go(page, '/admin/categories');
  await page.getByRole('button', { name: 'Add subcategory to Cycle' }).click();
  await page.fill('input[aria-label="New subcategory in Cycle"]', 'Period basics');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  ok((await page.getByText('That name is already used here.').count()) > 0, 'categories: duplicate subcategory rejected');
  await page.fill('input[aria-label="New subcategory in Cycle"]', 'Cycle tracking tips');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  ok((await page.getByText('Cycle tracking tips').count()) > 0, 'categories: subcategory added');
  await page.getByRole('button', { name: 'Rename Cycle tracking tips' }).click();
  await page.fill('input[aria-label="Rename Cycle tracking tips"]', 'Tracking tips');
  await page.keyboard.press('Enter');
  ok((await page.getByText('Tracking tips', { exact: true }).count()) > 0, 'categories: subcategory renamed');
  await page.fill('input[aria-label="New tag"]', 'Strength');
  await page.getByRole('button', { name: 'Add tag' }).click();
  ok((await page.locator('ul[aria-label=Tags] li', { hasText: 'Strength' }).count()) > 0, 'categories: tag added');
  await page.getByRole('button', { name: 'Remove tag Strength' }).click();
  await page.locator('[role=dialog]').getByRole('button', { name: 'Remove' }).click();
  ok((await page.locator('ul[aria-label=Tags] li', { hasText: 'Strength' }).count()) === 0, 'categories: tag removed');
  await page.getByRole('button', { name: 'Add category' }).first().click();
  await page.fill('#cat-new', 'Sexual wellness');
  await page.locator('[role=dialog]').getByRole('button', { name: 'Add category' }).click();
  ok((await page.getByText('Sexual wellness').count()) > 0, 'categories: custom category added');
  await go(page, '/admin/content/new');
  const opts = await page.locator('#c-cat option').allInnerTexts();
  ok(opts.includes('Sexual wellness'), 'categories: new category available in editor');
  await ctx.close();
});

// 5. Compliance as Admin
await step('compliance', async () => {
  const { ctx, page } = await login(ROLE.admin);
  await go(page, '/admin/compliance');
  const publish = page.getByRole('button', { name: 'Approve & publish now' });
  ok(await publish.isDisabled(), 'compliance: publish disabled until checklist passes');
  await page.getByRole('button', { name: 'Return to author' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click();
  ok((await page.getByText('Explain what needs to change').count()) > 0, 'compliance: return needs a comment');
  await page.keyboard.press('Escape');
  const first = (await adminState(page)).content.find((c) => c.status === 'compliance_review');
  await page.getByText('Images, audio and music are licensed for use').click();
  await page.getByText('Checked against launch-market rules').click();
  const flagAck = page.getByText('Flagged wording reviewed in context — no claims');
  if (await flagAck.count()) {
    ok(await publish.isDisabled(), 'compliance: flagged wording must be acknowledged');
    await flagAck.click();
  }
  await page.waitForTimeout(150);
  ok(await publish.isEnabled(), 'compliance: publish enabled once every check passes');
  await publish.click();
  await page.waitForTimeout(400);
  const st = await adminState(page);
  const item = st.content.find((c) => c.id === first.id);
  ok(item.status === 'published' && item.history.some((h) => h.action === 'Compliance approved'), `compliance: "${first.title}" approved & published`);
  ok(st.audit.some((a) => a.action === 'content.compliance_approve' && a.target === first.title), 'compliance: approval audited');
  await ctx.close();
});

// 6. Version history as Content Manager
await step('versions', async () => {
  const { ctx, page } = await login(ROLE.content);
  await go(page, '/admin/content/a_cycle_phases/versions');
  ok((await page.locator('del', { hasText: 'Ovulation happens on day 14.' }).count()) > 0, 'versions: diff shows removed wording');
  ok((await page.locator('ins', { hasText: 'cannot confirm when' }).count()) > 0, 'versions: diff shows added wording');
  const active = await page.locator('nav[aria-label=Admin] a[aria-current=page]').innerText();
  ok(active.trim() === 'Version history', `versions: sidebar highlights Version history (${active.trim()})`);
  await page.getByRole('button', { name: 'Restore v1' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Restore as v3/ }).click();
  await page.waitForTimeout(400);
  const st = await adminState(page);
  const c = st.content.find((x) => x.id === 'a_cycle_phases');
  ok(c.version === 3 && c.status === 'medical_review' && c.versions.length === 2 && c.body.includes('Ovulation happens on day 14.'), 'versions: restore creates v3 in medical review');
  await go(page, '/admin/versions');
  ok((await page.locator('tbody tr').count()) > 10, 'versions: index lists content');
  await ctx.close();
});

// 7. Publishing calendar
await step('calendar', async () => {
  const { ctx, page } = await login(ROLE.content);
  await go(page, '/admin/schedule');
  const label1 = await page.locator('h2[aria-live=polite]').innerText();
  await page.getByRole('button', { name: 'Next month' }).click();
  const label2 = await page.locator('h2[aria-live=polite]').innerText();
  ok(label1 !== label2, `calendar: next month (${label1} → ${label2})`);
  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Previous month' }).click();
  const ev = page.locator('[aria-label^="Publishing calendar"] button').first();
  if ((await ev.count()) === 0) {
    await page.getByRole('button', { name: 'Today' }).click();
  }
  const any = page.locator('[aria-label^="Publishing calendar"] button').first();
  await any.click();
  await page.waitForTimeout(500);
  ok(/\/admin\/content\/[^/]+$/.test(new URL(page.url()).pathname), 'calendar: clicking an event opens the editor');
  await ctx.close();
});

// 8. My account (Admin)
await step('account', async () => {
  const { ctx, page } = await login(ROLE.admin);
  await go(page, '/admin/account');
  await page.getByRole('button', { name: 'Change', exact: true }).click();
  await page.fill('#pw-cur', 'demo-password');
  await page.fill('#pw-new', 'short');
  await page.getByRole('dialog').getByRole('button', { name: 'Change password' }).click();
  ok((await page.getByText(/Use at least \d+ characters/).count()) > 0, 'account: weak password rejected');
  await page.fill('#pw-new', 'Healthx#Strong2026');
  await page.fill('#pw-conf', 'Healthx#Strong2025');
  await page.getByRole('dialog').getByRole('button', { name: 'Change password' }).click();
  ok((await page.getByText('Passwords don’t match.').count()) > 0, 'account: mismatch rejected');
  await page.fill('#pw-conf', 'Healthx#Strong2026');
  await page.getByRole('dialog').getByRole('button', { name: 'Change password' }).click();
  await page.getByText('Password changed').waitFor({ timeout: 3000 });
  ok((await page.getByText('Last changed today').count()) > 0, 'account: password changed + other sessions signed out');
  ok((await page.getByRole('button', { name: 'Sign out', exact: true }).count()) === 0, 'account: no other sessions remain');
  await page.selectOption('#acc-tz', 'Europe/London');
  await page.getByRole('button', { name: 'Save changes' }).click();
  ok((await page.getByText('Preferences saved').count()) > 0, 'account: preferences saved');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  ok((await page.locator('ul[aria-label="Backup codes"] li').count()) === 8, 'account: 8 backup codes shown');
  await ctx.close();
});

// 9. Users masking + reveal, search, bell (Admin)
await step('users + search + bell', async () => {
  const { ctx, page } = await login(ROLE.admin);
  await go(page, '/admin/users');
  const tableText = await page.locator('tbody').innerText();
  ok(/\*\*\*@example\.com/.test(tableText) && !/[a-z]{3,}\.[a-z]{3,}@example\.com/.test(tableText), 'users: emails masked in table');
  await page.locator('tbody tr').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Show' }).click();
  ok(/[a-z]+\.[a-z]+@example\.com/.test(await page.getByRole('dialog').innerText()), 'users: Show reveals full email');
  const st = await adminState(page);
  ok(st.audit.some((a) => a.action === 'user.email_revealed'), 'users: reveal is audited');
  await page.keyboard.press('Escape');
  await page.fill('#admin-search', 'sitali');
  await page.waitForTimeout(200);
  ok((await page.locator('#admin-search-results [role=option]').count()) > 0, 'search: shows results');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  ok(new URL(page.url()).pathname === '/admin/content/q_sitali', 'search: Enter opens the first result');
  await page.getByRole('button', { name: /^Tasks/ }).click();
  ok((await page.getByRole('menu', { name: 'Tasks' }).getByRole('menuitem').count()) > 0, 'bell: shows role tasks');
  await ctx.close();
});

// 10. Editor fields + preview, CM dashboard
await step('editor + dashboard', async () => {
  const { ctx, page } = await login(ROLE.content);
  await go(page, '/admin');
  ok((await page.getByText('Content views (7 days)').count()) > 0 && (await page.getByText('Needs my attention').count()) > 0 && (await page.getByText('Top content this week').count()) > 0, 'content dashboard: mockup widgets present');
  await go(page, '/admin/content/new');
  await page.fill('#c-title', 'Preview check title');
  ok((await page.locator('[aria-label="Mobile preview"]').getByText('Preview check title').count()) > 0, 'editor: mobile preview mirrors title');
  await page.getByRole('button', { name: 'Quick Help' }).click();
  ok((await page.locator('[aria-label="Mobile preview"]').getByText('Quick Help').count()) > 0, 'editor: tag shows on preview card');
  await page.fill('#c-dur', '12');
  await page.selectOption('#c-type', 'video');
  ok((await page.locator('[aria-label="Mobile preview"]').getByText('12 min video').count()) > 0, 'editor: duration + media block on preview');
  await ctx.close();
});

// 11. Admin dashboard widgets
await step('platform overview', async () => {
  const { ctx, page } = await login(ROLE.admin);
  for (const t of ['New users (30 days)', 'DAU / MAU', '7-day retention', 'Daily check-ins', 'Onboarding completion', 'Daily active users — last 14 days', 'Pending medical reviews', 'Feature adoption', 'Recent activity']) {
    ok((await page.getByText(t, { exact: true }).count()) > 0, `overview: "${t}"`);
  }
  await ctx.close();
});

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) console.log(fails.join('\n'));
console.log(errs.length ? `console errors:\n${[...new Set(errs)].slice(0, 10).join('\n')}` : 'no console errors');
await browser.close();

import { chromium } from 'playwright-core';
const base = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => localStorage.setItem('healthx.offlineDemo', '1')); // offline demo (role picker); see admin-api.mjs for the API flows
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200));
});
const results = [];
const check = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
const count = (sel) => page.locator(sel).count();
async function login(i) {
  await page.goto(base + '/admin/login', { waitUntil: 'networkidle' });
  await page.fill('#adm-email', 'demo@healthx.example');
  await page.fill('#adm-pw', 'demo-password');
  await page.click('button[type=submit]');
  await page.waitForSelector('#adm-code');
  await page.fill('#adm-code', '246810');
  await page.click('button[type=submit]');
  await page.waitForSelector('[role=radiogroup]');
  await (await page.$$('[role=radiogroup] [role=radio]'))[i].click();
  await page.click('text=Enter admin portal');
  await page.waitForTimeout(700);
}
async function logout() {
  await page.click('button[aria-label="Profile menu"]');
  await page.click('[role=menuitem]:has-text("Sign out")');
  await page.waitForURL('**/admin/login');
}
async function go(p) {
  await page.goto(base + p, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
}

await page.goto(base + '/admin/login', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.removeItem('healthx.admin.state'));

// ---- Admin (the demo Admin persona holds every privileged permission)
await login(3);
await go('/admin/staff');
const cell = page.locator('button[aria-label^="Content Manager — Look up user accounts"]');
check('Admin: content manager x view_users initially off', (await cell.getAttribute('aria-pressed')) === 'false');
await cell.click();
await page.waitForTimeout(200);
check('Admin: matrix cell toggled on', (await cell.getAttribute('aria-pressed')) === 'true');
await cell.click();
await page.waitForTimeout(200);
check('Admin: matrix cell toggled back off', (await cell.getAttribute('aria-pressed')) === 'false');
check('Admin: End User cells locked', await page.locator('button[aria-label^="End User — Access the Web Admin"]').isDisabled());
await go('/admin/settings');
await page.click('[role=radio]:has-text("5 min")');
await page.click('button:has-text("Save changes")');
await page.waitForTimeout(1300);
const timer = (await page.locator('header span[title^="Auto sign-out"]').innerText()).trim();
check(`Admin: session timeout now 5 min (timer ${timer})`, /^4:5\d|^5:00/.test(timer));
await go('/admin/notifications');
await page.click('[role=tab]:has-text("Campaigns")');
await page.waitForTimeout(600);
await page.click('button:has-text("New campaign")');
check('Admin: blocked health-data segments explained', (await count('text=Not available for targeting')) > 0);
await page.click('[role=dialog] button:not([role=radio]):has-text("Send now")');
check('Admin: empty campaign validation', (await count('text=Name the campaign')) > 0);
await page.fill('#cmp-name', 'Flow test campaign');
await page.fill('#cmp-title', 'Hello there');
await page.fill('#cmp-body', 'We can diagnose your cycle today!');
await page.click('[role=dialog] button:not([role=radio]):has-text("Send now")');
check('Admin: prohibited claim blocked', (await count('text=Remove prohibited health claims')) > 0);
await page.fill('#cmp-body', 'A new wellness article is waiting in Learn.');
await page.click('[role=dialog] button:not([role=radio]):has-text("Send now")');
await page.waitForTimeout(500);
check('Admin: campaign sent', (await count('td:has-text("Flow test campaign")')) > 0);
await logout();

// ---- Content manager proposes template copy
await login(1);
await go('/admin/notifications');
const cycleCardSel = 'div.card:has(p:text-is("Cycle"))';
await page.locator(`${cycleCardSel} button:has-text("Edit copy")`).click();
await page.fill('#tpl-body', 'Your estimated period may start in a few days.');
await page.click('[role=dialog] button:has-text("Send for medical review")');
await page.waitForTimeout(400);
check('CM: cycle template now pending review', (await page.locator(cycleCardSel).innerText()).includes('Pending medical review'));
check('CM: no Approve button for CM', (await count('button:has-text("Approve")')) === 0);
await logout();

// ---- Medical reviewer approves
await login(2);
await go('/admin/notifications');
await page.locator(`${cycleCardSel} button:has-text("Approve")`).click();
await page.waitForTimeout(400);
const cycleCard = await page.locator(cycleCardSel).innerText();
check('MR: cycle copy approved and live v2', cycleCard.includes('Live · v2') && cycleCard.includes('may start in a few days'));
await logout();

// ---- Admin: the support desk (former Support Agent functions now belong to Admin)
await login(3);
const navText = await page.locator('nav[aria-label=Admin]').innerText();
// Group labels (sub-items such as Configuration sit inside the collapsed Settings & Audit Logs group).
check('Admin: nav has User Management, Subscriptions, Roles & Permissions and Settings & Audit Logs', ['User Management', 'Subscriptions', 'Roles & Permissions', 'Settings & Audit Logs'].every((x) => navText.includes(x)));
await go('/admin/support');
await page.locator('tbody tr').first().click();
await page.waitForTimeout(400);
const assignBtn = page.locator('[role=dialog] button:has-text("Assign to me")');
if (await assignBtn.count()) await assignBtn.click();
await page.waitForTimeout(200);
await page.fill('#sup-note', 'Resolved in flow test, user confirmed.');
await page.click('[role=dialog] button:has-text("Resolve with note")');
await page.waitForTimeout(400);
check('Admin: request resolved', (await page.locator('[role=dialog]').innerText()).includes('Resolved'));
await go('/admin/subscriptions');
check('Admin: subscriptions available', (await count('text=Access restricted')) === 0);
await go('/admin/users');
await page.locator('tbody tr').first().click();
await page.waitForTimeout(400);
const dlg = await page.locator('[role=dialog]').first().innerText();
check('Admin (break-glass permission): break-glass button available', (await page.locator('[role=dialog] button:has-text("Break-glass access")').count()) === 1);
check('Admin: can resend verification and deactivate', dlg.includes('Resend verification') && dlg.includes('Deactivate'));
await page.keyboard.press('Escape');
await logout();

// ---- Admin: reports (former Analyst functions now belong to Admin)
await login(3);
await go('/admin/analytics');
const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await page.click('button:has-text("Export CSV")');
const d = await dl;
check(`Admin: aggregate CSV export (${d ? d.suggestedFilename() : 'none'})`, !!d);
check('Admin: analytics is labelled aggregate-only', (await count('text=Simulated, aggregated product metrics')) > 0);
await logout();

// ---- Admin: settings + audit trail. The limits of an Admin WITHOUT privileged permissions are checked
//      against the real API in admin-api.mjs (the offline demo Admin persona holds them all).
await login(3);
await go('/admin/settings');
check('Admin (security-settings permission): settings editable', (await count('button:has-text("Save changes")')) > 0);
await go('/admin/audit');
await page.fill('input[type=search]', 'permission.update');
await page.waitForTimeout(300);
check('Admin: audit has permission.update entries', (await count('tbody tr')) >= 2);
await page.fill('input[type=search]', 'notification.template_approve');
await page.waitForTimeout(300);
check('Admin: audit has template approval', (await count('tbody tr')) >= 1);
await logout();

// ---- End user
await login(0);
check('End user: no-access screen with link to /app', (await count('text=No admin access')) > 0 && (await count('a[href="/app"]')) > 0);

console.log(results.join('\n'));
console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();

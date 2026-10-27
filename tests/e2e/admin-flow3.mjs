import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('healthx.offlineDemo', '1')); // offline demo (role picker); see admin-api.mjs for the API flows
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
const log = (...a) => console.log(...a);
async function login(roleIdx) {
  await page.goto(base + '/admin/login', { waitUntil: 'networkidle' });
  await page.fill('#adm-email', 'demo@healthx.example');
  await page.fill('#adm-pw', 'demo-password');
  await page.click('button[type=submit]');
  await page.waitForSelector('#adm-code');
  await page.fill('#adm-code', '000000');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=That code didn’t match');
  await page.fill('#adm-code', '246810');
  await page.click('button[type=submit]');
  await page.waitForSelector('[role=radiogroup]');
  await (await page.$$('[role=radiogroup] [role=radio]'))[roleIdx].click();
  await page.click('text=Enter admin portal');
  await page.waitForTimeout(800);
}
async function logout() { await page.click('button[aria-label="Profile menu"]'); await page.click('[role=menuitem]:has-text("Sign out")'); await page.waitForURL('**/admin/login'); }
async function status() { return (await page.locator('h1 + span span').first().innerText()).trim(); }

await page.goto(base + '/admin/login', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.removeItem('healthx.admin.state'));

// 1 Content manager creates & submits (validation first)
await login(1);
await page.goto(base + '/admin/content/new', { waitUntil: 'networkidle' });
await page.click('button:has-text("Submit for medical review")');
const valErr = await page.locator('text=Title must be at least 5 characters').count();
log('validation error shown on empty submit:', valErr > 0);
await page.fill('#c-title', 'Flow test: gentle movement on period days');
await page.fill('#c-desc', 'A short, non-diagnostic guide to gentle movement.');
await page.fill('textarea[aria-label="Body (Markdown)"]', '## Gentle movement\nMany people find **gentle walking** helpful.\n\n- Listen to your body\n- If pain is severe, consider speaking with a qualified healthcare professional.');
await page.click('button:has-text("Submit for medical review")');
await page.waitForURL(/\/admin\/content\/c_/);
const url = page.url();
log('created:', url, '| status:', await status());
await logout();

// 2 Medical reviewer: try approve without checklist, then complete
await login(2);
await page.goto(url, { waitUntil: 'networkidle' });
await page.click('button:has-text("Approve medically")');
log('approval blocked without refs/checklist:', (await page.locator('text=Add at least one reference').count()) > 0);
for (const cb of await page.$$('input[type=checkbox]')) await cb.check();
await page.fill('input[aria-label="New reference"]', 'Reference to be added during medical review (demo placeholder)');
await page.click('button:has-text("Add")');
await page.click('button:has-text("Approve medically")');
await page.waitForTimeout(500);
log('after medical approve:', await status());
await logout();

// 3 Compliance approval — Admin (D-08 option B)
await login(3);
await page.goto(url, { waitUntil: 'networkidle' });
await page.click('button:has-text("Approve for publishing")');
await page.waitForTimeout(500);
log('after compliance:', await status());
await logout();

// 4 Content manager publishes
await login(1);
await page.goto(url, { waitUntil: 'networkidle' });
await page.click('button:has-text("Publish now")');
await page.waitForTimeout(500);
log('after publish:', await status());
await page.screenshot({ path: `${out}/flow-published-1440.png`, fullPage: true });
// RBAC: content manager visiting users page
await page.goto(base + '/admin/users', { waitUntil: 'networkidle' });
log('content manager sees restricted on /users:', (await page.locator('text=Access restricted').count()) > 0);
await page.screenshot({ path: `${out}/flow-restricted-1440.png`, fullPage: false });
await logout();

// 5 Admin checks audit & config validation
await login(3);
await page.goto(base + '/admin/audit', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.fill('input[type=search]', 'Flow test');
await page.waitForTimeout(300);
log('audit rows for flow item:', await page.locator('tbody tr').count());
await page.goto(base + '/admin/config', { waitUntil: 'networkidle' });
await page.fill('#w-activity', '35');
log('weights error shown:', (await page.locator('text=Weights must total 100%').count()) > 0);
await page.fill('#w-activity', '30'); await page.fill('#w-sleep', '10');
await page.click('button:has-text("Save weights")');
await page.waitForTimeout(400);
log('saved toast:', (await page.locator('text=Weights saved').count()) > 0);
// Users: break-glass validation
await page.goto(base + '/admin/users', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.locator('tbody tr').first().click();
await page.click('button:has-text("Break-glass access")');
await page.click('button:has-text("Request access")');
log('break-glass validation:', (await page.locator('text=Enter a support ticket ID').count()) > 0);
await page.fill('#bg-ticket', 'SUP-1042');
await page.fill('#bg-reason', 'User reported a sync issue and asked us to check their history.');
await page.check('text=I understand this access is time-limited');
await page.click('button:has-text("Request access")');
await page.waitForTimeout(400);
log('break-glass granted:', (await page.locator('text=Break-glass access active').count()) > 0);
await page.screenshot({ path: `${out}/flow-breakglass-1440.png`, fullPage: false });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();

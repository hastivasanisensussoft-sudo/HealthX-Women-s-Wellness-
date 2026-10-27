// Independent admin checks: direct-URL role guards + no individual health data in user details.
import { chromium } from 'playwright-core';
const B = process.argv[2] ?? 'http://127.0.0.1:5182';
// The four SRS roles, in the login picker's order.
const ROLES = ['End User', 'Content Manager', 'Medical Content Reviewer', 'Admin'];
const browser = await chromium.launch({ channel: 'chrome' });
let pass = 0;
const fails = [];
const ok = (c, n) => (c ? (pass++, console.log('PASS', n)) : (fails.push(n), console.log('FAIL', n)));

async function login(i) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('healthx.offlineDemo', '1')); // offline demo (role picker); see admin-api.mjs for the API flows
  const page = await ctx.newPage();
  await page.goto(B + '/admin/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(B + '/admin/login', { waitUntil: 'networkidle' });
  await page.fill('#adm-email', 'demo@healthx.example');
  await page.fill('#adm-pw', 'demo-password');
  await page.click('button[type=submit]');
  await page.waitForSelector('#adm-code');
  await page.fill('#adm-code', '246810');
  await page.click('button[type=submit]');
  await page.waitForSelector('[role=radiogroup]');
  await (await page.$$('[role=radiogroup] [role=radio]'))[i].click();
  await page.click('text=Enter admin portal');
  await page.waitForTimeout(800);
  return { ctx, page };
}
const restricted = async (page, path) => {
  await page.goto(B + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return (await page.getByText('Access restricted').count()) > 0;
};

const FORBIDDEN = {
  2: ['/admin/users', '/admin/roles', '/admin/analytics', '/admin/subscriptions', '/admin/audit', '/admin/content/new', '/admin/privacy-requests', '/admin/media', '/admin/categories', '/admin/compliance'],
  1: ['/admin/users', '/admin/roles', '/admin/analytics', '/admin/config', '/admin/support', '/admin/privacy-requests', '/admin/compliance'],
  3: [],
};
// Admin now holds the former Admin, Super Admin, Support Agent and Analyst areas.
const ALLOWED = {
  2: ['/admin/reviews', '/admin/versions', '/admin/account'],
  1: ['/admin/content/new', '/admin/media', '/admin/categories', '/admin/schedule'],
  3: ['/admin/users', '/admin/support', '/admin/privacy-requests', '/admin/analytics', '/admin/subscriptions', '/admin/roles', '/admin/config', '/admin/flags', '/admin/audit', '/admin/compliance', '/admin/account'],
};

for (const [i, paths] of Object.entries(FORBIDDEN)) {
  const { ctx, page } = await login(+i);
  for (const p of paths) ok(await restricted(page, p), `${ROLES[i]}: direct URL ${p} is blocked`);
  for (const p of ALLOWED[i]) ok(!(await restricted(page, p)), `${ROLES[i]}: ${p} is allowed`);
  await ctx.close();
}

// End User picked at admin login → no admin area at all, even via deep link.
{
  const { ctx, page } = await login(0);
  await page.goto(B + '/admin/users', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const noNav = (await page.locator('nav[aria-label=Admin]').count()) === 0;
  const noTable = (await page.locator('table').count()) === 0;
  ok(noNav && noTable, 'End User: /admin/users deep link shows no admin nav or user table');
  await ctx.close();
}

// Health-data exposure: open a user's account as Admin (the only role that sees user accounts).
const HEALTH_VALUE = /(cycle length|cycle day \d|last period|period started|\bBBT\b|basal|cervical mucus|ovulation test|fertile window|\b\d{2}[- ]day cycle|mood:|stress \d|symptom:)/i;
for (const i of [3]) {
  const { ctx, page } = await login(i);
  await page.goto(B + '/admin/users', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const tableText = await page.locator('main').innerText();
  ok(!HEALTH_VALUE.test(tableText), `${ROLES[i]}: users table has no individual health values`);
  ok(!/[a-z]{3,}.[a-z]{3,}@example.com/.test(tableText), `${ROLES[i]}: users table masks emails`);
  await page.locator('button[aria-label^="Actions for"]').first().click();
  await page.getByRole('menuitem', { name: /View account/ }).click();
  await page.waitForTimeout(500);
  const detail = await page.locator('[role=dialog]').last().innerText();
  ok(/Staff never see cycle, symptom, mood/.test(detail), `${ROLES[i]}: user detail states health data is hidden`);
  ok(!HEALTH_VALUE.test(detail), `${ROLES[i]}: user detail shows no individual health values`);
  const bg = await page.getByRole('button', { name: 'Break-glass access' }).count();
  ok(bg === 1, `${ROLES[i]}: break-glass button available (demo Admin holds the break-glass permission; an Admin without it is checked in admin-api.mjs)`);
  await ctx.close();
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) console.log(fails.join('\n'));
await browser.close();

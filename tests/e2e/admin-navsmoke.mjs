// Nav smoke test against the real HealthX API: each role signs in with its own staff account (password +
// TOTP), every nav link is opened at 1440 px and 390 px, and the shell is checked for errors/overflow.
// node admin-navsmoke.mjs   (HX_WEB, HX_API, optional HX_SHOTS=<dir for screenshots>; see admin-run.mjs)
import { chromium } from 'playwright-core';
import { APP_USER, BASE, PASSWORD, STAFF, go, newContext, newStaffPage, reporter, watchErrors } from './admin-api-lib.mjs';

const shots = process.env.HX_SHOTS;
// Personas in the four SRS roles (STAFF keys in admin-api-lib.mjs).
const ROLES = [
  ['owner', 'Admin (all privileged permissions)'],
  ['admin', 'Admin'],
  ['reviewer', 'Medical Content Reviewer'],
  ['content_manager', 'Content Manager'],
  ['former_support', 'Admin (was Support Agent)'],
  ['former_analyst', 'Admin (was Analyst)'],
];
const { ok, step, done } = reporter();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const tree = {};
const allErrors = [];

async function readNav(page) {
  const nav = page.locator('nav[aria-label=Admin]').last();
  const nodes = nav.locator(':scope > a, :scope > div');
  const n = await nodes.count();
  const sections = [];
  for (let k = 0; k < n; k++) {
    const node = nodes.nth(k);
    if ((await node.evaluate((el) => el.tagName)) === 'A') {
      sections.push({ label: (await node.innerText()).trim(), links: [await node.getAttribute('href')] });
      continue;
    }
    const btn = node.locator('button').first();
    if ((await btn.getAttribute('aria-expanded')) === 'false') await btn.click();
    await page.waitForTimeout(80);
    const links = await node.locator('a').evaluateAll((as) => as.map((a) => ({ href: a.getAttribute('href'), label: a.textContent.trim() })));
    sections.push({ label: (await btn.innerText()).trim(), links: links.map((l) => l.href), sub: links.map((l) => l.label) });
  }
  return sections;
}

for (const [i, [role, label]] of ROLES.entries()) {
  await step(label, async () => {
    const s = await newStaffPage(browser, STAFF[role][0]);
    const { page, errors } = s;
    for (const w of [1440, 390]) {
      const tag = `${label} @${w}`;
      if (w === 390) {
        await page.setViewportSize({ width: 390, height: 844 });
        await go(page, '/admin', 500);
        await page.click('button[aria-label="Open menu"]');
      }
      const sections = await readNav(page);
      if (w === 1440) tree[label] = sections.map((x) => (x.sub ? `${x.label}: ${x.sub.join(', ')}` : x.label));
      if (shots) await page.screenshot({ path: `${shots}/nav-${i}-${role}-${w === 1440 ? 'sidebar' : 'drawer'}-${w}.png` });
      if (w === 390) await page.keyboard.press('Escape');
      const hrefs = [...new Set(sections.flatMap((x) => x.links))];
      for (const href of hrefs) {
        errors.length = 0;
        await go(page, href, 650);
        const h1 = await page.locator('main h1').first().innerText().catch(() => '');
        const restricted = await page.locator('text=Access restricted').count();
        const notFound = await page.locator('text=page not found').count();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        const onLogin = new URL(page.url()).pathname.startsWith('/admin/login');
        ok(h1 && !restricted && !notFound && !errors.length && !overflow && !onLogin, `${tag} ${href} → "${h1}"${restricted ? ' RESTRICTED' : ''}${notFound ? ' NOTFOUND' : ''}${overflow ? ' OVERFLOW' : ''}${onLogin ? ' SIGNED-OUT' : ''}${errors.length ? ' ' + errors.join(' | ') : ''}`);
      }
    }

    if (role === 'owner') {
      await page.setViewportSize({ width: 1440, height: 900 });
      await go(page, '/admin/users', 700);
      const kebab = page.locator('button[aria-label^="Actions for"]').first();
      await kebab.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      const focused1 = await page.evaluate(() => document.activeElement?.getAttribute('role'));
      await page.keyboard.press('ArrowDown');
      const focused2 = await page.evaluate(() => document.activeElement?.textContent);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const menuGone = (await page.locator('[role=menu]').count()) === 0;
      const backOnKebab = await page.evaluate(() => document.activeElement?.getAttribute('aria-haspopup'));
      ok(focused1 === 'menuitem' && !!focused2 && menuGone && backOnKebab === 'menu', 'row menu keyboard (focus first item, arrow, Escape returns focus)');
      await kebab.click();
      await page.mouse.click(5, 300);
      ok((await page.locator('[role=menu]').count()) === 0, 'row menu closes on outside click');
      await page.click('button[aria-label="Collapse sidebar to icons"]');
      await page.waitForTimeout(300);
      await page.hover('nav[aria-label=Admin] button[aria-label="User Management"]');
      await page.waitForTimeout(300);
      if (shots) await page.screenshot({ path: `${shots}/layout-rail-flyout-1440.png` });
      await page.click('button[aria-label="Profile menu"]');
      const menu = await page.locator('[role=menu]').innerText();
      if (shots) await page.screenshot({ path: `${shots}/layout-profile-menu-1440.png` });
      ok(!menu.includes('Switch demo role') && menu.includes('Sign out'), 'profile menu: no demo role switch with the server, Sign out present');
      await page.click('[role=menuitem]:has-text("Sign out")');
      await page.waitForURL('**/admin/login');
      await go(page, '/admin', 500);
      ok(new URL(page.url()).pathname === '/admin/login', 'sign out ends the server session (reload stays signed out)');
    }
    allErrors.push(...errors);
    await s.ctx.close();
  });
}

await step('End User', async () => {
  for (const w of [1440, 390]) {
    const ctx = await newContext(browser, { width: w, height: w > 500 ? 900 : 844 });
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
    await page.fill('#adm-email', APP_USER);
    await page.fill('#adm-pw', PASSWORD);
    await page.click('button[type=submit]');
    await page.getByText('No admin access').waitFor({ timeout: 8000 });
    const fine = (await page.locator('a[href="/app"]').count()) > 0 && (await page.locator('nav[aria-label=Admin]').count()) === 0;
    ok(fine && !errors.length, `End User @${w}: no-access screen, no admin nav ${errors.join(' | ')}`);
    tree['End User'] = ['(No admin access → link to /app)'];
    await ctx.close();
  }
});

console.log('\nNAV TREE PER ROLE');
for (const [r, items] of Object.entries(tree)) console.log(`${r}:\n  - ${items.join('\n  - ')}`);
await browser.close();
process.exit(done(allErrors));

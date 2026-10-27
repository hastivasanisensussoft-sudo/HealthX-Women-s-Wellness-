// Navigation crawler: sidebar groups/items, collapsed rail, drawer, public navbar, redirects, overflow.
// API mode: the app pages are crawled signed in (through the login form) as the seeded demo user; the crawl
// only navigates, it doesn't change her data. usage: node navcrawl.mjs <screenshotDir> [--base=URL]
import { chromium } from 'playwright-core';
import { B, DEMO_USER, uiLogin } from './hx-lib.mjs';
const SHOTS = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.';
const browser = await chromium.launch({ channel: 'chrome' });
let pass = 0;
const fails = [];
const ok = (cond, name) => (cond ? pass++ : (fails.push(name), console.log('FAIL', name)));
const allErrs = [];

async function open(w, h, { login = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => allErrs.push(`[${w}] ${page.url()} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error' || /^Failed to load resource: the server responded with a status of \d+/.test(m.text())) return; // API statuses are checked below
    allErrs.push(`[${w}] ${page.url()} console: ${m.text().slice(0, 160)}`);
  });
  page.on('response', (r) => {
    const p = new URL(r.url()).pathname;
    // The only expected API error is the boot-time session check (401) before signing in.
    if (p.startsWith('/api/') && r.status() >= 400 && !(p === '/api/v1/auth/refresh' && r.status() === 401)) allErrs.push(`[${w}] ${page.url()} API ${r.status()} ${r.request().method()} ${p}`);
  });
  if (login) await uiLogin(page, DEMO_USER);
  return { ctx, page };
}
const info = (page) =>
  page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      h1: main?.querySelector('h1')?.textContent?.trim() ?? '',
      notFound: /page not found|couldn.t find this page|this page doesn.t exist/i.test(main?.innerText ?? ''),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      path: location.pathname,
    };
  });
const settle = async (page) => {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('main h1').first().waitFor({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(250);
};

const EXPECTED = {
  Overview: ['Home Dashboard', 'Daily Check-in', 'Wellness Score'],
  'Cycle & Period': ['Period Tracking', 'Period Calendar', 'Cycle History', 'Cycle Insights'],
  'Symptoms & Mood': ['Symptom Tracking', 'Mood & Energy', 'Stress Tracking'],
  'Daily Wellness': ['Hydration', 'Sleep', 'Fitness & Workouts', 'Nutrition'],
  'Goals & Habits': ['Daily Goals', 'Habits', 'Daily Wellness Plan', 'Achievements'],
  'Insights & Reports': ['Weekly Reports', 'Progress Charts', 'Wellness Trends'],
  Learn: ['Educational Articles', 'Women’s Wellness', 'Fertility & Pregnancy Information', 'Most Asked Questions', 'Community'],
  'Profile & Settings': ['My Profile', 'Notifications & Reminders', 'Privacy & Data Controls', 'Health Integrations', 'Subscription & Plans'],
};
const norm = (s) => s.replace(/\s+/g, ' ').replace(/\b(P2|P3|P4|Phase \d)\b/g, '').replace(/'/g, '’').trim().toLowerCase();

// ---------- Desktop sidebar ----------
const appRoutes = [];
{
  const { ctx, page } = await open(1440, 900, { login: true });
  await page.goto(B + '/app');
  await page.evaluate(() => {
    localStorage.removeItem('healthx.sidebar.open');
    localStorage.removeItem('healthx.sidebar.collapsed');
  });
  await page.goto(B + '/app');
  await settle(page);
  const nav = page.locator('aside nav[aria-label="Main navigation"]').first();
  const groups = nav.locator(':scope > ul > li > button[aria-controls]');
  const n = await groups.count();
  ok(n === 8, `desktop: 8 sidebar groups (got ${n})`);
  const labels = [];
  for (let i = 0; i < n; i++) {
    const btn = groups.nth(i);
    const label = (await btn.innerText()).trim();
    labels.push(label);
    if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
    ok((await btn.getAttribute('aria-expanded')) === 'true', `desktop: group "${label}" expands`);
    const panel = page.locator(`[id="${await btn.getAttribute('aria-controls')}"]`);
    ok(await panel.isVisible(), `desktop: group "${label}" panel visible`);
    const links = panel.locator('a');
    const m = await links.count();
    const texts = [];
    for (let j = 0; j < m; j++) texts.push((await links.nth(j).innerText()).trim());
    const exp = EXPECTED[label];
    ok(!!exp && exp.length === m && exp.every((e, k) => norm(texts[k]).startsWith(norm(e))), `desktop: "${label}" items match spec → [${texts.join(' | ')}]`);
    for (let j = 0; j < m; j++) {
      const a = panel.locator('a').nth(j);
      const href = await a.getAttribute('href');
      appRoutes.push(href);
      await a.click();
      await page.waitForURL((u) => u.pathname === href, { timeout: 6000 }).catch(() => {});
      await settle(page);
      const s = await info(page);
      ok(s.path === href, `desktop: click "${texts[j]}" → ${href} (at ${s.path})`);
      ok(!!s.h1, `desktop: ${href} has a page heading`);
      ok(!s.notFound, `desktop: ${href} is not a 404`);
      ok(!s.overflow, `desktop: ${href} no horizontal overflow`);
      const cur = await panel.locator('a[aria-current="page"]').getAttribute('href').catch(() => null);
      ok(cur === href, `desktop: ${href} highlighted as active (aria-current on ${cur})`);
      console.log(`  ✓ ${label} › ${texts[j]} → ${href} · "${s.h1}"`);
    }
  }
  ok(JSON.stringify(labels) === JSON.stringify(Object.keys(EXPECTED)), `desktop: group order ${labels.join(' / ')}`);
  ok(new Set(appRoutes).size === appRoutes.length, `desktop: no duplicate sidebar links (${appRoutes.length} links, ${new Set(appRoutes).size} unique)`);

  // collapse a group
  const g0 = groups.nth(3);
  await g0.click();
  ok((await g0.getAttribute('aria-expanded')) === 'false', 'desktop: group collapses on second click');
  await g0.click();

  // collapsed rail + flyouts
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.waitForTimeout(350);
  const aside = page.locator('aside').first();
  const w = (await aside.boundingBox())?.width ?? 0;
  ok(w > 70 && w < 100, `desktop: collapsed rail width ≈ 84px (got ${Math.round(w)})`);
  const railItem = page.locator('aside nav[aria-label="Main navigation"] > ul > li').nth(1);
  await railItem.hover();
  await page.waitForTimeout(300);
  const fly = railItem.locator('div a');
  ok((await fly.count()) === 4 && (await fly.first().isVisible()), 'desktop: hovering the Cycle rail icon shows a 4-link flyout');
  await page.screenshot({ path: SHOTS + '/rail-flyout.png' });
  await fly.nth(2).click();
  await page.waitForURL((u) => u.pathname === '/app/cycle/history', { timeout: 5000 }).catch(() => {});
  ok(new URL(page.url()).pathname === '/app/cycle/history', 'desktop: flyout link navigates (Cycle History)');
  const persisted = await page.evaluate(() => localStorage.getItem('healthx.sidebar.collapsed'));
  ok(persisted === 'true' || persisted === '1', `desktop: collapsed state persisted (${persisted})`);
  await page.reload();
  await settle(page);
  ok(Math.round((await page.locator('aside').first().boundingBox())?.width ?? 0) < 100, 'desktop: collapsed state survives reload');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.waitForTimeout(300);
  ok(((await page.locator('aside').first().boundingBox())?.width ?? 0) > 250, 'desktop: sidebar expands again');

  // redirects
  for (const [from, to] of [
    ['/app/insights', '/app/insights/trends'],
    ['/app/premium', '/app/subscription'],
  ]) {
    await page.goto(B + from);
    await settle(page);
    ok(new URL(page.url()).pathname === to, `redirect ${from} → ${to}`);
  }
  await ctx.close();
}

// ---------- Tablet / mobile drawer ----------
for (const [w, h] of [
  [768, 1024],
  [390, 844],
]) {
  const { ctx, page } = await open(w, h, { login: true });
  await page.goto(B + '/app');
  await settle(page);
  ok(!(await page.locator('aside.lg\\:block').first().isVisible()), `${w}px: desktop sidebar hidden`);
  await page.getByRole('button', { name: 'Open menu' }).click();
  const dlg = page.getByRole('dialog', { name: 'Navigation menu' });
  ok(await dlg.isVisible(), `${w}px: drawer opens`);
  const gbtn = dlg.getByRole('button', { name: /Daily Wellness/ });
  if ((await gbtn.getAttribute('aria-expanded')) !== 'true') await gbtn.click();
  await dlg.getByRole('link', { name: /^Sleep/ }).click();
  await page.waitForURL((u) => u.pathname === '/app/sleep', { timeout: 5000 }).catch(() => {});
  await settle(page);
  ok(new URL(page.url()).pathname === '/app/sleep', `${w}px: drawer link navigates to /app/sleep`);
  ok(!(await dlg.isVisible().catch(() => false)), `${w}px: drawer closes after navigation`);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  ok(!(await dlg.isVisible().catch(() => false)), `${w}px: Escape closes drawer`);
  if (w === 390) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: SHOTS + '/drawer-390.png' });
    await page.keyboard.press('Escape');
  }
  const extra = ['/app/coach', '/app/settings', '/app/fertility', '/app/life-stages', '/app/learn/a_cycle_phases', '/app/fitness/w_bone_strength'];
  for (const r of [...appRoutes, ...extra]) {
    await page.goto(B + r);
    await settle(page);
    const s = await info(page);
    ok(!!s.h1 && !s.notFound, `${w}px: ${r} renders a heading`);
    ok(!s.overflow, `${w}px: ${r} no horizontal overflow`);
  }
  await ctx.close();
}

// ---------- Public site ----------
const SITE = [
  ['Home', '/'],
  ['About', '/about'],
  ['Features', '/features'],
  ['How It Works', '/how-it-works'],
  ['Pricing', '/pricing'],
  ['Contact', '/contact'],
];
{
  const { ctx, page } = await open(1440, 900);
  await page.goto(B + '/about');
  await settle(page);
  const primary = page.locator('nav[aria-label="Primary"]');
  for (const [label, path] of SITE) {
    await primary.getByRole('link', { name: label, exact: true }).click();
    await page.waitForURL((u) => u.pathname === path, { timeout: 5000 }).catch(() => {});
    await settle(page);
    const s = await info(page);
    ok(s.path === path && !!s.h1, `site 1440: navbar "${label}" → ${path} · "${s.h1.slice(0, 50)}"`);
    ok((await primary.locator('a.bg-green-50').innerText().catch(() => '')).trim() === label, `site 1440: "${label}" highlighted`);
  }
  for (const [label, path] of [
    ['Login', '/login'],
    ['Sign Up', '/signup'],
  ]) {
    await page.goto(B + '/pricing');
    await settle(page);
    await page.locator('header').getByRole('link', { name: label, exact: true }).first().click();
    await page.waitForURL((u) => u.pathname === path, { timeout: 5000 }).catch(() => {});
    ok(new URL(page.url()).pathname === path, `site 1440: "${label}" → ${path}`);
  }
  await page.goto(B + '/contact');
  await settle(page);
  await page.locator('header a[href="/"]').first().click();
  await page.waitForURL((u) => u.pathname === '/', { timeout: 5000 }).catch(() => {});
  ok(new URL(page.url()).pathname === '/', 'site 1440: logo → home');
  await ctx.close();
}
for (const [w, h] of [
  [390, 844],
  [768, 1024],
]) {
  const { ctx, page } = await open(w, h);
  await page.goto(B + '/');
  await settle(page);
  ok(!(await page.locator('nav[aria-label="Primary"]').isVisible()), `site ${w}: desktop nav hidden`);
  await page.getByRole('button', { name: 'Open menu' }).click();
  ok(await page.locator('#site-mobile-menu').isVisible(), `site ${w}: mobile menu opens`);
  const mlinks = await page.locator('#site-mobile-menu nav a').allInnerTexts();
  ok(['Home', 'About', 'Features', 'How It Works', 'Pricing', 'Contact', 'Login', 'Sign Up'].every((l) => mlinks.some((t) => t.trim() === l)), `site ${w}: mobile menu has all 8 entries → ${mlinks.map((t) => t.trim()).join(', ')}`);
  if (w === 390) await page.screenshot({ path: SHOTS + '/site-menu-390.png' });
  await page.locator('#site-mobile-menu').getByRole('link', { name: 'How It Works' }).click();
  await page.waitForURL((u) => u.pathname === '/how-it-works', { timeout: 5000 }).catch(() => {});
  ok(new URL(page.url()).pathname === '/how-it-works', `site ${w}: mobile link navigates`);
  ok(!(await page.locator('#site-mobile-menu').isVisible().catch(() => false)), `site ${w}: menu closes after navigation`);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.keyboard.press('Escape');
  ok(!(await page.locator('#site-mobile-menu').isVisible().catch(() => false)), `site ${w}: Escape closes menu`);
  for (const [, p] of [...SITE, ['FAQ', '/faq'], ['Login', '/login'], ['Sign up', '/signup']]) {
    await page.goto(B + p);
    await settle(page);
    ok(!(await info(page)).overflow, `site ${w}: ${p} no horizontal overflow`);
  }
  await ctx.close();
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) console.log('FAILURES:\n' + fails.join('\n'));
console.log(allErrs.length ? `console errors (${allErrs.length}):\n` + [...new Set(allErrs)].slice(0, 30).join('\n') : 'no console errors');
await browser.close();

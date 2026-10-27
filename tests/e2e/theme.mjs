// Theme customization (Settings → Appearance): light / dark / system mode, free accent themes, Premium
// themes (locked, preview, unlock with the simulated plan, switched off again after cancelling), persistence
// and every page following the theme. Runs in the browser-only offline demos, so nothing is sent to a server.
// usage: node theme.mjs [--base=http://127.0.0.1:5181] [--mobile=http://127.0.0.1:8095]
//   --mobile also checks the mobile app's web export (Appearance screen, apply + restart, Premium lock).
import { B, harness } from './hx-lib.mjs';

const MOBILE = (process.argv.find((a) => a.startsWith('--mobile=')) ?? '').slice(9);
const t = harness();

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
/** Polls `fn` until it returns something truthy. */
async function until(fn, msg, timeout = 5000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`${msg} (last: ${JSON.stringify(last)})`);
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
const luminance = (css) => {
  const [r, g, b] = css.match(/[\d.]+/g).slice(0, 3).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
/** Background colour actually painted at a point (first non-transparent ancestor). */
const paintedBg = (page, x, y) =>
  page.evaluate(
    ([px, py]) => {
      for (let el = document.elementFromPoint(px, py); el; el = el.parentElement) {
        const c = getComputedStyle(el).backgroundColor;
        if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
      }
      return getComputedStyle(document.body).backgroundColor;
    },
    [x, y],
  );

/** Page canvas behind the content (the dashboard hero is a deep evergreen panel in both modes, so sample behind <main>). */
const canvasBg = (page) =>
  page.evaluate(() => {
    for (let el = document.querySelector('main') ?? document.body; el; el = el.parentElement) {
      const c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return getComputedStyle(document.body).backgroundColor;
  });

const EVERGREEN_700 = rgb('#186A53');
const OCEAN_700 = rgb('#1B586D');
const LAVENDER_700 = rgb('#573FA6');
const FERTILE_500 = rgb('#3A9A7B');

// ---------------------------------------------------------------- web
{
  const { page } = await t.newPage();
  const html = () => page.evaluate(() => ({ theme: document.documentElement.dataset.theme, mode: document.documentElement.dataset.mode }));
  const cssVar = (n) => page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(), n);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('healthx.theme') ?? 'null'));
  const card = (name) => page.locator('.card', { has: page.getByText(name, { exact: true }) }).filter({ has: page.getByRole('button').or(page.getByText('In use')) }).last();

  await page.goto(B + '/login');
  await page.evaluate(() => (localStorage.clear(), localStorage.setItem('healthx.offlineDemo', '1')));

  await t.step('web: Evergreen green-and-white light theme is the default', async () => {
    await page.goto(B + '/app');
    await page.getByRole('button', { name: 'Switch to dark mode' }).waitFor({ timeout: 10000 });
    const h = await html();
    expect(h.theme === 'evergreen' && h.mode === 'light', `html data ${JSON.stringify(h)}`);
    expect((await cssVar('--c-green-700')) === EVERGREEN_700, `--c-green-700 is ${await cssVar('--c-green-700')}`);
    const bg = await canvasBg(page);
    expect(luminance(bg) > 0.9, `page background is not light (${bg})`);
  });

  await t.step('web: header toggle switches to dark mode and back', async () => {
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await until(async () => (await html()).mode === 'dark', 'html data-mode never became dark');
    expect(luminance(await canvasBg(page)) < 0.2, 'page background is not dark');
    expect((await saved())?.mode === 'dark', 'dark mode not saved');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await until(async () => (await html()).mode === 'light', 'html data-mode never returned to light');
  });

  await t.step('web: Appearance page opens from the profile menu', async () => {
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('link', { name: 'Appearance & theme' }).click();
    await page.waitForURL('**/app/settings/appearance', { timeout: 5000 });
    await page.getByRole('heading', { name: 'Appearance & theme' }).waitFor({ timeout: 5000 });
  });

  await t.step('web: mode radios — Dark applies everywhere and survives a reload', async () => {
    const group = page.getByRole('radiogroup', { name: 'Colour mode' });
    expect((await group.getByRole('radio').count()) === 3, 'expected Light, Dark and System');
    await group.getByRole('radio', { name: /Dark/ }).click();
    await until(async () => (await html()).mode === 'dark', 'not dark after choosing Dark');
    expect((await group.getByRole('radio', { name: /Dark/ }).getAttribute('aria-checked')) === 'true', 'Dark radio not checked');
    await page.reload();
    await page.getByRole('heading', { name: 'Appearance & theme' }).waitFor({ timeout: 8000 });
    expect((await html()).mode === 'dark', 'dark mode lost on reload');
    for (const p of ['/app', '/app/cycle', '/app/hydration', '/']) {
      await page.goto(B + p);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      expect((await html()).mode === 'dark', `${p} is not dark`);
      expect(luminance(await paintedBg(page, 720, 700)) < 0.25, `${p} background is not dark`);
    }
    await page.goto(B + '/app/settings/appearance');
    await page.getByRole('radiogroup', { name: 'Colour mode' }).getByRole('radio', { name: /Light/ }).click();
    await until(async () => (await html()).mode === 'light', 'not light after choosing Light');
  });

  await t.step('web: System mode follows the device colour scheme', async () => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.getByRole('radiogroup', { name: 'Colour mode' }).getByRole('radio', { name: /System/ }).click();
    await until(async () => (await html()).mode === 'dark', 'System + dark device did not go dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await until(async () => (await html()).mode === 'light', 'System did not follow the device back to light');
    expect((await saved())?.mode === 'system', 'system mode not saved');
    await page.getByRole('radiogroup', { name: 'Colour mode' }).getByRole('radio', { name: /Light/ }).click();
  });

  await t.step('web: a free theme (Ocean) applies to every page; data colours stay fixed', async () => {
    await page.getByRole('button', { name: 'Use the Ocean theme' }).click();
    await page.getByText('Ocean theme on').first().waitFor({ timeout: 4000 });
    await until(async () => (await html()).theme === 'ocean', 'html data-theme is not ocean');
    expect((await cssVar('--c-green-700')) === OCEAN_700, `brand 700 is ${await cssVar('--c-green-700')}`);
    expect((await cssVar('--c-fertile-500')) === FERTILE_500, 'fertile-window colour changed with the theme');
    expect((await saved())?.theme === 'ocean', 'Ocean not saved');
    await card('Ocean').getByText('In use').waitFor({ timeout: 3000 });
    for (const p of ['/app', '/app/insights', '/app/learn', '/']) {
      await page.goto(B + p);
      expect((await html()).theme === 'ocean', `${p} lost the theme`);
    }
    // A primary button on the dashboard is painted with the Ocean brand colour.
    await page.goto(B + '/app');
    const bg = await page.locator('.bg-green-700').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg.replace(/[^\d ]/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ') === OCEAN_700, `a bg-green-700 element is ${bg}`);
  });

  await t.step('web: Premium themes are locked on the Free plan but can be previewed', async () => {
    await page.goto(B + '/app/settings/appearance');
    await page.getByRole('heading', { name: 'Appearance & theme' }).waitFor();
    for (const name of ['Lavender', 'Blush', 'Sunrise']) {
      expect((await page.getByRole('button', { name: `Use the ${name} theme` }).count()) === 0, `${name} can be applied on Free`);
      await page.getByRole('button', { name: `Preview the ${name} theme` }).waitFor({ timeout: 3000 });
    }
    expect((await page.getByRole('link', { name: 'Unlock' }).count()) === 3, 'expected 3 Unlock links');
    await page.getByRole('button', { name: 'Preview the Lavender theme' }).click();
    await page.getByRole('status').filter({ hasText: 'Previewing Lavender' }).waitFor({ timeout: 3000 });
    await until(async () => (await html()).theme === 'lavender', 'preview did not repaint the page');
    expect((await cssVar('--c-green-700')) === LAVENDER_700, 'preview colours not applied');
    expect((await saved())?.theme === 'ocean', 'a preview must not be saved');
    await page.getByRole('button', { name: 'Stop preview' }).click();
    await until(async () => (await html()).theme === 'ocean', 'Stop preview did not restore Ocean');
    await page.getByRole('button', { name: 'Preview the Blush theme' }).click();
    await until(async () => (await html()).theme === 'blush', 'Blush preview not applied');
    await page.goto(B + '/app');
    await page.getByRole('button', { name: 'Switch to dark mode' }).waitFor();
    expect((await html()).theme === 'ocean', 'preview did not end when leaving the page');
  });

  await t.step('web: the simulated Premium plan unlocks Premium themes', async () => {
    await page.goto(B + '/app/subscription');
    await page.getByRole('button', { name: 'Start Premium (simulated)' }).click();
    await page.getByText('Welcome to Premium').first().waitFor({ timeout: 5000 });
    await page.goto(B + '/app/settings/appearance');
    await page.getByRole('button', { name: 'Use the Lavender theme' }).click();
    await until(async () => (await html()).theme === 'lavender', 'Lavender not applied');
    expect((await saved())?.theme === 'lavender', 'Lavender not saved');
    expect((await page.getByRole('link', { name: 'Unlock' }).count()) === 0, 'Unlock links still shown on Premium');
  });

  await t.step('web: cancelling Premium switches a Premium theme back to Evergreen', async () => {
    await page.goto(B + '/app/subscription');
    await page.getByRole('button', { name: 'Cancel subscription' }).first().click();
    await page.getByRole('button', { name: 'Cancel Premium' }).click();
    await page.getByText('Lavender theme turned off').first().waitFor({ timeout: 5000 });
    await until(async () => (await html()).theme === 'evergreen', 'theme not reset to Evergreen');
    expect((await saved())?.theme === 'evergreen', 'Evergreen not saved after the reset');
    expect((await cssVar('--c-green-700')) === EVERGREEN_700, 'Evergreen colours not restored');
  });

  await t.step('web: Appearance page fits a phone screen in dark mode', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(B + '/app/settings/appearance');
    await page.getByRole('radiogroup', { name: 'Colour mode' }).getByRole('radio', { name: /Dark/ }).click();
    await until(async () => (await html()).mode === 'dark', 'not dark on the phone layout');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow <= 1, `horizontal overflow of ${overflow}px`);
    await page.getByRole('radiogroup', { name: 'Colour mode' }).getByRole('radio', { name: /Light/ }).click();
  });
}

// ---------------------------------------------------------------- mobile web export
if (MOBILE) {
  const { ctx, page } = await t.newPage({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('healthx.mobile.offlineDemo', '1');
    } catch {
      /* ignore */
    }
  });
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('healthx.mobile.theme') ?? 'null'));
  const openAppearance = async () => {
    await page.goto(MOBILE + '/appearance');
    await page.getByRole('radio', { name: 'Light mode' }).waitFor({ timeout: 15000 });
  };
  const apply = async () => {
    await page.getByRole('button', { name: 'Apply appearance' }).click();
    await page.waitForLoadState('load');
    await page.getByRole('radio', { name: 'Light mode' }).waitFor({ timeout: 15000 });
  };

  await t.step('mobile: offline demo signs in; Evergreen light is the default', async () => {
    await page.goto(MOBILE + '/welcome');
    await page.getByText('Explore demo', { exact: true }).first().click({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Home' }).waitFor({ timeout: 15000 });
    expect((await saved()) === null, 'a theme was already saved');
    expect(luminance(await paintedBg(page, 195, 760)) > 0.85, 'home is not light');
  });

  await t.step('mobile: Appearance screen lists 3 modes and 6 themes, Premium locked on Free', async () => {
    await openAppearance();
    expect((await page.getByRole('radio', { name: 'Light mode' }).getAttribute('aria-checked')) === 'true', 'Light not checked');
    for (const m of ['Dark mode', 'System mode']) await page.getByRole('radio', { name: m }).waitFor({ timeout: 2000 });
    for (const n of ['Sage', 'Ocean']) await page.getByRole('button', { name: `Use ${n}` }).waitFor({ timeout: 2000 });
    expect((await page.getByRole('button', { name: 'Unlock with Premium' }).count()) === 3, 'expected 3 locked Premium themes');
    expect((await page.getByRole('button', { name: 'Use Lavender' }).count()) === 0, 'Lavender usable on Free');
    expect((await page.getByRole('button', { name: 'Apply appearance' }).count()) === 0, 'Apply shown with no change');
  });

  await t.step('mobile: Dark mode applies after the app restarts', async () => {
    await page.getByRole('radio', { name: 'Dark mode' }).click();
    await apply();
    const s = await saved();
    expect(s?.mode === 'dark' && s?.theme === 'evergreen', `saved ${JSON.stringify(s)}`);
    expect((await page.getByRole('radio', { name: 'Dark mode' }).getAttribute('aria-checked')) === 'true', 'Dark not checked after restart');
    await page.goto(MOBILE + '/home');
    await page.getByRole('tab', { name: 'Home' }).waitFor({ timeout: 15000 });
    expect(luminance(await paintedBg(page, 195, 760)) < 0.25, 'home is not dark');
  });

  await t.step('mobile: a free theme (Ocean) applies and is marked In use', async () => {
    await openAppearance();
    await page.getByRole('button', { name: 'Use Ocean' }).click();
    await apply();
    expect((await saved())?.theme === 'ocean', 'Ocean not saved');
    await page.getByText('In use', { exact: true }).waitFor({ timeout: 3000 });
  });

  await t.step('mobile: Unlock opens Premium; the trial unlocks Premium themes', async () => {
    await page.getByRole('button', { name: 'Unlock with Premium' }).first().click();
    await page.waitForURL('**/premium', { timeout: 8000 });
    await page.getByRole('button', { name: 'Start 7-day free trial' }).click();
    await page.getByRole('button', { name: 'Switch back to free' }).waitFor({ timeout: 8000 });
    await openAppearance();
    expect((await page.getByRole('button', { name: 'Unlock with Premium' }).count()) === 0, 'Premium themes still locked');
    await page.getByRole('button', { name: 'Use Lavender' }).click();
    await apply();
    expect((await saved())?.theme === 'lavender', 'Lavender not saved');
  });

  await t.step('mobile: back on Free, a Premium theme switches back to Evergreen', async () => {
    await page.goto(MOBILE + '/premium');
    await page.getByRole('button', { name: 'Switch back to free' }).click();
    await page.getByRole('button', { name: 'Start 7-day free trial' }).waitFor({ timeout: 8000 });
    await page.goto(MOBILE + '/home');
    await page.getByText(/Lavender is a Premium theme/).first().waitFor({ timeout: 8000 });
    const s = await saved();
    expect(s?.theme === 'evergreen' && s?.mode === 'dark', `saved ${JSON.stringify(s)}`);
  });
}

await t.done();

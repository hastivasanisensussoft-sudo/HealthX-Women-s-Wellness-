// E2E for the mockup-merge features (web user app) against the real API.
// Runs in a disposable account with the server's sample history (deleted at the end).
// usage: node e2e-merge.mjs [--base=http://127.0.0.1:5181]   (FULL=1 for full error text)
import { api, B, deleteDisposable, harness, registerDisposable, serverState, uiLogin } from './hx-lib.mjs';

// The last step sends a change while the browser is offline on purpose.
const t = harness({ expectedConsole: [/Failed to load resource: net::ERR_INTERNET_DISCONNECTED/] });
const acct = await registerDisposable('merge');
const sample = await api('POST', '/v1/me/data/sample', { token: acct.token });
if (sample.status !== 200) throw new Error(`sample data → ${sample.status}`);
const { ctx, page } = await t.newPage();
await uiLogin(page, acct.email, acct.password);

await t.step('library: medium filter Audio shows only audio, Quick Help card opens detail', async () => {
  await page.goto(B + '/app/learn');
  await page.getByRole('button', { name: /Audio/ }).first().click();
  await page.getByText('SOS: fall back asleep').first().waitFor({ timeout: 4000 });
  if (await page.getByText('Sitali breathing to cool down').count()) throw new Error('video still visible under Audio filter');
  await page.getByText('SOS: fall back asleep').first().click();
  await page.waitForURL('**/app/learn/q_sos_sleep');
});
await t.step('player: play advances time, +15 skips, sleep timer toggles', async () => {
  await page.getByRole('button', { name: /Play · 10 min/ }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Play' }).click();
  await page.waitForTimeout(2300);
  await dlg.getByRole('button', { name: 'Pause' }).click();
  await dlg.getByRole('button', { name: 'Forward 15 seconds' }).click();
  const v = Number(await dlg.getByLabel('Playback position').inputValue());
  if (v < 16) throw new Error(`position ${v}`);
  await dlg.getByRole('button', { name: '15 min' }).click();
  if ((await dlg.getByRole('button', { name: '15 min' }).getAttribute('aria-pressed')) !== 'true') throw new Error('sleep timer not set');
  await page.keyboard.press('Escape');
});
await t.step('favorites: heart on detail, then Favorites filter lists it (and the server has it)', async () => {
  await page.getByRole('button', { name: 'Favorite', exact: true }).click();
  await page.waitForTimeout(500);
  await page.goto(B + '/app/learn');
  await page.getByRole('button', { name: /Favorites/ }).click();
  await page.getByText('SOS: fall back asleep').first().waitFor({ timeout: 3000 });
  const st = await serverState(page);
  if (!st.bookmarks.includes('q_sos_sleep')) throw new Error(`favorite not on the server (${JSON.stringify(st.bookmarks)})`);
});
await t.step('FAQ page lists 4 questions and filters by 8–10 min', async () => {
  await page.goto(B + '/app/learn/faq');
  await page.getByText('Finding the right gynecologist').waitFor({ timeout: 3000 });
  await page.getByRole('button', { name: '10 min', exact: true }).click();
  await page.waitForTimeout(200);
  if (await page.getByText('Low mood & menopause — what helps').count()) throw new Error('12-min FAQ not filtered out');
});
await t.step('custom symptom with icon + default severity preselects severity', async () => {
  await page.goto(B + '/app/symptoms');
  await page.getByRole('radio', { name: /My symptoms/ }).click();
  await page.getByLabel('Custom symptom name').fill('Jaw tension');
  await page.getByRole('radio', { name: 'flame' }).click();
  await page.getByRole('radio', { name: 'Severe' }).click();
  await page.getByRole('button', { name: 'Create symptom' }).click();
  await page.getByText(/Jaw tension will appear/).waitFor({ timeout: 3000 });
  await page.waitForTimeout(800); // the store re-syncs server ids after creates
  await page.getByRole('radio', { name: /Log symptoms/ }).click();
  await page.getByRole('button', { name: /Jaw tension/ }).first().click();
  await page.getByText(/Jaw tension/).nth(1).waitFor({ timeout: 2000 });
  const severe = page.locator('[aria-label*="Jaw tension"] [aria-checked="true"], [role=radiogroup][aria-label*="Jaw tension"] [aria-checked="true"]');
  if ((await severe.count()) && !/severe/i.test(await severe.first().innerText())) throw new Error('default severity not applied');
  const st = await serverState(page);
  const def = st.symptomDefs.find((s) => s.label === 'Jaw tension');
  if (!def || def.icon !== 'flame' || def.defaultSeverity !== 'severe') throw new Error(`server symptom ${JSON.stringify(def)}`);
});
await t.step('mood factors saved and shown in summary (stored on the server)', async () => {
  await page.goto(B + '/app/mood');
  await page.getByRole('radiogroup', { name: 'Mood' }).getByRole('radio').nth(1).click();
  await page.getByRole('button', { name: 'Weather' }).click();
  await page.getByRole('button', { name: 'Save mood & energy' }).click();
  await page.getByText('Mood & energy saved').waitFor({ timeout: 3000 });
  await page.waitForTimeout(500);
  const st = await serverState(page);
  const saved = st.checkIns.find((c) => c.date === st.today)?.moodFactors ?? [];
  if (!saved.includes('weather')) throw new Error(`server factors=${JSON.stringify(saved)}`);
  await page.reload();
  await page.getByRole('button', { name: 'Weather', pressed: true }).waitFor({ timeout: 5000 }); // today's factors come back from the server
});
await t.step('integrations: consent dialog then connect shows data-type switches', async () => {
  await page.goto(B + '/app/integrations');
  await page.getByRole('button', { name: 'Connect', exact: true }).first().click();
  await page.getByRole('button', { name: 'Allow & connect' }).click();
  await page.getByRole('button', { name: 'Disconnect' }).waitFor({ timeout: 4000 });
  await page.getByRole('switch', { name: /Steps/ }).first().waitFor({ timeout: 2000 });
  await page.waitForTimeout(500);
  const st = await serverState(page);
  if (!st.consents.find((c) => c.id === 'health_integrations')?.granted || !st.connections.some((c) => c.connected)) throw new Error('consent/connection not on the server');
});
await t.step('community: post, like, report hides, block removes author', async () => {
  await page.goto(B + '/app/community');
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await page.getByText(/at least 3 characters/).waitFor({ timeout: 2000 });
  await page.fill('#cm-text', 'Tried the 5-minute breathing today — lovely.');
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await page.getByText('Tried the 5-minute breathing today — lovely.').waitFor({ timeout: 2000 });
  const like = page.getByRole('button', { name: '24' });
  await like.click();
  await page.getByRole('button', { name: '25' }).waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: 'Report', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Report' }).click();
  await page.getByText(/You reported this post/).waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: 'Block', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Block' }).click();
  await page.getByText('Blocked', { exact: true }).first().waitFor({ timeout: 2000 });
  if (await page.getByText('Any easy 15-minute strength routines for beginners at home?').count()) throw new Error('blocked author still visible');
});
await t.step('forgot password: check-your-email card with resend countdown', async () => {
  const p = await t.newPage();
  await p.page.goto(B + '/forgot-password');
  await p.page.fill('#email', acct.email);
  await p.page.getByRole('button', { name: 'Send link' }).click();
  await p.page.getByText(/Resend link in/).waitFor({ timeout: 4000 });
  await p.page.getByRole('button', { name: 'Change it' }).click();
  await p.page.locator('#email').waitFor({ timeout: 2000 });
  await p.ctx.close();
});
await t.step('weekly report: Monthly + Cycle scopes render', async () => {
  await page.goto(B + '/app/insights/weekly');
  await page.getByRole('radio', { name: 'Monthly' }).click();
  await page.getByRole('heading', { name: 'Monthly report' }).waitFor({ timeout: 3000 });
  await page.getByRole('radio', { name: 'Cycle' }).click();
  await page.getByRole('heading', { name: 'Cycle report' }).waitFor({ timeout: 3000 });
});
await t.step('offline banner appears when the browser goes offline (and says changes can’t be saved)', async () => {
  await page.goto(B + '/app');
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 6000 });
  await ctx.setOffline(true);
  await page.getByText('You’re offline. Changes can’t be saved until you’re back online.').waitFor({ timeout: 3000 });
  await page.getByRole('button', { name: '+ 250 ml' }).click();
  await page.getByText('Not saved — you’re offline').waitFor({ timeout: 5000 });
  await ctx.setOffline(false);
  await page.getByText(/You’re offline/).waitFor({ state: 'detached', timeout: 3000 });
  await page.getByText('Back online').waitFor({ timeout: 5000 });
});

await ctx.close();
const s = await deleteDisposable(acct);
if (s !== 204 && s !== 200) console.log(`   cleanup: ${acct.email} → ${s}`);
await t.done();

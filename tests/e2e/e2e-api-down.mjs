// API-down behaviour of the web user app. Precondition: the API behind the Vite proxy is STOPPED.
// The script verifies the can't-reach state, then starts a temporary API itself (same command as the
// fork's API: PORT=4101 npx tsx src/main.ts in apps/api), checks recovery, kills it, and exits.
// usage: node e2e-api-down.mjs [--base=http://127.0.0.1:5181]   (env API_DIR / API_PORT / ALLOWED_ORIGINS)
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { B, DEMO_USER, harness, uiLogin } from './hx-lib.mjs';

const API_DIR = process.env.API_DIR || fileURLToPath(new URL('../../apps/api', import.meta.url));
const API_PORT = process.env.API_PORT || '4101';
const ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:5181,http://127.0.0.1:5181';
const health = () =>
  fetch(B + '/api/v1/health')
    .then((r) => r.status)
    .catch(() => 0);

if ((await health()) === 200) {
  console.log(`SKIP: the API behind ${B} is running — stop it first (this script checks the can’t-reach state).`);
  process.exit(2);
}

// While the API is down every /api call fails through the proxy (Vite answers 500) — expected here.
const t = harness({ expected: [/^5\d\d /] });
const reach = (page) => page.getByRole('heading', { name: 'Can’t reach the HealthX server' });

const a = await t.newPage();
await t.step('API down: /login shows “Can’t reach the HealthX server” with Try again + Use offline demo', async () => {
  await a.page.goto(B + '/login');
  await reach(a.page).waitFor({ timeout: 8000 });
  await a.page.getByRole('button', { name: 'Try again' }).waitFor({ timeout: 1000 });
  await a.page.getByRole('button', { name: 'Use offline demo' }).waitFor({ timeout: 1000 });
  if (await a.page.locator('#password').count()) throw new Error('login form shown while the server is down');
});
await t.step('API down: Try again re-checks and stays on the can’t-reach screen', async () => {
  await a.page.getByRole('button', { name: 'Try again' }).click();
  await a.page.getByText('Connecting to HealthX…').waitFor({ timeout: 3000 }).catch(() => undefined); // may be too quick to see
  await reach(a.page).waitFor({ timeout: 8000 });
});
await t.step('API down: /app and /signup are gated too (no demo data is shown)', async () => {
  const p = await t.newPage();
  for (const path of ['/app', '/app/cycle', '/signup']) {
    await p.page.goto(B + path);
    await reach(p.page).waitFor({ timeout: 8000 });
    if (await p.page.locator('main h1').count()) throw new Error(`${path} rendered app content`);
  }
  await p.ctx.close();
});
await t.step('API down: the public website still works', async () => {
  const p = await t.newPage();
  await p.page.goto(B + '/');
  await p.page.locator('main h1').first().waitFor({ timeout: 8000 });
  if (await reach(p.page).count()) throw new Error('public home page is gated');
  await p.page.goto(B + '/privacy-policy');
  await p.page.getByText('Draft — requires legal review before launch').waitFor({ timeout: 5000 });
  await p.ctx.close();
});
await t.step('Use offline demo → browser-only demo with a persistent banner; Connect to server → back to API mode', async () => {
  const p = await t.newPage();
  await p.page.goto(B + '/login');
  await p.page.getByRole('button', { name: 'Use offline demo' }).click();
  await p.page.getByText('data stays in this browser, nothing is checked by a server').waitFor({ timeout: 8000 });
  await p.page.goto(B + '/app');
  await p.page.locator('main h1').first().waitFor({ timeout: 8000 });
  await p.page.getByText('data stays in this browser, nothing is checked by a server').waitFor({ timeout: 3000 });
  await p.page.getByRole('button', { name: 'Connect to server' }).first().click();
  await reach(p.page).waitFor({ timeout: 10000 });
  if (await p.page.evaluate(() => localStorage.getItem('healthx.offlineDemo'))) throw new Error('offline flag not cleared');
  await p.ctx.close();
});

// ---------- bring a temporary API up and check recovery ----------
const child = spawn('npx tsx src/main.ts', { cwd: API_DIR, env: { ...process.env, PORT: API_PORT, ALLOWED_ORIGINS: ORIGINS }, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
let apiLog = '';
child.stdout.on('data', (d) => (apiLog += d));
child.stderr.on('data', (d) => (apiLog += d));
child.on('error', (e) => console.log(`   (temporary API process error: ${e.message})`));
const kill = () => {
  try {
    execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
  } catch {
    /* already gone */
  }
};
try {
  const t0 = Date.now();
  while ((await health()) !== 200 && Date.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 500));
  console.log(`   (temporary API up after ${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  await t.step('API back: Try again on the open page shows the login form; sign-in works', async () => {
    await a.page.getByRole('button', { name: 'Try again' }).click();
    await a.page.locator('#password').waitFor({ timeout: 8000 });
    await uiLogin(a.page, DEMO_USER);
    await a.page.getByRole('heading', { level: 1, name: /Aisha/ }).first().waitFor({ timeout: 8000 });
  });

  await t.step('API dies mid-session: a change shows “Not saved — the server had a problem” (no silent success)', async () => {
    kill();
    while ((await health()) === 200) await new Promise((r) => setTimeout(r, 300));
    await a.page.getByRole('button', { name: '+ 250 ml' }).click();
    await a.page.getByText('Not saved — the server had a problem').waitFor({ timeout: 8000 });
  });
} finally {
  kill();
}
if (process.env.FULL) console.log(apiLog.slice(-2000));
await t.done();

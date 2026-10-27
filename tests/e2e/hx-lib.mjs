// Shared helpers for the HealthX web e2e scripts running against the real API (API mode).
// Base URL: --base=http://host:port, or BASE env, default the fork's Vite on :5181 (which proxies /api).
import { chromium } from 'playwright-core';

export const B = (process.argv.find((a) => a.startsWith('--base=')) ?? '').slice(7) || process.env.BASE || 'http://127.0.0.1:5181';
export const DEMO_PW = 'HealthX-demo-2026';
export const DEMO_USER = 'aisha@example.com';
export const stamp = Date.now().toString(36);

/** Direct call to the API through the same /api proxy the app uses. */
export async function api(method, path, { token, body, headers = {} } = {}) {
  const r = await fetch(B + '/api' + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }
  return { status: r.status, body: json };
}

/** Newest dev-outbox link sent to `to` (optionally only messages whose subject matches). */
export const outboxLink = async (to, subject = /./) => (await api('GET', `/v1/dev/outbox?to=${encodeURIComponent(to)}`)).body.messages.find((m) => subject.test(m.subject))?.link;

/** Staff session via password + MFA (dev MFA code endpoint) — used only to verify what staff can see. */
export async function staffToken(email) {
  const l = await api('POST', '/v1/auth/login', { body: { email, password: DEMO_PW } });
  if (!l.body?.mfaToken) throw new Error(`staff login failed (${l.status})`);
  const code = (await api('GET', `/v1/dev/mfa-code?email=${encodeURIComponent(email)}`)).body.code;
  const v = await api('POST', '/v1/auth/mfa/verify', { body: { mfaToken: l.body.mfaToken, code } });
  if (!v.body?.accessToken) throw new Error(`MFA verify failed (${v.status})`);
  return v.body.accessToken;
}

/** A throwaway app account for tests that change data (never the seeded demo accounts). */
export async function registerDisposable(prefix, password = 'Wellness#2026e2e') {
  const email = `${prefix}.${stamp}@example.test`;
  const r = await api('POST', '/v1/auth/register', { body: { name: `${prefix[0].toUpperCase()}${prefix.slice(1)} Tester`, email, password, acceptTerms: true } });
  if (r.status !== 201) throw new Error(`register ${email} failed (${r.status}: ${JSON.stringify(r.body)})`);
  return { email, password, token: r.body.accessToken };
}

/** Clean up an account the test created (self-service delete, same as the Privacy page). */
export async function deleteDisposable({ email, password }) {
  const l = await api('POST', '/v1/auth/login', { body: { email, password } });
  if (l.status !== 200) return l.status;
  return (await api('DELETE', '/v1/me', { token: l.body.accessToken, body: { password, confirm: 'DELETE' } })).status;
}

/** Sign in through the real login form; resolves once the app has routed into /app or /onboarding. */
export async function uiLogin(page, email, password = DEMO_PW) {
  await page.goto(B + '/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((u) => u.pathname.startsWith('/app') || u.pathname === '/onboarding', { timeout: 10000 });
}

/** Read the signed-in user's state from the server with the page's own session (no localStorage involved). */
export const serverState = (page) =>
  page.evaluate(async () => {
    const r = await fetch('/api/v1/auth/refresh', { method: 'POST', headers: { 'X-Client': 'web' }, credentials: 'include' });
    if (!r.ok) throw new Error(`refresh ${r.status}`);
    const { accessToken } = await r.json();
    const s = await fetch('/api/v1/me/state', { headers: { Authorization: `Bearer ${accessToken}` } });
    return (await s.json()).state;
  });

/**
 * Test harness: PASS/FAIL steps, page errors, and every API response >= 400 (reported unless it matches an
 * expected pattern such as the 401 from the boot-time refresh when nobody is signed in).
 */
export function harness({ expected = [], expectedConsole = [] } = {}) {
  const allowed = [/^401 POST \/api\/v1\/auth\/refresh$/, ...expected];
  const errors = [];
  const apiErrors = [];
  let passes = 0;
  let fails = 0;
  const failures = [];
  const browserP = chromium.launch({ channel: 'chrome' });
  return {
    allow: (re) => allowed.push(re),
    async newPage(opts = {}) {
      const browser = await browserP;
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...opts });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`pageerror ${page.url()}: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const t = m.text();
        if (/^Failed to load resource: the server responded with a status of \d+/.test(t)) return; // tracked via responses below
        if (expectedConsole.some((re) => re.test(t))) return;
        errors.push(`console ${page.url()}: ${t.slice(0, 200)}`);
      });
      page.on('response', (r) => {
        const u = new URL(r.url());
        if (!u.pathname.startsWith('/api/') || r.status() < 400) return;
        const line = `${r.status()} ${r.request().method()} ${u.pathname}`;
        if (!allowed.some((re) => re.test(line))) apiErrors.push(`${line}  (on ${new URL(page.url()).pathname})`);
      });
      return { ctx, page };
    },
    async step(name, fn) {
      try {
        await fn();
        passes++;
        console.log('PASS', name);
      } catch (e) {
        fails++;
        failures.push(name);
        console.log('FAIL', name, '-', String(e?.message ?? e).split('\n').slice(0, process.env.FULL ? 12 : 1).join('\n'));
      }
    },
    async done() {
      console.log(`\n${passes} passed, ${fails} failed`);
      if (failures.length) console.log('FAILURES:\n- ' + failures.join('\n- '));
      console.log(apiErrors.length ? `UNEXPECTED API ERRORS (${apiErrors.length}):\n${[...new Set(apiErrors)].join('\n')}` : 'no unexpected API errors');
      console.log(errors.length ? `PAGE/CONSOLE ERRORS (${errors.length}):\n${[...new Set(errors)].slice(0, 25).join('\n')}` : 'no page/console errors');
      await (await browserP).close();
      process.exitCode = fails || apiErrors.length || errors.length ? 1 : 0;
    },
  };
}

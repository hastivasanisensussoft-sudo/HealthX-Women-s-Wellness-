// Shared helpers for the mobile API-mode browser tests (mobile web export in desktop Chrome).
// Talks to a disposable local in-memory API (default :4103), never the shared :4000 instance.
export const API = process.env.HEALTHX_API ?? 'http://127.0.0.1:4103';
// Synthetic, development-only demo password of the seeded accounts (apps/api README, DEMO_PASSWORD).
export const DEMO_PASSWORD = process.env.HEALTHX_DEMO_PASSWORD ?? 'HealthX-demo-2026';

const H = { 'Content-Type': 'application/json', 'X-Client': 'mobile', 'X-Requested-With': 'healthx' };

async function req(method, path, { token, body } = {}) {
  const r = await fetch(API + path, {
    method,
    headers: token ? { ...H, Authorization: 'Bearer ' + token } : H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${json?.error?.message ?? ''}`);
  return json;
}

/** A server-side view of one account, for asserting what was actually stored. */
export async function serverView(email, password = DEMO_PASSWORD) {
  const s = await req('POST', '/v1/auth/login', { body: { email, password } });
  const token = s.accessToken;
  return {
    user: s.user,
    state: async () => (await req('GET', '/v1/me/state', { token })).state,
    sessions: async () => (await req('GET', '/v1/auth/sessions', { token })).sessions,
    /** Replace this account's data with the sample history (POST /v1/me/data/sample). */
    reset: () => req('POST', '/v1/me/data/sample', { token }),
    close: () => req('POST', '/v1/auth/logout', { token }).catch(() => undefined),
  };
}

/** Registers a disposable test account through the API (unique per run). */
export async function registerDisposable(prefix = 'mobile.test') {
  const email = `${prefix}+${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'Disposable#' + Math.random().toString(36).slice(2, 10);
  await req('POST', '/v1/auth/register', { body: { name: 'Test User', email, password, acceptTerms: true } });
  return { email, password };
}

/** Signs in through the mobile UI (web export) and waits for Home. */
export async function signInUI(page, base, email, password = DEMO_PASSWORD) {
  await page.goto(base + '/login?email=' + encodeURIComponent(email), { waitUntil: 'load' });
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByText('Wellness Score').first().waitFor({ timeout: 12000 });
}

export const today = (s) => s.today;

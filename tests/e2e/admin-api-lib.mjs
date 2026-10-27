// Shared helpers for the Web Admin tests that run against a real HealthX API (apps/api).
// Staff sign in with the seeded demo password + a TOTP code read from the dev-only endpoint.
export const API = process.env.HX_API ?? 'http://127.0.0.1:4102';
export const BASE = process.env.HX_WEB ?? 'http://127.0.0.1:5182';
export const PASSWORD = 'HealthX-demo-2026';

/** Seeded staff in the four SRS roles (keys are personas; same accounts as before the 7→4 consolidation). */
export const STAFF = {
  owner: ['sam.rivera@healthx.example'], // Admin holding every privileged permission (was Super Admin)
  admin: ['alex.morgan@healthx.example', 'ritu.sharma@healthx.example'],
  former_support: ['neha.joshi@healthx.example', 'tom.becker@healthx.example'], // Admins (were Support Agents)
  former_analyst: ['kenji.watanabe@healthx.example'], // Admin (was Analyst)
  content_manager: ['priya.nair@healthx.example', 'daniel.okafor@healthx.example'],
  reviewer: ['meera.iyer@healthx.example', 'sarah.thompson@healthx.example'], // Medical Content Reviewers
};
export const APP_USER = 'aisha@example.com';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stepNow = () => Math.floor(Date.now() / 30_000);
// A TOTP code can't be replayed inside the same 30-second step, so remember when each account used one.
const lastStep = new Map();

async function waitForFreshStep(email) {
  while (lastStep.has(email) && stepNow() <= lastStep.get(email)) await sleep(400);
}

export async function mfaCode(email) {
  await waitForFreshStep(email);
  const r = await fetch(`${API}/v1/dev/mfa-code?email=${encodeURIComponent(email)}`);
  if (!r.ok) throw new Error(`dev mfa-code ${r.status} for ${email}`);
  return (await r.json()).code;
}

async function json(r) {
  const t = await r.text();
  try {
    return t ? JSON.parse(t) : {};
  } catch {
    return { raw: t };
  }
}

/** Direct API session (no browser): returns { token, call(method, path, body) }. */
export async function apiSession(email) {
  const login = await fetch(`${API}/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-client': 'api' }, body: JSON.stringify({ email, password: PASSWORD }) });
  let body = await json(login);
  if (!login.ok) throw new Error(`login ${email}: ${login.status} ${JSON.stringify(body)}`);
  if (body.mfaRequired) {
    for (let attempt = 0; ; attempt++) {
      const code = await mfaCode(email);
      const v = await fetch(`${API}/v1/auth/mfa/verify`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-client': 'api' }, body: JSON.stringify({ mfaToken: body.mfaToken, code }) });
      lastStep.set(email, stepNow());
      const vb = await json(v);
      if (v.ok) {
        body = vb;
        break;
      }
      if (attempt >= 2) throw new Error(`mfa ${email}: ${v.status} ${JSON.stringify(vb)}`);
    }
  }
  const token = body.accessToken;
  const call = async (method, path, payload) => {
    const r = await fetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-client': 'api' }, body: payload === undefined ? undefined : JSON.stringify(payload) });
    return { status: r.status, body: await json(r) };
  };
  return { token, user: body.user, call };
}

/** Collects console/page errors, ignoring the expected HTTP refusals a test provokes on purpose. */
export function watchErrors(page, { allowStatus = [401] } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    const st = /status of (\d{3})/.exec(t);
    if (st && allowStatus.includes(Number(st[1]))) return;
    errors.push('console: ' + t.slice(0, 200));
  });
  return errors;
}

/** Keeps the latest role-scoped admin state the page received from the server. */
export function trackServerState(page) {
  const box = { state: null, actions: [], token: null };
  page.on('request', (req) => {
    const h = req.headers().authorization;
    if (h && req.url().includes('/api/v1/admin/')) box.token = h.slice('Bearer '.length);
  });
  page.on('response', async (res) => {
    const u = new URL(res.url());
    if (!u.pathname.startsWith('/api/v1/admin/')) return;
    if (u.pathname === '/api/v1/admin/actions') box.actions.push(res.status());
    if (!res.ok()) return;
    if (u.pathname === '/api/v1/admin/state' || u.pathname === '/api/v1/admin/actions') {
      try {
        const b = await res.json();
        if (b.state) box.state = b.state;
      } catch {
        /* navigation raced the body */
      }
    }
  });
  return box;
}

/** Signs a staff member in through the real login UI (password → 6-digit code). */
export async function signIn(page, email, { password = PASSWORD, path = '/admin/login' } = {}) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForSelector('#adm-email');
  await page.fill('#adm-email', email);
  await page.fill('#adm-pw', password);
  await page.click('button[type=submit]');
  await page.waitForSelector('#adm-code', { timeout: 10_000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await mfaCode(email);
    await page.fill('#adm-code', code);
    await page.click('button[type=submit]');
    const ok = await page
      .waitForURL((u) => !u.pathname.startsWith('/admin/login'), { timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    lastStep.set(email, stepNow());
    if (ok) {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      return;
    }
  }
  throw new Error(`sign-in failed for ${email}`);
}

export async function signOut(page) {
  await page.click('button[aria-label="Profile menu"]');
  await page.click('[role=menuitem]:has-text("Sign out")');
  await page.waitForURL('**/admin/login');
}

// Other work is editing the same source tree while these tests run, and Vite's HMR would push those
// edits into open test pages mid-check. Test pages therefore get a no-HMR stand-in for the Vite client
// (styles still applied); every navigation still loads current code from the dev server.
const VITE_CLIENT_STUB = `
const sheets = new Map();
export function updateStyle(id, css) {
  let s = sheets.get(id);
  if (!s) { s = document.createElement('style'); s.setAttribute('type', 'text/css'); s.setAttribute('data-vite-dev-id', id); document.head.appendChild(s); sheets.set(id, s); }
  s.textContent = css;
}
export function removeStyle(id) { const s = sheets.get(id); if (s) { s.remove(); sheets.delete(id); } }
export function injectQuery(url, q) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + q + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export function createHotContext() {
  const noop = () => {};
  return { data: {}, accept: noop, acceptExports: noop, dispose: noop, prune: noop, decline: noop, invalidate: noop, on: noop, off: noop, send: noop };
}
export class ErrorOverlay extends HTMLElement {}
`;

export async function newContext(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 1440, height: opts.height ?? 900 }, acceptDownloads: true });
  await ctx.route(/\/@vite\/client$/, (route) => route.fulfill({ contentType: 'application/javascript', body: VITE_CLIENT_STUB }));
  return ctx;
}

export async function newStaffPage(browser, email, opts = {}) {
  const ctx = await newContext(browser, opts);
  const page = await ctx.newPage();
  const errors = watchErrors(page, opts);
  const server = trackServerState(page);
  if (email) {
    await signIn(page, email);
    // The first state response can race a navigation (large Admin projections especially): wait for one
    // the test could read, and reload once if none arrived.
    const waitState = async () => {
      for (let i = 0; i < 40 && !server.state; i++) await page.waitForTimeout(250);
    };
    await waitState();
    if (!server.state) {
      await page.reload({ waitUntil: 'networkidle' });
      await waitState();
    }
  }
  return { ctx, page, errors, server };
}

export async function go(page, path, wait = 600) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
}

export function reporter() {
  let pass = 0;
  const fails = [];
  const ok = (cond, name) => {
    if (cond) {
      pass++;
      console.log('PASS', name);
    } else {
      fails.push(name);
      console.log('FAIL', name);
    }
    return cond;
  };
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      fails.push(`${name}: ${e.message.split('\n')[0]}`);
      console.log('FAIL', name, '-', e.message.split('\n')[0]);
    }
  };
  const done = (extra = []) => {
    const errs = [...new Set(extra)];
    if (errs.length) {
      fails.push(`console/page errors (${errs.length})`);
      console.log('FAIL console/page errors:\n  ' + errs.slice(0, 15).join('\n  '));
    }
    console.log(`\n${pass} passed, ${fails.length} failed`);
    if (fails.length) console.log(fails.map((f) => '  - ' + f).join('\n'));
    return fails.length ? 1 : 0;
  };
  return { ok, step, done };
}

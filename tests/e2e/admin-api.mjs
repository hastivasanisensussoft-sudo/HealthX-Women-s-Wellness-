// Web Admin ↔ HealthX API end-to-end: real staff accounts + MFA, server-scoped state, server-enforced
// permissions, the full content lifecycle across three staff accounts, session revocation, audited
// email reveal and the invite → accept → MFA sign-in path.   node admin-api.mjs   (see admin-run.mjs)
import { createHmac } from 'node:crypto';
import { chromium } from 'playwright-core';
import { API, APP_USER, BASE, PASSWORD, STAFF, apiSession, go, newContext, newStaffPage, reporter, trackServerState, watchErrors } from './admin-api-lib.mjs';

const { ok, step, done } = reporter();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const stamp = Date.now().toString(36);
const allErrors = [];
const S = {}; // role → { ctx, page, errors, server }

/** Persona → the canonical role it signs in with (four SRS roles), its dashboard title and role label. */
const PERSONAS = {
  owner: 'admin',
  admin: 'admin',
  reviewer: 'medical_content_reviewer',
  content_manager: 'content_manager',
  former_support: 'admin',
  former_analyst: 'admin',
};
const TITLES = { admin: 'Admin overview', medical_content_reviewer: 'Medical review', content_manager: 'Content workspace' };
const ROLE_LABEL = { admin: 'Admin', medical_content_reviewer: 'Medical Content Reviewer', content_manager: 'Content Manager' };
const PRIVILEGED = ['manage_staff', 'manage_permissions', 'manage_settings', 'break_glass'];

const statValue = (page, label) =>
  page.evaluate((label) => {
    const el = [...document.querySelectorAll('main span')].find((s) => s.textContent.trim() === label);
    const v = el?.parentElement?.parentElement?.querySelector('span[class*="text-[28px]"]');
    return v ? Number(v.textContent.trim()) : null;
  }, label);
const pipelineCount = (page, label) =>
  page.evaluate((label) => {
    const card = [...document.querySelectorAll('main .card, main [class*="card-pad"]')].find((c) => c.textContent.includes('Content pipeline'));
    const li = card && [...card.querySelectorAll('li')].find((l) => l.firstElementChild?.textContent.trim() === label);
    return li ? Number(li.lastElementChild.textContent.trim()) : null;
  }, label);
/** A row of the staff table only (the permission matrix below also names Admins who hold privileged permissions). */
const staffRow = (page, name) => page.locator('table').first().locator('tbody tr', { hasText: name });
const toastText = (page) => page.locator('[aria-live=polite] [role=status]').allInnerTexts().then((t) => t.join(' | '));
const waitToast = (page, re, timeout = 6000) => page.locator('[aria-live=polite] [role=status]', { hasText: re }).first().waitFor({ timeout }).then(() => true).catch(() => false);

// ---------------------------------------------------------------------------------------------
// 0. A marker item created straight through the API by a second content manager (not used in the UI),
//    so each dashboard can be checked against data that only the server has.
const MARKER = `Server marker ${stamp}`;
await step('seed marker via API', async () => {
  const daniel = await apiSession(STAFF.content_manager[1]);
  const item = {
    id: `c_marker_${stamp}`, title: MARKER, description: 'Created by the test through the API only.', type: 'article', category: 'cycle', lifeStage: 'all', language: 'English',
    author: 'ignored', medicalReviewer: '', reviewDate: null, references: [], publishedDate: null, updatedDate: '2026-01-01', scheduledFor: null, status: 'medical_review', version: 1,
    body: 'A neutral body for the server marker item, long enough to be valid content for review.', media: null, safetyChecks: {}, history: [],
  };
  const r = await daniel.call('POST', '/v1/admin/actions', { action: { type: 'UPSERT_CONTENT', item } });
  ok(r.status === 200 && r.body.state.content.some((c) => c.id === item.id && c.author === 'Daniel Okafor'), `marker created by the API with the server-set author (${r.status})`);
});

// ---------------------------------------------------------------------------------------------
// 1. Every persona signs in with its real account; nav + dashboard come from the server's state.
for (const [persona, role] of Object.entries(PERSONAS)) {
  await step(`persona ${persona} (${role})`, async () => {
    const email = STAFF[persona][0];
    const s = await newStaffPage(browser, email, { allowStatus: [401, 403] });
    S[persona] = s;
    const { page, server } = s;
    const st = server.state;
    ok(st?.session?.email === email && st.session.role === role, `${persona}: server session is ${email} as ${role}`);
    ok(['end_user', 'content_manager', 'medical_content_reviewer', 'admin'].includes(st.session.role), `${persona}: one of the four SRS roles`);
    ok(persona === 'owner' ? PRIVILEGED.every((p) => st.session.privileges.includes(p)) : st.session.privileges.length === 0, `${persona}: privileged permissions [${st.session.privileges.join(', ')}]`);
    const h1 = await page.locator('main h1').first().innerText();
    ok(h1 === TITLES[role], `${persona}: dashboard "${h1}"`);
    const first = st.session.name.split(' ')[0] === 'Dr.' ? st.session.name.split(' ').slice(0, 2).join(' ') : st.session.name.split(' ')[0];
    ok((await page.getByText(`Hi ${first} —`).count()) > 0, `${persona}: greets the server user (${first})`);
    const header = await page.locator('header').first().innerText();
    ok(header.includes('Server') && header.includes(st.session.name) && header.includes(ROLE_LABEL[role]), `${persona}: header shows Server badge, name and role`);
    ok((await page.getByText('Offline demo — permissions are not enforced').count()) === 0, `${persona}: no offline-demo banner`);
    ok((await page.getByText('Switch demo role').count()) === 0, `${persona}: no role picker`);
    // Nav mirrors the server's permission matrix for this role (plus the persona's own privileged permissions).
    const caps = [...st.permissions[role], ...st.session.privileges];
    const navText = await page.locator('nav[aria-label=Admin]').first().innerText();
    ok(navText.includes('User Management') === caps.some((c) => ['view_users', 'manage_support', 'process_data_requests'].includes(c)), `${persona}: User Management in nav ⇔ server grants user/support/privacy access`);
    ok(navText.includes('Roles & Permissions') === caps.includes('view_staff'), `${persona}: Roles & Permissions in nav ⇔ view_staff`);
    // Role-specific numbers rendered from the server projection.
    const inMedical = st.content.filter((c) => c.status === 'medical_review').length;
    if (role === 'admin') {
      // One Admin dashboard: operations, platform/security, the support desk and reports.
      ok(inMedical > 0 && (await page.getByText(`${inMedical} waiting`).count()) > 0, `${persona}: "Pending medical reviews" shows the server's ${inMedical}`);
      ok((await page.getByText(MARKER).count()) > 0, `${persona}: API-created marker listed on the dashboard`);
      const n = await pipelineCount(page, 'Medical review');
      ok(n === inMedical, `${persona}: pipeline "Medical review" ${n} = server ${inMedical}`);
      const open = st.support.filter((r) => r.status === 'open').length;
      const o = await statValue(page, 'Open support requests');
      ok(o === open && open > 0, `${persona}: "Open support requests" ${o} = server ${open} (former Support Agent desk)`);
      ok((await page.getByLabel('Quick user lookup').count()) === 1, `${persona}: quick user lookup on the dashboard`);
      ok((await page.getByRole('link', { name: 'Open analytics' }).count()) === 1, `${persona}: link into analytics & reports (former Analyst area)`);
      ok(st.users.length > 0 && st.users.every((u) => /\*\*\*@/.test(u.email)), `${persona}: server sent masked emails only`);
    }
    if (role === 'medical_content_reviewer') {
      const n = await statValue(page, 'Awaiting medical review');
      ok(n === inMedical, `${persona}: "Awaiting medical review" ${n} = server ${inMedical}`);
      ok((await page.getByText(MARKER).count()) > 0, `${persona}: API-created marker is in the review queue`);
      ok(st.users.length === 0 && st.audit.length === 0 && st.support.length === 0, `${persona}: server sent no users, audit or support data`);
    }
    if (role === 'content_manager') {
      const n = await statValue(page, 'In medical review');
      ok(n === inMedical, `${persona}: "In medical review" ${n} = server ${inMedical}`);
      ok(st.users.length === 0 && st.audit.length === 0 && st.support.length === 0, `${persona}: server sent no users, audit or support data`);
    }
  });
}
await step('end user', async () => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
  await page.fill('#adm-email', APP_USER);
  await page.fill('#adm-pw', PASSWORD);
  await page.click('button[type=submit]');
  await page.getByText('No admin access').waitFor({ timeout: 8000 });
  ok((await page.locator('a[href="/get-the-app"]').count()) > 0 && (await page.locator('nav[aria-label=Admin]').count()) === 0, 'end user: "No admin access" with a link to the mobile app, no admin nav');
  await go(page, '/admin/users');
  ok(new URL(page.url()).pathname === '/admin/login' && (await page.locator('table').count()) === 0, 'end user: no admin session kept (deep link → staff sign-in)');
  allErrors.push(...errors);
  await ctx.close();
});

// ---------------------------------------------------------------------------------------------
// 2. Server enforcement shows in the UI: a crafted dispatch from the Content Manager's page and a direct
//    call with that page's own bearer token are both refused.
await step('content manager enforcement', async () => {
  const { page, server } = S.content_manager;
  const before = server.actions.length;
  const r = await page.evaluate(async () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$'));
    const stack = [root[key]];
    const seen = new Set();
    let value = null;
    while (stack.length && !value) {
      const f = stack.pop();
      if (!f || seen.has(f)) continue;
      seen.add(f);
      const v = f.memoizedProps?.value;
      if (v && typeof v.dispatch === 'function' && typeof v.adoptSession === 'function' && 'apiMode' in v) value = v;
      if (f.child) stack.push(f.child);
      if (f.sibling) stack.push(f.sibling);
    }
    if (!value) return { found: false };
    const out = await value.dispatch({ type: 'UPDATE_USER', id: 'usr_aisha', patch: { status: 'deactivated' } });
    return { found: true, apiMode: value.apiMode, refused: out === null };
  });
  ok(r.found && r.apiMode && r.refused, 'content manager: crafted UPDATE_USER dispatch is refused (dispatch resolves null)');
  ok(server.actions.slice(before).includes(403), `content manager: server answered 403 (${server.actions.slice(before).join(',')})`);
  ok(await waitToast(page, /You don’t have permission to do that/), `content manager: error toast shown (${await toastText(page)})`);
  const token = server.token;
  ok(!!token, 'content manager: captured the page’s own bearer token');
  const H = { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-client': 'web-admin' };
  const a = await fetch(`${API}/v1/admin/actions`, { method: 'POST', headers: H, body: JSON.stringify({ action: { type: 'UPDATE_USER', id: 'usr_aisha', patch: { status: 'deactivated' } } }) });
  const b = await fetch(`${API}/v1/admin/audit`, { headers: H });
  const c = await fetch(`${API}/v1/admin/users/usr_aisha/reveal-email`, { method: 'POST', headers: H });
  const d = await fetch(`${API}/v1/admin/state`, { headers: H });
  ok(a.status === 403 && b.status === 403 && c.status === 403, `content manager token: action ${a.status}, audit ${b.status}, reveal-email ${c.status} (all 403)`);
  ok(d.status === 200, `content manager token: own role-scoped state ${d.status}`);
});
await step('admin without privileged permissions', async () => {
  const { page, server } = S.admin;
  await go(page, '/admin/staff');
  ok((await page.getByRole('button', { name: 'Invite staff', exact: true }).count()) === 0, 'Admin without Manage staff: no Invite staff button');
  const H = { authorization: `Bearer ${server.token}`, 'content-type': 'application/json', 'x-client': 'web-admin' };
  const inv = await fetch(`${API}/v1/admin/actions`, { method: 'POST', headers: H, body: JSON.stringify({ action: { type: 'INVITE_STAFF', member: { name: 'Sneaky Invite', email: `sneaky.${stamp}@healthx.example`, role: 'admin' } } }) });
  const bg = await fetch(`${API}/v1/admin/users/usr_aisha/break-glass`, { method: 'POST', headers: H, body: JSON.stringify({ reason: 'Testing that this is refused for this account' }) });
  ok(inv.status === 403 && bg.status === 403, `Admin without privileges: invite ${inv.status}, break-glass ${bg.status} (both 403)`);
});

// ---------------------------------------------------------------------------------------------
// 3. Full content lifecycle across three staff accounts, then visible to an app user in Learn.
const TITLE = `Lifecycle check ${stamp}: gentle movement on period days`;
let contentUrl = '';
const status = (page) => page.locator('h1 + span span').first().innerText().then((t) => t.trim()).catch(() => '?');
await step('content lifecycle', async () => {
  const cm = S.content_manager.page;
  await go(cm, '/admin/content/new');
  await cm.fill('#c-title', TITLE);
  await cm.fill('#c-desc', 'A short, non-diagnostic guide to gentle movement.');
  await cm.fill('textarea[aria-label="Body (Markdown)"]', '## Gentle movement\nMany people find **gentle walking** helpful.\n\n- Listen to your body\n- If pain is severe, consider speaking with a qualified healthcare professional.');
  await cm.click('button:has-text("Submit for medical review")');
  await cm.waitForURL(/\/admin\/content\/c_/, { timeout: 8000 });
  contentUrl = new URL(cm.url()).pathname;
  await cm.waitForTimeout(500);
  let item = S.content_manager.server.state.content.find((c) => c.title === TITLE);
  ok(item?.status === 'medical_review' && item.author === 'Priya Nair', `CM: created + submitted on the server (status ${item?.status}, author ${item?.author})`);
  ok((await cm.getByText('Submitted for medical review').count()) > 0, 'CM: server history shown in the editor');

  const mr = S.reviewer.page;
  await go(mr, contentUrl);
  await mr.click('button:has-text("Approve medically")');
  ok((await mr.getByText('Add at least one reference').count()) > 0, 'MR: approval needs references + checklist (UI)');
  for (const cb of await mr.$$('main input[type=checkbox]')) await cb.check();
  await mr.fill('input[aria-label="New reference"]', `Reference added during medical review ${stamp}`);
  await mr.click('button:has-text("Add")');
  await mr.click('button:has-text("Approve medically")');
  await mr.waitForTimeout(900);
  const [cmName, mrName, adName] = [S.content_manager, S.reviewer, S.admin].map((x) => x.server.state.session.name);
  item = S.reviewer.server.state.content.find((c) => c.title === TITLE);
  ok(item?.status === 'compliance_review' && item.medicalReviewer === mrName && !!item.reviewDate, `MR: server moved it to compliance and recorded the reviewer (${item?.medicalReviewer})`);
  ok((await mr.getByText(`Medically reviewed by ${mrName}`).count()) > 0, 'MR: reviewer + date rendered from the server');

  const ad = S.admin.page;
  await go(ad, contentUrl);
  await ad.click('button:has-text("Approve for publishing")');
  await ad.waitForTimeout(900);
  item = S.admin.server.state.content.find((c) => c.title === TITLE);
  ok(item?.status === 'approved', `Admin: compliance approved on the server (${item?.status})`);

  await go(cm, contentUrl);
  await cm.click('button:has-text("Publish now")');
  await cm.waitForTimeout(900);
  item = S.content_manager.server.state.content.find((c) => c.title === TITLE);
  ok(item?.status === 'published' && !!item.publishedDate, `CM: published on the server (${item?.status})`);
  const actions = item?.history.map((h) => `${h.action} (${h.actor})`) ?? [];
  ok(
    [`Created draft (${cmName})`, `Submitted for medical review (${cmName})`, `Medical review approved (${mrName})`, `Compliance approved (${adName})`, `Published (${cmName})`].every((x) => actions.includes(x)),
    `history written by the server: ${actions.join(' → ')}`,
  );
  ok((await cm.getByText('Published', { exact: true }).count()) > 0, 'CM: editor shows Published');
});
let aisha = null;
await step('published article visible to an app user', async () => {
  // App users are on the mobile app: sign in as its client does and read the state it syncs.
  const login = await fetch(`${API}/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' }, body: JSON.stringify({ email: APP_USER, password: PASSWORD }) }).then((r) => r.json());
  ok(!!login.accessToken && !!login.refreshToken, `app user ${APP_USER} signs in as the mobile app`);
  const st = await fetch(`${API}/v1/me/state`, { headers: { authorization: `Bearer ${login.accessToken}`, 'x-client': 'mobile' } }).then((r) => r.json());
  ok(st.state?.articles?.some((a) => a.title === TITLE), `app user ${APP_USER} gets the article in the app's Learn library`);
  const pub = await fetch(`${API}/v1/content`).then((r) => r.json());
  ok(pub.items?.some((a) => a.title === TITLE), 'public published-content endpoint lists it');
  aisha = { tokenBox: { token: login.accessToken, refresh: login.refreshToken } };
});

// ---------------------------------------------------------------------------------------------
// 4. Separation of duties: the author can't compliance-approve their own item, whatever the UI does.
await step('self-approval blocked', async () => {
  const ad = S.admin.page;
  const T2 = `Self-approval check ${stamp}`;
  await go(ad, '/admin/content/new');
  await ad.fill('#c-title', T2);
  await ad.fill('#c-desc', 'Written by an Admin who also holds compliance approval.');
  await ad.fill('textarea[aria-label="Body (Markdown)"]', 'Hydration supports wellbeing. If you have concerns, consider speaking with a qualified healthcare professional.');
  await ad.click('button:has-text("Submit for medical review")');
  await ad.waitForURL(/\/admin\/content\/c_/, { timeout: 8000 });
  const url = new URL(ad.url()).pathname;
  const mr = S.reviewer.page;
  await go(mr, url);
  for (const cb of await mr.$$('main input[type=checkbox]')) await cb.check();
  await mr.fill('input[aria-label="New reference"]', `Reference for self-approval check ${stamp}`);
  await mr.click('button:has-text("Add")');
  await mr.click('button:has-text("Approve medically")');
  await mr.waitForTimeout(900);
  await go(ad, url);
  const before = S.admin.server.actions.length;
  await ad.click('button:has-text("Approve for publishing")');
  ok(await waitToast(ad, /You can’t approve content you wrote/), `Admin (author): server refuses own approval → toast (${await toastText(ad)})`);
  ok(S.admin.server.actions.slice(before).includes(403), 'Admin (author): HTTP 403 from the server');
  await ad.waitForTimeout(600);
  const item = S.admin.server.state.content.find((c) => c.title === T2);
  ok(item?.status === 'compliance_review', `item stays in compliance review (${item?.status})`);
  ok((await status(ad)).toLowerCase().includes('compliance'), 'editor still shows Compliance review');
});

// ---------------------------------------------------------------------------------------------
// 5. Masked emails, audited reveal, then deactivation ends the user's session.
await step('masked emails + audited reveal (former Support Agent, now Admin)', async () => {
  const sa = S.former_support.page;
  await go(sa, '/admin/users');
  const table = await sa.locator('tbody').innerText();
  ok(/\*\*\*@example\.com/.test(table) && !/aisha@example\.com/.test(table), 'users table shows masked emails only');
  await sa.getByPlaceholder('Search name, email or ID…').fill('Aisha');
  await sa.waitForTimeout(300);
  await sa.locator('tbody tr', { hasText: 'Aisha Kapoor' }).first().click();
  const dlg = sa.getByRole('dialog');
  ok((await dlg.innerText()).includes('ai***@example.com'), 'detail starts masked');
  ok((await dlg.getByRole('button', { name: 'Break-glass access' }).count()) === 0, 'Admin without the break-glass permission: no break-glass button');
  const reveal = sa.waitForResponse((r) => r.url().includes('/reveal-email'));
  await dlg.getByRole('button', { name: 'Show' }).click();
  const rr = await reveal;
  await sa.waitForTimeout(300);
  ok(rr.status() === 200 && (await dlg.innerText()).includes('aisha@example.com'), `Show calls the API (${rr.status()}) and displays the full email`);
  await sa.keyboard.press('Escape');
  await go(sa, '/admin/audit');
  await sa.locator('input[type=search]').first().fill('user.email_revealed');
  await sa.waitForTimeout(400);
  const rows = await sa.locator('tbody tr').allInnerTexts();
  ok(rows.some((t) => t.includes('Neha Joshi') && t.includes('usr_aisha')), `audit log has the reveal by Neha Joshi (${rows.length} row(s))`);
});
await step('deactivation ends the user session', async () => {
  if (!aisha) throw new Error('app-user session missing');
  const oldToken = aisha.tokenBox.token;
  ok(!!oldToken, 'captured the app user’s access token');
  const pre = await fetch(`${API}/v1/me/state`, { headers: { authorization: `Bearer ${oldToken}`, 'x-client': 'mobile' } });
  ok(pre.status === 200, `before: app user token works (${pre.status})`);
  const sa = S.owner.page;
  await go(sa, '/admin/users');
  await sa.getByPlaceholder('Search name, email or ID…').fill('Aisha');
  await sa.waitForTimeout(300);
  await sa.locator('tbody tr', { hasText: 'Aisha Kapoor' }).first().click();
  await sa.getByRole('dialog').getByRole('button', { name: 'Deactivate', exact: true }).click();
  await sa.locator('[role=dialog]').last().getByRole('button', { name: 'Deactivate', exact: true }).click();
  ok(await waitToast(sa, /User deactivated/), 'Admin: deactivated (toast after the server accepted)');
  const u = S.owner.server.state.users.find((x) => x.id === 'usr_aisha');
  ok(u?.status === 'deactivated', `server row status ${u?.status}`);
  const post = await fetch(`${API}/v1/me/state`, { headers: { authorization: `Bearer ${oldToken}`, 'x-client': 'mobile' } });
  ok(post.status === 401, `after: the same access token is rejected (${post.status})`);
  const refresh = await fetch(`${API}/v1/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' }, body: JSON.stringify({ refreshToken: aisha.tokenBox.refresh }) }).then((r) => r.status);
  ok(refresh === 401, `after: the app's refresh token no longer works (${refresh})`);
  const again = await fetch(`${API}/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' }, body: JSON.stringify({ email: APP_USER, password: PASSWORD }) }).then((r) => r.status);
  ok(again === 403, `after: signing in again is refused while deactivated (${again})`);
});

// ---------------------------------------------------------------------------------------------
// 6. Invite → accept invite (password + authenticator secret shown once) → MFA sign-in.
const b32 = (s) => {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of s.replace(/=+$/, '').toUpperCase()) bits += A.indexOf(ch).toString(2).padStart(5, '0');
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
};
const totp = (secret, t = Date.now()) => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(t / 30_000)));
  const mac = createHmac('sha1', b32(secret)).update(buf).digest();
  const off = mac[mac.length - 1] & 0xf;
  const code = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(code % 1_000_000).padStart(6, '0');
};
await step('invite → accept → MFA sign-in', async () => {
  const email = `invitee.${stamp}@healthx.example`;
  const sa = S.owner.page;
  await go(sa, '/admin/staff');
  await sa.getByRole('button', { name: 'Invite staff', exact: true }).click();
  await sa.fill('#inv-name', 'Test Invitee');
  await sa.fill('#inv-email', email);
  await sa.selectOption('#inv-role', 'content_manager');
  await sa.getByRole('button', { name: 'Send invitation' }).click();
  ok(await waitToast(sa, /Invitation sent/), 'Admin with Manage staff: invitation accepted by the server');
  const out = await fetch(`${API}/v1/dev/outbox?to=${encodeURIComponent(email)}`).then((r) => r.json());
  const link = out.messages?.[0]?.link;
  ok(!!link && link.includes('/admin/accept-invite?token='), 'invite email (dev outbox) links to /admin/accept-invite');
  const u = new URL(link);
  const ctx = await newContext(browser, { width: 1280 });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await page.goto(BASE + u.pathname + u.search, { waitUntil: 'networkidle' });
  await page.fill('#inv-pw', 'short');
  await page.getByRole('button', { name: 'Accept invite' }).click();
  ok((await page.getByText('Use at least 8 characters.').count()) > 0, 'accept invite: short password rejected');
  const pw = `Invitee-${stamp}-Pass!`;
  await page.fill('#inv-pw', pw);
  await page.fill('#inv-pw2', pw);
  await page.getByRole('button', { name: 'Accept invite' }).click();
  const secretEl = page.getByLabel('Authenticator secret');
  await secretEl.waitFor({ timeout: 8000 });
  const secret = (await secretEl.innerText()).trim();
  ok(/^[A-Z2-7]{16,}$/.test(secret), 'accept invite: authenticator secret shown once');
  const href = await page.getByRole('link', { name: 'Open in authenticator app' }).getAttribute('href');
  ok(href?.startsWith('otpauth://totp/') && href.includes(secret), 'accept invite: otpauth link carries the secret');
  await page.getByRole('link', { name: 'Continue to sign in' }).click();
  await page.waitForURL('**/admin/login');
  await page.fill('#adm-email', email);
  await page.fill('#adm-pw', pw);
  await page.click('button[type=submit]');
  await page.waitForSelector('#adm-code');
  await page.fill('#adm-code', totp(secret));
  const st = trackServerState(page);
  await page.click('button[type=submit]');
  await page.waitForURL((x) => !x.pathname.startsWith('/admin/login'), { timeout: 8000 });
  await page.waitForTimeout(500);
  ok((await page.locator('main h1').first().innerText()) === 'Content workspace', 'new staff member signs in with password + their own TOTP → Content workspace');
  ok(st.state?.session?.email === email && st.state.session.role === 'content_manager', 'server session is the invitee as Content Manager');
  allErrors.push(...errors);
  await ctx.close();
});

// ---------------------------------------------------------------------------------------------
// 7. Deactivating a staff member ends their session at once; reactivation restores access.
await step('staff deactivation ends that staff session', async () => {
  const email = STAFF.former_support[1];
  const tom = await newStaffPage(browser, email);
  const name = tom.server.state.session.name;
  const token = tom.server.token;
  ok(!!token && tom.server.state.session.email === email, `${name} signed in`);
  const sa = S.owner.page;
  await go(sa, '/admin/staff');
  await sa.getByRole('button', { name: 'Actions for Sam Rivera' }).click();
  ok((await sa.getByRole('menuitem', { name: 'Deactivate…' }).count()) === 0, 'Admin: no Deactivate on their own row');
  await sa.keyboard.press('Escape');
  await sa.getByRole('button', { name: `Actions for ${name}` }).click();
  await sa.getByRole('menuitem', { name: 'Deactivate…' }).click();
  await sa.locator('[role=dialog]').last().getByRole('button', { name: 'Deactivate', exact: true }).click();
  ok(await waitToast(sa, /Staff member deactivated/), 'Admin: deactivation accepted by the server');
  ok((await staffRow(sa, name).innerText()).includes('Deactivated'), 'staff table shows Deactivated');
  const after = await fetch(`${API}/v1/admin/state`, { headers: { authorization: `Bearer ${token}`, 'x-client': 'web-admin' } });
  ok(after.status === 401, `${name}'s access token is rejected right away (${after.status})`);
  await tom.page.reload({ waitUntil: 'networkidle' });
  await tom.page.waitForTimeout(600);
  ok(new URL(tom.page.url()).pathname === '/admin/login', `${name}'s open admin tab is back at sign-in`);
  // Close any menu/toast left over from the deactivation before using the row menu again.
  await sa.keyboard.press('Escape');
  await sa.waitForTimeout(400);
  try {
    await sa.getByRole('button', { name: `Actions for ${name}` }).click({ timeout: 10_000 });
    await sa.getByRole('menuitem', { name: 'Reactivate…' }).click({ timeout: 10_000 });
  } catch (e) {
    if (process.env.HX_SHOTS) await sa.screenshot({ path: `${process.env.HX_SHOTS}/reactivate-failure.png` });
    console.log(`REACTIVATE CLICK DETAIL:\n${e.message}`);
    throw e;
  }
  await sa.locator('[role=dialog]').last().getByRole('button', { name: 'Reactivate', exact: true }).click();
  ok(await waitToast(sa, /Staff member reactivated/), 'Admin: reactivated');
  ok((await staffRow(sa, name).innerText()).includes('Active'), 'staff table shows Active again');
  allErrors.push(...tom.errors);
  await tom.ctx.close();
});

// ---------------------------------------------------------------------------------------------
// 8. Privileged permissions are granted per Admin from the Staff page, and apply on the next request.
await step('privileged permissions per Admin', async () => {
  const sa = S.owner.page;
  await go(sa, '/admin/staff');
  const row = await staffRow(sa, 'Ritu Sharma').innerText();
  ok(row.includes('None'), 'Ritu (Admin) starts without privileged permissions');
  await sa.getByRole('button', { name: 'Actions for Ritu Sharma' }).click();
  await sa.getByRole('menuitem', { name: 'Privileged permissions…' }).click();
  const dlg = sa.getByRole('dialog');
  await dlg.getByText('Health records access').click();
  await dlg.getByRole('button', { name: 'Save' }).click();
  ok(await waitToast(sa, /Privileged permissions updated/), 'owner: grant saved by the server');
  ok((await staffRow(sa, 'Ritu Sharma').innerText()).includes('Break-glass'), 'staff table shows Ritu with Break-glass');
  const ritu = await newStaffPage(browser, STAFF.admin[1]);
  ok(ritu.server.state.session.privileges.includes('break_glass'), 'Ritu’s next session carries break_glass');
  await sa.getByRole('button', { name: 'Actions for Ritu Sharma' }).click();
  await sa.getByRole('menuitem', { name: 'Privileged permissions…' }).click();
  await sa.getByRole('dialog').getByText('Health records access').click();
  await sa.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  ok(await waitToast(sa, /Privileged permissions updated/), 'owner: revoke saved by the server');
  const H = { authorization: `Bearer ${ritu.server.token}`, 'content-type': 'application/json', 'x-client': 'web-admin' };
  const bg = await fetch(`${API}/v1/admin/users/usr_aisha/break-glass`, { method: 'POST', headers: H, body: JSON.stringify({ reason: 'Checking that the revoked permission no longer works' }) });
  ok(bg.status === 403, `Ritu’s existing session lost break-glass on the next request (${bg.status})`);
  allErrors.push(...ritu.errors);
  await ritu.ctx.close();
});

for (const s of Object.values(S)) {
  allErrors.push(...s.errors);
  await s.ctx.close();
}
await browser.close();
process.exit(done(allErrors));

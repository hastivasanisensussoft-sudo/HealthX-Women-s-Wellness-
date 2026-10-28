// Module checks on the mobile app's web export (API mode), in a DISPOSABLE account deleted at the end:
// cycle settings ("Not sure" saves nothing), pregnancy mode (week from the last period, due-date estimate,
// appointments as dated reminders, cycle estimates paused), notification settings (one-date reminders,
// quiet hours), the Premium lock and the coach's safety replies. Each check reads back what the server stored.
// node mobile-modules.mjs <base>   (HEALTHX_API = the disposable API the export talks to)
import { chromium } from 'playwright-core';
import { registerDisposable, serverView, signInUI } from './mobile-api.mjs';

const base = process.argv[2] ?? 'http://127.0.0.1:8096';
const shots = process.argv[3]; // optional folder for screenshots of failed steps
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 200)));
const apiFailures = [];
page.on('response', (r) => r.url().includes('/v1/') && r.status() >= 400 && apiFailures.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname));

let pass = 0;
const fails = [];
const step = async (name, fn) => {
  try {
    await fn();
    pass++;
    console.log('PASS', name);
  } catch (e) {
    fails.push(name);
    console.log('FAIL', name, '-', e.message.split('\n').slice(0, 3).join(' | '));
    if (shots) await page.screenshot({ path: `${shots}/modules-fail-${fails.length}.png`, fullPage: true }).catch(() => undefined);
  }
};
const ok = (c, msg) => {
  if (!c) throw new Error(msg);
};
const go = async (p) => {
  await page.goto(base + p, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
};
const text = (t, opts = {}) => page.getByText(t, opts).first();
const until = async (fn, ms = 6000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return null;
    await new Promise((r) => setTimeout(r, 250));
  }
};
// Same wording as the app's formatDate(…, 'long') (en-US).
const longDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(y, m - 1, d, 12));
};
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000);

const temp = await registerDisposable('mobile.modules');
const tv = await serverView(temp.email, temp.password);
await tv.reset(); // synthetic sample history, so the account lands on Home with logged periods
const state = () => tv.state();

try {
  await step('disposable account signs in through the UI', async () => {
    await signInUI(page, base, temp.email, temp.password);
  });

  // ----- cycle settings
  await step('cycle settings: "Not sure" saves no cycle length (never an assumed 28 days)', async () => {
    await go('/cycle-settings');
    await text('Cycle settings').waitFor({ timeout: 8000 });
    const before = (await state()).cycleProfile;
    if (before.typicalCycleLength === null) await page.getByRole('button', { name: 'Not sure' }).first().click(); // turn a value on first
    await page.getByRole('button', { name: 'Not sure' }).first().click();
    await page.getByRole('button', { name: 'Save cycle settings' }).click();
    const cp = await until(async () => {
      const c = (await state()).cycleProfile;
      return c.typicalCycleLength === null ? c : null;
    });
    ok(cp, 'server still has a typical cycle length');
    ok(cp.typicalPeriodLength === before.typicalPeriodLength, 'period length changed unexpectedly');
  });

  // ----- period logging + calendar (§11, §47)
  let logged;
  await step('period logging: past dates, flow and symptom severity are saved', async () => {
    const st = await state();
    // A 3-day range in a gap of the sample history (2 clear days either side).
    const busy = (day) => st.periods.some((p) => day >= addDays(p.start, -2) && day <= addDays(p.end ?? st.today, 2));
    let start = null;
    for (let back = 60; back >= 8 && !start; back--) {
      const s0 = addDays(st.today, -back);
      if (![0, 1, 2].some((i) => busy(addDays(s0, i)))) start = s0;
    }
    ok(start, 'no gap in the sample history for a test period');
    const end = addDays(start, 2);
    await go('/log-period');
    await page.getByText('Past dates', { exact: true }).click();
    await page.getByLabel(/^Started:/).click();
    const months = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
    for (let i = 0; i < months(st.today) - months(start); i++) await page.getByLabel('Previous month').last().click();
    await page.getByLabel(new RegExp('^' + longDate(start))).last().click();
    if (months(end) !== months(start)) await page.getByLabel('Next month').last().click();
    await page.getByLabel(new RegExp('^' + longDate(end))).last().click();
    await page.getByRole('radio', { name: 'Heavy flow', exact: true }).last().click();
    await page.getByText('Cramps', { exact: true }).first().click();
    await page.getByText('Moderate', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const p = await until(async () => (await state()).periods.find((x) => x.start === start));
    ok(p && p.end === end && p.flowByDay[start] === 'heavy', 'server period: ' + JSON.stringify(p));
    const s2 = await state();
    ok(s2.symptomLogs.some((l) => l.date === start && l.symptomId === 'cramps' && l.severity === 'moderate'), 'cramps (moderate) not logged on the start day');
    logged = { start, end };
  });

  await step('calendar: the logged days show as period and open the day detail', async () => {
    ok(logged, 'no period from the previous step');
    const st = await state();
    await go('/calendar');
    const months = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
    for (let i = 0; i < months(st.today) - months(logged.start); i++) await page.getByLabel('Previous month').first().click();
    const day = page.getByLabel(new RegExp('^' + longDate(addDays(logged.start, 1)) + ', period')).first();
    await day.waitFor({ timeout: 5000 });
    await day.click();
    await page.waitForURL(new RegExp('/day/' + addDays(logged.start, 1)), { timeout: 6000 });
  });

  // ----- pregnancy mode
  let sheetMonth; // the date sheet opens on the month of the saved date when the screen opened
  const weekText = (n) => page.getByText(new RegExp('^Week ' + n + '\\b')).first();
  await step('pregnancy: switching saves the newest period start; week and due date count from it (estimates)', async () => {
    const st = await state();
    sheetMonth = (st.cycleProfile.lastPeriodStart ?? st.today).slice(0, 7);
    const lmp = [...st.periods.map((p) => p.start), st.cycleProfile.lastPeriodStart].filter((d) => d && d <= st.today).sort().pop();
    ok(lmp, 'sample data has no period');
    const total = daysBetween(lmp, st.today);
    await go('/life-stage/pregnancy');
    await page.getByRole('button', { name: 'Use Pregnancy wellness mode' }).click();
    // P3-00: the switch is confirmed first, with the pregnancy disclaimer.
    await text('Turn on Pregnancy wellness mode?').waitFor({ timeout: 4000 });
    await page.getByRole('button', { name: 'Turn on Pregnancy wellness mode' }).click();
    const saved = await until(async () => {
      const s = await state();
      return s.profile.mode === 'pregnancy' && s.cycleProfile.lastPeriodStart === lmp ? s : null;
    });
    ok(saved, 'server: mode or counted-from date not saved');
    await weekText(Math.floor(total / 7)).waitFor({ timeout: 5000 });
    await text(`+ ${total % 7} day`).waitFor({ timeout: 3000 });
    await text(`Estimated due date around ${longDate(addDays(lmp, 280))}*`).waitFor({ timeout: 3000 });
    await text('Cycle predictions and period reminders are paused while pregnancy mode is on.').waitFor({ timeout: 3000 });
  });

  await step('pregnancy: correcting the date is saved and wins over later period logs', async () => {
    const st = await state();
    const newLmp = addDays(st.today, -(10 * 7 + 3)); // 10 weeks + 3 days ago
    await page.getByRole('button', { name: /Change last period date/ }).click();
    await text('First day of your last period').waitFor({ timeout: 4000 });
    const months = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
    const move = months(newLmp) - months(sheetMonth);
    for (let i = 0; i < Math.abs(move); i++) await page.getByLabel(move < 0 ? 'Previous month' : 'Next month').last().click();
    await page.getByLabel(new RegExp('^' + longDate(newLmp))).last().click();
    ok(await until(async () => ((await state()).cycleProfile.lastPeriodStart === newLmp ? true : null)), 'server lastPeriodStart not updated');
    await weekText(10).waitFor({ timeout: 4000 });
    await text('+ 3 days').waitFor({ timeout: 3000 });
    await text(`Estimated due date around ${longDate(addDays(newLmp, 280))}*`).waitFor({ timeout: 3000 });
  });

  await step('pregnancy: an appointment is saved as a dated reminder and listed', async () => {
    const st = await state();
    const date = addDays(st.today, 5);
    await page.getByRole('button', { name: 'Add appointment' }).click();
    await text('Add an appointment').waitFor({ timeout: 4000 });
    await page.getByLabel('Appointment', { exact: true }).fill('Scan appointment');
    await page.getByRole('button', { name: 'Choose a date' }).click();
    if (date.slice(0, 7) !== st.today.slice(0, 7)) await page.getByLabel('Next month').last().click();
    await page.getByLabel(new RegExp('^' + longDate(date))).last().click();
    await page.getByRole('button', { name: 'Done' }).last().click();
    await page.getByText('Appointment date', { exact: true }).waitFor({ state: 'hidden', timeout: 4000 }); // date sheet closed
    const time = page.getByLabel('Time (24-hour, e.g. 09:30)');
    await time.fill('14:15');
    ok((await time.inputValue()) === '14:15', 'time not entered');
    await page.getByRole('button', { name: 'Save appointment' }).click();
    const r = await until(async () => (await state()).reminders.find((x) => x.title === 'Scan appointment'));
    ok(r && r.type === 'appointment' && r.date === date && r.time === '14:15' && r.enabled, 'server reminder: ' + JSON.stringify(r));
    await text('Scan appointment').waitFor({ timeout: 3000 });
  });

  await step('pregnancy: an appointment without today or a future date is refused', async () => {
    await page.getByRole('button', { name: 'Add appointment' }).click();
    await page.getByRole('button', { name: 'Save appointment' }).click();
    await text('Choose today or a future date.').waitFor({ timeout: 3000 });
    await page.keyboard.press('Escape');
  });

  await step('pregnancy: Cycle tab and Home pause cycle estimates; Home shows the week', async () => {
    await go('/cycle');
    await text('Pregnancy mode is on').waitFor({ timeout: 6000 });
    await text('Paused').waitFor({ timeout: 3000 });
    await go('/home');
    await text('Pregnancy wellness mode').waitFor({ timeout: 6000 });
    ok((await page.getByText(/Next period in/).count()) === 0, 'Home still shows a period estimate');
  });

  // ----- notifications
  await step('notification settings: a one-date reminder and quiet hours are saved', async () => {
    await go('/notification-settings');
    await text('Reminders arrive in the phone app').waitFor({ timeout: 6000 }); // web preview can't deliver
    const st = await state();
    const date = addDays(st.today, 2);
    await page.getByRole('button', { name: 'Add reminder' }).last().click();
    await page.getByLabel('Reminder', { exact: true }).fill('Refill water bottle');
    await page.getByRole('button', { name: 'On one date' }).click();
    await page.getByRole('button', { name: 'Choose a date' }).click();
    if (date.slice(0, 7) !== st.today.slice(0, 7)) await page.getByLabel('Next month').last().click();
    await page.getByLabel(new RegExp('^' + longDate(date))).last().click();
    await page.getByRole('button', { name: 'Done' }).last().click();
    await page.getByRole('button', { name: 'Add reminder' }).last().click();
    const r = await until(async () => (await state()).reminders.find((x) => x.title === 'Refill water bottle'));
    ok(r && r.date === date, 'server reminder: ' + JSON.stringify(r));

    await page.getByRole('button', { name: 'Change quiet hours' }).click();
    await page.getByLabel('Increase From').click();
    await page.getByRole('button', { name: 'Save quiet hours' }).click();
    const q = await until(async () => {
      const p = (await state()).notificationPrefs.quietHours;
      return p.enabled && p.from !== st.notificationPrefs.quietHours.from ? p : null;
    });
    ok(q, 'quiet hours not updated on the server');
    ok((await state()).notificationPrefs.types.appointment, 'appointment type missing from saved settings');
  });

  await step('pregnancy: switching back to cycle tracking resumes estimates', async () => {
    await go('/life-stage/pregnancy');
    await page.getByRole('button', { name: 'Switch back to cycle tracking' }).click();
    await page.getByRole('button', { name: 'Switch to cycle tracking' }).click();
    ok(await until(async () => (await state()).profile.mode === 'cycle'), 'server mode not cycle');
    await go('/cycle');
    ok((await page.getByText('Pregnancy mode is on').count()) === 0, 'pause banner still shown');
  });

  // ----- Premium lock (UI shaping only — the plan is the server's)
  await step('premium: Free accounts see the coach and cycle-history extras locked', async () => {
    ok((await state()).profile.plan === 'free', 'account is not on Free');
    await go('/coach');
    await page.getByText('AI wellness coach', { exact: true }).first().waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: 'Start 7-day free trial' }).first().waitFor({ timeout: 3000 });
    ok((await page.getByLabel('Message the coach').count()) === 0, 'coach input shown on Free');
    await go('/cycle-history');
    await page.getByText('Advanced cycle history', { exact: true }).first().waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: 'Start 7-day free trial' }).first().waitFor({ timeout: 3000 });
  });

  await step('premium: the server-granted trial unlocks the coach; safety replies hold', async () => {
    await go('/premium');
    await page.getByRole('button', { name: 'Start 7-day free trial' }).click();
    ok(await until(async () => (await state()).profile.plan === 'premium'), 'trial not granted by the server');
    await go('/coach');
    const ask = async (q) => {
      await page.getByLabel('Message the coach').fill(q);
      await page.getByLabel('Send', { exact: true }).click();
      await page.waitForTimeout(1600);
    };
    await ask('I have chest pain');
    await text(/can't assess emergencies/).waitFor({ timeout: 5000 });
    await ask('Do I have PCOS?');
    await text(/can't diagnose conditions/).waitFor({ timeout: 5000 });
    await ask('Which are my safe days?');
    await text(/not a reliable form of contraception/).waitFor({ timeout: 5000 });
  });
} finally {
  await tv.remove().catch((e) => console.log('WARN could not delete the disposable account:', e.message));
  await browser.close();
}

const unexpected = errors.filter((e) => !/Failed to load resource|favicon|net::ERR/.test(e));
if (unexpected.length) {
  fails.push('console errors');
  console.log('Console errors:\n  ' + unexpected.slice(0, 10).join('\n  '));
}
if (apiFailures.filter((f) => !/^409 POST \/v1\/me\/subscription\/trial/.test(f)).length) console.log('API errors seen (check if unexpected):', apiFailures);
console.log(`\n${pass} passed, ${fails.length} failed${fails.length ? ': ' + fails.join('; ') : ''}`);
process.exit(fails.length ? 1 : 0);

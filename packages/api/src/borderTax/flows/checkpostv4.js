'use strict';

/* global document -- page.waitForFunction callbacks run in the browser */

/**
 * checkpostv4 flow — the same NIC portal serves HR, HP, UP, RJ, UK (and more states). Mapped live:
 * HR + HP on 2026-11-03/04, UP/RJ/UK on 2026-11-04.
 * Drives the portal through the Vahan payment page (eTransPgi) and returns the quote plus the
 * bank hand-off: the form that would open the govt bank page, captured instead of followed so the
 * driver's phone opens it and the driver pays the govt there (docs/BORDER-TAX.md §0, §15c).
 * Captchas are OCR'd first (borderTax/ocr); only a miss goes to the driver through `io.captcha`. The
 * declaration checkbox is ticked for the driver, who accepted it in-app (`declare`).
 *
 * Per-state differences: permitType via `job` (HR '0', HP/UP '35'), serviceType from
 * BORDER_TAX_STATES (UP/UK have no '0'), distanceKm (HR only), date-only tax inputs (UP/RJ/UK),
 * district → checkpost codes (RJ/UK).
 */
const { borderTaxWindow, BORDER_TAX_FAILURE, BORDER_TAX_STATES, TAX_MODE } = require('@easecab/shared');
const { portalError, visibleBtn, alertText, dismissAlert, solveCaptcha, VERDICT_MS } = require('./portal');
const { bankHandoff } = require('./bank');

const ENTRY_URL = 'https://parivahan.gov.in/en/node/579';
const SERVICE_TAX = '/public/payment/taxCollectionOnline';
const MAX_DAY_SHIFTS = 3; // "already paid" → try the next full day, a few times
const ALREADY_PAID = /already paid/i;
const PENDING = /pending for verification/i; // an earlier unpaid attempt locks the vehicle
const ROAD_TAX_EXPIRED = /road tax validity is expired/i; // UK, PB01C7365 (2026-11-04)
const OPEN_TRIES = 3;
const VAHAN_CAPTCHA_LEN = 6; // portal: "Captcha must be six characters"
const CALC_MS = 30_000;
const MODES_MS = 15_000;
// UP AITP+AC filed straight after the selects quoted ₹0 ("Road Tax amount is zero", 2026-11-12); the same
// form with a 1s pause (recon) quoted ₹150 — let the portal register the permit/service first
const SELECT_SETTLE_MS = 1000;

/** 'YYYY-MM-DDTHH:mm' in IST for a datetime-local input. */
function istInput(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

async function setDateTime(page, sel, value) {
  await page.fill(sel, value);
  await page.locator(sel).dispatchEvent('change');
}

/** The portal sometimes bounces to the parivahan home page right after loading (its own JS error) — retry. */
async function openForm(page, stateCd) {
  for (let attempt = 1; ; attempt += 1) {
    await page.goto(ENTRY_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.selectOption('select', stateCd);
    const ok = await page.waitForSelector('select[name=serviceName]', { timeout: 20_000 }).then(() => true, () => false);
    if (ok && page.url().includes('checkpostv4')) break;
    if (attempt >= OPEN_TRIES) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, 'kept bouncing to the home page');
  }
  await page.selectOption('select[name=serviceName]', SERVICE_TAX);
  await visibleBtn(page, 'Go').click();
  await page.waitForSelector('#floatingvehicle');
}

async function ownerStep(page, job, io) {
  const getDetails = async () => {
    await visibleBtn(page, 'Get Details').click();
    await page.waitForSelector('#inputVahanCap', { state: 'visible' });
  };
  await page.fill('#floatingvehicle', job.vehicleNo);
  await getDetails();
  await solveCaptcha(page, io, {
    reopen: getDetails,
    step: 'vahan',
    input: '#inputVahanCap',
    length: VAHAN_CAPTCHA_LEN,
    submit: () => page.locator('.modal.show button:visible', { hasText: 'OK' }).first().click(),
    // details filled, or the "pending for verification" lock alert (checked right after)
    done: () => page.waitForFunction((re) => Boolean(document.querySelector('#chassisNo')?.value)
      || [...document.querySelectorAll('.modal.show, .swal2-popup')].some((m) => new RegExp(re, 'i').test(m.innerText)), PENDING.source, { timeout: VERDICT_MS }),
  });
  const alert = await alertText(page);
  if (PENDING.test(alert)) throw portalError(BORDER_TAX_FAILURE.VEHICLE_PENDING, alert);
  await pickCheckpost(page, job);
  await visibleBtn(page, 'Next').click();
}

/**
 * HR/HP/UP list each checkpost as its own "district" with one checkpost; RJ/UK districts hold
 * several route checkposts, so their config maps each to [district, checkpost] option values.
 */
async function pickCheckpost(page, job) {
  const codes = BORDER_TAX_STATES[job.stateCd].portal?.[job.checkpost];
  if (!codes) {
    await page.selectOption('#floatingDistrict', { label: job.checkpost });
    await page.waitForFunction(() => document.querySelector('#floatingCheckpost')?.options.length > 1);
    await page.selectOption('#floatingCheckpost', { index: 1 });
    return;
  }
  const [district, checkpost] = codes;
  await page.selectOption('#floatingDistrict', district);
  // the list loads async after the district — wait for this district's option, not a stale one
  await page.waitForFunction((v) => [...(document.querySelector('#floatingCheckpost')?.options || [])].some((o) => o.value === v), checkpost);
  await page.selectOption('#floatingCheckpost', checkpost);
}

async function vehicleStep(page, job) {
  await page.waitForSelector('#floatingPrmit', { state: 'visible' });
  await page.selectOption('#floatingPrmit', job.permitType);
  await page.waitForFunction(() => document.querySelector('#floatingService')?.options.length > 1);
  await page.selectOption('#floatingService', BORDER_TAX_STATES[job.stateCd].serviceType);
  if (job.distanceKm) await page.fill('#floatingDistance', String(job.distanceKm));
  await page.waitForTimeout(SELECT_SETTLE_MS);
  await visibleBtn(page, 'Next').click();
  // the portal refuses here when the vehicle's home road tax has lapsed
  await page.waitForFunction(() => document.querySelector('#floatingtaxmode')?.offsetParent
    || document.querySelector('.modal.show, .swal2-popup'), null, { timeout: CALC_MS });
  const alert = await alertText(page);
  if (ROAD_TAX_EXPIRED.test(alert)) throw portalError(BORDER_TAX_FAILURE.ROAD_TAX_EXPIRED, alert);
  if (alert) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, alert);
}

/** Sum of each tax row's last ("Amount") cell; the total input is still empty right after Calculate. */
async function readTaxPaise(page) {
  const rows = await page.$$eval('table', (ts) => ts.filter((t) => t.offsetParent).map((t) => t.innerText.trim()));
  const amount = rows.join('\n').split('\n').slice(1).reduce((s, r) => s + (Number(r.trim().split('\t').pop()) || 0), 0);
  if (!amount) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, 'no tax amount in the table');
  return Math.round(amount * 100);
}

/**
 * Tax window as the portal takes it. HR/HP: datetime, 24h blocks. UP: date only — whole IST
 * calendar days, so the window becomes 00:00 of the start day → 23:59 of the last day.
 */
function portalWindow(start, days, dateOnly) {
  if (!dateOnly) return borderTaxWindow(start, days);
  return borderTaxWindow(new Date(`${istInput(start).slice(0, 10)}T00:00:00+05:30`), days);
}

/** Portal 'YYYY-MM-DD' (= through 23:59) or 'YYYY-MM-DDTHH:mm' in IST → Date. */
const fromPortal = (v) => new Date(`${v.length === 10 ? `${v}T23:59` : v}:00+05:30`);

/**
 * Fills the tax window. DAYS: from + upto (24h blocks). Any other mode is a calendar period: only
 * the start is ours — the portal fills (and locks) upto on change, read back for the driver.
 */
async function setWindow(page, job, start, dateOnly) {
  const fmt = (d) => (dateOnly ? istInput(d).slice(0, 10) : istInput(d));
  if ((job.taxMode || TAX_MODE.DAYS) === TAX_MODE.DAYS) {
    const { from, upto } = portalWindow(start, job.days, dateOnly);
    await setDateTime(page, '#floatingTaxfrom', fmt(from));
    await setDateTime(page, '#uptpDate', fmt(upto));
    return { from, upto };
  }
  const from = portalWindow(start, 1, dateOnly).from;
  await page.fill('#uptpDate', '').catch(() => {}); // a day-shift retry: wait for the new end, not the old one
  await setDateTime(page, '#floatingTaxfrom', fmt(from));
  const ok = await page.waitForFunction(() => document.querySelector('#uptpDate')?.value, null, { timeout: MODES_MS }).then(() => true, () => false);
  if (!ok) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, `portal set no end date for tax mode ${job.taxMode}`);
  return { from, upto: fromPortal(await page.inputValue('#uptpDate')) };
}

/** Calculates tax; on "already paid" shifts the window one full day forward. */
async function taxStep(page, job, io) {
  const mode = job.taxMode || TAX_MODE.DAYS;
  // some vehicles get no tax mode at all (RJ, PB01G9377) — fail clearly instead of hanging
  const hasModes = await page.waitForFunction((m) => [...(document.querySelector('#floatingtaxmode')?.options || [])]
    .some((o) => o.value === m), mode, { timeout: MODES_MS }).then(() => true, () => false);
  if (!hasModes) throw portalError(BORDER_TAX_FAILURE.NO_TAX_MODE, `tax modes offered: [${await page.$$eval('#floatingtaxmode option', // portal chrome only
    (os) => os.map((o) => `${o.value}=${o.textContent.trim()}`).join(',')).catch(() => 'no select')}]`);
  await page.selectOption('#floatingtaxmode', mode);
  const dateOnly = (await page.getAttribute('#floatingTaxfrom', 'type')) === 'date';
  let start = new Date(job.startAt);
  for (let shift = 0; shift <= MAX_DAY_SHIFTS; shift += 1) {
    const { from, upto } = await setWindow(page, job, start, dateOnly);
    await visibleBtn(page, 'Calculate').click();
    // HP can take well over 4s: wait for a tax row or a portal alert
    await page.waitForFunction(() => [...document.querySelectorAll('table tr')].filter((r) => r.offsetParent).length > 1
      || document.querySelector('.modal.show, .swal2-popup'), null, { timeout: CALC_MS }).catch(() => {});
    const alert = await alertText(page);
    if (!ALREADY_PAID.test(alert)) {
      if (alert) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, alert);
      return { from, upto, taxPaise: await readTaxPaise(page) };
    }
    io.log(`already paid for ${istInput(from)} — moving to the next day`);
    await dismissAlert(page);
    start = new Date(start.getTime() + 86_400_000);
  }
  throw portalError(BORDER_TAX_FAILURE.ALREADY_PAID);
}

async function disclaimerStep(page, io) {
  await visibleBtn(page, 'Next').click();
  await page.waitForSelector('#inputcap', { state: 'visible' });
  await solveCaptcha(page, io, {
    step: 'declaration',
    input: '#inputcap', length: VAHAN_CAPTCHA_LEN, // six too (every read 2026-11-12); a short read refreshes, not submits
    submit: async () => { // a captcha retry is already ticked: no summary modal — don't sit out 5s for it
      const ticked = await page.isChecked('#exampleCheck1');
      await page.check('#exampleCheck1'); // driver accepted the declaration in-app
      // ticking it opens a summary modal (all states) that covers Pay Online — close it
      const close = page.locator('.modal.show button:visible', { hasText: 'Close' }).first();
      if (!ticked && (await close.waitFor({ timeout: 5000 }).then(() => true, () => false))) await close.click();
      await visibleBtn(page, 'Pay Online').click();
      // SweetAlert "Are you sure? You want to pay online?" → Yes; a wrong captcha shows its modal instead: wait for either
      const yes = page.locator('.swal2-popup', { hasText: /sure|pay online/i }).locator('button.swal2-confirm:visible');
      await yes.or(page.locator('.modal.show')).first().waitFor({ timeout: 5000 }).catch(() => {});
      if (await yes.isVisible()) await yes.click();
    },
    done: () => page.waitForURL(/eTransPgi/, { timeout: VERDICT_MS }),
  });
}


/**
 * Runs the checkpostv4 flow to the bank hand-off.
 * @param {import('playwright').Page} page
 * @param {{ stateCd: string, permitType: string, vehicleNo: string, checkpost: string, startAt: Date|string, days: number, distanceKm?: number, taxMode?: string }} job
 * @param {{ captcha: (a: { step: string, image: string }) => Promise<string>, log: (m: string) => void }} io
 * @returns {Promise<{ from: Date, upto: Date, taxPaise: number, handoff?: { method: string, action: string, fields: string[][] }, payPage?: import("playwright").Page }>}
 */
async function fileCheckpost(page, job, io) {
  await openForm(page, job.stateCd);
  await ownerStep(page, job, io);
  await vehicleStep(page, job);
  const quote = await taxStep(page, job, io);
  io.log(`quote ₹${quote.taxPaise / 100} ${istInput(quote.from)} → ${istInput(quote.upto)}`);
  // no stop for a driver OK here (dropped 2026-11-06, user: one loading phase) — the app warns before
  // filing that the portal locks the vehicle ~30 min once the bank page opens
  await disclaimerStep(page, io);
  const handoff = await bankHandoff(page, job.stateCd, io);
  if (handoff.live) return { ...quote, payPage: handoff.live, ref: handoff.ref, pay: handoff.pay }; // runner shows the QR
  io.log(`bank hand-off ready (${new URL(handoff.action).hostname})`); // host only — fields are the driver's payment
  return { ...quote, handoff };
}

module.exports = { fileCheckpost, istInput, portalWindow, fromPortal };

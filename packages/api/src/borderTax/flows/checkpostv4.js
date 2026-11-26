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
const { portalError, visibleBtn, alertText, solveCaptcha, VERDICT_MS } = require('./portal');
const { bankHandoff } = require('./bank');
const { TREASURY, treasuryUp, pickSession } = require('./treasury');
const { checkpostUp } = require('./bundleCache');

const CHECKPOST = 'https://services.parivahan.gov.in/checkpostv4/';
const ENTRY_URL = `${CHECKPOST}#/admin/taxHome?statecd=`;
const ENTRY_SALT = '7c606d287b6d6b7'; // checkpostv4 main.js parivahandecryptEncData prefix
const SERVICE_TAX = '/public/payment/taxCollectionOnline';
const ALREADY_PAID = /already paid/i;
const PENDING = /pending for verification/i; // an earlier unpaid attempt locks the vehicle
const ROAD_TAX_EXPIRED = /road tax validity is expired/i; // UK, PB01C7365 (2026-11-04)
const SAME_STATE = /same state vehicle/i; // HR, after Get Details (2026-11-14)
const NO_DATA = /no data found for this vehicle/i; // HR a7f5c3a3 2026-11-16: number not on Vahan, Get Details then disabled
const OPEN_TRIES = 3;
// Vahan's insurance check glitches: PB01E7801 refused twice 2026-11-23 22:34/22:37, loaded clean an hour later
// (HP 8464fed6 passed 2 min later). Nothing is locked at this step, so the worker retries it itself.
const INSURANCE_RETRIES = 2;
const INSURANCE_GAP_MS = 20_000;
const VAHAN_CAPTCHA_LEN = 6; // portal: "Captcha must be six characters"
const CALC_MS = 30_000;
const MODES_MS = 15_000;
// UP AITP+AC filed straight after the selects quoted ₹0 ("Road Tax amount is zero", 2026-11-12); the same
// form with a 1s pause (recon) quoted ₹150 — let the portal register the permit/service first
const SELECT_SETTLE_MS = 1000;
const CATEGORY_SEL = '#floatingVecCat';

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

/**
 * checkpostv4's own state hand-off (admin/taxHome reads `statecd` = base64(hex(salt + state)), from its
 * bundle) — straight there, not via parivahan.gov.in/en/node/579, which reset every connection
 * 16:56–17:53 IST 2026-11-17 while checkpostv4 stayed up (3 HR filings lost).
 */
function entryUrl(stateCd) {
  const code = Buffer.from(Buffer.from(`${ENTRY_SALT}${stateCd}`).toString('hex')).toString('base64');
  return `${ENTRY_URL}${encodeURIComponent(code)}`;
}

/** Opens the tax form for the state; retries a page that loads without its service list. */
async function openForm(page, stateCd) {
  for (let attempt = 1; ; attempt += 1) {
    await page.goto(entryUrl(stateCd), { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
    const ok = await page.waitForFunction((v) => [...(document.querySelector('select[name=serviceName]')?.options || [])]
      .some((o) => o.value === v), SERVICE_TAX, { timeout: 20_000 }).then(() => true, () => false);
    if (ok) break;
    if (attempt >= OPEN_TRIES) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, `checkpost form never loaded (${page.url().slice(0, 80)})`);
  }
  await page.selectOption('select[name=serviceName]', SERVICE_TAX);
  await visibleBtn(page, 'Go').click();
  await page.waitForSelector('#floatingvehicle');
}

/** Vahan lookup answers no captcha retry can fix (the retry would hit a disabled Get Details). */
function vahanRefusal(alert) {
  if (SAME_STATE.test(alert)) throw portalError(BORDER_TAX_FAILURE.SAME_STATE, alert);
  if (NO_DATA.test(alert)) throw portalError(BORDER_TAX_FAILURE.VEHICLE_NOT_FOUND, alert);
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
    refuse: vahanRefusal,
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

/** Form + Vahan lookup; a fresh form after an insurance refusal (the open one may keep Get Details disabled). */
async function vahanLookup(page, job, io, steps = { openForm, ownerStep }) {
  for (let left = INSURANCE_RETRIES; ; left -= 1) {
    await steps.openForm(page, job.stateCd);
    try {
      return await steps.ownerStep(page, job, io);
    } catch (err) {
      if (err.failureCode !== BORDER_TAX_FAILURE.INSURANCE_UNVERIFIED || left === 0) throw err;
      io.log(`Vahan insurance check refused, retry in ${INSURANCE_GAP_MS / 1000}s (${left} left)`);
      await page.waitForTimeout(INSURANCE_GAP_MS);
      await page.goto('about:blank'); // the form is a hash route: leave it so openForm loads it fresh
    }
  }
}

/**
 * HR/HP/UP list each checkpost as its own "district" with one checkpost; RJ/UK districts hold
 * several route checkposts, so their config maps each to [district, checkpost] option values.
 */
async function pickCheckpost(page, job) {
  const codes = BORDER_TAX_STATES[job.stateCd].portal?.[job.checkpost];
  if (!codes) {
    // checkpost is optional in the form (null) — then take the portal's first district
    await page.selectOption('#floatingDistrict', job.checkpost ? { label: job.checkpost } : { index: 1 });
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

/**
 * Vehicle Category is prefilled from Vahan (UP: LPV) but left blank for some vehicles: HP PB01G2474,
 * MAXI CAB, offered only MPV → "Please select Vehicle Category!" (2026-11-15). Blank → the first option
 * the portal offers for this vehicle class.
 */
async function fillCategory(page) {
  const cat = page.locator(CATEGORY_SEL);
  if (!(await cat.isVisible().catch(() => false)) || (await cat.inputValue())) return;
  const ok = await page.waitForFunction((sel) => document.querySelector(sel)?.options.length > 1, CATEGORY_SEL, { timeout: MODES_MS })
    .then(() => true, () => false);
  if (ok) await page.selectOption(CATEGORY_SEL, { index: 1 });
}

async function vehicleStep(page, job) {
  await page.waitForSelector('#floatingPrmit', { state: 'visible' });
  await fillCategory(page);
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
    await setDateTime(page, '#floatingTaxfrom', fmt(from));
  const ok = await page.waitForFunction(() => document.querySelector('#uptpDate')?.value, null, { timeout: MODES_MS }).then(() => true, () => false);
  if (!ok) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, `portal set no end date for tax mode ${job.taxMode}`);
  return { from, upto: fromPortal(await page.inputValue('#uptpDate')) };
}

/** Calculates tax. "Already paid" stops the filing — the driver picks new dates (no silent shift). */
async function taxStep(page, job) {
  const mode = job.taxMode || TAX_MODE.DAYS;
  // some vehicles get no tax mode at all (RJ, PB01G9377) — fail clearly instead of hanging
  const hasModes = await page.waitForFunction((m) => [...(document.querySelector('#floatingtaxmode')?.options || [])]
    .some((o) => o.value === m), mode, { timeout: MODES_MS }).then(() => true, () => false);
  if (!hasModes) throw portalError(BORDER_TAX_FAILURE.NO_TAX_MODE, `tax modes offered: [${await page.$$eval('#floatingtaxmode option', // portal chrome only
    (os) => os.map((o) => `${o.value}=${o.textContent.trim()}`).join(',')).catch(() => 'no select')}]`);
  await page.selectOption('#floatingtaxmode', mode);
  const dateOnly = (await page.getAttribute('#floatingTaxfrom', 'type')) === 'date';
  const { from, upto } = await setWindow(page, job, new Date(job.startAt), dateOnly);
  await visibleBtn(page, 'Calculate').click();
  // HP can take well over 4s: wait for a tax row or a portal alert
  await page.waitForFunction(() => [...document.querySelectorAll('table tr')].filter((r) => r.offsetParent).length > 1
    || document.querySelector('.modal.show, .swal2-popup'), null, { timeout: CALC_MS }).catch(() => {});
  const alert = await alertText(page);
  if (ALREADY_PAID.test(alert)) throw portalError(BORDER_TAX_FAILURE.ALREADY_PAID, alert);
  if (alert) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, alert);
  return { from, upto, taxPaise: await readTaxPaise(page) };
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
  // treasury/bank down → stop before Pay Online, which would leave a bank-side PENDING lock (HP, 2026-11-14)
  const host = TREASURY[job.stateCd]?.ping;
  if (host && !(await treasuryUp(host))) {
    throw portalError(BORDER_TAX_FAILURE.BANK_DOWN, `${host} unreachable`);
  }
  if (!(await checkpostUp())) throw portalError(BORDER_TAX_FAILURE.PORTAL_DOWN, 'checkpost app bundle not cached and not downloading in time');
  // HR: find a proxy session that reaches eGRAS now, while Vahan runs, not after the declaration (~10 s saved,
  // 2026-11-23). Awaited in bankHandoff, before Submit → a dead proxy still fails with no lock (bank_down).
  const cfg = TREASURY[job.stateCd];
  const probed = cfg?.probe && page.context().respawn ? pickSession(page.context(), cfg, page.context().respawn, io) : null;
  probed?.catch(() => {}); // its error surfaces when bankHandoff awaits it
  // io.progress(n) = steps done, the app's checklist ticks on these (real progress, not a timer)
  await vahanLookup(page, job, io);
  io.progress?.(1); // vehicle found on Vahan
  await vehicleStep(page, job);
  io.progress?.(2); // vehicle details + checkpost accepted
  const quote = await taxStep(page, job);
  io.progress?.(3); // tax quoted; now the bank / payment page
  io.log(`quote ₹${quote.taxPaise / 100} ${istInput(quote.from)} → ${istInput(quote.upto)}`);
  // driver OKs the real amount before Pay Online, which locks the vehicle ~30 min (user, 2026-11-21: 1 in 3
  // filings timed out unpaid at the QR, each leaving a lock; replaces the 2026-11-06 "no stop here")
  await io.confirmFare?.(quote);
  await disclaimerStep(page, io);
  // past Pay Online = a pending row on Vahan: any failure here must clear it (HR ed9c8959 had no clear, no push)
  const handoff = await bankHandoff(page, job.stateCd, io, probed).catch((e) => { throw Object.assign(e, { atBank: true }); });
  if (handoff.live) return { ...quote, payPage: handoff.live, ref: handoff.ref, pay: handoff.pay }; // runner shows the QR
  // No bank-page hand-off any more (2026-11-13): the driver paying outside the app left a pending
  // portal transaction (amount mismatch / vehicle locked). No QR → fail; the runner clears the lock.
  throw portalError(BORDER_TAX_FAILURE.NO_QR, `no in-app QR page (bank ${new URL(handoff.action).hostname})`);
}

module.exports = { fileCheckpost, vahanLookup, istInput, portalWindow, fromPortal, vahanRefusal, entryUrl };

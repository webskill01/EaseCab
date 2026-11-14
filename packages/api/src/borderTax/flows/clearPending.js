'use strict';

const { readCaptcha } = require('../ocr');
const { captchaImage, alertText } = require('./portal');
const { receiptPdf, RECEIPT_RE } = require('./payuQr');

/**
 * Clears a vehicle's pending-transaction lock (an unpaid attempt blocks refiling in that state):
 * checkpost "Check Pending Transaction" → each row of this state → its Check Status icon, ONCE.
 * Mapped live 2026-11-04/11: before 30 min the portal answers "Please try after N Minutes"; after,
 * an unpaid row answers "Your transaction is fail" and the vehicle is free; a paid row opens its
 * e-receipt (#/public/reports/CustomerReceipt). Never tap a row twice: a second status check on a
 * paid row seemed to void its receipt.
 */
const HOME = 'https://services.parivahan.gov.in/checkpostv4/#/';
const CAPTCHA_TRIES = 4;
const LIST_WAIT_MS = 6000;
const VERDICT_MS = 15_000;
const LOCK_MIN = 31; // portal frees an unpaid row 30 min after the attempt; +1 for clock skew
const WAIT_RE = /try after\s*(\d+)\s*Minutes?(?:\s*(\d+)\s*Seconds?)?/i;
const FAIL_RE = /transaction is fail|initiate transaction again/i;
// treasury never answered Vahan (himkosh down, 2026-11-14): no verdict yet → retry later, not FAILED
const BANK_PENDING_RE = /pending at the bank side|\(PENDING\)/i;
const MISMATCH_RE = /captcha|mismatch|does not match|invalid/i;
const MONTHS = Object.freeze({ jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 });

/** "12-Nov-2026 12:25 AM" (IST) → Date, or null. */
function parseIst(text) {
  const m = String(text).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!m) return null;
  const h = (Number(m[4]) % 12) + (m[6].toUpperCase() === 'PM' ? 12 : 0);
  return new Date(Date.UTC(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]), h, Number(m[5])) - 330 * 60_000);
}

/** Search form → rows ([] = nothing pending). Never reads the owner-name cell. */
async function listRows(context, vehicleNo) {
  for (let i = 0; i < CAPTCHA_TRIES; i++) {
    const p = await context.newPage();
    p.on('dialog', (d) => d.accept().catch(() => {}));
    await p.goto(HOME, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
    const link = p.getByText(/check pending transaction/i).first();
    if (!(await link.isVisible().catch(() => false))) await p.getByText(/border tax payment/i).first().click().catch(() => {});
    await link.click({ timeout: 15_000 });
    await p.locator('#inputVehicleNo').waitFor({ timeout: 20_000 });
    await p.fill('#inputVehicleNo', vehicleNo);
    await p.fill('#inputcaptcha', await readCaptcha(await captchaImage(p, '#inputcaptcha')));
    await p.getByRole('button', { name: 'Go', exact: true }).first().click();
    await p.waitForTimeout(LIST_WAIT_MS);
    const rows = await p.locator('table tbody tr').evaluateAll((trs) => trs.map((r) => ({
      paymentId: r.cells[0]?.innerText.trim(), date: r.cells[2]?.innerText.trim(), amount: r.cells[5]?.innerText.trim(),
    })));
    if (rows.length) return { page: p, rows };
    const alert = await alertText(p);
    await p.close();
    if (!MISMATCH_RE.test(alert)) return { page: null, rows: [], alert }; // e.g. "no record found"
  }
  throw new Error('check pending: captcha not accepted');
}

/** Verdict page text → { result, waitSec? }, or null while it is still loading. */
function verdictOf(text) {
  const wait = text.match(WAIT_RE);
  if (wait) return { result: 'wait', waitSec: Number(wait[1]) * 60 + Number(wait[2] || 0) };
  if (FAIL_RE.test(text)) return { result: 'cleared' }; // "Your transaction is fail. Please initiate transaction again."
  if (BANK_PENDING_RE.test(text)) return { result: 'bank_pending' };
  return null;
}

/** Taps one row's Check Status and reads what the portal answered. */
async function checkRow(page, paymentId, log) {
  const row = page.locator('table tbody tr', { hasText: paymentId }).first();
  await row.locator('td').last().locator('i, button, a').first().click();
  // the tap navigates (#/bank/DoubleVerification/Process → verdict page, or the receipt): reads may hit a
  // half-loaded page, so each poll just reads the whole body and tries again
  const body = () => page.locator('body').innerText({ timeout: 2000 }).catch(() => '');
  for (let t = 0; t < VERDICT_MS; t += 500) {
    await page.waitForTimeout(500);
    const text = await body();
    if (/CustomerReceipt/i.test(page.url()) && RECEIPT_RE.test(text)) {
      return { result: 'paid', receiptNo: text.match(RECEIPT_RE)[1], pdf: await receiptPdf(page, log) };
    }
    const verdict = verdictOf(text);
    if (verdict) return verdict;
  }
  return { result: 'unknown', note: `${page.url().split('#')[1]?.split('?')[0] || page.url()} ${(await body()).replace(/\s+/g, ' ').slice(-150)}` };
}

/**
 * @param {import('playwright').BrowserContext} context
 * @param {{ stateCd: string, vehicleNo: string }} job
 * @param {(m: string) => void} log
 * @param {Date} [now]
 * @returns {Promise<{ rows: object[], retryAt: ?Date }>} one outcome per same-state row tapped; retryAt = when
 *   a too-young row (or a "try after") can be tapped
 */
async function clearPending(context, { stateCd, vehicleNo }, log, now = new Date()) {
  const out = [];
  let retryAt = null;
  const later = (d) => { if (!retryAt || d < retryAt) retryAt = d; };
  const done = new Set();
  for (;;) { // a tap navigates away: re-list for each row
    const { page, rows } = await listRows(context, vehicleNo);
    const mine = rows.filter((r) => r.paymentId?.startsWith(`${stateCd}P`) && !done.has(r.paymentId));
    const due = mine.find((r) => {
      const at = parseIst(r.date);
      const free = at && new Date(at.getTime() + LOCK_MIN * 60_000);
      if (free && free > now) { later(free); return false; }
      return true;
    });
    if (!due) { await page?.close(); return { rows: out, retryAt }; }
    done.add(due.paymentId);
    const verdict = await checkRow(page, due.paymentId, log);
    log(`pending ${due.paymentId}: ${verdict.result}${verdict.note ? ` (${verdict.note})` : ''}`);
    if (verdict.result === 'wait') later(new Date(Date.now() + (verdict.waitSec + 60) * 1000));
    out.push({ paymentId: due.paymentId, amount: due.amount, ...verdict });
    await page.close();
  }
}

module.exports = { clearPending, listRows, parseIst, verdictOf };

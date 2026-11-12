'use strict';

const { BORDER_TAX } = require('@easecab/shared');
const { readCaptcha } = require('../ocr');
const { captchaImage } = require('./portal');
const { receiptPdf, RECEIPT_RE } = require('./payuQr');

/**
 * Paid, but the receipt page never showed in the filing session: look it up on the checkpost
 * "Print Payment Receipt" page (read-only — mapped live 2026-11-11). NEVER Check Status: a second
 * status check seemed to void an issued receipt (2026-11-11).
 */
const HOME = 'https://services.parivahan.gov.in/checkpostv4/#/';
const CAPTCHA_TRIES = 4;
const LIST_WAIT_MS = 6000;
const MAX_ROWS = 5; // GRN match opens rows one by one, newest first; a vehicle has few same-day payments
const STATE_NAME = Object.freeze({ HR: /haryana/i, HP: /himachal/i, UP: /uttar pradesh/i }); // HP/UP: same page, list not seen yet

/** Search form → result rows, OCR captcha retried. @returns {Promise<?import('playwright').Page>} */
async function listPage(context, stateCd, vehicleNo) {
  for (let i = 0; i < CAPTCHA_TRIES; i++) {
    const p = await context.newPage();
    await p.goto(HOME, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
    await p.locator('h2', { hasText: 'Print Payment Receipt' }).first()
      .locator('xpath=ancestor::*[.//a or .//button][1]').locator('a, button').first().click();
    await p.locator('#inputVehicleNo').waitFor({ timeout: 20_000 });
    const opt = p.locator('select#inputState option', { hasText: STATE_NAME[stateCd] }).first();
    await opt.waitFor({ state: 'attached', timeout: 20_000 });
    await p.selectOption('select#inputState', await opt.getAttribute('value'));
    await p.fill('#inputVehicleNo', vehicleNo);
    await p.fill('#inputcaptcha', await readCaptcha(await captchaImage(p, '#inputcaptcha')));
    await p.getByRole('button', { name: /get details/i }).first().click();
    await p.waitForTimeout(LIST_WAIT_MS);
    if (await p.locator('table tbody tr').count()) return p;
    await p.close();
  }
  return null;
}

/** Opens one row's print view. @returns {Promise<?import('playwright').Page>} the receipt page once its QR drew */
async function openRow(row, list) {
  const pop = list.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
  await row.locator('td').last().locator('i, button, a').first().click();
  const page = (await pop) || list;
  const ok = await page.locator('qrcode canvas').first().waitFor({ timeout: 20_000 }).then(() => true, () => false);
  return ok ? page : null;
}

/** The receipt matching receiptNo, or (receiptNo unknown) whose Bank Ref. No. carries the eGRAS GRN. */
async function findReceipt(list, { receiptNo, grn }) {
  const rows = receiptNo ? list.locator('table tbody tr', { hasText: receiptNo }) : list.locator('table tbody tr');
  const n = Math.min(await rows.count(), receiptNo ? 1 : MAX_ROWS);
  for (let i = 0; i < n; i++) {
    const page = await openRow(rows.nth(i), list);
    const text = page ? await page.locator('body').innerText() : '';
    const no = text.match(RECEIPT_RE)?.[1];
    if (no && (receiptNo ? no === receiptNo : text.includes(grn))) return { page, receiptNo: no };
    if (page && page !== list) await page.close();
  }
  return null;
}

/**
 * Up to RECEIPT_LOOKUP_TRIES lookups, RECEIPT_LOOKUP_GAP_SEC apart (the list may lag the payment).
 * @param {import('playwright').BrowserContext} context - the filing's own context
 * @param {{ stateCd: string, vehicleNo: string, receiptNo: ?string, grn: ?string }} want
 * @returns {Promise<{ receiptNo: string, pdf: ?Buffer } | null>}
 */
async function lookupReceipt(context, { stateCd, vehicleNo, receiptNo, grn }, log, sleep) {
  if (!STATE_NAME[stateCd] || !(receiptNo || grn)) return null;
  for (let t = 1; t <= BORDER_TAX.RECEIPT_LOOKUP_TRIES; t++) {
    try {
      const list = await listPage(context, stateCd, vehicleNo);
      const found = list && (await findReceipt(list, { receiptNo, grn }));
      if (found) return { receiptNo: found.receiptNo, pdf: await receiptPdf(found.page, log) };
      log(`receipt lookup ${t}: ${list ? 'no matching row' : 'no list'}`);
    } catch (e) {
      log(`receipt lookup ${t} failed: ${e.message.split('\n')[0]}`);
    }
    if (t < BORDER_TAX.RECEIPT_LOOKUP_TRIES) await sleep(BORDER_TAX.RECEIPT_LOOKUP_GAP_SEC * 1000);
  }
  return null;
}

module.exports = { lookupReceipt };

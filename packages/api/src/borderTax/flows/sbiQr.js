'use strict';

/* global document -- page.evaluate callbacks run in the browser */
const { BORDER_TAX, BORDER_TAX_FAILURE: F } = require('@easecab/shared');
const { portalError } = require('./portal');
const { tagQr, decodeQr, describe, receiptOn, receiptPdf } = require('./payuQr');

/**
 * UP in-app UPI QR on SBIePay Lite (mapped live 2026-11-12): options page → UPI (paySubmitUPI) →
 * merchantotherupidisplay (CONFIRM) → merchantinterotherconfirm: the QR + "expire after MM:SS".
 * SBI's 5-min timer starts on the UPI page, so the QR shows with ~3 min left — the app timer uses SBI's.
 * The result path (SBI → parivahan → receipt) was not seen paid yet: the first real payment maps it.
 */
const QR_WAIT_MS = 25_000;
const STEP_MS = 30_000; // was networkidle: SBI's 5-min QR timer is already running, every second counts (2026-11-23)
const QR_POLL_MS = 400;
const UPI_LINK = 'a[onclick*="paySubmitUPI"]';
const FAILED = /fail|declin|reject|expir|cancel/i;
const SBI_HOST = /(^|\.)(sbi\.bank\.in|onlinesbi\.sbi)$/; // UP: merchant.sbi.bank.in, PB: merchant.onlinesbi.sbi

/** "This Transaction request will expire after 02:51 minutes" → seconds, or null. */
async function secondsLeft(page) {
  return page.evaluate(() => {
    const m = document.body.innerText.match(/expire after\s*(\d+):(\d+)/i);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }).catch(() => null);
}

/** @returns {Promise<{ qr: string, upi: ?string, secLeft: ?number }>} @throws NO_QR */
async function openSbiQr(page, io) {
  await page.locator(UPI_LINK).first().waitFor({ state: 'attached', timeout: STEP_MS }).catch(() => {});
  if (!(await page.locator(UPI_LINK).count())) throw portalError(F.NO_QR, `no UPI on SBIePay — [${await describe(page)}]`);
  const from = page.url();
  await page.evaluate("paySubmitUPI('UPI')"); // the arrow is covered by a stretched-link twin: call SBI's own handler
  // on the next page before looking for CONFIRM (the click below then auto-waits for the button)
  await page.waitForURL((u) => u.href !== from, { waitUntil: 'domcontentloaded', timeout: STEP_MS }).catch(() => {});
  await page.getByRole('button', { name: /confirm/i }).or(page.locator('input[value*="CONFIRM" i]')).first().click();
  let tag = { qr: false };
  for (let t = 0; t < QR_WAIT_MS && !tag.qr; t += QR_POLL_MS) {
    await page.waitForTimeout(QR_POLL_MS);
    tag = await tagQr(page);
  }
  if (!tag.qr) throw portalError(F.NO_QR, `no QR on SBIePay — [${await describe(page)}]`);
  const shot = await page.locator('[data-ec=qr]').screenshot();
  const upi = decodeQr(shot);
  const secLeft = await secondsLeft(page);
  io.log(`SBI QR ready (upi ${upi ? 'decoded' : 'missing'}, ${secLeft ?? '?'}s left)`); // never the link: payment data
  return { qr: `data:image/png;base64,${shot.toString('base64')}`, upi, secLeft };
}

/** SBI's own status line under "Transaction Status" while the QR page is up ('' once it left SBI). */
async function sbiStatus(page) {
  if (!SBI_HOST.test(new URL(page.url()).hostname)) return '';
  return page.evaluate(() => document.body.innerText.match(/Transaction Status\s*\n?\s*([^\n]+)/i)?.[1] || '').catch(() => '');
}

/**
 * Polls until a receipt shows (paid), SBI reports a failure, or time runs out.
 * @returns {Promise<{ receiptNo: ?string, pdf: ?Buffer }>}
 * @throws PAYMENT_FAILED, PAYMENT_TIMEOUT, PAYMENT_UNKNOWN (left SBI but no receipt: maybe paid → support)
 */
async function awaitSbiPaid(page, io, secLeft) {
  const qrEnd = Date.now() + (secLeft ?? BORDER_TAX.PAY_WAIT_SEC) * 1000;
  const until = qrEnd + BORDER_TAX.PAY_GRACE_SEC * 1000;
  let left = 0; // when the bank page went away (SBI → parivahan)
  while (Date.now() < until && !(left && Date.now() - left > BORDER_TAX.RECEIPT_WAIT_SEC * 1000)) {
    const found = await receiptOn(page.context());
    if (found) {
      io.log(`receipt ${found.receiptNo}`);
      return { receiptNo: found.receiptNo, pdf: await receiptPdf(found.page, io.log) };
    }
    const status = await sbiStatus(page);
    if (FAILED.test(status)) throw portalError(F.PAYMENT_FAILED, `SBI status ${status.slice(0, 60)}`);
    if (!left && !SBI_HOST.test(new URL(page.url()).hostname)) {
      left = Date.now();
      const u = new URL(page.url());
      io.log(`left SBI → ${u.hostname}${u.pathname}`); // maps the result path on the first real payment
    }
    await new Promise((r) => setTimeout(r, 2000)); // not page.waitForTimeout: the page may be closed by now
  }
  // SBI sends an expired QR back to parivahan too ("Your transaction status is Pending", UP 6da02f9a
  // 2026-11-15, unpaid) → left after the QR's end = timeout. Unlock still turns a late payment into PAID.
  throw portalError(left && left < qrEnd ? F.PAYMENT_UNKNOWN : F.PAYMENT_TIMEOUT);
}

module.exports = { openSbiQr, awaitSbiPaid };

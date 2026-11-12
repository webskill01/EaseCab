'use strict';

/* global document, location, getComputedStyle -- page.evaluate callbacks run in the browser */
const { chromium } = require('playwright');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const { BORDER_TAX, BORDER_TAX_FAILURE: F } = require('@easecab/shared');
const { portalError } = require('./portal');

/**
 * HR in-app UPI QR (2026-11-11). The worker's own browser stays on PayU, so the payment, the eGRAS
 * response and the checkpost receipt all happen in the session that filed — a driver paying in his own
 * browser got "Payment id or transaction amount is mismatch" and no receipt (live, 2026-11-11).
 * PayU's checkout DOM was only seen from outside: the first live runs will need tuning here.
 */
const QR_WAIT_MS = 25_000;
const UPI_RE = /upi:\/\/pay\?[^"'\s\\<>]+/;
const RECEIPT_RE = /Receipt\s*No\.?\s*:?\s*([A-Z]{2}[A-Z0-9]{6,})/i; // HRR2611110358690; other states same portal
const BAKE_STYLE = ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'z-index', 'opacity', 'transform', 'display', 'margin'];
const BASE = '<base href="https://services.parivahan.gov.in/checkpostv4/">';

/** First upi://pay intent in a PayU response body (JSON escapes undone). */
function findUpi(text) {
  const m = String(text).replace(/\\\//g, '/').replace(/\\u0026/gi, '&').match(UPI_RE);
  return m ? m[0].replace(/&amp;/g, '&') : null;
}

/**
 * The upi://pay link the QR itself encodes (payee + amount + PayU's txn ref) — what a scan pays, so the
 * app's UPI button opens the same payment. PayU's responses only carried `pa` (live 2026-11-11).
 * @param {Buffer} png @returns {?string}
 */
function decodeQr(png) {
  try {
    const { data, width, height } = PNG.sync.read(png);
    const text = jsQR(new Uint8ClampedArray(data), width, height)?.data || '';
    return UPI_RE.test(text) ? text : null;
  } catch {
    return null; // not a PNG / no QR found: the app just shows the QR without the button
  }
}

/** Tags the QR on the page: the biggest visible square-ish img/canvas ≥ 120px. */
async function tagQr(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('img, canvas, svg')].map((e) => [e, e.getBoundingClientRect()])
      .filter(([, r]) => r.width >= 120 && Math.abs(r.width - r.height) < r.width * 0.15);
    els.sort((a, b) => b[1].width - a[1].width);
    if (els[0]) els[0][0].setAttribute('data-ec', 'qr');
    const link = document.querySelector('a[href^="upi:"]');
    return { qr: Boolean(els[0]), upi: link ? link.getAttribute('href') : null };
  });
}

/** Button texts only (PayU chrome, not payment data) — to map a changed checkout. */
async function describe(page) {
  return page.$$eval('button, a, [role=button], li', (els) => els.filter((e) => e.offsetParent)
    .map((e) => (e.innerText || '').trim().slice(0, 20)).filter(Boolean).slice(0, 25).join(',')).catch(() => '');
}

/**
 * Opens PayU's UPI QR. @returns {Promise<{ qr: string, upi: ?string }>} qr = PNG data URL
 * @throws NO_QR
 */
async function openQr(page, io) {
  let upi = null;
  const onResponse = (r) => { if (!upi && /payu\.in/.test(r.url())) r.text().then((t) => { upi = upi || findUpi(t); }, () => {}); };
  page.context().on('response', onResponse);
  try {
    await page.waitForURL(/api\.payu\.in/, { timeout: QR_WAIT_MS });
    await page.waitForLoadState('networkidle').catch(() => {});
    const qrTab = page.getByText(/scan.*qr|upi\s*qr|qr\s*code/i).first();
    if (await qrTab.isVisible().catch(() => false)) await qrTab.click();
    else await page.evaluate(() => { location.hash = location.hash.replace(/paymentoptions.*$/, 'upfrontQr'); });
    let tag = { qr: false, upi: null };
    for (let t = 0; t < QR_WAIT_MS && !(tag.qr && upi); t += 1000) {
      await page.waitForTimeout(1000);
      tag = await tagQr(page);
      upi = upi || tag.upi;
    }
    if (!tag.qr) throw portalError(F.NO_QR, `no UPI QR on PayU — [${await describe(page)}]`);
    const shot = await page.locator('[data-ec=qr]').screenshot();
    upi = decodeQr(shot) || upi;
    const qr = `data:image/png;base64,${shot.toString('base64')}`;
    // never the link itself (payment data) — its param names + mode tell whether UPI apps accept it as an intent
    const shape = upi ? [...new URL(upi.replace('upi://', 'https://x/')).searchParams].map(([k, v]) => (k === 'mode' ? `mode=${v}` : k)).join(',') : 'missing';
    io.log(`PayU QR ready (upi link ${shape})`);
    return { qr, upi };
  } finally {
    page.context().off('response', onResponse);
  }
}

/** PayU's result post back to the treasury (`back` host). @returns {Promise<string>} PayU status ('success' when paid) @throws PAYMENT_TIMEOUT */
async function payStatus(context, back) {
  const req = await context.waitForEvent('request', {
    predicate: (r) => r.method() === 'POST' && back.test(r.url()) && new URLSearchParams(r.postData() || '').has('status'),
    timeout: (BORDER_TAX.PAY_WAIT_SEC + BORDER_TAX.PAY_GRACE_SEC) * 1000,
  }).catch(() => null);
  if (!req) throw portalError(F.PAYMENT_TIMEOUT);
  return (new URLSearchParams(req.postData() || '').get('status') || '').toLowerCase();
}

/** A context page showing the checkpost receipt (number + its QR drawn), or null. */
async function receiptOn(context) {
  for (const p of context.pages()) {
    const text = await p.locator('body').innerText().catch(() => '');
    const m = text.match(RECEIPT_RE);
    if (m && (await p.locator('qrcode canvas').count().catch(() => 0))) return { page: p, receiptNo: m[1] };
  }
  return null;
}

/** receiptOn polled up to RECEIPT_WAIT_SEC. */
async function receiptPage(context) {
  for (let t = 0; t < BORDER_TAX.RECEIPT_WAIT_SEC; t += 2) {
    const found = await receiptOn(context);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

/** Receipt page → A4 PDF with its QR + watermark (canvases baked to <img> first). null on failure. */
async function receiptPdf(page, log) {
  let headless;
  try {
    await page.waitForTimeout(2000); // the QR canvas draws after the text
    await page.evaluate((keep) => document.querySelectorAll('canvas').forEach((c) => {
      const img = document.createElement('img');
      const cs = getComputedStyle(c); // the watermark is placed by page CSS, not inline style (2026-11-11 PDF)
      img.src = c.toDataURL('image/png');
      img.style.cssText = keep.map((k) => `${k}:${cs.getPropertyValue(k)}`).join(';');
      c.replaceWith(img);
    }), BAKE_STYLE);
    const html = (await page.content()).replace(/<head>/i, `<head>${BASE}`).replace(/<script[\s\S]*?<\/script>/gi, '');
    headless = await chromium.launch(); // page.pdf needs headless; the worker's browser is headed
    const hp = await headless.newPage();
    await hp.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 });
    await hp.emulateMedia({ media: 'print' });
    return await hp.pdf({ format: 'A4', printBackground: true, scale: 0.9 }); // 1.0 pushed the last line onto page 2
  } catch (e) {
    log(`receipt PDF failed: ${e.message.split('\n')[0]}`);
    return null;
  } finally {
    await headless?.close().catch(() => {});
  }
}

/**
 * Waits for the driver's payment, then the receipt. Paid without a receipt → receiptNo null (support).
 * @returns {Promise<{ receiptNo: ?string, pdf: ?Buffer }>}
 * @throws PAYMENT_TIMEOUT, PAYMENT_FAILED
 */
async function awaitPaid(page, io, back) {
  const status = await payStatus(page.context(), back);
  io.log(`PayU status: ${status || 'none'}`);
  if (status !== 'success') throw portalError(F.PAYMENT_FAILED, `PayU status ${status || 'none'}`);
  const found = await receiptPage(page.context());
  if (!found) return { receiptNo: null, pdf: null };
  io.log(`receipt ${found.receiptNo}`);
  return { receiptNo: found.receiptNo, pdf: await receiptPdf(found.page, io.log) };
}

module.exports = { openQr, awaitPaid, receiptOn, receiptPdf, findUpi, decodeQr, tagQr, describe, RECEIPT_RE };

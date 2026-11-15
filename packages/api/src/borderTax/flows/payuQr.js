'use strict';

/* global document, location, getComputedStyle -- page.evaluate callbacks run in the browser */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const { BORDER_TAX, BORDER_TAX_FAILURE: F } = require('@easecab/shared');
const { portalError } = require('./portal');

/**
 * HR in-app UPI QR (2026-11-11). The worker's own browser stays on PayU, so the payment, the eGRAS
 * response and the checkpost receipt all happen in the session that filed — a driver paying in his own
 * browser got "Payment id or transaction amount is mismatch" and no receipt (live, 2026-11-11).
 * HP gets one of two PayU checkouts (2026-11-16): a QR only counts once it decodes to a upi:// link;
 * the newer one needs a "Generate QR" click first.
 */
const QR_WAIT_MS = 25_000;
const IDLE_MS = 5000; // networkidle cap before looking for the QR
const BLANK_MS = 8000; // nothing on the checkout this long → reload (normal QR shows in ~5s)
const QR_CANDIDATES = 4; // square images tried per poll (logos, icons, the QR)
const MISS_DIR = path.join(os.tmpdir(), 'easecab-payu-misses');
const UPI_RE = /upi:\/\/pay\?[^"'\s\\<>]+/;
const RECEIPT_RE = /Receipt\s*No\.?\s*:?\s*([A-Z]{2}[A-Z0-9]{6,})/i; // HRR2611110358690; other states same portal
const BAKE_STYLE = ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'z-index', 'opacity', 'transform', 'display', 'margin'];
const BASE = '<base href="https://services.parivahan.gov.in/checkpostv4/">';

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
 * Candidate QR elements (visible square-ish img/canvas/svg ≥ 120px, biggest first) → the first whose
 * screenshot decodes to a upi:// link. Only a decoded QR counts: on HP's other PayU checkout the biggest
 * square was not a QR and a sniffed link was PayU's test VPA (test@payu, ₹100 — 2026-11-16).
 * @returns {Promise<?{ shot: Buffer, upi: string }>}
 */
async function findQr(page) {
  const n = await page.evaluate((max) => {
    const els = [...document.querySelectorAll('img, canvas, svg')].map((e) => [e, e.getBoundingClientRect()])
      .filter(([e, r]) => e.offsetParent !== null && r.width >= 120 && Math.abs(r.width - r.height) < r.width * 0.15);
    els.sort((a, b) => b[1].width - a[1].width);
    els.slice(0, max).forEach(([e], i) => e.setAttribute('data-ec-qr', String(i)));
    return Math.min(els.length, max);
  }, QR_CANDIDATES).catch(() => 0);
  for (let i = 0; i < n; i += 1) {
    const shot = await page.locator(`[data-ec-qr="${i}"]`).screenshot({ timeout: 3000 }).catch(() => null);
    const upi = shot && decodeQr(shot);
    if (upi) return { shot, upi };
  }
  return null;
}

/**
 * HP's other PayU checkout ("webcheckoutpro/…/recommended", live 2026-11-16) shows a blurred dummy QR
 * (it decodes to nothing) under a "Generate QR" button; the real QR shows ~1s after the click.
 */
async function generate(page) {
  const btn = page.getByText(/^\s*generate\s*qr\s*$/i).first();
  if (await btn.isVisible().catch(() => false)) await btn.click({ timeout: 3000 }).catch(() => {});
}

/** Full-page screenshot of a QR miss → VPS tmp, to map the checkout that beat us. Path or null. */
async function keepMissShot(page) {
  try {
    fs.mkdirSync(MISS_DIR, { recursive: true });
    const file = path.join(MISS_DIR, `${Date.now()}.png`);
    await page.screenshot({ path: file, fullPage: true, timeout: 5000 });
    return file;
  } catch {
    return null; // ponytail: diagnostics only
  }
}

/**
 * Opens the QR tab and waits up to QR_WAIT_MS for a decodable QR (pressing Generate QR when shown).
 * `bailBlank`: stop after BLANK_MS if the checkout shows nothing at all — a blank PayU page never fills
 * in by itself, a reload does (HR 588ad820 2026-11-15: 32s blank, QR 5s after reload).
 */
async function showQr(page, bailBlank = false) {
  // ponytail: capped — a blank checkout kept the network busy and sat out Playwright's 30s default
  await page.waitForLoadState('networkidle', { timeout: IDLE_MS }).catch(() => {});
  const qrTab = page.getByText(/scan.*qr|upi\s*qr|qr\s*code/i).first();
  if (await qrTab.isVisible().catch(() => false)) await qrTab.click().catch(() => {});
  else await page.evaluate(() => { location.hash = location.hash.replace(/paymentoptions.*$/, 'upfrontQr'); }).catch(() => {});
  let found = null;
  for (let t = 0; t < QR_WAIT_MS && !found; t += 1000) {
    await generate(page);
    await page.waitForTimeout(1000);
    found = await findQr(page);
    if (bailBlank && !found && t + 1000 >= BLANK_MS && !(await describe(page))) break;
  }
  return found;
}

/**
 * Opens PayU's UPI QR. @returns {Promise<{ qr: string, upi: string }>} qr = PNG data URL
 * @throws NO_QR
 */
async function openQr(page, io) {
  await page.waitForURL(/api\.payu\.in/, { timeout: QR_WAIT_MS });
  let found = await showQr(page, true);
  // checkout rendered nothing (HR d549dc6c 2026-11-15: no button on the page) → reload once
  if (!found && !(await describe(page))) {
    io.log(`PayU checkout blank (${new URL(page.url()).pathname}) — reloading`);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    found = await showQr(page);
  }
  if (!found) {
    const file = await keepMissShot(page);
    throw portalError(F.NO_QR, `no UPI QR on PayU ${new URL(page.url()).pathname} — [${await describe(page)}]${file ? ` shot ${file}` : ''}`);
  }
  const { shot, upi } = found;
  // never the link itself (payment data) — its param names + mode tell whether UPI apps accept it as an intent
  const shape = [...new URL(upi.replace('upi://', 'https://x/')).searchParams].map(([k, v]) => (k === 'mode' ? `mode=${v}` : k)).join(',');
  io.log(`PayU QR ready (upi link ${shape})`);
  return { qr: `data:image/png;base64,${shot.toString('base64')}`, upi };
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

module.exports = { openQr, awaitPaid, receiptOn, receiptPdf, decodeQr, findQr, tagQr, describe, RECEIPT_RE };

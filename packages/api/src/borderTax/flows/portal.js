'use strict';

/* global document -- page.evaluate / waitForFunction callbacks run in the browser */
const { BORDER_TAX, BORDER_TAX_FAILURE } = require('@easecab/shared');
const { readCaptcha, keepMiss } = require('../ocr');

// declaration says "Captcha does not match." — missing it here sat out the full VERDICT_MS per rejection (2026-11-12)
const MISMATCH = /mismatch|does not match|invalid captcha|incorrect|wrong captcha/i;
// portal's 15-min lockout (seems per IP, seen 2026-11-04): another try only extends it — stop at once
const LOCKOUT = /maximum number of attempts|try after 15 minutes/i;
const VERDICT_MS = 15_000;
const CAPTCHA_SETTLE_MS = 500; // modal fade-in after the image loads
// vahan modal: .captcha-refresh; declaration: the plain button right after the #captcha.cap box
const CAPTCHA_REFRESH_SEL = '.captcha-refresh, .cap + button';
// vahan captcha = server <img>; declaration captcha = <canvas> drawn client-side inside #captcha.cap
// (2026-11-06: looking for 'img' only grabbed an unrelated image → OCR garbage + blank image in the app)
const CAPTCHA_SEL = 'canvas, img';
const REFRESH_POLLS = 10; // × CAPTCHA_SETTLE_MS waiting for the new image

// Portal refusals about the vehicle's own papers: the driver must fix them, so retrying is pointless.
// Matched on any generic portal error, whichever step raised it.
const PAPERS = Object.freeze([ // live HR runs 2026-11-11
  [/PUCC Validity/i, BORDER_TAX_FAILURE.PUCC_EXPIRED],
  [/Fitness Validity/i, BORDER_TAX_FAILURE.FITNESS_EXPIRED],
]);

/** Error carrying a failure_code for the runner. */
function portalError(failureCode, message) {
  const papers = failureCode === BORDER_TAX_FAILURE.PORTAL_ERROR && PAPERS.find(([re]) => re.test(message || ''));
  return Object.assign(new Error(message || failureCode), { failureCode: papers ? papers[1] : failureCode });
}

const visibleBtn = (page, text) => page.locator('button:visible', { hasText: text }).first();

/** Visible modal / alert text, if any. */
async function alertText(page) {
  const texts = await page.$$eval('.modal.show, .swal2-popup', (a) => a.map((x) => x.innerText.trim()).filter(Boolean));
  return texts.join(' | ');
}

/** Closes a visible alert modal (OK button). */
async function dismissAlert(page) {
  await page.locator('.modal.show button:visible, .swal2-popup button:visible', { hasText: 'OK' }).first().click({ timeout: 3000 })
    .catch(() => {}); // ponytail: nothing to dismiss is fine
}

/** Element nearest to `input` matching `sel` (walks up: same modal / form block), or null. */
async function near(page, input, sel) {
  const handle = await page.evaluateHandle(([from, want]) => {
    for (let el = document.querySelector(from); el; el = el.parentElement) {
      const found = el.querySelector(want);
      if (found) return found;
    }
    return null;
  }, [input, sel]);
  return handle.asElement();
}

/**
 * PNG data URL of the captcha image that sits nearest to `input` (same modal/form block).
 * Element screenshot, so it works for data: and server-rendered images alike.
 */
async function captchaImage(page, input) {
  const el = await near(page, input, CAPTCHA_SEL);
  if (!el) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, `no captcha image near ${input}`);
  // a screenshot taken mid-load shows half a captcha (seen 2026-11-04)
  await el.evaluate((i) => (i.tagName !== 'IMG' || (i.complete && i.naturalWidth) ? null : new Promise((r) => { i.onload = r; i.onerror = r; })));
  await page.waitForTimeout(CAPTCHA_SETTLE_MS);
  // declaration canvas is wider than its box: a screenshot clipped the 1st/last char → misreads + rejections
  // (2026-11-12 "HRmWBq" read "HRmWBc"). Read its own bitmap, flattened on white (transparent → black in OCR).
  const full = await el.evaluate((c) => {
    if (c.tagName !== 'CANVAS' || !c.width) return null;
    const out = Object.assign(document.createElement('canvas'), { width: c.width, height: c.height });
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(c, 0, 0);
    return out.toDataURL('image/png');
  }).catch(() => null);
  return full || `data:image/png;base64,${(await el.screenshot()).toString('base64')}`;
}

/**
 * Clicks the portal's "generate a new CAPTCHA" button next to `input` and returns the new image,
 * or null when there is no button or the image did not change.
 */
async function refreshCaptcha(page, input, oldImage) {
  const btn = await near(page, input, CAPTCHA_REFRESH_SEL);
  if (!btn) return null;
  await btn.click();
  for (let i = 0; i < REFRESH_POLLS; i += 1) {
    const image = await captchaImage(page, input);
    if (image !== oldImage) return image;
  }
  return null;
}

/**
 * OCR reads until one looks valid, max `state.ocrLeft` reads per captcha step. A misread (empty /
 * wrong length) is never submitted — it refreshes the image instead, so it costs no portal try.
 * @returns {Promise<{ image: string, answer: string }>} answer '' → hand to the driver
 */
async function ocrAnswer(page, io, { step, input, length }, state, firstImage) {
  let image = firstImage;
  while (state.ocrLeft > 0) {
    state.ocrLeft -= 1;
    const read = await readCaptcha(image, length);
    const answer = length && read.length !== length ? '' : read;
    // captcha text is not PII — logging the read is what makes OCR misses debuggable
    io.log?.(`captcha ${step}: OCR ${answer ? 'answered' : 'missed'} "${read}"`);
    if (answer) return { image, answer };
    keepMiss(image, read);
    if (state.ocrLeft === 0 || state.refreshes >= BORDER_TAX.CAPTCHA_REFRESHES) break;
    const fresh = await refreshCaptcha(page, input, image);
    if (!fresh) break;
    state.refreshes += 1;
    image = fresh;
  }
  return { image, answer: '' };
}

/**
 * Driver types the captcha; a "new code" tap (CAPTCHA_REFRESH_TOKEN) refreshes it while the
 * portal still allows refreshes, then asks again.
 */
async function askDriver(page, io, { step, input }, state, first) {
  let image = first;
  for (;;) {
    const canRefresh = state.refreshes < BORDER_TAX.CAPTCHA_REFRESHES;
    const answer = await io.captcha({ step, image, canRefresh });
    if (answer !== BORDER_TAX.CAPTCHA_REFRESH_TOKEN) return answer;
    const fresh = canRefresh ? await refreshCaptcha(page, input, image) : null;
    if (fresh) { state.refreshes += 1; image = fresh; }
  }
}

/**
 * Captcha loop: OCR first (drivers got confused typing them) — a miss refreshes the image, a rejection
 * brings a new one; after OCR_TRIES reads the driver types it (io.captcha). Then submit and wait for
 * either `done` or a mismatch alert. The portal swaps the image after a mismatch.
 * @param {import('playwright').Page} page
 * @param {{ captcha: (a: { step: string, image: string }) => Promise<string> }} io
 * @param {{ step: string, input: string, submit: () => Promise<void>, done: () => Promise<unknown>, reopen?: () => Promise<void>, length?: number }} opts
 *   length: known captcha length — an OCR read of any other length is not submitted (saves a try)
 */
async function solveCaptcha(page, io, opts) {
  const { step, input, submit, done, reopen } = opts;
  const state = { ocrLeft: BORDER_TAX.OCR_TRIES, refreshes: 0 };
  for (let attempt = 1; attempt <= BORDER_TAX.CAPTCHA_MAX_TRIES; attempt += 1) {
    // Vahan closes its captcha modal on a rejection: `reopen` brings a fresh one back
    if (attempt > 1 && !(await page.locator(input).isVisible())) {
      if (!reopen) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, 'captcha box closed');
      await reopen();
    }
    const { image, answer: auto } = await ocrAnswer(page, io, opts, state, await captchaImage(page, input));
    const answer = auto || (await askDriver(page, io, opts, state, image));
    // The modal can close by itself (Enter / portal auto-submit) — only fill + submit while it is still up.
    const box = page.locator(input);
    if (await box.isVisible()) await box.fill(answer);
    if (await box.isVisible()) await submit();
    const ok = done().then(() => true, () => false);
    const bad = page.waitForFunction((re) => [...document.querySelectorAll('.modal.show, .swal2-popup')]
      .some((m) => new RegExp(re, 'i').test(m.innerText)), MISMATCH.source, { timeout: VERDICT_MS }).then(() => false, () => null);
    const verdict = await Promise.race([ok, bad]);
    if (verdict === true || (verdict === null && (await ok))) return;
    if (verdict === null) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, (await alertText(page)) || `no verdict after captcha ${step}`);
    const alert = await alertText(page);
    if (LOCKOUT.test(alert)) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, `portal lockout: ${alert.slice(0, 120)}`);
    io.log?.(`captcha ${step} rejected: ${alert.slice(0, 120)}`);
    if (auto) keepMiss(image, `rejected-${auto}`);
    await dismissAlert(page);
  }
  throw portalError(BORDER_TAX_FAILURE.CAPTCHA_WRONG);
}

module.exports = { portalError, visibleBtn, alertText, dismissAlert, captchaImage, solveCaptcha, VERDICT_MS };

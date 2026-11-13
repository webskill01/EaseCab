'use strict';

/* global document, location -- page.evaluate callbacks run in the browser */
const { readCaptcha, keepMiss } = require('../ocr');
const { captchaImage } = require('./portal');

/**
 * State treasury challan pages between Vahan and the bank. HP himkosh asks again for payment type,
 * bank, a captcha and a declaration before PayU — drivers found that confusing (user, 2026-11-07), so
 * the worker fills it and hands over PayU. If anything here fails, the caller hands over the
 * treasury page itself (the pre-2026-11-07 behaviour), so a changed page costs a step, never a filing.
 *
 * Controls are found by meaning (label / option / button text), not ids: ids are what changed on
 * eGRAS (2026-11-06). Each control is tagged with data-ec so Playwright can address it.
 */
// HR eGRAS: one Continue (+ JS confirm, accepted by the caller's dialog handler). HP himkosh: payment
// type, bank, captcha, declaration. UP goes Vahan → SBIePay with no treasury page (sbiQr.js).
const TREASURY = Object.freeze({
  // qr: bank host the worker stays on (in-app UPI QR); back: host PayU posts its result to (status field).
  HR: Object.freeze({ host: 'egrashry.nic.in', qr: /(^|\.)payu\.in$/, back: /egrashry\.nic\.in/i }),
  HP: Object.freeze({ host: 'himkosh.hp.nic.in', mode: /e-?\s?banking/i, bank: /payu/i, qr: /(^|\.)payu\.in$/, back: /himkosh\.hp\.nic\.in/i }),
  // UP: Vahan → SBIePay Lite directly; sbi = its own QR + result flow (sbiQr.js, 2026-11-12)
  UP: Object.freeze({ qr: /(^|\.)sbi\.bank\.in$/, sbi: true }),
});
const TRIES = 3; // fill + submit rounds (a wrong code brings a new captcha); then the filing fails no_qr
const VERDICT_MS = 20_000; // treasury submit → bank page
// HR eGRAS never loaded within 30s on 2 live filings (2026-11-12): the bot's tab stayed on Vahan
const FIND_MS = 60_000;

/** Tags the controls this page needs; returns which were found (names only — never values: PII). */
async function tagControls(page, { mode, bank }) {
  return page.evaluate(([modeSrc, bankSrc]) => {
    const vis = (e) => e.offsetParent !== null;
    const text = (e) => `${e.labels?.[0]?.innerText || ''} ${e.nextSibling?.textContent || ''} ${e.parentElement?.innerText || ''}`;
    const tag = (e, name) => { if (e) e.setAttribute('data-ec', name); return Boolean(e); };
    const inputs = [...document.querySelectorAll('input')].filter(vis);
    const radio = modeSrc && inputs.find((e) => e.type === 'radio' && new RegExp(modeSrc, 'i').test(text(e)));
    const select = bankSrc && [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => new RegExp(bankSrc, 'i').test(o.text)));
    const cap = inputs.find((e) => e.type === 'text' && /code|captcha/i.test(`${e.placeholder} ${e.name} ${e.id}`));
    const boxes = inputs.filter((e) => e.type === 'checkbox');
    boxes.forEach((e, i) => e.setAttribute('data-ec', `box${i}`));
    const go = [...document.querySelectorAll('button, input[type=submit], input[type=button]')].filter(vis)
      .find((e) => /proceed|pay|submit|continue|confirm/i.test(e.value || e.innerText) && !/cancel|reset/i.test(e.value || e.innerText));
    return { radio: tag(radio, 'mode'), bank: tag(select, 'bank'), cap: tag(cap, 'cap'), boxes: boxes.length, go: tag(go, 'go') };
  }, [mode?.source ?? null, bank?.source ?? null]);
}

/** Where + form shape for the log when the pass-through fails: path, title, headings, control types/ids — no values. */
async function describe(page) {
  const at = await page.evaluate(() => `${location.hostname}${location.pathname} "${document.title.slice(0, 40)}" ${[...document.querySelectorAll('h1,h2,h3,h4,.alert')].filter((e) => e.offsetParent).map((e) => e.innerText.trim().slice(0, 60)).filter(Boolean).slice(0, 5).join(' / ')}`).catch(() => '?');
  return `${at} :: ${await controls(page)}`;
}

async function controls(page) {
  return page.$$eval('input, select, button', (els) => els.filter((e) => e.offsetParent && e.type !== 'hidden')
    .map((e) => `${e.tagName.toLowerCase()}${e.type ? `[${e.type}]` : ''}${e.id ? `#${e.id}` : ''}${e.tagName === 'SELECT' ? `{${[...e.options].map((o) => o.text.trim().slice(0, 15)).join('/')}}` : ''}`)
    .slice(0, 25).join(' ')).catch(() => '');
}

/** OCR of the treasury captcha ('' on a miss — the image is kept for tuning). */
async function answerCaptcha(page, io) {
  const image = await captchaImage(page, '[data-ec=cap]');
  const read = await readCaptcha(image);
  io.log?.(`captcha treasury: OCR ${read ? 'answered' : 'missed'} "${read}"`);
  if (!read) keepMiss(image, read);
  return read;
}

/** One fill + submit. @returns {Promise<?object>} the bank hand-off, or null */
async function attempt(page, cfg, captured, io) {
  const found = await tagControls(page, cfg);
  if (!found.go || (cfg.bank && !found.bank)) throw new Error(`controls missing ${JSON.stringify(found)}`);
  if (found.radio) await page.check('[data-ec=mode]');
  if (cfg.bank) {
    const value = await page.$eval('[data-ec=bank]', (s, src) => [...s.options].find((o) => new RegExp(src, 'i').test(o.text)).value, cfg.bank.source);
    await page.selectOption('[data-ec=bank]', value);
    await page.waitForLoadState('domcontentloaded'); // ASP.NET pages may post back on change
    await tagControls(page, cfg); // re-tag after a postback
  }
  // ponytail: ticks every visible checkbox — these pages only have the declaration
  // 2s cap: an untickable box sat out Playwright's 30s default on every HP filing (2026-11-12 timeline)
  for (let i = 0; i < found.boxes; i += 1) await page.check(`[data-ec=box${i}]`, { timeout: 2000 }).catch(() => {});
  let read = found.cap ? await answerCaptcha(page, io) : '';
  // OCR miss → the driver types it in the app (as on Vahan). Giving up here used to hand the driver
  // the treasury page to pay outside the app → pending portal attempt / amount mismatch (2026-11-13).
  if (found.cap && !read) read = await io.captcha({ step: 'treasury', image: await captchaImage(page, '[data-ec=cap]') });
  if (read) await page.fill('[data-ec=cap]', read);
  await page.click('[data-ec=go]');
  return Promise.race([captured, page.waitForTimeout(VERDICT_MS).then(() => null)]);
}

/** The context page that reached the treasury host (same tab or a popup). */
async function treasuryPage(context, host, findMs = FIND_MS) {
  for (let waited = 0; waited < findMs; waited += 500) {
    const p = context.pages().find((x) => { try { return new URL(x.url()).hostname === host; } catch { return false; } });
    if (p) { await p.waitForLoadState('domcontentloaded'); return p; }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/** Submits the captured treasury request ({ method, action, fields }) again as a form in the first tab. */
async function repost(context, req, io) {
  io.log?.('treasury pass-through: page never loaded — posting the challan request again');
  const page = context.pages()[0];
  await page?.evaluate(({ method, action, fields }) => {
    const form = Object.assign(document.createElement('form'), { method, action });
    for (const [name, value] of fields) form.appendChild(Object.assign(document.createElement('input'), { type: 'hidden', name, value }));
    document.body.appendChild(form);
    form.submit();
  }, req).catch((e) => io.log?.(`treasury re-post failed: ${e.message.split('\n')[0]}`));
}

/**
 * Fills the treasury page and waits for the bank. Throws only a driver outcome (captcha timeout / stopped).
 * @param {import('playwright').BrowserContext} context
 * @param {{ host: string, mode: RegExp, bank: RegExp }} cfg
 * @param {Promise<?object>} captured resolves with the bank hand-off once a page leaves the treasury
 * @returns {Promise<?object>} bank page, or null → the filing fails no_qr (never handed to the driver)
 */
async function passTreasury(context, cfg, captured, io, again = null) {
  let page = await treasuryPage(context, cfg.host, cfg.findMs);
  if (!page && again) { // first load died/hung: post the same challan request again from Vahan's tab
    await repost(context, again, io);
    page = await treasuryPage(context, cfg.host, cfg.findMs);
  }
  if (!page) {
    io.log?.(`treasury pass-through: no ${cfg.host} tab — tabs: ${context.pages().map((p) => { try { const u = new URL(p.url()); return `${u.hostname}${u.pathname}`; } catch { return p.url().slice(0, 30); } }).join(' | ')}`);
    return null;
  }
  for (let i = 0; i < TRIES; i += 1) {
    try {
      const bank = await attempt(page, cfg, captured, io);
      if (bank) return bank;
    } catch (e) {
      if (e.failureCode) throw Object.assign(e, { atBank: true }); // captcha timeout / stopped: past eTransPgi → clear the lock
      io.log?.(`treasury pass-through: ${e.message.split('\n')[0]} — form: ${await describe(page)}`);
      return null;
    }
  }
  io.log?.(`treasury pass-through: no bank page after ${TRIES} tries — form: ${await describe(page)}`);
  return null;
}

module.exports = { TREASURY, passTreasury };

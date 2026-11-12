'use strict';

/**
 * eTransPgi → bank page hand-off for the checkpostv4 flow (split out of checkpostv4.js 2026-11-12).
 * The first navigation leaving Vahan is captured, not followed, so the driver's phone opens it —
 * unless it is an in-app UPI QR page (treasury.qr), which the runner keeps live.
 */
const { BORDER_TAX_FAILURE } = require('@easecab/shared');
const { portalError } = require('./portal');
const { TREASURY, passTreasury } = require('./treasury');
const VAHAN_HOST = 'vahan.parivahan.gov.in';
const HANDOFF_MS = 60_000;
const FORM_TYPE = /application\/x-www-form-urlencoded/i;
// eTransPgi gateway: HR lists several (EGRAS-PNBA → PayU mapped live 2026-11-03), HP only CTP;
// UP/UK (SBI Multi Bank) and RJ (IFMS) list one — taken as offered
const GATEWAY = Object.freeze({ HR: 'EGRAS-PNBA', HP: 'CTP' });
// Treasury pages after eTransPgi (HR eGRAS, HP himkosh) are filled by ./treasury → the driver gets PayU.

/** Aborted navigation → { method, action, fields } the app replays as an auto-submit form. */
function toHandoff(req) {
  const url = new URL(req.url());
  if (req.method() !== 'POST') {
    const fields = [...url.searchParams];
    url.search = ''; // a GET form drops the action's query — it travels as fields
    return { method: 'GET', action: url.href, fields };
  }
  // ponytail: only urlencoded bodies seen (SBIePay: encdata + merchant_code); multipart would need its own path
  if (!FORM_TYPE.test(req.headers()['content-type'] || '')) return null;
  return { method: 'POST', action: url.href, fields: [...new URLSearchParams(req.postData() || '')] };
}

/** Where the filing got stuck (host + path only — query strings can carry the vehicle no.). */
async function whereStuck(page) {
  const pages = page.context().pages();
  const at = await Promise.all(pages.map(async (p) => {
    const u = new URL(p.url());
    // button labels only (page chrome, not driver data) — enough to map a changed treasury page
    const buttons = await p.$$eval('button, input[type=submit], input[type=button], a.btn', (els) => els
      .filter((e) => e.offsetParent).map((e) => `${e.id ? `#${e.id}` : e.tagName}:${(e.value || e.innerText || '').trim().slice(0, 20)}`)
      .slice(0, 12).join(',')).catch(() => '');
    return `${u.hostname}${u.pathname} "${(await p.title().catch(() => '')).slice(0, 40)}" [${buttons}]`;
  }));
  return at.join(' | ');
}

/**
 * eTransPgi: gateway + terms + Submit; the first top-level navigation leaving Vahan is captured, not
 * followed — in this tab or any popup it opens. A state treasury page (TREASURY) is followed and filled
 * so the bank page behind it is captured; if that fails, the treasury page is handed over instead.
 */
async function bankHandoff(page, stateCd, io) {
  await page.waitForSelector('#dropOperator');
  const gateway = GATEWAY[stateCd] || (await page.$eval('#dropOperator', (sel) => [...sel.options]
    .find((o) => o.value && !/select/i.test(o.text))?.value));
  if (!gateway) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, 'no payment gateway on eTransPgi');
  const treasury = TREASURY[stateCd];
  let found;
  let reachedTreasury;
  let viaTreasury; // first request to the treasury page = fallback hand-off
  let staying = false; // in-app QR: once on the bank, every later navigation is followed
  const ref = { grn: null }; // eGRAS alert "Please note down GRN/TransactionID…: 161831387" — finds the receipt later
  const captured = new Promise((resolve) => { found = resolve; });
  const atTreasury = new Promise((resolve) => { reachedTreasury = resolve; });
  // context, not page: eGRAS may open the bank in a new window (2026-11-06 live: 60s with no capture)
  await page.context().route('**/*', (route) => {
    if (staying) return route.continue();
    const req = route.request();
    const host = new URL(req.url()).hostname;
    const frame = req.frame();
    const top = frame === frame.page().mainFrame();
    const leaving = req.isNavigationRequest() && top && host !== VAHAN_HOST;
    if (!leaving) return route.continue();
    io?.log?.(`bank nav ${req.method()} ${host}${new URL(req.url()).pathname}`); // path only — queries can carry the vehicle no.
    if (treasury && host === treasury.host) {
      if (viaTreasury === undefined) { viaTreasury = toHandoff(req); reachedTreasury(true); }
      return route.continue();
    }
    if (treasury?.qr?.test(host)) { staying = true; found({ live: frame.page(), ref, pay: treasury }); return route.continue(); }
    found(toHandoff(req));
    return route.abort();
  });
  // Playwright would dismiss (= Cancel) a JS confirm. Portal messages are logged: an error alert here is
  // otherwise invisible. ponytail: portal text, not driver data — trimmed to 120 chars
  const onDialog = (d) => {
    ref.grn = ref.grn || d.message().match(/GRN\D{0,40}?(\d{6,})/i)?.[1] || null;
    io?.log?.(`bank step ${d.type()}: ${d.message().slice(0, 120)}`);
    d.accept().catch(() => {});
  };
  page.context().on('page', (p) => p.on('dialog', onDialog));
  page.on('dialog', onDialog);
  await page.selectOption('#dropOperator', gateway);
  await page.check('#checkme');
  await page.click('#sendSubmit');
  // ponytail: a SweetAlert confirm after Submit was seen once on HP — click it if it shows, no wait otherwise
  page.locator('.swal2-popup button.swal2-confirm:visible').click({ timeout: 10_000 }).catch(() => {});
  const first = await Promise.race([captured, atTreasury, page.waitForTimeout(HANDOFF_MS).then(() => null)]);
  const handoff = first === true ? (await passTreasury(page.context(), treasury, captured, io)) || viaTreasury : first;
  if (!handoff) throw portalError(BORDER_TAX_FAILURE.NO_HANDOFF, `no bank page after Submit (${gateway}) — at ${await whereStuck(page)}`);
  return handoff;
}

module.exports = { bankHandoff, toHandoff };

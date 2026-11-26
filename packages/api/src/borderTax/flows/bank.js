'use strict';
/* global document, window -- page.evaluate callbacks run in the browser */

/**
 * eTransPgi → bank page hand-off for the checkpostv4 flow (split out of checkpostv4.js 2026-11-12).
 * The first navigation leaving Vahan is captured, not followed, so the driver's phone opens it —
 * unless it is an in-app UPI QR page (treasury.qr), which the runner keeps live.
 */
const { BORDER_TAX_FAILURE } = require('@easecab/shared');
const { portalError } = require('./portal');
const { TREASURY, passTreasury, pickSession, repost } = require('./treasury');
const VAHAN_HOST = 'vahan.parivahan.gov.in';
const HANDOFF_MS = 60_000;
const TERMS_MS = 5_000; // gateway pick → terms checkbox enabled (instant normally)
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

/** Why the page's jQuery handler wasn't bound: jQuery loaded? + each script's HTTP status and size. */
function whyUnbound(page) {
  return page.evaluate(() => `jQuery=${typeof window.jQuery} ready=${document.readyState} ${performance.getEntriesByType('resource')
    .filter((e) => e.initiatorType === 'script').map((e) => `${e.name.split('/').pop()}:${e.responseStatus}:${e.decodedBodySize}b`).join(',')}`)
    .catch((e) => `n/a ${e.message}`);
}

/**
 * Gateway pick → terms box ticked → Submit enabled. eTransPgi's own jQuery rule (page source, 26 Nov): a non-CSC
 * gateway enables #checkme, ticking it enables #sendSubmit — client-side only, no payment state, no hidden fields.
 * On ed9c8959 / 7d3f1438 / 45b1e5e2 that handler never bound (no XHR, re-firing did nothing) → apply the same rule.
 */
async function pickGateway(page, gateway, io) {
  await page.selectOption('#dropOperator', gateway);
  if (!(await page.locator('#checkme:enabled').waitFor({ timeout: TERMS_MS }).then(() => true, () => false))) {
    if (gateway === 'CSC') throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, 'CSC gateway needs a CSC ID'); // the one case the rule keeps it off
    io?.log?.(`terms box handler missing (${await whyUnbound(page)}) — applying the page's rule`);
    await page.$eval('#checkme', (c) => { c.disabled = false; });
  }
  await page.check('#checkme');
  await page.$eval('#sendSubmit', (b) => { b.disabled = false; }); // = the page's checkbox handler; no-op when it ran
}

/**
 * eTransPgi: gateway + terms + Submit; the first top-level navigation leaving Vahan is captured, not
 * followed — in this tab or any popup it opens. A state treasury page (TREASURY) is followed and filled
 * so the bank page behind it is captured; if that fails, the treasury page is handed over instead.
 */
async function bankHandoff(page, stateCd, io, probed = null) {
  await page.waitForSelector('#dropOperator');
  const gateway = GATEWAY[stateCd] || (await page.$eval('#dropOperator', (sel) => [...sel.options]
    .find((o) => o.value && !/select/i.test(o.text))?.value));
  if (!gateway) throw portalError(BORDER_TAX_FAILURE.PORTAL_ERROR, 'no payment gateway on eTransPgi');
  const treasury = TREASURY[stateCd];
  let found;
  let reachedTreasury;
  let viaTreasury; // first request to the treasury page = fallback hand-off
  let staying = false; // in-app QR: once on the bank, every later navigation is followed
  let moved = null; // probe picked a fresh proxy session: the treasury request is posted there, once
  const ref = { grn: null }; // eGRAS alert "Please note down GRN/TransactionID…: 161831387" — finds the receipt later
  const captured = new Promise((resolve) => { found = resolve; });
  const atTreasury = new Promise((resolve) => { reachedTreasury = resolve; });
  // context, not page: eGRAS may open the bank in a new window (2026-11-06 live: 60s with no capture)
  const onRoute = (route) => {
    const req = route.request();
    if (staying) {
      // HP's PayU result path is unmapped (2026-11-19): log every top-level move after the QR — field names only, never values
      const nav = req.isNavigationRequest() && req.frame() === req.frame().page().mainFrame();
      if (nav) io?.log?.(`pay nav ${req.method()} ${new URL(req.url()).hostname}${new URL(req.url()).pathname} [${FORM_TYPE.test(req.headers()['content-type'] || '') ? [...new URLSearchParams(req.postData() || '').keys()].join(',') : ''}]`);
      return nav ? route.continue() : route.fallback(); // PayU's own files can come from staticCache.js
    }
    const host = new URL(req.url()).hostname;
    const frame = req.frame();
    const top = frame === frame.page().mainFrame();
    const leaving = req.isNavigationRequest() && top && host !== VAHAN_HOST;
    if (!leaving) return route.fallback(); // fallback, not continue: eGRAS static files come from staticCache.js
    io?.log?.(`bank nav ${req.method()} ${host}${new URL(req.url()).pathname}`); // path only — queries can carry the vehicle no.
    if (treasury && host === treasury.host) {
      if (viaTreasury === undefined) { viaTreasury = toHandoff(req); reachedTreasury(true); }
      if (moved && viaTreasury && frame.page().context() !== moved) {
        io?.log?.('treasury: posting the challan on the probed proxy session');
        repost(moved, viaTreasury, io);
        return route.abort();
      }
      return route.continue();
    }
    if (treasury?.qr?.test(host)) { staying = true; found({ live: frame.page(), ref, pay: treasury }); return route.continue(); }
    found(toHandoff(req));
    return route.abort();
  };
  // Playwright would dismiss (= Cancel) a JS confirm. Portal messages are logged: an error alert here is
  // otherwise invisible. ponytail: portal text, not driver data — trimmed to 120 chars
  const onDialog = (d) => {
    ref.grn = ref.grn || d.message().match(/GRN\D{0,40}?(\d{6,})/i)?.[1] || null;
    io?.log?.(`bank step ${d.type()}: ${d.message().slice(0, 120)}`);
    d.accept().catch(() => {});
  };
  // why a bank/treasury page never loaded (HR eGRAS, 2026-11-12) — host + path + network error only
  const onFailed = (r) => {
    if (!r.isNavigationRequest()) return;
    const u = new URL(r.url());
    io?.log?.(`bank nav failed ${u.hostname}${u.pathname}: ${r.failure()?.errorText}`);
  };
  const wire = async (context) => {
    await context.route('**/*', onRoute);
    context.on('page', (p) => p.on('dialog', onDialog));
    context.on('requestfailed', onFailed);
    return context;
  };
  await wire(page.context());
  const respawn = page.context().respawn && (async () => wire(await page.context().respawn()));
  page.on('dialog', onDialog);
  await pickGateway(page, gateway, io);
  if (probed) {
    // probed at filing start on unwired sessions (checkpostv4.js) → wire the one it picked now
    const ok = await probed;
    if (ok !== page.context()) moved = await wire(ok);
  } else if (treasury?.probe && respawn) {
    const ok = await pickSession(page.context(), treasury, respawn, io);
    if (ok !== page.context()) moved = ok;
  }
  await page.click('#sendSubmit');
  // ponytail: a SweetAlert confirm after Submit was seen once on HP — click it if it shows, no wait otherwise
  page.locator('.swal2-popup button.swal2-confirm:visible').click({ timeout: 10_000 }).catch(() => {});
  const first = await Promise.race([captured, atTreasury, page.waitForTimeout(HANDOFF_MS).then(() => null)]);
  const handoff = first === true ? (await passTreasury(moved || page.context(), treasury, captured, io, viaTreasury, respawn)) || viaTreasury : first;
  if (!handoff) throw portalError(BORDER_TAX_FAILURE.NO_HANDOFF, `no bank page after Submit (${gateway}) — at ${await whereStuck(page)}`);
  return handoff;
}

module.exports = { bankHandoff, toHandoff, pickGateway };

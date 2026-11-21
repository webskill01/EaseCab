'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { BORDER_TAX_FAILURE: F } = require('@easecab/shared');
const { portalError } = require('../portal');

test('portalError: an expired-PUC refusal gets its own code; other portal errors and specific codes stay', () => {
  const pucc = 'PUCC Validity Must Be Greater Than Or Equal Current Date.Please renew your PUCC Validity\nOK'; // live, 2026-11-11
  assert.strictEqual(portalError(F.PORTAL_ERROR, pucc).failureCode, F.PUCC_EXPIRED);
  assert.strictEqual(portalError(F.PORTAL_ERROR, pucc).message, pucc);
  assert.strictEqual(portalError(F.PORTAL_ERROR, 'Server busy').failureCode, F.PORTAL_ERROR);
  assert.strictEqual(portalError(F.PORTAL_ERROR).failureCode, F.PORTAL_ERROR);
  assert.strictEqual(portalError(F.CAPTCHA_WRONG, pucc).failureCode, F.CAPTCHA_WRONG);
  const fit = 'Fitness Validity Must Be Greater Than Or Equal Current Date..\nPlease renew your vehicle Fitness\nOK'; // live, 2026-11-11
  assert.strictEqual(portalError(F.PORTAL_ERROR, fit).failureCode, F.FITNESS_EXPIRED);
  assert.strictEqual(portalError(F.PORTAL_ERROR, 'Seating capacity should be 7 to 17.\nOK').failureCode, F.SEAT_CLASS_MISMATCH); // live HR 2026-11-16
  const zero = 'i\nMV Tax Calculation of Road Tax amount is zero, it should not be. Please check details.\nOK'; // live HR 2026-11-17
  assert.strictEqual(portalError(F.PORTAL_ERROR, zero).failureCode, F.ALREADY_PAID);
});

// Declaration captcha as checkpostv4 draws it (main.js, 2026-11-13): random code, canvas, checked in-page.
const DECLARATION = `<div id="captcha" class="cap"></div><button>↻</button><input id="inputcap"><button id="go">Pay Online</button><p id="ok" hidden>ok</p>
<script>
let code;
function draw() {
  const n = document.createElement('canvas'); n.width = 140; n.height = 36;
  const r = '123456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ@#'; const d = [];
  for (let h = 0; h < 6; h++) { const f = Math.floor(Math.random() * r.length); d.indexOf(r[f]) === -1 ? d.push(r[f]) : h--; }
  code = d.join(''); const g = n.getContext('2d'); g.font = 'italic 30px verdana'; g.fillText(code, 10, 25);
  const box = document.getElementById('captcha'); box.innerHTML = ''; box.appendChild(n);
}
draw();
document.getElementById('go').onclick = () => { if (document.getElementById('inputcap').value === code) document.getElementById('ok').hidden = false; else draw(); };
</script>`;

test('declaration captcha: typed exactly as the page drew it — no OCR, no driver', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  const { solveCaptcha, canvasCodeHook } = require('../portal');
  const browser = await chromium.launch().catch(() => null); // CI has the package but no browser binary
  if (!browser) return t.skip('chromium not installed');
  t.after(() => browser.close());
  const context = await browser.newContext();
  await context.addInitScript(canvasCodeHook);
  for (let i = 0; i < 5; i += 1) { // random codes: case + @/# every time
    const page = await context.newPage(); // fresh window: the fixture's script declares globals
    await page.setContent(DECLARATION);
    const logs = [];
    const io = { log: (m) => logs.push(m), captcha: async () => { throw new Error('asked the driver'); } };
    await solveCaptcha(page, io, {
      step: 'declaration', input: '#inputcap', length: 6,
      submit: () => page.click('#go'), done: () => page.waitForSelector('#ok', { state: 'visible', timeout: 3000 }),
    });
    assert.match(logs[0], /^captcha declaration: read off the page "[1-9a-zA-Z@#]{6}"$/);
  }
});

test('vahanRefusal: no-record and same-state answers get their own codes; a wrong captcha passes', () => {
  const { vahanRefusal } = require('../checkpostv4');
  const noData = 'i\nNo data found for this vehicle number.\nPlease enter the details..\nOr clear your browser history.\nOK'; // live HR a7f5c3a3, 2026-11-16
  assert.throws(() => vahanRefusal(noData), (e) => e.failureCode === F.VEHICLE_NOT_FOUND);
  assert.throws(() => vahanRefusal('Same State Vehicle not allowed'), (e) => e.failureCode === F.SAME_STATE);
  assert.doesNotThrow(() => vahanRefusal('Invalid Captcha'));
});

test('entryUrl: statecd decodes the way checkpostv4 reads it (parivahandecryptEncData, 2026-11-17)', () => {
  const { entryUrl } = require('../checkpostv4');
  const decode = (url) => { // the portal's own decoder, ported
    const hex = Buffer.from(decodeURIComponent(url.match(/statecd=([^#&]+)/)[1]), 'base64').toString();
    const txt = hex.match(/../g).map((h) => String.fromCharCode(parseInt(h, 16))).join('');
    return txt.startsWith('7c606d287b6d6b7') ? txt.slice(15) : txt;
  };
  for (const st of ['HR', 'HP', 'UP', 'PB']) assert.strictEqual(decode(entryUrl(st)), st);
  assert.match(entryUrl('HR'), /^https:\/\/services\.parivahan\.gov\.in\/checkpostv4\/#\/admin\/taxHome\?statecd=/);
});

test('checkpostUp: index + main bundle served → up; main bundle hangs → down (2026-11-21 outage); no main.js → up', async (t) => {
  const http = require('node:http');
  const { checkpostUp } = require('../checkpostv4');
  let mode = 'ok';
  const srv = http.createServer((req, res) => {
    if (req.url === '/') return res.end(mode === 'odd' ? '<p>new layout</p>' : '<script src="runtime.a1.js"></script><script src="main.94a07c50a31c00f0.js" type="module"></script>');
    if (req.url.startsWith('/main.') && mode !== 'hang') return res.end('console.log(1)');
    if (mode === 'hang') res.write('partial'); // never ends, like the live bundle
  }).listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  t.after(() => { srv.closeAllConnections(); srv.close(); });
  const base = `http://127.0.0.1:${srv.address().port}/`;
  assert.strictEqual(await checkpostUp(2000, base), true);
  mode = 'hang';
  assert.strictEqual(await checkpostUp(500, base), false);
  mode = 'odd';
  assert.strictEqual(await checkpostUp(2000, base), true);
  srv.closeAllConnections();
  srv.close();
  assert.strictEqual(await checkpostUp(1000, base), false); // nothing listening
});

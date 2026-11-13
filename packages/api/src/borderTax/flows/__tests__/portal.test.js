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
  const browser = await chromium.launch();
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

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { TREASURY, passTreasury } = require('../treasury');
const { ocrReady, stopOcr } = require('../../ocr');

const HOST = TREASURY.HP.host;
const BANK = 'https://bank.example.test/payu';
const CAPTCHA = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../../ocr/fixtures/vahan-4bpd6c.png')).toString('base64')}`;

// Shape of the himkosh challan page the user pasted 2026-11-07: payment type, bank, code, declaration.
// Submits to the bank only when everything is filled right, else alerts (like the real page).
const HIMKOSH = (withBank = true) => `<form id="f" method="post" action="${BANK}">
  <input type="radio" name="pt" id="eb" value="eb"><label for="eb">e-banking</label>
  <input type="radio" name="pt" id="man" value="man"><label for="man">Manually</label>
  ${withBank ? '<select name="bank" id="ddlBank"><option value="">--Select--</option><option value="P1">PAYU - NetBanking /Debit /Credit Card/ UPI/QR</option></select>' : ''}
  <div><img src="${CAPTCHA}"><input type="text" name="code" placeholder="ENTER CODE"></div>
  <input type="checkbox" name="agree" id="agree"><label for="agree">I have read and understood</label>
  <input type="button" value="Cancel"><input type="submit" value="Proceed">
</form>
<script>document.getElementById('f').onsubmit = (e) => {
  const ok = document.getElementById('eb').checked && document.querySelector('select')?.value === 'P1'
    && document.getElementById('agree').checked && document.querySelector('[name=code]').value === '4bpd6c';
  if (!ok) { e.preventDefault(); alert('Invalid details'); }
};</script>`;

/** A browser context with the fake treasury page loaded; bank navigations captured. */
async function setup(chromium, html) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  let found;
  const captured = new Promise((r) => { found = r; });
  await context.route(`${BANK}*`, (route) => { found(route.request().postData()); return route.abort(); });
  await context.route(`https://${HOST}/**`, (route) => route.fulfill({ contentType: 'text/html', body: html }));
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(`https://${HOST}/echallan`);
  return { browser, context, captured };
}

test('treasury pass-through: fills himkosh (e-banking, PAYU, OCR code, declaration) → bank captured; unknown page → null', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  const io = { log: () => {} };

  const ok = await setup(chromium, HIMKOSH());
  t.after(() => ok.browser.close());
  const bank = await passTreasury(ok.context, TREASURY.HP, ok.captured, io);
  assert.ok(bank, 'bank page captured');
  assert.match(bank, /bank=P1/);
  assert.match(bank, /code=4bpd6c/);

  const odd = await setup(chromium, HIMKOSH(false)); // no PAYU option → hand over the treasury page
  t.after(() => odd.browser.close());
  assert.strictEqual(await passTreasury(odd.context, TREASURY.HP, odd.captured, io), null);
});

test('treasury captcha OCR miss → the driver types it in the app (no hand-off); a timeout clears the lock', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  const blank = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
  const html = HIMKOSH().replace(CAPTCHA, blank); // OCR reads nothing off this

  const asked = [];
  const ok = await setup(chromium, html);
  t.after(() => ok.browser.close());
  const io = { log: () => {}, captcha: async (a) => { asked.push(a.step); return '4bpd6c'; } };
  assert.match(await passTreasury(ok.context, TREASURY.HP, ok.captured, io), /code=4bpd6c/);
  assert.deepStrictEqual(asked, ['treasury']);

  const late = await setup(chromium, html);
  t.after(() => late.browser.close());
  const timeout = { log: () => {}, captcha: async () => { throw Object.assign(new Error('t'), { failureCode: 'captcha_timeout' }); } };
  await assert.rejects(passTreasury(late.context, TREASURY.HP, late.captured, timeout), (e) => e.failureCode === 'captcha_timeout' && e.atBank === true);
});

test('treasury page never loaded → the captured challan request is posted again, then filled', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext();
  let found;
  const captured = new Promise((r) => { found = r; });
  await context.route(`${BANK}*`, (route) => { found(route.request().postData()); return route.abort(); });
  await context.route(`https://${HOST}/**`, (route) => route.fulfill({ contentType: 'text/html', body: HIMKOSH() }));
  await context.route('https://vahan.example.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>eTransPgi</p>' }));
  const page = await context.newPage(); // stuck on Vahan, as on the 2026-11-12 HR filings
  page.on('dialog', (d) => d.accept());
  await page.goto('https://vahan.example.test/eTransPgi');
  const again = { method: 'POST', action: `https://${HOST}/echallan`, fields: [['grn', '1']] };
  const bank = await passTreasury(context, { ...TREASURY.HP, findMs: 1500 }, captured, { log: () => {} }, again);
  assert.match(bank, /code=4bpd6c/);
});

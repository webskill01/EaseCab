'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { findUpi, decodeQr, RECEIPT_RE } = require('../payuQr');

test('findUpi: pulls the intent out of JSON-escaped PayU bodies; null when absent', () => {
  assert.strictEqual(findUpi(String.raw`{"intentURIData":"upi:\/\/pay?pa=x@payu\u0026am=100.00\u0026tr=1"}`), 'upi://pay?pa=x@payu&am=100.00&tr=1');
  assert.strictEqual(findUpi('<a href="upi://pay?pa=x@y&amp;am=1">'), 'upi://pay?pa=x@y&am=1');
  assert.strictEqual(findUpi('{"status":"ok"}'), null);
});

test('RECEIPT_RE: reads the HR receipt number off the receipt page text', () => {
  assert.strictEqual('Receipt No. : HRR2611110355752\nBank Ref'.match(RECEIPT_RE)[1], 'HRR2611110355752');
});

test('decodeQr: reads the full upi link (amount + txn ref) from a QR PNG; junk → null', () => {
  const png = require('fs').readFileSync(require('path').join(__dirname, 'fixtures/upi-qr.png'));
  assert.strictEqual(decodeQr(png), 'upi://pay?pa=test@payu&am=100.00&tr=TEST1&mode=04');
  assert.strictEqual(decodeQr(Buffer.from('not a png')), null);
});

test('openQr: blank PayU checkout → reload after ~8s (not 30s+) → QR', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  let browser;
  try { browser = await chromium.launch(); } catch { return t.skip('chromium not launchable (CI)'); }
  t.after(() => browser.close());
  const { openQr } = require('../payuQr');
  const png = require('fs').readFileSync(require('path').join(__dirname, 'fixtures/upi-qr.png')).toString('base64');
  let loads = 0;
  const context = await browser.newContext();
  await context.route('https://api.payu.in/**', (route) => {
    loads += 1;
    const body = loads === 1 ? '<body></body>' : `<body><button>Pay</button><a href="upi://pay?pa=x@payu">UPI</a><img width="200" height="200" src="data:image/png;base64,${png}"></body>`;
    return route.fulfill({ contentType: 'text/html', body });
  });
  const page = await context.newPage();
  const logs = [];
  const started = Date.now();
  await page.goto('https://api.payu.in/public/#/x/paymentoptions');
  const { qr } = await openQr(page, { log: (m) => logs.push(m) });
  assert.match(qr, /^data:image\/png;base64,/);
  assert.ok(logs.some((m) => /blank.*reloading/.test(m)), logs.join('\n'));
  assert.ok(Date.now() - started < 20_000, `took ${Date.now() - started}ms`);
});

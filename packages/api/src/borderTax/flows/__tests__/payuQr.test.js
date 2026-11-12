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

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { parseIst } = require('../clearPending');

test('parseIst reads the pending list date as IST', () => {
  assert.strictEqual(parseIst('12-Nov-2026 12:25 AM').toISOString(), '2026-11-11T18:55:00.000Z');
  assert.strictEqual(parseIst('11-Nov-2026 11:44 PM').toISOString(), '2026-11-11T18:14:00.000Z');
  assert.strictEqual(parseIst('06-Nov-2026 12:03 PM').toISOString(), '2026-11-06T06:33:00.000Z');
  assert.strictEqual(parseIst(''), null);
});

test('verdictOf reads the Check Status page', () => {
  const { verdictOf } = require('../clearPending');
  // live HP answer while himkosh was down (2026-11-14)
  assert.deepStrictEqual(verdictOf('pay the fee/tax, amount will not be refunded or adjusted. Payment process Transaction confirmation pending at the bank side.(PENDING) Back'), { result: 'bank_pending' });
  assert.deepStrictEqual(verdictOf('Your transaction is fail. Please initiate transaction again.'), { result: 'cleared' });
  assert.deepStrictEqual(verdictOf('Please try after 12 Minutes 30 Seconds'), { result: 'wait', waitSec: 750 });
  assert.strictEqual(verdictOf('Loading...'), null);
});

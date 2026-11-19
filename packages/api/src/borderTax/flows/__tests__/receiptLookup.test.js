'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { findReceipt } = require('../receiptLookup');
const { payStatus } = require('../payuQr');

/** Fake checkpost receipt list: each row = [row text, receipt page text]. */
function list(rows) {
  let open = null;
  const page = (text) => ({
    locator: (sel) => (sel === 'body'
      ? { innerText: async () => text }
      : { first: () => ({ waitFor: async () => {} }), count: async () => 1 }),
    close: async () => {},
  });
  const row = ([rowText, receipt]) => ({
    innerText: async () => rowText,
    locator: () => ({ last: () => ({ locator: () => ({ first: () => ({ click: async () => { open = page(receipt); } }) }) }) }),
  });
  const l = {
    locator: () => ({ count: async () => rows.length, nth: (i) => row(rows[i]) }),
    context: () => ({ waitForEvent: () => new Promise((r) => setImmediate(() => r(open))) }), // popup resolves after the click
  };
  return l;
}

const SINCE = new Date('2026-11-19T11:12:00Z'); // 4:42 pm IST

test('PayU timeout lookup: an older ₹230 receipt for the same vehicle is skipped, today\'s is taken', async () => {
  const l = list([
    ['HPP261118000001 18-Nov-2026 04:43 PM 230', 'Receipt No : HPR2611180000001 Amount 230.00'],
    ['HPP261119000002 19-Nov-2026 04:44 PM 230', 'Receipt No : HPR2611190000002 Amount 230.00'],
  ]);
  const found = await findReceipt(l, { since: SINCE, amountPaise: 23000 });
  assert.strictEqual(found.receiptNo, 'HPR2611190000002');
});

test('PayU timeout lookup: right time, wrong amount → no match', async () => {
  const l = list([['HPP261119000002 19-Nov-2026 04:44 PM 1230', 'Receipt No : HPR2611190000002 Amount 1230.00']]);
  assert.strictEqual(await findReceipt(l, { since: SINCE, amountPaise: 23000 }), null);
});

test('payStatus: the checkpost receipt in a tab counts as paid (no PayU post-back needed)', async () => {
  const receipt = {
    locator: (sel) => (sel === 'body' ? { innerText: async () => 'Receipt No : HPR2611190000002' } : { count: async () => 1 }),
  };
  const context = { on() {}, off() {}, pages: () => [receipt] };
  const r = await payStatus(context, /himkosh\.hp\.nic\.in/i);
  assert.deepStrictEqual([r.status, r.found.receiptNo], ['success', 'HPR2611190000002']);
});

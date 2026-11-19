'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { findReceipt, rowDates } = require('../receiptLookup');
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

const TAX_FROM = new Date('2026-11-19T11:30:00Z'); // 5:00 PM IST — filing 513710ed
// Real HP list row shape (2026-11-19): Sl State PaymentId ReceiptNo PaymentDate TaxFrom TaxUpto Fee Fine Print
const ROW = (pid, rno, paid, from, upto, fee) => [`1\tHIMACHAL PRADESH\t${pid}\t${rno}\t${paid}\t${from}\t${upto}\t${fee}\t0.0\t`, `Receipt No : ${rno}`];

test('rowDates: "19/11/2026, 5:00 PM" read as IST; 12 AM edge', () => {
  assert.deepStrictEqual(rowDates('19/11/2026, 5:00 PM x 20/11/2026, 12:05 AM').map((t) => new Date(t).toISOString()),
    ['2026-11-19T11:30:00.000Z', '2026-11-19T18:35:00.000Z']);
});

test('PayU timeout lookup: the row with this filing\'s Tax From is taken (yesterday\'s ₹230 skipped)', async () => {
  const l = list([
    ROW('HPP261118371678', 'HPR2611180675915', '18/11/2026, 4:57 PM', '18/11/2026, 4:56 PM', '19/11/2026, 4:56 PM', '230.0'),
    ROW('HPP261119422637', 'HPR2611190722289', '19/11/2026, 4:42 PM', '19/11/2026, 5:00 PM', '20/11/2026, 4:59 PM', '230.0'),
  ]);
  const found = await findReceipt(l, { taxFrom: TAX_FROM, amountPaise: 23000 });
  assert.strictEqual(found.receiptNo, 'HPR2611190722289');
});

test('PayU timeout lookup: right Tax From, wrong amount → no match', async () => {
  const l = list([ROW('HPP1', 'HPR2611190000002', '19/11/2026, 4:42 PM', '19/11/2026, 5:00 PM', '20/11/2026, 4:59 PM', '1230.0')]);
  assert.strictEqual(await findReceipt(l, { taxFrom: TAX_FROM, amountPaise: 23000 }), null);
});

test('payStatus: the checkpost receipt in a tab counts as paid (no PayU post-back needed)', async () => {
  const receipt = {
    locator: (sel) => (sel === 'body' ? { innerText: async () => 'Receipt No : HPR2611190000002' } : { count: async () => 1 }),
  };
  const context = { on() {}, off() {}, pages: () => [receipt] };
  const r = await payStatus(context, /himkosh\.hp\.nic\.in/i);
  assert.deepStrictEqual([r.status, r.found.receiptNo], ['success', 'HPR2611190000002']);
});

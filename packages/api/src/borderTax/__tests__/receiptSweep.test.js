'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sweepReceipts } = require('../receiptSweep');

const logger = { info() {} };

test('sweepReceipts: deletes receipts 24h past validity, then clears the key', async () => {
  const calls = [];
  const repo = {
    async expiredReceipts(before, take) { calls.push(['query', before.toISOString(), take]); return [{ id: 'a', receiptKey: 'k/a.pdf' }]; },
    async clearReceiptKey(id) { calls.push(['clear', id]); },
  };
  const r2 = { async deleteObject({ key }) { calls.push(['delete', key]); } };
  const n = await sweepReceipts({ repo, r2, logger, now: new Date('2026-11-14T00:00:00Z') });
  assert.equal(n, 1);
  assert.deepEqual(calls, [['query', '2026-11-13T00:00:00.000Z', 100], ['delete', 'k/a.pdf'], ['clear', 'a']]);
});

test('sweepReceipts: an R2 failure leaves the key for the next sweep', async () => {
  let cleared = false;
  const repo = { async expiredReceipts() { return [{ id: 'a', receiptKey: 'k' }]; }, async clearReceiptKey() { cleared = true; } };
  const r2 = { async deleteObject() { throw new Error('r2 down'); } };
  await assert.rejects(sweepReceipts({ repo, r2, logger }), /r2 down/);
  assert.equal(cleared, false);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { BORDER_TAX } = require('@easecab/shared');
const { awaitSbiPaid } = require('../sbiQr');

/** Fake SBI QR page: `status` is what SBI's "Transaction Status" line reads; no receipt anywhere. */
function fakePage(url, status) {
  const page = {
    url: () => url,
    evaluate: async () => status,
    locator: () => ({ innerText: async () => '', count: async () => 0 }),
  };
  page.context = () => ({ pages: () => [page] });
  return page;
}
const io = { log: () => {} };

test('SBI reports a failed payment → payment_failed', async () => {
  const page = fakePage('https://merchant.sbi.bank.in/merchant/merchantinterotherconfirm.htm', 'Transaction Failed');
  await assert.rejects(awaitSbiPaid(page, io, 60), { failureCode: 'payment_failed' });
});

test('"Collect Request Initiated Successfully" is not a failure; out of time → payment_timeout', async () => {
  const page = fakePage('https://merchant.sbi.bank.in/x', 'Collect Request Initiated Successfully');
  await assert.rejects(awaitSbiPaid(page, io, 1 - BORDER_TAX.PAY_GRACE_SEC), { failureCode: 'payment_timeout' });
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { BORDER_TAX_FAILURE: F } = require('@easecab/shared');
const { vahanLookup } = require('../checkpostv4');

const fail = (failureCode) => Object.assign(new Error(failureCode), { failureCode });
const page = { waitForTimeout: async () => {}, goto: async () => {} };
const io = { log: () => {} };

async function run(results) {
  let opened = 0;
  let looked = 0;
  const steps = {
    openForm: async () => { opened += 1; },
    ownerStep: async () => { const r = results[looked++]; if (r) throw r; return 'ok'; },
  };
  const out = await vahanLookup(page, {}, io, steps).catch((e) => e.failureCode);
  return { out, opened, looked };
}

test('insurance refusal is retried on a fresh form, up to 2 more times', async () => {
  assert.deepStrictEqual(await run([fail(F.INSURANCE_UNVERIFIED), null]), { out: 'ok', opened: 2, looked: 2 });
  const ins = fail(F.INSURANCE_UNVERIFIED);
  assert.deepStrictEqual(await run([ins, ins, ins, null]), { out: F.INSURANCE_UNVERIFIED, opened: 3, looked: 3 });
});

test('other refusals are not retried', async () => {
  assert.deepStrictEqual(await run([fail(F.VEHICLE_PENDING)]), { out: F.VEHICLE_PENDING, opened: 1, looked: 1 });
});

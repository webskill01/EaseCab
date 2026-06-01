'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createHeartbeat } = require('../recordHeartbeat');
const { BOT_LAST_INGEST_KEY } = require('@easecab/shared');

test('record stamps the clock time into easecab:bot:last_ingest_at', async () => {
  const calls = [];
  const redis = { set: async (k, v) => calls.push([k, v]) };
  const hb = createHeartbeat({ redis, clock: { now: () => 1717200000000 } });

  await hb.record();

  assert.deepEqual(calls, [[BOT_LAST_INGEST_KEY, '1717200000000']]);
});

test('a redis failure is swallowed — record never throws', async () => {
  const redis = { set: async () => { throw new Error('redis down'); } };
  const warns = [];
  const hb = createHeartbeat({ redis, logger: { warn: (...a) => warns.push(a) } });

  await assert.doesNotReject(() => hb.record());
  assert.equal(warns.length, 1);
});

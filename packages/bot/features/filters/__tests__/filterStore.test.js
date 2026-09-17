'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { buildFilters, createFilterStore } = require('../filterStore');

const ROWS = [
  { list: 'ride_keyword', value: 'innova' },
  { list: 'ignore_keyword', value: 'khali' },
  { list: 'blocked_phone', value: '9876543210' },
  { list: 'blocked_sender', value: '9000000000' },
  { list: 'branding', value: '- 🚨 Forwarded Duty 🚨' },
];
const logger = { info() {}, warn() {}, error() {} };
const prismaReturning = (fn) => ({ botFilterEntry: { findMany: fn } });

test('buildFilters groups rows into the processMessage filter shape', () => {
  assert.deepStrictEqual(buildFilters(ROWS), {
    rideKeywords: ['innova'],
    ignoreKeywords: ['khali'],
    blockedPhoneNumbers: ['9876543210'],
    blockedSenders: ['9000000000'],
    knownBrandings: ['- 🚨 Forwarded Duty 🚨'],
  });
});

test('buildFilters fails closed when the ignore or ride list is empty', () => {
  assert.throws(() => buildFilters(ROWS.filter((r) => r.list !== 'ignore_keyword')), /ignore_keyword/);
  assert.throws(() => buildFilters(ROWS.filter((r) => r.list !== 'ride_keyword')), /ride_keyword/);
});

test('start() throws when the DB is unreachable — never runs with no filters', async () => {
  const store = createFilterStore({ prisma: prismaReturning(async () => { throw new Error('down'); }), logger });
  await assert.rejects(store.start(), /down/);
});

test('reload() swaps lists in place so existing holders see new values', async () => {
  let rows = ROWS;
  const store = createFilterStore({ prisma: prismaReturning(async () => rows), logger });
  await store.start();
  const held = store.filters;
  rows = [...ROWS, { list: 'blocked_phone', value: '9111111111' }];
  await store.reload();
  assert.strictEqual(store.filters, held);
  assert.deepStrictEqual(held.blockedPhoneNumbers, ['9876543210', '9111111111']);
});

test('a failed reload keeps the last good lists', async () => {
  let rows = ROWS;
  const store = createFilterStore({ prisma: prismaReturning(async () => rows), logger });
  await store.start();
  rows = []; // wiped table → fail closed on reload, keep previous
  await store.reload();
  assert.deepStrictEqual(store.filters.ignoreKeywords, ['khali']);
});

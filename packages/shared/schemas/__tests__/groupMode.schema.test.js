'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { groupModeUpdateSchema, groupSummaryQuerySchema } = require('../groupMode.schema');

const A = '3b9cf26d-73e3-4477-bcde-747eda87dfe4';
const B = '700c4b3a-326a-4f6a-b783-50aebde675d6';

test('update: toggle + unique city ids; rejects dupes and extra keys', () => {
  assert.ok(groupModeUpdateSchema.safeParse({ enabled: true, cityIds: [A, B] }).success);
  assert.ok(!groupModeUpdateSchema.safeParse({ enabled: true, cityIds: [A, A] }).success);
  assert.ok(!groupModeUpdateSchema.safeParse({ enabled: true, cityIds: [], x: 1 }).success);
  assert.ok(!groupModeUpdateSchema.safeParse({ enabled: true, cityIds: ['nope'] }).success);
});

test('summary: parses key.since pairs incl. special groups', () => {
  const r = groupSummaryQuerySchema.parse({ g: `${A}.1700000000000,all.0,duties.5` });
  assert.deepStrictEqual(r.g, [{ key: A, since: 1700000000000 }, { key: 'all', since: 0 }, { key: 'duties', since: 5 }]);
  assert.ok(!groupSummaryQuerySchema.safeParse({ g: 'bad.1' }).success);
  assert.ok(!groupSummaryQuerySchema.safeParse({ g: `${A}.x` }).success);
  assert.ok(!groupSummaryQuerySchema.safeParse({ g: '' }).success);
});

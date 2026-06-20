'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { blockCreateSchema } = require('../blocks.schema');

const UUID = '11111111-1111-4111-8111-111111111111';

test('block: accepts a uuid blockedId, rejects bad/extra input', () => {
  assert.equal(blockCreateSchema.safeParse({ blockedId: UUID }).success, true);
  assert.equal(blockCreateSchema.safeParse({ blockedId: 'nope' }).success, false);
  assert.equal(blockCreateSchema.safeParse({}).success, false);
  assert.equal(blockCreateSchema.safeParse({ blockedId: UUID, extra: 1 }).success, false);
});

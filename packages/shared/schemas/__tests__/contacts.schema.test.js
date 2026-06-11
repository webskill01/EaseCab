'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { contactedListQuerySchema, CONTACT_SOURCE } = require('../../index');

test('contactedListQuerySchema defaults limit and accepts a cursor', () => {
  const r = contactedListQuerySchema.parse({ cursor: 'abc' });
  assert.equal(r.limit, 20);
  assert.equal(r.cursor, 'abc');
});

test('contactedListQuerySchema rejects limit over the max', () => {
  assert.throws(() => contactedListQuerySchema.parse({ limit: 999 }));
});

test('CONTACT_SOURCE is the frozen bot|posted set', () => {
  assert.deepEqual(CONTACT_SOURCE, { BOT: 'bot', POSTED: 'posted' });
  assert.equal(Object.isFrozen(CONTACT_SOURCE), true);
});

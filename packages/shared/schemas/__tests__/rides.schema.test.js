// packages/shared/schemas/__tests__/rides.schema.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { ridesListQuerySchema, rideIdParamSchema } = require('../rides.schema');
const { RIDES_FEED } = require('../../constants/rides');

test('ridesListQuerySchema defaults limit when omitted', () => {
  const r = ridesListQuerySchema.safeParse({});
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.limit, RIDES_FEED.DEFAULT_LIMIT);
  assert.strictEqual(r.data.cursor, undefined);
});

test('ridesListQuerySchema coerces a numeric-string limit and keeps the cursor', () => {
  const r = ridesListQuerySchema.safeParse({ limit: '10', cursor: 'abc123' });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.limit, 10);
  assert.strictEqual(r.data.cursor, 'abc123');
});

test('ridesListQuerySchema rejects out-of-range and non-integer limits', () => {
  assert.strictEqual(ridesListQuerySchema.safeParse({ limit: '0' }).success, false); // below min
  assert.strictEqual(ridesListQuerySchema.safeParse({ limit: String(RIDES_FEED.MAX_LIMIT + 1) }).success, false); // above max
  assert.strictEqual(ridesListQuerySchema.safeParse({ limit: '1.5' }).success, false); // not int
  assert.strictEqual(ridesListQuerySchema.safeParse({ limit: 'abc' }).success, false); // not a number
});

test('ridesListQuerySchema rejects an empty cursor and strips unknown keys', () => {
  assert.strictEqual(ridesListQuerySchema.safeParse({ cursor: '' }).success, false);
  const ok = ridesListQuerySchema.safeParse({ evil: 1 });
  assert.strictEqual(ok.success, true);
  assert.strictEqual('evil' in ok.data, false);
});

test('rideIdParamSchema accepts a UUID and rejects anything else', () => {
  assert.strictEqual(
    rideIdParamSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111' }).success,
    true,
  );
  assert.strictEqual(rideIdParamSchema.safeParse({ id: 'not-a-uuid' }).success, false);
  assert.strictEqual(rideIdParamSchema.safeParse({}).success, false);
});

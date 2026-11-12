'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { parseIst } = require('../clearPending');

test('parseIst reads the pending list date as IST', () => {
  assert.strictEqual(parseIst('12-Nov-2026 12:25 AM').toISOString(), '2026-11-11T18:55:00.000Z');
  assert.strictEqual(parseIst('11-Nov-2026 11:44 PM').toISOString(), '2026-11-11T18:14:00.000Z');
  assert.strictEqual(parseIst('06-Nov-2026 12:03 PM').toISOString(), '2026-11-06T06:33:00.000Z');
  assert.strictEqual(parseIst(''), null);
});

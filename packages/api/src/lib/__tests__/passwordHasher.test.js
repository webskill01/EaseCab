'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createPasswordHasher } = require('../passwordHasher');

test('hash then compare round-trips; wrong password fails', async () => {
  const h = createPasswordHasher(4); // low rounds = fast test
  const hash = await h.hash('correct horse');
  assert.strictEqual(await h.compare('correct horse', hash), true);
  assert.strictEqual(await h.compare('wrong', hash), false);
});

test('two hashes of the same password differ (salted)', async () => {
  const h = createPasswordHasher(4);
  assert.notStrictEqual(await h.hash('pw'), await h.hash('pw'));
});

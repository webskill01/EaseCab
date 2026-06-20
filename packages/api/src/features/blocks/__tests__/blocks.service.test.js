'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ERROR_CODES } = require('@easecab/shared');
const { createBlocksService } = require('../blocks.service');

test('blockUser: persists the block and echoes the target', async () => {
  let created = null;
  const repo = { createBlock: async (a) => { created = a; return { id: 'b1', createdAt: new Date() }; } };
  const out = await createBlocksService({ repo }).blockUser('u1', { blockedId: 'u2' });
  assert.deepEqual(created, { blockerId: 'u1', blockedId: 'u2' });
  assert.equal(out.id, 'b1');
  assert.equal(out.blockedId, 'u2');
});

test('blockUser: rejects blocking yourself and never writes', async () => {
  let wrote = false;
  const repo = { createBlock: async () => { wrote = true; return {}; } };
  await assert.rejects(
    () => createBlocksService({ repo }).blockUser('u1', { blockedId: 'u1' }),
    (e) => e.code === ERROR_CODES.VALIDATION_ERROR,
  );
  assert.equal(wrote, false);
});

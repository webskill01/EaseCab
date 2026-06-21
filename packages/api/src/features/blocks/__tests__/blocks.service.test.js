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

test('listBlocks: flattens the joined blocked user to the display shape', async () => {
  const at = new Date('2026-06-21T00:00:00Z');
  const repo = { listBlocks: async (id) => {
    assert.equal(id, 'u1');
    return [{ id: 'b1', blockedId: 'u2', createdAt: at, blocked: { name: 'Raj', profilePicUrl: 'r2/x', baseCity: 'Ludhiana' } }];
  } };
  const out = await createBlocksService({ repo }).listBlocks('u1');
  assert.deepEqual(out, [{ id: 'b1', blockedId: 'u2', name: 'Raj', profilePicUrl: 'r2/x', baseCity: 'Ludhiana', createdAt: at }]);
});

test('listBlocks: null-safe when the joined user fields are missing', async () => {
  const repo = { listBlocks: async () => [{ id: 'b1', blockedId: 'u2', createdAt: new Date(), blocked: null }] };
  const [row] = await createBlocksService({ repo }).listBlocks('u1');
  assert.equal(row.name, null);
  assert.equal(row.profilePicUrl, null);
  assert.equal(row.baseCity, null);
});

test('unblockUser: delegates to repo.deleteBlock with both ids', async () => {
  let args = null;
  const repo = { deleteBlock: async (a) => { args = a; return 1; } };
  await createBlocksService({ repo }).unblockUser('u1', 'u2');
  assert.deepEqual(args, { blockerId: 'u1', blockedId: 'u2' });
});

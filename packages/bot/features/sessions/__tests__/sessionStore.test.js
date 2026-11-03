'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSessionStore } = require('../sessionStore');

const logger = { info() {}, warn() {} };

function fakePrisma(rows) {
  const state = { rows, created: null, fail: false, updates: [] };
  const prisma = {
    waSession: {
      count: async () => state.rows.length,
      createMany: async ({ data }) => {
        state.created = data;
        state.rows = data.map((d) => ({ ...d, enabled: true, phone: null }));
      },
      findMany: async () => {
        if (state.fail) throw new Error('db down');
        return state.rows;
      },
      updateMany: async (a) => state.updates.push(a),
    },
  };
  return { prisma, state };
}

test('seeds env slots only when the table is empty', async () => {
  const { prisma, state } = fakePrisma([]);
  const store = createSessionStore({ prisma, logger, seedSlots: ['slot-1'] });
  await store.start();
  assert.deepEqual(state.created, [{ slot: 'slot-1', name: 'slot-1' }]);
  assert.deepEqual(store.enabledSlots(), ['slot-1']);

  const other = fakePrisma([{ slot: 'wa-a', enabled: true, phone: null }]);
  await createSessionStore({ prisma: other.prisma, logger, seedSlots: ['slot-1'] }).start();
  assert.equal(other.state.created, null);
});

test('reload reports removed slots, but a failed read removes nothing', async () => {
  const { prisma, state } = fakePrisma([
    { slot: 'a', enabled: true, phone: null },
    { slot: 'b', enabled: false, phone: null },
  ]);
  const store = createSessionStore({ prisma, logger, seedSlots: [] });
  await store.start();
  assert.deepEqual(store.enabledSlots(), ['a']);

  state.fail = true;
  assert.deepEqual(await store.reload(), { removed: [] });
  assert.deepEqual([...store.knownSlots()], ['a', 'b']);

  state.fail = false;
  state.rows = [{ slot: 'a', enabled: true, phone: null }];
  assert.deepEqual(await store.reload(), { removed: ['b'] });
});

test('notePhone writes once per change, always when freshly paired', async () => {
  const { prisma, state } = fakePrisma([{ slot: 'a', enabled: true, phone: '91999' }]);
  const store = createSessionStore({ prisma, logger, seedSlots: [] });
  await store.start();
  await store.notePhone('a', '91999');
  assert.equal(state.updates.length, 0);
  await store.notePhone('a', '91888');
  await store.notePhone('a', '91888', true);
  assert.equal(state.updates.length, 2);
  assert.ok(state.updates[1].data.pairedAt instanceof Date);
});

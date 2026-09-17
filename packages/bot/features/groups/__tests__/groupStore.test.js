'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createGroupStore, toGroupRecord } = require('../groupStore');

const logger = { info() {}, warn() {}, error() {} };
const ROWS = [
  { jid: 'on@g.us', name: 'PUNJAB TAXI', enabled: true },
  { jid: 'off@g.us', name: 'Spam group', enabled: false },
];

function fakePrisma(rows = ROWS) {
  const upserts = [];
  return {
    upserts,
    waGroup: {
      findMany: async () => rows,
      upsert: async (args) => { upserts.push(args); return {}; },
    },
  };
}

test('default ON: every group is read unless switched off, including unknown groups', async () => {
  const store = createGroupStore({ prisma: fakePrisma(), logger });
  await store.start();
  assert.strictEqual(store.shouldIngest('on@g.us'), true);
  assert.strictEqual(store.shouldIngest('never-seen@g.us'), true);
  assert.strictEqual(store.shouldIngest('off@g.us'), false);
});

test('only group chats are ever ingested (never DMs or broadcasts)', async () => {
  const store = createGroupStore({ prisma: fakePrisma(), logger });
  await store.start();
  assert.strictEqual(store.shouldIngest('919876543210@s.whatsapp.net'), false);
  assert.strictEqual(store.shouldIngest('status@broadcast'), false);
  assert.strictEqual(store.shouldIngest(undefined), false);
});

test('nameOf returns the stored group name', async () => {
  const store = createGroupStore({ prisma: fakePrisma(), logger });
  await store.start();
  assert.strictEqual(store.nameOf('on@g.us'), 'PUNJAB TAXI');
  assert.strictEqual(store.nameOf('nope@g.us'), undefined);
});

test('start() throws when the table is unreadable — the bot exits instead of guessing', async () => {
  const prisma = { waGroup: { findMany: async () => { throw new Error('down'); } } };
  await assert.rejects(createGroupStore({ prisma, logger }).start(), /down/);
});

test('reload() picks up a switch change; a failed reload keeps the last good state', async () => {
  let rows = ROWS;
  let fail = false;
  const prisma = { waGroup: { findMany: async () => { if (fail) throw new Error('down'); return rows; } } };
  const store = createGroupStore({ prisma, logger });
  await store.start();
  rows = [{ jid: 'on@g.us', name: 'PUNJAB TAXI', enabled: false }];
  await store.reload();
  assert.strictEqual(store.shouldIngest('on@g.us'), false);
  assert.strictEqual(store.shouldIngest('off@g.us'), true);
  fail = true;
  await store.reload();
  assert.strictEqual(store.shouldIngest('on@g.us'), false);
});

test('record() upserts name + member count without touching the on/off switch', async () => {
  const prisma = fakePrisma();
  const store = createGroupStore({ prisma, logger });
  await store.start();
  await store.record([{ jid: 'new@g.us', name: 'Delhi Duty', participants: 250 }]);
  const [args] = prisma.upserts;
  assert.deepStrictEqual(args.where, { jid: 'new@g.us' });
  assert.deepStrictEqual(args.create, { jid: 'new@g.us', name: 'Delhi Duty', participants: 250 });
  assert.strictEqual(args.update.name, 'Delhi Duty');
  assert.ok(args.update.lastSeenAt instanceof Date);
  assert.ok(!('enabled' in args.update) && !('enabled' in args.create));
  assert.strictEqual(store.nameOf('new@g.us'), 'Delhi Duty');
});

test('record() never blanks a stored name when WhatsApp returns an empty subject', async () => {
  const prisma = fakePrisma();
  const store = createGroupStore({ prisma, logger });
  await store.start();
  await store.record([{ jid: 'on@g.us', name: null, participants: null }]);
  assert.ok(!('name' in prisma.upserts[0].update));
  assert.ok(!('participants' in prisma.upserts[0].update));
  assert.strictEqual(store.nameOf('on@g.us'), 'PUNJAB TAXI');
});

test('record() keeps going when one upsert fails', async () => {
  let calls = 0;
  const prisma = { waGroup: { findMany: async () => [], upsert: async () => { calls += 1; if (calls === 1) throw new Error('x'); } } };
  const store = createGroupStore({ prisma, logger });
  await store.record([{ jid: 'a@g.us' }, { jid: 'b@g.us' }]);
  assert.strictEqual(calls, 2);
});

test('toGroupRecord maps Baileys group metadata', () => {
  assert.deepStrictEqual(
    toGroupRecord({ id: 'x@g.us', subject: 'Taxi', participants: [{}, {}] }),
    { jid: 'x@g.us', name: 'Taxi', participants: 2 },
  );
  assert.deepStrictEqual(toGroupRecord({ id: 'y@g.us' }), { jid: 'y@g.us', name: null, participants: null });
});

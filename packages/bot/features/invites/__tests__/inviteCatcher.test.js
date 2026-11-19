'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { extractInviteCodes, WA_INVITES } = require('@easecab/shared');
const { createInviteCatcher } = require('../inviteCatcher');

const logger = { info() {}, warn() {} };
const CODE = 'AbCdEfGhIjKlMnOpQrStUv';

function fakePrisma() {
  const rows = new Map();
  const updates = [];
  return {
    rows, updates,
    waInviteLink: {
      upsert: async ({ where, create }) => {
        const r = rows.get(where.code);
        if (r) { r.seenCount += 1; return r; }
        const n = { status: 'new', resolvedAt: null, ...create, seenCount: 1 };
        rows.set(where.code, n);
        return n;
      },
      updateMany: async (args) => { updates.push(args); return { count: 1 }; },
    },
  };
}

test('extract: only chat.whatsapp.com invite codes, deduped; other links ignored', () => {
  const text = `Join https://chat.whatsapp.com/${CODE}?mode=ems_copy_t and chat.whatsapp.com/invite/${CODE}
    insta https://instagram.com/p/xyz  channel https://whatsapp.com/channel/0029VaAbCdEfGhIjKlMnOp
    broken chat.whatsapp.com/short  too long chat.whatsapp.com/${CODE}XXXXXXXX`;
  assert.deepStrictEqual(extractInviteCodes(text), [CODE]);
  assert.deepStrictEqual(extractInviteCodes('no links here'), []);
});

test('see: one row per code; a re-sighting in the window writes nothing', async () => {
  const prisma = fakePrisma();
  const c = createInviteCatcher({ prisma, logger, isKnownGroup: () => false });
  await c.see(`chat.whatsapp.com/${CODE}`, 'a@g.us');
  await c.see(`again chat.whatsapp.com/${CODE}`, 'b@g.us');
  assert.strictEqual(prisma.rows.size, 1);
  assert.strictEqual(prisma.rows.get(CODE).seenCount, 1);
  assert.strictEqual(prisma.rows.get(CODE).sourceGroupJid, 'a@g.us');
});

test('see: new code is previewed → name/size/jid saved; a group we are in → joined', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const prisma = fakePrisma();
  const sock = { user: {}, groupGetInviteInfo: async () => ({ id: 'g1@g.us', subject: 'Patiala Taxi', size: 250 }) };
  const c = createInviteCatcher({ prisma, logger, isKnownGroup: (j) => j === 'g1@g.us' });
  await c.see(`chat.whatsapp.com/${CODE}`, 'a@g.us', sock);
  await new Promise(setImmediate);
  const { data } = prisma.updates[0];
  assert.strictEqual(data.groupJid, 'g1@g.us');
  assert.strictEqual(data.name, 'Patiala Taxi');
  assert.strictEqual(data.size, 250);
  assert.strictEqual(data.status, 'joined');
  t.mock.timers.tick(WA_INVITES.RESOLVE_GAP_MS);
});

test('see: revoked link → invalid; a network error leaves it unresolved', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const prisma = fakePrisma();
  // Real Baileys shape: code in data, Boom's default 500 in output.statusCode.
  const gone = Object.assign(new Error('not-authorized'), { data: 401, output: { statusCode: 500 } });
  const sock = { user: {}, groupGetInviteInfo: async () => { throw gone; } };
  const c = createInviteCatcher({ prisma, logger, isKnownGroup: () => false });
  await c.see(`chat.whatsapp.com/${CODE}`, 'a@g.us', sock);
  await new Promise(setImmediate);
  assert.strictEqual(prisma.updates[0].data.status, 'invalid');

  const prisma2 = fakePrisma();
  const sock2 = { user: {}, groupGetInviteInfo: async () => { throw new Error('timed out'); } };
  t.mock.timers.tick(WA_INVITES.RESOLVE_GAP_MS);
  await createInviteCatcher({ prisma: prisma2, logger, isKnownGroup: () => false }).see(`chat.whatsapp.com/${CODE}`, 'a@g.us', sock2);
  await new Promise(setImmediate);
  assert.strictEqual(prisma2.updates.length, 0);
  t.mock.timers.tick(WA_INVITES.RESOLVE_GAP_MS);
});

test('see: a failed preview is retried on a later sighting; avoided links are not', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const prisma = fakePrisma();
  let calls = 0;
  const sock = { user: {}, groupGetInviteInfo: async () => { calls += 1; throw new Error('timed out'); } };
  const c = createInviteCatcher({ prisma, logger, isKnownGroup: () => false });
  await c.see(`chat.whatsapp.com/${CODE}`, 'a@g.us', sock);
  await new Promise(setImmediate);
  t.mock.timers.tick(WA_INVITES.RESEEN_WINDOW_MS);
  await c.see(`chat.whatsapp.com/${CODE}`, 'a@g.us', sock);
  await new Promise(setImmediate);
  assert.strictEqual(calls, 2);

  prisma.rows.get(CODE).status = 'avoided';
  t.mock.timers.tick(WA_INVITES.RESEEN_WINDOW_MS);
  await c.see(`chat.whatsapp.com/${CODE}`, 'a@g.us', sock);
  await new Promise(setImmediate);
  assert.strictEqual(calls, 2);
  t.mock.timers.tick(WA_INVITES.RESOLVE_GAP_MS);
});

test('markJoined: only new/requested/later/invalid links of those groups flip to joined', async () => {
  const prisma = fakePrisma();
  const c = createInviteCatcher({ prisma, logger, isKnownGroup: () => false });
  await c.markJoined([]);
  assert.strictEqual(prisma.updates.length, 0);
  await c.markJoined(['g1@g.us']);
  assert.deepStrictEqual(prisma.updates[0].where.status.in, ['new', 'requested', 'later', 'invalid']);
  assert.strictEqual(prisma.updates[0].data.status, 'joined');
});

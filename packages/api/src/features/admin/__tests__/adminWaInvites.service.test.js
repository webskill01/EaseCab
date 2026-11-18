'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminWaInvitesService } = require('../adminWaInvites.service');

const ID = '11111111-1111-1111-1111-111111111111';
const COUNTS = { new: 3, joined: 1, avoided: 2, invalid: 0 };

function setup() {
  const repo = {
    async list() {
      return {
        rows: [
          { id: ID, code: 'AbCdEfGhIjKlMnOpQrStUv', groupJid: 'g1@g.us', sourceGroupJid: 'src@g.us' },
          { id: 'x', code: 'ZzZzZzZzZzZzZzZzZzZzZz', groupJid: null, sourceGroupJid: 'gone@g.us' },
        ],
        total: 2, counts: COUNTS,
      };
    },
    async setStatus(id, status) { return id === ID ? { id, status } : null; },
  };
  const groupsRepo = {
    async namesByJid() { return [{ jid: 'src@g.us', name: 'PB Taxi Rides' }]; },
    async sessions() { return [{ slot: 'slot-1', name: 'Tanishq' }]; },
  };
  const redis = { async smismember(_k, ...jids) { return jids.map((j) => (j === 'g1@g.us' ? 1 : 0)); } };
  return createAdminWaInvitesService({ repo, groupsRepo, redis });
}

test('list adds the join URL, the source group name and the sessions in the group', async () => {
  const out = await setup().list({ page: 1, limit: 50, status: 'new' });
  assert.deepStrictEqual(out.counts, COUNTS);
  assert.strictEqual(out.items[0].url, 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv');
  assert.strictEqual(out.items[0].sourceGroupName, 'PB Taxi Rides');
  assert.deepStrictEqual(out.items[0].sessions, ['Tanishq']);
  assert.strictEqual(out.items[1].sourceGroupName, null);
  assert.deepStrictEqual(out.items[1].sessions, []);
});

test('setStatus avoids a link; an unknown id is NOT_FOUND', async () => {
  const svc = setup();
  assert.deepStrictEqual(await svc.setStatus(ID, 'avoided'), { id: ID, status: 'avoided' });
  await assert.rejects(svc.setStatus('22222222-2222-2222-2222-222222222222', 'avoided'), { code: 'NOT_FOUND' });
});

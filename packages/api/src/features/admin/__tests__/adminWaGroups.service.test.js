'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { BOT_GROUPS_CHANGED_CHANNEL } = require('@easecab/shared');
const { createAdminWaGroupsService } = require('../adminWaGroups.service');

const ID = '11111111-1111-1111-1111-111111111111';
const logger = { warn() {} };

let lastList;
function setup(repoOver = {}) {
  const published = [];
  const repo = {
    async list(args) { lastList = args; return { rows: [{ id: ID, jid: 'g1@g.us' }], total: 1, on: 290, off: 10 }; },
    async sessions() { return [{ slot: 'slot-1', name: 'Tanishq' }, { slot: 'slot-2', name: 'Admin' }]; },
    async update(id, data) { return id === ID ? { id, ...data } : null; },
    async setEnabledMany() { return 300; },
    ...repoOver,
  };
  const sets = { 'easecab:bot:slot_groups:slot-1': ['g1@g.us', 'g2@g.us'], 'easecab:bot:slot_groups:slot-2': ['g1@g.us'] };
  const redis = {
    async publish(ch) { published.push(ch); },
    async smismember(key, ...jids) { return jids.map((j) => ((sets[key] || []).includes(j) ? 1 : 0)); },
    async smembers(key) { return sets[key] || []; },
  };
  return { service: createAdminWaGroupsService({ repo, redis, logger }), published };
}

test('list returns groups with the sessions in each, offset meta and on/off counts', async () => {
  const { service } = setup();
  assert.deepStrictEqual(await service.list({ page: 1, limit: 50, status: 'all' }), {
    items: [{ id: ID, jid: 'g1@g.us', sessions: ['Tanishq', 'Admin'] }], total: 1, page: 1, limit: 50, counts: { on: 290, off: 10 },
  });
  assert.strictEqual(lastList.jids, undefined);
});

test('status shared narrows the list to groups 2+ sessions are in', async () => {
  const { service } = setup();
  await service.list({ page: 1, limit: 50, status: 'shared' });
  assert.deepStrictEqual(lastList.jids, ['g1@g.us']);
});

test('toggle switches one group and tells the bot', async () => {
  const { service, published } = setup();
  assert.deepStrictEqual(await service.toggle(ID, { enabled: false }), { id: ID, enabled: false });
  assert.deepStrictEqual(published, [BOT_GROUPS_CHANGED_CHANNEL]);
});

test('toggle on an unknown id is NOT_FOUND and tells nobody', async () => {
  const { service, published } = setup();
  await assert.rejects(service.toggle('22222222-2222-2222-2222-222222222222', { enabled: true }), { code: 'NOT_FOUND' });
  assert.strictEqual(published.length, 0);
});

test('bulk switches and notifies only when something changed', async () => {
  const { service, published } = setup();
  assert.deepStrictEqual(await service.bulk({ enabled: true }), { updated: 300 });
  assert.strictEqual(published.length, 1);
  const none = setup({ async setEnabledMany() { return 0; } });
  assert.deepStrictEqual(await none.service.bulk({ enabled: false, q: 'zzz' }), { updated: 0 });
  assert.strictEqual(none.published.length, 0);
});

test('a publish failure does not fail the switch', async () => {
  const svc = createAdminWaGroupsService({
    repo: { async update(id, data) { return { id, ...data }; } },
    redis: { async publish() { throw new Error('redis down'); } },
    logger,
  });
  assert.deepStrictEqual(await svc.toggle(ID, { enabled: true }), { id: ID, enabled: true });
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { BOT_GROUPS_CHANGED_CHANNEL } = require('@easecab/shared');
const { createAdminWaGroupsService } = require('../adminWaGroups.service');

const ID = '11111111-1111-1111-1111-111111111111';
const logger = { warn() {} };

function setup(repoOver = {}) {
  const published = [];
  const repo = {
    async list() { return { rows: [{ id: ID }], total: 1, on: 290, off: 10 }; },
    async setEnabled(id, enabled) { return id === ID ? { id, enabled } : null; },
    async setEnabledMany() { return 300; },
    ...repoOver,
  };
  const redis = { async publish(ch) { published.push(ch); } };
  return { service: createAdminWaGroupsService({ repo, redis, logger }), published };
}

test('list returns groups, offset meta and overall on/off counts', async () => {
  const { service } = setup();
  assert.deepStrictEqual(await service.list({ page: 1, limit: 50, status: 'all' }), {
    items: [{ id: ID }], total: 1, page: 1, limit: 50, counts: { on: 290, off: 10 },
  });
});

test('toggle switches one group and tells the bot', async () => {
  const { service, published } = setup();
  assert.deepStrictEqual(await service.toggle(ID, false), { id: ID, enabled: false });
  assert.deepStrictEqual(published, [BOT_GROUPS_CHANGED_CHANNEL]);
});

test('toggle on an unknown id is NOT_FOUND and tells nobody', async () => {
  const { service, published } = setup();
  await assert.rejects(service.toggle('22222222-2222-2222-2222-222222222222', true), { code: 'NOT_FOUND' });
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
    repo: { async setEnabled(id, enabled) { return { id, enabled }; } },
    redis: { async publish() { throw new Error('redis down'); } },
    logger,
  });
  assert.deepStrictEqual(await svc.toggle(ID, true), { id: ID, enabled: true });
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { BOT_FILTERS_CHANGED_CHANNEL } = require('@easecab/shared');
const { createAdminBotFiltersService } = require('../adminBotFilters.service');

const ID = '11111111-1111-1111-1111-111111111111';
const logger = { warn() {} };
const OK_PEERS = [{ peer: 'fleet', ok: true }];

function setup({ repo: repoOver = {}, withFleet = false } = {}) {
  const published = [];
  const created = [];
  const mirrored = [];
  const removed = [];
  const repo = {
    async list() { return { rows: [{ id: ID }], total: 1 }; },
    async createMany(list, values) { created.push({ list, values }); return values.length - 1; },
    async findById(id) { return id === ID ? { id, list: 'ignore_keyword', value: 'khali' } : null; },
    async findByValue(list, value) { return value === '9876543210' || value === 'KHALI' ? { id: ID, list, value } : null; },
    async countByList() { return 2; },
    async remove(id) { removed.push(id); },
    ...repoOver,
  };
  const redis = { async publish(ch, msg) { published.push([ch, msg]); } };
  const fleet = withFleet ? { async post(path, body) { mirrored.push([path, body]); return OK_PEERS; } } : undefined;
  return { service: createAdminBotFiltersService({ repo, redis, logger, fleet }), published, created, mirrored, removed };
}

test('list returns rows with offset meta', async () => {
  const { service } = setup();
  assert.deepStrictEqual(await service.list({ list: 'branding', page: 1, limit: 50 }), {
    items: [{ id: ID }], total: 1, page: 1, limit: 50,
  });
});

test('adding numbers parses any written format, reports duplicates + invalid, and notifies the bot', async () => {
  const { service, published, created } = setup();
  const r = await service.add({ list: 'blocked_phone', value: '+91 98765 43210, 098765-43211, 123' });
  assert.deepStrictEqual(created, [{ list: 'blocked_phone', values: ['9876543210', '9876543211'] }]);
  assert.deepStrictEqual(r, { added: 1, duplicates: 1, invalid: ['123'], peers: [] });
  assert.deepStrictEqual(published, [[BOT_FILTERS_CHANGED_CHANNEL, 'blocked_phone']]);
});

test('adding a number list with no valid number is a validation error, nothing written', async () => {
  const { service, created, published } = setup();
  await assert.rejects(service.add({ list: 'blocked_sender', value: 'abc 12' }), { code: 'VALIDATION_ERROR' });
  assert.strictEqual(created.length + published.length, 0);
});

test('phrases are stored trimmed with their case kept, like the fleet', async () => {
  const { service, created } = setup();
  await service.add({ list: 'ignore_keyword', value: '  AVELEBAL ' });
  await service.add({ list: 'branding', value: '- 🚨 Forwarded Duty 🚨' });
  assert.deepStrictEqual(created, [
    { list: 'ignore_keyword', values: ['AVELEBAL'] },
    { list: 'branding', values: ['- 🚨 Forwarded Duty 🚨'] },
  ]);
});

test('a phrase already present in another case is a duplicate, not a second row', async () => {
  const { service, created } = setup({ repo: { async findByValue() { return { id: ID, list: 'ignore_keyword', value: 'free' }; } } });
  assert.deepStrictEqual(await service.add({ list: 'ignore_keyword', value: 'FREE' }), { added: 0, duplicates: 1, invalid: [], peers: [] });
  assert.strictEqual(created.length, 0);
});

test('admin adds to fleet-shared lists are replayed to the panels in their protocol', async () => {
  const { service, mirrored } = setup({ withFleet: true });
  const r = await service.add({ list: 'blocked_phone', value: '9876543210 9876543211' });
  await service.add({ list: 'ignore_keyword', value: 'loan' });
  await service.add({ list: 'branding', value: '- x -' }); // not a fleet panel list
  assert.deepStrictEqual(mirrored, [
    ['/api/block/number', { input: '9876543210, 9876543211' }],
    ['/api/block/ignore', { phrase: 'loan' }],
  ]);
  assert.deepStrictEqual(r.peers, OK_PEERS);
});

test('a panel that rejects the change is logged and reported, not thrown', async () => {
  const warned = [];
  const svc = createAdminBotFiltersService({
    repo: { async createMany() { return 1; }, async findByValue() { return null; } },
    redis: { async publish() {} },
    logger: { warn: (obj) => warned.push(obj) },
    fleet: { async post() { return [{ peer: 'fleet', ok: false, error: 'HTTP 403' }]; } },
  });
  const r = await svc.add({ list: 'blocked_phone', value: '9876543210' });
  assert.deepStrictEqual(r.peers, [{ peer: 'fleet', ok: false, error: 'HTTP 403' }]);
  assert.strictEqual(warned[0].peer, 'fleet');
});

test('writes arriving from a panel ({ mirror: false }) are not bounced back', async () => {
  const { service, mirrored, created } = setup({ withFleet: true });
  await service.add({ list: 'blocked_sender', value: '9876543210' }, { mirror: false });
  assert.strictEqual(created.length, 1);
  assert.strictEqual(mirrored.length, 0);
});

test('remove 404s on a missing id', async () => {
  const { service } = setup();
  await assert.rejects(service.remove('22222222-2222-2222-2222-222222222222'), { code: 'NOT_FOUND' });
});

test('remove refuses the last entry of a required list with 409', async () => {
  const { service, published } = setup({ repo: { async countByList() { return 1; } } });
  await assert.rejects(service.remove(ID), { statusCode: 409 });
  assert.strictEqual(published.length, 0);
});

test('remove deletes, notifies the bot, and replays the removal by field + value', async () => {
  const { service, mirrored, removed, published } = setup({ withFleet: true });
  assert.deepStrictEqual(await service.remove(ID), { id: ID, peers: OK_PEERS });
  assert.deepStrictEqual(removed, [ID]);
  assert.strictEqual(published.length, 1);
  assert.deepStrictEqual(mirrored, [['/api/block/remove', { field: 'ignoreIfContains', value: 'khali' }]]);
});

test('a publish failure does not fail the write', async () => {
  const svc = createAdminBotFiltersService({
    repo: { async findById() { return { id: ID, list: 'branding' }; }, async remove() {} },
    redis: { async publish() { throw new Error('redis down'); } },
    logger,
  });
  assert.deepStrictEqual(await svc.remove(ID), { id: ID, peers: [] });
});

test('removeByValue normalizes the number and is a no-op for unknown values', async () => {
  const { service, removed, mirrored } = setup({ withFleet: true });
  assert.deepStrictEqual(await service.removeByValue('blocked_phone', '+91 98765 43210', { mirror: false }), { removed: 1, peers: [] });
  assert.deepStrictEqual(removed, [ID]);
  assert.deepStrictEqual(await service.removeByValue('blocked_phone', '9000000000', { mirror: false }), { removed: 0, peers: [] });
  assert.strictEqual(mirrored.length, 0);
});

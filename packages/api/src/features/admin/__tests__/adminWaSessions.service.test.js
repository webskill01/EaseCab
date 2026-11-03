'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SESSION_STATUS, SLOT_STATE, WA_SESSIONS, PAIR_STATUS, BOT_NUMBERS_KEY, BOT_PAIR_CMD_CHANNEL,
  BOT_SESSIONS_CHANGED_CHANNEL, botSlotGroupsKey, botSlotStatsKey, botSlotRidesKey,
} = require('@easecab/shared');
const { createAdminWaSessionsService, deriveStatus, delayStats } = require('../adminWaSessions.service');

/** Just enough of ioredis for the service (strings, hashes, sets, pub/sub). */
function fakeRedis() {
  const kv = new Map();
  const hashes = new Map();
  const sets = new Map();
  const published = [];
  const set = (k) => sets.get(k) || new Set();
  return {
    kv, hashes, sets, published,
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v) { kv.set(k, v); return 'OK'; },
    async del(...ks) { ks.forEach((k) => { kv.delete(k); hashes.delete(k); sets.delete(k); }); return ks.length; },
    async hgetall(k) { return Object.fromEntries(hashes.get(k) || []); },
    async hget(k, f) { return (hashes.get(k) || new Map()).get(f) || null; },
    async hdel(k, f) { (hashes.get(k) || new Map()).delete(f); return 1; },
    async scard(k) { return set(k).size; },
    async smembers(k) { return [...set(k)]; },
    async lrange(k) { return kv.get(k) || []; },
    async sunion(...ks) { return [...new Set(ks.flatMap((k) => [...set(k)]))]; },
    async sdiff(k, ...others) { return [...set(k)].filter((m) => !others.some((o) => set(o).has(m))); },
    async publish(ch, msg) { published.push([ch, msg]); return 1; },
  };
}

const ROWS = [
  { id: 'i1', slot: 'wa-1', name: 'Punjab 1', enabled: true, phone: '91999', ridesSaved: 40 },
  { id: 'i2', slot: 'wa-2', name: 'Ambala', enabled: true, phone: null, ridesSaved: 0 },
];

function fakeRepo(rows = ROWS) {
  const data = rows.map((r) => ({ ...r }));
  return {
    data,
    async list() { return data; },
    async cityNames(ids) { return Object.fromEntries(ids.filter((i) => i === 'c-amb').map((i) => [i, 'Ambala'])); },
    async groupsByJid(jids) { return jids.filter((j) => j === 'g1').map((jid) => ({ jid, name: 'Taxi Ambala', participants: 90, enabled: true })); },
    async count() { return data.length; },
    async findById(id) { return data.find((r) => r.id === id) || null; },
    async findBySlot(slot) { return data.find((r) => r.slot === slot) || null; },
    async create(d) { const row = { id: 'new', enabled: true, phone: null, ridesSaved: 0, ...d }; data.push(row); return row; },
    async update(id, d) { const r = data.find((x) => x.id === id); return r ? Object.assign(r, d) : null; },
    async remove(id) { const i = data.findIndex((x) => x.id === id); return i < 0 ? null : data.splice(i, 1)[0]; },
  };
}

const logger = { warn() {} };
const make = (repo = fakeRepo(), redis = fakeRedis()) => ({ svc: createAdminWaSessionsService({ repo, redis, logger }), repo, redis });

test('deriveStatus: paused, offline when the bot stops reporting, else the live state', () => {
  const now = 1e12;
  const fresh = (state) => ({ state, at: now - 1000 });
  assert.equal(deriveStatus({ enabled: false }, fresh(SLOT_STATE.ACTIVE), now), SESSION_STATUS.PAUSED);
  assert.equal(deriveStatus({ enabled: true, phone: '91' }, null, now), SESSION_STATUS.OFFLINE);
  assert.equal(deriveStatus({ enabled: true, phone: null }, null, now), SESSION_STATUS.NOT_PAIRED);
  const stale = { state: SLOT_STATE.ACTIVE, at: now - WA_SESSIONS.LIVE_STALE_MS - 1 };
  assert.equal(deriveStatus({ enabled: true, phone: '91' }, stale, now), SESSION_STATUS.OFFLINE);
  assert.equal(deriveStatus({ enabled: true }, fresh(SLOT_STATE.ACTIVE), now), SESSION_STATUS.LIVE);
  assert.equal(deriveStatus({ enabled: true }, fresh(SLOT_STATE.BANNED), now), SESSION_STATUS.LOGGED_OUT);
  assert.equal(deriveStatus({ enabled: true }, fresh(SLOT_STATE.DEGRADED), now), SESSION_STATUS.DOWN);
});

test('list merges DB rows with live state, group overlap and outcome counters', async () => {
  const { svc, redis } = make();
  redis.hashes.set(BOT_NUMBERS_KEY, new Map([['wa-1', JSON.stringify({ state: 'active', at: Date.now(), lastMsgAt: 5, since: 1 })]]));
  redis.sets.set(botSlotGroupsKey('wa-1'), new Set(['g1', 'g2', 'g3']));
  redis.sets.set(botSlotGroupsKey('wa-2'), new Set(['g3', 'g4']));
  redis.hashes.set(botSlotStatsKey('wa-1'), new Map([['saved', '7'], ['duplicate', '3']]));
  const hour = Math.floor(Date.now() / WA_SESSIONS.HOUR_MS);
  redis.hashes.set(botSlotRidesKey('wa-1', hour), new Map([['c-amb', '4']]));
  redis.hashes.set(botSlotRidesKey('wa-1', hour - 23), new Map([['c-amb', '3']]));
  redis.hashes.set(botSlotRidesKey('wa-1', hour - 24), new Map([['c-amb', '50']])); // outside 24h

  const { sessions, totals } = await svc.list();
  assert.equal(totals.groups, 4);
  assert.equal(sessions[0].status, SESSION_STATUS.LIVE);
  assert.deepEqual(sessions[0].groups, { total: 3, unique: 2 });
  assert.deepEqual(sessions[1].groups, { total: 2, unique: 1 });
  assert.deepEqual(sessions[0].outcomes, { saved: 7, duplicate: 3 });
  assert.equal(sessions[0].rides24h, 7);
  assert.equal(sessions[0].lastMsgAt, 5);
  assert.equal(sessions[1].status, SESSION_STATUS.NOT_PAIRED);
});

test('create assigns a wa-<hex> slot, notifies the bot, and caps the count', async () => {
  const { svc, redis } = make();
  const row = await svc.create({ name: 'Haryana' });
  assert.match(row.slot, /^wa-[0-9a-f]{8}$/);
  assert.deepEqual(redis.published, [[BOT_SESSIONS_CHANGED_CHANNEL, 'changed']]);

  const full = make(fakeRepo(Array.from({ length: WA_SESSIONS.MAX_SESSIONS }, (_, i) => ({ id: `x${i}`, slot: `s${i}` }))));
  await assert.rejects(full.svc.create({ name: 'one too many' }), { statusCode: 409 });
});

test('rename does not ping the bot; pause does', async () => {
  const { svc, redis } = make();
  await svc.update('i1', { name: 'New' });
  assert.equal(redis.published.length, 0);
  await svc.update('i1', { enabled: false });
  assert.equal(redis.published.length, 1);
  await assert.rejects(svc.update('nope', { name: 'x' }), { code: 'NOT_FOUND' });
});

test('pair publishes the command and shows STARTING right away', async () => {
  const { svc, redis } = make();
  assert.deepEqual(await svc.pair('i2', '919876543210'), { status: PAIR_STATUS.STARTING });
  assert.deepEqual(redis.published, [[BOT_PAIR_CMD_CHANNEL, JSON.stringify({ slot: 'wa-2', phone: '919876543210' })]]);
  assert.equal((await svc.pairStatus('i2')).status, PAIR_STATUS.STARTING);
});

test('share token resolves publicly, is stored hashed, and is used up once paired', async () => {
  const { svc, redis } = make();
  const { token } = await svc.share('i2');
  assert.ok(![...redis.kv.keys()].some((k) => k.includes(token)), 'raw token never stored');

  await svc.publicPair(token);
  const s = await svc.publicStatus(token);
  assert.equal(s.name, 'Ambala');
  assert.equal(s.status, PAIR_STATUS.STARTING);
  assert.equal(s.phone, undefined); // no number leaks to the public page

  redis.kv.set([...redis.kv.keys()].find((k) => k.includes('pair:state')), JSON.stringify({ status: PAIR_STATUS.PAIRED }));
  assert.equal((await svc.publicStatus(token)).status, PAIR_STATUS.PAIRED);
  await assert.rejects(svc.publicStatus(token), { code: 'NOT_FOUND' });
});

test('public pairing refuses to replace a live session', async () => {
  const { svc, redis } = make();
  const { token } = await svc.share('i1');
  redis.hashes.set(BOT_NUMBERS_KEY, new Map([['wa-1', JSON.stringify({ state: 'active', at: Date.now() })]]));
  await assert.rejects(svc.publicPair(token), { statusCode: 409 });
  await assert.rejects(svc.publicStatus('A'.repeat(32)), { code: 'NOT_FOUND' });
});

test('remove clears the slot redis state and tells the bot', async () => {
  const { svc, redis } = make();
  redis.sets.set(botSlotGroupsKey('wa-1'), new Set(['g1']));
  await svc.remove('i1');
  assert.equal(await redis.scard(botSlotGroupsKey('wa-1')), 0);
  assert.equal(redis.published[0][0], BOT_SESSIONS_CHANGED_CHANNEL);
  await assert.rejects(svc.remove('i1'), { code: 'NOT_FOUND' });
});

test('analytics sums rolling hourly buckets per city; reset clears them and the all-time column', async () => {
  const { svc, redis, repo } = make();
  const hour = Math.floor(Date.now() / WA_SESSIONS.HOUR_MS);
  redis.hashes.set(botSlotRidesKey('wa-1', hour), new Map([['c-amb', '2'], ['unknown', '1']]));
  redis.hashes.set(botSlotRidesKey('wa-1', hour - 30), new Map([['c-amb', '5']]));
  redis.hashes.set(botSlotRidesKey('wa-1', 'all'), new Map([['c-amb', '40']]));

  const day = await svc.analytics('i1', 'day');
  assert.equal(day.total, 3);
  assert.deepEqual(day.cities, [{ city: 'Ambala', count: 2 }, { city: null, count: 1 }]);
  assert.equal((await svc.analytics('i1', 'week')).total, 8);
  const all = await svc.analytics('i1', 'all');
  assert.equal(all.total, 40);
  assert.equal(all.from, null);

  await svc.resetAnalytics('i1');
  assert.equal((await svc.analytics('i1', 'week')).total, 0);
  assert.equal((await svc.analytics('i1', 'all')).total, 0);
  assert.equal(repo.data[0].ridesSaved, 0);
});

test('groups lists the number groups with known names first', async () => {
  const { svc, redis } = make();
  redis.sets.set(botSlotGroupsKey('wa-1'), new Set(['g2', 'g1']));
  const groups = await svc.groups('i1');
  assert.deepEqual(groups.map((g) => [g.jid, g.name]), [['g1', 'Taxi Ambala'], ['g2', null]]);
});

test('delayStats: median / p95 / max over recent rides; null when none', () => {
  assert.equal(delayStats([]), null);
  const v = Array.from({ length: 100 }, (_, i) => String((i + 1) * 100)); // 100ms..10s
  assert.deepEqual(delayStats(v), { median: 5100, p95: 9600, max: 10000, samples: 100 });
});

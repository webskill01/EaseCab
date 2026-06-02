'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPushRepository, SOURCE_TOGGLE } = require('../push.repository');

const UUID = (n) => `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}`;
const CITY_A = UUID(1);
const CITY_B = UUID(2);

/** In-memory prisma covering the push repo paths. */
function fakePrisma(seed = {}) {
  const users = new Map((seed.users || []).map((u) => [u.id, u]));
  const subs = [...(seed.subs || [])]; // { id, userId, deviceToken, platform, createdAt }
  const cities = new Map((seed.cities || []).map((c) => [c.id, { isActive: true, ...c }]));
  let seq = 0;
  const project = (row, select) => { if (!select) return row; const o = {}; for (const k of Object.keys(select)) o[k] = row[k] ?? null; return o; };
  return {
    _subs: subs,
    pushSubscription: {
      async upsert({ where, create, update, select }) {
        const { userId, deviceToken } = where.userId_deviceToken;
        let s = subs.find((x) => x.userId === userId && x.deviceToken === deviceToken);
        if (s) Object.assign(s, update);
        else { s = { id: `ps${seq += 1}`, createdAt: new Date(), ...create }; subs.push(s); }
        return project(s, select);
      },
      async deleteMany({ where }) {
        const before = subs.length;
        for (let i = subs.length - 1; i >= 0; i -= 1) {
          const s = subs[i];
          const tokenMatch = where.deviceToken && where.deviceToken.in
            ? where.deviceToken.in.includes(s.deviceToken)
            : s.deviceToken === where.deviceToken;
          const userMatch = where.userId ? s.userId === where.userId : true;
          if (tokenMatch && userMatch) subs.splice(i, 1);
        }
        return { count: before - subs.length };
      },
      async findMany({ where, distinct }) {
        const u = where.user;
        let rows = subs.filter((s) => {
          const owner = users.get(s.userId);
          if (!owner) return false;
          if (owner.isDeleted !== u.isDeleted) return false;
          const overlap = (owner.notificationCities || []).some((c) => u.notificationCities.hasSome.includes(c));
          if (!overlap) return false;
          // the dynamic toggle column key (notifyBotRides / notifyPostedRides)
          const toggleKey = Object.keys(u).find((k) => k.startsWith('notify'));
          return owner[toggleKey] === u[toggleKey];
        });
        if (distinct && distinct.includes('deviceToken')) {
          const seen = new Set();
          rows = rows.filter((r) => (seen.has(r.deviceToken) ? false : seen.add(r.deviceToken)));
        }
        return rows.map((r) => ({ deviceToken: r.deviceToken }));
      },
    },
    city: {
      async findMany({ where }) {
        return [...cities.values()].filter((c) => where.id.in.includes(c.id) && c.isActive === where.isActive).map((c) => ({ id: c.id }));
      },
    },
    user: {
      async findUnique({ where, select }) { const u = users.get(where.id); return u ? project(u, select) : null; },
      async update({ where, data, select }) { const u = users.get(where.id); Object.assign(u, data); return project(u, select); },
    },
  };
}

test('SOURCE_TOGGLE maps each push source to its user column', () => {
  assert.equal(SOURCE_TOGGLE.bot, 'notifyBotRides');
  assert.equal(SOURCE_TOGGLE.posted, 'notifyPostedRides');
});

test('registerToken upserts (insert then update lastSeenAt) idempotently', async () => {
  const prisma = fakePrisma();
  const repo = createPushRepository({ prisma });
  const a = await repo.registerToken({ userId: 'u1', deviceToken: 'tok', platform: 'android' });
  assert.equal(prisma._subs.length, 1);
  assert.equal(a.platform, 'android');
  const b = await repo.registerToken({ userId: 'u1', deviceToken: 'tok', platform: 'web' });
  assert.equal(prisma._subs.length, 1); // same (userId, token) → updated, not duplicated
  assert.equal(prisma._subs[0].platform, 'web');
  assert.ok(b);
});

test('removeToken deletes only the caller\'s matching token', async () => {
  const prisma = fakePrisma({ subs: [{ id: 'p1', userId: 'u1', deviceToken: 'tok', platform: 'web' }] });
  const repo = createPushRepository({ prisma });
  assert.equal(await repo.removeToken({ userId: 'u2', deviceToken: 'tok' }), 0); // not the owner
  assert.equal(await repo.removeToken({ userId: 'u1', deviceToken: 'tok' }), 1);
  assert.equal(prisma._subs.length, 0);
});

test('findExistingCityIds returns the active subset as a Set', async () => {
  const repo = createPushRepository({ prisma: fakePrisma({ cities: [{ id: CITY_A }, { id: CITY_B, isActive: false }] }) });
  const set = await repo.findExistingCityIds([CITY_A, CITY_B]);
  assert.ok(set.has(CITY_A));
  assert.equal(set.has(CITY_B), false);
});

test('get/updatePreferences round-trips the city list + toggles', async () => {
  const prisma = fakePrisma({ users: [{ id: 'u1', isDeleted: false, notificationCities: [], notifyBotRides: true, notifyPostedRides: true }] });
  const repo = createPushRepository({ prisma });
  const before = await repo.getPreferences('u1');
  assert.deepEqual(before.notificationCities, []);
  const after = await repo.updatePreferences('u1', { notificationCities: [CITY_A], notifyBotRides: false });
  assert.deepEqual(after.notificationCities, [CITY_A]);
  assert.equal(after.notifyBotRides, false);
  assert.equal(after.notifyPostedRides, true);
});

test('getPreferences returns null for a missing user', async () => {
  const repo = createPushRepository({ prisma: fakePrisma() });
  assert.equal(await repo.getPreferences('ghost'), null);
});

test('findTargetTokens: city overlap + source toggle + not-deleted, distinct tokens', async () => {
  const prisma = fakePrisma({
    users: [
      { id: 'u1', isDeleted: false, notificationCities: [CITY_A], notifyBotRides: true, notifyPostedRides: true },
      { id: 'u2', isDeleted: false, notificationCities: [CITY_A], notifyBotRides: false, notifyPostedRides: true }, // bot toggle OFF
      { id: 'u3', isDeleted: false, notificationCities: [CITY_B], notifyBotRides: true, notifyPostedRides: true },  // wrong city
      { id: 'u4', isDeleted: true, notificationCities: [CITY_A], notifyBotRides: true, notifyPostedRides: true },   // soft-deleted
    ],
    subs: [
      { id: 'p1', userId: 'u1', deviceToken: 't1', platform: 'android' },
      { id: 'p1b', userId: 'u1', deviceToken: 't1', platform: 'web' }, // dup token → distinct
      { id: 'p2', userId: 'u2', deviceToken: 't2', platform: 'android' },
      { id: 'p3', userId: 'u3', deviceToken: 't3', platform: 'android' },
      { id: 'p4', userId: 'u4', deviceToken: 't4', platform: 'android' },
    ],
  });
  const repo = createPushRepository({ prisma });
  const botTokens = await repo.findTargetTokens({ cityIds: [CITY_A], source: 'bot' });
  assert.deepEqual(botTokens.sort(), ['t1']); // only u1: u2 toggle off, u3 wrong city, u4 deleted; dup deduped
  const postedTokens = await repo.findTargetTokens({ cityIds: [CITY_A], source: 'posted' });
  assert.deepEqual(postedTokens.sort(), ['t1', 't2']); // posted toggle on for u1 + u2
});

test('findTargetTokens short-circuits on empty cities or unknown source', async () => {
  const repo = createPushRepository({ prisma: fakePrisma() });
  assert.deepEqual(await repo.findTargetTokens({ cityIds: [], source: 'bot' }), []);
  assert.deepEqual(await repo.findTargetTokens({ cityIds: [CITY_A], source: 'nope' }), []);
});

test('pruneTokens deletes the dead tokens; no-op on empty', async () => {
  const prisma = fakePrisma({ subs: [{ id: 'p1', userId: 'u1', deviceToken: 'dead', platform: 'web' }, { id: 'p2', userId: 'u2', deviceToken: 'live', platform: 'web' }] });
  const repo = createPushRepository({ prisma });
  assert.equal(await repo.pruneTokens([]), 0);
  assert.equal(await repo.pruneTokens(['dead']), 1);
  assert.deepEqual(prisma._subs.map((s) => s.deviceToken), ['live']);
});

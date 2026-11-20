'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGroupModeService } = require('../groupMode.service');

const PAID = { status: 'active', expiresAt: new Date(Date.now() + 86_400_000) };
const DEL = { id: 'c-del', canonicalName: 'Delhi', namePa: null, nameHi: null };
const ZIR = { id: 'c-zir', canonicalName: 'Zirakpur', namePa: null, nameHi: null };
const code = (c) => (e) => { assert.equal(e.code, c); return true; };

function repo(over = {}) {
  return {
    saved: over.saved ?? null,
    async getSettings() { return this.saved; },
    async saveSettings(_u, v) { this.saved = v; },
    async citiesByIds(ids) { return [DEL, ZIR].filter((c) => ids.includes(c.id)); },
    async citiesByNames(names) { return [ZIR, DEL].filter((c) => names.includes(c.canonicalName)); },
    async findSubscription() { return over.sub === undefined ? PAID : over.sub; },
    async listOpenRides() { return over.rides ?? []; },
    async listOpenDuties() { return over.duties ?? []; },
    async rideGroupStats() { return over.stats ?? []; },
    async latestRideTexts() { return over.texts ?? []; },
    async allRidesStat() { return over.all ?? { unread: 0, last: null }; },
    async visibleDuties() { return over.visible ?? []; },
  };
}

test('getSettings: never saved → off + default cities in Punjab Taxi Group order', async () => {
  const s = await createGroupModeService({ repo: repo() }).getSettings('u1');
  assert.equal(s.enabled, false);
  assert.deepEqual(s.groups.map((g) => g.name), ['Delhi', 'Zirakpur']);
});

test('saveSettings: ON needs a subscription, OFF does not; unknown cities dropped, order kept', async () => {
  await assert.rejects(createGroupModeService({ repo: repo({ sub: null }) }).saveSettings('u1', { enabled: true, cityIds: [] }), code('SUBSCRIPTION_EXPIRED'));
  const off = await createGroupModeService({ repo: repo({ sub: null }) }).saveSettings('u1', { enabled: false, cityIds: ['c-zir'] });
  assert.equal(off.enabled, false);
  const r = repo();
  const on = await createGroupModeService({ repo: r }).saveSettings('u1', { enabled: true, cityIds: ['c-zir', 'gone', 'c-del'] });
  assert.deepEqual(r.saved, { enabled: true, cityIds: ['c-zir', 'c-del'], pinned: ['all'] });
  assert.deepEqual(on.groups.map((g) => g.cityId), ['c-zir', 'c-del']);
});

test('listRides: paywalled; returns original text + phone and a next cursor', async () => {
  await assert.rejects(createGroupModeService({ repo: repo({ sub: null }) }).listRides('u1', { limit: 1 }), code('SUBSCRIPTION_EXPIRED'));
  const at = new Date();
  const rows = [{ id: 'r1', displayText: 'x ████', rawText: 'x 9876543210', phoneNumber: '+919876543210', status: 'fresh', receivedAt: at }, { id: 'r2', receivedAt: at }];
  const out = await createGroupModeService({ repo: repo({ rides: rows }) }).listRides('u1', { limit: 1 });
  assert.equal(out.rides.length, 1);
  assert.equal(out.rides[0].text, 'x 9876543210');
  assert.equal(out.rides[0].phoneNumber, '+919876543210');
  assert.ok(out.nextCursor);
});

test('listDuties: done duty keeps its bubble but its number is hidden', async () => {
  const at = new Date();
  const duties = [{ id: 'p1', status: 'active', phone: '+911', createdAt: at }, { id: 'p2', status: 'done', phone: '+912', createdAt: at }];
  const out = await createGroupModeService({ repo: repo({ duties }) }).listDuties('u1', { limit: 5 });
  assert.deepEqual(out.posts.map((p) => p.phoneNumber), ['+911', null]);
  assert.equal(out.nextCursor, null);
});

test('summary: city = rides + duties there; duties group = all duties; all = every ride', async () => {
  const old = new Date(Date.now() - 60_000);
  const newer = new Date();
  const svc = createGroupModeService({ repo: repo({
    stats: [{ key: 'c-del', unread: 2, lastAt: old }, { key: 'c-zir', unread: 0, lastAt: null }],
    texts: [{ key: 'c-del', text: 'Need  sedan\ndelhi' }],
    all: { unread: 7, last: { rawText: 'any ride', receivedAt: old } },
    visible: [{ fromCityId: 'c-zir', createdAt: newer, fromCity: { canonicalName: 'Zirakpur' }, toCity: { canonicalName: 'Delhi' } }],
  }) });
  const since = old.getTime() - 1;
  const [del, zir, duties, all] = await svc.summary('u1', [
    { key: 'c-del', since }, { key: 'c-zir', since }, { key: 'duties', since }, { key: 'all', since },
  ]);
  assert.deepEqual([del.unread, del.lastText, del.lastIsDuty], [2, 'Need sedan delhi', false]);
  assert.deepEqual([zir.unread, zir.lastText, zir.lastIsDuty], [1, 'Zirakpur → Delhi', true]);
  assert.equal(duties.unread, 1);
  assert.deepEqual([all.unread, all.lastText], [7, 'any ride']);
});

test('saveSettings: pins kept only for surviving groups; omitted pins keep the saved ones', async () => {
  const r = repo();
  const svc = createGroupModeService({ repo: r });
  await svc.saveSettings('u1', { enabled: true, cityIds: ['c-del'], pinned: ['c-del', 'c-zir', 'all'] });
  assert.deepEqual(r.saved.pinned, ['c-del', 'all']); // c-zir is not a group any more
  await svc.saveSettings('u1', { enabled: true, cityIds: ['c-del'] }); // older client: no `pinned`
  assert.deepEqual(r.saved.pinned, ['c-del', 'all']);
});

'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createFuelService, haversineKm, boxAround } = require('../fuel.service');

const PATIALA = { lat: 30.3398, lng: 76.3869 };
const st = (id, lat, lng, extra = {}) => ({ id, name: id, brand: 'iocl', lat, lng, hasCng: true, hasPetrol: true, hasDiesel: true, ...extra });

function fakeRepo(rows = [], station = null) {
  const calls = { box: null, created: null, reports: [], confirmed: [] };
  return {
    calls,
    async findInBox(box) { calls.box = box; return rows; },
    async createStation(data) { calls.created = data; return { id: 's-new', status: data.status }; },
    async findStation() { return station; },
    async upsertReport(r) { calls.reports.push(r); return { id: 'r1' }; },
    async confirmCng(id) { calls.confirmed.push(id); },
  };
}

test('haversineKm: Patiala → Chandigarh is ~60 km', () => {
  const km = haversineKm(PATIALA.lat, PATIALA.lng, 30.7333, 76.7794);
  assert.ok(km > 55 && km < 62, `got ${km}`);
});

test('boxAround: box covers the radius in both directions', () => {
  const b = boxAround(PATIALA.lat, PATIALA.lng, 10);
  assert.ok(haversineKm(PATIALA.lat, PATIALA.lng, b.maxLat, PATIALA.lng) >= 9.99);
  assert.ok(haversineKm(PATIALA.lat, PATIALA.lng, PATIALA.lat, b.maxLng) >= 9.99);
});

test('nearby: drops box corners outside the radius, sorts closest first, rounds to 0.1 km', async () => {
  const repo = fakeRepo([
    st('far', 30.42, 76.47), // ~11.8 km — in the 10 km box corner, outside the circle
    st('mid', 30.36, 76.3869), // ~2.2 km
    st('near', 30.3408, 76.3869), // ~0.1 km
  ]);
  const out = await createFuelService({ repo }).nearby({ ...PATIALA, fuel: 'cng', radiusKm: 10 });
  assert.deepStrictEqual(out.map((s) => s.id), ['near', 'mid']);
  assert.strictEqual(out[0].distanceKm, 0.1);
  assert.strictEqual(repo.calls.box.fuel, 'cng');
});

test('nearby: caps the list at 40', async () => {
  const rows = Array.from({ length: 60 }, (_, i) => st(`s${i}`, PATIALA.lat + i * 0.0005, PATIALA.lng));
  const out = await createFuelService({ repo: fakeRepo(rows) }).nearby({ ...PATIALA, fuel: 'petrol', radiusKm: 15 });
  assert.strictEqual(out.length, 40);
  assert.strictEqual(out[0].id, 's0');
});

test('addStation: maps fuels to flags, pending, driver source, owner set', async () => {
  const repo = fakeRepo();
  await createFuelService({ repo }).addStation('u1', { name: 'Sandhu CNG', brand: 'cgd', lat: 30.3, lng: 76.4, fuels: ['cng'] });
  assert.deepStrictEqual(repo.calls.created, {
    name: 'Sandhu CNG', brand: 'cgd', lat: 30.3, lng: 76.4, address: null,
    hasCng: true, hasPetrol: false, hasDiesel: false,
    source: 'driver', status: 'pending', addedById: 'u1',
  });
});

test('report: "CNG mili" on a CNG station confirms it and needs no admin', async () => {
  const repo = fakeRepo([], { id: 's1', status: 'active', hasCng: true });
  const out = await createFuelService({ repo }).report('u1', 's1', 'cng_yes');
  assert.deepStrictEqual(out, { stationId: 's1', kind: 'cng_yes', applied: true });
  assert.ok(repo.calls.reports[0].resolvedAt instanceof Date);
  assert.deepStrictEqual(repo.calls.confirmed, ['s1']);
});

test('report: "CNG mili" on a non-CNG station and "CNG nahi" both wait for the admin', async () => {
  for (const [hasCng, kind] of [[false, 'cng_yes'], [true, 'cng_no'], [true, 'closed']]) {
    const repo = fakeRepo([], { id: 's1', status: 'active', hasCng });
    const out = await createFuelService({ repo }).report('u1', 's1', kind);
    assert.strictEqual(out.applied, false);
    assert.strictEqual(repo.calls.reports[0].resolvedAt, null);
    assert.deepStrictEqual(repo.calls.confirmed, []);
  }
});

test('report: unknown or non-active station → NOT_FOUND', async () => {
  for (const station of [null, { id: 's1', status: 'pending', hasCng: true }]) {
    const svc = createFuelService({ repo: fakeRepo([], station) });
    await assert.rejects(svc.report('u1', 's1', 'cng_yes'), { code: 'NOT_FOUND' });
  }
});

// ── alongRoute (Phase 30.7) ─────────────────────────────────────────────────
const { straightLine } = require('../routeCorridor');

function routeRepo(rows, { cached = null } = {}) {
  const calls = { set: null, boxes: 0 };
  const cities = { c1: { lat: 30.3398, lng: 76.3869 }, c2: { lat: 30.7333, lng: 76.7794 } };
  return {
    calls,
    async findInBox() { calls.boxes += 1; return rows; },
    async findCityPoint(id) { return cities[id] || null; },
    async getRoute() { return cached; },
    async setRoute(from, to, r) { calls.set = { from, to, r }; },
  };
}

/** Minimal Google polyline encoder (test-only) for a fake Routes response. */
function encode(pts) {
  const enc = (v) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = '';
    while (n >= 0x20) { s += String.fromCharCode((0x20 | (n & 0x1f)) + 63); n >>= 5; }
    return s + String.fromCharCode(n + 63);
  };
  let out = '';
  let pl = 0;
  let pg = 0;
  pts.forEach(([a, b]) => {
    const la = Math.round(a * 1e5);
    const lg = Math.round(b * 1e5);
    out += enc(la - pl) + enc(lg - pg);
    pl = la;
    pg = lg;
  });
  return out;
}

test('alongRoute: no Google client → straight line, approx, deduped pumps in road order within 2 km', async () => {
  const repo = routeRepo([
    st('end', 30.70, 76.746), st('start', 30.36, 76.407), st('off', 30.50, 76.70), // 'off' ~20 km from the line
  ]);
  const out = await createFuelService({ repo }).alongRoute({ fromCityId: 'c1', toCityId: 'c2', fuel: 'cng' });
  assert.strictEqual(out.routes.length, 1);
  const [r] = out.routes;
  assert.strictEqual(r.approx, true);
  assert.deepStrictEqual(out.from, { lat: 30.34, lng: 76.39 }); // snapped to 2 dp
  assert.deepStrictEqual(r.stations.map((s) => s.id), ['start', 'end']); // every chunk returned them; listed once
  assert.ok(r.stations[0].alongKm < r.stations[1].alongKm);
  assert.ok(repo.calls.boxes >= 2);
});

test('alongRoute: Google route used and cached; a cached route skips Google', async () => {
  const google = [{ encoded: encode(straightLine({ lat: 30.34, lng: 76.39 }, { lat: 30.73, lng: 76.78 })), distanceKm: 68, durationMin: 95, label: 'NH7' }];
  let calls = 0;
  const routes = { async computeRoutes() { calls += 1; return google; } };

  const repo = routeRepo([st('a', 30.5, 76.55)]);
  const out = await createFuelService({ repo, routes }).alongRoute({ fromLat: 30.3412, fromLng: 76.3901, toCityId: 'c2', fuel: 'cng' });
  assert.strictEqual(out.routes[0].approx, false);
  assert.strictEqual(out.routes[0].distanceKm, 68);
  assert.strictEqual(out.routes[0].label, 'NH7');
  assert.strictEqual(repo.calls.set.r, google);
  assert.deepStrictEqual(out.routes[0].stations.map((s) => s.id), ['a']);

  await createFuelService({ repo: routeRepo([], { cached: google }), routes }).alongRoute({ fromCityId: 'c1', toCityId: 'c2', fuel: 'cng' });
  assert.strictEqual(calls, 1);
});

test('alongRoute: Google error → logged, straight-line fallback; unknown city → NOT_FOUND', async () => {
  const warned = [];
  const routes = { async computeRoutes() { throw new Error('google routes 500'); } };
  const logger = { warn: (_o, m) => warned.push(m) };
  const out = await createFuelService({ repo: routeRepo([]), routes, logger }).alongRoute({ fromCityId: 'c1', toCityId: 'c2', fuel: 'cng' });
  assert.strictEqual(out.routes[0].approx, true);
  assert.strictEqual(warned.length, 1);
  await assert.rejects(createFuelService({ repo: routeRepo([]) }).alongRoute({ fromCityId: 'nope', toCityId: 'c2', fuel: 'cng' }), { code: 'NOT_FOUND' });
});

test('alongRoute: every road option carries only its own pumps', async () => {
  const a = { lat: 30.34, lng: 76.39 };
  const b = { lat: 30.73, lng: 76.78 };
  const viaWest = { lat: 30.55, lng: 76.40 }; // a detour ~19 km off the direct line
  const direct = { encoded: encode(straightLine(a, b)), distanceKm: 68, durationMin: 95, label: 'NH7' };
  const detour = { encoded: encode([...straightLine(a, viaWest), ...straightLine(viaWest, b)]), distanceKm: 80, durationMin: 110, label: 'SH12' };
  const routes = { async computeRoutes() { return [direct, detour]; } };
  const repo = routeRepo([st('onDirect', 30.5, 76.55), st('onDetour', 30.55, 76.401)]);
  const out = await createFuelService({ repo, routes }).alongRoute({ fromCityId: 'c1', toCityId: 'c2', fuel: 'cng' });
  assert.deepStrictEqual(out.routes.map((r) => r.label), ['NH7', 'SH12']);
  assert.deepStrictEqual(out.routes[0].stations.map((s) => s.id), ['onDirect']);
  assert.deepStrictEqual(out.routes[1].stations.map((s) => s.id), ['onDetour']);
});

test('inCity: pumps around the city centre plus the centre; unknown city -> NOT_FOUND', async () => {
  const repo = routeRepo([st('near', 30.345, 76.39), st('far', 30.9, 76.39)]);
  const out = await createFuelService({ repo }).inCity({ cityId: 'c1', fuel: 'cng', radiusKm: 15 });
  assert.deepStrictEqual(out.center, { lat: 30.34, lng: 76.39 });
  assert.deepStrictEqual(out.stations.map((s) => s.id), ['near']);
  await assert.rejects(createFuelService({ repo }).inCity({ cityId: 'nope', fuel: 'cng', radiusKm: 15 }), { code: 'NOT_FOUND' });
});

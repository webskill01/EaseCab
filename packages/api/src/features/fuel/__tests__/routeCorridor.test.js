'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const c = require('../routeCorridor');

// ~111 km due north, one point per ~1.1 km
const LINE = Array.from({ length: 101 }, (_, i) => [30 + i * 0.01, 76]);

test('cumulativeKm + chunks: 25 km pieces that share boundaries and pad the box', () => {
  const cum = c.cumulativeKm(LINE);
  assert.ok(Math.abs(cum[100] - 111.2) < 0.2, `got ${cum[100]}`);
  const parts = c.chunks(LINE, cum, 25, 2);
  assert.strictEqual(parts.length, 5);
  assert.strictEqual(parts[0].from, 0);
  assert.strictEqual(parts[1].from, parts[0].to);
  assert.strictEqual(parts.at(-1).to, 100);
  assert.ok(parts[0].box.minLat < 30 && parts[0].box.minLng < 76 && parts[0].box.maxLng > 76);
});

test('nearestOnRoute: perpendicular distance and km along the road', () => {
  const cum = c.cumulativeKm(LINE);
  const hit = c.nearestOnRoute([30.5, 76.0104], LINE, cum, 0, 100); // ~1 km east of the 50th point
  assert.ok(Math.abs(hit.offKm - 1) < 0.05, `off ${hit.offKm}`);
  assert.ok(Math.abs(hit.alongKm - 55.6) < 0.2, `along ${hit.alongKm}`);
});

test('downsample keeps the last point; straightLine has ~2 km steps', () => {
  const d = c.downsample(LINE, 10);
  assert.ok(d.length <= 11);
  assert.deepStrictEqual(d.at(-1), LINE[100]);
  const s = c.straightLine({ lat: 30, lng: 76 }, { lat: 31, lng: 76 });
  assert.strictEqual(s.length, 57);
  assert.deepStrictEqual(s.at(-1), [31, 76]);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { decideStale } = require('../staleDecision');

// 06:30 UTC = 12:00 IST -> active hour 12 (inside [6,23)).
const NOON_IST = Date.UTC(2026, 5, 1, 6, 30, 0);
// 21:00 UTC = 02:30 IST -> hour 2 (outside [6,23)).
const NIGHT_IST = Date.UTC(2026, 5, 1, 21, 0, 0);

const CFG = { staleAfterMin: 20, activeStartHourIST: 6, activeEndHourIST: 23, feedEnabled: true };

test('feed disabled -> never stale', () => {
  const d = decideStale({ ...CFG, feedEnabled: false, now: NOON_IST, lastIngestAt: 0 });
  assert.deepEqual(d, { stale: false, reason: 'feed_disabled' });
});

test('outside active hours -> never stale (quiet night)', () => {
  const d = decideStale({ ...CFG, now: NIGHT_IST, lastIngestAt: NIGHT_IST - 60 * 60 * 1000 });
  assert.deepEqual(d, { stale: false, reason: 'inactive_hours' });
});

test('active hours, no ingest yet -> stale', () => {
  const d = decideStale({ ...CFG, now: NOON_IST, lastIngestAt: null });
  assert.deepEqual(d, { stale: true, reason: 'no_ingest_yet' });
});

test('active hours, last ingest older than threshold -> stale', () => {
  const d = decideStale({ ...CFG, now: NOON_IST, lastIngestAt: NOON_IST - 21 * 60 * 1000 });
  assert.deepEqual(d, { stale: true, reason: 'stale' });
});

test('active hours, recent ingest -> fresh', () => {
  const d = decideStale({ ...CFG, now: NOON_IST, lastIngestAt: NOON_IST - 5 * 60 * 1000 });
  assert.deepEqual(d, { stale: false, reason: 'fresh' });
});

test('exactly at the threshold is still fresh (strictly greater = stale)', () => {
  const d = decideStale({ ...CFG, now: NOON_IST, lastIngestAt: NOON_IST - 20 * 60 * 1000 });
  assert.deepEqual(d, { stale: false, reason: 'fresh' });
});

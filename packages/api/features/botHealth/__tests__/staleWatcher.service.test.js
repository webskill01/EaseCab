'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createStaleWatcher } = require('../staleWatcher.service');
const { createBotHealthRepository } = require('../botHealth.repository');
const { ALERT_EVENT, BOT_LAST_INGEST_KEY } = require('@easecab/shared');

// 06:30 UTC = 12:00 IST -> active hour 12.
const NOON_IST = Date.UTC(2026, 5, 1, 6, 30, 0);
const CFG = { staleAfterMin: 20, activeStartHourIST: 6, activeEndHourIST: 23, feedEnabled: true };

function fakeAlerter() {
  const events = [];
  return {
    events,
    raise: async (event, sev, detail) => events.push({ kind: 'raise', event, sev, detail }),
    clear: async (event) => events.push({ kind: 'clear', event }),
  };
}

test('raises FEED_STALE when ingest is stale during active hours', async () => {
  const alerter = fakeAlerter();
  const watcher = createStaleWatcher({
    repository: { getLastIngestAt: async () => NOON_IST - 30 * 60 * 1000 },
    alerter,
    config: CFG,
    clock: () => NOON_IST,
  });

  const d = await watcher.check();

  assert.equal(d.stale, true);
  assert.deepEqual(alerter.events, [
    { kind: 'raise', event: ALERT_EVENT.FEED_STALE, sev: 'warn', detail: { reason: 'stale' } },
  ]);
});

test('clears FEED_STALE when ingest is fresh', async () => {
  const alerter = fakeAlerter();
  const watcher = createStaleWatcher({
    repository: { getLastIngestAt: async () => NOON_IST - 60 * 1000 },
    alerter,
    config: CFG,
    clock: () => NOON_IST,
  });

  await watcher.check();

  assert.deepEqual(alerter.events, [{ kind: 'clear', event: ALERT_EVENT.FEED_STALE }]);
});

test('never throws — a repository error is swallowed and returns null', async () => {
  const alerter = fakeAlerter();
  const errs = [];
  const watcher = createStaleWatcher({
    repository: { getLastIngestAt: async () => { throw new Error('redis down'); } },
    alerter,
    config: CFG,
    clock: () => NOON_IST,
    logger: { error: (...a) => errs.push(a) },
  });

  const d = await watcher.check();

  assert.equal(d, null);
  assert.equal(alerter.events.length, 0);
  assert.equal(errs.length, 1);
});

test('repository.getLastIngestAt reads + parses easecab:bot:last_ingest_at', async () => {
  const store = { [BOT_LAST_INGEST_KEY]: '1717200000000' };
  const repo = createBotHealthRepository({ redis: { get: async (k) => store[k] } });
  assert.equal(await repo.getLastIngestAt(), 1717200000000);

  const empty = createBotHealthRepository({ redis: { get: async () => null } });
  assert.equal(await empty.getLastIngestAt(), null);

  const junk = createBotHealthRepository({ redis: { get: async () => 'not-a-number' } });
  assert.equal(await junk.getLastIngestAt(), null);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRideLifecycleService } = require('../rideLifecycle.service');

const FIXED = new Date('2026-06-01T12:00:00.000Z');

/** Repository spy: records call order + args, returns canned counts. */
function spyRepo(overrides = {}) {
  const order = [];
  const seen = {};
  const make = (name, count) => async (arg) => {
    order.push(name);
    seen[name] = arg;
    return count;
  };
  return {
    order,
    seen,
    markBooked: overrides.markBooked || make('markBooked', 1),
    markHidden: overrides.markHidden || make('markHidden', 2),
    hardDelete: overrides.hardDelete || make('hardDelete', 3),
    purgeFingerprints: overrides.purgeFingerprints || make('purgeFingerprints', 4),
    expirePostedRides: overrides.expirePostedRides || make('expirePostedRides', { postedExpired: 5, chatsClosed: 6 }),
  };
}

const fixedClock = () => FIXED;

test('runTransitions runs all four jobs in order and returns the counts', async () => {
  const repository = spyRepo();
  const svc = createRideLifecycleService({ repository, clock: fixedClock });

  const result = await svc.runTransitions();

  assert.deepEqual(result, { booked: 1, hidden: 2, deleted: 3, fingerprintsPurged: 4, postedExpired: 5, chatsClosed: 6 });
  assert.deepEqual(repository.order, ['markBooked', 'markHidden', 'hardDelete', 'purgeFingerprints', 'expirePostedRides']);
});

test('booked cutoff is now minus BOOKED_AFTER_MIN (5 min); others get now', async () => {
  const repository = spyRepo();
  const svc = createRideLifecycleService({ repository, clock: fixedClock });

  await svc.runTransitions();

  assert.equal(repository.seen.markBooked.toISOString(), '2026-06-01T11:55:00.000Z');
  assert.equal(repository.seen.markHidden.getTime(), FIXED.getTime());
  assert.equal(repository.seen.hardDelete.getTime(), FIXED.getTime());
  assert.equal(repository.seen.purgeFingerprints.getTime(), FIXED.getTime());
});

test('never throws — a repository failure is logged and the cycle returns null', async () => {
  let errorLogged = false;
  const repository = spyRepo({
    markHidden: async () => {
      throw new Error('db down');
    },
  });
  const logger = { info() {}, warn() {}, error() {
    errorLogged = true;
  } };
  const svc = createRideLifecycleService({ repository, clock: fixedClock, logger });

  const result = await svc.runTransitions();

  assert.equal(result, null);
  assert.equal(errorLogged, true);
});

test('defaults the clock to wall time when none is injected', async () => {
  const repository = spyRepo();
  const before = Date.now();
  const svc = createRideLifecycleService({ repository });

  await svc.runTransitions();

  const used = repository.seen.markHidden.getTime();
  assert.ok(used >= before && used <= Date.now() + 1000);
});

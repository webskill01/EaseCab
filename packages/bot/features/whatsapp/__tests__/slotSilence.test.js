'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ALERT_EVENT } = require('@easecab/shared');
const { silentForMs, createSilenceWatch } = require('../slotSilence');

const MIN = 60 * 1000;
const at = (h, m = 0) => Date.UTC(2026, 10, 12, h, m) - 5.5 * 60 * MIN; // IST wall clock → epoch ms

test('silentForMs: counts from the last message during active hours', () => {
  const now = at(12);
  assert.equal(silentForMs({ live: true, lastMsgAt: now - 40 * MIN, startedAt: 0, now }), 40 * MIN);
});

test('silentForMs: a quiet night never counts — window starts at 06:00 IST', () => {
  const now = at(6, 10);
  assert.equal(silentForMs({ live: true, lastMsgAt: at(0), startedAt: 0, now }), 10 * MIN);
});

test('silentForMs: 0 outside active hours or when the slot is not live', () => {
  assert.equal(silentForMs({ live: true, lastMsgAt: at(1), startedAt: 0, now: at(3) }), 0);
  assert.equal(silentForMs({ live: false, lastMsgAt: at(8), startedAt: 0, now: at(12) }), 0);
});

test('silentForMs: before any message, counts from supervisor start', () => {
  const now = at(12);
  assert.equal(silentForMs({ live: true, lastMsgAt: null, startedAt: now - 5 * MIN, now }), 5 * MIN);
});

test('watch raises once per silence, clears on recovery, per slot', () => {
  const calls = [];
  const watch = createSilenceWatch({ raise: (e, s, d) => calls.push(['raise', e, d]), clear: (e) => calls.push(['clear', e]) });
  const now = at(12);
  const quiet = { live: true, lastMsgAt: now - 45 * MIN, startedAt: 0 };
  watch.check('slot-1', quiet, now);
  watch.check('slot-1', quiet, now + MIN); // no repeat
  watch.check('slot-1', { ...quiet, lastMsgAt: now }, now + 2 * MIN);
  assert.deepEqual(calls, [
    ['raise', `${ALERT_EVENT.SLOT_SILENT}:slot-1`, { slot: 'slot-1', quietMin: 45 }],
    ['clear', `${ALERT_EVENT.SLOT_SILENT}:slot-1`],
  ]);
});

test('watch: first healthy check after boot clears a leftover alert; forget clears too', () => {
  const cleared = [];
  const watch = createSilenceWatch({ raise() {}, clear: (e) => cleared.push(e) });
  const now = at(12);
  watch.check('slot-2', { live: true, lastMsgAt: now, startedAt: 0 }, now);
  watch.check('slot-2', { live: true, lastMsgAt: now, startedAt: 0 }, now);
  watch.forget('slot-2');
  assert.deepEqual(cleared, [`${ALERT_EVENT.SLOT_SILENT}:slot-2`, `${ALERT_EVENT.SLOT_SILENT}:slot-2`]);
});

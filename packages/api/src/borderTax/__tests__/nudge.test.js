'use strict';

const { test, mock } = require('node:test');
const assert = require('node:assert');
const { createNudge } = require('../nudge');

const flush = () => new Promise((r) => setImmediate(r));

test('pushes once the app stops polling mid-step, not before; stops when the step moves on', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  try {
    const job = { step: 'fare', seen: String(Date.now()) };
    const pushed = [];
    const nudge = createNudge({ repo: { getJob: async () => job }, logger: { info() {}, warn() {} }, onAction: async (_r, kind) => { pushed.push(kind); } });
    nudge({ id: 'f1' }, 'fare', 'FARE');
    const tick = async (ms, polling, j = job) => { mock.timers.tick(ms); if (polling) j.seen = String(Date.now()); await flush(); };
    await tick(10_000, true); // app on the screen at the first check
    assert.deepStrictEqual(pushed, []);
    await tick(3_000, true); // still there
    for (let i = 0; i < 3; i += 1) await tick(3_000, false); // driver left (dfc6ad8d): no poll for 9 s
    assert.deepStrictEqual(pushed, ['FARE'], 'pushed after the app went quiet');
    for (let i = 0; i < 5; i += 1) await tick(3_000, false);
    assert.deepStrictEqual(pushed, ['FARE'], 'only one push per step');

    const later = [];
    const job2 = { step: 'fare', seen: String(Date.now()) };
    createNudge({ repo: { getJob: async () => job2 }, logger: { info() {}, warn() {} }, onAction: async (_r, k) => { later.push(k); } })({ id: 'f2' }, 'fare', 'FARE');
    await tick(10_000, true, job2);
    job2.step = 'filling'; // answered
    for (let i = 0; i < 5; i += 1) await tick(3_000, false, job2);
    assert.deepStrictEqual(later, [], 'no push once the step has moved on');
  } finally {
    mock.timers.reset();
  }
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createTreasuryWatch } = require('../treasuryWatch');

const memStore = (init = {}) => {
  const data = { ...init };
  return { data, load: async () => ({ ...data }), save: async (st, up) => { data[st] = up; } };
};
const ticks = async (tick, n) => { for (let i = 0; i < n; i += 1) await tick(); };

test('treasury watch: one DOWN after 3 bad readings, one UP after 2 good', async () => {
  const alerts = [];
  let hpUp = true;
  const store = memStore();
  const tick = createTreasuryWatch({ alert: (m) => alerts.push(m), ...store, check: async (h) => (h.includes('himkosh') ? hpUp : true) });
  await ticks(tick, 2);
  assert.deepStrictEqual(alerts, []);
  hpUp = false;
  await ticks(tick, 2); // not believed yet
  assert.deepStrictEqual(alerts, []);
  await ticks(tick, 5);
  assert.strictEqual(alerts.length, 1);
  assert.match(alerts[0], /^HP .*DOWN/);
  assert.strictEqual(store.data.HP, false);
  hpUp = true;
  await ticks(tick, 2);
  assert.strictEqual(alerts.length, 2);
  assert.match(alerts[1], /^HP .*back UP/);
  assert.strictEqual(store.data.HP, true);
});

test('treasury watch: a restart while down does not repeat DOWN, still sends UP', async () => {
  const alerts = [];
  let hpUp = false;
  const store = memStore({ HP: false }); // already alerted DOWN before the restart
  const tick = createTreasuryWatch({ alert: (m) => alerts.push(m), ...store, check: async (h) => (h.includes('himkosh') ? hpUp : true) });
  await ticks(tick, 6);
  assert.deepStrictEqual(alerts, []);
  hpUp = true;
  await ticks(tick, 2);
  assert.strictEqual(alerts.length, 1);
  assert.match(alerts[0], /^HP .*back UP/);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createTreasuryWatch } = require('../treasuryWatch');

test('treasury watch alerts once per confirmed down/up change', async () => {
  const alerts = [];
  let hpUp = true;
  const tick = createTreasuryWatch({ alert: (m) => alerts.push(m), check: async (h) => (h.includes('himkosh') ? hpUp : true) });
  await tick(); await tick(); // boot: learns UP silently
  assert.deepStrictEqual(alerts, []);
  hpUp = false;
  await tick(); // one bad reading: not believed yet
  assert.deepStrictEqual(alerts, []);
  await tick(); await tick(); await tick();
  assert.strictEqual(alerts.length, 1);
  assert.match(alerts[0], /^HP .*DOWN/);
  hpUp = true;
  await tick(); await tick();
  assert.strictEqual(alerts.length, 2);
  assert.match(alerts[1], /^HP .*back UP/);
});

test('treasury watch: down at boot alerts, up at boot does not', async () => {
  const alerts = [];
  const tick = createTreasuryWatch({ alert: (m) => alerts.push(m), check: async (h) => !h.includes('sbi') });
  await tick(); await tick();
  assert.strictEqual(alerts.length, 1);
  assert.match(alerts[0], /^UP .*DOWN/);
});

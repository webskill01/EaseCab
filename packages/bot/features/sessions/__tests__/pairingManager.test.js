'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PAIR_STATUS, botPairKey } = require('@easecab/shared');
const { createPairingManager, moveAside } = require('../pairingManager');

const logger = { info() {}, warn() {}, error() {} };

function setup(behave) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-pair-'));
  const states = [];
  const calls = { released: [], rescans: 0, phones: [] };
  const busy = new Set();
  const mgr = createPairingManager({
    redis: { set: async (k, v) => states.push([k, JSON.parse(v)]) },
    logger,
    registry: { sessionDirFor: (s) => path.join(base, s) },
    pool: { release: async (s) => calls.released.push(s), rescan: () => { calls.rescans += 1; } },
    busy,
    sessions: { knownSlots: () => new Set(['wa-1']), notePhone: (...a) => calls.phones.push(a) },
    connectionFactory: async (opts) => behave(opts, base),
  });
  return { mgr, states, calls, busy, base };
}

const statuses = (states) => states.map(([, v]) => v.status);

test('QR pairing: QR published, creds finalize → PAIRED, phone stored, pool rescans', async () => {
  const { mgr, states, calls, busy } = setup((opts, base) => {
    setImmediate(async () => {
      await opts.onQr('qr-text');
      fs.mkdirSync(path.join(base, 'wa-1'), { recursive: true });
      fs.writeFileSync(path.join(base, 'wa-1', 'creds.json'), JSON.stringify({ me: { id: '919876543210:3@s.whatsapp.net' } }));
      opts.onOpen();
    });
    return { end() {} };
  });
  const p = mgr.handle({ slot: 'wa-1' });
  await p;
  assert.deepEqual(statuses(states), [PAIR_STATUS.STARTING, PAIR_STATUS.QR, PAIR_STATUS.PAIRED]);
  assert.equal(states[0][0], botPairKey('wa-1'));
  assert.match(states[1][1].qrSvg, /^<svg/);
  assert.deepEqual(calls.released, ['wa-1']);
  assert.deepEqual(calls.phones, [['wa-1', '919876543210', true]]);
  assert.equal(calls.rescans, 1);
  assert.equal(busy.size, 0);
});

test('phone pairing publishes a code; a 401 close fails the run', async () => {
  const { mgr, states } = setup((opts) => {
    const sock = { end() {}, requestPairingCode: async () => 'ABCD-1234' };
    setImmediate(async () => {
      await opts.onQr('qr');
      opts.onClose(401);
    });
    return sock;
  });
  await mgr.handle({ slot: 'wa-1', phone: '919876543210' });
  assert.deepEqual(statuses(states), [PAIR_STATUS.STARTING, PAIR_STATUS.CODE, PAIR_STATUS.FAILED]);
  assert.equal(states[1][1].code, 'ABCD-1234');
});

test('515 after a scan reconnects instead of failing', async () => {
  let n = 0;
  const { mgr, states } = setup((opts, base) => {
    n += 1;
    setImmediate(() => {
      if (n === 1) return opts.onClose(515);
      fs.mkdirSync(path.join(base, 'wa-1'), { recursive: true });
      fs.writeFileSync(path.join(base, 'wa-1', 'creds.json'), JSON.stringify({ me: { id: '91999:1@s.whatsapp.net' } }));
      return opts.onOpen();
    });
    return { end() {} };
  });
  await mgr.handle({ slot: 'wa-1' });
  assert.equal(n, 2);
  assert.equal(statuses(states).at(-1), PAIR_STATUS.PAIRED);
});

test('unknown slots are ignored', async () => {
  const { mgr, states } = setup(() => assert.fail('no socket'));
  await mgr.handle({ slot: 'nope' });
  assert.equal(states.length, 0);
});

test('moveAside renames a paired dir and deletes a half-paired one', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-aside-'));
  fs.mkdirSync(path.join(base, 'a'));
  fs.writeFileSync(path.join(base, 'a', 'creds.json'), JSON.stringify({ registered: true }));
  fs.mkdirSync(path.join(base, 'b'));
  moveAside(path.join(base, 'a'), 'removed');
  moveAside(path.join(base, 'b'), 'old');
  const left = fs.readdirSync(base);
  assert.equal(left.length, 1);
  assert.match(left[0], /^\.removed-a-\d+$/);
});

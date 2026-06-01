'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createSlotRegistry } = require('../slotRegistry');

test('eligibleSlots returns only paired slots, preserving order', () => {
  const paired = new Set(['slot-1', 'slot-3']);
  const reg = createSlotRegistry({
    sessionPath: '/sessions',
    slots: ['slot-1', 'slot-2', 'slot-3'],
    isPaired: (dir) => paired.has(path.basename(dir)),
  });
  assert.deepEqual(reg.eligibleSlots(), ['slot-1', 'slot-3']);
});

test('eligibleSlots is empty when nothing is paired', () => {
  const reg = createSlotRegistry({
    sessionPath: '/sessions',
    slots: ['slot-1', 'slot-2'],
    isPaired: () => false,
  });
  assert.deepEqual(reg.eligibleSlots(), []);
});

test('sessionDirFor joins sessionPath + slot label', () => {
  const reg = createSlotRegistry({ sessionPath: '/sessions', slots: ['slot-1'], isPaired: () => true });
  assert.equal(reg.sessionDirFor('slot-1'), path.join('/sessions', 'slot-1'));
});

test('default isPaired: true only when creds.json has registered:true', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-slots-'));
  // slot-ok: registered creds
  fs.mkdirSync(path.join(base, 'slot-ok'));
  fs.writeFileSync(path.join(base, 'slot-ok', 'creds.json'), JSON.stringify({ registered: true }));
  // slot-unreg: creds present but not registered
  fs.mkdirSync(path.join(base, 'slot-unreg'));
  fs.writeFileSync(path.join(base, 'slot-unreg', 'creds.json'), JSON.stringify({ registered: false }));
  // slot-corrupt: unparseable
  fs.mkdirSync(path.join(base, 'slot-corrupt'));
  fs.writeFileSync(path.join(base, 'slot-corrupt', 'creds.json'), '{not json');
  // slot-missing: no dir at all

  const reg = createSlotRegistry({
    sessionPath: base,
    slots: ['slot-ok', 'slot-unreg', 'slot-corrupt', 'slot-missing'],
  });

  assert.deepEqual(reg.eligibleSlots(), ['slot-ok']);

  fs.rmSync(base, { recursive: true, force: true });
});

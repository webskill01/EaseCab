'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { drainOffline } = require('../offlineDrain');

const logger = { info: () => {}, warn: () => {} };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PREVIEW = { content: [{ tag: 'offline_preview', attrs: { count: '350', message: '300' } }] };

test('no end marker after the preview → asks for more batches (capped) until it arrives', async () => {
  const ws = new EventEmitter();
  const sent = [];
  drainOffline(ws, async (n) => { sent.push(n.content[0].tag); }, logger, { everyMs: 10, max: 3 });
  ws.emit('CB:ib,,offline_preview', PREVIEW);
  await wait(25);
  assert.ok(sent.length >= 1 && sent.every((t) => t === 'offline_batch'));
  ws.emit('CB:ib,,offline', { content: [{ attrs: { count: '350' } }] });
  const after = sent.length;
  await wait(40);
  assert.strictEqual(sent.length, after, 'stops once WA sends the end marker');
  assert.ok(after <= 3);
});

test('end marker arrives in time → no extra batch; stop() cancels a pending ask', async () => {
  const ws = new EventEmitter();
  const sent = [];
  drainOffline(ws, async () => { sent.push(1); }, logger, { everyMs: 15 });
  ws.emit('CB:ib,,offline_preview', PREVIEW);
  ws.emit('CB:ib,,offline', {});
  const ws2 = new EventEmitter();
  const stop = drainOffline(ws2, async () => { sent.push(2); }, logger, { everyMs: 15 });
  ws2.emit('CB:ib,,offline_preview', PREVIEW);
  stop();
  await wait(40);
  assert.deepStrictEqual(sent, []);
});

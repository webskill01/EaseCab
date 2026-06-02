'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const pino = require('pino');
const { RIDES_NEW_CHANNEL, POSTED_RIDES_NEW_CHANNEL } = require('@easecab/shared');
const { createPushDispatcher } = require('../pushDispatcher');

const logger = pino({ level: 'silent' });

/** A fake ioredis subscriber: an EventEmitter that records subscribe/unsubscribe. */
function fakeSubscriber() {
  const ee = new EventEmitter();
  ee.subscribed = [];
  ee.unsubscribed = [];
  ee.subscribe = async (...ch) => { ee.subscribed.push(...ch); };
  ee.unsubscribe = async (...ch) => { ee.unsubscribed.push(...ch); };
  return ee;
}

function fakeService() {
  return { calls: [], async dispatchForRide(e) { this.calls.push(e); } };
}

test('start subscribes to both channels', async () => {
  const sub = fakeSubscriber();
  await createPushDispatcher({ subscriber: sub, service: fakeService(), logger }).start();
  assert.deepEqual(sub.subscribed.sort(), [POSTED_RIDES_NEW_CHANNEL, RIDES_NEW_CHANNEL].sort());
});

test('bot-channel event dispatches source=bot with pickup/drop city ids', async () => {
  const sub = fakeSubscriber();
  const svc = fakeService();
  await createPushDispatcher({ subscriber: sub, service: svc, logger }).start();
  sub.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ id: 'r1', pickupCityId: 'cA', dropCityId: 'cB', status: 'fresh' }));
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(svc.calls[0], { source: 'bot', rideId: 'r1', cityIds: ['cA', 'cB'] });
});

test('posted-channel event dispatches source=posted with from/to city ids', async () => {
  const sub = fakeSubscriber();
  const svc = fakeService();
  await createPushDispatcher({ subscriber: sub, service: svc, logger }).start();
  sub.emit('message', POSTED_RIDES_NEW_CHANNEL, JSON.stringify({ id: 'p1', fromCityId: 'cX', toCityId: 'cY' }));
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(svc.calls[0], { source: 'posted', rideId: 'p1', cityIds: ['cX', 'cY'] });
});

test('malformed json, missing id, and unrelated channels are ignored', async () => {
  const sub = fakeSubscriber();
  const svc = fakeService();
  await createPushDispatcher({ subscriber: sub, service: svc, logger }).start();
  sub.emit('message', RIDES_NEW_CHANNEL, 'not json{');
  sub.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ pickupCityId: 'cA' })); // no id
  sub.emit('message', 'easecab:something:else', JSON.stringify({ id: 'r9' }));
  await new Promise((r) => setImmediate(r));
  assert.equal(svc.calls.length, 0);
});

test('a service failure is swallowed (subscriber stays alive)', async () => {
  const sub = fakeSubscriber();
  const svc = { async dispatchForRide() { throw new Error('boom'); } };
  await createPushDispatcher({ subscriber: sub, service: svc, logger }).start();
  // emit must not throw / reject — the dispatcher catches and logs
  await assert.doesNotReject(async () => {
    sub.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ id: 'r1', pickupCityId: 'cA' }));
    await new Promise((r) => setImmediate(r));
  });
});

test('start is idempotent; close unsubscribes both channels', async () => {
  const sub = fakeSubscriber();
  const d = createPushDispatcher({ subscriber: sub, service: fakeService(), logger });
  await d.start();
  await d.start(); // second start is a no-op
  assert.equal(sub.subscribed.length, 2);
  await d.close();
  assert.deepEqual(sub.unsubscribed.sort(), [POSTED_RIDES_NEW_CHANNEL, RIDES_NEW_CHANNEL].sort());
});

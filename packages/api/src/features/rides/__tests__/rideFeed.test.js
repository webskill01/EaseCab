'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { createRideFeed } = require('../rideFeed');
const { RIDES_NEW_CHANNEL } = require('@easecab/shared');

/** A subscriber double: an EventEmitter that records subscribe/unsubscribe calls. */
function fakeSubscriber() {
  const ee = new EventEmitter();
  ee.subscribed = [];
  ee.unsubscribed = [];
  ee.subscribe = async (ch) => { ee.subscribed.push(ch); };
  ee.unsubscribe = async (ch) => { ee.unsubscribed.push(ch); };
  ee.removeListener = EventEmitter.prototype.removeListener.bind(ee);
  return ee;
}

const silentLogger = { warn() {}, error() {}, info() {} };

test('start subscribes to the rides channel exactly once', async () => {
  const subscriber = fakeSubscriber();
  const feed = createRideFeed({ subscriber, repo: {}, logger: silentLogger });
  await feed.start();
  await feed.start(); // idempotent
  assert.deepStrictEqual(subscriber.subscribed, [RIDES_NEW_CHANNEL]);
});

test('a published notification re-fetches by id and emits the MASKED public ride', async () => {
  const subscriber = fakeSubscriber();
  const repo = {
    findPublicRideById: async (id) => ({
      id, displayText: 'X ████', status: 'fresh',
      receivedAt: new Date(0), expiresAt: new Date(1),
      phoneNumber: '+919876543210', rawText: 'leak', // must be stripped by toPublicRide
    }),
  };
  const feed = createRideFeed({ subscriber, repo, logger: silentLogger });
  await feed.start();

  const got = [];
  feed.onRide((r) => got.push(r));
  subscriber.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ id: 'r1' }));
  await new Promise((r) => setImmediate(r)); // let the async onMessage settle

  assert.strictEqual(got.length, 1);
  assert.strictEqual(got[0].id, 'r1');
  assert.strictEqual('phoneNumber' in got[0], false);
  assert.strictEqual('rawText' in got[0], false);
});

test('ignores other channels, malformed JSON, and a fetch that returns null', async () => {
  const subscriber = fakeSubscriber();
  let fetches = 0;
  const repo = { findPublicRideById: async () => { fetches += 1; return null; } };
  const feed = createRideFeed({ subscriber, repo, logger: silentLogger });
  await feed.start();
  const got = [];
  feed.onRide((r) => got.push(r));

  subscriber.emit('message', 'some:other:channel', JSON.stringify({ id: 'x' })); // wrong channel
  subscriber.emit('message', RIDES_NEW_CHANNEL, 'not json{'); // malformed
  subscriber.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ nope: true })); // no id
  subscriber.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ id: 'gone' })); // ride deleted
  await new Promise((r) => setImmediate(r));

  assert.strictEqual(got.length, 0);
  assert.strictEqual(fetches, 1); // only the well-formed-with-id message reached the repo
});

test('a repo fetch error is swallowed (logged), never thrown on the redis callback', async () => {
  const subscriber = fakeSubscriber();
  let warned = false;
  const repo = { findPublicRideById: async () => { throw new Error('db down'); } };
  const feed = createRideFeed({ subscriber, repo, logger: { warn: () => { warned = true; }, error() {} } });
  await feed.start();
  const got = [];
  feed.onRide((r) => got.push(r));
  subscriber.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ id: 'r1' }));
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(got.length, 0);
  assert.strictEqual(warned, true);
});

test('onRide returns a working unsubscribe', async () => {
  const subscriber = fakeSubscriber();
  const repo = { findPublicRideById: async (id) => ({ id, displayText: 'x', status: 'fresh' }) };
  const feed = createRideFeed({ subscriber, repo, logger: silentLogger });
  await feed.start();
  const got = [];
  const off = feed.onRide((r) => got.push(r));
  off();
  subscriber.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ id: 'r1' }));
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(got.length, 0);
});

test('per-user connection cap: acquire up to the max, then refuse until a release', async () => {
  const { SSE_MAX_CONNECTIONS_PER_USER } = require('@easecab/shared');
  const feed = createRideFeed({ subscriber: fakeSubscriber(), repo: {}, logger: silentLogger });

  for (let i = 0; i < SSE_MAX_CONNECTIONS_PER_USER; i += 1) {
    assert.strictEqual(feed.tryAcquireConnection('u1'), true);
  }
  assert.strictEqual(feed.tryAcquireConnection('u1'), false); // at the cap
  assert.strictEqual(feed.tryAcquireConnection('u2'), true); // a different user is independent

  feed.releaseConnection('u1');
  assert.strictEqual(feed.tryAcquireConnection('u1'), true); // a slot freed up
});

test('close unsubscribes and drops listeners', async () => {
  const subscriber = fakeSubscriber();
  const feed = createRideFeed({ subscriber, repo: {}, logger: silentLogger });
  await feed.start();
  feed.onRide(() => {});
  await feed.close();
  assert.deepStrictEqual(subscriber.unsubscribed, [RIDES_NEW_CHANNEL]);
});

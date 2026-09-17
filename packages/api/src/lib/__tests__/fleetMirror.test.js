'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createFleetMirror } = require('../fleetMirror');

const PEERS = [
  { name: 'a', url: 'https://a.example/', token: 'ta', headers: { 'CF-Access-Client-Id': 'id' } },
  { name: 'b', url: 'https://b.example', token: 'tb' },
];
const reply = (status, text) => ({ ok: status < 300, status, text: async () => text });

test('post sends the fleet protocol to every peer and reports each result', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return url.startsWith('https://a') ? reply(200, '{"ok":true}') : reply(401, '{"error":"Invalid or missing token"}');
  };
  const results = await createFleetMirror({ peers: PEERS, fetchImpl }).post('/api/block/number', { input: '9876543210' });

  assert.deepStrictEqual(results, [
    { peer: 'a', ok: true },
    { peer: 'b', ok: false, error: 'Invalid or missing token' },
  ]);
  assert.strictEqual(calls[0].url, 'https://a.example/api/block/number');
  assert.strictEqual(calls[0].opts.method, 'POST');
  assert.strictEqual(calls[0].opts.headers['x-token'], 'ta');
  assert.strictEqual(calls[0].opts.headers['x-mirror'], '1');
  assert.strictEqual(calls[0].opts.headers['CF-Access-Client-Id'], 'id');
  assert.strictEqual(calls[0].opts.body, '{"input":"9876543210"}');
});

test('post never throws: HTML from an auth proxy and network errors become results', async () => {
  const fetchImpl = async (url) => {
    if (url.startsWith('https://a')) return reply(200, '<html>login</html>');
    throw new Error('ECONNREFUSED');
  };
  const results = await createFleetMirror({ peers: PEERS, fetchImpl }).post('/api/block/remove', {});
  assert.deepStrictEqual(results, [
    { peer: 'a', ok: false, error: 'not the panel API' },
    { peer: 'b', ok: false, error: 'ECONNREFUSED' },
  ]);
});

test('no peers → nothing sent', async () => {
  const results = await createFleetMirror({ peers: [], fetchImpl: async () => { throw new Error('called'); } }).post('/x', {});
  assert.deepStrictEqual(results, []);
});

test('get returns JSON and throws on a non-API answer', async () => {
  const mirror = createFleetMirror({ peers: PEERS, fetchImpl: async () => reply(200, '{"counts":{}}') });
  assert.deepStrictEqual(await mirror.get(PEERS[0], '/api/block/list'), { counts: {} });
  const bad = createFleetMirror({ peers: PEERS, fetchImpl: async () => reply(403, 'nope') });
  await assert.rejects(bad.get(PEERS[0], '/api/block/list'), /HTTP 403/);
});

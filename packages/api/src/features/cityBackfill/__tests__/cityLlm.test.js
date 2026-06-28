'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createCityLlm } = require('../cityLlm');

const silentLogger = { info() {}, warn() {}, error() {} };
const CATALOG = [
  { id: 'c-ldh', name: 'Ludhiana' },
  { id: 'c-del', name: 'Delhi' },
];

/** A fetch double returning a Gemini-shaped JSON body with the given text payload. */
function fakeFetch(text, { ok = true, status = 200 } = {}) {
  return async () => ({
    ok,
    status,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  });
}

test('maps fragments to catalog ids by index', async () => {
  const llm = createCityLlm({
    apiKey: 'k',
    fetchImpl: fakeFetch(JSON.stringify([{ i: 0, id: 'c-ldh' }, { i: 1, id: 'c-del' }])),
    logger: silentLogger,
  });
  const out = await llm.resolveBatch(['ldhana', 'dilli'], CATALOG);
  assert.strictEqual(out.get('ldhana'), 'c-ldh');
  assert.strictEqual(out.get('dilli'), 'c-del');
});

test('drops a hallucinated id not in the catalog', async () => {
  const llm = createCityLlm({
    apiKey: 'k',
    fetchImpl: fakeFetch(JSON.stringify([{ i: 0, id: 'c-MUMBAI' }])),
    logger: silentLogger,
  });
  const out = await llm.resolveBatch(['mumbai'], CATALOG);
  assert.strictEqual(out.size, 0);
});

test('keeps a null id out of the map', async () => {
  const llm = createCityLlm({
    apiKey: 'k',
    fetchImpl: fakeFetch(JSON.stringify([{ i: 0, id: null }])),
    logger: silentLogger,
  });
  const out = await llm.resolveBatch(['gibberish'], CATALOG);
  assert.strictEqual(out.size, 0);
});

test('no API key → inert, no fetch call', async () => {
  let called = false;
  const llm = createCityLlm({ apiKey: null, fetchImpl: async () => { called = true; }, logger: silentLogger });
  const out = await llm.resolveBatch(['ldhana'], CATALOG);
  assert.strictEqual(out.size, 0);
  assert.strictEqual(called, false);
});

test('PII guard: a fragment with a phone-length digit run is never sent', async () => {
  let sentBody = null;
  const fetchImpl = async (_url, opts) => {
    sentBody = opts.body;
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[]' }] } }] }) };
  };
  const llm = createCityLlm({ apiKey: 'k', fetchImpl, logger: silentLogger });
  await llm.resolveBatch(['9876543210', 'ldhana'], CATALOG);
  assert.ok(!sentBody.includes('9876543210'), 'phone-like fragment must be scrubbed before the request');
  assert.ok(sentBody.includes('ldhana'), 'clean fragment is still sent');
});

test('non-200 degrades to empty map (no throw)', async () => {
  const llm = createCityLlm({ apiKey: 'k', fetchImpl: fakeFetch('', { ok: false, status: 429 }), logger: silentLogger });
  const out = await llm.resolveBatch(['ldhana'], CATALOG);
  assert.strictEqual(out.size, 0);
});

test('malformed JSON degrades to empty map (no throw)', async () => {
  const llm = createCityLlm({ apiKey: 'k', fetchImpl: fakeFetch('not json'), logger: silentLogger });
  const out = await llm.resolveBatch(['ldhana'], CATALOG);
  assert.strictEqual(out.size, 0);
});

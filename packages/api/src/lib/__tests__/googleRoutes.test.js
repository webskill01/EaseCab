'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { decodePolyline, createGoogleRoutesClient } = require('../googleRoutes');

test('decodePolyline: Google reference example', () => {
  assert.deepStrictEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
});

test('computeRoute: posts key + field mask, maps km/min; null when no route; throws on HTTP error', async (t) => {
  let sent;
  const reply = (status, body) => async (url, init) => { sent = { url, init }; return { ok: status === 200, status, json: async () => body }; };
  const client = createGoogleRoutesClient({ apiKey: 'k'.repeat(39) });
  const from = { lat: 30.34, lng: 76.39 };
  const to = { lat: 30.73, lng: 76.78 };

  t.mock.method(global, 'fetch', reply(200, { routes: [{ distanceMeters: 67890, duration: '5430s', polyline: { encodedPolyline: 'abc' } }] }));
  assert.deepStrictEqual(await client.computeRoute(from, to), { encoded: 'abc', distanceKm: 67.9, durationMin: 91 });
  assert.strictEqual(sent.init.headers['X-Goog-Api-Key'], 'k'.repeat(39));
  assert.strictEqual(JSON.parse(sent.init.body).routingPreference, 'TRAFFIC_UNAWARE');

  t.mock.method(global, 'fetch', reply(200, {}));
  assert.strictEqual(await client.computeRoute(from, to), null);

  t.mock.method(global, 'fetch', reply(403, {}));
  await assert.rejects(client.computeRoute(from, to), /google routes 403/);
});

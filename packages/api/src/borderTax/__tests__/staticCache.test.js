'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createStaticCache, cacheable } = require('../flows/staticCache');

const fakeRoute = (url, { method = 'GET', cc = '', drop = false } = {}) => {
  const out = { fetched: 0, fulfilled: null, fellBack: false };
  out.route = {
    request: () => ({ url: () => url, method: () => method }),
    fetch: async () => { out.fetched += 1; if (drop) throw new Error('socket disconnected'); return { status: () => 200, headers: () => ({ 'cache-control': cc }), body: async () => Buffer.from('jq') }; },
    fulfill: async (o) => { out.fulfilled = o; },
    fallback: async () => { out.fellBack = true; },
  };
  return out;
};
const run = async (c, url, o) => { const r = fakeRoute(url, o); await c.handle(r.route); return r; };

test('captchas are never cacheable; libraries and content-hashed images are', () => {
  const ok = (s) => cacheable(new URL(s));
  assert.ok(ok('https://egrashry.nic.in/js/jquery.min.js'));
  assert.ok(ok('https://services.parivahan.gov.in/checkpostv4/checkpost-banner.933660aa8032ad12.png'));
  assert.ok(!ok('https://vahan.parivahan.gov.in/vahanservice/captchaImage.png'), 'captcha by name');
  assert.ok(!ok('https://egrashry.nic.in/Captcha.aspx?x=1.js'), 'captcha anywhere in the URL');
  assert.ok(!ok('https://services.parivahan.gov.in/checkpostv4/img/banner.png'), 'unhashed image');
  assert.ok(!ok('https://egrashry.nic.in/webpages/EgEChallan_Excise.aspx'), 'pages');
});

test('fetched once then served from memory until the TTL; no-store ignored (eGRAS), POST and drops fall back', async () => {
  let t = 0;
  const c = createStaticCache({ now: () => t });
  const url = 'https://egrashry.nic.in/js/jquery.min.js';
  const a = await run(c, url);
  const b = await run(c, url);
  assert.deepStrictEqual([a.fetched, b.fetched, b.fulfilled.body.toString()], [1, 0, 'jq']);
  t = 7 * 3600_000;
  assert.strictEqual((await run(c, url)).fetched, 1, 'expired copy re-fetched');
  const u2 = 'https://x.in/a.js';
  await run(c, u2, { cc: 'no-store, no-cache' });
  assert.strictEqual((await run(c, u2)).fetched, 0, 'eGRAS marks its 2012 jQuery no-store');
  const dropped = await run(c, 'https://x.in/b.js', { drop: true });
  assert.ok(dropped.fellBack && !dropped.fulfilled, 'proxy drop → browser fetches itself');
  assert.strictEqual((await run(c, 'https://x.in/b.js')).fetched, 1, 'nothing kept from a drop');
  assert.ok((await run(c, url, { method: 'POST' })).fellBack);
});

test('memory cap drops the oldest copies first', async () => {
  const c = createStaticCache({ maxBytes: 4 });
  await run(c, 'https://x.in/1.js'); await run(c, 'https://x.in/2.js'); await run(c, 'https://x.in/3.js');
  assert.deepStrictEqual([c.size(), c.bytes()], [2, 4]);
  assert.strictEqual((await run(c, 'https://x.in/1.js')).fetched, 1);
});

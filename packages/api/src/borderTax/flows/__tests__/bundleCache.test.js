'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createBundleCache } = require('../bundleCache');

const MAIN = 'main.94a07c50a31c00f0.js';
const INDEX = `<link rel="stylesheet" href="styles.f33f77ece5c33eff.css"><script src="assets/js/main.js"></script>
  <script src="runtime.819bd49b4098c43d.js"></script><script src="${MAIN}" type="module"></script>`;
const BODY = 'window.ok = 1;';

/** Fake checkpostv4: `mode` picks how main.<hash>.js is served. */
async function portal(t) {
  const srv = { mode: 'ok', mainHits: 0 };
  const server = http.createServer((req, res) => {
    if (req.url === '/') return res.end(srv.mode === 'odd' ? '<p>new layout</p>' : INDEX);
    if (req.url === '/page.html') return res.end(`<script src="${MAIN}"></script>`);
    if (req.url !== `/${MAIN}`) return res.end('/* small */');
    srv.mainHits += 1;
    if (srv.mode === 'slow') { res.write('window.ok'); return setTimeout(() => res.end(' = 1;'), 800); } // 2026-11-21: minutes, not 800ms
    if (srv.mode === 'cut') { res.writeHead(200, { 'content-length': 999 }); res.write('window.ok'); return res.destroy(); }
    return res.end(BODY);
  }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  srv.base = `http://127.0.0.1:${server.address().port}/`;
  srv.stop = () => { server.closeAllConnections(); server.close(); };
  return srv;
}
const tmpDir = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundles-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('bundle cache: slow main bundle → not ready yet, keeps downloading, next check ready from disk', async (t) => {
  const srv = await portal(t);
  const dir = tmpDir(t);
  const cache = createBundleCache({ base: srv.base, dir, log: () => {} });
  srv.mode = 'slow';
  assert.strictEqual(await cache.ready(200), false);
  await wait(1000);
  assert.strictEqual(fs.readFileSync(path.join(dir, MAIN), 'utf8'), BODY);
  srv.mode = 'cut'; // portal now worse: no matter, the copy is on disk
  assert.strictEqual(await cache.ready(200), true);
  assert.strictEqual(srv.mainHits, 1);
});

test('bundle cache: a cut-off download is never cached (it would break every filing)', async (t) => {
  const srv = await portal(t);
  const dir = tmpDir(t);
  const logs = [];
  const cache = createBundleCache({ base: srv.base, dir, log: (m) => logs.push(m) });
  srv.mode = 'cut';
  assert.strictEqual(await cache.ready(1000), false);
  assert.ok(!fs.existsSync(path.join(dir, MAIN)));
  assert.ok(logs.some((m) => m.includes(MAIN)), logs.join('\n'));
});

test('bundle cache: index without main.js → ready (our parser never blocks filings); portal unreachable → not', async (t) => {
  const srv = await portal(t);
  const cache = createBundleCache({ base: srv.base, dir: tmpDir(t), log: () => {} });
  srv.mode = 'odd';
  assert.strictEqual(await cache.ready(1000), true);
  srv.stop();
  assert.strictEqual(await cache.ready(1000), false);
});

test('bundle cache: browser context gets the cached main bundle from disk, not the portal', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  let browser;
  try { browser = await chromium.launch(); } catch { return t.skip('chromium not installed'); } // CI has none
  t.after(() => browser.close());
  const srv = await portal(t);
  const cache = createBundleCache({ base: srv.base, dir: tmpDir(t), log: () => {} });
  assert.strictEqual(await cache.ready(2000), true);
  assert.strictEqual(srv.mainHits, 1);
  const context = await browser.newContext();
  await cache.serve(context);
  const page = await context.newPage();
  await page.goto(`${srv.base}page.html`);
  assert.strictEqual(await page.evaluate("window.ok"), 1);
  assert.strictEqual(srv.mainHits, 1, 'served from disk');
});

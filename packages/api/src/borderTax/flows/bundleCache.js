'use strict';

/**
 * Local copy of checkpostv4's app bundles. Since 2026-11-19 the portal serves main.<hash>.js as 4.9 MB uncompressed
 * at 9–37 KB/s (2–9 min) while the index answers in 1s; drivers' browsers have it cached, our fresh per-filing
 * Chromium context never did → "checkpost form never loaded". Files are downloaded once (no time pressure) and
 * every filing's context is served from disk. Names carry a content hash, so a copy can never be stale: a portal
 * release changes the name and the new file is downloaded once.
 */
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');
const { BORDER_TAX } = require('@easecab/shared');

const CHECKPOST = 'https://services.parivahan.gov.in/checkpostv4/';
const HASHED = /^[\w-]+\.[0-9a-f]{16}\.(js|css)$/; // Angular build output name; [\w-] also keeps paths out
const TYPES = Object.freeze({ js: 'application/javascript', css: 'text/css' });
const DOWNLOAD_MS = 15 * 60_000; // whole-file limit for the slow background download, not the filing's wait

/**
 * @param {{ base?: string, dir?: string, log?: (m: string) => void }} [opts]
 */
function createBundleCache({
  base = CHECKPOST,
  dir = path.join(os.homedir(), '.cache', 'easecab-checkpost'), // ponytail: old hashes never pruned (~5 MB per portal release)
  log = (m) => console.warn(`checkpost bundle: ${m}`),
} = {}) {
  const pending = new Map(); // name → download promise, shared by every filing and the watcher
  const file = (name) => path.join(dir, name);
  const has = (name) => fs.access(file(name)).then(() => true, () => false);

  async function fetchFile(name) {
    try {
      const r = await fetch(new URL(name, base), { signal: AbortSignal.timeout(DOWNLOAD_MS) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = Buffer.from(await r.arrayBuffer());
      const len = Number(r.headers.get('content-length'));
      if (len && body.length !== len) throw new Error(`short body ${body.length}/${len}`); // a cut file would break every filing
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(`${file(name)}.part`, body);
      await fs.rename(`${file(name)}.part`, file(name));
      return true;
    } catch (e) {
      log(`${name} download failed: ${e.message}`);
      return false;
    } finally {
      pending.delete(name);
    }
  }
  const download = (name) => { if (!pending.has(name)) pending.set(name, fetchFile(name)); return pending.get(name); };

  /**
   * Portal usable for a filing: index answers and its main bundle is on disk (or arrives within `ms`). A missing
   * bundle keeps downloading in the background, so a later filing / watcher tick finds it.
   * @returns {Promise<boolean>}
   */
  async function ready(ms = BORDER_TAX.CHECKPOST_UP_MS) {
    let names;
    try {
      const html = await (await fetch(base, { signal: AbortSignal.timeout(ms) })).text();
      names = [...html.matchAll(/(?:src|href)="([^"/]+)"/g)].map((m) => m[1]).filter((n) => HASHED.test(n));
    } catch (e) {
      return /CERT|SELF_SIGNED|UNABLE_TO_/.test(e.cause?.code || ''); // Node-side TLS quirk: let Chromium decide
    }
    const main = names.find((n) => n.startsWith('main.'));
    if (!main) return true; // layout changed: don't block filings on our own parser
    const all = Promise.all(names.map(async (n) => (await has(n)) || download(n)));
    return Promise.race([all.then(() => has(main)), sleep(ms, false, { ref: false })]);
  }

  /** Serves cached bundles to this browser context; anything not cached goes to the portal as usual. */
  async function serve(context) {
    const nameOf = (u) => u.pathname.split('/').pop();
    await context.route((u) => u.href.startsWith(base) && HASHED.test(nameOf(u)), async (route) => {
      const name = nameOf(new URL(route.request().url()));
      const body = await fs.readFile(file(name)).catch(() => null);
      if (!body) return route.fallback();
      return route.fulfill({ body, contentType: TYPES[name.split('.').pop()] });
    });
  }

  return { ready, serve };
}

const cache = createBundleCache();

module.exports = { createBundleCache, checkpostUp: cache.ready, serveBundles: cache.serve };

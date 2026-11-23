'use strict';

/**
 * Every filing runs in a fresh browser context, so every page re-downloaded the same libraries: eGRAS's
 * jQuery + jQuery UI (282 KB) through the slow HR proxy was 5–10 s of a 15 s challan page (2026-11-23), and
 * checkpostv4's 911 KB banner came down each time. Static files are kept in memory after the first fetch and
 * served locally to every later filing (all portals: checkpost, Vahan, eTransPgi, eGRAS, PayU).
 *
 * Never cached — captchas must be fresh on every filing:
 *  - anything with "captcha" in the URL, any non-GET, any non-200
 *  - images unless the file name carries a content hash (banner.933660aa8032ad12.png): a captcha never does
 * Cache-Control is ignored on purpose: eGRAS sends no-store on its 2012 jQuery too, so the URL rule above
 * is what decides. Unhashed .js/.css expire after TTL_MS. ponytail: per-process memory, capped at MAX_BYTES (oldest out first).
 */
const TTL_MS = 6 * 3600_000;
const MAX_BYTES = 40 * 1024 * 1024;
const CODE = /\.(js|css|woff2?|ttf)$/i;
const HASHED_IMAGE = /[.-][0-9a-f]{8,}\.(png|jpe?g|gif|svg|webp)$/i;
const NEVER = /captcha/i;

/** Static file this cache may answer (URL only — the response headers are checked after the fetch). */
const cacheable = (u) => !NEVER.test(u.href) && (CODE.test(u.pathname) || HASHED_IMAGE.test(u.pathname));

function createStaticCache({ now = Date.now, maxBytes = MAX_BYTES } = {}) {
  const store = new Map(); // url → { at, status, headers, body } (insertion order = age)
  let bytes = 0;

  function keep(url, entry) {
    const old = store.get(url);
    if (old) { bytes -= old.body.length; store.delete(url); }
    store.set(url, entry);
    bytes += entry.body.length;
    for (const [k, v] of store) {
      if (bytes <= maxBytes) break;
      store.delete(k);
      bytes -= v.body.length;
    }
  }

  async function handle(route) {
    const req = route.request();
    if (req.method() !== 'GET') return route.fallback();
    const url = req.url();
    const hit = store.get(url);
    if (hit && now() - hit.at < TTL_MS) return route.fulfill({ status: hit.status, headers: hit.headers, body: hit.body });
    let res;
    try { res = await route.fetch(); } catch { return route.fallback(); } // proxy drop: let the browser try itself
    if (res.status() === 200) {
      keep(url, { at: now(), status: 200, headers: res.headers(), body: await res.body() });
    }
    return route.fulfill({ response: res });
  }

  /** Registers on a browser context; anything else falls through to the other routes / network. */
  const serve = (context) => context.route(cacheable, handle);

  return { serve, handle, size: () => store.size, bytes: () => bytes };
}

const cache = createStaticCache();

module.exports = { createStaticCache, cacheable, serveStatic: cache.serve };

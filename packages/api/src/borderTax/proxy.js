'use strict';

const { BORDER_TAX } = require('@easecab/shared');

/**
 * Playwright proxy for a filing in a PROXY_STATES state, or undefined (direct). One sticky session per
 * filing, so eGRAS → PayU keeps one IP: a "{sid}" in the username is replaced (RedScrape
 * "-session-{sid}-lifetime-30"), else "-sid-<sid>" is appended (ProxyEmpire).
 * @param {?string} url - BORDER_TAX_PROXY_URL
 * @param {{ stateCd?: string, sid?: string }} [job]
 */
function proxyFor(url, job) {
  if (!url || !job?.sid || !BORDER_TAX.PROXY_STATES.includes(job.stateCd)) return undefined;
  const u = new URL(url);
  const sid = job.sid.replace(/[^a-z0-9]/gi, '').slice(0, 12);
  const name = decodeURIComponent(u.username);
  return {
    server: `${u.protocol}//${u.host}`,
    username: name.includes('{sid}') ? name.replace('{sid}', sid) : `${name}-sid-${sid}`,
    password: decodeURIComponent(u.password),
    bypass: BORDER_TAX.PROXY_BYPASS,
  };
}

module.exports = { proxyFor };

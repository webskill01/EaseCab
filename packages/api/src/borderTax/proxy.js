'use strict';

const { BORDER_TAX } = require('@easecab/shared');

/**
 * Playwright proxy for a filing in a PROXY_STATES state, or undefined (direct). One sticky session per
 * filing (provider "-sid-" username tag), so eGRAS → PayU keeps one IP.
 * @param {?string} url - BORDER_TAX_PROXY_URL
 * @param {{ stateCd?: string, sid?: string }} [job]
 */
function proxyFor(url, job) {
  if (!url || !job?.sid || !BORDER_TAX.PROXY_STATES.includes(job.stateCd)) return undefined;
  const u = new URL(url);
  const sid = job.sid.replace(/[^a-z0-9]/gi, '').slice(0, 12);
  return {
    server: `${u.protocol}//${u.host}`,
    username: `${decodeURIComponent(u.username)}-sid-${sid}`,
    password: decodeURIComponent(u.password),
    bypass: BORDER_TAX.PROXY_BYPASS,
  };
}

module.exports = { proxyFor };

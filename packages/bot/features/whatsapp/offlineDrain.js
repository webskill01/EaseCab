'use strict';

const { BOT_HEALTH } = require('@easecab/shared');

const BATCH = Object.freeze({ tag: 'ib', attrs: {}, content: [{ tag: 'offline_batch', attrs: { count: '100' } }] });

/**
 * After a reconnect WA announces its offline queue (offline_preview) and Baileys asks for ONE batch of
 * 100. If more is queued the end marker (ib offline) may never come and the slot hears nothing — the
 * suspected Admin "ghost" after a code-500 close (2026-11-13; Baileys 6.7.24 + 7.0-rc do the same).
 * Logs the preview counts (numbers only) and keeps asking until the marker arrives.
 * ponytail: capped at OFFLINE_BATCH_MAX asks; re-link stays the fallback if this is not the cause.
 * @param {{ on: Function }} ws - Baileys sock.ws (emits 'CB:<tag>,,<child>' frames)
 * @param {(node: object) => Promise<void>} sendNode
 * @param {{ info: Function, warn: Function }} logger
 * @param {{ everyMs?: number, max?: number }} [opts]
 * @returns {() => void} stop (call on close)
 */
function drainOffline(ws, sendNode, logger, { everyMs = BOT_HEALTH.OFFLINE_BATCH_MS, max = BOT_HEALTH.OFFLINE_BATCH_MAX } = {}) {
  let timer = null;
  let done = false;
  let asks = 0;
  const stop = () => { done = true; clearTimeout(timer); };
  const ask = () => {
    if (done) return;
    if (asks >= max) return void logger.warn({ asks }, 'wa offline: queue never finished — re-link if the slot stays silent');
    asks += 1;
    logger.warn({ asks }, 'wa offline: no end marker yet — asking for the next batch');
    sendNode(BATCH).catch((err) => logger.warn({ err: err.message }, 'wa offline: batch request failed'));
    timer = setTimeout(ask, everyMs);
  };
  ws.on('CB:ib,,offline_preview', (node) => {
    const preview = (Array.isArray(node?.content) && node.content[0]?.attrs) || {};
    logger.info({ preview }, 'wa offline preview');
    clearTimeout(timer);
    timer = setTimeout(ask, everyMs);
  });
  ws.on('CB:ib,,offline', (node) => {
    const count = Array.isArray(node?.content) ? node.content[0]?.attrs?.count : undefined;
    logger.info({ count, asks }, 'wa offline done');
    stop();
  });
  return stop;
}

module.exports = { drainOffline };

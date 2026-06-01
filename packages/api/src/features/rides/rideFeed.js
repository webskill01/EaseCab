'use strict';

const { EventEmitter } = require('node:events');
const { RIDES_NEW_CHANNEL } = require('@easecab/shared');
const { toPublicRide } = require('./rides.service');

/**
 * In-process fan-out for the live ride feed (CLAUDE.md §12). The bot publishes a
 * NOTIFICATION ONLY on `easecab:rides:new` (`{ id, ... }`), so on each message we
 * re-fetch the masked public projection by id and emit it to every connected SSE
 * client. ONE Redis subscriber connection backs N HTTP clients — the dedicated
 * `subscriber` is a `redis.duplicate()` (a connection in subscriber mode can't run
 * normal commands, so it must be separate from the app's main redis).
 *
 * @param {object} deps
 * @param {import('ioredis').Redis} deps.subscriber - dedicated subscriber connection
 * @param {ReturnType<import('./rides.repository').createRidesRepository>} deps.repo
 * @param {import('pino').Logger} deps.logger
 */
function createRideFeed({ subscriber, repo, logger }) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0); // unbounded SSE clients — don't warn
  let started = false;

  async function onMessage(channel, raw) {
    if (channel !== RIDES_NEW_CHANNEL) return;
    let id;
    try {
      ({ id } = JSON.parse(raw));
    } catch {
      return; // malformed publish — ignore, never throw on the redis callback
    }
    if (!id) return;
    let ride;
    try {
      ride = await repo.findPublicRideById(id);
    } catch (err) {
      logger.warn({ err: err.message, rideId: id }, 'sse: public ride fetch failed');
      return;
    }
    if (ride) emitter.emit('ride', toPublicRide(ride));
  }

  return {
    /** Subscribe to the channel once (idempotent — buildApp calls it at startup). */
    async start() {
      if (started) return;
      started = true;
      subscriber.on('message', onMessage);
      await subscriber.subscribe(RIDES_NEW_CHANNEL);
    },

    /**
     * Register an SSE client listener; returns an unsubscribe to call on disconnect.
     * @param {(ride: object) => void} listener
     * @returns {() => void}
     */
    onRide(listener) {
      emitter.on('ride', listener);
      return () => emitter.off('ride', listener);
    },

    /** Tear down on shutdown — drop all client listeners + unsubscribe. */
    async close() {
      emitter.removeAllListeners();
      subscriber.removeListener('message', onMessage);
      try {
        await subscriber.unsubscribe(RIDES_NEW_CHANNEL);
      } catch {
        // connection may already be down during shutdown — nothing to do.
      }
    },
  };
}

module.exports = { createRideFeed };

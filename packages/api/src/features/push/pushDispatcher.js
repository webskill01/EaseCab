'use strict';

const { RIDES_NEW_CHANNEL, POSTED_RIDES_NEW_CHANNEL, PUSH_SOURCE } = require('@easecab/shared');

/**
 * Live push fan-out (Step 15). Subscribes to BOTH new-ride channels on a dedicated
 * Redis subscriber (mirrors rideFeed; a subscriber-mode connection can't run normal
 * commands, so it must be separate from the app's main redis). On each event it
 * derives the source + the ride's city ids straight from the publish payload (the
 * bot already publishes pickup/drop ids; posted-ride create publishes from/to ids)
 * and asks the push service to notify the users who opted into those cities with
 * that source toggle on. Never throws on the redis callback — a bad publish or a
 * send failure must not kill the subscriber.
 *
 * @param {object} deps
 * @param {import('ioredis').Redis} deps.subscriber - dedicated subscriber connection
 * @param {ReturnType<import('./push.service').createPushService>} deps.service
 * @param {import('pino').Logger} deps.logger
 */
function createPushDispatcher({ subscriber, service, logger }) {
  let started = false;

  function parse(channel, raw) {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return null; // malformed publish — ignore, never throw on the redis callback
    }
    if (!payload || !payload.id) return null;
    if (channel === RIDES_NEW_CHANNEL) {
      return { source: PUSH_SOURCE.BOT, rideId: payload.id, cityIds: [payload.pickupCityId, payload.dropCityId] };
    }
    if (channel === POSTED_RIDES_NEW_CHANNEL) {
      return { source: PUSH_SOURCE.POSTED, rideId: payload.id, cityIds: [payload.fromCityId, payload.toCityId] };
    }
    return null; // an unrelated channel on a shared connection
  }

  async function onMessage(channel, raw) {
    const event = parse(channel, raw);
    if (!event) return;
    try {
      await service.dispatchForRide(event);
    } catch (err) {
      logger.warn({ err: err.message, rideId: event.rideId, source: event.source }, 'push dispatch failed');
    }
  }

  return {
    /** Subscribe to both channels once (idempotent — buildApp calls it at startup). */
    async start() {
      if (started) return;
      started = true;
      subscriber.on('message', onMessage);
      await subscriber.subscribe(RIDES_NEW_CHANNEL, POSTED_RIDES_NEW_CHANNEL);
    },

    /** Tear down on shutdown — detach the listener + unsubscribe. */
    async close() {
      subscriber.removeListener('message', onMessage);
      try {
        await subscriber.unsubscribe(RIDES_NEW_CHANNEL, POSTED_RIDES_NEW_CHANNEL);
      } catch {
        // connection may already be down during shutdown — nothing to do.
      }
    },
  };
}

module.exports = { createPushDispatcher };

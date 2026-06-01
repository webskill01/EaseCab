'use strict';

const express = require('express');
const { ridesListQuerySchema, rideIdParamSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

const HEARTBEAT_MS = 30_000; // §12 — 30s SSE heartbeat to hold the connection through Nginx

/**
 * Mount the /api/v1/rides routes. Every route is authed (the feed is members-only);
 * SSE auth is the same cookie `requireAuth` because EventSource cannot send custom
 * headers. Express 5 forwards async-handler rejections to the global error handler,
 * so no asyncHandler wrapper is needed.
 *
 * @param {object} deps
 * @param {ReturnType<import('./rides.service').createRidesService>} deps.service
 * @param {ReturnType<import('./rideFeed').createRideFeed>} deps.feed
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createRidesRouter({ service, feed, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  // GET /api/v1/rides — cursor-paginated visible feed.
  router.get('/', validate(ridesListQuerySchema, 'query'), async (req, res) => {
    const { rides, nextCursor } = await service.listFeed(req.valid.query);
    sendSuccess(res, { data: { rides }, meta: { nextCursor } });
  });

  // GET /api/v1/rides/stream — SSE live feed. Declared before the param route so the
  // literal path is unambiguous. Intentionally NOT async: it does no awaited work
  // and must keep the connection open rather than end after a handler resolves.
  router.get('/stream', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // tell Nginx not to buffer the stream
    });
    res.flushHeaders();
    res.write(': connected\n\n');

    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    const off = feed.onRide((ride) => {
      res.write(`event: ride\ndata: ${JSON.stringify(ride)}\n\n`);
    });

    // Immediate cleanup on client disconnect (§12) — clear the timer and detach the
    // fanout listener so a closed socket is never written to and nothing leaks.
    req.on('close', () => {
      clearInterval(heartbeat);
      off();
    });
  });

  // POST /api/v1/rides/:id/contact — soft-gated phone reveal at the action point.
  router.post('/:id/contact', validate(rideIdParamSchema, 'params'), async (req, res) => {
    const data = await service.contactRide({ userId: req.user.id, rideId: req.valid.params.id });
    sendSuccess(res, { data });
  });

  return router;
}

module.exports = { createRidesRouter };

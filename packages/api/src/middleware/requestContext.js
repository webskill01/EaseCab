'use strict';

const { randomUUID } = require('node:crypto');

/**
 * Attach a request id to every request (CLAUDE.md §9 — a requestId UUID on every
 * request). Reuses an inbound `x-request-id` (set by an upstream proxy / the web
 * app) when present, otherwise mints a UUID, and echoes it back on the response
 * so clients and logs can correlate. The http logger and error handler read
 * `req.id`.
 *
 * @type {import('express').RequestHandler}
 */
function requestContext(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}

module.exports = { requestContext };

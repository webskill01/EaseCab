'use strict';

const { AppError, ERROR_CODES } = require('@easecab/shared');

/**
 * Terminal 404 middleware — mounted after all routes. Any request that matched no
 * route becomes an AppError(NOT_FOUND) routed through the global error handler, so
 * unmatched paths get the same locked envelope as everything else (CLAUDE.md §8).
 *
 * @type {import('express').RequestHandler}
 */
function notFound(_req, _res, next) {
  next(AppError.fromCode(ERROR_CODES.NOT_FOUND));
}

module.exports = { notFound };

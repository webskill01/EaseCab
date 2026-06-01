'use strict';

const { ZodError } = require('zod');
const { AppError, ERROR_CODES, ERROR_CATALOG, HTTP_STATUS } = require('@easecab/shared');

/**
 * Reduce any thrown value to the locked error envelope. Three classes:
 *  - AppError      → its own code/status/message (operational; logged at warn).
 *  - ZodError      → 422 VALIDATION_ERROR (operational; field detail logged, never
 *                    returned — CLAUDE.md §9 keeps user messages generic).
 *  - anything else → 500 INTERNAL_ERROR with a generic message; the real error +
 *                    stack are logged at error level for the operator only.
 * @returns {{ status: number, code: string, message: string, logLevel: 'warn'|'error', detail: object }}
 */
function classify(err) {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      code: err.code,
      message: err.message,
      logLevel: 'warn',
      detail: { code: err.code },
    };
  }
  if (err instanceof ZodError) {
    const entry = ERROR_CATALOG[ERROR_CODES.VALIDATION_ERROR];
    return {
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: entry.message,
      logLevel: 'warn',
      detail: { issues: err.issues },
    };
  }
  const entry = ERROR_CATALOG[ERROR_CODES.INTERNAL_ERROR];
  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: entry.message,
    logLevel: 'error',
    detail: { err: err.message, stack: err.stack },
  };
}

/**
 * Build the single global Express error handler (CLAUDE.md §9 — all errors
 * propagate via next(err) and terminate here). If the response already started
 * streaming (e.g. SSE), it can't be reshaped — delegate to Express's default.
 *
 * @param {object} deps
 * @param {{ warn: Function, error: Function }} deps.logger
 * @returns {import('express').ErrorRequestHandler}
 */
function createErrorHandler({ logger }) {
  // eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
  return function errorHandler(err, req, res, next) {
    if (res.headersSent) {
      next(err);
      return;
    }
    const { status, code, message, logLevel, detail } = classify(err);
    logger[logLevel](
      { requestId: req.id, method: req.method, path: req.path, status, ...detail },
      'request failed',
    );
    res.status(status).json({
      success: false,
      error: { code, message },
      meta: { requestId: req.id },
    });
  };
}

module.exports = { createErrorHandler };

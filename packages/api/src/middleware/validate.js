'use strict';

/**
 * Build a middleware that validates one part of the request against a Zod schema
 * (CLAUDE.md §5 — Zod is the only type-safety layer; every external input passes
 * through it). On success the parsed (coerced, stripped) value is written to
 * `req.valid[source]` — NOT back onto `req[source]`, because in Express 5
 * `req.query`/`req.params` are read-only getters. Handlers read `req.valid.body`
 * etc. On failure the ZodError is forwarded to `next`; the global error handler
 * maps it to a 422 VALIDATION_ERROR and logs the field detail (kept out of the
 * user response, §9).
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} [source='body']
 * @returns {import('express').RequestHandler}
 */
function validate(schema, source = 'body') {
  return function validateMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.valid = req.valid || {};
    req.valid[source] = result.data;
    next();
  };
}

module.exports = { validate };

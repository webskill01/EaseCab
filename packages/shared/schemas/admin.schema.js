'use strict';

const { z } = require('zod');

/**
 * Admin auth request schemas (CLAUDE.md §5 — Zod validates every external input).
 * Validated against `req.body` by the `validate` middleware; the handler reads
 * `req.valid.body`. Unknown keys are stripped (default), never rejected.
 */
const adminLoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

module.exports = { adminLoginSchema };

'use strict';

const { z } = require('zod');

/**
 * Auth request schemas (CLAUDE.md §5 — Zod validates every external input).
 * Phone is Indian E.164: +91 then a 10-digit mobile starting 6-9. `.strict()` is
 * NOT used (default strip) so unknown keys are dropped, never rejected.
 */
const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'phone must be +91 followed by a 10-digit mobile'),
});

/** Firebase ID token posted by the client after it completes Firebase phone auth. */
const verifyOtpSchema = z.object({
  idToken: z.string().min(10, 'idToken is required'),
});

module.exports = { sendOtpSchema, verifyOtpSchema };

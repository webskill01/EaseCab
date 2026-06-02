'use strict';

const { z } = require('zod');

/**
 * Verification request bodies (CLAUDE.md §5 — Zod on every external input).
 * The doc NUMBERS never get persisted (§10 PII); they pass through to Surepass
 * only. Formats kept deliberately loose — Surepass is the authority — but tight
 * enough to reject obvious garbage before a paid vendor call.
 */
const aadhaarOtpSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/),
});

const aadhaarVerifySchema = z.object({
  clientId: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/),
});

const dlSchema = z.object({
  dlNumber: z.string().min(5).max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const rcSchema = z.object({
  rcNumber: z.string().min(4).max(15),
});

module.exports = { aadhaarOtpSchema, aadhaarVerifySchema, dlSchema, rcSchema };

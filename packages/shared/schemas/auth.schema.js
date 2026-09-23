'use strict';

const { z } = require('zod');

/**
 * Auth request schemas (CLAUDE.md §5 — Zod validates every external input).
 * Phone is Indian E.164: +91 then a 10-digit mobile starting 6-9. `.strict()` is
 * NOT used (default strip) so unknown keys are dropped, never rejected.
 */
const phone = z.string().regex(/^\+91[6-9]\d{9}$/, 'phone must be +91 followed by a 10-digit mobile');

const sendOtpSchema = z.object({ phone });

/**
 * Either a Firebase ID token (legacy client-side phone auth) or phone + the 6-digit
 * code the API sent via 2Factor (Phase 16.5). Both stay accepted so installed clients
 * on the old bundle keep working across the cut-over.
 */
const verifyOtpSchema = z.union([
  z.object({ idToken: z.string().min(10, 'idToken is required') }),
  z.object({ phone, otp: z.string().regex(/^\d{6}$/, 'otp must be 6 digits') }),
]);

module.exports = { sendOtpSchema, verifyOtpSchema };

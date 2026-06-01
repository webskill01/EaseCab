'use strict';

const { z } = require('zod');

/**
 * Environment contract for @easecab/api. Validated at startup; the process exits
 * on failure (CLAUDE.md §3). The cron worker uses only the pooled DATABASE_URL
 * (pgBouncer :6543) — it runs no migrations and, by design, no Redis (status
 * transitions are pure DB; SSE push lives in the Phase-3 server). The Express
 * server step (Phase 3) extends this schema with REDIS_URL, JWT secrets, etc.
 */
const envSchema = z.object({
  // Pooled connection (pgBouncer :6543) — the cron never runs migrations.
  DATABASE_URL: z.string().url(),
});

/**
 * Validate a raw env object without throwing or exiting.
 * @param {Record<string, unknown>} raw - typically process.env
 * @returns {{ success: true, data: object } | { success: false, errors: string[] }}
 *   On success, `data` is frozen. On failure, `errors` are human-readable lines
 *   each naming the offending variable (names only — no values leaked).
 */
function parseEnv(raw) {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    return { success: false, errors };
  }
  return { success: true, data: Object.freeze(result.data) };
}

module.exports = { envSchema, parseEnv };

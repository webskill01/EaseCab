'use strict';

const { z } = require('zod');

/**
 * Environment contract for @easecab/api. Validated at startup; the process exits
 * on failure (CLAUDE.md §3). The cron worker uses the pooled DATABASE_URL
 * (pgBouncer :6543) — it runs no migrations — plus REDIS_URL for the Phase-2.5
 * stale-feed watcher (reads the bot's `easecab:bot:last_ingest_at` heartbeat).
 * This supersedes the earlier "cron = pure DB" decision (see DECISIONS.md
 * 2026-06-01). The Express server step (Phase 3) extends this with JWT secrets etc.
 */
const envSchema = z.object({
  // Pooled connection (pgBouncer :6543) — the cron never runs migrations.
  DATABASE_URL: z.string().url(),
  // Shared VPS Redis — the cron stale watcher reads the bot heartbeat from here.
  REDIS_URL: z.string().url(),
  // Bot-feed health (Phase 2.5 6b/6d). Defaults mirror shared BOT_HEALTH.
  BOT_FEED_ENABLED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  STALE_AFTER_MIN: z.coerce.number().int().positive().default(20),
  ACTIVE_HOUR_START_IST: z.coerce.number().int().min(0).max(23).default(6),
  ACTIVE_HOUR_END_IST: z.coerce.number().int().min(1).max(24).default(23),
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

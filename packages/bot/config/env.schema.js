'use strict';

const { z } = require('zod');

/**
 * Environment contract for @easecab/bot (the read-only WA listener). Validated
 * at startup; the process exits on failure (CLAUDE.md §3). The bot uses only the
 * pooled DATABASE_URL — migrations (DIRECT_URL) are owned by @easecab/api.
 */
const envSchema = z.object({
  // Pooled connection (pgBouncer :6543) — the bot never runs migrations.
  DATABASE_URL: z.string().url(),
  // Shared VPS Redis (localhost-bound); keys namespaced under `easecab:`.
  REDIS_URL: z.string().url(),
  // WhatsApp group whose messages the bot ingests (e.g. `<id>@g.us`).
  WA_TARGET_GROUP_JID: z.string().min(1),
  // Baileys auth-state directory; created on first run.
  WA_SESSION_PATH: z.string().min(1).default('./.wa-session'),
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

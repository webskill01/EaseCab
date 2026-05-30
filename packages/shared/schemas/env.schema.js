'use strict';

const { z } = require('zod');

/**
 * Environment contract shared across every EaseCab process. Validated at startup;
 * the process exits on failure (CLAUDE.md §3). Add new vars here as later build
 * steps introduce them — this is foundation scope (infra vars only for now).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Pooled connection (pgBouncer :6543) used by Prisma at runtime.
  DATABASE_URL: z.string().url(),
  // Session-mode connection (:5432) used for migrations.
  DIRECT_URL: z.string().url(),
  // Shared VPS Redis (localhost-bound); keys namespaced under `easecab:`.
  REDIS_URL: z.string().url(),
});

/**
 * Validate a raw env object without throwing or exiting.
 * @param {Record<string, unknown>} raw - typically process.env
 * @returns {{ success: true, data: object } | { success: false, errors: string[] }}
 *   On success, `data` is frozen. On failure, `errors` are human-readable lines
 *   each naming the offending variable.
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

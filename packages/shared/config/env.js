'use strict';

const { parseEnv } = require('../schemas/env.schema');

/**
 * Validate process.env at startup and fail fast. Required by CLAUDE.md §3:
 * "Env vars validated at startup via Zod. Process exits immediately on failure."
 *
 * Importing this module runs validation as a side effect and exports the frozen,
 * validated config. No secret values are logged — only the names of bad vars.
 */
const result = parseEnv(process.env);

if (!result.success) {
  // eslint-disable-next-line no-console -- startup fault must reach the operator
  console.error('FATAL: invalid environment configuration:');
  for (const line of result.errors) {
    // eslint-disable-next-line no-console
    console.error(`  - ${line}`);
  }
  process.exit(1);
}

/** @type {Readonly<{ NODE_ENV: string, DATABASE_URL: string, DIRECT_URL: string, REDIS_URL: string }>} */
const env = result.data;

module.exports = { env };

'use strict';

const { parseServerEnv } = require('./env.schema');

/**
 * Validate process.env for the EXPRESS SERVER process at startup and fail fast
 * (CLAUDE.md §3). Importing this module runs validation as a side effect and
 * exports the frozen, validated config. No secret values are logged — only the
 * names of bad vars.
 *
 * The cron worker imports the lighter `./env` instead (no JWT/PORT/CORS), so the
 * two processes validate their own contracts independently.
 */
const result = parseServerEnv(process.env);

if (!result.success) {
  // eslint-disable-next-line no-console -- startup fault must reach the operator
  console.error('FATAL: invalid server environment configuration:');
  for (const line of result.errors) {
    // eslint-disable-next-line no-console
    console.error(`  - ${line}`);
  }
  process.exit(1);
}

/**
 * @type {Readonly<{
 *   DATABASE_URL: string, REDIS_URL: string,
 *   BOT_FEED_ENABLED: boolean, STALE_AFTER_MIN: number,
 *   ACTIVE_HOUR_START_IST: number, ACTIVE_HOUR_END_IST: number,
 *   NODE_ENV: 'development'|'test'|'production', PORT: number,
 *   JWT_ACCESS_SECRET: string, JWT_REFRESH_SECRET: string,
 *   JWT_ACCESS_TTL: string, JWT_REFRESH_TTL: string,
 *   CORS_ORIGINS: string[],
 *   RAZORPAY_KEY_ID: string, RAZORPAY_KEY_SECRET: string,
 *   RAZORPAY_WEBHOOK_SECRET: string,
 *   SUREPASS_TOKEN: string, SUREPASS_BASE_URL: string, SUREPASS_STUB: boolean,
 *   R2_ACCOUNT_ID: string, R2_ACCESS_KEY_ID: string, R2_SECRET_ACCESS_KEY: string,
 *   R2_BUCKET: string, R2_PUBLIC_BASE_URL: string, R2_STUB: boolean
 * }>}
 */
const serverEnv = result.data;

module.exports = { serverEnv };

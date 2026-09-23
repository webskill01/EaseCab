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
  // Gemini LLM city backfill (Phase-14 #14-6). OPTIONAL: when unset the cron's
  // backfill sweep simply no-ops (dormant feature), so the demo box runs without
  // it. Set GEMINI_API_KEY (free key from aistudio.google.com) to activate. The
  // key is backend-only and never reaches any frontend bundle (CLAUDE.md §11).
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).optional(),
});

/**
 * Default CORS allow-list (CLAUDE.md §6 — no wildcard in production). Dev/test
 * add localhost via the CORS_ORIGINS env var.
 */
const DEFAULT_CORS_ORIGINS = 'https://easecab.com,https://api.easecab.com,https://admin.easecab.com';

/**
 * Express-server contract — a superset of the base env. The Express process loads
 * THIS (via config/serverEnv.js); the cron worker loads only the base `envSchema`
 * above, so adding JWT secrets here never breaks the cron (which has none). Secrets
 * are floored at 32 chars; CORS_ORIGINS is a csv parsed into a trimmed array.
 */
const serverEnvSchema = envSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // User JWT (CLAUDE.md §3.6). Admin gets a SEPARATE secret in its own phase (§6).
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  // Admin JWT (CLAUDE.md §6, Step 24a) — SEPARATE secrets from the user JWT above so
  // the two token families are cryptographically isolated (a user token can never be
  // verified as admin). Admin sessions are shorter-lived (8h refresh vs the 30d user
  // refresh) — admins re-auth daily. These MUST differ from the JWT_* secrets.
  ADMIN_JWT_ACCESS_SECRET: z.string().min(32),
  ADMIN_JWT_REFRESH_SECRET: z.string().min(32),
  ADMIN_JWT_ACCESS_TTL: z.string().default('15m'),
  ADMIN_JWT_REFRESH_TTL: z.string().default('8h'),
  // Parent domain for the admin auth cookies (security-review M2). Set to
  // `.easecab.com` in production so the cookie reaches admin.easecab.com and the
  // Next middleware can route-gate on it. Leave UNSET in dev/test → host-only cookie
  // (shared across localhost ports already, so the middleware still works locally).
  ADMIN_COOKIE_DOMAIN: z.string().optional(),
  // Force the `secure` flag on all auth cookies independent of NODE_ENV. By default
  // `secure` tracks NODE_ENV === 'production' (server.js). The investor-demo profile
  // (Phase 9c) runs the stubbed stack over HTTPS with NODE_ENV !== 'production' (the
  // RAZORPAY/SUREPASS/R2 stubs are FATAL under production), which would otherwise emit
  // non-Secure cookies on an HTTPS origin. Set COOKIE_SECURE=true on that box to keep
  // Secure cookies without flipping NODE_ENV. Unset → preserve the NODE_ENV default.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  CORS_ORIGINS: z
    .string()
    .default(DEFAULT_CORS_ORIGINS)
    .transform((csv) => csv.split(',').map((s) => s.trim()).filter(Boolean)),
  // Firebase Admin SDK service-account creds (verify-otp). Backend only — never in
  // the frontend bundle (CLAUDE.md §11). PRIVATE_KEY holds literal "\n"; firebaseAdmin
  // restores real newlines at init.
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  // Driver KYC (Phase 19). v1 ships with verification OFF: no Surepass/Cashfree checks,
  // /verification is not mounted, and posting is gated by profile completeness alone.
  // The code stays in the tree — flip this to true when escrow/trusted-vendors lands.
  VERIFICATION_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  // Login OTP provider (Phase 16.5). firebase = legacy client-side phone auth;
  // twofactor = API sends/verifies via 2factor.in (needs the DLT-approved template).
  // Flip back to firebase to roll back — no deploy needed.
  OTP_PROVIDER: z.enum(['firebase', 'twofactor']).default('firebase'),
  TWOFACTOR_API_KEY: z.string().min(16).optional(),
  TWOFACTOR_TEMPLATE: z.string().min(1).default('easecab_login_otp_txn'),
  // Play-reviewer login for twofactor mode (replaces the Firebase console test number):
  // this phone gets no SMS and accepts OTP_TEST_CODE. Set both or neither.
  OTP_TEST_PHONE: z.string().regex(/^\+91[6-9]\d{9}$/).optional(),
  OTP_TEST_CODE: z.string().regex(/^\d{6}$/).optional(),
  // Cashfree PG (Phase 16.1, replaced Razorpay). Backend only — neither value reaches
  // the frontend bundle (§11); the browser only ever gets a payment_session_id. The
  // SECRET_KEY also signs webhooks (Cashfree has no separate webhook secret).
  CASHFREE_APP_ID: z.string().min(1),
  CASHFREE_SECRET_KEY: z.string().min(16),
  // sandbox → sandbox.cashfree.com, production → api.cashfree.com. Keys are per-env.
  CASHFREE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  // Where Cashfree sends the browser after redirect-style methods (net-banking, some UPI).
  CASHFREE_RETURN_URL: z.string().url().default('https://easecab.com/membership'),
  // STUB until activation: CASHFREE_STUB=true injects the deterministic client (every
  // order instantly paid) AND skips webhook signature verification — demo only. FATAL
  // in production (server.js). The APP_ID/SECRET above still need dummy values.
  CASHFREE_STUB: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  // Surepass KYC (Step 12). Backend only (§11) — token never reaches the frontend.
  // STUB until incorporation: set SUREPASS_STUB=true to inject the deterministic
  // client (server.js); swap to a real token at go-live with zero code change.
  SUREPASS_TOKEN: z.string().min(16),
  SUREPASS_BASE_URL: z.string().url().default('https://kyc-api.surepass.io'),
  SUREPASS_STUB: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  // Cloudflare R2 (Step 21a) — presigned uploads for DP/car/KYC images. Backend
  // only (§11/§12); the secret access key never reaches the frontend bundle. STUB
  // until the bucket exists: R2_STUB=true injects the deterministic client
  // (server.js); swap to real creds at go-live with zero code change.
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(16),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.string().url(),
  R2_STUB: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  // Fleet peer sync (Phase 17.5). FLEET_SYNC_TOKEN is what fleet control panels send
  // as x-token when mirroring a block to us; unset → the inbound /fleet API is not
  // mounted. FLEET_PEERS is a JSON array of panels we mirror admin blocks to:
  // [{"name":"fleet","url":"https://control.example.com","token":"<its admin token>"}].
  FLEET_SYNC_TOKEN: z.string().min(32).optional(),
  FLEET_PEERS: z
    .string()
    .default('[]')
    .transform((s, ctx) => {
      try {
        return JSON.parse(s);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be a JSON array' });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.object({
      name: z.string().min(1),
      url: z.string().url().startsWith('https://', 'must be https (the peer token travels in a header)'),
      token: z.string().min(1),
      headers: z.record(z.string()).optional(),
    }))),
});

/**
 * Map a Zod failure to human-readable lines that name the offending variable only
 * (never its value — CLAUDE.md §10 no-PII / no-secret-leak).
 * @param {import('zod').ZodError} error
 * @returns {string[]}
 */
function formatIssues(error) {
  return error.issues.map(
    (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
  );
}

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
    return { success: false, errors: formatIssues(result.error) };
  }
  return { success: true, data: Object.freeze(result.data) };
}

/**
 * Validate the Express-server env (base + JWT/PORT/CORS). Same contract as
 * {@link parseEnv}, against {@link serverEnvSchema}.
 * @param {Record<string, unknown>} raw - typically process.env
 * @returns {{ success: true, data: object } | { success: false, errors: string[] }}
 */
function parseServerEnv(raw) {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, errors: formatIssues(result.error) };
  }
  // Key/environment pairing (security-review L1): Cashfree sandbox App IDs start with
  // TEST, production ones never do. A mismatch fails every payment, or worse, charges
  // real money from a box that thinks it is testing — refuse to boot instead.
  const d = result.data;
  if (!d.CASHFREE_STUB && d.CASHFREE_APP_ID.startsWith('TEST') !== (d.CASHFREE_ENV === 'sandbox')) {
    return { success: false, errors: ['CASHFREE_APP_ID: does not match CASHFREE_ENV (sandbox App IDs start with TEST)'] };
  }
  if (d.OTP_PROVIDER === 'twofactor' && !d.TWOFACTOR_API_KEY) {
    return { success: false, errors: ['TWOFACTOR_API_KEY: required when OTP_PROVIDER=twofactor'] };
  }
  if (Boolean(d.OTP_TEST_PHONE) !== Boolean(d.OTP_TEST_CODE)) {
    return { success: false, errors: ['OTP_TEST_PHONE/OTP_TEST_CODE: set both or neither'] };
  }
  return { success: true, data: Object.freeze(d) };
}

module.exports = { envSchema, serverEnvSchema, parseEnv, parseServerEnv };

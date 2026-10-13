-- Remove the free trial (PHASES 20.12, 2026-10-13). Forward-only and safe while old code runs.
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'expired';
ALTER TABLE "subscriptions" ALTER COLUMN "trial_started_at" DROP NOT NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "trial_started_at" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "trial_expires_at" DROP NOT NULL;

-- End every trial (live ones included, user decision). Granted memberships are 'active' and untouched.
UPDATE "subscriptions" SET "status" = 'expired', "updated_at" = CURRENT_TIMESTAMP WHERE "status" = 'trial';

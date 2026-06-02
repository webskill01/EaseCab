-- Step 15 (Push/FCM + city targeting): per-source push toggles + GIN index for targeting.
-- ADD COLUMN BOOLEAN NOT NULL DEFAULT true is metadata-only on PG11+ (no table rewrite/lock).
-- Plain CREATE INDEX is near-zero lock on the small MVP users table; if ever re-created
-- on a large live table, do it CONCURRENTLY in a standalone migration (cannot run inside
-- a transaction). See db-review 2026-06-02 (H1) + DECISIONS.md.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notify_bot_rides" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_posted_rides" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "users_notification_cities_idx" ON "users" USING GIN ("notification_cities");

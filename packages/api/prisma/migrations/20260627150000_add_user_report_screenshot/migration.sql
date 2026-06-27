-- AlterTable: optional R2 key for evidence attached to a user report (P13-13 #2).
-- Mirrors ride_reports.screenshot_url. Additive + nullable — no backfill needed.
ALTER TABLE "user_reports" ADD COLUMN     "screenshot_url" TEXT;

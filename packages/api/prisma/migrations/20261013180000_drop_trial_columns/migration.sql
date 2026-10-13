-- Drop the legacy free-trial schema (PHASES 20.12, Deploy B). Code stopped using it in Deploy A (935ef89).
-- The USING cast fails loudly if any 'trial' row still exists (Deploy A left zero).

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('active', 'expired', 'halted', 'cancelled');
ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "SubscriptionStatus_old";
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'expired';
COMMIT;

-- DropIndex
DROP INDEX "subscriptions_trial_expires_at_idx";

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "trial_expires_at",
DROP COLUMN "trial_started_at";


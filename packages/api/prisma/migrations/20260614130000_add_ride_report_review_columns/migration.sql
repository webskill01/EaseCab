-- CreateEnum
CREATE TYPE "ReportAction" AS ENUM ('dismiss', 'remove');

-- AlterTable
ALTER TABLE "ride_reports" ADD COLUMN     "review_action" "ReportAction",
ADD COLUMN     "reviewed_by" UUID;

-- CreateIndex
CREATE INDEX "ride_reports_reviewed_by_idx" ON "ride_reports"("reviewed_by");

-- AddForeignKey
ALTER TABLE "ride_reports" ADD CONSTRAINT "ride_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

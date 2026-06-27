-- AlterTable
ALTER TABLE "users" ADD COLUMN     "flagged_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "user_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reported_user_id" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "remarks" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "review_action" "ReportAction",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_reports_reported_user_id_idx" ON "user_reports"("reported_user_id");

-- CreateIndex
CREATE INDEX "user_reports_reviewed_at_idx" ON "user_reports"("reviewed_at");

-- CreateIndex
CREATE INDEX "user_reports_reviewed_by_idx" ON "user_reports"("reviewed_by");

-- CreateIndex
CREATE INDEX "user_reports_created_at_idx" ON "user_reports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_reports_reporter_id_reported_user_id_key" ON "user_reports"("reporter_id", "reported_user_id");

-- CreateIndex
CREATE INDEX "users_flagged_at_idx" ON "users"("flagged_at");

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

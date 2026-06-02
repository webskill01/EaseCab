-- CreateEnum
CREATE TYPE "VerificationDocType" AS ENUM ('aadhaar', 'dl', 'rc');

-- CreateTable
CREATE TABLE "verification_submissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "doc_type" "VerificationDocType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'submitted',
    "surepass_ref" TEXT,
    "verified_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_submissions_user_id_idx" ON "verification_submissions"("user_id");

-- CreateIndex
CREATE INDEX "verification_submissions_status_created_at_idx" ON "verification_submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_submissions_doc_type_idx" ON "verification_submissions"("doc_type");

-- AddForeignKey
ALTER TABLE "verification_submissions" ADD CONSTRAINT "verification_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- status guard (db-review M2): a submission row is never 'none' (that value only
-- means "user has never submitted" on the users table, not on a submission row).
ALTER TABLE "verification_submissions" ADD CONSTRAINT "verification_submissions_status_not_none" CHECK ("status" <> 'none');

-- in-flight dedup (db-review H3): at most ONE pending submission per user per doc
-- type. Re-submission after rejection is allowed (filter is status = 'submitted').
-- Prisma cannot express a WHERE-filtered unique index, so it lives in raw SQL here.
CREATE UNIQUE INDEX "verification_submissions_user_doc_pending_key" ON "verification_submissions"("user_id", "doc_type") WHERE "status" = 'submitted';

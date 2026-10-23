-- CreateTable
CREATE TABLE "complimentary_members" (
    "user_id" UUID NOT NULL,
    "note" TEXT,
    "months_granted" INTEGER NOT NULL DEFAULT 0,
    "granted_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "complimentary_members_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "complimentary_members_granted_by_id_idx" ON "complimentary_members"("granted_by_id");

-- AddForeignKey
ALTER TABLE "complimentary_members" ADD CONSTRAINT "complimentary_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complimentary_members" ADD CONSTRAINT "complimentary_members_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

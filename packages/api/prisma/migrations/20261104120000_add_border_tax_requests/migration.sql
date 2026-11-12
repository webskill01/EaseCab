-- CreateTable
CREATE TABLE "border_tax_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_no" TEXT NOT NULL,
    "state_cd" TEXT NOT NULL,
    "checkpost" TEXT,
    "seats" TEXT NOT NULL,
    "permit_type" TEXT NOT NULL,
    "tax_from" TIMESTAMPTZ(6) NOT NULL,
    "tax_upto" TIMESTAMPTZ(6) NOT NULL,
    "distance_km" INTEGER,
    "status" TEXT NOT NULL,
    "tax_paise" INTEGER,
    "failure_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "border_tax_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "border_tax_requests_user_id_created_at_idx" ON "border_tax_requests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "border_tax_requests_status_idx" ON "border_tax_requests"("status");

-- CreateIndex
CREATE INDEX "border_tax_requests_created_at_idx" ON "border_tax_requests"("created_at");

-- AddForeignKey
ALTER TABLE "border_tax_requests" ADD CONSTRAINT "border_tax_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


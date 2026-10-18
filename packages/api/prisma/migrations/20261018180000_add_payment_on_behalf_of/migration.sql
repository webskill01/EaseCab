-- AlterTable
ALTER TABLE "payments" ADD COLUMN "on_behalf_of_user_id" UUID;

-- CreateIndex
CREATE INDEX "payments_on_behalf_of_user_id_idx" ON "payments"("on_behalf_of_user_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_on_behalf_of_user_id_fkey" FOREIGN KEY ("on_behalf_of_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

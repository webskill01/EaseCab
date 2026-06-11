-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('bot', 'posted');

-- DropForeignKey
ALTER TABLE "ride_contacts" DROP CONSTRAINT "ride_contacts_posted_ride_id_fkey";

-- DropForeignKey
ALTER TABLE "ride_contacts" DROP CONSTRAINT "ride_contacts_ride_id_fkey";

-- AlterTable
ALTER TABLE "ride_contacts" ADD COLUMN     "from_city_name" TEXT,
ADD COLUMN     "revealed_phone" TEXT,
ADD COLUMN     "source" "ContactSource",
ADD COLUMN     "to_city_name" TEXT,
ADD COLUMN     "vehicle_type" TEXT;

-- CreateIndex
CREATE INDEX "ride_contacts_user_id_contacted_at_idx" ON "ride_contacts"("user_id", "contacted_at");

-- AddForeignKey
ALTER TABLE "ride_contacts" ADD CONSTRAINT "ride_contacts_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_contacts" ADD CONSTRAINT "ride_contacts_posted_ride_id_fkey" FOREIGN KEY ("posted_ride_id") REFERENCES "posted_rides"("id") ON DELETE SET NULL ON UPDATE CASCADE;


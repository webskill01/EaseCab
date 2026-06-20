-- AlterTable
-- Poster identity snapshot (T3-3 Slice 2): lets the Contacted card show + link to
-- the verified poster's profile. Nullable, no FK — must outlive the source ride's
-- hard-delete, like the other ride_contacts snapshot columns.
ALTER TABLE "ride_contacts" ADD COLUMN     "poster_id" UUID,
ADD COLUMN     "poster_name" TEXT;

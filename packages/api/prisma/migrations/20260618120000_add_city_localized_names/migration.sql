-- Localized city display names for the feed (#10). Nullable, additive — existing
-- rows keep NULL and the UI falls back to canonical_name. No backfill here; the
-- seed populates them from the curated cities dataset (namePa/nameHi).
ALTER TABLE "cities" ADD COLUMN     "name_pa" TEXT,
ADD COLUMN     "name_hi" TEXT;

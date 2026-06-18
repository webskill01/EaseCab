-- Batch D: profile stats parity. Additive, nullable, forward-only (db-review: trivial PASS).
ALTER TABLE "users" ADD COLUMN "experience" INTEGER;
ALTER TABLE "users" ADD COLUMN "working_city" TEXT;

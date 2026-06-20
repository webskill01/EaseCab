-- DropIndex
-- Redundant with the unique (blocker_id, blocked_id) index, whose leading column
-- already serves blocker_id lookups + the FK cascade (db-review, P12-4c).
DROP INDEX "user_blocks_blocker_id_idx";

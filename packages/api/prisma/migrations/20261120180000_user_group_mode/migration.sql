-- Phase 31 Group Mode: per-user toggle + city groups. Additive, nullable (null = defaults, off).
-- NOTE: hand-written. A raw migrate diff here also wants to DROP the fuel tables (fuel
-- models parked in a stash while this ships) - never include those.
ALTER TABLE "users" ADD COLUMN "group_mode" JSONB;

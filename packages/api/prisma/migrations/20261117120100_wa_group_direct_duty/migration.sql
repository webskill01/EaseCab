-- Trusted groups whose duties go to Driver Duties (posted_rides) instead of the bot feed.
ALTER TABLE "wa_groups" ADD COLUMN "direct_duty" BOOLEAN NOT NULL DEFAULT false;

-- Punjab Taxi group: the first direct-duty group. Upsert, since the bot may not have recorded it yet.
INSERT INTO "wa_groups" ("id", "jid", "direct_duty")
VALUES (gen_random_uuid(), '120363423042952422@g.us', true)
ON CONFLICT ("jid") DO UPDATE SET "direct_duty" = true;

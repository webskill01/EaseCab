-- Geo-based ride alerts: the city the driver is currently in (nullable = geo alerts off).
ALTER TABLE "users" ADD COLUMN "notify_geo_city_id" UUID;

-- Plain CREATE INDEX: users is small, near-zero lock (same call as the notification_cities GIN).
CREATE INDEX "users_notify_geo_city_id_idx" ON "users"("notify_geo_city_id");

ALTER TABLE "users" ADD CONSTRAINT "users_notify_geo_city_id_fkey" FOREIGN KEY ("notify_geo_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

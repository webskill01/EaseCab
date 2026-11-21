-- Phase 30: fuel station finder (stations + driver reports).
-- CreateEnum
CREATE TYPE "FuelStationStatus" AS ENUM ('active', 'pending', 'rejected', 'closed');

-- CreateEnum
CREATE TYPE "FuelReportKind" AS ENUM ('cng_yes', 'cng_no', 'closed');

-- CreateTable
CREATE TABLE "fuel_stations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state_code" TEXT,
    "has_petrol" BOOLEAN NOT NULL DEFAULT true,
    "has_diesel" BOOLEAN NOT NULL DEFAULT true,
    "has_cng" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "source_ref" TEXT,
    "status" "FuelStationStatus" NOT NULL DEFAULT 'active',
    "added_by_id" UUID,
    "cng_confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fuel_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_station_reports" (
    "id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "FuelReportKind" NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_station_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fuel_stations_status_lat_lng_idx" ON "fuel_stations"("status", "lat", "lng");

-- CreateIndex
CREATE INDEX "fuel_stations_added_by_id_idx" ON "fuel_stations"("added_by_id");

-- CreateIndex
CREATE INDEX "fuel_stations_created_at_idx" ON "fuel_stations"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_stations_source_source_ref_key" ON "fuel_stations"("source", "source_ref");

-- CreateIndex
CREATE INDEX "fuel_station_reports_resolved_at_created_at_idx" ON "fuel_station_reports"("resolved_at", "created_at");

-- CreateIndex
CREATE INDEX "fuel_station_reports_user_id_idx" ON "fuel_station_reports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_station_reports_station_id_user_id_kind_key" ON "fuel_station_reports"("station_id", "user_id", "kind");

-- AddForeignKey
ALTER TABLE "fuel_stations" ADD CONSTRAINT "fuel_stations_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_station_reports" ADD CONSTRAINT "fuel_station_reports_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "fuel_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_station_reports" ADD CONSTRAINT "fuel_station_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


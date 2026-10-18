-- CreateTable
CREATE TABLE "ride_daily_stats" (
    "day" DATE NOT NULL,
    "rides" INTEGER NOT NULL DEFAULT 0,
    "contacted_fast" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ride_daily_stats_pkey" PRIMARY KEY ("day")
);

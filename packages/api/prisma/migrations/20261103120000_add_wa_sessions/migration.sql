-- CreateTable
CREATE TABLE "wa_sessions" (
    "id" UUID NOT NULL,
    "slot" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "rides_saved" INTEGER NOT NULL DEFAULT 0,
    "paired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wa_sessions_slot_key" ON "wa_sessions"("slot");


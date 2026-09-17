-- CreateTable
CREATE TABLE "wa_groups" (
    "id" UUID NOT NULL,
    "jid" TEXT NOT NULL,
    "name" TEXT,
    "participants" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wa_groups_jid_key" ON "wa_groups"("jid");


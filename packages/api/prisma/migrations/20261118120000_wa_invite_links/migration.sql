-- Phase 29: WhatsApp group-link catcher.
CREATE TYPE "WaInviteStatus" AS ENUM ('new', 'joined', 'avoided', 'invalid');

CREATE TABLE "wa_invite_links" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "WaInviteStatus" NOT NULL DEFAULT 'new',
    "group_jid" TEXT,
    "name" TEXT,
    "size" INTEGER,
    "seen_count" INTEGER NOT NULL DEFAULT 1,
    "source_group_jid" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_invite_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wa_invite_links_code_key" ON "wa_invite_links"("code");
CREATE INDEX "wa_invite_links_status_last_seen_at_idx" ON "wa_invite_links"("status", "last_seen_at");
CREATE INDEX "wa_invite_links_group_jid_idx" ON "wa_invite_links"("group_jid");

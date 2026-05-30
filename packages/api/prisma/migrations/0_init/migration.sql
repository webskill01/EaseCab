-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension (required by the GIN gin_trgm_ops indexes below; CityResolverService fuzzy match)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "CityType" AS ENUM ('metro', 'city', 'town', 'village', 'landmark');

-- CreateEnum
CREATE TYPE "AliasSource" AS ENUM ('migrated', 'manual', 'ai', 'inferred');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('fresh', 'booked', 'hidden');

-- CreateEnum
CREATE TYPE "PostedRideStatus" AS ENUM ('active', 'done', 'expired', 'deleted');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('none', 'submitted', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'expired', 'halted', 'cancelled');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('fake', 'spam', 'wrong_info', 'inappropriate', 'other');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image');

-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('android', 'web', 'ios');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super', 'reviewer');

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "type" "CityType" NOT NULL DEFAULT 'city',
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "population" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_aliases" (
    "id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "alias_text" TEXT NOT NULL,
    "source" "AliasSource" NOT NULL DEFAULT 'manual',
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unresolved_city_strings" (
    "id" UUID NOT NULL,
    "raw_text" TEXT NOT NULL,
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "suggested_city_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unresolved_city_strings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" UUID NOT NULL,
    "raw_text" TEXT NOT NULL,
    "display_text" TEXT NOT NULL,
    "pickup_city_id" UUID,
    "drop_city_id" UUID,
    "pickup_raw" TEXT,
    "drop_raw" TEXT,
    "phone_number" TEXT NOT NULL,
    "vehicle_type" TEXT,
    "source_group_id" TEXT,
    "source_group_name" TEXT,
    "bot_id" TEXT,
    "fingerprint" TEXT NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'fresh',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "db_delete_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_fingerprints" (
    "id" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "ride_id" UUID,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posted_rides" (
    "id" UUID NOT NULL,
    "posted_by" UUID NOT NULL,
    "from_city_id" UUID,
    "to_city_id" UUID,
    "from_city_raw" TEXT,
    "to_city_raw" TEXT,
    "vehicle_type" TEXT,
    "fare" DECIMAL(10,2),
    "ride_date" DATE,
    "ride_time" TIME(6),
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "status" "PostedRideStatus" NOT NULL DEFAULT 'active',
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posted_rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "profile_pic_url" TEXT,
    "base_city" TEXT,
    "vehicle_type" TEXT,
    "languages_spoken" TEXT[],
    "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
    "dl_submitted" BOOLEAN NOT NULL DEFAULT false,
    "rc_submitted" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'none',
    "license_url" TEXT,
    "rc_url" TEXT,
    "notification_cities" TEXT[],
    "last_known_city" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "trial_started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "paid_started_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "razorpay_sub_id" TEXT,
    "razorpay_plan_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_contacts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ride_id" UUID,
    "posted_ride_id" UUID,
    "contacted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "ride_id" UUID,
    "posted_ride_id" UUID,
    "reason" "ReportReason" NOT NULL,
    "remarks" TEXT,
    "screenshot_url" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" UUID NOT NULL,
    "posted_ride_id" UUID NOT NULL,
    "initiator_id" UUID NOT NULL,
    "poster_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'text',
    "message_text" TEXT,
    "attachment_url" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_token" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'reviewer',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cities_state_idx" ON "cities"("state");

-- CreateIndex
CREATE INDEX "cities_is_active_idx" ON "cities"("is_active");

-- CreateIndex
CREATE INDEX "cities_canonical_name_idx" ON "cities" USING GIN ("canonical_name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "cities_canonical_name_state_key" ON "cities"("canonical_name", "state");

-- CreateIndex
CREATE INDEX "city_aliases_city_id_idx" ON "city_aliases"("city_id");

-- CreateIndex
CREATE INDEX "city_aliases_alias_text_idx" ON "city_aliases" USING GIN ("alias_text" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "city_aliases_alias_text_city_id_key" ON "city_aliases"("alias_text", "city_id");

-- CreateIndex
CREATE UNIQUE INDEX "unresolved_city_strings_raw_text_key" ON "unresolved_city_strings"("raw_text");

-- CreateIndex
CREATE INDEX "unresolved_city_strings_reviewed_at_idx" ON "unresolved_city_strings"("reviewed_at");

-- CreateIndex
CREATE INDEX "unresolved_city_strings_suggested_city_id_idx" ON "unresolved_city_strings"("suggested_city_id");

-- CreateIndex
CREATE INDEX "rides_fingerprint_idx" ON "rides"("fingerprint");

-- CreateIndex
CREATE INDEX "rides_status_idx" ON "rides"("status");

-- CreateIndex
CREATE INDEX "rides_expires_at_idx" ON "rides"("expires_at");

-- CreateIndex
CREATE INDEX "rides_db_delete_at_idx" ON "rides"("db_delete_at");

-- CreateIndex
CREATE INDEX "rides_created_at_idx" ON "rides"("created_at");

-- CreateIndex
CREATE INDEX "rides_pickup_city_id_idx" ON "rides"("pickup_city_id");

-- CreateIndex
CREATE INDEX "rides_drop_city_id_idx" ON "rides"("drop_city_id");

-- CreateIndex
CREATE UNIQUE INDEX "ride_fingerprints_fingerprint_key" ON "ride_fingerprints"("fingerprint");

-- CreateIndex
CREATE INDEX "ride_fingerprints_expires_at_idx" ON "ride_fingerprints"("expires_at");

-- CreateIndex
CREATE INDEX "posted_rides_posted_by_idx" ON "posted_rides"("posted_by");

-- CreateIndex
CREATE INDEX "posted_rides_status_idx" ON "posted_rides"("status");

-- CreateIndex
CREATE INDEX "posted_rides_expires_at_idx" ON "posted_rides"("expires_at");

-- CreateIndex
CREATE INDEX "posted_rides_created_at_idx" ON "posted_rides"("created_at");

-- CreateIndex
CREATE INDEX "posted_rides_from_city_id_idx" ON "posted_rides"("from_city_id");

-- CreateIndex
CREATE INDEX "posted_rides_to_city_id_idx" ON "posted_rides"("to_city_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_is_deleted_idx" ON "users"("is_deleted");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_expires_at_idx" ON "subscriptions"("expires_at");

-- CreateIndex
CREATE INDEX "subscriptions_trial_expires_at_idx" ON "subscriptions"("trial_expires_at");

-- CreateIndex
CREATE INDEX "ride_contacts_user_id_idx" ON "ride_contacts"("user_id");

-- CreateIndex
CREATE INDEX "ride_contacts_ride_id_idx" ON "ride_contacts"("ride_id");

-- CreateIndex
CREATE INDEX "ride_contacts_posted_ride_id_idx" ON "ride_contacts"("posted_ride_id");

-- CreateIndex
CREATE UNIQUE INDEX "ride_contacts_user_id_ride_id_key" ON "ride_contacts"("user_id", "ride_id");

-- CreateIndex
CREATE UNIQUE INDEX "ride_contacts_user_id_posted_ride_id_key" ON "ride_contacts"("user_id", "posted_ride_id");

-- CreateIndex
CREATE INDEX "ride_reports_reporter_id_idx" ON "ride_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "ride_reports_ride_id_idx" ON "ride_reports"("ride_id");

-- CreateIndex
CREATE INDEX "ride_reports_posted_ride_id_idx" ON "ride_reports"("posted_ride_id");

-- CreateIndex
CREATE INDEX "ride_reports_reviewed_at_idx" ON "ride_reports"("reviewed_at");

-- CreateIndex
CREATE INDEX "ride_reports_created_at_idx" ON "ride_reports"("created_at");

-- CreateIndex
CREATE INDEX "chats_posted_ride_id_idx" ON "chats"("posted_ride_id");

-- CreateIndex
CREATE INDEX "chats_initiator_id_idx" ON "chats"("initiator_id");

-- CreateIndex
CREATE INDEX "chats_poster_id_idx" ON "chats"("poster_id");

-- CreateIndex
CREATE INDEX "chats_is_active_idx" ON "chats"("is_active");

-- CreateIndex
CREATE INDEX "chats_last_message_at_idx" ON "chats"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "chats_posted_ride_id_initiator_id_key" ON "chats"("posted_ride_id", "initiator_id");

-- CreateIndex
CREATE INDEX "chat_messages_chat_id_idx" ON "chat_messages"("chat_id");

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "chat_messages_sent_at_idx" ON "chat_messages"("sent_at");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_user_id_device_token_key" ON "push_subscriptions"("user_id", "device_token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "city_aliases" ADD CONSTRAINT "city_aliases_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unresolved_city_strings" ADD CONSTRAINT "unresolved_city_strings_suggested_city_id_fkey" FOREIGN KEY ("suggested_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_pickup_city_id_fkey" FOREIGN KEY ("pickup_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_drop_city_id_fkey" FOREIGN KEY ("drop_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posted_rides" ADD CONSTRAINT "posted_rides_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posted_rides" ADD CONSTRAINT "posted_rides_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posted_rides" ADD CONSTRAINT "posted_rides_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_contacts" ADD CONSTRAINT "ride_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_contacts" ADD CONSTRAINT "ride_contacts_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_contacts" ADD CONSTRAINT "ride_contacts_posted_ride_id_fkey" FOREIGN KEY ("posted_ride_id") REFERENCES "posted_rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_reports" ADD CONSTRAINT "ride_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_reports" ADD CONSTRAINT "ride_reports_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_reports" ADD CONSTRAINT "ride_reports_posted_ride_id_fkey" FOREIGN KEY ("posted_ride_id") REFERENCES "posted_rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_posted_ride_id_fkey" FOREIGN KEY ("posted_ride_id") REFERENCES "posted_rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_poster_id_fkey" FOREIGN KEY ("poster_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


'use strict';

/**
 * Frozen mirrors of the Prisma enums in packages/api/prisma/schema.prisma.
 * Code must reference these constants — never bare magic strings (CLAUDE.md §5).
 * Keep in exact sync with the schema; these are the single source of truth in app code.
 */

/** @see schema.prisma enum CityType */
const CITY_TYPE = Object.freeze({
  METRO: 'metro',
  CITY: 'city',
  TOWN: 'town',
  VILLAGE: 'village',
  LANDMARK: 'landmark',
});

/** @see schema.prisma enum AliasSource */
const ALIAS_SOURCE = Object.freeze({
  MIGRATED: 'migrated',
  MANUAL: 'manual',
  AI: 'ai',
  INFERRED: 'inferred',
});

/** @see schema.prisma enum RideStatus */
const RIDE_STATUS = Object.freeze({
  FRESH: 'fresh',
  BOOKED: 'booked',
  HIDDEN: 'hidden',
});

/** @see schema.prisma enum PostedRideStatus */
const POSTED_RIDE_STATUS = Object.freeze({
  ACTIVE: 'active',
  DONE: 'done',
  EXPIRED: 'expired',
  DELETED: 'deleted',
});

/** @see schema.prisma enum VerificationStatus */
const VERIFICATION_STATUS = Object.freeze({
  NONE: 'none',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

/** @see schema.prisma enum SubscriptionStatus */
const SUBSCRIPTION_STATUS = Object.freeze({
  TRIAL: 'trial',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  HALTED: 'halted',
  CANCELLED: 'cancelled',
});

/** @see schema.prisma enum ReportReason */
const REPORT_REASON = Object.freeze({
  FAKE: 'fake',
  SPAM: 'spam',
  WRONG_INFO: 'wrong_info',
  INAPPROPRIATE: 'inappropriate',
  OTHER: 'other',
});

/** @see schema.prisma enum MessageType */
const MESSAGE_TYPE = Object.freeze({
  TEXT: 'text',
  IMAGE: 'image',
});

/** @see schema.prisma enum PushPlatform */
const PUSH_PLATFORM = Object.freeze({
  ANDROID: 'android',
  WEB: 'web',
  IOS: 'ios',
});

/** @see schema.prisma enum AdminRole */
const ADMIN_ROLE = Object.freeze({
  SUPER: 'super',
  REVIEWER: 'reviewer',
});

module.exports = {
  CITY_TYPE,
  ALIAS_SOURCE,
  RIDE_STATUS,
  POSTED_RIDE_STATUS,
  VERIFICATION_STATUS,
  SUBSCRIPTION_STATUS,
  REPORT_REASON,
  MESSAGE_TYPE,
  PUSH_PLATFORM,
  ADMIN_ROLE,
};

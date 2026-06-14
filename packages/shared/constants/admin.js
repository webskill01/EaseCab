'use strict';

/** Per-document review verbs the admin verifications queue exposes (Step 24b). */
const REVIEW_ACTION = Object.freeze({ APPROVE: 'approve', REJECT: 'reject' });

/**
 * Admin verifications queue tuning. Aadhaar is auto-verified by Surepass OTP and
 * never needs human review, so the queue shows only DL + RC submissions.
 */
const ADMIN_VERIFICATIONS = Object.freeze({
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
  REJECTION_REASON_MAX: 300,
  DOC_TYPES: Object.freeze(['dl', 'rc']),
});

/** Moderation verbs the ride-reports queue exposes (Step 24c). `remove` takes the
 * reported ride down (RideStatus.hidden / PostedRideStatus.deleted). */
const REPORT_ACTION = Object.freeze({ DISMISS: 'dismiss', REMOVE: 'remove' });

/** Ride-reports queue tuning. Offset pagination is acceptable for admin (§8). */
const ADMIN_REPORTS = Object.freeze({ PAGE_SIZE: 20, MAX_PAGE_SIZE: 50 });

module.exports = { REVIEW_ACTION, ADMIN_VERIFICATIONS, REPORT_ACTION, ADMIN_REPORTS };

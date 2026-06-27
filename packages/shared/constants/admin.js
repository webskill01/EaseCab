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

/** Soft-delete verbs the user-management queue exposes (Step 24d). Flag only. */
const USER_ACTION = Object.freeze({ DELETE: 'delete', RESTORE: 'restore' });

/** User-directory queue tuning. Offset pagination is acceptable for admin (§8). */
const ADMIN_USERS = Object.freeze({ PAGE_SIZE: 20, MAX_PAGE_SIZE: 50 });

/** City-string queue verbs (Step 24e). `resolve` writes a city_aliases row (feeds
 * CityResolverService exact match); `dismiss` marks the row reviewed without aliasing. */
const CITY_STRING_ACTION = Object.freeze({ RESOLVE: 'resolve', DISMISS: 'dismiss' });

/** City-string queue tuning. Offset pagination is acceptable for admin (§8). */
const ADMIN_CITY_STRINGS = Object.freeze({ PAGE_SIZE: 20, MAX_PAGE_SIZE: 50 });

/** Unresolved-rides queue verbs: `set_city` fills a missing pickup/drop FK on a
 * live bot ride; `hide` takes the ride down (RideStatus.hidden). */
const UNRESOLVED_RIDE_ACTION = Object.freeze({ SET_CITY: 'set_city', HIDE: 'hide' });

/** Which endpoint of the ride the admin is resolving when setting a city. */
const UNRESOLVED_RIDE_SIDE = Object.freeze({ PICKUP: 'pickup', DROP: 'drop' });

/** Unresolved-rides queue tuning. Offset pagination is acceptable for admin (§8). */
const ADMIN_UNRESOLVED_RIDES = Object.freeze({ PAGE_SIZE: 20, MAX_PAGE_SIZE: 50 });

/** User-reports queue verbs (P13-13 #5). `reinstate` clears User.flaggedAt (un-hides
 * the driver's posts — the auto-hide was wrong); `uphold` keeps them flagged/hidden.
 * Both resolve the user's open reports (reviewedAt/By/Action set). */
const USER_REPORT_ACTION = Object.freeze({ REINSTATE: 'reinstate', UPHOLD: 'uphold' });

/** User-reports queue tuning. Offset pagination is acceptable for admin (§8). */
const ADMIN_USER_REPORTS = Object.freeze({ PAGE_SIZE: 20, MAX_PAGE_SIZE: 50 });

module.exports = {
  REVIEW_ACTION, ADMIN_VERIFICATIONS, REPORT_ACTION, ADMIN_REPORTS,
  USER_ACTION, ADMIN_USERS, CITY_STRING_ACTION, ADMIN_CITY_STRINGS,
  UNRESOLVED_RIDE_ACTION, UNRESOLVED_RIDE_SIDE, ADMIN_UNRESOLVED_RIDES,
  USER_REPORT_ACTION, ADMIN_USER_REPORTS,
};

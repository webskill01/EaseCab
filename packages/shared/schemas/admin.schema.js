'use strict';

const { z } = require('zod');
const {
  REVIEW_ACTION, ADMIN_VERIFICATIONS, REPORT_ACTION, ADMIN_REPORTS,
  USER_ACTION, ADMIN_USERS, CITY_STRING_ACTION, ADMIN_CITY_STRINGS,
  UNRESOLVED_RIDE_ACTION, UNRESOLVED_RIDE_SIDE, ADMIN_UNRESOLVED_RIDES,
  USER_REPORT_ACTION, ADMIN_USER_REPORTS,
} = require('../constants/admin');
const { VERIFICATION_STATUS } = require('../constants/enums');

/**
 * Admin request schemas (CLAUDE.md §5 — Zod validates every external input).
 * Validated by the `validate` middleware; handlers read `req.valid.{body,query,
 * params}`. Unknown keys are stripped (default), never rejected.
 */
const adminLoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

/** Offset pagination for the verifications queue (admin-only, §8). */
const adminVerificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(ADMIN_VERIFICATIONS.MAX_PAGE_SIZE).default(ADMIN_VERIFICATIONS.PAGE_SIZE),
});

/** Per-document approve/reject; a reason is mandatory when rejecting. */
const adminReviewActionSchema = z
  .object({
    action: z.enum([REVIEW_ACTION.APPROVE, REVIEW_ACTION.REJECT]),
    rejectionReason: z.string().trim().min(1).max(ADMIN_VERIFICATIONS.REJECTION_REASON_MAX).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === REVIEW_ACTION.REJECT && !v.rejectionReason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'rejectionReason required when rejecting' });
    }
  });

/** Manual verified-driver badge toggle (User.verificationStatus). */
const adminBadgeSchema = z.object({
  status: z.enum([VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED, VERIFICATION_STATUS.NONE]),
});

const adminSubmissionIdParamSchema = z.object({ id: z.string().uuid() });
const adminUserIdParamSchema = z.object({ userId: z.string().uuid() });

/** Offset pagination + open/resolved filter for the ride-reports queue (Step 24c). */
const adminReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(ADMIN_REPORTS.MAX_PAGE_SIZE).default(ADMIN_REPORTS.PAGE_SIZE),
  status: z.enum(['open', 'resolved']).default('open'),
});

/** Dismiss the report, or remove (take down) the reported ride. */
const adminReportActionSchema = z.object({
  action: z.enum([REPORT_ACTION.DISMISS, REPORT_ACTION.REMOVE]),
});

const adminReportIdParamSchema = z.object({ id: z.string().uuid() });

/** Offset pagination + free-text + status filter for the user directory (Step 24d). */
const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(ADMIN_USERS.MAX_PAGE_SIZE).default(ADMIN_USERS.PAGE_SIZE),
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['active', 'deleted', 'all']).default('active'),
});

/** Soft-delete or restore a user (flag only). */
const adminUserActionSchema = z.object({
  action: z.enum([USER_ACTION.DELETE, USER_ACTION.RESTORE]),
});

/** Offset pagination for the unresolved city-string queue (Step 24e). */
const adminCityStringsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(ADMIN_CITY_STRINGS.MAX_PAGE_SIZE).default(ADMIN_CITY_STRINGS.PAGE_SIZE),
});

/** Resolve (alias to a city) or dismiss; a cityId is mandatory when resolving. */
const adminCityStringActionSchema = z
  .object({
    action: z.enum([CITY_STRING_ACTION.RESOLVE, CITY_STRING_ACTION.DISMISS]),
    cityId: z.string().uuid().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === CITY_STRING_ACTION.RESOLVE && !v.cityId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cityId'], message: 'cityId required when resolving' });
    }
  });

const adminCityStringIdParamSchema = z.object({ id: z.string().uuid() });

/** Offset pagination for the unresolved-rides queue (rides missing a pickup/drop city). */
const adminUnresolvedRidesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(ADMIN_UNRESOLVED_RIDES.MAX_PAGE_SIZE).default(ADMIN_UNRESOLVED_RIDES.PAGE_SIZE),
});

/** Set a missing city (side + cityId both required) or hide the ride. */
const adminUnresolvedRideActionSchema = z
  .object({
    action: z.enum([UNRESOLVED_RIDE_ACTION.SET_CITY, UNRESOLVED_RIDE_ACTION.HIDE]),
    side: z.enum([UNRESOLVED_RIDE_SIDE.PICKUP, UNRESOLVED_RIDE_SIDE.DROP]).optional(),
    cityId: z.string().uuid().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === UNRESOLVED_RIDE_ACTION.SET_CITY) {
      if (!v.side) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['side'], message: 'side required when setting a city' });
      if (!v.cityId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cityId'], message: 'cityId required when setting a city' });
    }
  });

const adminUnresolvedRideIdParamSchema = z.object({ id: z.string().uuid() });

/** Offset pagination for the user-reports queue (P13-13 #5). The queue is just the
 * users with open (unreviewed) reports, so there's no open/resolved toggle. */
const adminUserReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(ADMIN_USER_REPORTS.MAX_PAGE_SIZE).default(ADMIN_USER_REPORTS.PAGE_SIZE),
});

/** Reinstate the user (clear flaggedAt), or uphold the flag (keep them hidden). */
const adminUserReportActionSchema = z.object({
  action: z.enum([USER_REPORT_ACTION.REINSTATE, USER_REPORT_ACTION.UPHOLD]),
});

const adminUserReportUserIdParamSchema = z.object({ userId: z.string().uuid() });

module.exports = {
  adminLoginSchema,
  adminVerificationsQuerySchema,
  adminReviewActionSchema,
  adminBadgeSchema,
  adminSubmissionIdParamSchema,
  adminUserIdParamSchema,
  adminReportsQuerySchema,
  adminReportActionSchema,
  adminReportIdParamSchema,
  adminUsersQuerySchema,
  adminUserActionSchema,
  adminCityStringsQuerySchema,
  adminCityStringActionSchema,
  adminCityStringIdParamSchema,
  adminUnresolvedRidesQuerySchema,
  adminUnresolvedRideActionSchema,
  adminUnresolvedRideIdParamSchema,
  adminUserReportsQuerySchema,
  adminUserReportActionSchema,
  adminUserReportUserIdParamSchema,
};

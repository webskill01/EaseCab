'use strict';

const { z } = require('zod');
const { REVIEW_ACTION, ADMIN_VERIFICATIONS } = require('../constants/admin');
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

module.exports = {
  adminLoginSchema,
  adminVerificationsQuerySchema,
  adminReviewActionSchema,
  adminBadgeSchema,
  adminSubmissionIdParamSchema,
  adminUserIdParamSchema,
};

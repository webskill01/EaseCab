'use strict';

const { z } = require('zod');
const { UPLOAD_PURPOSE, UPLOAD_PURPOSES } = require('../constants/uploads');

/**
 * Presign-request body (CLAUDE.md §5 — Zod on every external input). `purpose`
 * selects the policy; `contentType` must be in that purpose's allow-list. The size
 * cap is NOT here — it is enforced in the presigned-POST policy at R2's edge (§8).
 */
const uploadPresignSchema = z
  .object({
    purpose: z.enum(UPLOAD_PURPOSES),
    contentType: z.string().min(1),
  })
  .superRefine((val, ctx) => {
    const policy = UPLOAD_PURPOSE[val.purpose];
    if (policy && !policy.allowedMime.includes(val.contentType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contentType'],
        message: 'contentType is not allowed for this purpose',
      });
    }
  });

module.exports = { uploadPresignSchema };

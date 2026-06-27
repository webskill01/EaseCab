'use strict';

const { z } = require('zod');
const { REPORT_REASON } = require('../constants/enums');
const { REPORT } = require('../constants/reports');

/**
 * User-facing report body — posted from a ride/post card's Report sheet. `reason`
 * is one of the shared REPORT_REASON values; `remarks` is an optional free-text
 * note. The target id comes from the route param, not the body. `.strict()`
 * rejects unknown keys.
 */
const reportCreateSchema = z
  .object({
    reason: z.enum(Object.values(REPORT_REASON)),
    remarks: z.string().trim().min(1).max(REPORT.REMARKS_MAX).optional(),
    // Optional evidence — an R2 key from a `report_screenshot` presigned upload.
    // The server re-verifies ownership/size/MIME before storing it (§8).
    screenshotKey: z.string().trim().min(1).optional(),
  })
  .strict();

/**
 * Report a USER (verified poster) — reason + optional remark + optional screenshot.
 * The target id is the route param. `screenshotKey` is an R2 key from a
 * `report_screenshot` presigned upload; the server re-verifies it before storing
 * (§8). `.strict()` rejects unknown keys.
 */
const userReportCreateSchema = z
  .object({
    reason: z.enum(Object.values(REPORT_REASON)),
    remarks: z.string().trim().min(1).max(REPORT.REMARKS_MAX).optional(),
    screenshotKey: z.string().trim().min(1).optional(),
  })
  .strict();

module.exports = { reportCreateSchema, userReportCreateSchema };

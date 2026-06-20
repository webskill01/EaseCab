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

module.exports = { reportCreateSchema };

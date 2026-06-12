'use strict';

const { z } = require('zod');
const { VEHICLE_TYPES } = require('../constants/vehicles');
const { UPLOAD_PURPOSES } = require('../constants/uploads');

/** Canonical vehicle labels (values, not keys) — the stored/display form. */
const VEHICLE_LABELS = Object.freeze(Object.values(VEHICLE_TYPES));

/**
 * Profile-update body (CLAUDE.md §5). The onboarding/edit form submits all text
 * fields together; `dpKey` is optional because the DP may instead be attached via
 * POST /me/uploads. `bio` is required — it is an L1 completeness field.
 */
const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  bio: z.string().trim().min(1).max(300),
  baseCity: z.string().trim().min(2).max(60),
  vehicleType: z.enum(VEHICLE_LABELS),
  languagesSpoken: z.array(z.string().trim().min(1)).min(1).max(6),
  dpKey: z.string().min(1).optional(),
});

/** Image-attach body: a verified R2 key + the purpose that selects its User field. */
const imageAttachSchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES),
  key: z.string().min(1),
});

module.exports = { profileUpdateSchema, imageAttachSchema };

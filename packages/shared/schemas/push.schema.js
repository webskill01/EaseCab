'use strict';

const { z } = require('zod');
const { PUSH_PLATFORM } = require('../constants/enums');
const { PUSH } = require('../constants/push');

/** Register (upsert) an FCM device token for the authed caller. */
const registerPushTokenSchema = z
  .object({
    deviceToken: z.string().trim().min(1).max(PUSH.DEVICE_TOKEN_MAX),
    platform: z.enum(Object.values(PUSH_PLATFORM)),
  })
  .strict();

/** Unregister a device token (logout / token rotation on the client). */
const unregisterPushTokenSchema = z
  .object({
    deviceToken: z.string().trim().min(1).max(PUSH.DEVICE_TOKEN_MAX),
  })
  .strict();

/**
 * Update notification preferences. Every field is optional (PATCH semantics), but
 * at least one must be present. `notificationCities` is a bounded list of City
 * UUIDs (the targeting key); the two booleans are the per-source toggles.
 */
const pushPreferencesSchema = z
  .object({
    notificationCities: z.array(z.string().uuid()).max(PUSH.NOTIFICATION_CITIES_MAX).optional(),
    notifyBotRides: z.boolean().optional(),
    notifyPostedRides: z.boolean().optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.notificationCities !== undefined ||
      d.notifyBotRides !== undefined ||
      d.notifyPostedRides !== undefined,
    { message: 'at least one preference field is required' },
  );

module.exports = { registerPushTokenSchema, unregisterPushTokenSchema, pushPreferencesSchema };

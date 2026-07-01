'use strict';

const { AppError, ERROR_CODES, PUSH } = require('@easecab/shared');

/** Client-safe view of a registered subscription — never echoes the raw token back. */
function toPublicSubscription(s) {
  return { id: s.id, platform: s.platform, createdAt: s.createdAt };
}

/**
 * Push business logic (CLAUDE.md §4). Token registration + per-user notification
 * preferences (city opt-in list + the two per-source toggles), and the city-targeted
 * fan-out the dispatcher calls on every new-ride event. `pushSender` is the injected
 * FCM boundary (lib/fcm.js); it is only used by dispatchForRide, so a harness that
 * doesn't exercise dispatch may omit it.
 *
 * @param {object} deps
 * @param {ReturnType<import('./push.repository').createPushRepository>} deps.repo
 * @param {{ sendToTokens: Function }} [deps.pushSender]
 */
function createPushService({ repo, pushSender }) {
  return {
    /** Register (upsert) the caller's FCM device token. */
    async registerToken(userId, { deviceToken, platform }) {
      const sub = await repo.registerToken({ userId, deviceToken, platform });
      return toPublicSubscription(sub);
    },

    /** Unregister a device token (logout / rotation). */
    async unregisterToken(userId, { deviceToken }) {
      const removed = await repo.removeToken({ userId, deviceToken });
      return { removed };
    },

    /**
     * Read the caller's notification preferences. NOT_FOUND if the user is gone.
     * Also resolves the stored city UUIDs to `cities:[{id,name}]` so the settings UI
     * can render saved alert cities by name (Step 21d).
     */
    async getPreferences(userId) {
      const prefs = await repo.getPreferences(userId);
      if (!prefs) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const ids = prefs.notificationCities ?? [];
      const cities = ids.length ? await repo.listCitiesByIds(ids) : [];
      return { ...prefs, cities };
    },

    /** Update preferences; any picked city ids must exist + be active (else VALIDATION_ERROR). */
    async updatePreferences(userId, body) {
      if (body.notificationCities && body.notificationCities.length > 0) {
        const existing = await repo.findExistingCityIds(body.notificationCities);
        if (body.notificationCities.some((id) => !existing.has(id))) {
          throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
        }
      }
      return repo.updatePreferences(userId, body);
    },

    /**
     * Fan a city-targeted push out for a new ride. Called by the dispatcher on each
     * new-ride event. Prunes the tokens FCM reports as dead. Returns a summary; the
     * dispatcher logs it. (The dispatcher guards against this throwing, but it
     * shouldn't on the happy path.)
     */
    async dispatchForRide({ source, rideId, cityIds }) {
      const all = (cityIds || []).filter(Boolean);
      const empty = { targeted: 0, successCount: 0, pruned: 0 };
      // Targeting is PICKUP-only (cityIds[0]) to mirror the feed filter — a driver's
      // opted-in city must match the ride's PICKUP; the drop city never triggers an alert.
      const pickupId = all[0];
      if (!pickupId) return empty;
      const tokens = await repo.findTargetTokens({ cityIds: [pickupId], source });
      if (tokens.length === 0) return empty;
      // Resolve the ride's pickup→drop names so the notification names the actual route
      // ("Amritsar → Delhi · …") instead of a generic line — display only, both cities.
      // cityIds arrives as [pickup, drop]; fall back gracefully when only one resolves.
      const nameById = new Map((await repo.listCitiesByIds([...new Set(all)])).map((c) => [c.id, c.name]));
      const [from, to] = (cityIds || []).map((id) => nameById.get(id));
      const route = from && to && from !== to ? `${from} → ${to}` : (from || to || '');
      // Data-only payload: title/body travel in `data` so FCM does NOT auto-display
      // a second (icon-less) notification — the service worker renders the only one.
      const copy = PUSH.NOTIFICATION[source];
      const body = route ? `${route} · ${copy.body}` : copy.body;
      const { successCount, staleTokens } = await pushSender.sendToTokens({
        tokens,
        data: { type: PUSH.TYPE, source, rideId, title: copy.title, body, url: PUSH.CLICK_PATH },
      });
      const pruned = staleTokens.length > 0 ? await repo.pruneTokens(staleTokens) : 0;
      return { targeted: tokens.length, successCount, pruned };
    },
  };
}

module.exports = { createPushService, toPublicSubscription };

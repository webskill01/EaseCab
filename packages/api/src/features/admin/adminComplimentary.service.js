'use strict';

const {
  AppError, ERROR_CODES, ADMIN_FOUNDER_PAYMENTS, ADMIN_STATISTICS, SUBSCRIPTION_PLAN, isSubscriptionActive,
} = require('@easecab/shared');

const DAY_MS = 86_400_000;

/** New expiry: `months` plan periods stacked on any time still left. */
function extendBy(sub, months, now = new Date()) {
  const base = isSubscriptionActive(sub, now) ? sub.expiresAt.getTime() : now.getTime();
  return new Date(base + months * SUBSCRIPTION_PLAN.PERIOD_DAYS * DAY_MS);
}

/**
 * Free members (barter/help): give plan time without a payment and keep these users out
 * of every analytics number.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminComplimentary.repository').createAdminComplimentaryRepository>} deps.repo
 */
function createAdminComplimentaryService({ repo }) {
  return {
    /** All free members with plan status. */
    async list() {
      const rows = await repo.list();
      return rows.map((r) => ({
        userId: r.userId,
        label: r.label,
        name: r.user.name,
        phone: r.user.phone ?? null,
        note: r.note,
        monthsGranted: r.monthsGranted,
        addedAt: r.createdAt,
        validUntil: isSubscriptionActive(r.user.subscription) ? r.user.subscription.expiresAt : null,
      }));
    },

    /**
     * Mark the user with `phone` as free and add `months` of plan time (0 = only mark).
     * 404 unknown user, 422 founder or reviewer account.
     */
    async add({ phone, months, label, note }, adminId) {
      const internal = [...ADMIN_FOUNDER_PAYMENTS.COLLECTION_PHONES, ...ADMIN_STATISTICS.EXCLUDED_PHONES];
      if (internal.includes(phone)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'This is an internal account, it is already left out of stats', 422);
      }
      const user = await repo.findUserByPhone(phone);
      if (!user) throw AppError.fromCode(ERROR_CODES.NOT_FOUND, 'No user with this number — they must sign in to the app once');

      const expiresAt = months > 0 ? extendBy(user.subscription, months) : null;
      await repo.grant({ userId: user.id, months, label: label || undefined, note: note || undefined, adminId, expiresAt });
      if (expiresAt) await repo.invalidateSubCache(user.id);
      return {
        userId: user.id, name: user.name, phone,
        validUntil: expiresAt ?? (isSubscriptionActive(user.subscription) ? user.subscription.expiresAt : null),
      };
    },

    /** Take a user off the free list; they count in analytics again. 404 if not listed. */
    async remove(userId) {
      if (!(await repo.remove(userId))) throw AppError.fromCode(ERROR_CODES.NOT_FOUND, 'Not on the free list');
    },
  };
}

module.exports = { createAdminComplimentaryService, extendBy };

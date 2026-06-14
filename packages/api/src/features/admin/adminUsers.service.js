'use strict';

const { AppError, ERROR_CODES, USER_ACTION } = require('@easecab/shared');

/** Last-4 masked phone for the admin directory (full number never surfaced — §10). */
function maskPhone(phone) {
  if (!phone) return null;
  return `••••${String(phone).slice(-4)}`;
}

/** Flatten the subscription to status + a single validUntil (paid expiry else trial). */
function toSubscription(sub) {
  if (!sub) return null;
  return { status: sub.status, validUntil: sub.expiresAt ?? sub.trialExpiresAt ?? null };
}

/**
 * Admin user-directory business logic (CLAUDE.md §4). Masks the phone, flattens the
 * subscription, and applies flag-only soft-delete / restore.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminUsers.repository').createAdminUsersRepository>} deps.repo
 */
function createAdminUsersService({ repo }) {
  function toItem(row) {
    const { phone, subscription, ...rest } = row;
    return { ...rest, phoneMasked: maskPhone(phone), subscription: toSubscription(subscription) };
  }

  return {
    /** Offset-paginated user directory (filtered by status + optional q). */
    async list({ page, limit, status, q }) {
      const { rows, total } = await repo.listUsers({ page, limit, status, q });
      return { items: rows.map(toItem), total, page, limit };
    },

    /** Soft-delete or restore. NOT_FOUND if the user is gone. Returns the masked user. */
    async setStatus(id, { action }) {
      const user = await repo.findById(id);
      if (!user) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const row = await repo.setDeleted(id, action === USER_ACTION.DELETE);
      return toItem(row);
    },
  };
}

module.exports = { createAdminUsersService };

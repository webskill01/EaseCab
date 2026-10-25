'use strict';

const { AppError, ERROR_CODES, USER_ACTION } = require('@easecab/shared');

/** Flatten the subscription to status + validUntil (paid expiry). */
function toSubscription(sub) {
  if (!sub) return null;
  return { status: sub.status, validUntil: sub.expiresAt ?? null, paidStartedAt: sub.paidStartedAt ?? null };
}

/**
 * Admin user-directory business logic (CLAUDE.md §4). Flattens the
 * subscription, presigns images (best-effort: a missing key or R2 error → null), and
 * applies flag-only soft-delete / restore.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminUsers.repository').createAdminUsersRepository>} deps.repo
 * @param {{ presignGet(args: { key: string }): Promise<string> }} [deps.r2] - optional R2 client
 */
function createAdminUsersService({ repo, r2 }) {
  async function presign(key) {
    if (!key || !r2) return null;
    try {
      return await r2.presignGet({ key });
    } catch {
      return null;
    }
  }

  async function toItem(row) {
    const { subscription, profilePicUrl, ...rest } = row;
    return {
      ...rest,
      subscription: toSubscription(subscription),
      avatarUrl: await presign(profilePicUrl),
    };
  }

  async function toDetail(row) {
    const { licenseUrl, rcUrl, carFrontUrl, carBackUrl, payments, _count, ...base } = row;
    const [licence, rc, carFront, carBack] = await Promise.all([licenseUrl, rcUrl, carFrontUrl, carBackUrl].map(presign));
    return {
      ...(await toItem(base)),
      images: { licence, rc, carFront, carBack },
      payments: payments.map((p) => ({ ...p, amount: p.amount / 100 })),
      counts: _count,
    };
  }

  return {
    /** Offset-paginated user directory (filtered by status/plan/joined + optional q). */
    async list({ page, limit, status, plan, joined, q }) {
      const { rows, total } = await repo.listUsers({ page, limit, status, plan, joined, q });
      return { items: await Promise.all(rows.map(toItem)), total, page, limit };
    },

    /** Full profile for the admin user page. NOT_FOUND if the id is unknown. */
    async detail(id) {
      const row = await repo.findDetail(id);
      if (!row) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      return toDetail(row);
    },

    /** Soft-delete or restore. NOT_FOUND if the user is gone. Returns the user. */
    async setStatus(id, { action }) {
      const user = await repo.findById(id);
      if (!user) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const row = await repo.setDeleted(id, action === USER_ACTION.DELETE);
      return toItem(row);
    },
  };
}

module.exports = { createAdminUsersService };

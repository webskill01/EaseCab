'use strict';

const { REFERRAL } = require('@easecab/shared');
const { createPresign } = require('./presign');


/**
 * Admin referrals view (Phase 22): who referred whom, who has paid, which pairs were
 * already turned into free months, plus the rollout state (REFERRAL_TESTERS).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminReferrals.repository').createAdminReferralsRepository>} deps.repo
 * @param {{ all: boolean, phones: string[] }} [deps.access]
 * @param {{ presignGet(args: { key: string }): Promise<string> }} [deps.r2] - optional R2 client (DP thumbnails)
 */
function createAdminReferralsService({ repo, access = { all: false, phones: [] }, r2 }) {
  const presign = createPresign(r2);
  const person = async (u) => (u ? { id: u.id, name: u.name ?? null, phone: u.phone ?? null, avatarUrl: await presign(u.profilePicUrl) } : null);

  return {
    async list({ page, limit, q, status, sort }) {
      const { rows, matched, total, paid, rewarded, referrers } = await repo.list({ page, limit, q, status, sort });
      const items = await Promise.all(rows.map(async (r) => ({
        id: r.id,
        referee: await person(r),
        referrer: await person(r.referredBy),
        joinedAt: r.createdAt,
        paid: r._count.payments + r._count.paymentsOnBehalf > 0,
        rewarded: r.referralRewardedAt !== null,
      })));
      return {
        items,
        page,
        limit,
        total: matched,
        summary: { referrals: total, paid, referrers, monthsGranted: Math.floor(rewarded / REFERRAL.PER_REWARD) },
        rollout: { all: access.all, testers: access.phones.length },
      };
    },
  };
}

module.exports = { createAdminReferralsService };

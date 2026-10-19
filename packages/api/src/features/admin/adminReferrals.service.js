'use strict';

const { REFERRAL } = require('@easecab/shared');

/** Last-4 masked phone (full number never surfaced — §10). */
const maskPhone = (phone) => (phone ? `••••${String(phone).slice(-4)}` : null);
const person = (u) => (u ? { id: u.id, name: u.name ?? null, phoneMasked: maskPhone(u.phone) } : null);

/**
 * Admin referrals view (Phase 22): who referred whom, who has paid, which pairs were
 * already turned into free months, plus the rollout state (REFERRAL_TESTERS).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminReferrals.repository').createAdminReferralsRepository>} deps.repo
 * @param {{ all: boolean, phones: string[] }} [deps.access]
 */
function createAdminReferralsService({ repo, access = { all: false, phones: [] } }) {
  return {
    async list({ page, limit }) {
      const { rows, total, paid, rewarded, referrers } = await repo.list({ page, limit });
      const items = rows.map((r) => ({
        id: r.id,
        referee: person(r),
        referrer: person(r.referredBy),
        joinedAt: r.createdAt,
        paid: r._count.payments + r._count.paymentsOnBehalf > 0,
        rewarded: r.referralRewardedAt !== null,
      }));
      return {
        items,
        page,
        limit,
        total,
        summary: { referrals: total, paid, referrers, monthsGranted: Math.floor(rewarded / REFERRAL.PER_REWARD) },
        rollout: { all: access.all, testers: access.phones.length },
      };
    },
  };
}

module.exports = { createAdminReferralsService };

'use strict';

const { AppError, ERROR_CODES, REFERRAL, SUBSCRIPTION_PLAN, ADMIN_STATISTICS, computeRenewal } = require('@easecab/shared');

const DAY_MS = 86_400_000;

/** Is the caller still inside the "who referred you?" window? */
function canClaim(createdAt, referredBy, now) {
  return !referredBy && now - new Date(createdAt).getTime() <= REFERRAL.CLAIM_WINDOW_DAYS * DAY_MS;
}

/**
 * Referral program (Phase 22). A new driver names their referrer by mobile number within
 * CLAIM_WINDOW_DAYS of signup; every PER_REWARD referees who pay earn the referrer one
 * free plan period, stacked like a renewal. `rewardFor` runs after any payment credit,
 * founder-payment link, or claim — it is idempotent (spent referees are marked).
 *
 * @param {object} deps
 * @param {ReturnType<import('./referrals.repository').createReferralsRepository>} deps.repo
 * @param {{ sendToTokens: Function }} [deps.pushSender] - optional reward push
 * @param {{ all: boolean, phones: string[] }} [deps.access] - rollout gate (REFERRAL_TESTERS):
 *   only these users see the program and can claim. Rewards need a claim, so they follow.
 */
function createReferralsService({ repo, pushSender, access = { all: false, phones: [] } }) {
  const enabledFor = (phone) => access.all || access.phones.includes(phone);

  /** Best-effort "free month added" push; never blocks the reward. */
  async function notify(referrerId) {
    if (!pushSender) return;
    const tokens = await repo.listDeviceTokens(referrerId);
    if (!tokens.length) return;
    const { TYPE, SOURCE, TITLE, BODY, CLICK_PATH, ACTION } = REFERRAL.PUSH;
    await pushSender.sendToTokens({ tokens, data: { type: TYPE, source: SOURCE, title: TITLE, body: BODY, url: CLICK_PATH, action: ACTION } });
  }

  const service = {
    /**
     * Grant the referrer of `refereeId` every free month they have now earned.
     * @returns {Promise<{ months: number }>}
     */
    async rewardFor(refereeId) {
      const referrerId = await repo.findReferrerId(refereeId);
      if (!referrerId) return { months: 0 };
      const pending = await repo.listUnrewardedPaidReferees(referrerId);
      const months = Math.floor(pending.length / REFERRAL.PER_REWARD);
      if (months === 0) return { months: 0 };

      const { newExpiresAt, paidStartedAt } = computeRenewal(await repo.findSubscription(referrerId));
      const extra = (months - 1) * SUBSCRIPTION_PLAN.PERIOD_DAYS * DAY_MS;
      const granted = await repo.grantReward({
        referrerId,
        refereeIds: pending.slice(0, months * REFERRAL.PER_REWARD),
        newExpiresAt: new Date(newExpiresAt.getTime() + extra),
        paidStartedAt,
      });
      if (!granted) return { months: 0 }; // a concurrent call spent them first
      await repo.invalidateSubCache(referrerId);
      await notify(referrerId);
      return { months };
    },

    /** "Who referred you?" — set once, inside the window, never yourself. */
    async claim(userId, { phone }, now = Date.now()) {
      const attempts = await repo.incrClaimAttempts(userId, REFERRAL.CLAIM_RATE_LIMIT.WINDOW_SEC);
      if (attempts > REFERRAL.CLAIM_RATE_LIMIT.MAX_PER_WINDOW) throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      const me = await repo.findClaimant(userId);
      if (!enabledFor(me.phone)) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      if (me.referredById) throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Referrer already set', 409);
      if (!canClaim(me.createdAt, null, now)) throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Referral window has closed', 422);
      // Reviewer/founder can't be referrers — unless listed as a tester (pre-launch testing).
      const blocked = ADMIN_STATISTICS.EXCLUDED_PHONES.includes(phone) && !access.phones.includes(phone);
      const referrer = blocked ? null : await repo.findUserByPhone(phone);
      if (!referrer) throw AppError.fromCode(ERROR_CODES.NOT_FOUND, 'No EaseCab account with this number');
      if (referrer.id === userId) throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'You cannot refer yourself', 422);
      if (!(await repo.setReferrer({ userId, referrerId: referrer.id }))) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Referrer already set', 409);
      }
      await service.rewardFor(userId); // they may have paid before naming the referrer
      return { referrer: { name: referrer.name } };
    },

    /** The Refer & Earn screen: my referees, progress to the next free month, my own referrer.
     * `{ enabled: false }` only for users outside the rollout (the web then hides every entry point). */
    async overview(userId, now = Date.now()) {
      const { rows, me } = await repo.listReferrals(userId, REFERRAL.LIST_LIMIT);
      if (!enabledFor(me.phone)) return { enabled: false };
      const referrals = rows.map((r) => ({
        id: r.id,
        name: r.name ?? null,
        joinedAt: r.createdAt,
        paid: r._count.payments + r._count.paymentsOnBehalf > 0,
        rewarded: r.referralRewardedAt !== null,
      }));
      const rewardedCount = referrals.filter((r) => r.rewarded).length;
      return {
        enabled: true,
        referrals,
        perReward: REFERRAL.PER_REWARD,
        monthsEarned: Math.floor(rewardedCount / REFERRAL.PER_REWARD),
        towardNext: referrals.filter((r) => r.paid && !r.rewarded).length,
        referredBy: me.referredBy ? { name: me.referredBy.name ?? null } : null,
        canClaim: canClaim(me.createdAt, me.referredBy, now),
      };
    },
  };
  return service;
}

module.exports = { createReferralsService };

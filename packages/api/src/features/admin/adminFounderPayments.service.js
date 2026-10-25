'use strict';

const { AppError, ERROR_CODES, ADMIN_FOUNDER_PAYMENTS, computeRenewal } = require('@easecab/shared');

const alreadyLinked = () => new AppError(ERROR_CODES.VALIDATION_ERROR, 'This payment is already linked', 409);

/**
 * Founder payments: a member paid ₹149 on a founder's personal UPI, the founder paid
 * ₹149 in the app from a collection account, and here it is credited to the member.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminFounderPayments.repository').createAdminFounderPaymentsRepository>} deps.repo
 * @param {(userId: string) => Promise<void>} [deps.onPaid] - the member now has a real payment (referral rewards); must not throw
 */
function createAdminFounderPaymentsService({ repo, onPaid = async () => {} }) {
  return {
    /** Offset page of founder payments + how many still need linking. */
    async list({ page, limit, q, status, sort }) {
      const { rows, total, unlinked } = await repo.list({ page, limit, q, status, sort });
      const items = rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        paidAt: r.updatedAt,
        member: r.onBehalfOf ? { id: r.onBehalfOf.id, name: r.onBehalfOf.name, phone: r.onBehalfOf.phone ?? null } : null,
      }));
      return { items, total, page, limit, unlinked };
    },

    /**
     * Credit one founder payment to the member with `phone`. grantMembership adds 30 days
     * (skip it when the plan was already added by hand). 404 unknown payment/member,
     * 409 already linked, 422 phone is a collection account.
     */
    async link(paymentId, { phone, grantMembership }) {
      const payment = await repo.findFounderPayment(paymentId);
      if (!payment) throw AppError.fromCode(ERROR_CODES.NOT_FOUND, 'Payment not found');
      if (payment.onBehalfOfUserId) throw alreadyLinked();
      if (ADMIN_FOUNDER_PAYMENTS.COLLECTION_PHONES.includes(phone)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Enter the member’s number, not the founder account', 422);
      }
      const member = await repo.findMemberByPhone(phone);
      if (!member) throw AppError.fromCode(ERROR_CODES.NOT_FOUND, 'No member with this number — they must sign in to the app once');

      const renewal = grantMembership ? computeRenewal(member.subscription) : null;
      if (!(await repo.link({ paymentId, userId: member.id, renewal }))) throw alreadyLinked();
      if (renewal) await repo.invalidateSubCache(member.id);
      await onPaid(member.id);
      return {
        member: { id: member.id, name: member.name, phone },
        validUntil: renewal ? renewal.newExpiresAt : null,
      };
    },
  };
}

module.exports = { createAdminFounderPaymentsService };

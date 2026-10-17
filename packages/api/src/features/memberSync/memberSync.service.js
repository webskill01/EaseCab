'use strict';

const { MEMBER_SYNC } = require('@easecab/shared');

const shortPhone = (phone) => String(phone || '').slice(-MEMBER_SYNC.PHONE_DIGITS);
const rupees = (paise) => paise / MEMBER_SYNC.PAISE_PER_RUPEE;

/** Cap a MAX_ROWS + 1 read to MAX_ROWS and say whether anything was cut. */
function capped(rows) {
  return { rows: rows.slice(0, MEMBER_SYNC.MAX_ROWS), truncated: rows.length > MEMBER_SYNC.MAX_ROWS };
}

/**
 * Member-sync business logic: shapes app memberships and payments into the plain
 * per-phone records the manager bots match against their sheets (last 10 digits).
 *
 * @param {object} deps
 * @param {ReturnType<import('./memberSync.repository').createMemberSyncRepository>} deps.repo
 */
function createMemberSyncService({ repo }) {
  return {
    /**
     * Memberships changed since `since` (or for `phones`), with payment count and the
     * latest captured payment. `now` is the cursor the caller sends back next time.
     * @param {{ since?: Date, phones?: string[] }} query
     */
    async listMemberships({ since, phones } = {}) {
      const now = new Date();
      const full = phones && phones.map((p) => `${MEMBER_SYNC.PHONE_PREFIX}${p}`);
      const { rows, truncated } = capped(await repo.listSubscriptions({ since, phones: full }));
      const pays = await repo.capturedPaymentsFor(rows.map((s) => s.userId));
      const byUser = new Map();
      for (const p of pays) {
        const agg = byUser.get(p.userId) || { paidCount: 0, last: null };
        agg.paidCount += 1;
        agg.last = p;
        byUser.set(p.userId, agg);
      }
      const members = rows.map((s) => {
        const agg = byUser.get(s.userId) || { paidCount: 0, last: null };
        return {
          phone: shortPhone(s.user.phone),
          status: s.status,
          expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
          paidCount: agg.paidCount,
          lastPaidAt: agg.last ? agg.last.updatedAt.toISOString() : null,
          lastAmount: agg.last ? rupees(agg.last.amount) : null,
        };
      });
      return { now: now.toISOString(), members, truncated };
    },

    /**
     * Captured payments in [from, to), each flagged `first` when it is the payer's
     * first-ever captured payment (a join) rather than a renewal.
     * @param {{ from: Date, to: Date }} range
     */
    async listPayments({ from, to }) {
      const { rows, truncated } = capped(await repo.capturedPaymentsBetween(from, to));
      const firsts = await repo.firstPaymentTimes([...new Set(rows.map((p) => p.userId))]);
      const firstAt = new Map(firsts.map((f) => [f.userId, f._min.updatedAt.getTime()]));
      const payments = rows.map((p) => ({
        phone: shortPhone(p.user.phone),
        amount: rupees(p.amount),
        paidAt: p.updatedAt.toISOString(),
        first: firstAt.get(p.userId) === p.updatedAt.getTime(),
      }));
      return { payments, truncated };
    },
  };
}

module.exports = { createMemberSyncService };

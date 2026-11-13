'use strict';

const { AppError, ERROR_CODES, BORDER_TAX_STATES, BORDER_TAX_LIVE_STATES, ADMIN_STATISTICS } = require('@easecab/shared');

/** List row for the admin panel: phone only as a test/real flag, receipt as a boolean. */
function toItem(row, unlock) {
  const { user, receiptKey, ...rest } = row;
  return {
    ...rest,
    userName: user?.name || null,
    isTest: ADMIN_STATISTICS.EXCLUDED_PHONES.includes(user?.phone),
    hasReceipt: Boolean(receiptKey),
    unlock: unlock?.status ? { status: unlock.status, at: unlock.at ? new Date(Number(unlock.at)) : null } : null,
  };
}

/**
 * Admin border-tax logic (Phase 26.8): read-only filings list, receipt links, and the per-state
 * on/off switch. A paused state refuses NEW filings only — ones already queued or running finish.
 * @param {object} deps
 * @param {ReturnType<import('./adminBorderTax.repository').createAdminBorderTaxRepository>} deps.repo
 * @param {{ presignGet: Function }|null} [deps.r2]
 * @param {import('pino').Logger} deps.logger
 */
function createAdminBorderTaxService({ repo, r2 = null, logger }) {
  return {
    /** Offset page of filings + totals for the filter. */
    async list(query) {
      const { rows, total, byStatus } = await repo.list(query);
      const unlocks = await repo.unlocks(rows.map((r) => r.id));
      return { items: rows.map((r, i) => toItem(r, unlocks[i])), total, byStatus, page: query.page, limit: query.limit };
    },

    /** Live states with their switch. @returns {Promise<{ stateCd: string, name: string, paused: boolean }[]>} */
    async states() {
      const paused = await repo.pausedStates();
      return BORDER_TAX_LIVE_STATES.map((s) => ({ stateCd: s, name: BORDER_TAX_STATES[s].name, paused: paused.includes(s) }));
    },

    /** Switch one live state off/on for new filings. */
    async setPaused(stateCd, paused) {
      await repo.setPaused(stateCd, paused);
      logger.info({ stateCd, paused }, 'border tax state switched');
      return { stateCd, paused };
    },

    /**
     * Short-lived download link to a filing's receipt PDF (presigned, §3.12).
     * @throws {AppError} NOT_FOUND when the filing has no stored receipt
     */
    async receipt(id) {
      const row = await repo.findReceipt(id);
      if (!row?.receiptKey || !r2) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const name = `border-tax-${(row.receiptNo || id).replace(/[^A-Za-z0-9-]/g, '')}.pdf`;
      return { url: await r2.presignGet({ key: row.receiptKey, download: name }) };
    },
  };
}

module.exports = { createAdminBorderTaxService };

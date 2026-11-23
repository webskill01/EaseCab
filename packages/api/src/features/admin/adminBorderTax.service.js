'use strict';

const { AppError, ERROR_CODES, BORDER_TAX_STATES, BORDER_TAX_LIVE_STATES, ADMIN_STATISTICS, borderTaxOutcome } = require('@easecab/shared');

/** List row for the admin panel: phone only as a test/real flag, receipt as a boolean. */
function toItem(row, unlock) {
  const { user, receiptKey, ...rest } = row;
  return {
    ...rest,
    outcome: borderTaxOutcome(rest),
    userName: user?.name || null,
    isTest: ADMIN_STATISTICS.EXCLUDED_PHONES.includes(user?.phone),
    hasReceipt: Boolean(receiptKey),
    unlock: unlock?.status ? { status: unlock.status, at: unlock.at ? new Date(Number(unlock.at)) : null } : null,
  };
}

/**
 * (status, failureCode) groups → one total per result tag, plus each tag's codes ({ no_qr: 3 }) so the
 * panel shows what the real failures were. Key stays `byStatus` (the panel's field).
 */
function byOutcome(groups) {
  const out = new Map();
  for (const g of groups) {
    const key = borderTaxOutcome(g);
    const o = out.get(key) || { outcome: key, count: 0, paise: 0, codes: {} };
    o.count += g.count;
    o.paise += g.paise;
    if (g.failureCode) o.codes[g.failureCode] = (o.codes[g.failureCode] || 0) + g.count;
    out.set(key, o);
  }
  return [...out.values()];
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
      const { rows, total, byStatus: groups } = await repo.list(query);
      const unlocks = await repo.unlocks(rows.map((r) => r.id));
      return { items: rows.map((r, i) => toItem(r, unlocks[i])), total, byStatus: byOutcome(groups), page: query.page, limit: query.limit };
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
    async receipt(id, { view = false } = {}) {
      const row = await repo.findReceipt(id);
      if (!row?.receiptKey || !r2) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const name = `border-tax-${(row.receiptNo || id).replace(/[^A-Za-z0-9-]/g, '')}.pdf`;
      return { url: await r2.presignGet({ key: row.receiptKey, download: view ? undefined : name }) }; // stored as application/pdf → a browser shows it
    },
  };
}

module.exports = { createAdminBorderTaxService, byOutcome };

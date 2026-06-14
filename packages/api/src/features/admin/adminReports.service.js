'use strict';

const { AppError, ERROR_CODES } = require('@easecab/shared');

/** Last-4 masked phone for the admin queue (full number never surfaced — §10). */
function maskPhone(phone) {
  if (!phone) return null;
  return `••••${String(phone).slice(-4)}`;
}

/** Shape the reported target (bot ride or posted ride) into a flat summary. */
function toTarget(row) {
  if (row.ride) {
    const r = row.ride;
    return {
      kind: 'bot',
      id: r.id,
      status: r.status,
      displayText: r.displayText,
      fromCity: r.pickupCity?.canonicalName ?? r.pickupRaw ?? null,
      toCity: r.dropCity?.canonicalName ?? r.dropRaw ?? null,
      posterName: null,
    };
  }
  if (row.postedRide) {
    const p = row.postedRide;
    return {
      kind: 'posted',
      id: p.id,
      status: p.status,
      displayText: null,
      fromCity: p.fromCity?.canonicalName ?? p.fromCityRaw ?? null,
      toCity: p.toCity?.canonicalName ?? p.toCityRaw ?? null,
      posterName: p.poster?.name ?? null,
    };
  }
  return null;
}

/**
 * Admin ride-reports business logic (CLAUDE.md §4). Masks the reporter phone, shapes
 * the reported target, and applies dismiss/remove verdicts (cascade-resolving every
 * open report on the same target via the repository transaction).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminReports.repository').createAdminReportsRepository>} deps.repo
 */
function createAdminReportsService({ repo }) {
  function toItem(row) {
    return {
      id: row.id,
      reason: row.reason,
      remarks: row.remarks,
      screenshotUrl: row.screenshotUrl,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      reporter: { id: row.reporter.id, name: row.reporter.name, phoneMasked: maskPhone(row.reporter.phone) },
      target: toTarget(row),
    };
  }

  return {
    /** Offset-paginated reports queue (open or resolved). */
    async list({ page, limit, status }) {
      const { rows, total } = await repo.listReports({ page, limit, status });
      return { items: rows.map(toItem), total, page, limit };
    },

    /** Dismiss or remove; cascade-resolves siblings. NOT_FOUND if the report is gone. */
    async review(id, { action }, adminId) {
      const report = await repo.findById(id);
      if (!report) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const { count } = await repo.reviewTarget({ report, action, reviewedBy: adminId });
      return { id, action, resolved: count };
    },
  };
}

module.exports = { createAdminReportsService };

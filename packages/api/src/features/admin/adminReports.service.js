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
 * the reported target, presigns the user-supplied screenshot (CLAUDE.md §12 — never
 * surface a raw R2 key/bucket URL), and applies dismiss/remove verdicts (cascade-
 * resolving every open report on the same target via the repository transaction).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminReports.repository').createAdminReportsRepository>} deps.repo
 * @param {{ presignGet(args: { key: string }): Promise<string> }} [deps.r2] - optional R2 client
 */
function createAdminReportsService({ repo, r2 }) {
  // Best-effort presign for the report screenshot — a missing key or absent/erroring
  // R2 boundary yields null, never an error (image serving must not break the queue).
  async function presign(key) {
    if (!key || !r2) return null;
    try {
      return await r2.presignGet({ key });
    } catch {
      return null;
    }
  }

  async function toItem(row) {
    return {
      id: row.id,
      reason: row.reason,
      remarks: row.remarks,
      screenshotUrl: await presign(row.screenshotKey),
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      reporter: { id: row.reporter.id, name: row.reporter.name, phoneMasked: maskPhone(row.reporter.phone) },
      target: toTarget(row),
    };
  }

  return {
    /** Offset-paginated reports queue (open or resolved) with presigned screenshots. */
    async list({ page, limit, status }) {
      const { rows, total } = await repo.listReports({ page, limit, status });
      const items = await Promise.all(rows.map(toItem));
      return { items, total, page, limit };
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

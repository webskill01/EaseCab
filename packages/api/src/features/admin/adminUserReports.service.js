'use strict';

const { AppError, ERROR_CODES } = require('@easecab/shared');

/** Last-4 masked phone for the admin queue (full number never surfaced — §10). */
function maskPhone(phone) {
  if (!phone) return null;
  return `••••${String(phone).slice(-4)}`;
}

/**
 * Admin user-reports business logic (CLAUDE.md §4). Masks reporter phones, presigns
 * each report's screenshot (§12 — never surface a raw R2 key/bucket URL), and applies
 * the reinstate/uphold verdict (cascade-resolving every open report on the user).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminUserReports.repository').createAdminUserReportsRepository>} deps.repo
 * @param {{ presignGet(args: { key: string }): Promise<string> }} [deps.r2] - optional R2 client
 */
function createAdminUserReportsService({ repo, r2 }) {
  // Best-effort presign — a missing key or absent/erroring R2 boundary yields null,
  // never an error (image serving must not break the queue).
  async function presign(key) {
    if (!key || !r2) return null;
    try {
      return await r2.presignGet({ key });
    } catch {
      return null;
    }
  }

  async function toReport(r) {
    return {
      id: r.id,
      reason: r.reason,
      remarks: r.remarks,
      screenshotUrl: await presign(r.screenshotKey),
      createdAt: r.createdAt,
      reporter: { id: r.reporter.id, name: r.reporter.name, phoneMasked: maskPhone(r.reporter.phone) },
    };
  }

  async function toItem(u) {
    return {
      user: { id: u.id, name: u.name, baseCity: u.baseCity, vehicleType: u.vehicleType, flagged: Boolean(u.flaggedAt) },
      reportCount: u.reportsReceived.length,
      reports: await Promise.all(u.reportsReceived.map(toReport)),
    };
  }

  return {
    /** Offset-paginated queue of reported users (each with their open reports). */
    async list({ page, limit }) {
      const { rows, total } = await repo.listReportedUsers({ page, limit });
      const items = await Promise.all(rows.map(toItem));
      return { items, total, page, limit };
    },

    /** Reinstate (clear flaggedAt) or uphold; resolves all the user's open reports.
     * NOT_FOUND when the user has no open reports left (already handled / unknown id). */
    async review(userId, { action }, adminId) {
      if (!(await repo.hasOpenReports(userId))) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const { count } = await repo.reviewUser({ userId, action, reviewedBy: adminId });
      return { userId, action, resolved: count };
    },
  };
}

module.exports = { createAdminUserReportsService };

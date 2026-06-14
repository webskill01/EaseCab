'use strict';

const { AppError, ERROR_CODES, REVIEW_ACTION, VERIFICATION_STATUS } = require('@easecab/shared');

/** Last-4 masked phone for the admin queue (full number never surfaced — §10). */
function maskPhone(phone) {
  if (!phone) return null;
  return `••••${String(phone).slice(-4)}`;
}

/**
 * Admin verifications business logic (CLAUDE.md §4). Enriches the queue with
 * best-effort presigned GET URLs for the user's KYC images (private licence/rc +
 * public car/dp) — a missing key or absent/erroring R2 boundary yields null, never
 * an error (image serving must not break the queue).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminVerifications.repository').createAdminVerificationsRepository>} deps.repo
 * @param {{ presignGet(args: { key: string }): Promise<string> }} [deps.r2] - optional R2 client
 */
function createAdminVerificationsService({ repo, r2 }) {
  async function presign(key) {
    if (!key || !r2) return null;
    try {
      return await r2.presignGet({ key });
    } catch {
      return null;
    }
  }

  async function toItem(row) {
    const u = row.user;
    const [dp, licence, rc, carFront, carBack] = await Promise.all([
      presign(u.profilePicUrl), presign(u.licenseUrl), presign(u.rcUrl), presign(u.carFrontUrl), presign(u.carBackUrl),
    ]);
    return {
      id: row.id,
      docType: row.docType,
      status: row.status,
      surepassRef: row.surepassRef,
      verifiedName: row.verifiedName,
      createdAt: row.createdAt,
      user: {
        id: u.id,
        name: u.name,
        phoneMasked: maskPhone(u.phone),
        aadhaarLast4: u.aadhaarLast4,
        carMake: u.carMake,
        carModel: u.carModel,
        carRegNo: u.carRegNo,
        verificationStatus: u.verificationStatus,
      },
      images: { dp, licence, rc, carFront, carBack },
    };
  }

  return {
    /** Offset-paginated submitted DL/RC queue with presigned image URLs. */
    async list({ page, limit }) {
      const { rows, total } = await repo.listSubmitted({ page, limit });
      const items = await Promise.all(rows.map(toItem));
      return { items, total, page, limit };
    },

    /** Approve/reject one submission; reject persists the reason. NOT_FOUND if absent. */
    async review(id, { action, rejectionReason }, adminId) {
      const found = await repo.findById(id);
      if (!found) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const status = action === REVIEW_ACTION.APPROVE ? VERIFICATION_STATUS.APPROVED : VERIFICATION_STATUS.REJECTED;
      return repo.applyReview({
        id,
        status,
        reviewedBy: adminId,
        rejectionReason: action === REVIEW_ACTION.REJECT ? rejectionReason : null,
      });
    },

    /** Manually set the user verified-driver badge. NOT_FOUND if the user is gone. */
    async setBadge(userId, { status }) {
      try {
        return await repo.setUserBadge({ userId, status });
      } catch (err) {
        if (err && err.code === 'P2025') throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
        throw err;
      }
    },
  };
}

module.exports = { createAdminVerificationsService };

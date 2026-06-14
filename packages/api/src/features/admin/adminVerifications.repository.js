'use strict';

const { VERIFICATION_STATUS, ADMIN_VERIFICATIONS } = require('@easecab/shared');

/** Columns the queue needs from the owning user (KYC review context + image keys). */
const USER_SELECT = Object.freeze({
  id: true, name: true, phone: true, aadhaarLast4: true,
  carMake: true, carModel: true, carRegNo: true, verificationStatus: true,
  profilePicUrl: true, licenseUrl: true, rcUrl: true, carFrontUrl: true, carBackUrl: true,
});

/**
 * Admin verifications data access (CLAUDE.md §4 — Prisma only, no policy). Offset
 * pagination is acceptable for admin (§8). Reads the verification_submissions + users
 * tables for review context; admin auth itself never reads users (handled elsewhere).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminVerificationsRepository({ prisma }) {
  return {
    /** Submitted DL/RC rows (newest first) + total, joined with user review context. */
    async listSubmitted({ page, limit }) {
      const where = { status: VERIFICATION_STATUS.SUBMITTED, docType: { in: ADMIN_VERIFICATIONS.DOC_TYPES } };
      const [rows, total] = await prisma.$transaction([
        prisma.verificationSubmission.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { user: { select: USER_SELECT } },
        }),
        prisma.verificationSubmission.count({ where }),
      ]);
      return { rows, total };
    },

    /** @returns {Promise<object|null>} submission by id (review existence check). */
    async findById(id) {
      return prisma.verificationSubmission.findUnique({ where: { id } });
    },

    /** Stamp the per-document review verdict + audit columns. */
    async applyReview({ id, status, reviewedBy, rejectionReason }) {
      return prisma.verificationSubmission.update({
        where: { id },
        data: { status, reviewedBy, reviewedAt: new Date(), rejectionReason: rejectionReason ?? null },
      });
    },

    /** Manually set the user rollup badge (User.verificationStatus). Throws P2025 if absent. */
    async setUserBadge({ userId, status }) {
      return prisma.user.update({ where: { id: userId }, data: { verificationStatus: status } });
    },
  };
}

module.exports = { createAdminVerificationsRepository };

'use strict';

const { ADMIN_STATISTICS, SUBSCRIPTION_STATUS, USER_PLAN_FILTER, USER_JOINED_FILTER } = require('@easecab/shared');

/** User row for the admin directory (phone masked in the service — §10). */
const USER_SELECT = Object.freeze({
  id: true, name: true, phone: true, profilePicUrl: true, aadhaarVerified: true, verificationStatus: true,
  baseCity: true, workingCity: true, vehicleType: true, carMake: true, carModel: true, carRegNo: true,
  createdAt: true, isDeleted: true, deletedAt: true,
  subscription: { select: { status: true, expiresAt: true } },
});

/** Full profile for the admin user page (adds KYC/car image keys, prefs, activity counts). */
const USER_DETAIL_SELECT = Object.freeze({
  ...USER_SELECT,
  bio: true, experience: true, languagesSpoken: true, lastKnownCity: true, aadhaarLast4: true,
  dlSubmitted: true, rcSubmitted: true, licenseUrl: true, rcUrl: true, carFrontUrl: true, carBackUrl: true,
  notifyBotRides: true, notifyPostedRides: true, flaggedAt: true,
  subscription: { select: { status: true, paidStartedAt: true, expiresAt: true } },
  payments: { select: { id: true, amount: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 },
  _count: { select: { postedRides: true, contacts: true, reportsReceived: true, reportsFiled: true } },
});

/** Launch day 00:00 IST — rows before it are pre-launch test data. */
function launchStart() {
  return new Date(`${ADMIN_STATISTICS.LAUNCH_DATE}T00:00:00+05:30`);
}

/** Map the status filter to a `where.isDeleted` fragment (`all` → no filter). */
function statusWhere(status) {
  if (status === 'active') return { isDeleted: false };
  if (status === 'deleted') return { isDeleted: true };
  return {};
}

/**
 * Membership filter. active = paid and not yet expired; expired = had a membership
 * that has lapsed; none = never paid (no row, or no expiry ever set).
 */
function planWhere(plan, now) {
  if (plan === USER_PLAN_FILTER.ACTIVE) {
    return { subscription: { is: { status: SUBSCRIPTION_STATUS.ACTIVE, expiresAt: { gt: now } } } };
  }
  if (plan === USER_PLAN_FILTER.EXPIRED) {
    return { subscription: { is: { expiresAt: { lte: now } } } };
  }
  if (plan === USER_PLAN_FILTER.NONE) {
    return { OR: [{ subscription: { is: null } }, { subscription: { is: { expiresAt: null } } }] };
  }
  return {};
}

/** Build the directory `where` from all filters (AND-ed so the ORs never collide). */
function buildWhere({ status, plan, joined, q }) {
  const and = [statusWhere(status), planWhere(plan, new Date())];
  if (joined === USER_JOINED_FILTER.LAUNCH) and.push({ createdAt: { gte: launchStart() } });
  if (q) and.push({ OR: [{ phone: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }] });
  return { AND: and };
}

/**
 * Admin user-directory data access (CLAUDE.md §4 — Prisma only, no policy). Offset
 * pagination is acceptable for admin (§8). Soft-delete is flag-only.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminUsersRepository({ prisma }) {
  return {
    /**
     * Page of users (newest first) + total, filtered by status/plan/joined and optional `q`.
     * @returns {Promise<{ rows: object[], total: number }>}
     */
    async listUsers({ page, limit, status, plan, joined, q }) {
      const where = buildWhere({ status, plan, joined, q });
      const [rows, total] = await prisma.$transaction([
        prisma.user.findMany({
          where, orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit, take: limit, select: USER_SELECT,
        }),
        prisma.user.count({ where }),
      ]);
      return { rows, total };
    },

    /** @returns {Promise<object|null>} user by id (existence check before action). */
    async findById(id) {
      return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    },

    /** @returns {Promise<object|null>} full profile + last 10 payments + activity counts. */
    async findDetail(id) {
      return prisma.user.findUnique({ where: { id }, select: USER_DETAIL_SELECT });
    },

    /** Flip the soft-delete flag. delete → deletedAt=now; restore → deletedAt=null. */
    async setDeleted(id, isDeleted) {
      return prisma.user.update({
        where: { id },
        data: { isDeleted, deletedAt: isDeleted ? new Date() : null },
        select: USER_SELECT,
      });
    },
  };
}

module.exports = { createAdminUsersRepository, USER_SELECT };

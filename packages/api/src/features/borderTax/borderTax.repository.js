'use strict';

const { redisKey, BORDER_TAX, BORDER_TAX_KEYS: K, BORDER_TAX_FINAL_STATUSES } = require('@easecab/shared');
const { fixedWindowIncr } = require('../../lib/rateLimit');
const { getCachedSub, setCachedSub } = require('../../lib/subscriptionCache');

/** Columns the driver's app renders. */
const PUBLIC_SELECT = Object.freeze({
  id: true, vehicleNo: true, stateCd: true, checkpost: true, seats: true, taxMode: true, taxFrom: true, taxUpto: true,
  status: true, taxPaise: true, failureCode: true, createdAt: true, receiptNo: true, paidAt: true,
});

async function pop(conn, key, timeoutSec) {
  const r = await conn.brpop(key, timeoutSec);
  return r ? r[1] : null;
}

/**
 * Border-tax filing data access (CLAUDE.md §4 — DB + cache only). Status rules live in the service.
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createBorderTaxRepository({ prisma, redis }) {
  return {
    /** Inserts a new filing row. @returns {Promise<object>} */
    async create(data) {
      return prisma.borderTaxRequest.create({ data, select: PUBLIC_SELECT });
    },

    /** One filing, only if it belongs to `userId`. @returns {Promise<object|null>} */
    async findForUser(id, userId) {
      return prisma.borderTaxRequest.findFirst({ where: { id, userId }, select: PUBLIC_SELECT });
    },

    /** R2 key of the caller's receipt PDF, or null. @returns {Promise<?string>} */
    async findReceipt(id, userId) {
      return prisma.borderTaxRequest.findFirst({ where: { id, userId }, select: { receiptKey: true, receiptNo: true } });
    },

    /** Stored receipts whose tax validity ended before `before`. @returns {Promise<{ id: string, receiptKey: string }[]>} */
    async expiredReceipts(before, take) {
      return prisma.borderTaxRequest.findMany({ where: { receiptKey: { not: null }, taxUpto: { lt: before } }, select: { id: true, receiptKey: true }, take });
    },

    /** Receipt PDF deleted from R2: drop its key, keep receiptNo. */
    async clearReceiptKey(id) {
      await prisma.borderTaxRequest.update({ where: { id }, data: { receiptKey: null } });
    },

    /** Full row for the worker. @returns {Promise<object|null>} */
    async findById(id) {
      return prisma.borderTaxRequest.findUnique({ where: { id } });
    },

    /** The caller's subscription window for the members-only gate — cache-first (§15). null if none. */
    async findSubscriptionByUserId(userId) {
      const cached = await getCachedSub(redis, userId);
      if (cached) return cached;
      const sub = await prisma.subscription.findUnique({ where: { userId }, select: { status: true, expiresAt: true } });
      await setCachedSub(redis, userId, sub);
      return sub;
    },

    /**
     * An unfinished filing for this vehicle, if any — the portal locks a registration while a
     * payment is pending, so we allow one live filing per vehicle.
     * @returns {Promise<object|null>}
     */
    async findActiveForVehicle(vehicleNo) {
      return prisma.borderTaxRequest.findFirst({
        where: { vehicleNo, status: { notIn: [...BORDER_TAX_FINAL_STATUSES] } },
        select: { id: true, userId: true, status: true },
      });
    },

    /** Ids of this vehicle's filings in a state since `since`, newest first. @returns {Promise<string[]>} */
    async recentForVehicle(vehicleNo, stateCd, since) {
      const rows = await prisma.borderTaxRequest.findMany({
        where: { vehicleNo, stateCd, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true },
      });
      return rows.map((r) => r.id);
    },

    /**
     * Newest-first page of a driver's filings, cursor = (createdAt, id) of the last row seen.
     * @param {{ userId: string, limit: number, cursor?: { createdAt: Date, id: string } }} args
     * @returns {Promise<{ items: object[], hasMore: boolean }>}
     */
    async listForUser({ userId, limit, cursor }) {
      const older = cursor && {
        OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }],
      };
      const rows = await prisma.borderTaxRequest.findMany({
        where: { userId, ...older },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: PUBLIC_SELECT,
      });
      return { items: rows.slice(0, limit), hasMore: rows.length > limit };
    },

    /**
     * Compare-and-set status change: only moves a row that is still in one of `from`.
     * Two workers / a cancel racing the worker can't both win.
     * @returns {Promise<boolean>} true if this call made the change
     */
    async transition(id, from, to, fields = {}) {
      const { count } = await prisma.borderTaxRequest.updateMany({
        where: { id, status: { in: from } },
        data: { ...fields, status: to },
      });
      return count === 1;
    },

    /** Rows in any of `statuses` (crash sweep). @returns {Promise<{ id: string, status: string }[]>} */
    /** @returns {Promise<number>} rows in these statuses (worker lanes in use) */
    async countByStatus(statuses) {
      return prisma.borderTaxRequest.count({ where: { status: { in: statuses } } });
    },

    async listByStatus(statuses) {
      return prisma.borderTaxRequest.findMany({ where: { status: { in: statuses } }, select: { id: true, status: true } });
    },

    /** Watcher's last reading per payment site / the checkpost portal (BORDER_TAX.PORTAL_KEY): key → '1' up, '0' down. */
    async siteState() {
      return redis.hgetall(K.TREASURY_UP);
    },

    /** Remember a driver a down site stopped, to push once it's back (kept WAIT_UP_TTL_SEC). */
    async waitForUp(site, userId) {
      await redis.multi().sadd(K.waitUp(site), userId).expire(K.waitUp(site), BORDER_TAX.WAIT_UP_TTL_SEC).exec();
    },

    /** Drivers waiting for `site`, taken off the list. @returns {Promise<string[]>} */
    async takeWaitingUp(site) {
      const [[, users]] = await redis.multi().smembers(K.waitUp(site)).del(K.waitUp(site)).exec();
      return users;
    },

    /** Queue a request for the worker. */
    async enqueue(id) {
      await redis.lpush(K.QUEUE, id);
    },

    /** Merge live job fields (step, captcha image, deadline) for the app to poll. */
    async setJob(id, fields) {
      await redis.multi().hset(K.job(id), fields).expire(K.job(id), BORDER_TAX.JOB_TTL_SEC).exec();
    },

    /** Live job fields, {} if none. @returns {Promise<Record<string, string>>} */
    async getJob(id) {
      return redis.hgetall(K.job(id));
    },

    /** First time the app saw this QR-screen event (qr_shown, pay_tapped…): kept, later repeats ignored. */
    async markEvent(id, type) {
      await redis.hsetnx(K.job(id), `ev_${type}`, String(Date.now()));
      await redis.expire(K.job(id), BORDER_TAX.JOB_TTL_SEC); // an event after the hash expired must not leave a key forever
    },

    /** Drops answers left over from an earlier captcha (double taps) before showing a new one. */
    async clearAnswers(id) {
      await redis.del(K.answer(id));
    },

    /** Driver's captcha answer → the waiting worker. */
    async pushAnswer(id, answer) {
      await redis.multi().rpush(K.answer(id), answer).expire(K.answer(id), BORDER_TAX.JOB_TTL_SEC).exec();
    },

    /** Bank-page form for the driver's app; gone after HANDOFF_TTL_SEC (bank timer). Never logged. */
    async setHandoff(id, handoff) {
      await redis.set(K.handoff(id), JSON.stringify(handoff), 'EX', BORDER_TAX.HANDOFF_TTL_SEC);
    },

    /** @returns {Promise<object|null>} the stored bank form, null once expired */
    async getHandoff(id) {
      const raw = await redis.get(K.handoff(id));
      return raw ? JSON.parse(raw) : null;
    },

    /** Drops a bank form that must not reach the app (filing cancelled meanwhile). */
    async clearHandoff(id) {
      await redis.del(K.handoff(id));
    },

    /**
     * Blocking pops — need a DEDICATED connection (`conn`), BRPOP holds it.
     * @returns {Promise<string|null>} value, or null on timeout
     */
    async popQueue(conn, timeoutSec) { return pop(conn, K.QUEUE, timeoutSec); },
    async popAnswer(conn, id, timeoutSec) { return pop(conn, K.answer(id), timeoutSec); },

    /**
     * Claims the shared Vahan lookup slot (all workers, one IP) for `gapSec`.
     * @returns {Promise<number>} 0 = claimed; else ms until it frees up
     */
    async takeLookupSlot(gapSec) {
      if (await redis.set(K.LOOKUP_SLOT, '1', 'EX', gapSec, 'NX')) return 0;
      return Math.max(await redis.pttl(K.LOOKUP_SLOT), 1); // -2 = freed meanwhile → retry now
    },

    /** Peek, no claim. @returns {Promise<number>} ms until the lookup slot frees (0 = free) */
    async lookupSlotMs() {
      return Math.max(await redis.pttl(K.LOOKUP_SLOT), 0);
    },

    /** Pending-lock clear for a filing's vehicle+state, due at `atMs` (re-adding moves it). */
    async scheduleUnlock(id, atMs) {
      await redis.zadd(K.UNLOCKS, atMs, id);
    },

    /** Claims the earliest due unlock. @returns {Promise<string|null>} filing id */
    async popDueUnlock(nowMs) {
      const [id] = await redis.zrangebyscore(K.UNLOCKS, '-inf', nowMs, 'LIMIT', 0, 1);
      return id && (await redis.zrem(K.UNLOCKS, id)) ? id : null; // zrem = the claim (one worker, but cheap)
    },

    /** Merge unlock status fields (BORDER_TAX_UNLOCK status, at, receiptNo, tries) for the app. */
    async setUnlock(id, fields) {
      await redis.multi().hset(K.unlock(id), fields).expire(K.unlock(id), BORDER_TAX.UNLOCK_TTL_SEC).exec();
    },

    /** @returns {Promise<Record<string, string>>} {} if none */
    async getUnlock(id) {
      return redis.hgetall(K.unlock(id));
    },

    /** States the admin switched off (BORDER_TAX_KEYS.PAUSED). @returns {Promise<string[]>} */
    async pausedStates() {
      return redis.smembers(K.PAUSED);
    },

    /** Fixed-window create counter per user. @returns {Promise<number>} */
    async incrCreateAttempts(userId, windowSec) {
      return fixedWindowIncr(redis, redisKey('bordertax', userId), windowSec);
    },
  };
}

module.exports = { createBorderTaxRepository };

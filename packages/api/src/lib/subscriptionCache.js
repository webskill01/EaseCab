'use strict';

const { redisKey, RAZORPAY } = require('@easecab/shared');

const key = (userId) => redisKey('sub', userId);

/** Revive the two timestamptz fields from JSON strings back to Date (or null). */
function revive(snap) {
  return {
    status: snap.status,
    trialExpiresAt: snap.trialExpiresAt ? new Date(snap.trialExpiresAt) : null,
    expiresAt: snap.expiresAt ? new Date(snap.expiresAt) : null,
  };
}

/**
 * @param {import('ioredis').Redis} redis
 * @param {string} userId
 * @returns {Promise<{status:string,trialExpiresAt:?Date,expiresAt:?Date}|null>} null on miss
 */
async function getCachedSub(redis, userId) {
  const raw = await redis.get(key(userId));
  if (!raw) return null;
  try {
    return revive(JSON.parse(raw));
  } catch {
    return null; // poisoned entry — treat as a miss
  }
}

/** Cache a subscription snapshot with the §15 TTL. No-op if `snap` is falsy. */
async function setCachedSub(redis, userId, snap) {
  if (!snap) return;
  await redis.set(key(userId), JSON.stringify(snap), 'EX', RAZORPAY.SUB_CACHE_TTL_SEC);
}

/** Invalidate on write (every credit). */
async function delCachedSub(redis, userId) {
  await redis.del(key(userId));
}

module.exports = { getCachedSub, setCachedSub, delCachedSub };

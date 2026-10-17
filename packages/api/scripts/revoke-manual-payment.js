'use strict';

/**
 * Undo one grant-manual-payment run (e.g. granted the wrong number).
 *
 * Takes one 30-day period back off the expiry; if that leaves no time, the
 * membership is marked expired. Drops the cached subscription so the paywall
 * returns immediately.
 *
 * Usage (on the VPS, from packages/api):
 *   node --env-file=.env scripts/revoke-manual-payment.js --phone 9876543210
 */
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { redisKey, SUBSCRIPTION_PLAN } = require('@easecab/shared');

const DAY_MS = 86_400_000;

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/** "98765 43210" / "919876543210" / "+919876543210" → "+919876543210", else null. */
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

async function dropCache(userId) {
  if (!process.env.REDIS_URL) return console.warn('REDIS_URL not set — change shows within 5 min.');
  const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await redis.connect();
    await redis.del(redisKey('sub', userId));
  } catch (err) {
    console.warn(`Cache not cleared (${err.message}) — change shows within 5 min.`);
  } finally {
    redis.disconnect();
  }
}

async function main() {
  const phone = normalizePhone(arg('--phone'));
  if (!phone) {
    console.error('Required: --phone 9876543210 (10-digit Indian mobile, +91 optional).');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { phone }, include: { subscription: true } });
    const sub = user?.subscription;
    if (!sub || sub.status !== 'active' || !sub.expiresAt) {
      console.error(`${phone} has no active membership — nothing to revoke.`);
      process.exit(1);
    }

    const expiresAt = new Date(sub.expiresAt.getTime() - SUBSCRIPTION_PLAN.PERIOD_DAYS * DAY_MS);
    const status = expiresAt > new Date() ? 'active' : 'expired';
    await prisma.subscription.update({ where: { userId: user.id }, data: { status, expiresAt } });
    await dropCache(user.id);

    console.log(`${user.name || '(no name)'} — was: active until ${sub.expiresAt.toISOString()}`);
    console.log(status === 'active' ? `Now active until ${expiresAt.toISOString()}` : 'Now expired (paywall back on).');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

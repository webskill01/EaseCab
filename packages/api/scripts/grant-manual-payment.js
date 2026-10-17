'use strict';

/**
 * One-off CLI to credit a ₹149 payment received outside the app (UPI scanner, cash).
 *
 * Uses the same computeRenewal() as a real Cashfree payment, so 30 days stack on
 * any time still left, and drops the cached subscription so the paywall lifts now
 * instead of after the 5-minute cache TTL.
 *
 * Usage (on the VPS, from packages/api):
 *   node --env-file=.env scripts/grant-manual-payment.js --phone 9876543210
 *   node --env-file=.env scripts/grant-manual-payment.js --phone +919876543210
 *
 * The user must have signed in once — the script never creates accounts.
 */
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { computeRenewal, redisKey } = require('@easecab/shared');

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
  if (!process.env.REDIS_URL) return console.warn('REDIS_URL not set — paywall lifts within 5 min.');
  const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await redis.connect();
    await redis.del(redisKey('sub', userId));
  } catch (err) {
    console.warn(`Cache not cleared (${err.message}) — paywall lifts within 5 min.`);
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
    if (!user) {
      console.error(`No account for ${phone}. Ask them to sign in once, then re-run.`);
      process.exit(1);
    }

    const before = user.subscription;
    const { newExpiresAt, paidStartedAt } = computeRenewal(before);
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, status: 'active', expiresAt: newExpiresAt, paidStartedAt },
      update: { status: 'active', expiresAt: newExpiresAt, paidStartedAt },
    });
    await dropCache(user.id);

    const was = before?.expiresAt ? `${before.status} until ${before.expiresAt.toISOString()}` : 'never paid';
    console.log(`${user.name || '(no name)'} — was: ${was}`);
    console.log(`Now active until ${newExpiresAt.toISOString()}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

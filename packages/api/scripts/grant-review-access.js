'use strict';

/**
 * One-off CLI that gives the Play Store review account permanent full access.
 *
 * Google re-reviews on EVERY update. A trial expires, so a reviewer coming back
 * months later would hit the paywall and reject the release. This pins the
 * account to status=active with a far-future expiry, which is what
 * isSubscriptionActive() checks (packages/shared/lib/subscriptionWindow.js).
 *
 * Usage:
 *   node scripts/grant-review-access.js --phone +919999999999
 *   node scripts/grant-review-access.js --phone +919999999999 --years 20
 *
 * The phone must match the Firebase "Phone numbers for testing" entry and the
 * username in Play Console → App content → Sign-in details.
 */
const { PrismaClient } = require('@prisma/client');

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const phone = arg('--phone');
  const years = Number(arg('--years', '10'));

  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    console.error('Required: --phone +919999999999 (E.164, with country code).');
    process.exit(1);
  }
  if (!Number.isFinite(years) || years < 1) {
    console.error('--years must be a positive number.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (!user) {
      console.error(`No user with phone ${phone}. Sign in once with the test OTP first, then re-run.`);
      process.exit(1);
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + years);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      // ponytail: trialExpiresAt is required on create but irrelevant once status=active
      create: { userId: user.id, status: 'active', trialExpiresAt: expiresAt, expiresAt },
      update: { status: 'active', expiresAt },
    });

    console.log(`Review access granted until ${expiresAt.toISOString()}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

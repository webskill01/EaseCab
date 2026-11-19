'use strict';

/**
 * One-off: re-run the lock clear for a border tax filing now. For a filing that expired at the QR
 * (payment_timeout) with nothing pending, the worker looks the receipt up by vehicle and, if found,
 * marks it PAID with the receipt (app + panel) and pushes the driver. Read-only on the govt portal.
 *
 * Usage (on the VPS, from packages/api):
 *   node --env-file=.env scripts/bt-relookup.js <filing id>
 */
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { createBorderTaxRepository } = require('../src/features/borderTax/borderTax.repository');
const { createBorderTaxService } = require('../src/features/borderTax/borderTax.service');

async function main() {
  const id = process.argv[2];
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) throw new Error('usage: bt-relookup.js <filing id>');
  const prisma = new PrismaClient();
  const redis = new Redis(process.env.REDIS_URL);
  try {
    const repo = createBorderTaxRepository({ prisma, redis });
    const row = await repo.findById(id);
    if (!row) throw new Error('filing not found');
    await createBorderTaxService({ repo, logger: console }).scheduleUnlock(id, Date.now());
    console.log(`queued: ${row.stateCd} ${row.status} ${row.failureCode || ''} — watch easecab-bordertax logs for "${id.slice(0, 8)}"`);
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });

'use strict';

// Side-effect import: validates env via Zod and exits the process on bad config.
const { env } = require('../../config/env.js');
// Receipt PDFs go to R2: the worker shares the API's .env (ecosystem.config.js), so it reuses its contract.
const { serverEnv } = require('../../config/serverEnv.js');

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { chromium } = require('playwright');
const { BORDER_TAX } = require('@easecab/shared');
const { createBorderTaxRepository } = require('../features/borderTax/borderTax.repository');
const { createBorderTaxService } = require('../features/borderTax/borderTax.service');
const { createRunner } = require('./runner');
const { sweepReceipts } = require('./receiptSweep');
const { r2FromEnv } = require('../lib/r2.js');
const { ocrReady, stopOcr } = require('./ocr');

const QUEUE_POLL_SEC = 30; // BRPOP timeout — lets the loop notice shutdown
const RECEIPT_SWEEP_MS = 3_600_000; // hourly: receipts go 24h after validity, an hour late is fine
const VIEWPORT = Object.freeze({ width: 1280, height: 900 });

/**
 * easecab-bordertax (PM2): pulls filings off the Redis queue and drives the state portal,
 * up to WORKER_CONCURRENCY browser contexts at once. The portal refuses headless
 * browsers, so Chromium runs headed — under Xvfb on the VPS (see ecosystem.config.js).
 */
async function main() {
  const logger = pino({ level: 'info' });
  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  const redis = new Redis(env.REDIS_URL);
  const repo = createBorderTaxRepository({ prisma, redis });
  const service = createBorderTaxService({ repo, logger });
  const browser = await chromium.launch({ headless: false });
  const newPage = async () => (await browser.newContext({ viewport: VIEWPORT })).newPage();
  const r2 = r2FromEnv(serverEnv);
  const runner = createRunner({ service, repo, newPage, logger, r2 });
  const sweep = () => sweepReceipts({ repo, r2, logger }).catch((err) => logger.error({ err: err.message }, 'receipt sweep failed'));
  sweep();
  const sweepTimer = setInterval(sweep, RECEIPT_SWEEP_MS);

  logger.info({ recovered: await service.recoverAfterRestart() }, 'border tax worker up');
  if (await ocrReady()) logger.info('captcha OCR ready');
  else logger.warn('captcha OCR unavailable — every captcha goes to the driver (pip3 install -r src/borderTax/ocr/requirements.txt)');
  let stopping = false;
  const loop = async (n) => {
    const conn = redis.duplicate(); // BRPOP blocks its connection — one per lane
    while (!stopping) {
      const id = await repo.popQueue(conn, QUEUE_POLL_SEC);
      if (id) await runner.run(id, conn).catch((err) => logger.error({ id, lane: n, err: err.message }, 'runner crashed'));
    }
    conn.disconnect();
  };
  const lanes = Array.from({ length: BORDER_TAX.WORKER_CONCURRENCY }, (_, n) => loop(n));

  const shutdown = async (signal) => {
    logger.info({ signal }, 'border tax worker stopping'); // in-flight jobs are swept on next boot
    stopping = true;
    clearInterval(sweepTimer);
    stopOcr();
    await browser.close().catch((err) => logger.warn({ err: err.message }, 'browser close failed'));
    await Promise.race([Promise.allSettled(lanes), new Promise((r) => setTimeout(r, 2000))]);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('border tax worker failed to start:', err.message); // eslint-disable-line no-console
  process.exit(1);
});

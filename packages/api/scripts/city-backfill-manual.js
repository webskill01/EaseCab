'use strict';

/**
 * Manual stand-in for the Gemini city backfill (while the Gemini key returns 402).
 * Claude reviews the queue and supplies fragment -> city answers; `apply` runs the
 * REAL backfill service with those answers in place of Gemini, so the writes are
 * identical to a Gemini sweep: `ai` aliases + strings marked reviewed + live
 * null-FK rides re-resolved. Nothing else is touched.
 *
 * Run from packages/api with the app env:
 *   node --env-file=.env scripts/city-backfill-manual.js export
 *     → JSON: pending strings (busiest first) + the city catalog names
 *   node --env-file=.env scripts/city-backfill-manual.js apply < answers.json
 *     answers.json = { "hardiwar": "Haridwar", "chd": "Chandigarh", "junk": null }
 *     (null = not a city → taken out of the queue; unanswered strings stay queued)
 */
const { env } = require('../config/env.js');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { createCityResolver } = require('@easecab/shared');
const { createCityBackfillRepository } = require('../src/features/cityBackfill/cityBackfill.repository');
const { createCityBackfillService } = require('../src/features/cityBackfill/cityBackfill.service');
const { createManualLlm } = require('../src/features/cityBackfill/manualLlm');

const EXPORT_LIMIT = 300; // ponytail: one page is plenty at the current queue size

async function readStdin() {
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return JSON.parse(s);
}

async function exportQueue(repo) {
  const pending = await repo.listPending({ minOccurrence: 1, limit: EXPORT_LIMIT });
  const cities = (await repo.listActiveCities()).map((c) => c.canonicalName).sort();
  const unresolvedRides = (await repo.listUnresolvedRides({ limit: 1000 })).length;
  console.log(JSON.stringify({ pending: pending.map((p) => p.rawText), unresolvedRides, cities }));
}

async function applyAnswers({ prisma, redis, repo, logger }) {
  const answers = await readStdin();
  const llm = createManualLlm(answers);
  const answered = Object.keys(answers).filter((k) => answers[k]);
  const service = createCityBackfillService({
    // Feed the sweep only the strings we answered (any queue position).
    repo: { ...repo, listPending: async () => answered.map((rawText) => ({ rawText })) },
    llm,
    resolver: createCityResolver({ prisma, redis, logger }),
    logger,
  });
  const summary = await service.sweep();
  let dismissed = 0;
  for (const [rawText, name] of Object.entries(answers)) {
    if (name !== null) continue;
    const res = await prisma.unresolvedCityString.updateMany({ where: { rawText, reviewedAt: null }, data: { reviewedAt: new Date() } });
    dismissed += res.count;
  }
  console.log(JSON.stringify({ ...summary, dismissed, unknownNames: llm.unknownNames() }));
}

async function main() {
  const mode = process.argv[2];
  if (mode !== 'export' && mode !== 'apply') {
    console.error('Usage: city-backfill-manual.js export | apply < answers.json');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const redis = new Redis(env.REDIS_URL);
  const logger = pino({ level: 'warn' });
  try {
    const repo = createCityBackfillRepository({ prisma });
    if (mode === 'export') await exportQueue(repo);
    else await applyAnswers({ prisma, redis, repo, logger });
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

main().catch((err) => {
  console.error('city-backfill-manual failed:', err.message);
  process.exit(1);
});

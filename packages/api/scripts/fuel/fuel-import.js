'use strict';

/**
 * Seed fuel stations from a JSONL file (one fuelImportRowSchema object per line —
 * build-hpcl.js output, or a hand-made CGD / IOCL list in the same shape).
 *
 * Dry run by default (validates + counts, writes nothing):
 *   node --env-file=.env scripts/fuel/fuel-import.js scripts/fuel/data/hpcl.jsonl
 * Write:
 *   node --env-file=.env scripts/fuel/fuel-import.js scripts/fuel/data/hpcl.jsonl --apply
 *
 * WARNING: packages/api/.env points at the PRODUCTION database. Re-running is safe
 * (upsert on source + sourceRef; status never touched; CNG only ever turned on).
 */
const fs = require('node:fs');
const { fuelImportRowSchema } = require('@easecab/shared');

/** @param {string} text JSONL @returns {{ rows: object[], bad: number[] }} bad = 1-based line numbers */
function parseJsonl(text) {
  const rows = [];
  const bad = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let parsed;
    try {
      parsed = fuelImportRowSchema.safeParse(JSON.parse(line));
    } catch {
      parsed = { success: false };
    }
    if (parsed.success) rows.push(parsed.data);
    else bad.push(i + 1);
  });
  return { rows, bad };
}

const PARALLEL = 10; // ponytail: 10 upserts in flight (~10x the one-by-one speed over the pooler); stays well under the pool size

/** Upsert rows, PARALLEL at a time. @returns {Promise<number>} rows written */
async function importRows(repo, rows, log = () => {}) {
  let done = 0;
  for (let i = 0; i < rows.length; i += PARALLEL) {
    const chunk = rows.slice(i, i + PARALLEL);
    await Promise.all(chunk.map((row) => repo.upsertImported(row)));
    done += chunk.length;
    if (Math.floor(done / 500) > Math.floor((done - chunk.length) / 500)) log(`${done}/${rows.length}`);
  }
  return done;
}

async function main() {
  const [file, flag] = process.argv.slice(2);
  const { rows, bad } = parseJsonl(fs.readFileSync(file, 'utf8'));
  console.log(`${rows.length} valid rows, ${rows.filter((r) => r.hasCng).length} CNG; ${bad.length} invalid${bad.length ? ` (lines ${bad.slice(0, 10).join(', ')}…)` : ''}`);
  if (flag !== '--apply') return console.log('dry run — pass --apply to write');
  const { PrismaClient } = require('@prisma/client');
  const { createFuelRepository } = require('../../src/features/fuel/fuel.repository');
  const prisma = new PrismaClient();
  try {
    console.log(`wrote ${await importRows(createFuelRepository({ prisma }), rows, console.log)} rows`);
  } finally {
    await prisma.$disconnect();
  }
  return undefined;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { parseJsonl, importRows };

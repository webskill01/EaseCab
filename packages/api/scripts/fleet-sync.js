'use strict';

/**
 * Make EaseCab's blocked numbers, blocked senders and ignore phrases an EXACT copy
 * of a fleet control panel's lists (Phase 17.5). One-way: the panel is the source
 * of truth and is only READ — this script never writes to it. Live changes flow
 * both ways through the mirror; run this after first hook-up or if they drift.
 *
 *   node --env-file=.env scripts/fleet-sync.js           # dry run: counts only
 *   node --env-file=.env scripts/fleet-sync.js --apply   # add missing + delete extras here
 *
 * With several FLEET_PEERS, pass --peer <name> to pick the source (default: the first).
 * Prints counts only — never the numbers themselves (CLAUDE.md §10).
 */
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { z } = require('zod');
const { FLEET_FIELDS, BOT_FILTER_NUMBER_LISTS, BOT_FILTERS_CHANGED_CHANNEL, parseNumbers } = require('@easecab/shared');
const { serverEnvSchema } = require('../config/env.schema');
const { createFleetMirror } = require('../src/lib/fleetMirror');

const env = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  FLEET_PEERS: serverEnvSchema.shape.FLEET_PEERS,
}).parse(process.env);

/** Stored form of a panel value: bare 10-digit number, or the phrase trimmed as-is. */
function stored(list, value) {
  if (BOT_FILTER_NUMBER_LISTS.includes(list)) return parseNumbers(value).numbers[0] || null;
  return String(value).trim() || null;
}

/** Comparison key: numbers exact, phrases case-insensitive (fleet dedupe semantics). */
const cmpKey = (list, value) => (BOT_FILTER_NUMBER_LISTS.includes(list) ? value : value.normalize('NFC').toLowerCase());

/** Diff one list: what to add here and which of our rows to delete. */
function diffList(list, panelValues, ourRows) {
  const panel = new Map();
  for (const v of panelValues) {
    const s = stored(list, v);
    if (s && !panel.has(cmpKey(list, s))) panel.set(cmpKey(list, s), s);
  }
  const ours = new Map(ourRows.map((r) => [cmpKey(list, r.value), r]));
  return {
    panelCount: panel.size,
    toAdd: [...panel].filter(([k]) => !ours.has(k)).map(([, v]) => v),
    toDelete: ourRows.filter((r) => !panel.has(cmpKey(list, r.value))).map((r) => r.id),
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const peerArg = process.argv[process.argv.indexOf('--peer') + 1];
  const peer = process.argv.includes('--peer') ? env.FLEET_PEERS.find((p) => p.name === peerArg) : env.FLEET_PEERS[0];
  if (!peer) throw new Error('no matching peer in FLEET_PEERS');

  const panel = await createFleetMirror({ peers: [peer] }).get(peer, '/api/block/list');
  if (!panel.data) throw new Error(`${peer.name}: token is not an admin token (no list data)`);

  const prisma = new PrismaClient();
  let changed = 0;
  let drift = 0;
  try {
    for (const [field, { list }] of Object.entries(FLEET_FIELDS)) {
      const ourRows = await prisma.botFilterEntry.findMany({ where: { list }, select: { id: true, value: true } });
      const { panelCount, toAdd, toDelete } = diffList(list, panel.data[field] || [], ourRows);
      drift += toAdd.length + toDelete.length;
      console.log(`${field}: panel ${panelCount}, easecab ${ourRows.length} → add ${toAdd.length}, delete ${toDelete.length}`);
      if (!apply || (toAdd.length === 0 && toDelete.length === 0)) continue;
      if (panelCount === 0) throw new Error(`${field}: panel list is empty — refusing to wipe EaseCab's list`);
      // Add before delete, in one transaction, so the bot never sees a half-empty list.
      const [created, deleted] = await prisma.$transaction([
        prisma.botFilterEntry.createMany({ data: toAdd.map((value) => ({ list, value })), skipDuplicates: true }),
        prisma.botFilterEntry.deleteMany({ where: { id: { in: toDelete } } }),
      ]);
      changed += created.count + deleted.count;
    }
    if (changed > 0) {
      const redis = new Redis(env.REDIS_URL);
      await redis.publish(BOT_FILTERS_CHANGED_CHANNEL, 'fleet-sync').catch(() => {});
      redis.disconnect();
    }
    if (!apply) console.log(drift === 0 ? 'in sync with the panel' : 'dry run — re-run with --apply to copy the panel exactly');
    else console.log(`applied — ${changed} rows changed; EaseCab now matches ${peer.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`fleet-sync failed: ${err.message}`);
  process.exit(1);
});

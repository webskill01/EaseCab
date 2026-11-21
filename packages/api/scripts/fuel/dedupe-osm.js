'use strict';

/**
 * Remove OSM pumps that an oil company's own list already has (same brand, within DUPE_M).
 * The company row wins (dealer code, address); a CNG flag from OSM is copied onto it first.
 * OSM rows with driver reports are kept. Re-run after every OSM re-import.
 *
 *   node --env-file=.env scripts/fuel/dedupe-osm.js           # dry run
 *   node --env-file=.env scripts/fuel/dedupe-osm.js --apply
 */
const { FUEL_SOURCES } = require('@easecab/shared');
const { haversineKm } = require('../../src/features/fuel/fuel.service');

const DUPE_M = 150;
const CELL = 0.01; // ~1 km grid; a dupe is always in the same or a neighbouring cell
const OFFICIAL = { iocl: FUEL_SOURCES.IOCL, hpcl: FUEL_SOURCES.HPCL };
const key = (lat, lng) => `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;

/** @returns {Map<string, object[]>} grid cell → official rows */
function grid(rows) {
  const g = new Map();
  for (const r of rows) {
    const k = key(r.lat, r.lng);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(r);
  }
  return g;
}

/** @returns {object | null} nearest official row of the same brand within DUPE_M */
function match(osm, g) {
  let best = null;
  let bestKm = DUPE_M / 1000;
  const [y, x] = [Math.floor(osm.lat / CELL), Math.floor(osm.lng / CELL)];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (const r of g.get(`${y + dy}:${x + dx}`) || []) {
        const km = haversineKm(osm.lat, osm.lng, r.lat, r.lng);
        if (r.brand === osm.brand && km <= bestKm) { best = r; bestKm = km; }
      }
    }
  }
  return best;
}

/** @param {object[]} osmRows @param {object[]} officialRows @returns {{ osm: object, official: object }[]} */
function findDupes(osmRows, officialRows) {
  const g = grid(officialRows);
  return osmRows.flatMap((osm) => {
    const official = OFFICIAL[osm.brand] ? match(osm, g) : null;
    return official ? [{ osm, official }] : [];
  });
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const select = { id: true, brand: true, lat: true, lng: true, hasCng: true, _count: { select: { reports: true } } };
  try {
    const osm = await prisma.fuelStation.findMany({ where: { source: FUEL_SOURCES.OSM }, select });
    const official = await prisma.fuelStation.findMany({ where: { source: { in: Object.values(OFFICIAL) } }, select });
    const dupes = findDupes(osm, official).filter((d) => d.osm._count.reports === 0);
    const cng = dupes.filter((d) => d.osm.hasCng && !d.official.hasCng).map((d) => d.official.id);
    console.log(`${osm.length} osm rows; ${dupes.length} duplicates to delete; ${cng.length} CNG flags to copy`);
    if (process.argv[2] !== '--apply') return console.log('dry run — pass --apply to write');
    await prisma.fuelStation.updateMany({ where: { id: { in: cng } }, data: { hasCng: true } });
    const { count } = await prisma.fuelStation.deleteMany({ where: { id: { in: dupes.map((d) => d.osm.id) }, reports: { none: {} } } });
    console.log(`deleted ${count}`);
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

module.exports = { findDupes };

'use strict';

/**
 * HPCL outlets (community geojson of HPCL's locator) → fuel import JSONL, north India only.
 *
 *   curl -sSL -o scripts/fuel/data/hp.geojson \
 *     https://raw.githubusercontent.com/MG-LSJ/hp_fuel_stations/main/hp_fuel_stations.geojson
 *   node scripts/fuel/build-hpcl.js scripts/fuel/data/hp.geojson > scripts/fuel/data/hpcl.jsonl
 *
 * Licence: HPCL's site says its data is for non-commercial use unless authorised in
 * writing — get the go-ahead before importing this into production (Phase 30.1).
 * No DB access here; fuel-import.js does the writing.
 */
const fs = require('node:fs');
const { FUEL_SOURCES, FUEL_BRANDS, FUEL_IMPORT_STATES, fuelImportRowSchema } = require('@easecab/shared');

const NORTH = new Set(FUEL_IMPORT_STATES);

/** @param {{ features: object[] }} geojson @returns {{ rows: object[], skipped: number }} */
function hpclToRows(geojson) {
  const rows = [];
  let skipped = 0;
  for (const { geometry, properties: p } of geojson.features) {
    if (!NORTH.has(p.stateCode)) continue;
    const parsed = fuelImportRowSchema.safeParse({
      source: FUEL_SOURCES.HPCL,
      sourceRef: String(p.dealerCode ?? ''),
      name: p.name,
      brand: FUEL_BRANDS.HPCL,
      lat: geometry?.coordinates?.[1],
      lng: geometry?.coordinates?.[0],
      address: p.address || null,
      city: p.city || null,
      stateCode: p.stateCode,
      hasCng: p.cngOutlet === 'Yes',
      hasPetrol: true, // ponytail: every HPCL retail outlet sells both; no per-pump flag in the data
      hasDiesel: true,
    });
    if (parsed.success) rows.push(parsed.data);
    else skipped += 1;
  }
  return { rows, skipped };
}

if (require.main === module) {
  const { rows, skipped } = hpclToRows(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
  process.stdout.write(rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.error(`hpcl: ${rows.length} rows (${rows.filter((r) => r.hasCng).length} CNG), ${skipped} skipped`);
}

module.exports = { hpclToRows };

'use strict';

/**
 * Indian Oil outlets (pipe-separated CSV scraped from IOCL's locator, CC BY 4.0,
 * github.com/devdattaT/IOCL_fuel_station_data) → fuel import JSONL, north India only.
 *
 *   curl -sSL -o scripts/fuel/data/iocl.csv \
 *     https://raw.githubusercontent.com/devdattaT/IOCL_fuel_station_data/main/archive/IOCL_2023_08_17_100450.csv
 *   node scripts/fuel/build-iocl.js scripts/fuel/data/iocl.csv > scripts/fuel/data/iocl.jsonl
 *
 * Dealer names / phone numbers in the file are deliberately NOT imported.
 * ponytail: no CNG column in the source — IOCL CNG comes from drivers / OSM / CGD lists.
 */
const fs = require('node:fs');
const { FUEL_SOURCES, FUEL_BRANDS, fuelImportRowSchema } = require('@easecab/shared');

const STATE = {
  Punjab: 'PB', Haryana: 'HR', Chandigarh: 'CH', Delhi: 'DL', 'Uttar Pradesh': 'UP', Uttarakhand: 'UK',
  'Himachal Pradesh': 'HP', 'Jammu & Kashmir': 'JK', Rajasthan: 'RJ',
};
const COL = { code: 0, name: 1, address: 2, district: 13, state: 14, lat: 19, lng: 20 };
const title = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** @param {string} text pipe CSV @returns {{ rows: object[], skipped: number }} */
function ioclToRows(text) {
  const rows = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/).slice(1)) {
    const f = line.split('|').map((v) => v.trim());
    const stateCode = STATE[f[COL.state]];
    if (!stateCode) continue;
    const parsed = fuelImportRowSchema.safeParse({
      source: FUEL_SOURCES.IOCL,
      sourceRef: f[COL.code],
      name: (f[COL.name] || '').slice(0, 80),
      brand: FUEL_BRANDS.IOCL,
      lat: Number(f[COL.lat]),
      lng: Number(f[COL.lng]),
      address: f[COL.address] ? f[COL.address].replace(/\s+/g, ' ').slice(0, 200) : null,
      city: f[COL.district] ? title(f[COL.district]) : null,
      stateCode,
      hasCng: false,
      hasPetrol: true,
      hasDiesel: true,
    });
    if (parsed.success && parsed.data.lat && parsed.data.lng) rows.push(parsed.data);
    else skipped += 1;
  }
  return { rows, skipped };
}

if (require.main === module) {
  const { rows, skipped } = ioclToRows(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(rows.map((r) => `${JSON.stringify(r)}\n`).join(''));
  console.error(`iocl: ${rows.length} rows, ${skipped} skipped`);
}

module.exports = { ioclToRows };

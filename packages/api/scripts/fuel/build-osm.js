'use strict';

/**
 * OpenStreetMap fuel stations (fetch-osm.js output) → fuel import JSONL.
 *
 *   node scripts/fuel/build-osm.js scripts/fuel/data/osm-*.json > scripts/fuel/data/osm.jsonl
 *
 * HP-branded OSM pumps are skipped: the HPCL import already has them with dealer codes.
 * Other brands (Indian Oil, BPCL, Nayara, Jio-bp, city-gas CNG…) fill the gap.
 * ponytail: no geo de-dupe against other sources; add a 100 m same-brand check if IOCL's own list is imported too.
 */
const fs = require('node:fs');
const path = require('node:path');
const { FUEL_SOURCES, FUEL_BRANDS, fuelImportRowSchema } = require('@easecab/shared');

// First match wins; tested against brand / operator / name together.
const BRAND_RULES = [
  [FUEL_BRANDS.HPCL, /\b(hp|hpcl|hindustan petroleum)\b/i],
  [FUEL_BRANDS.IOCL, /indian ?oil|\biocl?\b/i],
  [FUEL_BRANDS.BPCL, /bharat petroleum|\bbpcl?\b/i],
  [FUEL_BRANDS.NAYARA, /nayara|essar/i],
  [FUEL_BRANDS.JIOBP, /jio|reliance/i],
  [FUEL_BRANDS.SHELL, /\bshell\b/i],
  [FUEL_BRANDS.CGD, /\b(igl|indraprastha gas|gail gas|think gas|torrent gas|adani (total )?gas|haryana city gas|green gas|mngl|mahanagar gas|sanwariya|bhagyanagar gas)\b/i],
];
const LABEL = { iocl: 'Indian Oil', bpcl: 'Bharat Petroleum', nayara: 'Nayara', jiobp: 'Jio-bp', shell: 'Shell', cgd: 'CNG station' };

const brandOf = (t) => (BRAND_RULES.find(([, re]) => re.test([t.brand, t.operator, t.name].filter(Boolean).join(' '))) || [FUEL_BRANDS.OTHER])[0];
const yes = (v) => v === 'yes';

/** @param {object} el Overpass element @param {string} stateCode @returns {object | null} import row or null */
function osmToRow(el, stateCode) {
  const t = el.tags || {};
  const brand = brandOf(t);
  if (brand === FUEL_BRANDS.HPCL) return null;
  const cngOnly = brand === FUEL_BRANDS.CGD;
  const tagged = Object.keys(t).some((k) => k.startsWith('fuel:'));
  const parsed = fuelImportRowSchema.safeParse({
    source: FUEL_SOURCES.OSM,
    sourceRef: `${el.type}/${el.id}`,
    name: (t.name || t.brand || LABEL[brand] || '').slice(0, 80),
    brand,
    lat: el.lat ?? el.center?.lat,
    lng: el.lon ?? el.center?.lon,
    address: [t['addr:street'], t['addr:city']].filter(Boolean).join(', ') || null,
    city: t['addr:city'] || null,
    stateCode,
    hasCng: cngOnly || yes(t['fuel:cng']) || /\bcng\b/i.test(t.name || ''),
    // Untagged pumps in India sell both; a CGD station sells only CNG.
    hasPetrol: !cngOnly && (!tagged || Object.keys(t).some((k) => k.startsWith('fuel:octane') && yes(t[k]))),
    hasDiesel: !cngOnly && (!tagged || yes(t['fuel:diesel'])),
  });
  return parsed.success ? parsed.data : null;
}

if (require.main === module) {
  let kept = 0;
  let dropped = 0;
  for (const file of process.argv.slice(2)) {
    const state = path.basename(file).match(/osm-([A-Z]{2})\.json$/)[1];
    for (const el of JSON.parse(fs.readFileSync(file, 'utf8')).elements) {
      const row = osmToRow(el, state);
      if (row) { process.stdout.write(`${JSON.stringify(row)}\n`); kept += 1; } else dropped += 1;
    }
  }
  console.error(`osm: ${kept} rows, ${dropped} dropped (HP duplicates or unusable)`);
}

module.exports = { osmToRow, brandOf };

'use strict';

/**
 * Download OpenStreetMap fuel stations (amenity=fuel) per launch state from the public
 * Overpass API into scripts/fuel/data/osm-<STATE>.json. Overpass is often at capacity,
 * so each state retries across mirrors with a growing pause. Already-saved states are skipped.
 *
 *   node scripts/fuel/fetch-osm.js            # all FUEL_IMPORT_STATES
 *   node scripts/fuel/fetch-osm.js PB HR      # just these
 *
 * Licence: ODbL — commercial use OK with attribution ("© OpenStreetMap contributors").
 */
const fs = require('node:fs');
const path = require('node:path');
const { FUEL_IMPORT_STATES } = require('@easecab/shared');

const DATA = path.join(__dirname, 'data');
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const UA = 'easecab-fuel-import/1.0 (one-off seed import)';
const TRIES = 8;
const PAUSE_MS = 30000;
// ISO 3166-2 codes; Uttarakhand changed UT→UK in 2020 and OSM has used both.
const ISO = { UK: '^IN-(UK|UT)$' };

const query = (state) => `[out:json][timeout:180];area["ISO3166-2"~"${ISO[state] || `^IN-${state}$`}"]->.a;nwr["amenity"="fuel"](area.a);out center tags;`;

async function fetchState(state) {
  for (let i = 0; i < TRIES; i += 1) {
    const url = MIRRORS[i % MIRRORS.length];
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query(state))}` });
      const text = await res.text();
      if (res.ok && text.startsWith('{')) return JSON.parse(text);
      console.error(`${state}: ${url} → ${res.status}, retrying`);
    } catch (err) {
      console.error(`${state}: ${url} → ${err.message}, retrying`);
    }
    await new Promise((r) => { setTimeout(r, PAUSE_MS * (i + 1)); });
  }
  throw new Error(`${state}: Overpass unavailable after ${TRIES} tries`);
}

/** True only for a real Overpass result (a failed run can leave an error page behind). */
function saved(file) {
  try {
    return Array.isArray(JSON.parse(fs.readFileSync(file, 'utf8')).elements);
  } catch {
    return false;
  }
}

async function main() {
  fs.mkdirSync(DATA, { recursive: true });
  const states = process.argv.slice(2).length ? process.argv.slice(2) : FUEL_IMPORT_STATES;
  for (const state of states) {
    const file = path.join(DATA, `osm-${state}.json`);
    if (saved(file)) { console.log(`${state}: already saved`); continue; }
    const json = await fetchState(state);
    fs.writeFileSync(file, JSON.stringify(json));
    console.log(`${state}: ${json.elements.length} stations`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

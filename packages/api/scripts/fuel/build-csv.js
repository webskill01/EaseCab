'use strict';

/**
 * Hand-collected station list (Google Sheet → File → Download → CSV) → fuel import JSONL.
 * Use for city-gas CNG lists (IGL, Think Gas, Torrent…) or any brand the other sources miss.
 *
 * Header row (any order): source,ref,name,brand,lat,lng,fuels,address,city,state
 *   source = cgd | iocl | hpcl     ref = the company's station code (or any unique id per source)
 *   brand  = iocl | hpcl | bpcl | nayara | jiobp | shell | cgd | other
 *   fuels  = cng / petrol / diesel joined with "+", e.g. "cng" or "petrol+diesel+cng"
 *   lat,lng = right-click the pump in Google Maps → click the numbers to copy them
 *
 *   node scripts/fuel/build-csv.js scripts/fuel/data/igl.csv > scripts/fuel/data/igl.jsonl
 *
 * ponytail: simple CSV — quoted fields with commas are supported, embedded newlines are not.
 */
const fs = require('node:fs');
const { fuelImportRowSchema } = require('@easecab/shared');

/** Split one CSV line, honouring "double-quoted, fields" and "" escapes. */
function splitLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted && c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; } else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** @param {string} text CSV @returns {{ rows: object[], bad: number[] }} bad = 1-based line numbers */
function csvToRows(text) {
  const lines = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split(/\r?\n/); // drop Excel's BOM
  const head = splitLine(lines[0]).map((h) => h.toLowerCase());
  const rows = [];
  const bad = [];
  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const r = Object.fromEntries(splitLine(line).map((v, j) => [head[j], v]));
    const fuels = (r.fuels || '').toLowerCase().split('+').map((f) => f.trim());
    const parsed = fuelImportRowSchema.safeParse({
      source: r.source, sourceRef: r.ref, name: r.name, brand: r.brand || 'other',
      lat: Number(r.lat), lng: Number(r.lng), address: r.address || null, city: r.city || null,
      stateCode: r.state ? r.state.toUpperCase() : null,
      hasCng: fuels.includes('cng'), hasPetrol: fuels.includes('petrol'), hasDiesel: fuels.includes('diesel'),
    });
    if (parsed.success) rows.push(parsed.data);
    else bad.push(i + 2);
  });
  return { rows, bad };
}

if (require.main === module) {
  const { rows, bad } = csvToRows(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(rows.map((r) => `${JSON.stringify(r)}\n`).join(''));
  console.error(`csv: ${rows.length} rows; ${bad.length} bad${bad.length ? ` (lines ${bad.slice(0, 15).join(', ')})` : ''}`);
}

module.exports = { csvToRows };

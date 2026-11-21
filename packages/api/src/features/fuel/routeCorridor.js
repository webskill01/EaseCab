'use strict';

/**
 * Pure geometry for "pumps along my route" (Phase 30.7). Points are [lat, lng].
 * Distances use a local flat projection — accurate to metres at corridor scale (≤ a few km).
 */
const KM_PER_DEG = (Math.PI / 180) * 6371;
const rad = (d) => (d * Math.PI) / 180;

/** Flat-earth km between two nearby points. */
function flatKm([lat1, lng1], [lat2, lng2]) {
  const x = (lng2 - lng1) * Math.cos(rad((lat1 + lat2) / 2)) * KM_PER_DEG;
  const y = (lat2 - lat1) * KM_PER_DEG;
  return Math.hypot(x, y);
}

/** Running km at each point. @param {number[][]} pts @returns {number[]} */
function cumulativeKm(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) cum.push(cum[i - 1] + flatKm(pts[i - 1], pts[i]));
  return cum;
}

/**
 * Split the route into ~chunkKm pieces (sharing their boundary point) with a lat/lng box
 * around each, padded by padKm — one DB box query per piece.
 * @returns {{ from: number, to: number, box: { minLat: number, maxLat: number, minLng: number, maxLng: number } }[]}
 */
function chunks(pts, cum, chunkKm, padKm) {
  const out = [];
  let start = 0;
  for (let i = 1; i < pts.length; i += 1) {
    if (cum[i] - cum[start] >= chunkKm || i === pts.length - 1) {
      const part = pts.slice(start, i + 1);
      const lats = part.map((p) => p[0]);
      const lngs = part.map((p) => p[1]);
      const dLat = padKm / KM_PER_DEG;
      const dLng = padKm / (KM_PER_DEG * Math.cos(rad(Math.max(...lats.map(Math.abs)))));
      out.push({
        from: start,
        to: i,
        box: { minLat: Math.min(...lats) - dLat, maxLat: Math.max(...lats) + dLat, minLng: Math.min(...lngs) - dLng, maxLng: Math.max(...lngs) + dLng },
      });
      start = i;
    }
  }
  return out;
}

/**
 * Closest spot on route segments [from, to] to point p.
 * @returns {{ offKm: number, alongKm: number }}
 */
function nearestOnRoute(p, pts, cum, from, to) {
  let best = { offKm: Infinity, alongKm: 0 };
  const cos = Math.cos(rad(p[0]));
  const xy = (q) => [(q[1] - p[1]) * cos * KM_PER_DEG, (q[0] - p[0]) * KM_PER_DEG]; // p at origin
  for (let i = from; i < to; i += 1) {
    const [ax, ay] = xy(pts[i]);
    const [bx, by] = xy(pts[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0;
    const off = Math.hypot(ax + t * dx, ay + t * dy);
    if (off < best.offKm) best = { offKm: off, alongKm: cum[i] + t * (cum[i + 1] - cum[i]) };
  }
  return best;
}

/** Keep at most n points (always the last) for drawing. */
function downsample(pts, n) {
  if (pts.length <= n) return pts;
  const step = Math.ceil(pts.length / n);
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
}

/** Straight line from → to, one point per ~2 km, when no road route is available. */
function straightLine(from, to) {
  const n = Math.max(1, Math.ceil(flatKm([from.lat, from.lng], [to.lat, to.lng]) / 2));
  return Array.from({ length: n + 1 }, (_, i) => [from.lat + ((to.lat - from.lat) * i) / n, from.lng + ((to.lng - from.lng) * i) / n]);
}

module.exports = { flatKm, cumulativeKm, chunks, nearestOnRoute, downsample, straightLine };

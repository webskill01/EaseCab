'use strict';

const { GOOGLE_ROUTES } = require('@easecab/shared');

/**
 * Google's encoded polyline format → [[lat, lng], …].
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 * @param {string} str @returns {number[][]}
 */
function decodePolyline(str) {
  const points = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let shift = 0;
    let result = 0;
    let b;
    do {
      b = str.charCodeAt(i) - 63;
      i += 1;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) {
    lat += next();
    lng += next();
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/**
 * THE Google Routes API boundary (fuel pickup → drop). Server key only; never logged.
 * DRIVE + TRAFFIC_UNAWARE keeps every call on the cheapest (Essentials) SKU.
 * @param {{ apiKey: string }} creds
 */
function createGoogleRoutesClient({ apiKey }) {
  const at = ({ lat, lng }) => ({ location: { latLng: { latitude: lat, longitude: lng } } });
  return {
    /**
     * @param {{ lat: number, lng: number }} from @param {{ lat: number, lng: number }} to
     * @returns {Promise<{ encoded: string, distanceKm: number, durationMin: number } | null>} null = no road route
     */
    async computeRoute(from, to) {
      const res = await fetch(GOOGLE_ROUTES.URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': GOOGLE_ROUTES.FIELD_MASK },
        body: JSON.stringify({
          origin: at(from), destination: at(to), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE', polylineQuality: 'HIGH_QUALITY',
        }),
        signal: AbortSignal.timeout(GOOGLE_ROUTES.TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`google routes ${res.status}`);
      const route = (await res.json()).routes?.[0];
      if (!route?.polyline?.encodedPolyline) return null;
      return {
        encoded: route.polyline.encodedPolyline,
        distanceKm: Math.round(route.distanceMeters / 100) / 10,
        durationMin: Math.round(parseInt(route.duration, 10) / 60),
      };
    },
  };
}

module.exports = { createGoogleRoutesClient, decodePolyline };

'use strict';
const { matchVehicle } = require('@easecab/shared');

/**
 * Extract the canonical vehicle-type label from a ride message.
 * Thin wrapper over shared `matchVehicle` — the keyword catalog and specificity
 * ordering live in `@easecab/shared` (constants/vehicles.js) so api/web reuse them.
 * @param {string} text - raw message text
 * @returns {string|null} canonical vehicle label (e.g. 'Innova'), or null if none matched
 */
function extractVehicle(text) {
  return matchVehicle(text);
}

module.exports = { extractVehicle };

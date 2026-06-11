'use strict';

// Logic promoted to @easecab/shared (Step 20). Re-exported here so the bot's
// existing local importers (maskPhone, isRideMessage, processMessage) + tests
// keep their paths. Single source of truth now lives in shared/parsing.
const { extractCities, normalizeText } = require('@easecab/shared');

module.exports = { extractCities, normalizeText };

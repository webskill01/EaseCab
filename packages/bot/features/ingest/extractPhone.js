'use strict';

// Logic promoted to @easecab/shared (Step 20). Re-exported here so the bot's
// existing local importers (maskPhone, processMessage) + tests keep their paths.
// Single source of truth now lives in shared/parsing.
const { extractPhone, phoneRegex } = require('@easecab/shared');

module.exports = { extractPhone, phoneRegex };

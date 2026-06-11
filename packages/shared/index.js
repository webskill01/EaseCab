'use strict';

/**
 * @easecab/shared — single source of cross-cutting truth: Zod schemas, frozen
 * constants, the AppError type, and shared services. Consumed by api, bot,
 * admin, and web.
 *
 * Note: `config/env` is intentionally NOT re-exported here — importing it runs
 * env validation as a side effect (and may exit the process). Import it directly
 * (`require('@easecab/shared/config/env')`) from process entry points only.
 */
module.exports = {
  ...require('./constants'),
  ...require('./schemas'),
  ...require('./parsing'),
  ...require('./errors/AppError'),
  ...require('./services'),
  ...require('./lib/subscriptionWindow'),
  ...require('./lib/verificationGate'),
};

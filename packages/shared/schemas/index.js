'use strict';

/** Barrel for shared Zod schemas. Feature schemas are added by their build steps. */
module.exports = {
  ...require('./env.schema'),
  ...require('./auth.schema'),
};

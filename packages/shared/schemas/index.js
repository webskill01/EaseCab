'use strict';

/** Barrel for shared Zod schemas. Feature schemas are added by their build steps. */
module.exports = {
  ...require('./env.schema'),
  ...require('./auth.schema'),
  ...require('./rides.schema'),
  ...require('./subscription.schema'),
  ...require('./verification.schema'),
  ...require('./postedRides.schema'),
  ...require('./cities.schema'),
  ...require('./chat.schema'),
  ...require('./push.schema'),
  ...require('./contacts.schema'),
};

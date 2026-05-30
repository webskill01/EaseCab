'use strict';

/** Barrel for the CityResolverService. */
module.exports = {
  ...require('./createCityResolver'),
  ...require('./normalize'),
};

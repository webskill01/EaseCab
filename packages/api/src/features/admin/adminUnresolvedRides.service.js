'use strict';

const { AppError, ERROR_CODES, UNRESOLVED_RIDE_ACTION, UNRESOLVED_RIDE_SIDE } = require('@easecab/shared');

/** Map the request `side` to the Prisma FK column it sets. */
const SIDE_FIELD = Object.freeze({
  [UNRESOLVED_RIDE_SIDE.PICKUP]: 'pickupCityId',
  [UNRESOLVED_RIDE_SIDE.DROP]: 'dropCityId',
});

/**
 * Admin unresolved-rides business logic (CLAUDE.md §4). The queue holds live bot
 * rides the CityResolver left without a pickup/drop city. `set_city` fills the
 * missing FK (forward-looking — the resolver itself is untouched); `hide` takes the
 * ride down. No alias is written: this is a one-off fix on a single ride, not a
 * resolver rule (that is the city-strings queue's job).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminUnresolvedRides.repository').createAdminUnresolvedRidesRepository>} deps.repo
 */
function createAdminUnresolvedRidesService({ repo }) {
  /** Set the targeted side's city after confirming it is unset and the city is real. */
  async function setCity(ride, side, cityId) {
    const field = SIDE_FIELD[side];
    // Never overwrite a side that is already resolved — only the null endpoint is fixable.
    if (ride[field] !== null) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
    if (!(await repo.cityExists(cityId))) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
    await repo.setCity(ride.id, field, cityId);
  }

  return {
    /** Offset-paginated queue of live rides missing a city (newest first). */
    async list({ page, limit }) {
      const { rows, total } = await repo.listQueue({ page, limit });
      return { items: rows, total, page, limit };
    },

    /**
     * Set a missing city or hide the ride. NOT_FOUND if the ride is gone, already
     * fully resolved, expired/hidden, the targeted side is already set, or (on
     * set_city) the target city does not exist.
     */
    async act(id, { action, side, cityId }) {
      const ride = await repo.findActionable(id);
      if (!ride) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      if (action === UNRESOLVED_RIDE_ACTION.SET_CITY) {
        await setCity(ride, side, cityId);
      } else {
        await repo.hide(id);
      }
      return { id, action };
    },
  };
}

module.exports = { createAdminUnresolvedRidesService };

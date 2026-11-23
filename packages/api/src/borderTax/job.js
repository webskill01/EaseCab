'use strict';

const DAY_MS = 86_400_000;

/** DB row → flow job. Window ends a minute early, so +1 min gives whole days. */
function toJob(req) {
  const days = Math.round((req.taxUpto.getTime() - req.taxFrom.getTime() + 60_000) / DAY_MS);
  return {
    stateCd: req.stateCd, permitType: req.permitType, vehicleNo: req.vehicleNo,
    checkpost: req.checkpost, startAt: req.taxFrom, days, distanceKm: req.distanceKm, taxMode: req.taxMode,
  };
}

module.exports = { toJob };

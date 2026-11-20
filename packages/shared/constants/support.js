'use strict';

/** Support chat hours, IST, every day: START_HOUR inclusive, END_HOUR exclusive (9am–5pm). */
const SUPPORT_HOURS = Object.freeze({ START_HOUR: 9, END_HOUR: 17, TIME_ZONE: 'Asia/Kolkata' });

module.exports = { SUPPORT_HOURS };

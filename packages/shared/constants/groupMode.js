'use strict';

/**
 * Group Mode (Phase 31): the paid WhatsApp-style rides view. Each group is a pickup
 * city; two special groups sit beside them.
 */
const GROUP_MODE = Object.freeze({
  MAX_GROUPS: 30,
  // The Punjab Taxi Group city groups (#1-#11; #7 no longer exists, #12 All Area = ALL).
  DEFAULT_CITY_NAMES: Object.freeze([
    'Delhi', 'Chandigarh', 'Mohali', 'Amritsar', 'Patiala', 'Ludhiana', 'Ambala', 'Zirakpur', 'Noida', 'Gurugram',
  ]),
  SPECIAL: Object.freeze({ ALL: 'all', DUTIES: 'duties' }),
  DEFAULT_PINNED: Object.freeze(['all']), // All Mix Duty pinned until the user unpins it
  PREVIEW_CHARS: 90, // chat-list last-message preview length
});

module.exports = { GROUP_MODE };

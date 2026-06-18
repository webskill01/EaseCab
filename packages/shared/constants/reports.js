'use strict';

/**
 * User-facing ride/post report limits. The report reasons themselves are the
 * shared REPORT_REASON enum (see constants/enums.js). REMARKS_MAX bounds the
 * optional free-text remark a reporter can attach.
 */
const REPORT = Object.freeze({
  REMARKS_MAX: 500,
});

module.exports = { REPORT };

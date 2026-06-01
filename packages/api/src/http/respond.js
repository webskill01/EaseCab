'use strict';

const { HTTP_STATUS } = require('@easecab/shared');

/**
 * Send a success response in the locked envelope (CLAUDE.md §3.4:
 * `{ success, data?, error?, meta? }`). The error path never comes through here —
 * thrown AppErrors are shaped by the global error handler.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {*} [options.data=null] - the payload (always present, null if absent)
 * @param {object} [options.meta] - pagination/aux metadata; included only if given
 * @param {number} [options.status=200] - HTTP status
 * @returns {import('express').Response}
 */
function sendSuccess(res, { data = null, meta, status = HTTP_STATUS.OK } = {}) {
  const body = { success: true, data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(status).json(body);
}

module.exports = { sendSuccess };

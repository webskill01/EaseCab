'use strict';

const { ERROR_CODES, ERROR_CATALOG } = require('../constants');

/**
 * The single error type thrown across the app (CLAUDE.md §9). Carries a stable
 * machine-readable `code`, a generic user-safe `message`, and the HTTP
 * `statusCode` the global Express error handler should respond with.
 *
 * `isOperational` distinguishes expected errors (bad input, not found, rate
 * limited) from unexpected programmer bugs — the handler logs the latter louder.
 */
class AppError extends Error {
  /**
   * @param {string} code - one of constants ERROR_CODES
   * @param {string} message - generic, user-safe message
   * @param {number} [statusCode=500] - HTTP status to respond with
   */
  constructor(code, message, statusCode = 500) {
    super(message);
    if (!ERROR_CATALOG[code]) {
      throw new Error(`AppError: unknown error code "${code}"`);
    }
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, AppError);
  }

  /**
   * Build an AppError from a known code, using the catalog's default status and
   * message unless overridden.
   * @param {string} code - one of constants ERROR_CODES
   * @param {string} [message] - override the catalog default message
   * @returns {AppError}
   */
  static fromCode(code, message) {
    const entry = ERROR_CATALOG[code];
    if (!entry) {
      throw new Error(`AppError.fromCode: unknown error code "${code}"`);
    }
    return new AppError(code, message ?? entry.message, entry.status);
  }
}

module.exports = { AppError, ERROR_CODES };

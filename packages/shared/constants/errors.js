'use strict';

const { HTTP_STATUS } = require('./httpStatus');

/**
 * The locked set of API error codes (CLAUDE.md §8). Every AppError carries one of
 * these. The frontend may branch on `error.code`; messages here are generic and
 * safe to surface (real detail stays in server logs — CLAUDE.md §9).
 */
const ERROR_CODES = Object.freeze({
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

/**
 * Default HTTP status + user-facing message for each code. Used by
 * AppError.fromCode when the caller does not override them.
 * @type {Readonly<Record<string, Readonly<{ status: number, message: string }>>>}
 */
const ERROR_CATALOG = Object.freeze({
  [ERROR_CODES.AUTH_REQUIRED]: Object.freeze({
    status: HTTP_STATUS.UNAUTHORIZED,
    message: 'Authentication is required to continue.',
  }),
  [ERROR_CODES.SUBSCRIPTION_EXPIRED]: Object.freeze({
    status: HTTP_STATUS.FORBIDDEN,
    message: 'Your subscription has expired.',
  }),
  [ERROR_CODES.VERIFICATION_REQUIRED]: Object.freeze({
    status: HTTP_STATUS.FORBIDDEN,
    message: 'Account verification is required to continue.',
  }),
  [ERROR_CODES.RATE_LIMITED]: Object.freeze({
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many requests. Please try again shortly.',
  }),
  [ERROR_CODES.NOT_FOUND]: Object.freeze({
    status: HTTP_STATUS.NOT_FOUND,
    message: 'The requested resource was not found.',
  }),
  [ERROR_CODES.VALIDATION_ERROR]: Object.freeze({
    status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    message: 'The request was invalid.',
  }),
  [ERROR_CODES.INTERNAL_ERROR]: Object.freeze({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Something went wrong. Please try again later.',
  }),
});

module.exports = { ERROR_CODES, ERROR_CATALOG };

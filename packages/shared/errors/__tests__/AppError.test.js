'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { AppError } = require('../AppError');
const { ERROR_CODES } = require('../../constants');

test('AppError extends Error and is throwable/catchable as Error', () => {
  const err = new AppError(ERROR_CODES.NOT_FOUND, 'Ride not found', 404);
  assert.ok(err instanceof Error);
  assert.ok(err instanceof AppError);
  assert.equal(err.name, 'AppError');
});

test('AppError stores code, message, and statusCode', () => {
  const err = new AppError(ERROR_CODES.VALIDATION_ERROR, 'Bad input', 422);
  assert.equal(err.code, 'VALIDATION_ERROR');
  assert.equal(err.message, 'Bad input');
  assert.equal(err.statusCode, 422);
});

test('AppError defaults statusCode to 500 when omitted', () => {
  const err = new AppError(ERROR_CODES.INTERNAL_ERROR, 'Boom');
  assert.equal(err.statusCode, 500);
});

test('AppError marks itself operational (expected, not a programmer bug)', () => {
  const err = new AppError(ERROR_CODES.AUTH_REQUIRED, 'Login required', 401);
  assert.equal(err.isOperational, true);
});

test('AppError captures a stack trace', () => {
  const err = new AppError(ERROR_CODES.INTERNAL_ERROR, 'Boom', 500);
  assert.ok(typeof err.stack === 'string' && err.stack.length > 0);
});

test('AppError rejects an unknown error code', () => {
  assert.throws(() => new AppError('NOT_A_REAL_CODE', 'x', 400), /unknown error code/i);
});

test('AppError.fromCode builds with the code default status', () => {
  const err = AppError.fromCode(ERROR_CODES.RATE_LIMITED);
  assert.equal(err.code, 'RATE_LIMITED');
  assert.equal(err.statusCode, 429);
  assert.equal(typeof err.message, 'string');
});

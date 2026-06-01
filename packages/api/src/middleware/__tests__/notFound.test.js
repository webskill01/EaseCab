'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AppError, ERROR_CODES } = require('@easecab/shared');
const { notFound } = require('../notFound');

test('forwards an AppError(NOT_FOUND) to next', () => {
  let forwarded = null;
  notFound({ method: 'GET', path: '/nope' }, {}, (e) => {
    forwarded = e;
  });
  assert.ok(forwarded instanceof AppError);
  assert.equal(forwarded.code, ERROR_CODES.NOT_FOUND);
});

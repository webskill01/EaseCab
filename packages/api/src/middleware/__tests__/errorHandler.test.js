'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');
const { AppError, ERROR_CODES, HTTP_STATUS } = require('@easecab/shared');
const { createErrorHandler } = require('../errorHandler');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

/** Logger that records the highest-severity call. */
function mockLogger() {
  const calls = { error: [], warn: [], info: [] };
  return {
    error: (...a) => calls.error.push(a),
    warn: (...a) => calls.warn.push(a),
    info: (...a) => calls.info.push(a),
    _calls: calls,
  };
}

const req = { id: 'req-1', method: 'GET', path: '/api/v1/rides' };

test('maps an AppError to its status + the locked error envelope', () => {
  const res = mockRes();
  const logger = mockLogger();
  const handler = createErrorHandler({ logger });
  handler(AppError.fromCode(ERROR_CODES.NOT_FOUND), req, res, () => {});
  assert.equal(res.statusCode, HTTP_STATUS.NOT_FOUND);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, ERROR_CODES.NOT_FOUND);
  assert.ok(typeof res.body.error.message === 'string');
});

test('maps a ZodError to 422 VALIDATION_ERROR', () => {
  const res = mockRes();
  const handler = createErrorHandler({ logger: mockLogger() });
  let zErr;
  try {
    z.object({ x: z.string() }).parse({});
  } catch (e) {
    zErr = e;
  }
  handler(zErr, req, res, () => {});
  assert.equal(res.statusCode, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  assert.equal(res.body.error.code, ERROR_CODES.VALIDATION_ERROR);
});

test('ZodError logging strips the raw `received` value (PII guard, §10)', () => {
  const res = mockRes();
  const logger = mockLogger();
  const handler = createErrorHandler({ logger });
  let zErr;
  try {
    // Mimic a bad-phone failure: the raw input must NOT end up in the logs.
    z.object({ phone: z.string().regex(/^\+91\d{10}$/) }).parse({ phone: '+91SECRET999' });
  } catch (e) {
    zErr = e;
  }
  handler(zErr, req, res, () => {});
  const logged = JSON.stringify(logger._calls.warn);
  assert.ok(!logged.includes('SECRET'), 'received value must not be logged');
  assert.ok(!logged.includes('received'), 'no `received` field in the issue detail');
  assert.ok(logged.includes('phone'), 'the field path is still logged for debugging');
});

test('maps an unknown error to a generic 500 INTERNAL_ERROR (no leak) and logs it', () => {
  const res = mockRes();
  const logger = mockLogger();
  const handler = createErrorHandler({ logger });
  handler(new Error('DB password is hunter2'), req, res, () => {});
  assert.equal(res.statusCode, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  assert.equal(res.body.error.code, ERROR_CODES.INTERNAL_ERROR);
  // The raw message must never reach the client.
  assert.ok(!res.body.error.message.includes('hunter2'));
  // ...but it must be logged at error level for the operator.
  assert.equal(logger._calls.error.length, 1);
});

test('includes the requestId in meta for support correlation', () => {
  const res = mockRes();
  const handler = createErrorHandler({ logger: mockLogger() });
  handler(AppError.fromCode(ERROR_CODES.NOT_FOUND), req, res, () => {});
  assert.equal(res.body.meta.requestId, 'req-1');
});

test('delegates to next when headers were already sent', () => {
  const res = mockRes();
  res.headersSent = true;
  const handler = createErrorHandler({ logger: mockLogger() });
  let forwarded = null;
  const err = new Error('boom');
  handler(err, req, res, (e) => {
    forwarded = e;
  });
  assert.equal(forwarded, err);
  assert.equal(res.statusCode, null); // never tried to respond
});

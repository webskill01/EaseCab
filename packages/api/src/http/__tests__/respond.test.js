'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendSuccess } = require('../respond');

/** Minimal res double capturing status + json. */
function mockRes() {
  return {
    statusCode: null,
    body: null,
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

test('sendSuccess defaults to 200 and wraps data in the success shape', () => {
  const res = mockRes();
  sendSuccess(res, { data: { id: 1 } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: { id: 1 } });
});

test('sendSuccess includes meta only when provided', () => {
  const res = mockRes();
  sendSuccess(res, { data: [1, 2], meta: { nextCursor: 'abc' } });
  assert.deepEqual(res.body, { success: true, data: [1, 2], meta: { nextCursor: 'abc' } });
});

test('sendSuccess honours an explicit status (201)', () => {
  const res = mockRes();
  sendSuccess(res, { data: { id: 1 }, status: 201 });
  assert.equal(res.statusCode, 201);
});

test('sendSuccess sends data:null when no data is given', () => {
  const res = mockRes();
  sendSuccess(res, {});
  assert.deepEqual(res.body, { success: true, data: null });
});

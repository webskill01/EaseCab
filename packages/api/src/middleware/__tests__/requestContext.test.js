'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requestContext } = require('../requestContext');

function mockRes() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
  };
}

test('assigns a UUID request id and echoes it on the response header', () => {
  const req = { headers: {} };
  const res = mockRes();
  let called = false;
  requestContext(req, res, () => {
    called = true;
  });
  assert.ok(called);
  assert.match(req.id, /^[0-9a-f-]{36}$/);
  assert.equal(res.headers['x-request-id'], req.id);
});

test('reuses an inbound x-request-id header when present', () => {
  const req = { headers: { 'x-request-id': 'trace-123' } };
  const res = mockRes();
  requestContext(req, res, () => {});
  assert.equal(req.id, 'trace-123');
  assert.equal(res.headers['x-request-id'], 'trace-123');
});

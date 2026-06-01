'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');
const { ZodError } = require('zod');
const { validate } = require('../validate');

const schema = z.object({ city: z.string().min(1), page: z.coerce.number().default(1) });

/** Capture the single next(err?) call. */
function spyNext() {
  const calls = [];
  const next = (err) => calls.push(err);
  return { next, calls };
}

test('passes valid input, writing the parsed (coerced) value to req.valid[source]', () => {
  const req = { body: { city: 'amritsar', page: '3' } };
  const { next, calls } = spyNext();
  validate(schema)(req, {}, next);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], undefined); // next() with no error
  assert.equal(req.valid.body.page, 3); // coerced number, not the string '3'
  assert.equal(req.valid.body.city, 'amritsar');
});

test('forwards a ZodError to next on invalid input', () => {
  const req = { body: { city: '' } };
  const { next, calls } = spyNext();
  validate(schema)(req, {}, next);
  assert.equal(calls.length, 1);
  assert.ok(calls[0] instanceof ZodError);
});

test('defaults to the body source but can target query', () => {
  const req = { query: { city: 'ludhiana' } };
  const { next, calls } = spyNext();
  validate(schema, 'query')(req, {}, next);
  assert.equal(calls[0], undefined);
  assert.equal(req.valid.query.page, 1); // default applied
  assert.equal(req.query.city, 'ludhiana'); // original untouched
});

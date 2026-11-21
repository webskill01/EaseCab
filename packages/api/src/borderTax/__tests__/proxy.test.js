'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { BORDER_TAX } = require('@easecab/shared');
const { proxyFor } = require('../proxy');

const URL_ = 'http://r_abc-country-in:p%40ss@v2.example.test:5000';

test('HR filing → its own sticky session on the proxy; Vahan + PayU bypassed', () => {
  assert.deepStrictEqual(proxyFor(URL_, { stateCd: 'HR', sid: '7210aa0f-1253-45d1-bd29-509e12460f46' }), {
    server: 'http://v2.example.test:5000',
    username: 'r_abc-country-in-sid-7210aa0f1253',
    password: 'p@ss',
    bypass: BORDER_TAX.PROXY_BYPASS,
  });
  assert.ok(BORDER_TAX.PROXY_BYPASS.startsWith('*parivahan.gov.in, *payu.in'));
});

test('a {sid} placeholder in the username takes the session id in place', () => {
  const p = proxyFor('http://u1-country-IN-session-{sid}-lifetime-30:pw@resi.example.test:6666', { stateCd: 'HR', sid: 'r7210aa0f-1253' });
  assert.strictEqual(p.username, 'u1-country-IN-session-r7210aa0f125-lifetime-30');
});

test('other states, unlock lookups (no job) and an unset proxy go direct', () => {
  assert.strictEqual(proxyFor(URL_, { stateCd: 'HP', sid: 'x' }), undefined);
  assert.strictEqual(proxyFor(URL_, undefined), undefined);
  assert.strictEqual(proxyFor(undefined, { stateCd: 'HR', sid: 'x' }), undefined);
});

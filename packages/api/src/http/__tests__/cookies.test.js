'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { AUTH_COOKIES, ADMIN_AUTH_COOKIES } = require('@easecab/shared');
const { setAuthCookies, clearAuthCookies, setAdminAuthCookies, clearAdminAuthCookies } = require('../cookies');

function fakeRes() {
  const set = [];
  const cleared = [];
  return {
    set,
    cleared,
    cookie: (name, value, opts) => set.push({ name, value, opts }),
    clearCookie: (name, opts) => cleared.push({ name, opts }),
  };
}

test('setAuthCookies sets both cookies httpOnly + secure + lax with maxAge from TTL', () => {
  const res = fakeRes();
  setAuthCookies(res, { accessToken: 'AAA', refreshToken: 'RRR' },
    { secure: true, accessTtl: '15m', refreshTtl: '30d' });

  const at = res.set.find((c) => c.name === AUTH_COOKIES.ACCESS_TOKEN);
  const rt = res.set.find((c) => c.name === AUTH_COOKIES.REFRESH_TOKEN);
  assert.strictEqual(at.value, 'AAA');
  assert.deepStrictEqual(at.opts, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 900_000 });
  assert.strictEqual(rt.value, 'RRR');
  assert.strictEqual(rt.opts.maxAge, 2_592_000_000);
});

test('clearAuthCookies clears both with matching attributes', () => {
  const res = fakeRes();
  clearAuthCookies(res, { secure: false });
  assert.strictEqual(res.cleared.length, 2);
  for (const c of res.cleared) {
    assert.deepStrictEqual(c.opts, { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
  }
});

test('setAdminAuthCookies sets the admin cookie names httpOnly with maxAge from TTL', () => {
  const res = fakeRes();
  setAdminAuthCookies(res, { accessToken: 'A', refreshToken: 'R' },
    { secure: true, accessTtl: '15m', refreshTtl: '8h' });

  assert.deepStrictEqual(res.set.map((c) => c.name), [ADMIN_AUTH_COOKIES.ACCESS_TOKEN, ADMIN_AUTH_COOKIES.REFRESH_TOKEN]);
  const at = res.set.find((c) => c.name === ADMIN_AUTH_COOKIES.ACCESS_TOKEN);
  const rt = res.set.find((c) => c.name === ADMIN_AUTH_COOKIES.REFRESH_TOKEN);
  assert.deepStrictEqual(at.opts, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 900_000 });
  assert.strictEqual(rt.opts.maxAge, 28_800_000);
});

test('clearAdminAuthCookies clears both admin cookies', () => {
  const res = fakeRes();
  clearAdminAuthCookies(res, { secure: false });
  assert.deepStrictEqual(res.cleared.map((c) => c.name), [ADMIN_AUTH_COOKIES.ACCESS_TOKEN, ADMIN_AUTH_COOKIES.REFRESH_TOKEN]);
});

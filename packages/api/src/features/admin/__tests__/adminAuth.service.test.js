'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminAuthService } = require('../adminAuth.service');

const jwt = {
  signAccess: (p) => `A:${JSON.stringify(p)}`,
  signRefresh: (p) => `R:${JSON.stringify(p)}`,
  verifyRefresh: (t) => JSON.parse(t.slice(2)),
};
const adminRow = { id: 'a1', email: 'x@y.com', name: 'Admin', role: 'super', passwordHash: 'HASH' };

function svc({ rows = [adminRow], count = 1, ipCount = 1, compare = async () => true, onLookup } = {}) {
  const repo = {
    async findAdminByEmail(e) { if (onLookup) onLookup(); return rows.find((r) => r.email === e) || null; },
    async findAdminById(id) { return rows.find((r) => r.id === id) || null; },
    async incrementLoginCount() { return count; },
    async incrementLoginCountByIp() { return ipCount; },
  };
  return createAdminAuthService({ repo, jwt, hasher: { compare } });
}

test('login success returns tokens + public admin (no passwordHash)', async () => {
  const out = await svc().login('x@y.com', 'pw');
  assert.strictEqual(out.admin.email, 'x@y.com');
  assert.strictEqual(out.admin.role, 'super');
  assert.strictEqual(out.admin.passwordHash, undefined);
  assert.match(out.accessToken, /^A:/);
  assert.match(out.refreshToken, /^R:/);
});

test('the admin JWT payload carries sub/role/email/kind=admin', async () => {
  const out = await svc().login('x@y.com', 'pw');
  const payload = JSON.parse(out.accessToken.slice(2));
  assert.deepStrictEqual(payload, { sub: 'a1', role: 'super', email: 'x@y.com', kind: 'admin' });
});

test('wrong password → AUTH_REQUIRED (generic, no enumeration)', async () => {
  await assert.rejects(svc({ compare: async () => false }).login('x@y.com', 'pw'), (e) => e.code === 'AUTH_REQUIRED');
});

test('unknown email → AUTH_REQUIRED (same error as wrong password)', async () => {
  await assert.rejects(svc({ rows: [] }).login('no@y.com', 'pw'), (e) => e.code === 'AUTH_REQUIRED');
});

test('over the per-email rate limit → RATE_LIMITED before any password check', async () => {
  let compared = false;
  await assert.rejects(
    svc({ count: 6, compare: async () => { compared = true; return true; } }).login('x@y.com', 'pw', '1.2.3.4'),
    (e) => e.code === 'RATE_LIMITED',
  );
  assert.strictEqual(compared, false);
});

test('over the per-IP rate limit → RATE_LIMITED before email lookup or password check (H3)', async () => {
  let compared = false;
  let lookedUp = false;
  await assert.rejects(
    svc({
      ipCount: 31,
      onLookup: () => { lookedUp = true; },
      compare: async () => { compared = true; return true; },
    }).login('x@y.com', 'pw', '1.2.3.4'),
    (e) => e.code === 'RATE_LIMITED',
  );
  assert.strictEqual(lookedUp, false);
  assert.strictEqual(compared, false);
});

test('refresh re-loads the admin row and re-issues tokens', async () => {
  const out = await svc().refresh('R:{"sub":"a1","role":"super","email":"x@y.com"}');
  assert.match(out.accessToken, /^A:/);
  assert.strictEqual(out.admin.id, 'a1');
});

test('refresh for a deleted admin → AUTH_REQUIRED', async () => {
  await assert.rejects(svc({ rows: [] }).refresh('R:{"sub":"a1"}'), (e) => e.code === 'AUTH_REQUIRED');
});

test('refresh with no token → AUTH_REQUIRED', async () => {
  await assert.rejects(svc().refresh(undefined), (e) => e.code === 'AUTH_REQUIRED');
});

test('refresh with a malformed token → AUTH_REQUIRED', async () => {
  const bad = createAdminAuthService({
    repo: { async findAdminById() { return adminRow; } },
    jwt: { verifyRefresh() { throw new Error('bad'); } },
    hasher: { compare: async () => true },
  });
  await assert.rejects(bad.refresh('garbage'), (e) => e.code === 'AUTH_REQUIRED');
});

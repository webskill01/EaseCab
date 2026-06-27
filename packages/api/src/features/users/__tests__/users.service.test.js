'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createUsersService } = require('../users.service');

const ROW = {
  id: 'u1', name: 'Gurpreet', profilePicUrl: 'https://r2/dp.jpg', baseCity: 'Ludhiana',
  vehicleType: 'Innova', carMake: 'Toyota', carModel: 'Innova Crysta', experience: 3,
  bio: 'Punjab driver', languagesSpoken: ['pa', 'hi'], createdAt: new Date('2026-01-01T00:00:00Z'),
  aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true, verificationStatus: 'approved',
  phone: '+919999999999', // present on the row but must NOT leak
};

/** profile-view repo stub: an always-ok rate counter + the given profile row. */
function profileRepo(getPublicProfile, incrProfileViewCount = async () => 1) {
  return { getPublicProfile, incrProfileViewCount };
}

test('getPublicProfile shapes a public profile WITHOUT phone/PII', async () => {
  const svc = createUsersService({ repo: profileRepo(async () => ({ ...ROW })) });
  const out = await svc.getPublicProfile('u1', 'viewer');
  assert.strictEqual(out.name, 'Gurpreet');
  assert.strictEqual(out.verifiedDriver, true);
  assert.strictEqual(out.verification.verificationStatus, 'approved');
  assert.strictEqual('phone' in out, false);
});

test('verifiedDriver is false when any of Aadhaar/DL/RC is missing', async () => {
  const svc = createUsersService({ repo: profileRepo(async () => ({ ...ROW, rcSubmitted: false })) });
  const out = await svc.getPublicProfile('u1', 'viewer');
  assert.strictEqual(out.verifiedDriver, false);
});

test('getPublicProfile throws NOT_FOUND when the repo returns null (absent/soft-deleted)', async () => {
  const svc = createUsersService({ repo: profileRepo(async () => null) });
  await assert.rejects(() => svc.getPublicProfile('missing', 'viewer'), /not found|NOT_FOUND/i);
});

test('getPublicProfile throws RATE_LIMITED past the per-viewer view cap (M3)', async () => {
  const svc = createUsersService({ repo: profileRepo(async () => ({ ...ROW }), async () => 61) });
  await assert.rejects(() => svc.getPublicProfile('u1', 'viewer'), (e) => e.code === 'RATE_LIMITED');
});

// --- reportUser (P13-12 #5) -------------------------------------------------

/** Repo stub recording calls; tweak per test. */
function reportRepo(over = {}) {
  const calls = { incr: 0, created: [], flagged: [] };
  return {
    calls,
    userExists: async () => true,
    incrReportCount: async () => { calls.incr += 1; return 1; },
    createUserReport: async (a) => { calls.created.push(a); return { created: true }; },
    countReporters: async () => 1,
    flagUserIfUnflagged: async (id) => { calls.flagged.push(id); },
    ...over,
  };
}

test('reportUser rejects self-report with VALIDATION_ERROR', async () => {
  const svc = createUsersService({ repo: reportRepo() });
  await assert.rejects(() => svc.reportUser({ reporterId: 'u1', reportedUserId: 'u1', reason: 'spam' }), (e) => e.code === 'VALIDATION_ERROR');
});

test('reportUser throws NOT_FOUND for an unknown/deleted target', async () => {
  const svc = createUsersService({ repo: reportRepo({ userExists: async () => false }) });
  await assert.rejects(() => svc.reportUser({ reporterId: 'u1', reportedUserId: 'gone', reason: 'spam' }), (e) => e.code === 'NOT_FOUND');
});

test('reportUser throws RATE_LIMITED past the daily cap', async () => {
  const svc = createUsersService({ repo: reportRepo({ incrReportCount: async () => 11 }) });
  await assert.rejects(() => svc.reportUser({ reporterId: 'u1', reportedUserId: 'u2', reason: 'spam' }), (e) => e.code === 'RATE_LIMITED');
});

test('reportUser is idempotent on a duplicate (already reported, no flag)', async () => {
  const repo = reportRepo({ createUserReport: async () => ({ created: false }) });
  const out = await createUsersService({ repo }).reportUser({ reporterId: 'u1', reportedUserId: 'u2', reason: 'spam' });
  assert.deepStrictEqual(out, { reported: true, alreadyReported: true });
  assert.strictEqual(repo.calls.flagged.length, 0);
});

test('reportUser auto-flags the target once distinct reporters reach the threshold', async () => {
  const repo = reportRepo({ countReporters: async () => 3 });
  const out = await createUsersService({ repo }).reportUser({ reporterId: 'u9', reportedUserId: 'u2', reason: 'fake' });
  assert.deepStrictEqual(out, { reported: true, alreadyReported: false });
  assert.deepStrictEqual(repo.calls.flagged, ['u2']);
});

test('reportUser does NOT flag below the threshold', async () => {
  const repo = reportRepo({ countReporters: async () => 2 });
  await createUsersService({ repo }).reportUser({ reporterId: 'u9', reportedUserId: 'u2', reason: 'fake' });
  assert.strictEqual(repo.calls.flagged.length, 0);
});

test('reportUser verifies a screenshotKey and stores the returned key (P13-13 #2)', async () => {
  const repo = reportRepo();
  const uploads = { verifyUpload: async ({ userId, purpose, key }) => { assert.strictEqual(userId, 'u9'); assert.strictEqual(purpose, 'report_screenshot'); return { key: `verified/${key}` }; } };
  await createUsersService({ repo, uploads }).reportUser({ reporterId: 'u9', reportedUserId: 'u2', reason: 'fake', screenshotKey: 'reports/u9/x.jpg' });
  assert.strictEqual(repo.calls.created[0].screenshotUrl, 'verified/reports/u9/x.jpg');
});

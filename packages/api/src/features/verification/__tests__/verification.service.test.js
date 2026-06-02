'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createVerificationService } = require('../verification.service');

function fakeRepo(overrides = {}) {
  const calls = { record: [] };
  return {
    _calls: calls,
    async incrAadhaarOtpAttempts() { return overrides.count ?? 1; },
    async recordVerification(args) { calls.record.push(args); return { recorded: true }; },
    async getVerificationStatus() { return { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'submitted' }; },
  };
}

test('startAadhaar returns clientId under the cap', async () => {
  const svc = createVerificationService({ repo: fakeRepo(), surepass: { async generateAadhaarOtp() { return { clientId: 'c1' }; } } });
  const out = await svc.startAadhaar('u1', { aadhaarNumber: '123456789012' });
  assert.strictEqual(out.clientId, 'c1');
});

test('startAadhaar over the cap → RATE_LIMITED', async () => {
  const svc = createVerificationService({ repo: fakeRepo({ count: 4 }), surepass: { async generateAadhaarOtp() { return { clientId: 'c1' }; } } });
  await assert.rejects(() => svc.startAadhaar('u1', { aadhaarNumber: '123456789012' }), (err) => err.code === 'RATE_LIMITED');
});

test('verifyAadhaar success records the submission', async () => {
  const repo = fakeRepo();
  const svc = createVerificationService({ repo, surepass: { async submitAadhaarOtp() { return { success: true, name: 'A USER' }; } } });
  const out = await svc.verifyAadhaar('u1', { clientId: 'c1', otp: '123456' });
  assert.strictEqual(out.verified, true);
  assert.strictEqual(repo._calls.record[0].docType, 'aadhaar');
  assert.strictEqual(repo._calls.record[0].verifiedName, 'A USER');
});

test('verifyAadhaar failure → VALIDATION_ERROR, no record', async () => {
  const repo = fakeRepo();
  const svc = createVerificationService({ repo, surepass: { async submitAadhaarOtp() { return { success: false, name: null }; } } });
  await assert.rejects(() => svc.verifyAadhaar('u1', { clientId: 'c1', otp: '000000' }), (err) => err.code === 'VALIDATION_ERROR');
  assert.strictEqual(repo._calls.record.length, 0);
});

test('verifyDl + verifyRc record their doc types on success', async () => {
  const repo = fakeRepo();
  const svc = createVerificationService({ repo, surepass: {
    async verifyDl() { return { success: true, name: 'A USER', ref: 'r1' }; },
    async verifyRc() { return { success: true, name: 'A USER', ref: 'r2' }; },
  } });
  await svc.verifyDl('u1', { dlNumber: 'PB1020200012345', dob: '1990-05-20' });
  await svc.verifyRc('u1', { rcNumber: 'PB10AB1234' });
  assert.deepStrictEqual(repo._calls.record.map((r) => r.docType), ['dl', 'rc']);
});

test('getStatus passes the repo snapshot through', async () => {
  const svc = createVerificationService({ repo: fakeRepo(), surepass: {} });
  assert.deepStrictEqual(await svc.getStatus('u1'), { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'submitted' });
});

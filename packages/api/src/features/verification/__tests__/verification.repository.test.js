'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createVerificationRepository } = require('../verification.repository');

function fakeRedis() {
  const ctr = new Map();
  return { async eval(_s, _n, key) { ctr.set(key, (ctr.get(key) || 0) + 1); return ctr.get(key); }, _ctr: ctr };
}

function fakePrisma() {
  const user = { id: 'u1', aadhaarVerified: false, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'none' };
  const submissions = [];
  return {
    _user: user, _submissions: submissions,
    verificationSubmission: {
      // Enforce the H3 partial-unique: one 'submitted' row per (userId, docType).
      async create({ data }) {
        const dup = submissions.some((s) => s.userId === data.userId && s.docType === data.docType && s.status === 'submitted');
        if (dup) { const e = new Error('Unique constraint failed'); e.code = 'P2002'; throw e; }
        const r = { id: `s${submissions.length + 1}`, ...data };
        submissions.push(r);
        return r;
      },
    },
    user: {
      async findUnique() { return { aadhaarVerified: user.aadhaarVerified, dlSubmitted: user.dlSubmitted, rcSubmitted: user.rcSubmitted, verificationStatus: user.verificationStatus }; },
      async update({ data }) { Object.assign(user, data); return user; },
      async updateMany({ where, data }) { if (user.verificationStatus === where.verificationStatus) { Object.assign(user, data); return { count: 1 }; } return { count: 0 }; },
    },
    async $transaction(fn) { return fn(this); },
  };
}

test('incrAadhaarOtpAttempts increments the per-user window counter', async () => {
  const repo = createVerificationRepository({ prisma: fakePrisma(), redis: fakeRedis() });
  assert.strictEqual(await repo.incrAadhaarOtpAttempts('u1'), 1);
  assert.strictEqual(await repo.incrAadhaarOtpAttempts('u1'), 2);
});

test('recordVerification flips the doc flag, inserts a row, promotes none→submitted', async () => {
  const prisma = fakePrisma();
  const repo = createVerificationRepository({ prisma, redis: fakeRedis() });
  const out = await repo.recordVerification({ userId: 'u1', docType: 'aadhaar', surepassRef: 'c1', verifiedName: 'A USER' });
  assert.deepStrictEqual(out, { recorded: true });
  assert.strictEqual(prisma._user.aadhaarVerified, true);
  assert.strictEqual(prisma._user.verificationStatus, 'submitted');
  assert.strictEqual(prisma._submissions.length, 1);
  assert.strictEqual(prisma._submissions[0].status, 'submitted');
});

test('recordVerification does NOT downgrade an approved user', async () => {
  const prisma = fakePrisma(); prisma._user.verificationStatus = 'approved';
  const repo = createVerificationRepository({ prisma, redis: fakeRedis() });
  await repo.recordVerification({ userId: 'u1', docType: 'dl', surepassRef: 'r1', verifiedName: 'A USER' });
  assert.strictEqual(prisma._user.dlSubmitted, true);
  assert.strictEqual(prisma._user.verificationStatus, 'approved'); // unchanged
});

test('recordVerification is idempotent on a duplicate pending submission (P2002)', async () => {
  const prisma = fakePrisma();
  const repo = createVerificationRepository({ prisma, redis: fakeRedis() });
  await repo.recordVerification({ userId: 'u1', docType: 'aadhaar', surepassRef: 'c1', verifiedName: 'A USER' });
  const out = await repo.recordVerification({ userId: 'u1', docType: 'aadhaar', surepassRef: 'c2', verifiedName: 'A USER' });
  assert.deepStrictEqual(out, { recorded: false, reason: 'duplicate_pending' });
  assert.strictEqual(prisma._submissions.length, 1); // no second row
  assert.strictEqual(prisma._user.aadhaarVerified, true);
});

test('getVerificationStatus returns the four fields', async () => {
  const repo = createVerificationRepository({ prisma: fakePrisma(), redis: fakeRedis() });
  const s = await repo.getVerificationStatus('u1');
  assert.deepStrictEqual(s, { aadhaarVerified: false, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'none' });
});

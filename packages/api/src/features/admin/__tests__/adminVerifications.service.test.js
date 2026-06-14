'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminVerificationsService } = require('../adminVerifications.service');

const baseRow = {
  id: 's1', docType: 'dl', status: 'submitted', surepassRef: 'ref', verifiedName: 'A B', createdAt: new Date(),
  user: {
    id: 'u1', name: 'A B', phone: '+919876543210', aadhaarLast4: '1234',
    carMake: 'Maruti', carModel: 'Dzire', carRegNo: 'PB01', verificationStatus: 'submitted',
    profilePicUrl: 'dp/u1/x.jpg', licenseUrl: 'lic/u1/y.jpg', rcUrl: null, carFrontUrl: null, carBackUrl: null,
  },
};
const repo = {
  listSubmitted: async () => ({ rows: [baseRow], total: 1 }),
  findById: async (id) => (id === 's1' ? { id: 's1' } : null),
  applyReview: async (a) => ({ id: a.id, status: a.status, reviewedAt: new Date(), reviewedBy: a.reviewedBy, rejectionReason: a.rejectionReason }),
  setUserBadge: async (a) => ({ id: a.userId, verificationStatus: a.status }),
};
const r2 = { presignGet: async ({ key }) => `https://signed/${key}` };

test('list masks phone, drops raw keys, presigns present images, nulls absent', async () => {
  const svc = createAdminVerificationsService({ repo, r2 });
  const { items, total, page, limit } = await svc.list({ page: 1, limit: 20 });
  assert.equal(total, 1);
  assert.equal(page, 1);
  assert.equal(limit, 20);
  const it = items[0];
  assert.equal(it.user.phoneMasked, '••••3210');
  assert.equal(it.user.phone, undefined);
  assert.equal(it.images.dp, 'https://signed/dp/u1/x.jpg');
  assert.equal(it.images.licence, 'https://signed/lic/u1/y.jpg');
  assert.equal(it.images.rc, null);
});

test('list tolerates missing r2 (urls null)', async () => {
  const svc = createAdminVerificationsService({ repo, r2: undefined });
  const { items } = await svc.list({ page: 1, limit: 20 });
  assert.equal(items[0].images.dp, null);
  assert.equal(items[0].images.licence, null);
});

test('list survives an r2 presign error (url null, no throw)', async () => {
  const flaky = { presignGet: async () => { throw new Error('r2 down'); } };
  const svc = createAdminVerificationsService({ repo, r2: flaky });
  const { items } = await svc.list({ page: 1, limit: 20 });
  assert.equal(items[0].images.dp, null);
});

test('review approve maps to approved + clears reason', async () => {
  const svc = createAdminVerificationsService({ repo, r2 });
  const r = await svc.review('s1', { action: 'approve' }, 'admin1');
  assert.equal(r.status, 'approved');
  assert.equal(r.reviewedBy, 'admin1');
  assert.equal(r.rejectionReason, null);
});

test('review reject persists the reason', async () => {
  const svc = createAdminVerificationsService({ repo, r2 });
  const r = await svc.review('s1', { action: 'reject', rejectionReason: 'blurry' }, 'admin1');
  assert.equal(r.status, 'rejected');
  assert.equal(r.rejectionReason, 'blurry');
});

test('review missing submission → NOT_FOUND', async () => {
  const svc = createAdminVerificationsService({ repo, r2 });
  await assert.rejects(() => svc.review('missing', { action: 'approve' }, 'admin1'), (err) => err.code === 'NOT_FOUND');
});

test('setBadge maps P2025 to NOT_FOUND', async () => {
  const failing = { ...repo, setUserBadge: async () => { const e = new Error('x'); e.code = 'P2025'; throw e; } };
  const svc = createAdminVerificationsService({ repo: failing, r2 });
  await assert.rejects(() => svc.setBadge('u1', { status: 'approved' }), (err) => err.code === 'NOT_FOUND');
});

test('setBadge returns the updated user on success', async () => {
  const svc = createAdminVerificationsService({ repo, r2 });
  const r = await svc.setBadge('u1', { status: 'approved' });
  assert.equal(r.verificationStatus, 'approved');
});

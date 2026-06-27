'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createMeService } = require('../me.service');

test('getProfile returns shaped profile with derived profileComplete', async () => {
  const repo = { getProfile: async () => ({
    id: 'u1', phone: '+9199', name: 'Gur', bio: 'drv', baseCity: 'Ldh', vehicleType: 'Innova',
    profilePicUrl: 'https://r2/dp.jpg', languagesSpoken: ['pa'], aadhaarVerified: true,
    dlSubmitted: false, rcSubmitted: false, verificationStatus: 'submitted',
    aadhaarLast4: '1234', carMake: null, carModel: null, carRegNo: null,
  }) };
  const svc = createMeService({ repo });
  const out = await svc.getProfile('u1');
  assert.strictEqual(out.profileComplete, true);
  assert.strictEqual(out.verification.aadhaarLast4, '1234');
});

test('getProfile derives per-doc status: latest submission wins, boolean is the fallback', async () => {
  const repo = { getProfile: async () => ({
    id: 'u1', phone: '+9199', name: 'Gur', aadhaarVerified: true,
    dlSubmitted: true, rcSubmitted: true, verificationStatus: 'submitted',
    languagesSpoken: [],
    submissions: [
      { docType: 'rc', status: 'rejected', rejectionReason: 'Blurry photo' },
      { docType: 'dl', status: 'approved', rejectionReason: null },
    ],
  }) };
  const out = await createMeService({ repo }).getProfile('u1');
  assert.deepStrictEqual(out.verification.dl, { status: 'approved', rejectionReason: null });
  assert.deepStrictEqual(out.verification.rc, { status: 'rejected', rejectionReason: 'Blurry photo' });
})

test('getProfile falls back to the submitted boolean when there is no submission row', async () => {
  const repo = { getProfile: async () => ({
    id: 'u1', phone: '+9199', languagesSpoken: [], aadhaarVerified: false,
    dlSubmitted: true, rcSubmitted: false, verificationStatus: 'submitted', submissions: [],
  }) };
  const out = await createMeService({ repo }).getProfile('u1');
  // Surepass-confirmed (submitted) reads as approved for the user's per-doc view.
  assert.strictEqual(out.verification.dl.status, 'approved')
  assert.strictEqual(out.verification.rc.status, 'none')
})

test('getProfile surfaces a Surepass-submitted document as approved (not pending)', async () => {
  const repo = { getProfile: async () => ({
    id: 'u1', phone: '+9199', languagesSpoken: [], aadhaarVerified: true,
    dlSubmitted: true, rcSubmitted: true, verificationStatus: 'submitted',
    submissions: [{ docType: 'dl', status: 'submitted', rejectionReason: null }],
  }) };
  const out = await createMeService({ repo }).getProfile('u1');
  assert.strictEqual(out.verification.dl.status, 'approved')
})

test('updateProfile attaches DP via verifyUpload when dpKey present', async () => {
  const updates = [];
  const repo = { updateProfile: async (id, data) => { updates.push(data); return { id, ...data }; } };
  const uploads = { verifyUpload: async () => ({ key: 'dp/u1/x.jpg', publicUrl: 'https://r2/dp/u1/x.jpg' }) };
  const svc = createMeService({ repo, uploads });
  await svc.updateProfile('u1', { name: 'Gur', bio: 'd', baseCity: 'Ldh', vehicleType: 'Innova', languagesSpoken: ['pa'], dpKey: 'dp/u1/x.jpg' });
  assert.strictEqual(updates[0].profilePicUrl, 'https://r2/dp/u1/x.jpg');
  assert.strictEqual('dpKey' in updates[0], false);
});

test('attachImage maps purpose → field and stores key for private tier', async () => {
  const updates = [];
  const repo = { attachImage: async (id, data) => { updates.push(data); return { id }; } };
  const uploads = { verifyUpload: async ({ purpose }) => purpose === 'rc_image'
    ? { key: 'kyc/u1/rc.pdf', publicUrl: null }
    : { key: 'car/u1/f.jpg', publicUrl: 'https://r2/car/u1/f.jpg' } };
  const svc = createMeService({ repo, uploads });
  await svc.attachImage('u1', { purpose: 'car_front', key: 'car/u1/f.jpg' });
  await svc.attachImage('u1', { purpose: 'rc_image', key: 'kyc/u1/rc.pdf' });
  assert.deepStrictEqual(updates[0], { carFrontUrl: 'https://r2/car/u1/f.jpg' });
  assert.deepStrictEqual(updates[1], { rcUrl: 'kyc/u1/rc.pdf' });
});

test('deleteAccount soft-deletes the caller and reports deleted', async () => {
  const calls = [];
  const repo = { softDeleteUser: async (id) => { calls.push(id); return { id }; } };
  const svc = createMeService({ repo });
  const out = await svc.deleteAccount('u1');
  assert.deepStrictEqual(calls, ['u1']);
  assert.deepStrictEqual(out, { deleted: true });
});

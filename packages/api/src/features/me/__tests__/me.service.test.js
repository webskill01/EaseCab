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

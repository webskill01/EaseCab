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

test('getPublicProfile shapes a public profile WITHOUT phone/PII', async () => {
  const svc = createUsersService({ repo: { getPublicProfile: async () => ({ ...ROW }) } });
  const out = await svc.getPublicProfile('u1');
  assert.strictEqual(out.name, 'Gurpreet');
  assert.strictEqual(out.verifiedDriver, true);
  assert.strictEqual(out.verification.verificationStatus, 'approved');
  assert.strictEqual('phone' in out, false);
});

test('verifiedDriver is false when any of Aadhaar/DL/RC is missing', async () => {
  const svc = createUsersService({ repo: { getPublicProfile: async () => ({ ...ROW, rcSubmitted: false }) } });
  const out = await svc.getPublicProfile('u1');
  assert.strictEqual(out.verifiedDriver, false);
});

test('getPublicProfile throws NOT_FOUND when the repo returns null (absent/soft-deleted)', async () => {
  const svc = createUsersService({ repo: { getPublicProfile: async () => null } });
  await assert.rejects(() => svc.getPublicProfile('missing'), /not found|NOT_FOUND/i);
});

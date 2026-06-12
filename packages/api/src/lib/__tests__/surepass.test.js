'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createStubSurepassClient } = require('../surepass');

test('stub aadhaar verify surfaces demographics + last4 (never the full number)', async () => {
  const s = createStubSurepassClient();
  const { clientId } = await s.generateAadhaarOtp({ aadhaar: '123456789012' });
  assert.ok(clientId.startsWith('stub_'));
  const v = await s.submitAadhaarOtp({ clientId, otp: '123456' });
  assert.strictEqual(v.success, true);
  assert.ok(typeof v.name === 'string');
  assert.match(v.last4, /^\d{4}$/);
  assert.ok(v.dob && v.gender && v.address);
});

test('stub DL surfaces validity + COV; RC surfaces make/model/regNo', async () => {
  const s = createStubSurepassClient();
  const dl = await s.verifyDl({ dlNumber: 'PB1020200012345', dob: '1990-05-20' });
  assert.strictEqual(dl.success, true);
  assert.ok(dl.ref);
  assert.ok(dl.validUpto && dl.cov);
  const rc = await s.verifyRc({ rcNumber: 'PB10AB1234' });
  assert.strictEqual(rc.success, true);
  assert.strictEqual(rc.regNo, 'PB10AB1234');
  assert.ok(rc.make && rc.model && rc.ref);
});

'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createStubSurepassClient } = require('../surepass');

test('stub returns a clientId then a successful aadhaar verify', async () => {
  const s = createStubSurepassClient();
  const { clientId } = await s.generateAadhaarOtp({ aadhaar: '123456789012' });
  assert.ok(clientId.startsWith('stub_'));
  const v = await s.submitAadhaarOtp({ clientId, otp: '123456' });
  assert.strictEqual(v.success, true);
  assert.ok(typeof v.name === 'string');
});

test('stub DL + RC succeed with a ref', async () => {
  const s = createStubSurepassClient();
  const dl = await s.verifyDl({ dlNumber: 'PB1020200012345', dob: '1990-05-20' });
  const rc = await s.verifyRc({ rcNumber: 'PB10AB1234' });
  assert.strictEqual(dl.success, true);
  assert.strictEqual(rc.success, true);
  assert.ok(dl.ref && rc.ref);
});

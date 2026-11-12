'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { BORDER_TAX_FAILURE: F } = require('@easecab/shared');
const { portalError } = require('../portal');

test('portalError: an expired-PUC refusal gets its own code; other portal errors and specific codes stay', () => {
  const pucc = 'PUCC Validity Must Be Greater Than Or Equal Current Date.Please renew your PUCC Validity\nOK'; // live, 2026-11-11
  assert.strictEqual(portalError(F.PORTAL_ERROR, pucc).failureCode, F.PUCC_EXPIRED);
  assert.strictEqual(portalError(F.PORTAL_ERROR, pucc).message, pucc);
  assert.strictEqual(portalError(F.PORTAL_ERROR, 'Server busy').failureCode, F.PORTAL_ERROR);
  assert.strictEqual(portalError(F.PORTAL_ERROR).failureCode, F.PORTAL_ERROR);
  assert.strictEqual(portalError(F.CAPTCHA_WRONG, pucc).failureCode, F.CAPTCHA_WRONG);
  const fit = 'Fitness Validity Must Be Greater Than Or Equal Current Date..\nPlease renew your vehicle Fitness\nOK'; // live, 2026-11-11
  assert.strictEqual(portalError(F.PORTAL_ERROR, fit).failureCode, F.FITNESS_EXPIRED);
});

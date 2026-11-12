'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { borderTaxCreateSchema, borderTaxCaptchaSchema } = require('../borderTax.schema');
const { borderTaxWindow } = require('../../constants/borderTax');

const inAnHour = () => new Date(Date.now() + 3_600_000).toISOString();
const base = () => ({ vehicleNo: 'pb 01 c 9079', stateCd: 'HP', seats: '4+1', startAt: inAnHour(), days: 1, declare: true });

test('create: normalises vehicle number + accepts a valid form', () => {
  const r = borderTaxCreateSchema.parse({ ...base(), checkpost: 'parwanoo' });
  assert.strictEqual(r.vehicleNo, 'PB01C9079');
  assert.strictEqual(r.checkpost, 'PARWANOO');
});

test('create: rejects bad vehicle, unknown state/checkpost, past start, too many days', () => {
  const bad = [
    { vehicleNo: 'HELLO' },
    { stateCd: 'JK' },
    { checkpost: 'WAGAH' },
    { startAt: new Date(Date.now() - 3_600_000).toISOString() },
    { days: 31 },
    { extra: 1 },
    { declare: false },
    { stateCd: 'HR', checkpost: 'PANCHKULA' }, // HR without distance
  ];
  for (const patch of bad) assert.ok(!borderTaxCreateSchema.safeParse({ ...base(), ...patch }).success, JSON.stringify(patch));
});

test('create: tax period defaults to DAYS; only the periods the state offers', () => {
  assert.strictEqual(borderTaxCreateSchema.parse(base()).taxMode, '1');
  const { days, ...noDays } = base();
  assert.strictEqual(borderTaxCreateSchema.parse({ ...noDays, stateCd: 'UP', taxMode: '4' }).days, 1); // monthly: no days needed
  assert.ok(borderTaxCreateSchema.safeParse({ ...base(), stateCd: 'UP', taxMode: '5' }).success); // UP quarterly
  assert.ok(!borderTaxCreateSchema.safeParse({ ...base(), stateCd: 'UP', taxMode: '7' }).success); // UP has no yearly
  assert.ok(!borderTaxCreateSchema.safeParse({ ...base(), taxMode: '4' }).success); // HP: DAYS only
  assert.ok(borderTaxCreateSchema.safeParse({ ...base(), stateCd: 'HR', distanceKm: 50, taxMode: '7' }).success);
});

test('create: Bharat series number is accepted', () => {
  assert.ok(borderTaxCreateSchema.safeParse({ ...base(), vehicleNo: '22BH1234AA' }).success);
});

test('captcha answer: 3-10 printable chars incl. symbols, no spaces', () => {
  assert.ok(borderTaxCaptchaSchema.safeParse({ answer: ' a7Kd2 ' }).success);
  assert.ok(borderTaxCaptchaSchema.safeParse({ answer: 'ssj7#M' }).success);
  assert.ok(!borderTaxCaptchaSchema.safeParse({ answer: 'ab12€' }).success);
  assert.ok(!borderTaxCaptchaSchema.safeParse({ answer: 'ab' }).success);
  assert.ok(!borderTaxCaptchaSchema.safeParse({ answer: 'a b c' }).success);
});

test('window: full 24h blocks ending a minute early (portal rule)', () => {
  const { from, upto } = borderTaxWindow(new Date('2026-11-04T10:00:30'), 2);
  assert.strictEqual(from.getSeconds(), 0);
  assert.strictEqual(upto.getTime() - from.getTime(), 2 * 86_400_000 - 60_000);
});

test('create: Haryana with distance is accepted', () => {
  const r = borderTaxCreateSchema.parse({ ...base(), stateCd: 'HR', checkpost: 'panchkula', distanceKm: '50' });
  assert.strictEqual(r.distanceKm, 50);
});

test('create: Uttar Pradesh needs no distance', () => {
  const r = borderTaxCreateSchema.parse({ ...base(), stateCd: 'UP', checkpost: 'saharanpur' });
  assert.strictEqual(r.checkpost, 'SAHARANPUR');
});

test('create: RJ/UK route checkposts accepted (NOT APPLICABLE / Ordinary defaults), others rejected', () => {
  const { BORDER_TAX_STATES } = require('../../constants/borderTax');
  assert.strictEqual(borderTaxCreateSchema.parse({ ...base(), stateCd: 'RJ', checkpost: 'sadhuwali' }).checkpost, 'SADHUWALI');
  assert.strictEqual(borderTaxCreateSchema.parse({ ...base(), stateCd: 'UK', checkpost: 'Asharodi' }).checkpost, 'ASHARODI');
  assert.throws(() => borderTaxCreateSchema.parse({ ...base(), stateCd: 'RJ', checkpost: 'ASHARODI' }));
  assert.deepStrictEqual(BORDER_TAX_STATES.RJ.portal.SADHUWALI, ['13', '11']);
  assert.deepStrictEqual([BORDER_TAX_STATES.RJ.permitType, BORDER_TAX_STATES.UK.serviceType], ['0', '1']);
});

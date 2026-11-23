'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminBorderTaxService } = require('../adminBorderTax.service');
const { filingsWhere } = require('../adminBorderTax.repository');

const logger = { info() {} };
const ROW = { id: 'f1', stateCd: 'HR', status: 'paid', receiptKey: 'bt/f1.pdf', user: { name: 'A', phone: '+919876543210' } };

function fakeRepo() {
  const paused = new Set();
  return {
    paused,
    async list() { return { rows: [ROW, { ...ROW, id: 'f2', receiptKey: null, user: { name: 'B', phone: '+919812345678' } }], total: 2, byStatus: [] }; },
    async unlocks() { return [{}, { status: 'cleared', at: '1763000000000' }]; },
    async findReceipt(id) { return id === 'f1' ? { receiptKey: 'bt/f1.pdf', receiptNo: 'HRR/1' } : { receiptKey: null }; },
    async pausedStates() { return [...paused]; },
    async setPaused(s, p) { if (p) paused.add(s); else paused.delete(s); },
  };
}

test('list: rows carry test flag, receipt flag and lock state — never the phone or R2 key', async () => {
  const { items } = await createAdminBorderTaxService({ repo: fakeRepo(), logger }).list({ page: 1, limit: 30 });
  assert.deepStrictEqual(items.map((i) => [i.isTest, i.hasReceipt, i.unlock?.status ?? null]), [[true, true, null], [false, false, 'cleared']]);
  assert.ok(items.every((i) => !('receiptKey' in i) && !('user' in i)));
});

test('states: pause and resume one live state', async () => {
  const svc = createAdminBorderTaxService({ repo: fakeRepo(), logger });
  await svc.setPaused('HP', true);
  assert.deepStrictEqual((await svc.states()).filter((s) => s.paused).map((s) => s.stateCd), ['HP']);
  await svc.setPaused('HP', false);
  assert.ok((await svc.states()).every((s) => !s.paused));
});

test('receipt: presigned link, NOT_FOUND without a stored PDF', async () => {
  const r2 = { async presignGet({ key, download }) { return `https://r2/${key}?d=${download}`; } };
  const svc = createAdminBorderTaxService({ repo: fakeRepo(), r2, logger });
  assert.strictEqual((await svc.receipt('f1')).url, 'https://r2/bt/f1.pdf?d=border-tax-HRR1.pdf');
  assert.strictEqual((await svc.receipt('f1', { view: true })).url, 'https://r2/bt/f1.pdf?d=undefined'); // no attachment header
  await assert.rejects(svc.receipt('f2'), (e) => e.code === 'NOT_FOUND');
});

test('filingsWhere: IST days inclusive, real excludes test phones', () => {
  const w = filingsWhere({ from: '2026-11-13', to: '2026-11-13', who: 'real', state: 'HR' });
  assert.strictEqual(w.createdAt.gte.toISOString(), '2026-11-12T18:30:00.000Z');
  assert.strictEqual(w.createdAt.lt.toISOString(), '2026-11-13T18:30:00.000Z');
  assert.ok(w.user.phone.notIn.includes('+916283380110'));
  assert.strictEqual(filingsWhere({ who: 'all' }).user, undefined);
});

test('byOutcome: driver/vehicle outcomes are not counted as failed', () => {
  const { byOutcome } = require('../adminBorderTax.service');
  const out = byOutcome([
    { status: 'failed', failureCode: 'fare_declined', count: 2, paise: 0 },
    { status: 'expired', failureCode: 'payment_timeout', count: 3, paise: 30000 },
    { status: 'failed', failureCode: 'vehicle_pending', count: 1, paise: 0 },
    { status: 'failed', failureCode: 'no_qr', count: 4, paise: 0 },
    { status: 'failed', failureCode: 'some_new_code', count: 1, paise: 0 },
    { status: 'paid', failureCode: null, count: 5, paise: 50000 },
  ]);
  const by = Object.fromEntries(out.map((o) => [o.outcome, [o.count, o.codes]]));
  assert.deepStrictEqual(by, {
    driver: [5, { fare_declined: 2, payment_timeout: 3 }],
    vehicle: [1, { vehicle_pending: 1 }],
    failed: [5, { no_qr: 4, some_new_code: 1 }],
    paid: [5, {}],
  });
});

test('outcomeWhere: failed = ended rows whose code is neither driver nor vehicle (or none)', () => {
  const { outcomeWhere } = require('../adminBorderTax.repository');
  const w = outcomeWhere('failed');
  assert.deepStrictEqual(w.status, { in: ['failed', 'expired'] });
  assert.ok(w.OR[1].failureCode.notIn.includes('fare_declined'));
  assert.ok(!w.OR[1].failureCode.notIn.includes('no_qr'));
});

test('search box: vehicle part, driver name or phone digits; kept apart from the test-account filter', () => {
  const w = filingsWhere({ q: 'pb01 d', who: 'real', userId: 'u1' });
  const or = w.AND[0].OR;
  assert.ok(or.some((o) => o.vehicleNo?.contains === 'PB01D'));
  assert.ok(or.some((o) => o.user?.name?.contains === 'pb01 d'));
  assert.ok(!or.some((o) => o.user?.phone), 'under 4 digits: no phone match');
  assert.ok(filingsWhere({ q: '98765' }).AND[0].OR.some((o) => o.user?.phone?.contains === '98765'));
  assert.ok(w.user.phone.notIn, 'who filter still applies');
  assert.strictEqual(w.userId, 'u1');
});

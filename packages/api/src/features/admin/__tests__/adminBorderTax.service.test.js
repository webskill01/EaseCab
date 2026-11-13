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
  await assert.rejects(svc.receipt('f2'), (e) => e.code === 'NOT_FOUND');
});

test('filingsWhere: IST days inclusive, real excludes test phones', () => {
  const w = filingsWhere({ from: '2026-11-13', to: '2026-11-13', who: 'real', state: 'HR' });
  assert.strictEqual(w.createdAt.gte.toISOString(), '2026-11-12T18:30:00.000Z');
  assert.strictEqual(w.createdAt.lt.toISOString(), '2026-11-13T18:30:00.000Z');
  assert.ok(w.user.phone.notIn.includes('+916283380110'));
  assert.strictEqual(filingsWhere({ who: 'all' }).user, undefined);
});

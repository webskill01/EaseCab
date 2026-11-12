'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createRunner, toJob } = require('../runner');
const { createBorderTaxService } = require('../../features/borderTax/borderTax.service');
const { toHandoff } = require('../flows/bank');
const { portalError } = require('../flows/portal');

const logger = { info() {}, warn() {} };
const FROM = new Date('2026-11-07T02:30:00Z');
const HANDOFF = Object.freeze({ method: 'POST', action: 'https://merchant.sbi.bank.in/merchant/merchantprelogin.htm', fields: [['encdata', 'e'], ['merchant_code', 'm']] });

/** Fake repo: CAS rows + scripted captcha answers. */
function setup({ answers = [], slots = [] } = {}) {
  const rows = {
    b1: { id: 'b1', status: 'queued', stateCd: 'HR', vehicleNo: 'PB01E9454', checkpost: 'PANCHKULA', taxFrom: FROM, taxUpto: new Date(FROM.getTime() + 86_340_000), distanceKm: 50 },
  };
  const jobs = [];
  const handoffs = {};
  const unlocks = {};
  const due = {};
  const repo = {
    async transition(id, from, to, fields) {
      if (!from.includes(rows[id].status)) return false;
      Object.assign(rows[id], fields, { status: to });
      return true;
    },
    async findById(id) { return rows[id]; },
    async setJob(id, f) { jobs.push({ ...f, status: rows[id].status }); },
    async clearAnswers() {},
    async popAnswer() { return answers.length ? answers.shift() : null; },
    async takeLookupSlot() { return slots.length ? slots.shift() : 0; },
    async setHandoff(id, h) { handoffs[id] = h; },
    async clearHandoff(id) { delete handoffs[id]; },
    async setUnlock(id, f) { unlocks[id] = { ...unlocks[id], ...f }; },
    async getUnlock(id) { return unlocks[id] || {}; },
    async scheduleUnlock(id, at) { due[id] = at; },
  };
  let closed = 0;
  const newPage = async () => ({ context: () => ({ close: async () => { closed += 1; } }) });
  const service = createBorderTaxService({ repo, logger });
  return { rows, jobs, handoffs, unlocks, due, repo, service, newPage, closed: () => closed };
}

const flowWithCaptcha = async (_page, _job, io) => {
  const a = await io.captcha({ step: 'vahan', image: 'data:image/png;base64,AA' });
  assert.strictEqual(a, 'x7k2');
  return { taxPaise: 10000, from: FROM, upto: new Date(FROM.getTime() + 86_340_000), handoff: HANDOFF };
};

test('toJob turns the stored window back into whole days', () => {
  assert.strictEqual(toJob({ taxFrom: FROM, taxUpto: new Date(FROM.getTime() + 2 * 86_400_000 - 60_000) }).days, 2);
});

test('toJob carries state + permit so one checkpostv4 flow serves HR and HP', () => {
  const j = toJob({ stateCd: 'HP', permitType: '35', vehicleNo: 'PB01E9454', checkpost: 'GARAMORA', taxFrom: FROM, taxUpto: new Date(FROM.getTime() + 86_340_000), distanceKm: null });
  assert.deepStrictEqual([j.stateCd, j.permitType, j.days, j.distanceKm], ['HP', '35', 1, null]);
});

test('happy path: captcha relayed, quote + bank form stored → HANDED_OFF, browser closed', async () => {
  const t = setup({ answers: ['x7k2'] });
  await createRunner({ ...t, logger, flows: { HR: flowWithCaptcha } }).run('b1', {});
  assert.deepStrictEqual([t.rows.b1.status, t.rows.b1.taxPaise], ['handed_off', 10000]);
  assert.deepStrictEqual(t.handoffs.b1, HANDOFF);
  assert.ok(t.jobs.some((j) => j.captcha && j.status === 'awaiting_captcha'), 'captcha shown while AWAITING_CAPTCHA');
  assert.strictEqual(t.closed(), 1);
});

test('no captcha answer in time → EXPIRED captcha_timeout, browser closed', async () => {
  const t = setup();
  await createRunner({ ...t, logger, flows: { HR: flowWithCaptcha } }).run('b1', {});
  assert.deepStrictEqual([t.rows.b1.status, t.rows.b1.failureCode], ['expired', 'captcha_timeout']);
  assert.strictEqual(t.closed(), 1);
});

test('portal error (e.g. no bank page) → FAILED with its code, nothing handed off', async () => {
  const t = setup();
  const flow = async () => { throw Object.assign(new Error('x'), { failureCode: 'no_handoff' }); };
  await createRunner({ ...t, logger, flows: { HR: flow } }).run('b1', {});
  assert.deepStrictEqual([t.rows.b1.status, t.rows.b1.failureCode], ['failed', 'no_handoff']);
  assert.deepStrictEqual(t.handoffs, {});
});

test('cancelled while queued → nothing runs; unsupported state → FAILED', async () => {
  const t = setup();
  t.rows.b1.status = 'cancelled';
  let opened = false;
  await createRunner({ ...t, logger, newPage: async () => { opened = true; } }).run('b1', {});
  assert.strictEqual(opened, false);
  const u = setup();
  u.rows.b1.stateCd = 'JK';
  await createRunner({ ...u, logger }).run('b1', {});
  assert.deepStrictEqual([u.rows.b1.status, u.rows.b1.failureCode], ['failed', 'state_unsupported']);
});

test('toHandoff: urlencoded POST → fields; GET → query moved into fields; multipart → null', () => {
  const req = (method, url, type, body) => ({ method: () => method, url: () => url, headers: () => ({ 'content-type': type }), postData: () => body });
  assert.deepStrictEqual(
    toHandoff(req('POST', HANDOFF.action, 'application/x-www-form-urlencoded', 'encdata=a%2Bb%3D&merchant_code=UK1')),
    { method: 'POST', action: HANDOFF.action, fields: [['encdata', 'a+b='], ['merchant_code', 'UK1']] },
  );
  assert.deepStrictEqual(
    toHandoff(req('GET', 'https://himkosh.hp.nic.in/echallan?ref=HPP1&amt=230', undefined, null)),
    { method: 'GET', action: 'https://himkosh.hp.nic.in/echallan', fields: [['ref', 'HPP1'], ['amt', '230']] },
  );
  assert.strictEqual(toHandoff(req('POST', HANDOFF.action, 'multipart/form-data; boundary=x', '--x')), null);
});

test('UP date-only window: whole IST calendar days from the start day', () => {
  const { portalWindow, istInput } = require('../flows/checkpostv4');
  const { from, upto } = portalWindow(new Date('2026-11-07T08:00:00+05:30'), 1, true);
  assert.deepStrictEqual([istInput(from), istInput(upto)], ['2026-11-07T00:00', '2026-11-07T23:59']);
  assert.strictEqual(istInput(portalWindow(new Date('2026-11-07T08:00:00+05:30'), 1, false).upto), '2026-11-08T07:59');
});

test('tax period: toJob carries taxMode; portal end dates read back in IST', () => {
  assert.strictEqual(toJob({ taxFrom: FROM, taxUpto: FROM, taxMode: '4' }).taxMode, '4');
  const { fromPortal, istInput } = require('../flows/checkpostv4');
  assert.strictEqual(istInput(fromPortal('2026-11-30T23:59')), '2026-11-30T23:59'); // HR monthly (datetime)
  assert.strictEqual(istInput(fromPortal('2027-01-31')), '2027-01-31T23:59'); // UP quarterly (date only = through the day)
});

test('lookup slot busy → waits it out while still QUEUED, then files', async () => {
  const t = setup({ answers: ['x7k2'], slots: [90_000, 1] });
  const waits = [];
  const sleep = async (ms) => { waits.push([ms, t.rows.b1.status]); };
  await createRunner({ ...t, logger, sleep, flows: { HR: flowWithCaptcha } }).run('b1', {});
  assert.deepStrictEqual(waits, [[90_000, 'queued'], [1, 'queued']]);
  assert.strictEqual(t.rows.b1.status, 'handed_off');
});

test('browser gone (newPage throws) → FAILED portal_error, not stuck in FILLING', async () => {
  const t = setup();
  const alerts = [];
  await createRunner({ ...t, logger, alert: (m) => alerts.push(m), newPage: async () => { throw new Error('browser.newContext: Target page, context or browser has been closed'); }, flows: { HR: async () => assert.fail('flow ran') } }).run('b1', {});
  assert.deepStrictEqual([t.rows.b1.status, t.rows.b1.failureCode], ['failed', 'portal_error']);
  assert.match(alerts.join(), /HR filing b1 failed: portal_error \(browser\.newContext/);
});

test('driver/vehicle outcomes (expired PUC) → no operator alert', async () => {
  const t = setup();
  const alerts = [];
  await createRunner({ ...t, logger, alert: (m) => alerts.push(m), flows: { HR: async () => { throw portalError('pucc_expired', 'PUC expired'); } } }).run('b1', {});
  assert.deepStrictEqual([t.rows.b1.failureCode, alerts], ['pucc_expired', []]);
});

test('an attempt that reached the bank step and went unpaid schedules its lock clear; a papers refusal does not', async () => {
  const t = setup();
  await createRunner({ ...t, logger, flows: { HR: async () => { throw portalError('no_qr'); } } }).run('b1', {});
  assert.strictEqual(t.unlocks.b1.status, 'waiting');
  assert.ok(t.due.b1 > Date.now() + 30 * 60_000);
  const t2 = setup();
  await createRunner({ ...t2, logger, flows: { HR: async () => { throw portalError('pucc_expired'); } } }).run('b1', {});
  assert.deepStrictEqual(t2.unlocks, {});
});

/** unlock() harness: filing b1 failed, clearPending scripted. */
function unlockSetup(rowFields, verdict) {
  const t = setup();
  Object.assign(t.rows.b1, { status: 'expired', failureCode: 'payment_timeout', taxPaise: 10000 }, rowFields);
  const puts = [];
  const alerts = [];
  const r2 = { async putObject(o) { puts.push(o.key); } };
  const clearLocks = async () => { if (verdict instanceof Error) throw verdict; return verdict; };
  const runner = createRunner({ ...t, logger, r2, alert: (m) => alerts.push(m), clearLocks });
  return { ...t, puts, alerts, unlock: () => runner.unlock('b1') };
}

test('unlock: rows cleared → cleared, context closed', async () => {
  const u = unlockSetup({}, { rows: [{ paymentId: 'HRP1', amount: '100', result: 'cleared' }], retryAt: null });
  await u.unlock();
  assert.deepStrictEqual([u.unlocks.b1.status, u.closed(), u.alerts], ['cleared', 1, []]);
});

test('unlock: a too-young attempt → waiting until retryAt', async () => {
  const at = new Date(Date.now() + 900_000);
  const u = unlockSetup({}, { rows: [], retryAt: at });
  await u.unlock();
  assert.deepStrictEqual([u.unlocks.b1.status, u.due.b1], ['waiting', at.getTime()]);
});

test('unlock: our own attempt was paid after all → filing PAID with the receipt stored; operator told', async () => {
  const u = unlockSetup({}, { rows: [{ paymentId: 'HRP1', amount: '100', result: 'paid', receiptNo: 'HRR7', pdf: Buffer.from('%PDF') }], retryAt: null });
  await u.unlock();
  assert.deepStrictEqual([u.rows.b1.status, u.rows.b1.receiptNo, u.unlocks.b1.status, u.puts.length], ['paid', 'HRR7', 'paid', 1]);
  assert.match(u.alerts.join(), /PAID \(HRR7, this filing\)/);
});

test('unlock: a paid attempt of a different amount is not this filing (vehicle_pending case) — receipt shown only', async () => {
  const u = unlockSetup({ status: 'failed', failureCode: 'vehicle_pending', taxPaise: null }, { rows: [{ paymentId: 'HRP1', amount: '230', result: 'paid', receiptNo: 'HRR8', pdf: null }], retryAt: null });
  await u.unlock();
  assert.deepStrictEqual([u.rows.b1.status, u.unlocks.b1.receiptNo, u.puts.length], ['failed', 'HRR8', 0]);
});

test('unlock: unexpected portal answer → failed (never re-tapped) + alert', async () => {
  const u = unlockSetup({}, { rows: [{ paymentId: 'HRP1', amount: '100', result: 'unknown', note: 'x' }], retryAt: null });
  await u.unlock();
  assert.deepStrictEqual([u.unlocks.b1.status, u.due.b1], ['failed', undefined]);
  assert.strictEqual(u.alerts.length, 1);
});

test('unlock: errors retry, then give up with an alert', async () => {
  const u = unlockSetup({}, new Error('check pending: captcha not accepted'));
  await u.unlock();
  await u.unlock();
  assert.deepStrictEqual([u.unlocks.b1.status, u.alerts.length], ['waiting', 0]);
  await u.unlock();
  assert.deepStrictEqual([u.unlocks.b1.status, u.alerts.length, u.closed()], ['failed', 1, 3]);
});

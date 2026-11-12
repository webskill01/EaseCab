'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createRunner, toJob } = require('../runner');
const { createBorderTaxService } = require('../../features/borderTax/borderTax.service');
const { toHandoff } = require('../flows/bank');

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
  };
  let closed = 0;
  const newPage = async () => ({ context: () => ({ close: async () => { closed += 1; } }) });
  const service = createBorderTaxService({ repo, logger });
  return { rows, jobs, handoffs, repo, service, newPage, closed: () => closed };
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

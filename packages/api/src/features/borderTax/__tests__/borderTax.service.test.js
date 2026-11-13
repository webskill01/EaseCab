'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createBorderTaxService } = require('../borderTax.service');

const logger = { info() {}, warn() {} };
const MEMBER = { status: 'active', expiresAt: new Date(Date.now() + 86_400_000) };

/** In-memory repo with the real compare-and-set semantics. */
function fakeRepo(rows = {}, { sub = MEMBER, slotMs = 0, paused = [] } = {}) {
  const queue = [];
  const handoffs = {};
  const unlocks = {};
  const due = {};
  let attempts = 0;
  return {
    rows, queue, handoffs, unlocks, due,
    async setUnlock(id, f) { unlocks[id] = { ...unlocks[id], ...f }; },
    async getUnlock(id) { return unlocks[id] || {}; },
    async scheduleUnlock(id, at) { due[id] = at; },
    async transition(id, from, to, fields) {
      const r = rows[id];
      if (!r || !from.includes(r.status)) return false;
      Object.assign(r, fields, { status: to });
      return true;
    },
    async findSubscriptionByUserId() { return sub; },
    async pausedStates() { return paused; },
    async countByStatus(st) { return Object.values(rows).filter((r) => st.includes(r.status)).length; },
    async lookupSlotMs() { return slotMs; },
    async incrCreateAttempts() { attempts += 1; return attempts; },
    async findActiveForVehicle(v) { return Object.values(rows).find((r) => r.vehicleNo === v && !['handed_off', 'failed', 'expired', 'cancelled'].includes(r.status)) || null; },
    async create(data) { const id = `b${Object.keys(rows).length + 1}`; rows[id] = { id, ...data }; return rows[id]; },
    async enqueue(id) { queue.push(id); },
    async listByStatus(st) { return Object.values(rows).filter((r) => st.includes(r.status)).map(({ id, status }) => ({ id, status })); },
    async findForUser(id, userId) { return rows[id] && rows[id].userId === userId ? rows[id] : null; },
    async setHandoff(id, h) { handoffs[id] = h; },
    async clearHandoff(id) { delete handoffs[id]; },
  };
}

const input = () => ({
  vehicleNo: 'PB01E9454', stateCd: 'HR', checkpost: 'PANCHKULA', seats: '4+1',
  startAt: new Date('2026-11-07T02:30:00Z'), taxMode: '1', days: 1, distanceKm: 50, declare: true,
});

test('create: queues a HR filing with the NOT APPLICABLE permit + whole-day window', async () => {
  const repo = fakeRepo();
  const row = await createBorderTaxService({ repo, logger }).create('u1', input());
  assert.deepStrictEqual(repo.queue, [row.id]);
  assert.strictEqual(row.status, 'queued');
  assert.strictEqual(row.permitType, '0');
  assert.strictEqual(row.taxUpto - row.taxFrom, 86_400_000 - 60_000);
});

test('create: a monthly filing stores its mode; the portal sets the end date later', async () => {
  const row = await createBorderTaxService({ repo: fakeRepo(), logger }).create('u1', { ...input(), taxMode: '4' });
  assert.strictEqual(row.taxMode, '4');
  assert.strictEqual(row.taxUpto.getTime(), row.taxFrom.getTime()); // placeholder until the quote
});

test('create: members only — no / lapsed subscription is SUBSCRIPTION_EXPIRED, nothing queued', async () => {
  for (const sub of [null, { status: 'active', expiresAt: new Date(Date.now() - 1000) }, { status: 'cancelled', expiresAt: MEMBER.expiresAt }]) {
    const repo = fakeRepo({}, { sub });
    await assert.rejects(createBorderTaxService({ repo, logger }).create('u1', input()), (e) => e.code === 'SUBSCRIPTION_EXPIRED');
    assert.strictEqual(repo.queue.length, 0);
  }
});

test('create: a state the admin paused is refused (422), the rest stay live', async () => {
  const repo = fakeRepo({}, { paused: ['HR'] });
  const svc = createBorderTaxService({ repo, logger });
  await assert.rejects(svc.create('u1', input()), (e) => e.statusCode === 422);
  assert.strictEqual(repo.queue.length, 0);
  assert.deepStrictEqual(await svc.liveStates(), ['UP', 'HP']);
});

test('create: second live filing for the same vehicle is a 409', async () => {
  const svc = createBorderTaxService({ repo: fakeRepo(), logger });
  await svc.create('u1', input());
  await assert.rejects(svc.create('u2', input()), (e) => e.statusCode === 409);
});

test('create: rate limited after 5 in the window', async () => {
  const svc = createBorderTaxService({ repo: fakeRepo(), logger });
  for (let i = 0; i < 5; i += 1) (await svc.create('u1', { ...input(), vehicleNo: `PB01E94${10 + i}` })).status = 'handed_off'; // lane freed
  await assert.rejects(svc.create('u1', { ...input(), vehicleNo: 'PB01E9499' }), (e) => e.code === 'RATE_LIMITED');
});

test('handOff stores the bank form, quote and shifted window → HANDED_OFF (final)', async () => {
  const repo = fakeRepo({ b1: { id: 'b1', status: 'filling' } });
  const svc = createBorderTaxService({ repo, logger });
  const from = new Date('2026-11-08T02:30:00Z');
  const handoff = { method: 'POST', action: 'https://merchant.sbi.bank.in/x', fields: [['encdata', 'e']] };
  assert.strictEqual(await svc.handOff('b1', { taxPaise: 23000, from, upto: new Date(from.getTime() + 86_340_000), handoff }), true);
  assert.deepStrictEqual([repo.rows.b1.status, repo.rows.b1.taxPaise, repo.rows.b1.taxFrom], ['handed_off', 23000, from]);
  assert.deepStrictEqual(repo.handoffs.b1, handoff);
  assert.strictEqual(await svc.fail('b1', 'portal_error'), false);
  assert.strictEqual(await svc.move('b1', 'cancelled'), false);
});

test('handOff after a cancel: refused, bank form dropped', async () => {
  const repo = fakeRepo({ b1: { id: 'b1', status: 'cancelled' } });
  const ok = await createBorderTaxService({ repo, logger }).handOff('b1', { taxPaise: 1, from: new Date(), upto: new Date(), handoff: {} });
  assert.strictEqual(ok, false);
  assert.deepStrictEqual(repo.handoffs, {});
});

test('captcha timeout ends as EXPIRED, other failures as FAILED', async () => {
  const repo = fakeRepo({ a: { id: 'a', status: 'awaiting_captcha' }, b: { id: 'b', status: 'filling' } });
  const svc = createBorderTaxService({ repo, logger });
  await svc.fail('a', 'captcha_timeout');
  await svc.fail('b', 'vehicle_pending');
  assert.deepStrictEqual([repo.rows.a.status, repo.rows.b.status], ['expired', 'failed']);
});

test('recoverAfterRestart: requeue QUEUED, fail in-flight, leave HANDED_OFF alone', async () => {
  const repo = fakeRepo({
    q: { id: 'q', status: 'queued' }, f: { id: 'f', status: 'filling' },
    c: { id: 'c', status: 'awaiting_captcha' }, h: { id: 'h', status: 'handed_off' },
  });
  assert.strictEqual(await createBorderTaxService({ repo, logger }).recoverAfterRestart(), 3);
  assert.deepStrictEqual(repo.queue, ['q']);
  assert.deepStrictEqual(['f', 'c', 'h'].map((k) => repo.rows[k].status), ['failed', 'failed', 'handed_off']);
});

test('rates: latest real quote per border, whole days, recent window only, no personal fields', async () => {
  const now = new Date('2026-11-07T12:00:00Z');
  let since;
  const repo = { async latestQuotes(s) { since = s; return [{ stateCd: 'HP', checkpost: 'PARWANOO', seats: '4+1', taxPaise: 23000,
    taxFrom: new Date('2026-11-07T00:45:00Z'), taxUpto: new Date('2026-11-08T00:44:00Z'), createdAt: now, vehicleNo: 'X', userId: 'u' }]; } };
  const rates = await createBorderTaxService({ repo, logger }).rates(now);
  assert.deepStrictEqual(rates, [{ stateCd: 'HP', checkpost: 'PARWANOO', seats: '4+1', taxPaise: 23000, at: now, days: 1 }]);
  assert.strictEqual(now - since, 60 * 86_400_000);
});

test('in-app QR: FILLING → AWAITING_PAYMENT (QR live, not cancellable) → PAID; receipt link presigned', async () => {
  const job = {};
  const repo = { ...fakeRepo({ b1: { id: 'b1', userId: 'u1', status: 'filling' } }),
    async setJob(id, f) { Object.assign(job, f); }, async getJob() { return job; }, async getHandoff() { return null; },
    async findReceipt(id, userId) { return userId === 'u1' ? repo.rows[id] : null; } };
  const svc = createBorderTaxService({ repo, logger, r2: { async presignGet({ key, download }) { return `signed:${key}:${download}`; } } });
  assert.ok(await svc.awaitPayment('b1', { taxPaise: 10000, from: new Date(), upto: new Date(), qr: 'data:x', upi: 'upi://pay?x', deadline: '1' }));
  assert.strictEqual((await svc.get('u1', 'b1')).live.upi, 'upi://pay?x');
  await assert.rejects(svc.cancel('u1', 'b1'), (e) => e.statusCode === 409);
  await assert.rejects(svc.receipt('u1', 'b1'), (e) => e.code === 'NOT_FOUND');
  assert.ok(await svc.paid('b1', { receiptNo: 'HRR1', receiptKey: 'border-tax/receipts/b1.pdf', paidAt: new Date() }));
  assert.strictEqual((await svc.get('u1', 'b1')).live.qr, null);
  assert.deepStrictEqual(await svc.receipt('u1', 'b1'), { url: 'signed:border-tax/receipts/b1.pdf:border-tax-HRR1.pdf' });
  await assert.rejects(svc.receipt('u2', 'b1'), (e) => e.code === 'NOT_FOUND');
});

test('in-app QR: an unpaid QR expires; a restart mid-payment is payment_unknown', async () => {
  const repo = fakeRepo({ b1: { id: 'b1', status: 'awaiting_payment' }, b2: { id: 'b2', status: 'awaiting_payment' } });
  const svc = createBorderTaxService({ repo, logger });
  await svc.fail('b1', 'payment_timeout');
  assert.strictEqual(repo.rows.b1.status, 'expired');
  await svc.recoverAfterRestart();
  assert.deepStrictEqual([repo.rows.b2.status, repo.rows.b2.failureCode], ['failed', 'payment_unknown']);
});

test('create: only live states — RJ 422, nothing queued', async () => {
  const repo = fakeRepo();
  await assert.rejects(createBorderTaxService({ repo, logger }).create('u1', { ...input(), stateCd: 'RJ', checkpost: 'SADHUWALI', distanceKm: undefined }), (e) => e.statusCode === 422);
  assert.strictEqual(repo.queue.length, 0);
});

test('create: portal busy → 429 with retryAfter, nothing queued, no attempt used', async () => {
  const lanes = { a: { status: 'filling' }, b: { status: 'awaiting_captcha' }, c: { status: 'awaiting_payment' } };
  const cases = [
    [fakeRepo({ ...lanes }), 60], // all lanes busy
    [fakeRepo({}, { slotMs: 45_500 }), 46], // lookup gap running
    [fakeRepo({ q: { status: 'queued' } }, { slotMs: 30_000 }), 150], // one queued ahead takes the next slot
  ];
  for (const [repo, wait] of cases) {
    const svc = createBorderTaxService({ repo, logger });
    await assert.rejects(svc.create('u1', input()), (e) => e.statusCode === 429 && e.meta.retryAfter === wait);
    assert.strictEqual(repo.queue.length, 0);
  }
  const repo = fakeRepo({ a: { status: 'handed_off' }, b: { status: 'paid' } });
  assert.ok(await createBorderTaxService({ repo, logger }).create('u1', input()));
});

test('get: a queued filing shows when the bot starts (lookup gap)', async () => {
  const repo = { ...fakeRepo({ b1: { id: 'b1', userId: 'u1', status: 'queued' } }, { slotMs: 90_000 }), async getJob() { return {}; } };
  const { live } = await createBorderTaxService({ repo, logger }).get('u1', 'b1');
  assert.ok(Math.abs(live.startsAt - Date.now() - 90_000) < 1000);
});

test('late receipt: PAID with step receipt → attachReceipt adds it; nothing found leaves PAID for support', async () => {
  const job = {};
  const repo = { ...fakeRepo({ b1: { id: 'b1', status: 'awaiting_payment' }, b2: { id: 'b2', status: 'paid' } }), async setJob(id, f) { Object.assign(job, f); } };
  const svc = createBorderTaxService({ repo, logger });
  assert.ok(await svc.paid('b1', { receiptNo: null, receiptKey: null, paidAt: new Date(), fetching: true }));
  assert.strictEqual(job.step, 'receipt');
  assert.ok(await svc.attachReceipt('b1', { receiptNo: 'HRR9', receiptKey: 'k' }));
  assert.deepStrictEqual([repo.rows.b1.status, repo.rows.b1.receiptNo, repo.rows.b1.receiptKey, job.step], ['paid', 'HRR9', 'k', 'paid']);
  assert.strictEqual(await svc.attachReceipt('b2', { receiptNo: undefined, receiptKey: null }), false);
  assert.strictEqual(repo.rows.b2.status, 'paid');
});

test('requestUnlock: only for a vehicle_pending failure of the caller; queued now, idempotent while pending', async () => {
  const repo = fakeRepo({
    b1: { id: 'b1', userId: 'u1', status: 'failed', failureCode: 'vehicle_pending' },
    b2: { id: 'b2', userId: 'u1', status: 'failed', failureCode: 'pucc_expired' },
  });
  const svc = createBorderTaxService({ repo, logger });
  await assert.rejects(svc.requestUnlock('u2', 'b1'), { code: 'NOT_FOUND' });
  await assert.rejects(svc.requestUnlock('u1', 'b2'), { statusCode: 409 });
  const u = await svc.requestUnlock('u1', 'b1');
  assert.strictEqual(u.status, 'queued');
  assert.ok(repo.due.b1 <= Date.now());
  repo.due.b1 = 'untouched';
  assert.strictEqual((await svc.requestUnlock('u1', 'b1')).status, 'queued');
  assert.strictEqual(repo.due.b1, 'untouched');
});

test('requestUnlock: members only', async () => {
  const repo = fakeRepo({ b1: { id: 'b1', userId: 'u1', status: 'failed', failureCode: 'vehicle_pending' } }, { sub: null });
  await assert.rejects(createBorderTaxService({ repo, logger }).requestUnlock('u1', 'b1'), { code: 'SUBSCRIPTION_EXPIRED' });
});

test('scheduleUnlock default = 31 min out (portal frees the attempt after 30) → waiting', async () => {
  const repo = fakeRepo();
  await createBorderTaxService({ repo, logger }).scheduleUnlock('b1');
  const mins = (repo.due.b1 - Date.now()) / 60_000;
  assert.ok(mins > 30.9 && mins <= 31, mins);
  assert.strictEqual(repo.unlocks.b1.status, 'waiting');
});

test('unlockDone: retryAt → waiting again; receipt → paid; unknown → failed; else cleared', async () => {
  const repo = fakeRepo();
  const svc = createBorderTaxService({ repo, logger });
  const at = new Date(Date.now() + 600_000);
  await svc.unlockDone('b1', { retryAt: at });
  assert.deepStrictEqual([repo.unlocks.b1.status, repo.due.b1], ['waiting', at.getTime()]);
  await svc.unlockDone('b1', {});
  assert.strictEqual(repo.unlocks.b1.status, 'cleared');
  await svc.unlockDone('b2', { receiptNo: 'HRR1' });
  assert.deepStrictEqual([repo.unlocks.b2.status, repo.unlocks.b2.receiptNo], ['paid', 'HRR1']);
  await svc.unlockDone('b3', { failed: true });
  assert.strictEqual(repo.unlocks.b3.status, 'failed');
});

test('unlockFailed retries UNLOCK_TRIES times, then gives up', async () => {
  const repo = fakeRepo();
  const svc = createBorderTaxService({ repo, logger });
  assert.strictEqual(await svc.unlockFailed('b1'), true);
  assert.strictEqual(await svc.unlockFailed('b1'), true);
  assert.strictEqual(await svc.unlockFailed('b1'), false);
  assert.strictEqual(repo.unlocks.b1.status, 'failed');
});

test('latePaid: a failed/expired filing becomes PAID with its receipt; a paid one is left alone', async () => {
  const repo = fakeRepo({ b1: { id: 'b1', status: 'expired', failureCode: 'payment_timeout' }, b2: { id: 'b2', status: 'paid', receiptNo: 'X' } });
  const svc = createBorderTaxService({ repo, logger });
  assert.strictEqual(await svc.latePaid('b1', { receiptNo: 'HRR9', receiptKey: 'k' }), true);
  assert.deepStrictEqual([repo.rows.b1.status, repo.rows.b1.receiptNo, repo.rows.b1.failureCode], ['paid', 'HRR9', null]);
  assert.strictEqual(await svc.latePaid('b2', { receiptNo: 'HRR9', receiptKey: 'k' }), false);
});

test('restart: a lost payment page (payment_unknown) schedules an unlock — it frees the vehicle or finds the receipt', async () => {
  const repo = fakeRepo({ b1: { id: 'b1', status: 'awaiting_payment' } });
  await createBorderTaxService({ repo, logger }).recoverAfterRestart();
  assert.deepStrictEqual([repo.rows.b1.failureCode, repo.unlocks.b1.status], ['payment_unknown', 'waiting']);
});

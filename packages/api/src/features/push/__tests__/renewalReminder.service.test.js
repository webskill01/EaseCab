'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRenewalReminderService } = require('../renewalReminder.service');

// 2026-11-13 12:00 IST (06:30Z) — inside the daytime send window.
const NOON_IST = new Date('2026-11-13T06:30:00Z');
const EXPIRY = new Date('2026-11-14T10:00:00Z'); // 14 Nov, 15:30 IST

function setup({ rows = [], claimed = new Set(), stale = [] } = {}) {
  const sent = [];
  const repo = {
    findArgs: null,
    async findRenewalDueTokens(a) { repo.findArgs = a; return rows; },
    async claimRenewalReminder({ userId, expiresAt }) {
      const k = `${userId}:${expiresAt.toISOString()}`;
      if (claimed.has(k)) return false;
      claimed.add(k);
      return true;
    },
    async pruneTokens(t) { return t.length; },
  };
  const pushSender = { async sendToTokens(a) { sent.push(a); return { successCount: a.tokens.length, staleTokens: stale }; } };
  return { svc: createRenewalReminderService({ repo, pushSender }), repo, sent };
}

test('sends one push per user to all their devices, with the IST expiry date', async () => {
  const { svc, repo, sent } = setup({
    rows: [
      { userId: 'u1', deviceToken: 't1', expiresAt: EXPIRY },
      { userId: 'u1', deviceToken: 't2', expiresAt: EXPIRY },
      { userId: 'u2', deviceToken: 't3', expiresAt: EXPIRY },
    ],
  });
  const out = await svc.sweep(NOON_IST);
  assert.deepEqual(out, { users: 2, sent: 3, pruned: 0 });
  assert.deepEqual(sent[0].tokens, ['t1', 't2']);
  assert.equal(sent[0].data.url, '/membership');
  assert.match(sent[0].data.body, /14 Nov/);
  assert.equal(repo.findArgs.to.getTime() - repo.findArgs.from.getTime(), 36 * 3_600_000);
});

test('never sends twice for the same paid period', async () => {
  const rows = [{ userId: 'u1', deviceToken: 't1', expiresAt: EXPIRY }];
  const claimed = new Set();
  const a = setup({ rows, claimed });
  await a.svc.sweep(NOON_IST);
  const b = setup({ rows, claimed });
  assert.deepEqual(await b.svc.sweep(NOON_IST), { users: 0, sent: 0, pruned: 0 });
  assert.equal(b.sent.length, 0);
});

test('stays quiet at night IST (no query, no push)', async () => {
  const { svc, repo, sent } = setup({ rows: [{ userId: 'u1', deviceToken: 't1', expiresAt: EXPIRY }] });
  const out = await svc.sweep(new Date('2026-11-13T20:00:00Z')); // 01:30 IST
  assert.deepEqual(out, { users: 0, sent: 0, pruned: 0 });
  assert.equal(repo.findArgs, null);
  assert.equal(sent.length, 0);
});

test('prunes tokens FCM reports dead', async () => {
  const { svc } = setup({ rows: [{ userId: 'u1', deviceToken: 't1', expiresAt: EXPIRY }], stale: ['t1'] });
  assert.equal((await svc.sweep(NOON_IST)).pruned, 1);
});

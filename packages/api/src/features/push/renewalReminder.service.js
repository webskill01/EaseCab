'use strict';

const { RENEWAL_REMINDER } = require('@easecab/shared');

const HOUR_MS = 3_600_000;
const IST = 'Asia/Kolkata';

/** Current hour (0–23) in IST. */
function istHour(now) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: IST, hour: '2-digit', hourCycle: 'h23' }).format(now));
}

/** "21 Nov" in IST — the expiry date shown in the push body. */
function istDate(d) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short' }).format(d);
}

/**
 * Renewal reminder sweep (Phase 21.3). server.js runs `sweep()` on an interval. Sends one
 * push per paid period to every device of members whose window ends within LEAD_HOURS,
 * only during IST daytime. Users with no push token simply never appear in the query.
 *
 * @param {object} deps
 * @param {ReturnType<import('./push.repository').createPushRepository>} deps.repo
 * @param {{ sendToTokens: Function }} deps.pushSender
 */
function createRenewalReminderService({ repo, pushSender }) {
  return {
    /** @param {Date} [now] @returns {Promise<{ users: number, sent: number, pruned: number }>} */
    async sweep(now = new Date()) {
      const out = { users: 0, sent: 0, pruned: 0 };
      const hour = istHour(now);
      if (hour < RENEWAL_REMINDER.SEND_HOUR_START_IST || hour >= RENEWAL_REMINDER.SEND_HOUR_END_IST) return out;

      const rows = await repo.findRenewalDueTokens({ from: now, to: new Date(now.getTime() + RENEWAL_REMINDER.LEAD_HOURS * HOUR_MS) });
      const byUser = new Map();
      for (const r of rows) {
        const u = byUser.get(r.userId) || { expiresAt: r.expiresAt, tokens: [] };
        u.tokens.push(r.deviceToken);
        byUser.set(r.userId, u);
      }

      for (const [userId, { expiresAt, tokens }] of byUser) {
        if (!(await repo.claimRenewalReminder({ userId, expiresAt }))) continue;
        const { successCount, staleTokens } = await pushSender.sendToTokens({
          tokens,
          data: {
            type: RENEWAL_REMINDER.TYPE,
            source: RENEWAL_REMINDER.SOURCE,
            title: RENEWAL_REMINDER.TITLE,
            body: RENEWAL_REMINDER.BODY.replace('{date}', istDate(expiresAt)),
            url: RENEWAL_REMINDER.CLICK_PATH,
            action: RENEWAL_REMINDER.ACTION,
          },
        });
        out.users += 1;
        out.sent += successCount;
        if (staleTokens.length > 0) out.pruned += await repo.pruneTokens(staleTokens);
      }
      return out;
    },
  };
}

module.exports = { createRenewalReminderService };

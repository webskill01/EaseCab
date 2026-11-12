'use strict';

const {
  AppError, ERROR_CODES, BORDER_TAX, BORDER_TAX_STATUS: S, BORDER_TAX_STATES, BORDER_TAX_LIVE_STATES, BORDER_TAX_FAILURE: F,
  BORDER_TAX_UNLOCK: U,
  borderTaxWindow, isSubscriptionActive, TAX_MODE,
} = require('@easecab/shared');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');
const DAY_MS = 86_400_000;

const IN_FLIGHT = Object.freeze([S.QUEUED, S.FILLING, S.AWAITING_CAPTCHA]);
const TIMEOUTS = Object.freeze([F.CAPTCHA_TIMEOUT, F.PAYMENT_TIMEOUT]);
// In-app QR (HR): the bot's browser holds the driver's payment — not cancellable, but it can fail or expire.
const RUNNING = Object.freeze([...IN_FLIGHT, S.AWAITING_PAYMENT]);
// An unpaid attempt on the portal can still turn out paid (driver paid as the bot lost the page): the unlock finds its receipt.
const LATE_PAID_FROM = Object.freeze([S.FAILED, S.EXPIRED]);

/** Redis unlock hash → what the app shows (null = no unlock for this filing). */
const toUnlock = (u) => (u.status ? { status: u.status, at: u.at ? new Date(Number(u.at)) : null, receiptNo: u.receiptNo || null } : null);

/**
 * Allowed status changes, keyed by TARGET → statuses it may come from. Anything not listed
 * is refused. HANDED_OFF is final: the driver may be paying the govt on the bank page.
 */
const FROM = Object.freeze({
  [S.FILLING]: [S.QUEUED, S.AWAITING_CAPTCHA],
  [S.AWAITING_CAPTCHA]: [S.FILLING],
  [S.HANDED_OFF]: [S.FILLING],
  [S.AWAITING_PAYMENT]: [S.FILLING],
  [S.PAID]: [S.AWAITING_PAYMENT],
  [S.FAILED]: RUNNING,
  [S.EXPIRED]: RUNNING,
  [S.CANCELLED]: IN_FLIGHT,
});

/**
 * Border-tax business rules (CLAUDE.md §4): members only, one live filing per vehicle,
 * create rate limit, the status machine, bank hand-off, crash recovery.
 * @param {{ repo: ReturnType<typeof import('./borderTax.repository').createBorderTaxRepository>, logger: import('pino').Logger, r2?: { presignGet: Function } }} deps
 */
function createBorderTaxService({ repo, logger, r2 = null }) {
  /**
   * Compare-and-set status change along FROM.
   * @returns {Promise<boolean>} false if the row was no longer in an allowed source status
   */
  async function move(id, to, fields = {}) {
    if (!FROM[to]) throw new Error(`border tax: no transition into ${to}`);
    const moved = await repo.transition(id, FROM[to], to, fields);
    if (!moved) logger.info({ id, to }, 'border tax transition skipped (status changed)');
    return moved;
  }

  /**
   * Seconds until a new filing could start right away; 0 = now. All lanes busy → BUSY_RETRY_SEC (a lane frees
   * at an unknown time); else the lookup slot's wait, plus a full gap per filing already queued for it.
   */
  async function busyFor() {
    if ((await repo.countByStatus([...RUNNING])) >= BORDER_TAX.WORKER_CONCURRENCY) return BORDER_TAX.BUSY_RETRY_SEC;
    const queued = await repo.countByStatus([S.QUEUED]);
    const slotMs = await repo.lookupSlotMs();
    return slotMs || queued ? Math.ceil(slotMs / 1000) + queued * BORDER_TAX.LOOKUP_GAP_SEC : 0;
  }

  return {
    move,
    busyFor,

    /**
     * New filing from a validated borderTaxCreateSchema body; queued for the worker.
     * Free for subscribed members — the gate fires before the rate limit so it costs nothing.
     * Govt portal busy (lanes full / lookup gap) → 429 with meta.retryAfter (sec): nothing is queued, so the
     * driver's timer never runs while the bot is not filing.
     * @throws {AppError} SUBSCRIPTION_EXPIRED, 422 state not live yet, RATE_LIMITED (busy: meta.retryAfter), or 409 when the vehicle already has a live filing
     */
    async create(userId, input) {
      if (!isSubscriptionActive(await repo.findSubscriptionByUserId(userId))) throw AppError.fromCode(ERROR_CODES.SUBSCRIPTION_EXPIRED);
      if (!BORDER_TAX_LIVE_STATES.includes(input.stateCd)) throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'This state is not available yet', 422);
      if (await repo.findActiveForVehicle(input.vehicleNo)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'A filing for this vehicle is already in progress', 409);
      }
      const wait = await busyFor(); // before the create counter: a busy retry must not use up the driver's attempts
      if (wait) throw Object.assign(new AppError(ERROR_CODES.RATE_LIMITED, 'The govt portal is busy, try again shortly', 429), { meta: { retryAfter: wait } });
      const { MAX_PER_WINDOW, WINDOW_SEC } = BORDER_TAX.CREATE_RATE_LIMIT;
      if ((await repo.incrCreateAttempts(userId, WINDOW_SEC)) > MAX_PER_WINDOW) throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      // non-DAYS periods end where the portal says (calendar month/quarter…) — upto is set from the quote
      const days = input.taxMode === TAX_MODE.DAYS;
      const { from, upto } = days ? borderTaxWindow(input.startAt, input.days) : { from: input.startAt, upto: input.startAt };
      const row = await repo.create({
        userId, vehicleNo: input.vehicleNo, stateCd: input.stateCd, checkpost: input.checkpost ?? null,
        seats: input.seats, permitType: BORDER_TAX_STATES[input.stateCd].permitType, taxMode: input.taxMode,
        taxFrom: from, taxUpto: upto, distanceKm: input.distanceKm ?? null, status: S.QUEUED,
      });
      await repo.enqueue(row.id);
      return row;
    },

    /**
     * Driver's filings, newest first. Cursor reuses the feed codec ((createdAt, id) as its key).
     * @returns {Promise<{ filings: object[], nextCursor: ?string }>}
     */
    async list(userId, { limit, cursor }) {
      const key = cursor && decodeCursor(cursor);
      const { items, hasMore } = await repo.listForUser({ userId, limit, cursor: key && { createdAt: key.receivedAt, id: key.id } });
      const last = items[items.length - 1];
      return { filings: items, nextCursor: hasMore ? encodeCursor({ receivedAt: last.createdAt, id: last.id }) : null };
    },

    /**
     * One filing + its live step. `captcha` (PNG data URL) is set only while the worker waits
     * for the driver's answer; `handoff` (bank form the app auto-submits) only for
     * HANDOFF_TTL_SEC after HANDED_OFF — the app polls this.
     * @throws {AppError} NOT_FOUND unless it is the caller's
     */
    async get(userId, id) {
      const filing = await repo.findForUser(id, userId);
      if (!filing) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const { step = null, captcha = '', refresh = '', deadline = '', started = '', qr = '', upi = '' } = await repo.getJob(id);
      const handoff = filing.status === S.HANDED_OFF ? await repo.getHandoff(id) : null;
      const paying = filing.status === S.AWAITING_PAYMENT;
      // queued behind the lookup gap: when the bot starts (null = any moment / waiting for a lane)
      const slotMs = filing.status === S.QUEUED ? await repo.lookupSlotMs() : 0;
      const unlock = toUnlock(await repo.getUnlock(id));
      return { ...filing, unlock, live: { step, startsAt: slotMs ? new Date(Date.now() + slotMs) : null, captcha: captcha || null, canRefresh: Boolean(captcha && refresh), deadline: deadline ? new Date(Number(deadline)) : null, started: started ? new Date(Number(started)) : null, handoff, qr: (paying && qr) || null, upi: (paying && upi) || null } };
    },

    /**
     * Hands the driver's captcha reading to the waiting worker.
     * @throws {AppError} NOT_FOUND; 409 when no captcha is waiting
     */
    async answerCaptcha(userId, id, answer) {
      if (!(await repo.findForUser(id, userId))) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      if (!(await repo.getJob(id)).captcha) throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'No captcha is waiting', 409);
      await repo.pushAnswer(id, answer);
    },

    /**
     * Each border's latest real fee (any driver's quote, no personal fields) for the form.
     * @returns {Promise<{ stateCd: string, checkpost: ?string, seats: string, days: number, taxPaise: number, at: Date }[]>}
     */
    async rates(now = new Date()) {
      const rows = await repo.latestQuotes(new Date(now.getTime() - BORDER_TAX.RATES_WINDOW_DAYS * DAY_MS));
      return rows.map((r) => ({
        stateCd: r.stateCd, checkpost: r.checkpost, seats: r.seats, taxPaise: r.taxPaise, at: r.createdAt,
        days: Math.round((r.taxUpto.getTime() - r.taxFrom.getTime() + 60_000) / DAY_MS),
      }));
    },

    /** Driver asks for a new captcha image (the worker refreshes it on the portal if refreshes are left). */
    async refreshCaptcha(userId, id) {
      return this.answerCaptcha(userId, id, BORDER_TAX.CAPTCHA_REFRESH_TOKEN);
    },

    /**
     * Driver cancels while the bot is still filling. After the hand-off there is nothing to cancel.
     * ponytail: a worker blocked on a captcha notices at its next status move (≤ CAPTCHA_TIMEOUT_SEC)
     * @throws {AppError} NOT_FOUND; 409 once handed off / finished
     */
    async cancel(userId, id) {
      if (!(await repo.findForUser(id, userId))) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      if (!(await move(id, S.CANCELLED))) throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'This filing can no longer be cancelled', 409);
    },

    /**
     * Worker captured the bank page: store it for the app (short TTL), then quote (+ shifted
     * window) and HANDED_OFF. Stored first so the app never sees HANDED_OFF without it.
     * @returns {Promise<boolean>} false if the filing was cancelled meanwhile (form dropped)
     */
    async handOff(id, { taxPaise, from, upto, handoff }) {
      await repo.setHandoff(id, handoff);
      const moved = await move(id, S.HANDED_OFF, { taxPaise, taxFrom: from, taxUpto: upto });
      if (!moved) await repo.clearHandoff(id);
      return moved;
    },

    /**
     * Worker is on PayU's UPI QR (HR): store it for the app, then quote + AWAITING_PAYMENT.
     * @returns {Promise<boolean>} false if the filing was cancelled meanwhile
     */
    async awaitPayment(id, { taxPaise, from, upto, qr, upi, deadline }) {
      await repo.setJob(id, { step: 'pay', qr, upi: upi || '', deadline });
      return move(id, S.AWAITING_PAYMENT, { taxPaise, taxFrom: from, taxUpto: upto });
    },

    /**
     * PayU said success. receiptNo/receiptKey null = no receipt yet: `fetching` → step 'receipt' while the
     * worker looks it up (attachReceipt); otherwise the app shows support.
     */
    async paid(id, { receiptNo, receiptKey, paidAt, fetching = false }) {
      await repo.setJob(id, { step: fetching ? 'receipt' : 'paid', qr: '', upi: '', deadline: '' });
      return move(id, S.PAID, { receiptNo, receiptKey, paidAt });
    },

    /** Late receipt lookup finished (found or not): store what came back, end the 'receipt' step. */
    async attachReceipt(id, { receiptNo, receiptKey }) {
      await repo.setJob(id, { step: 'paid' });
      const fields = Object.fromEntries(Object.entries({ receiptNo, receiptKey }).filter(([, v]) => v));
      return Object.keys(fields).length ? repo.transition(id, [S.PAID], S.PAID, fields) : false;
    },

    /**
     * Short-lived download link to the receipt PDF (private bucket, presigned GET — §3.12).
     * The link forces a download (saved as border-tax-<receipt no>.pdf), not an in-browser viewer.
     * @throws {AppError} NOT_FOUND unless the caller's filing has a stored receipt
     */
    async receipt(userId, id) {
      const row = await repo.findReceipt(id, userId);
      if (!row?.receiptKey || !r2) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      const name = `border-tax-${(row.receiptNo || id).replace(/[^A-Za-z0-9-]/g, '')}.pdf`;
      return { url: await r2.presignGet({ key: row.receiptKey, download: name }) };
    },

    /**
     * Driver's "Clear lock" on a vehicle_pending failure: the worker clears the vehicle's pending
     * attempts in that state (once the portal allows — 30 min after each attempt). Idempotent while one runs.
     * @throws {AppError} NOT_FOUND, SUBSCRIPTION_EXPIRED, 409 unless the filing failed vehicle_pending
     */
    async requestUnlock(userId, id) {
      const filing = await repo.findForUser(id, userId);
      if (!filing) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      if (filing.failureCode !== F.VEHICLE_PENDING) throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Nothing to clear for this filing', 409);
      if (!isSubscriptionActive(await repo.findSubscriptionByUserId(userId))) throw AppError.fromCode(ERROR_CODES.SUBSCRIPTION_EXPIRED);
      const cur = await repo.getUnlock(id);
      if ([U.QUEUED, U.WAITING].includes(cur.status)) return toUnlock(cur);
      await this.scheduleUnlock(id, Date.now());
      return toUnlock(await repo.getUnlock(id));
    },

    /** Queue a pending-lock clear for this filing's vehicle+state at `atMs` (default: when the portal frees our own attempt). */
    async scheduleUnlock(id, atMs = Date.now() + BORDER_TAX.UNLOCK_AFTER_SEC * 1000, tries = 0) {
      await repo.setUnlock(id, { status: atMs > Date.now() ? U.WAITING : U.QUEUED, at: String(atMs), tries: String(tries), receiptNo: '' });
      await repo.scheduleUnlock(id, atMs);
    },

    /** Worker finished a clear: unexpected answer → FAILED; a too-young attempt → again at retryAt; else cleared (or paid, with its receipt). */
    async unlockDone(id, { retryAt = null, receiptNo = null, failed = false }) {
      if (failed) return repo.setUnlock(id, { status: U.FAILED, at: String(Date.now()) });
      if (retryAt) return this.scheduleUnlock(id, retryAt.getTime());
      return repo.setUnlock(id, { status: receiptNo ? U.PAID : U.CLEARED, at: String(Date.now()), receiptNo: receiptNo || '' });
    },

    /** Clear run errored. @returns {Promise<boolean>} false = gave up after UNLOCK_TRIES (FAILED) */
    async unlockFailed(id) {
      const tries = Number((await repo.getUnlock(id)).tries || 0) + 1;
      if (tries >= BORDER_TAX.UNLOCK_TRIES) {
        await repo.setUnlock(id, { status: U.FAILED, tries: String(tries) });
        return false;
      }
      await this.scheduleUnlock(id, Date.now() + BORDER_TAX.UNLOCK_RETRY_SEC * 1000, tries);
      return true;
    },

    /** This filing's own unpaid-looking attempt was paid after all (found by the unlock): PAID with its receipt. */
    async latePaid(id, { receiptNo, receiptKey }) {
      return repo.transition(id, LATE_PAID_FROM, S.PAID, { receiptNo, receiptKey, paidAt: new Date(), failureCode: null });
    },

    /** Ends an in-flight row with a failure code (FAILED, or EXPIRED for a driver timeout). */
    async fail(id, failureCode) {
      return move(id, TIMEOUTS.includes(failureCode) ? S.EXPIRED : S.FAILED, { failureCode });
    },

    /**
     * Worker boot: browser sessions died with the old process. In-flight rows fail, QUEUED
     * rows are re-queued — the QUEUED→FILLING compare-and-set makes a duplicate entry harmless.
     */
    async recoverAfterRestart() {
      const rows = await repo.listByStatus([...RUNNING]);
      for (const { id, status } of rows) {
        if (status === S.QUEUED) await repo.enqueue(id);
        // the PayU session died with the browser: the driver may or may not have paid → support checks
        else if (status === S.AWAITING_PAYMENT) {
          await move(id, S.FAILED, { failureCode: F.PAYMENT_UNKNOWN });
          await this.scheduleUnlock(id); // frees the vehicle — or, if the driver did pay, finds the receipt
        }
        else await move(id, S.FAILED, { failureCode: F.WORKER_RESTART });
      }
      return rows.length;
    },
  };
}

module.exports = { createBorderTaxService, BORDER_TAX_FROM: FROM };

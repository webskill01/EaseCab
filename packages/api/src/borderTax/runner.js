'use strict';

const { BORDER_TAX, BORDER_TAX_STATUS: S, BORDER_TAX_FAILURE: F, BORDER_TAX_UNLOCK: U, BORDER_TAX_PAY_EVENTS } = require('@easecab/shared');
const { portalError } = require('./flows/portal');
const { fileCheckpost } = require('./flows/checkpostv4');
const { openQr, awaitPaid, watchStatus } = require('./flows/payuQr');
const { openSbiQr, awaitSbiPaid } = require('./flows/sbiQr');
const { lookupReceipt } = require('./flows/receiptLookup');
const { clearPending } = require('./flows/clearPending');

// All use the shared checkpostv4 portal; a state without a flow fails fast.
const FLOWS = Object.freeze({ HR: fileCheckpost, HP: fileCheckpost, UP: fileCheckpost, RJ: fileCheckpost, UK: fileCheckpost, PB: fileCheckpost });
const DAY_MS = 86_400_000;
const STOPPED = 'filing no longer active'; // driver cancelled / filing expired — not our fault, no alert
// Our side broke (vs a driver/vehicle outcome like captcha timeout or expired PUC) → Telegram.
const ALERT_ON = new Set([F.PORTAL_ERROR, F.BANK_DOWN, F.NO_HANDOFF, F.NO_QR, F.TREASURY_DOWN, F.PAYMENT_UNKNOWN]);
// Thrown at/after eTransPgi, where the portal mints a payment id: the attempt locks the vehicle in that state.
// Timed out at the QR: the driver may have paid and PayU's result never reached the bot (HP 513710ed, 2026-11-19)
const MAYBE_PAID = new Set([F.PAYMENT_TIMEOUT, F.PAYMENT_UNKNOWN]);
const BANK_STEP = new Set([F.NO_HANDOFF, F.NO_QR, F.TREASURY_DOWN, F.PAYMENT_FAILED, F.PAYMENT_TIMEOUT]);

/** DB row → flow job. Window ends a minute early, so +1 min gives whole days. */
function toJob(req) {
  const days = Math.round((req.taxUpto.getTime() - req.taxFrom.getTime() + 60_000) / DAY_MS);
  return {
    stateCd: req.stateCd, permitType: req.permitType, vehicleNo: req.vehicleNo,
    checkpost: req.checkpost, startAt: req.taxFrom, days, distanceKm: req.distanceKm, taxMode: req.taxMode,
  };
}

/**
 * Runs one filing: portal flow (OCR first, misses relayed to the driver) → quote →
 * declaration + bank hand-off → HANDED_OFF, browser closed. The driver pays the govt on the bank page.
 * One `conn` per concurrent job (blocking pops).
 * @param {object} deps
 * @param {ReturnType<typeof import('../features/borderTax/borderTax.service').createBorderTaxService>} deps.service
 * @param {ReturnType<typeof import('../features/borderTax/borderTax.repository').createBorderTaxRepository>} deps.repo
 * @param {(job?: { stateCd: string, sid: string }) => Promise<import('playwright').Page>} deps.newPage - fresh context per job (job → proxy for PROXY_STATES)
 * @param {import('pino').Logger} deps.logger
 * @param {{ putObject: Function }} deps.r2 - receipt PDFs
 * @param {(text: string) => void} [deps.alert] - operator alert (Telegram), best-effort
 * @param {typeof clearPending} [deps.clearLocks]
 * @param {Record<string, Function>} [deps.flows]
 * @param {(ms: number) => Promise<void>} [deps.sleep]
 */
function createRunner({ service, repo, newPage, logger, r2, alert = () => {}, onLatePaid = async () => {}, onFreed = async () => {}, isStopping = () => false, clearLocks = clearPending, lookup = lookupReceipt, flows = FLOWS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const until = (sec) => String(Date.now() + sec * 1000);

  function makeIo(id, conn) {
    const moveOrStop = async (to) => {
      if (!(await service.move(id, to))) throw portalError(F.PORTAL_ERROR, STOPPED);
    };
    return {
      log: (m) => logger.info({ id }, m),
      progress: (n) => repo.setJob(id, { progress: String(n) }).catch((err) => logger.warn({ id, err: err.message }, 'progress write failed')),
      async captcha({ step, image, canRefresh = false }) {
        await repo.clearAnswers(id);
        await moveOrStop(S.AWAITING_CAPTCHA);
        await repo.setJob(id, { step, captcha: image, refresh: canRefresh ? '1' : '', deadline: until(BORDER_TAX.CAPTCHA_TIMEOUT_SEC) });
        const answer = await repo.popAnswer(conn, id, BORDER_TAX.CAPTCHA_TIMEOUT_SEC);
        await repo.setJob(id, { step: 'filling', captcha: '', deadline: '' });
        if (answer === null) throw portalError(F.CAPTCHA_TIMEOUT);
        await moveOrStop(S.FILLING);
        return answer;
      },
      // portal's real amount, held on the tax page: Pay Online (= the 30-min vehicle lock) only after the driver's OK
      async confirmFare({ taxPaise, from, upto }) {
        await repo.clearAnswers(id);
        const t0 = Date.now();
        await repo.setJob(id, { step: 'fare', fare: JSON.stringify({ taxPaise, from, upto }), deadline: until(BORDER_TAX.FARE_CONFIRM_SEC) });
        const answer = await repo.popAnswer(conn, id, BORDER_TAX.FARE_CONFIRM_SEC);
        await repo.setJob(id, { step: 'filling', fare: '', deadline: '' });
        logger.info({ id }, `fare ${answer ?? 'no answer'} after ${Math.round((Date.now() - t0) / 1000)}s`);
        if (answer !== 'yes') throw portalError(F.FARE_DECLINED, answer ? 'driver cancelled at the amount' : 'no answer at the amount');
      },
    };
  }

  /** Portal burst limit (one IP): filings start their Vahan lookup at least LOOKUP_GAP_SEC apart. */
  // ponytail: per-filing gap, not per-lookup — a flow's own retries (refresh, next day) ride on its slot
  async function waitLookupSlot() {
    for (let ms = await repo.takeLookupSlot(BORDER_TAX.LOOKUP_GAP_SEC); ms > 0; ms = await repo.takeLookupSlot(BORDER_TAX.LOOKUP_GAP_SEC)) await sleep(ms);
  }

  /** Receipt PDF → R2. Upload trouble never loses a paid filing: key null → the app shows support. */
  async function storeReceipt(id, pdf) {
    if (!pdf) return null;
    const key = `${BORDER_TAX.RECEIPT_PREFIX}${id}.pdf`;
    try {
      await r2.putObject({ key, body: pdf, contentType: 'application/pdf' });
      return key;
    } catch (err) {
      logger.error({ id, err: err.message }, 'border tax receipt upload failed');
      return null;
    }
  }

  /**
   * PayU's result never came in time (HP 513710ed, 2026-11-19: driver paid, filing expired): the receipt list
   * says if it was paid. PayU's post-back is still watched meanwhile — a success then counts as paid with the
   * receipt fetched after (collect's `fetching` path). @throws err when neither shows up
   */
  async function lookupAfterTimeout(id, req, { payPage, pay, quote }, io, err) {
    const watch = watchStatus(payPage.context(), pay.back);
    try {
      io.log('no PayU result — looking the receipt up by vehicle');
      await repo.setJob(id, { step: 'verifying' }); // app: "receipt is being fetched from the govt portal, don't pay again"
      const late = await lookupReceipt(payPage.context(), { stateCd: req.stateCd, vehicleNo: req.vehicleNo, taxFrom: quote.from, amountPaise: quote.taxPaise }, io.log, sleep);
      if (late) {
        io.log(`receipt ${late.receiptNo} (lookup after timeout)`);
        return late;
      }
      if (watch.status() !== 'success') throw err;
      io.log('PayU success came during the lookup → paid, receipt fetched next');
      return { receiptNo: null, pdf: null };
    } finally {
      watch.stop();
    }
  }

  /** In-app QR: show the bank's QR (HR/HP PayU, UP SBIePay), wait for the driver's payment, fetch the receipt. */
  async function collect(id, req, { payPage, ref, pay, ...quote }, io) {
    const { qr, upi, secLeft } = pay.sbi ? await openSbiQr(payPage, io) : await openQr(payPage, io);
    if (!(await service.awaitPayment(id, { ...quote, qr, upi, deadline: until(secLeft ?? BORDER_TAX.PAY_WAIT_SEC) }))) return false;
    const { receiptNo, pdf } = pay.sbi ? await awaitSbiPaid(payPage, io, secLeft) : await awaitPaid(payPage, io, pay.back).catch(async (err) => {
      if (err.failureCode !== F.PAYMENT_TIMEOUT) throw err;
      return lookupAfterTimeout(id, req, { payPage, pay, quote }, io, err);
    });
    const receiptKey = await storeReceipt(id, pdf);
    const grn = ref?.grn || null;
    const fetching = !receiptKey; // HP has no GRN; with no receipt number either it's found by Tax From + fee
    await service.paid(id, { receiptNo, receiptKey, paidAt: new Date(), fetching });
    if (!fetching) {
      await notify(req);
      return true;
    }
    // paid is already recorded; a late lookup only adds the receipt (Print Payment Receipt, never Check Status)
    const late = await lookupReceipt(payPage.context(), { stateCd: req.stateCd, vehicleNo: req.vehicleNo, receiptNo, grn, taxFrom: quote.from, amountPaise: quote.taxPaise }, io.log, sleep);
    if (late) io.log(`receipt ${late.receiptNo} (lookup)`);
    const lateKey = await storeReceipt(id, late?.pdf);
    await service.attachReceipt(id, { receiptNo: late?.receiptNo, receiptKey: lateKey });
    if (lateKey) await notify(req);
    return true;
  }

  /** Receipt stored → "payment mil gayi, receipt download kar lo" push, every path (the driver may have left the app). */
  async function notify(req) {
    await onLatePaid(req).catch((err) => logger.warn({ id: req.id, err: err.message }, 'paid push failed'));
  }

  /** What the driver did on the QR screen (app events, first time each, seconds after the QR showed) — paid or not. */
  async function logPayEvents(id, paid) {
    const job = await repo.getJob(id);
    const t0 = Number(job.ev_qr_shown);
    const seen = BORDER_TAX_PAY_EVENTS.filter((e) => job[`ev_${e}`]).map((e) => (t0 ? `${e} +${Math.round((job[`ev_${e}`] - t0) / 1000)}s` : e));
    logger.info({ id, paid, app: seen.join(', ') || 'none' }, 'QR screen events');
  }

  /** @param {string} id @param {import('ioredis').Redis} conn */
  async function run(id, conn) {
    const req = await repo.findById(id);
    if (!req) return;
    await waitLookupSlot(); // stays QUEUED while waiting — the driver can still cancel
    // the app's timer starts here, not at queueing; written BEFORE the status moves so no poll ever
    // sees `filling` without a start time (the ring jumped to a full 5:00 for a moment)
    await repo.setJob(id, { step: 'filling', started: String(Date.now()), progress: '0' });
    if (!(await service.move(id, S.FILLING))) return; // cancelled, or a duplicate queue entry
    const flow = flows[req.stateCd];
    if (!flow) return void (await service.fail(id, F.STATE_UNSUPPORTED));
    let page = null;
    let atBank = false; // an unpaid attempt left on the portal locks the vehicle in this state → clear it later
    let paid = false;
    let interrupted = false;
    try {
      page = await newPage({ stateCd: req.stateCd, sid: id }); // inside try: a dead browser fails the filing instead of leaving the driver on a spinner
      logger.info({ id, stateCd: req.stateCd }, 'border tax filing started'); // step timings = log time deltas from here
      const io = makeIo(id, conn);
      const result = await flow(page, toJob(req), io);
      // in-app QR only: a bank-page hand-off let drivers pay outside the app → pending/mismatch locks
      if (!result.payPage) throw portalError(F.NO_QR, 'no in-app QR page (bank hand-off is off)');
      atBank = true;
      paid = await collect(id, req, result, io);
    } catch (err) {
      // shutdown closed the browser under this filing (deploy restart): the boot sweep fails it as worker_restart (clear retry message, not portal_error)
      if (isStopping()) return void (interrupted = true, logger.info({ id, err: err.message }, 'border tax filing interrupted by shutdown'));
      const failureCode = err.failureCode || F.PORTAL_ERROR;
      logger.warn({ id, failureCode, err: err.message }, 'border tax filing stopped');
      if (ALERT_ON.has(failureCode) && err.message !== STOPPED) alert(`${req.stateCd} filing ${id.slice(0, 8)} failed: ${failureCode} (${err.message.slice(0, 200)})`);
      await service.fail(id, failureCode);
      if (failureCode === F.VEHICLE_PENDING) await followUnlock(id, req).catch((e) => logger.warn({ id, err: e.message }, 'follow unlock failed'));
      const downSite = { [F.PORTAL_DOWN]: BORDER_TAX.PORTAL_KEY, [F.BANK_DOWN]: req.stateCd }[failureCode]; // pushed when the watcher sees it back
      if (downSite) await repo.waitForUp(downSite, req.userId).catch((e) => logger.warn({ id, err: e.message }, 'wait-for-up failed'));
      atBank ||= BANK_STEP.has(failureCode) || Boolean(err.atBank);
    } finally {
      if (atBank && !interrupted) await logPayEvents(id, paid).catch((e) => logger.warn({ id, err: e.message }, 'pay events log failed'));
      if (atBank && !paid && !interrupted) await service.scheduleUnlock(id).catch((e) => logger.warn({ id, err: e.message }, 'unlock schedule failed'));
      await page?.context().close().catch((e) => logger.warn({ id, err: e.message }, 'context close failed'));
    }
  }

  /**
   * vehicle_pending behind our own earlier attempt whose clear is already scheduled: this filing clears just
   * after it, so the app shows the real time ("free at 6:57") instead of "about 30 min" — the 2026-11-20 HP
   * driver retried 3x in 13 min. Same as the driver tapping "Clear lock" at the right moment.
   */
  async function followUnlock(id, req) {
    const since = new Date(Date.now() - 2 * BORDER_TAX.UNLOCK_AFTER_SEC * 1000);
    for (const other of await repo.recentForVehicle(req.vehicleNo, req.stateCd, since)) {
      const u = other !== id && (await repo.getUnlock(other));
      if (u && [U.WAITING, U.QUEUED].includes(u.status)) return service.scheduleUnlock(id, Math.max(Number(u.at), Date.now()) + 60_000);
    }
  }

  /**
   * Clears the pending-transaction lock(s) on a filing's vehicle in its state. A pending attempt that was
   * actually paid gives its receipt: this filing's own (same amount, not yet PAID) → the filing becomes PAID.
   * @param {string} id - filing id (scheduled by scheduleUnlock)
   */
  async function unlock(id) {
    const req = await repo.findById(id);
    if (!req) return;
    // filings go first: a clear never waits for (or takes) the slot while a filing is queued — it used to
    // restart a waiting driver's 2-min countdown (2026-11-13). ponytail: retried every UNLOCK_DEFER_SEC
    if ((await repo.countByStatus([S.QUEUED])) || (await repo.takeLookupSlot(BORDER_TAX.LOOKUP_GAP_SEC)) > 0) {
      return void (await repo.scheduleUnlock(id, Date.now() + BORDER_TAX.UNLOCK_DEFER_SEC * 1000));
    }
    let page = null;
    try {
      page = await newPage();
      const log = (m) => logger.info({ id }, m);
      const { rows, retryAt } = await clearLocks(page.context(), req, log);
      const paidRow = rows.find((r) => r.result === 'paid');
      const unknown = rows.find((r) => r.result === 'unknown');
      if (unknown) alert(`${req.stateCd} unlock ${id.slice(0, 8)}: unexpected portal answer (${unknown.note})`);
      if (paidRow) {
        const own = req.status !== S.PAID && req.taxPaise && Math.round(Number(paidRow.amount) * 100) === req.taxPaise;
        if (own && (await service.latePaid(id, { receiptNo: paidRow.receiptNo, receiptKey: await storeReceipt(id, paidRow.pdf) }))) {
          log('late payment found → paid');
          await onLatePaid(req).catch((err) => logger.warn({ id, err: err.message }, 'late-paid push failed')); // the app banner still shows it
        }
        // not own = paid outside this filing (HR 94275939 2026-11-15: no EaseCab filing made that attempt) — FYI only
        alert(`${req.stateCd} unlock ${id.slice(0, 8)}: pending attempt was PAID (${paidRow.receiptNo}${own ? ', this filing → marked paid' : ', not this filing — FYI, vehicle free'})`);
      }
      // nothing pending after a QR timeout = the attempt went through: find its receipt (same Tax From + amount)
      if (!rows.length && !retryAt && MAYBE_PAID.has(req.failureCode) && req.status !== S.PAID && req.taxPaise) {
        const late = await lookup(page.context(), { stateCd: req.stateCd, vehicleNo: req.vehicleNo, taxFrom: req.taxFrom, amountPaise: req.taxPaise }, log, sleep);
        if (late && (await service.latePaid(id, { receiptNo: late.receiptNo, receiptKey: await storeReceipt(id, late.pdf) }))) {
          log(`late payment found by receipt lookup → paid (${late.receiptNo})`);
          await onLatePaid(req).catch((err) => logger.warn({ id, err: err.message }, 'late-paid push failed'));
          alert(`${req.stateCd} unlock ${id.slice(0, 8)}: no pending row, receipt ${late.receiptNo} found → marked paid`);
          return void (await service.unlockDone(id, { receiptNo: late.receiptNo }));
        }
      }
      // bank PENDING: treasury never answered Vahan → ask again later; UNLOCK_TRIES of these → FAILED + alert
      if (!unknown && !paidRow && rows.some((r) => r.result === 'bank_pending')) {
        if (!(await service.unlockFailed(id, BORDER_TAX.UNLOCK_BANK_PENDING_SEC))) alert(`${req.stateCd} unlock ${id.slice(0, 8)} gave up: bank still PENDING`);
        return;
      }
      // unknown: never re-tapped (it may be a paid row whose receipt didn't load) — ops checks it
      await service.unlockDone(id, { retryAt, receiptNo: paidRow?.receiptNo, failed: Boolean(unknown) });
      if (!retryAt && !unknown && !paidRow) await onFreed(req).catch((err) => logger.warn({ id, err: err.message }, 'freed push failed'));
    } catch (err) {
      logger.warn({ id, err: err.message }, 'border tax unlock failed');
      if (!(await service.unlockFailed(id))) alert(`${req.stateCd} unlock ${id.slice(0, 8)} gave up: ${err.message.slice(0, 200)}`);
    } finally {
      await page?.context().close().catch((e) => logger.warn({ id, err: e.message }, 'context close failed'));
    }
  }

  return { run, unlock };
}

module.exports = { createRunner, toJob };

'use strict';

const { BORDER_TAX, BORDER_TAX_STATUS: S, BORDER_TAX_FAILURE: F } = require('@easecab/shared');
const { portalError } = require('./flows/portal');
const { fileCheckpost } = require('./flows/checkpostv4');
const { openQr, awaitPaid } = require('./flows/payuQr');
const { openSbiQr, awaitSbiPaid } = require('./flows/sbiQr');
const { lookupReceipt } = require('./flows/receiptLookup');

// All use the shared checkpostv4 portal; a state without a flow fails fast.
const FLOWS = Object.freeze({ HR: fileCheckpost, HP: fileCheckpost, UP: fileCheckpost, RJ: fileCheckpost, UK: fileCheckpost });
const DAY_MS = 86_400_000;

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
 * @param {() => Promise<import('playwright').Page>} deps.newPage - fresh context per job
 * @param {import('pino').Logger} deps.logger
 * @param {{ putObject: Function }} deps.r2 - receipt PDFs
 * @param {Record<string, Function>} [deps.flows]
 * @param {(ms: number) => Promise<void>} [deps.sleep]
 */
function createRunner({ service, repo, newPage, logger, r2, flows = FLOWS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const until = (sec) => String(Date.now() + sec * 1000);

  function makeIo(id, conn) {
    const moveOrStop = async (to) => {
      if (!(await service.move(id, to))) throw portalError(F.PORTAL_ERROR, 'filing no longer active');
    };
    return {
      log: (m) => logger.info({ id }, m),
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

  /** In-app QR: show the bank's QR (HR/HP PayU, UP SBIePay), wait for the driver's payment, fetch the receipt. */
  async function collect(id, req, { payPage, ref, pay, ...quote }, io) {
    const { qr, upi, secLeft } = pay.sbi ? await openSbiQr(payPage, io) : await openQr(payPage, io);
    if (!(await service.awaitPayment(id, { ...quote, qr, upi, deadline: until(secLeft ?? BORDER_TAX.PAY_WAIT_SEC) }))) return;
    const { receiptNo, pdf } = pay.sbi ? await awaitSbiPaid(payPage, io, secLeft) : await awaitPaid(payPage, io, pay.back);
    const receiptKey = await storeReceipt(id, pdf);
    const grn = ref?.grn || null;
    const fetching = !receiptKey && Boolean(receiptNo || grn);
    await service.paid(id, { receiptNo, receiptKey, paidAt: new Date(), fetching });
    if (!fetching) return;
    // paid is already recorded; a late lookup only adds the receipt (Print Payment Receipt, never Check Status)
    const late = await lookupReceipt(payPage.context(), { stateCd: req.stateCd, vehicleNo: req.vehicleNo, receiptNo, grn }, io.log, sleep);
    if (late) io.log(`receipt ${late.receiptNo} (lookup)`);
    await service.attachReceipt(id, { receiptNo: late?.receiptNo, receiptKey: await storeReceipt(id, late?.pdf) });
  }

  /** @param {string} id @param {import('ioredis').Redis} conn */
  async function run(id, conn) {
    await waitLookupSlot(); // stays QUEUED while waiting — the driver can still cancel
    if (!(await service.move(id, S.FILLING))) return; // cancelled, or a duplicate queue entry
    const req = await repo.findById(id);
    const flow = flows[req.stateCd];
    if (!flow) return void (await service.fail(id, F.STATE_UNSUPPORTED));
    let page = null;
    try {
      page = await newPage(); // inside try: a dead browser fails the filing instead of leaving the driver on a spinner
      await repo.setJob(id, { step: 'filling', started: String(Date.now()) }); // the app's timer starts here, not at queueing
      logger.info({ id, stateCd: req.stateCd }, 'border tax filing started'); // step timings = log time deltas from here
      const io = makeIo(id, conn);
      const result = await flow(page, toJob(req), io);
      if (result.payPage) await collect(id, req, result, io);
      else await service.handOff(id, result);
    } catch (err) {
      const failureCode = err.failureCode || F.PORTAL_ERROR;
      logger.warn({ id, failureCode, err: err.message }, 'border tax filing stopped');
      await service.fail(id, failureCode);
    } finally {
      await page?.context().close().catch((e) => logger.warn({ id, err: e.message }, 'context close failed'));
    }
  }

  return { run };
}

module.exports = { createRunner, toJob };

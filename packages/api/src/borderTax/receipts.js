'use strict';

const { BORDER_TAX, BORDER_TAX_STATUS: S } = require('@easecab/shared');

/**
 * Receipt storage for the runner.
 * @param {{ r2: { putObject: Function }, logger: import('pino').Logger, service: object }} deps
 */
function createReceipts({ r2, logger, service }) {
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

  /** A receipt found later: attached to a PAID filing that had none, else a failed/expired one becomes PAID. */
  async function recordReceipt(id, req, { receiptNo, pdf }) {
    const receiptKey = await storeReceipt(id, pdf);
    if (req.status === S.PAID) return Boolean(await service.attachReceipt(id, { receiptNo, receiptKey }));
    return Boolean(await service.latePaid(id, { receiptNo, receiptKey }));
  }

  return { storeReceipt, recordReceipt };
}

module.exports = { createReceipts };

'use strict';

const { BORDER_TAX } = require('@easecab/shared');

/**
 * Deletes receipt PDFs from R2 RECEIPT_KEEP_SEC after the tax validity ends (user, 2026-11-12: the
 * driver saves it to the phone; keeps R2 inside the free tier). The row keeps receiptNo for history;
 * receiptKey → null, so the receipt endpoint answers 404 and the app shows "deleted".
 * @param {{ repo: { expiredReceipts: Function, clearReceiptKey: Function }, r2: { deleteObject: Function }, logger: import('pino').Logger, now?: Date }} deps
 * @returns {Promise<number>} receipts deleted
 */
async function sweepReceipts({ repo, r2, logger, now = new Date() }) {
  const before = new Date(now.getTime() - BORDER_TAX.RECEIPT_KEEP_SEC * 1000);
  const rows = await repo.expiredReceipts(before, BORDER_TAX.RECEIPT_SWEEP_BATCH);
  for (const { id, receiptKey } of rows) {
    await r2.deleteObject({ key: receiptKey }); // throws → row untouched, next sweep retries it
    await repo.clearReceiptKey(id);
  }
  if (rows.length) logger.info({ deleted: rows.length }, 'border tax receipts deleted');
  return rows.length;
}

module.exports = { sweepReceipts };

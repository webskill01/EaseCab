'use strict';

const { BORDER_TAX } = require('@easecab/shared');

/**
 * Driver needed (QR / amount / captcha) but the app isn't polling this filing (backed out of the screen, left
 * the app): one push NUDGE_AFTER_SEC in, if the filing still waits at `step`. Fire-and-forget.
 * @param {{ repo: { getJob: Function }, logger: import('pino').Logger, onAction: (req: object, kind: string) => Promise<void> }} deps
 */
function createNudge({ repo, logger, onAction }) {
  return function nudge(req, step, kind) {
    setTimeout(async () => {
      try {
        const job = await repo.getJob(req.id);
        if (job.step !== step || Date.now() - Number(job.seen || 0) < BORDER_TAX.SEEN_FRESH_SEC * 1000) return;
        await onAction(req, kind);
        logger.info({ id: req.id, kind }, 'driver not on the filing: pushed');
      } catch (err) {
        logger.warn({ id: req.id, err: err.message }, 'nudge failed');
      }
    }, BORDER_TAX.NUDGE_AFTER_SEC * 1000).unref?.();
  };
}

module.exports = { createNudge };

'use strict';

const { BORDER_TAX } = require('@easecab/shared');

/**
 * Driver needed (QR / amount / captcha) but the app isn't polling this filing (backed out of the screen, left
 * the app): one push once the app stops polling, checked from NUDGE_AFTER_SEC in and every NUDGE_EVERY_SEC
 * while the filing still waits at `step` (was one check: dfc6ad8d / 1219edf1 2026-11-24 left 13 s into the
 * amount, after it, and got no push). Fire-and-forget.
 * @param {{ repo: { getJob: Function }, logger: import('pino').Logger, onAction: (req: object, kind: string) => Promise<void> }} deps
 */
function createNudge({ repo, logger, onAction }) {
  return function nudge(req, step, kind) {
    const later = (sec) => setTimeout(check, sec * 1000).unref?.();
    async function check() {
      try {
        const job = await repo.getJob(req.id);
        if (job.step !== step) return; // answered / moved on / ended
        if (Date.now() - Number(job.seen || 0) < BORDER_TAX.SEEN_FRESH_SEC * 1000) return later(BORDER_TAX.NUDGE_EVERY_SEC);
        await onAction(req, kind);
        logger.info({ id: req.id, kind }, 'driver not on the filing: pushed');
      } catch (err) {
        logger.warn({ id: req.id, err: err.message }, 'nudge failed');
      }
    }
    later(BORDER_TAX.NUDGE_AFTER_SEC);
  };
}

module.exports = { createNudge };

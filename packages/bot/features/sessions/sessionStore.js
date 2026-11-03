'use strict';

/**
 * Which WhatsApp sessions (number slots) the bot runs (Phase 25), backed by
 * wa_sessions and managed from the admin Sessions tab. Hot-reloads on
 * BOT_SESSIONS_CHANGED_CHANNEL. On the very first start (empty table) the env
 * WA_NUMBERS slots are seeded so an existing paired slot-1 keeps running.
 *
 * @param {{ prisma: object, logger: { info: Function, warn: Function }, seedSlots: string[] }} deps
 * @returns {{ start: Function, reload: Function, enabledSlots: () => string[], knownSlots: () => Set<string>, notePhone: Function }}
 */
function createSessionStore({ prisma, logger, seedSlots }) {
  let enabled = [];
  let known = new Set();
  const phones = new Map(); // slot -> phone as stored (avoid redundant writes)

  async function load() {
    const rows = await prisma.waSession.findMany({
      select: { slot: true, enabled: true, phone: true },
      orderBy: { createdAt: 'asc' },
    });
    const removed = [...known].filter((s) => !rows.some((r) => r.slot === s));
    enabled = rows.filter((r) => r.enabled).map((r) => r.slot);
    known = new Set(rows.map((r) => r.slot));
    for (const r of rows) phones.set(r.slot, r.phone);
    logger.info({ sessions: rows.length, enabled: enabled.length }, 'wa sessions loaded');
    return { removed };
  }

  return {
    /** Startup: seed from env once, then load. A failure exits the process (never run blind). */
    async start() {
      if ((await prisma.waSession.count()) === 0 && seedSlots.length) {
        await prisma.waSession.createMany({
          data: seedSlots.map((slot) => ({ slot, name: slot })),
          skipDuplicates: true,
        });
        logger.info({ slots: seedSlots.length }, 'wa sessions seeded from WA_NUMBERS');
      }
      await load();
    },

    /**
     * Hot reload. Returns the slots deleted since the last good load; a failed read
     * keeps the previous state and reports nothing removed (never mass-remove on a blip).
     * @returns {Promise<{ removed: string[] }>}
     */
    async reload() {
      try {
        return await load();
      } catch (err) {
        logger.warn({ err: err.message }, 'wa sessions reload failed; keeping previous state');
        return { removed: [] };
      }
    },

    enabledSlots: () => enabled,
    knownSlots: () => known,

    /**
     * Record the linked number for a slot (after pairing, or first open of an old slot).
     * @param {string} slot
     * @param {?string} phone
     * @param {boolean} [paired] - also stamp pairedAt (fresh pairing)
     */
    async notePhone(slot, phone, paired = false) {
      if (!phone || (!paired && phones.get(slot) === phone)) return;
      try {
        await prisma.waSession.updateMany({
          where: { slot },
          data: { phone, ...(paired ? { pairedAt: new Date() } : {}) },
        });
        phones.set(slot, phone);
      } catch (err) {
        logger.warn({ err: err.message, slot }, 'could not store session phone');
      }
    },
  };
}

module.exports = { createSessionStore };

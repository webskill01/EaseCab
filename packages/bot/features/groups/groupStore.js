'use strict';

const GROUP_JID_SUFFIX = '@g.us';

/**
 * Baileys GroupMetadata → the fields we store.
 * @param {{ id: string, subject?: string, participants?: unknown[] }} meta
 * @returns {{ jid: string, name: string|null, participants: number|null }}
 */
function toGroupRecord(meta) {
  return {
    jid: meta.id,
    name: meta.subject || null,
    participants: Array.isArray(meta.participants) ? meta.participants.length : null,
  };
}

/**
 * Which WhatsApp groups the bot ingests (Phase 18), backed by wa_groups. Default
 * ON: any group chat is read unless an admin switched it off, so a group the
 * number just joined is read before it is even recorded. Hot-reloads on
 * BOT_GROUPS_CHANGED_CHANNEL like the filter store.
 *
 * @param {{ prisma: object, logger: { info: Function, warn: Function } }} deps
 * @returns {{ start: () => Promise<void>, reload: () => Promise<void>, shouldIngest: (jid: string) => boolean, nameOf: (jid: string) => string|undefined, namelessJids: () => string[], record: (groups: object[]) => Promise<void> }}
 */
function createGroupStore({ prisma, logger }) {
  let disabled = new Set();
  const names = new Map();
  const known = new Set(); // every group jid seen (DB or WhatsApp)

  async function load() {
    const rows = await prisma.waGroup.findMany({ select: { jid: true, name: true, enabled: true } });
    disabled = new Set(rows.filter((r) => !r.enabled).map((r) => r.jid));
    for (const r of rows) {
      known.add(r.jid);
      if (r.name) names.set(r.jid, r.name);
    }
    logger.info({ groups: rows.length, off: disabled.size }, 'wa groups loaded');
  }

  return {
    // Startup: a failure propagates so the process exits rather than ingesting blind.
    start: load,
    // Hot reload: a failure keeps the last good on/off state.
    async reload() {
      try {
        await load();
      } catch (err) {
        logger.warn({ err: err.message }, 'wa groups reload failed; keeping previous state');
      }
    },

    shouldIngest(jid) {
      return typeof jid === 'string' && jid.endsWith(GROUP_JID_SUFFIX) && !disabled.has(jid);
    },

    nameOf: (jid) => names.get(jid),

    /** Enabled groups we still have no name for (the bulk fetch often returns no subject). */
    namelessJids: () => [...known].filter((jid) => !names.has(jid) && !disabled.has(jid)),

    /**
     * Upsert groups the bot sees (connect / join). Never touches `enabled`, so an
     * admin's switch survives reconnects, and never blanks a stored name: WhatsApp
     * often returns an empty subject for large accounts. One failing row doesn't stop the rest.
     * ponytail: one upsert per group (~300 on connect); batch if groups reach thousands.
     */
    async record(groups) {
      for (const { jid, name, participants } of groups) {
        known.add(jid);
        if (name) names.set(jid, name);
        try {
          await prisma.waGroup.upsert({
            where: { jid },
            create: { jid, name, participants },
            update: {
              lastSeenAt: new Date(),
              ...(name ? { name } : {}),
              ...(participants === null || participants === undefined ? {} : { participants }),
            },
          });
        } catch (err) {
          logger.warn({ err: err.message }, 'wa group upsert failed');
        }
      }
    },
  };
}

module.exports = { createGroupStore, toGroupRecord };

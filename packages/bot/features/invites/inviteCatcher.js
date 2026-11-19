'use strict';

const { WA_INVITES, WA_INVITE_STATUS, extractInviteCodes } = require('@easecab/shared');

// WhatsApp's answer for a revoked / expired / unknown invite (Boom status codes).
const GONE_CODES = new Set([401, 404, 406, 410]);

/**
 * Group-link catcher (Phase 29). Every group message on every session goes through
 * `see`; chat.whatsapp.com invite codes are upserted once into wa_invite_links (a
 * re-sighting only bumps seenCount, at most once per RESEEN_WINDOW_MS per code). A NEW
 * code is previewed with groupGetInviteInfo — an IQ query, nothing is sent to any chat —
 * on the socket that saw it, one at a time RESOLVE_GAP_MS apart, to learn the group's
 * name, size and jid. A jid one of our sessions is already in → joined straight away.
 *
 * @param {{ prisma: object, logger: { info: Function, warn: Function }, isKnownGroup: (jid: string) => boolean }} deps
 */
function createInviteCatcher({ prisma, logger, isKnownGroup }) {
  const seenAt = new Map(); // code → ms of the last DB write
  const queue = [];
  let draining = false;

  function fresh(code, now) {
    const last = seenAt.get(code);
    if (last && now - last < WA_INVITES.RESEEN_WINDOW_MS) return false;
    if (seenAt.size >= WA_INVITES.SEEN_CACHE_MAX) seenAt.clear(); // ponytail: crude cap, the DB still dedups
    seenAt.set(code, now);
    return true;
  }

  async function resolve(code, sock) {
    try {
      const info = await sock.groupGetInviteInfo(code);
      const joined = info && info.id && isKnownGroup(info.id);
      await prisma.waInviteLink.updateMany({
        where: { code },
        data: {
          groupJid: info?.id || null, name: info?.subject ? info.subject.replaceAll('\u0000', '') : null,
          size: Number.isInteger(info?.size) ? info.size : null, resolvedAt: new Date(),
          ...(joined ? { status: WA_INVITE_STATUS.JOINED } : {}),
        },
      });
    } catch (err) {
      // Baileys puts WhatsApp's IQ error code in err.data; Boom's output.statusCode is then a default 500.
      const code = Number(err?.data ?? err?.output?.statusCode);
      if (!GONE_CODES.has(code)) return logger.warn({ err: err.message, code }, 'invite preview failed; left unresolved');
      await prisma.waInviteLink.updateMany({ where: { code }, data: { status: WA_INVITE_STATUS.INVALID, resolvedAt: new Date() } })
        .catch((e) => logger.warn({ err: e.message }, 'could not mark invite invalid'));
    }
  }

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length) {
        const { code, sock } = queue.shift();
        if (sock.user) await resolve(code, sock); // that session went away → stays unresolved
        await new Promise((r) => setTimeout(r, WA_INVITES.RESOLVE_GAP_MS).unref?.());
      }
    } finally {
      draining = false;
    }
  }

  /** Upsert one code; queue a preview while it is still unresolved (new row, or an earlier preview failed). */
  async function record(code, groupId, sock, now) {
    const at = new Date(now);
    const row = await prisma.waInviteLink.upsert({
      where: { code },
      create: { code, sourceGroupJid: groupId, firstSeenAt: at, lastSeenAt: at },
      update: { seenCount: { increment: 1 }, lastSeenAt: at },
      select: { status: true, resolvedAt: true },
    });
    // ponytail: retry rides on re-sightings (≤ once per RESEEN_WINDOW_MS per code), no retry timer
    if (!row.resolvedAt && row.status === WA_INVITE_STATUS.NEW && sock && queue.length < WA_INVITES.RESOLVE_QUEUE_MAX) {
      queue.push({ code, sock });
      drain().catch((err) => logger.warn({ err: err.message }, 'invite preview queue failed'));
    }
  }

  return {
    /**
     * Catch invite links in one group message. Never throws (the message listener must survive).
     * @param {string} text @param {string} groupId @param {object} [sock] the session's socket
     */
    async see(text, groupId, sock) {
      if (!text || !text.includes('chat.whatsapp.com')) return;
      const now = Date.now();
      for (const code of extractInviteCodes(text)) {
        if (!fresh(code, now)) continue;
        try {
          await record(code, groupId, sock, now);
        } catch (err) {
          logger.warn({ err: err.message }, 'could not record invite link');
        }
      }
    },

    /**
     * A session is (now) in these groups → their links are joined. Avoided ones stay avoided.
     * @param {string[]} jids
     */
    async markJoined(jids) {
      if (!jids.length) return;
      try {
        await prisma.waInviteLink.updateMany({
          where: { groupJid: { in: jids }, status: { in: [WA_INVITE_STATUS.NEW, WA_INVITE_STATUS.INVALID] } },
          data: { status: WA_INVITE_STATUS.JOINED },
        });
      } catch (err) {
        logger.warn({ err: err.message }, 'could not mark invite links joined');
      }
    },
  };
}

module.exports = { createInviteCatcher };

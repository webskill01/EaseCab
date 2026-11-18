'use strict';

const { AppError, ERROR_CODES, BOT_GROUPS_CHANGED_CHANNEL, WA_GROUP_STATUS } = require('@easecab/shared');
const { createGroupMembership } = require('./waGroupMembership');

/**
 * Admin WhatsApp-groups business logic (Phase 18). Each row carries the bot sessions
 * in that group; status `shared` = groups 2+ sessions are in (Phase 29). Every switch publishes on
 * BOT_GROUPS_CHANGED_CHANNEL so easecab-bot starts/stops reading the group within
 * seconds (it also reloads every 5 min as a backstop).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminWaGroups.repository').createAdminWaGroupsRepository>} deps.repo
 * @param {import('ioredis').Redis} deps.redis
 * @param {{ warn: Function }} deps.logger
 */
function createAdminWaGroupsService({ repo, redis, logger }) {
  async function notifyBot() {
    try {
      await redis.publish(BOT_GROUPS_CHANGED_CHANNEL, 'changed');
    } catch (err) {
      logger.warn({ err: err.message }, 'wa groups publish failed; bot picks it up on its next refresh');
    }
  }

  return {
    /** Offset page of groups + how many are on/off overall. */
    async list({ page, limit, q, status }) {
      const members = createGroupMembership({ redis, sessions: await repo.sessions() });
      const jids = status === WA_GROUP_STATUS.SHARED ? await members.shared() : undefined;
      const { rows, total, on, off } = await repo.list({ page, limit, q, status, jids });
      const inSessions = await members.of(rows.map((r) => r.jid));
      const items = rows.map((r) => ({ ...r, sessions: inSessions.get(r.jid) }));
      return { items, total, page, limit, counts: { on, off } };
    },

    /** Switch one group's ingest and/or direct-duty routing. NOT_FOUND if the id is unknown. */
    async toggle(id, patch) {
      const group = await repo.update(id, patch);
      if (!group) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      await notifyBot();
      return group;
    },

    /** Switch every group, or every group matching `q`. */
    async bulk({ enabled, q }) {
      const updated = await repo.setEnabledMany({ enabled, q });
      if (updated > 0) await notifyBot();
      return { updated };
    },
  };
}

module.exports = { createAdminWaGroupsService };

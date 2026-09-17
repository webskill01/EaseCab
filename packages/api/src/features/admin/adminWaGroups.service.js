'use strict';

const { AppError, ERROR_CODES, BOT_GROUPS_CHANGED_CHANNEL } = require('@easecab/shared');

/**
 * Admin WhatsApp-groups business logic (Phase 18). Every switch publishes on
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
      const { rows, total, on, off } = await repo.list({ page, limit, q, status });
      return { items: rows, total, page, limit, counts: { on, off } };
    },

    /** Switch one group's ingest. NOT_FOUND if the id is unknown. */
    async toggle(id, enabled) {
      const group = await repo.setEnabled(id, enabled);
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

'use strict';

const { AppError, ERROR_CODES, WA_INVITES } = require('@easecab/shared');
const { createGroupMembership } = require('./waGroupMembership');

/**
 * Caught group links (Phase 29): each row gets its join URL, the name of the group it
 * was first shared in, and which bot sessions are already in the linked group.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminWaInvites.repository').createAdminWaInvitesRepository>} deps.repo
 * @param {ReturnType<import('./adminWaGroups.repository').createAdminWaGroupsRepository>} deps.groupsRepo
 * @param {import('ioredis').Redis} deps.redis
 */
function createAdminWaInvitesService({ repo, groupsRepo, redis }) {
  return {
    async list({ page, limit, q, status }) {
      const { rows, total, counts } = await repo.list({ page, limit, q, status });
      const sources = [...new Set(rows.map((r) => r.sourceGroupJid).filter(Boolean))];
      const names = new Map((await groupsRepo.namesByJid(sources)).map((g) => [g.jid, g.name]));
      const members = createGroupMembership({ redis, sessions: await groupsRepo.sessions() });
      const inSessions = await members.of([...new Set(rows.map((r) => r.groupJid).filter(Boolean))]);
      const items = rows.map((r) => ({
        ...r,
        url: `${WA_INVITES.URL_PREFIX}${r.code}`,
        sourceGroupName: names.get(r.sourceGroupJid) || null,
        sessions: (r.groupJid && inSessions.get(r.groupJid)) || [],
      }));
      return { items, total, page, limit, counts };
    },

    /** Avoid a link or restore it to new. NOT_FOUND if the id is unknown. */
    async setStatus(id, status) {
      const link = await repo.setStatus(id, status);
      if (!link) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      return link;
    },
  };
}

module.exports = { createAdminWaInvitesService };

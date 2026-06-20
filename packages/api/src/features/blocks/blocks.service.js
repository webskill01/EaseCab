'use strict';

const { AppError, ERROR_CODES } = require('@easecab/shared');

/**
 * Blocks business logic (CLAUDE.md §4). Blocking is chat-scoped for now: it stops a
 * chat being opened or messaged between the two users, both ways (enforced in the
 * chat service). Feed/contact filtering is intentionally out of scope (see PROGRESS).
 *
 * @param {object} deps
 * @param {ReturnType<import('./blocks.repository').createBlocksRepository>} deps.repo
 */
function createBlocksService({ repo }) {
  return {
    /** Block a user. Self-block is rejected; a repeat block is idempotent. */
    async blockUser(blockerId, { blockedId }) {
      if (blockerId === blockedId) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR, 'cannot block yourself');
      }
      const row = await repo.createBlock({ blockerId, blockedId });
      return { id: row.id, blockedId, createdAt: row.createdAt };
    },
  };
}

module.exports = { createBlocksService };

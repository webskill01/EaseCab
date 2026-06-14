'use strict';

const express = require('express');
const { adminUsersQuerySchema, adminUserActionSchema, adminUserIdParamSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/users (Step 24d). Gated by requireAdmin (admin JWT cookie →
 * req.admin; never reads the users table for auth — §6). Offset pagination (§8).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminUsers.service').createAdminUsersService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminUsersRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  // Searchable user directory (status filter + optional q).
  router.get('/', validate(adminUsersQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total } = await service.list(req.valid.query);
    sendSuccess(res, { data: { users: items }, meta: { page, limit, total } });
  });

  // Soft-delete or restore (flag only).
  router.patch(
    '/:userId',
    validate(adminUserIdParamSchema, 'params'),
    validate(adminUserActionSchema),
    async (req, res) => {
      const user = await service.setStatus(req.valid.params.userId, req.valid.body);
      sendSuccess(res, { data: { user } });
    },
  );

  return router;
}

module.exports = { createAdminUsersRouter };

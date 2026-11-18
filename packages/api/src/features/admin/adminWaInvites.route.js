'use strict';

const express = require('express');
const { adminWaInvitesQuerySchema, adminWaInvitePatchSchema, adminWaGroupIdParamSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/wa-invites (Phase 29). Gated by requireAdmin. Lists the group
 * links easecab-bot caught and lets the admin avoid / restore them.
 *
 * @param {{ service: ReturnType<import('./adminWaInvites.service').createAdminWaInvitesService>, requireAdmin: import('express').RequestHandler }} deps
 * @returns {import('express').Router}
 */
function createAdminWaInvitesRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', validate(adminWaInvitesQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total, counts } = await service.list(req.valid.query);
    sendSuccess(res, { data: { links: items, counts }, meta: { page, limit, total } });
  });

  router.patch('/:id', validate(adminWaGroupIdParamSchema, 'params'), validate(adminWaInvitePatchSchema), async (req, res) => {
    sendSuccess(res, { data: { link: await service.setStatus(req.valid.params.id, req.valid.body.status) } });
  });

  return router;
}

module.exports = { createAdminWaInvitesRouter };

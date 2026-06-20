'use strict';

const { z } = require('zod');

/** Public-user route param: GET /api/v1/users/:id/profile (T3-2 poster profile). */
const userIdParamSchema = z.object({ id: z.string().uuid() });

module.exports = { userIdParamSchema };

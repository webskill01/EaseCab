'use strict';

const crypto = require('node:crypto');
const { AppError, ERROR_CODES, UPLOAD_PURPOSE, UPLOAD_MIME_EXT, UPLOAD_TIER } = require('@easecab/shared');

/**
 * Upload issuance + the persistence-time verify gate (Step 21a). Depends only on
 * the injected R2 boundary (`r2`). Builds server-controlled, user-namespaced keys
 * so a client can never write outside its own prefix. `verifyUpload` is the gate
 * 21b/21c call before writing a key onto User/verification (re-checks owner, size,
 * MIME against the live object — never trusts the client).
 *
 * @param {object} deps
 * @param {{ presignPost: Function, headObject: Function, publicUrl: Function }} deps.r2
 */
function createUploadsService({ r2 }) {
  function policyFor(purpose) {
    const policy = UPLOAD_PURPOSE[purpose];
    if (!policy) throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR, 'unknown upload purpose');
    return policy;
  }

  /**
   * Issue a presigned POST for a new object. Key = `<prefix><userId>/<uuid>.<ext>`.
   * `stub` flags the demo/local R2 stub (no real bucket): the client uses it to skip
   * the direct-to-R2 byte POST, since the stub's `headObject` accepts the key anyway.
   * Always false against real R2 in production.
   * @returns {Promise<{ url: string, fields: object, key: string, publicUrl: string|null, stub: boolean }>}
   */
  async function presign({ userId, purpose, contentType }) {
    const policy = policyFor(purpose);
    const ext = UPLOAD_MIME_EXT[contentType];
    if (!ext) throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR, 'unsupported content type');
    const key = `${policy.keyPrefix}${userId}/${crypto.randomUUID()}.${ext}`;
    const { url, fields } = await r2.presignPost({ key, contentType, maxBytes: policy.maxBytes });
    return {
      url,
      fields,
      key,
      publicUrl: policy.tier === UPLOAD_TIER.PUBLIC ? r2.publicUrl(key) : null,
      stub: r2.isStub === true,
    };
  }

  /**
   * Verify a client-reported key actually landed and is within policy, and belongs
   * to the caller. Throws VALIDATION_ERROR on any breach. Returns the canonical
   * stored values for the consumer (21b) to persist.
   * @returns {Promise<{ key: string, publicUrl: string|null }>}
   */
  async function verifyUpload({ userId, purpose, key }) {
    const policy = policyFor(purpose);
    if (!key || !key.startsWith(`${policy.keyPrefix}${userId}/`)) {
      throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR, 'upload key does not belong to the caller');
    }
    const head = await r2.headObject({ key });
    if (!head || !head.exists) throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR, 'uploaded object not found');
    if (head.size > policy.maxBytes) throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR, 'uploaded object exceeds size limit');
    if (!policy.allowedMime.includes(head.contentType)) {
      throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR, 'uploaded object type is not allowed');
    }
    return { key, publicUrl: policy.tier === UPLOAD_TIER.PUBLIC ? r2.publicUrl(key) : null };
  }

  return { presign, verifyUpload };
}

module.exports = { createUploadsService };

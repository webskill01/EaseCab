'use strict';

/**
 * Upload-purpose policy (Step 21a). Each purpose maps to a sensitivity tier, an
 * R2 key prefix, a server-enforced size cap, and the MIME allow-list. PUBLIC tier
 * (DP, car) is served as a stable URL; PRIVATE tier (RC, licence) is served only
 * via short-lived presigned GET to owner/admin. Sizes mirror CLAUDE.md §6
 * (profile pics 5MB, KYC docs 10MB). No magic strings (§5).
 */
const UPLOAD_TIER = Object.freeze({ PUBLIC: 'public', PRIVATE: 'private' });

const UPLOAD_MIME_EXT = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
});

const IMAGE_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
const KYC_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MB = 1024 * 1024;

const UPLOAD_PURPOSE = Object.freeze({
  dp: Object.freeze({ tier: UPLOAD_TIER.PUBLIC, keyPrefix: 'dp/', maxBytes: 5 * MB, allowedMime: IMAGE_MIME }),
  car_front: Object.freeze({ tier: UPLOAD_TIER.PUBLIC, keyPrefix: 'car/', maxBytes: 5 * MB, allowedMime: IMAGE_MIME }),
  car_back: Object.freeze({ tier: UPLOAD_TIER.PUBLIC, keyPrefix: 'car/', maxBytes: 5 * MB, allowedMime: IMAGE_MIME }),
  rc_image: Object.freeze({ tier: UPLOAD_TIER.PRIVATE, keyPrefix: 'kyc/', maxBytes: 10 * MB, allowedMime: KYC_MIME }),
  licence_image: Object.freeze({ tier: UPLOAD_TIER.PRIVATE, keyPrefix: 'kyc/', maxBytes: 10 * MB, allowedMime: KYC_MIME }),
});

/** The ordered tuple of valid purposes — feeds the Zod enum (uploads.schema.js). */
const UPLOAD_PURPOSES = Object.freeze(Object.keys(UPLOAD_PURPOSE));

const UPLOAD = Object.freeze({
  PRESIGN_EXPIRY_SEC: 300, // presigned POST validity
  GET_EXPIRY_SEC: 300, // private-tier presigned GET validity
});

module.exports = { UPLOAD_TIER, UPLOAD_MIME_EXT, UPLOAD_PURPOSE, UPLOAD_PURPOSES, UPLOAD };

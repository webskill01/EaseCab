'use strict';

const { S3Client, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { UPLOAD } = require('@easecab/shared');

/**
 * THE Cloudflare R2 vendor boundary (mirrors lib/surepass.js). The uploads service
 * depends only on this normalized interface — never on the S3 wire shape — so a
 * provider/contract change replaces only this file. Live HTTP I/O is coverage-
 * excluded (.c8rc); unit tests inject a fake with the same shape.
 *
 * R2 is S3-compatible: region 'auto', endpoint <accountId>.r2.cloudflarestorage.com.
 * Uploads use presigned POST so the content-length-range + Content-Type CONDITIONS
 * are enforced at R2's edge (server-side size/MIME guarantee without proxying bytes).
 *
 * @param {{ accountId: string, accessKeyId: string, secretAccessKey: string,
 *   bucket: string, publicBaseUrl: string }} creds
 */
function createR2Client({ accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl }) {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return {
    async presignPost({ key, contentType, maxBytes }) {
      const { url, fields } = await createPresignedPost(client, {
        Bucket: bucket,
        Key: key,
        Conditions: [['content-length-range', 0, maxBytes], ['eq', '$Content-Type', contentType]],
        Fields: { 'Content-Type': contentType },
        Expires: UPLOAD.PRESIGN_EXPIRY_SEC,
      });
      return { url, fields };
    },
    async presignGet({ key, expiresIn = UPLOAD.GET_EXPIRY_SEC }) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
    },
    async headObject({ key }) {
      try {
        const r = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { exists: true, size: r.ContentLength, contentType: r.ContentType };
      } catch (err) {
        if (err && err.$metadata && err.$metadata.httpStatusCode === 404) return { exists: false };
        throw err;
      }
    },
    publicUrl(key) {
      return `${publicBaseUrl}/${key}`;
    },
  };
}

/**
 * Deterministic stub used until the R2 bucket exists (R2_STUB=true selects it in
 * server.js). Same interface, no network. Swapping to the real client at go-live is
 * an env change, zero code change.
 */
function createStubR2Client({ bucket = 'easecab-stub', publicBaseUrl = 'https://stub.r2.local' } = {}) {
  return {
    async presignPost({ key, contentType }) {
      return { url: `${publicBaseUrl}/${bucket}`, fields: { key, 'Content-Type': contentType, policy: 'stub' } };
    },
    async presignGet({ key }) {
      return `${publicBaseUrl}/${key}?sig=stub`;
    },
    async headObject() {
      return { exists: true, size: 1024, contentType: 'image/jpeg' };
    },
    publicUrl(key) {
      return `${publicBaseUrl}/${key}`;
    },
  };
}

module.exports = { createR2Client, createStubR2Client };

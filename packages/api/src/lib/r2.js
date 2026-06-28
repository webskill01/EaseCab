'use strict';

const { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { UPLOAD } = require('@easecab/shared');

/**
 * THE Cloudflare R2 vendor boundary (mirrors lib/surepass.js). The uploads service
 * depends only on this normalized interface — never on the S3 wire shape — so a
 * provider/contract change replaces only this file. Live HTTP I/O is coverage-
 * excluded (.c8rc); unit tests inject a fake with the same shape.
 *
 * R2 is S3-compatible: region 'auto', endpoint <accountId>.r2.cloudflarestorage.com.
 * Uploads use a presigned PUT (single signed URL, client does one PUT with the file
 * as the raw body + the matching Content-Type header). R2 does NOT implement S3 POST
 * Object (the presigned-POST form upload returns 501) — see Phase-14-2.
 *
 * The signed Content-Type binds the upload to that MIME. Size is NOT edge-enforced on
 * a plain PUT — it's enforced server-side at persistence time by uploads.service
 * `verifyUpload` (headObject re-check of size + MIME against the live object), which is
 * the gate that lets a key be attached at all. ponytail: an oversized blob can land in
 * R2 but is rejected by verifyUpload and never persisted; tighten with a per-user
 * quota only if storage spam shows up.
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
    // Real bucket exists → the browser PUTs the bytes straight to R2 (CLAUDE.md §12).
    isStub: false,
    async presignPut({ key, contentType }) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
        { expiresIn: UPLOAD.PRESIGN_EXPIRY_SEC },
      );
      return { url };
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
    // No bucket to POST to — the presign carries this so the client skips the upload
    // (the verify gate's headObject below returns exists:true, so the flow completes).
    isStub: true,
    async presignPut({ key }) {
      return { url: `${publicBaseUrl}/${bucket}/${key}` };
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

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createUploadsService } = require('../uploads.service');

function fakeR2(overrides = {}) {
  return {
    async presignPut({ key, contentType }) {
      return { url: `https://r2/put/${key}?ct=${encodeURIComponent(contentType)}` };
    },
    async headObject() { return { exists: true, size: 1024, contentType: 'image/jpeg' }; },
    publicUrl(key) { return `https://cdn.easecab.com/${key}`; },
    ...overrides,
  };
}

test('presign builds a user-namespaced key and returns the PUT url+publicUrl for a public purpose', async () => {
  const svc = createUploadsService({ r2: fakeR2() });
  const out = await svc.presign({ userId: 'u1', purpose: 'dp', contentType: 'image/jpeg' });
  assert.ok(out.key.startsWith('dp/u1/'));
  assert.match(out.key, /\.jpg$/);
  assert.equal(out.url, `https://r2/put/${out.key}?ct=image%2Fjpeg`);
  assert.equal(out.fields, undefined);
  assert.equal(out.publicUrl, `https://cdn.easecab.com/${out.key}`);
});

test('presign reports stub=false against a real R2 client (production: client must POST)', async () => {
  const svc = createUploadsService({ r2: fakeR2({ isStub: false }) });
  const out = await svc.presign({ userId: 'u1', purpose: 'dp', contentType: 'image/jpeg' });
  assert.equal(out.stub, false);
});

test('presign reports stub=true when the R2 boundary is the stub (client skips the byte POST)', async () => {
  const svc = createUploadsService({ r2: fakeR2({ isStub: true }) });
  const out = await svc.presign({ userId: 'u1', purpose: 'dp', contentType: 'image/jpeg' });
  assert.equal(out.stub, true);
});

test('presign returns publicUrl=null for a private purpose', async () => {
  const svc = createUploadsService({ r2: fakeR2() });
  const out = await svc.presign({ userId: 'u1', purpose: 'rc_image', contentType: 'application/pdf' });
  assert.ok(out.key.startsWith('kyc/u1/'));
  assert.match(out.key, /\.pdf$/);
  assert.equal(out.publicUrl, null);
});

test('verifyUpload rejects a key that is not the caller’s', async () => {
  const svc = createUploadsService({ r2: fakeR2() });
  await assert.rejects(
    svc.verifyUpload({ userId: 'u1', purpose: 'dp', key: 'dp/u2/abc.jpg' }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
});

test('verifyUpload rejects a missing object', async () => {
  const svc = createUploadsService({ r2: fakeR2({ async headObject() { return { exists: false }; } }) });
  await assert.rejects(
    svc.verifyUpload({ userId: 'u1', purpose: 'dp', key: 'dp/u1/abc.jpg' }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
});

test('verifyUpload rejects an object over the size cap', async () => {
  const big = 6 * 1024 * 1024;
  const svc = createUploadsService({ r2: fakeR2({ async headObject() { return { exists: true, size: big, contentType: 'image/jpeg' }; } }) });
  await assert.rejects(
    svc.verifyUpload({ userId: 'u1', purpose: 'dp', key: 'dp/u1/abc.jpg' }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
});

test('verifyUpload rejects a disallowed content type', async () => {
  const svc = createUploadsService({ r2: fakeR2({ async headObject() { return { exists: true, size: 1024, contentType: 'application/pdf' }; } }) });
  await assert.rejects(
    svc.verifyUpload({ userId: 'u1', purpose: 'dp', key: 'dp/u1/abc.jpg' }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
});

test('verifyUpload passes a valid public object and returns its publicUrl', async () => {
  const svc = createUploadsService({ r2: fakeR2() });
  const out = await svc.verifyUpload({ userId: 'u1', purpose: 'dp', key: 'dp/u1/abc.jpg' });
  assert.equal(out.key, 'dp/u1/abc.jpg');
  assert.equal(out.publicUrl, 'https://cdn.easecab.com/dp/u1/abc.jpg');
});

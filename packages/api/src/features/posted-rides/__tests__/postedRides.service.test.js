'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createPostedRidesService, toPublicPostedRide } = require('../postedRides.service');

/** assert.rejects validator: the thrown AppError carries the expected `.code`. */
const code = (expected) => (err) => {
  assert.equal(err.code, expected);
  return true;
};

const ACTIVE_SUB = { status: 'active', expiresAt: new Date(Date.now() + 86_400_000), trialExpiresAt: null };

function baseRepo(over = {}) {
  return {
    async getUserKycFlags() { return over.flags ?? { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false }; },
    async findExistingCityIds(ids) { return new Set(over.existing ?? ids); },
    async createPost(input) { return { id: 'p1', status: 'active', isClosed: false, createdAt: new Date(), ...input, phone: undefined }; },
    async listActivePosts() { return over.active ?? []; },
    async listMyPosts() { return over.mine ?? []; },
    async findContactTarget() { return over.target ?? null; },
    async findSubscriptionByUserId() { return over.sub ?? null; },
    async incrementContactCount() { return over.count ?? 1; },
    async recordContact() { return { contactedAt: new Date('2026-06-02T00:00:00.000Z') }; },
    async closePost() { return over.closeCount ?? 1; },
    async softDeletePost() { return over.delCount ?? 1; },
  };
}

test('createPost: throws VERIFICATION_REQUIRED when the user has no KYC doc', async () => {
  const svc = createPostedRidesService({ repo: baseRepo({ flags: { aadhaarVerified: false, dlSubmitted: false, rcSubmitted: false } }) });
  await assert.rejects(() => svc.createPost('u1', { fromCityRaw: 'a', toCityRaw: 'b', phone: '+919876543210' }), code('VERIFICATION_REQUIRED'));
});

test('createPost: throws VALIDATION_ERROR when a provided cityId does not exist', async () => {
  const svc = createPostedRidesService({ repo: baseRepo({ existing: [] }) });
  await assert.rejects(
    () => svc.createPost('u1', { fromCityId: '11111111-1111-4111-8111-111111111111', toCityRaw: 'b', phone: '+919876543210' }),
    code('VALIDATION_ERROR'),
  );
});

test('createPost: sets a ~24h expiresAt and returns the masked shape (no phone)', async () => {
  const svc = createPostedRidesService({ repo: baseRepo() });
  const out = await svc.createPost('u1', { fromCityRaw: 'a', toCityRaw: 'b', phone: '+919876543210' });
  assert.equal('phone' in out, false);
  const ms = out.expiresAt.getTime() - Date.now();
  assert.ok(ms > 23 * 3600_000 && ms <= 24 * 3600_000 + 1000);
});

test('toPublicPostedRide: surfaces joined canonical city names, null when absent, no phone', () => {
  const named = toPublicPostedRide({
    id: 'p1', fromCityId: 'c1', toCityId: 'c2', fromCityRaw: 'patiala', toCityRaw: 'delhi',
    fromCity: { canonicalName: 'Patiala' }, toCity: { canonicalName: 'Delhi' },
    status: 'active', isClosed: false, createdAt: new Date(), expiresAt: new Date(), phone: '+919876543210',
  });
  assert.equal(named.fromCityName, 'Patiala');
  assert.equal(named.toCityName, 'Delhi');
  assert.equal('phone' in named, false);
  const bare = toPublicPostedRide({ id: 'p2', fromCity: null, status: 'active', isClosed: false, createdAt: new Date(), expiresAt: new Date() });
  assert.equal(bare.fromCityName, null);
  assert.equal(bare.toCityName, null);
});

test('listFeed: forwards the optional cityId filter and maps city names', async () => {
  let seen;
  const repo = baseRepo();
  repo.listActivePosts = async (args) => {
    seen = args;
    return [{ id: 'p1', fromCity: { canonicalName: 'Patiala' }, toCity: { canonicalName: 'Delhi' }, status: 'active', isClosed: false, createdAt: new Date(), expiresAt: new Date() }];
  };
  const out = await createPostedRidesService({ repo }).listFeed({ limit: 10, cityId: 'c-uuid' });
  assert.equal(seen.cityId, 'c-uuid');
  assert.equal(out.posts[0].fromCityName, 'Patiala');
  assert.equal(out.posts[0].toCityName, 'Delhi');
});

test('contactPost: NOT_FOUND when no active target', async () => {
  const svc = createPostedRidesService({ repo: baseRepo({ target: null }) });
  await assert.rejects(() => svc.contactPost({ userId: 'u1', postedRideId: 'p1' }), code('NOT_FOUND'));
});

test('contactPost: own post returns phone without gate/record', async () => {
  const svc = createPostedRidesService({ repo: baseRepo({ target: { id: 'p1', phone: '+919876543210', postedBy: 'u1' } }) });
  const out = await svc.contactPost({ userId: 'u1', postedRideId: 'p1' });
  assert.equal(out.phoneNumber, '+919876543210');
  assert.equal(out.contactedAt, null);
});

test('contactPost: SUBSCRIPTION_EXPIRED when not subscribed', async () => {
  const svc = createPostedRidesService({ repo: baseRepo({ target: { id: 'p1', phone: '+91...', postedBy: 'u9' }, sub: null }) });
  await assert.rejects(() => svc.contactPost({ userId: 'u1', postedRideId: 'p1' }), code('SUBSCRIPTION_EXPIRED'));
});

test('contactPost: RATE_LIMITED when over the window cap', async () => {
  const svc = createPostedRidesService({ repo: baseRepo({ target: { id: 'p1', phone: '+91x', postedBy: 'u9' }, sub: ACTIVE_SUB, count: 9999 }) });
  await assert.rejects(() => svc.contactPost({ userId: 'u1', postedRideId: 'p1' }), code('RATE_LIMITED'));
});

test('contactPost: reveals phone + records when subscribed and under cap', async () => {
  const svc = createPostedRidesService({ repo: baseRepo({ target: { id: 'p1', phone: '+919876543210', postedBy: 'u9' }, sub: ACTIVE_SUB, count: 1 }) });
  const out = await svc.contactPost({ userId: 'u1', postedRideId: 'p1' });
  assert.equal(out.phoneNumber, '+919876543210');
  assert.ok(out.contactedAt);
});

test('closePost / removePost: NOT_FOUND when nothing was updated (non-owner)', async () => {
  const close0 = createPostedRidesService({ repo: baseRepo({ closeCount: 0 }) });
  await assert.rejects(() => close0.closePost({ userId: 'u1', postedRideId: 'p1' }), code('NOT_FOUND'));
  const del0 = createPostedRidesService({ repo: baseRepo({ delCount: 0 }) });
  await assert.rejects(() => del0.removePost({ userId: 'u1', postedRideId: 'p1' }), code('NOT_FOUND'));
});

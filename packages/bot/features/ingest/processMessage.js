'use strict';

const { isBlockedSender, containsBlockedNumber, isMutedPickup } = require('./blocklist');
const { isRideMessage } = require('./isRideMessage');
const { extractPhone } = require('./extractPhone');
const { extractCities } = require('./extractCities');
const { extractVehicle } = require('./extractVehicle');
const { maskPhone } = require('./maskPhone');
const { fingerprint } = require('./fingerprint');
const { stripBranding } = require('./stripBranding');

/**
 * Discriminants for a message's outcome. A `saved` result uses SAVED; every
 * early exit names why the message was dropped (CLAUDE.md §5 — no bare strings).
 */
const REASON = Object.freeze({
  BLOCKED_SENDER: 'blocked_sender',
  BLOCKED_NUMBER: 'blocked_number',
  NOT_RIDE: 'not_ride',
  NO_PHONE: 'no_phone',
  NO_ROUTE: 'no_route',
  MUTED_PICKUP: 'muted_pickup', // pickup is an admin-muted location
  DUPLICATE: 'duplicate',
  CLAIMED_ELSEWHERE: 'claimed_elsewhere', // another number already took this exact message
  SAVED: 'saved',
  DIRECT_DUTY: 'direct_duty', // trusted-group duty saved as a Driver Duties post
  ERROR: 'error',
});

/**
 * Build the ingest orchestrator. The returned function runs one WhatsApp message
 * through the full filter -> extract -> dedup -> persist pipeline and NEVER
 * throws: one malformed message must not crash the Baileys listener. Every exit
 * yields `{ saved, reason, ride? }`.
 *
 * @param {object} deps
 * @param {{ resolve: (raw: string) => Promise<{status: string, cityId: ?string}> }} deps.resolver
 * @param {{ claimMessage: Function, releaseMessage: Function, isDuplicate: (fp: string) => Promise<boolean>, saveRide: (d: object) => Promise<?object> }} deps.repository
 * @param {string[]} deps.cityNames - DB-loaded city vocabulary (canonical + aliases)
 * @param {{ rideKeywords: string[], ignoreKeywords: string[], blockedPhoneNumbers: string[], blockedSenders: string[], knownBrandings?: string[] }} deps.filters
 * @param {{ record: () => Promise<void> }} [deps.heartbeat] - ingestion heartbeat; fired only on a successful save (Phase 2.5 6b)
 * @param {(groupId: string) => boolean} [deps.isDirectDutyGroup] - trusted groups (admin
 *   Groups → Direct duty) whose duties go to Driver Duties (posted_rides) under the
 *   house profile instead of the bot feed
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {(msg: {text: string, senderJid: string, groupId?: string, groupName?: string, msgId?: string, botId?: string}) => Promise<{saved: boolean, reason: string, ride?: object}>}
 */
function createProcessMessage({ resolver, repository, cityNames, filters, heartbeat, isDirectDutyGroup, logger }) {
  const log = logger || { info() {}, warn() {}, error() {} };

  /**
   * Resolve a raw city fragment to its canonical { id, name } (both null if unresolved). A resolver throw
   * (e.g. a VALIDATION_ERROR on a junk fragment) is non-fatal — treated as
   * unresolved so the raw fragment is still stored for later re-resolution.
   * @param {?string} raw
   * @returns {Promise<{ id: ?string, name: ?string }>}
   */
  async function resolveCity(raw) {
    const none = { id: null, name: null };
    if (!raw) return none;
    try {
      const res = await resolver.resolve(raw);
      return res && res.status === 'resolved' ? { id: res.cityId, name: res.canonicalName } : none;
    } catch (err) {
      // Log a truncated fragment, never the full raw value — it comes from
      // untrusted WA text and could carry partial PII (CLAUDE.md §10).
      log.warn(
        { err: err.message, fragment: String(raw).slice(0, 30) },
        'city resolve failed; treating as unresolved',
      );
      return none;
    }
  }

  return async function processMessage(msg) {
    const { senderJid, groupId, groupName, msgId, botId } = msg;
    try {
      // Multi-session: every number in a shared group gets this same message — the
      // first claim wins, the rest stop here before any parsing or DB work.
      if (!(await repository.claimMessage(groupId, msgId))) {
        return { saved: false, reason: REASON.CLAIMED_ELSEWHERE };
      }
      // Fleet bots post into the source group with a trailing stamp; drop it
      // before anything else so it neither shows in the feed nor splits dedup.
      const text = stripBranding(msg.text, filters.knownBrandings);

      if (isBlockedSender(senderJid, filters.blockedSenders)) {
        return { saved: false, reason: REASON.BLOCKED_SENDER };
      }
      if (containsBlockedNumber(text, filters.blockedPhoneNumbers)) {
        return { saved: false, reason: REASON.BLOCKED_NUMBER };
      }
      if (!isRideMessage(text, filters)) {
        return { saved: false, reason: REASON.NOT_RIDE };
      }

      const phone = extractPhone(text);
      if (!phone) {
        return { saved: false, reason: REASON.NO_PHONE };
      }

      const { pickup, drop } = extractCities(text, cityNames);
      if (!pickup && !drop) {
        return { saved: false, reason: REASON.NO_ROUTE };
      }

      const [pickupCity, dropCity] = await Promise.all([resolveCity(pickup), resolveCity(drop)]);
      if (isMutedPickup({ raw: pickup, name: pickupCity.name }, filters.mutedPickups)) {
        return { saved: false, reason: REASON.MUTED_PICKUP };
      }
      const pickupCityId = pickupCity.id;
      const dropCityId = dropCity.id;

      const fp = fingerprint(text);
      if (await repository.isDuplicate(fp)) {
        return { saved: false, reason: REASON.DUPLICATE };
      }

      if (isDirectDutyGroup && isDirectDutyGroup(groupId)) {
        const post = await repository.saveDirectDuty({
          fromCityId: pickupCityId, toCityId: dropCityId, fromCityRaw: pickup, toCityRaw: drop,
          vehicleType: extractVehicle(text), phone, notes: maskPhone(text, phone), fingerprint: fp,
        });
        if (!post) return { saved: false, reason: REASON.DUPLICATE };
        return { saved: true, reason: REASON.DIRECT_DUTY, ride: { ...post, pickupCityId: post.fromCityId } };
      }

      const ride = await repository.saveRide({
        rawText: text,
        displayText: maskPhone(text, phone),
        phoneNumber: phone,
        fingerprint: fp,
        pickupCityId,
        dropCityId,
        pickupRaw: pickup,
        dropRaw: drop,
        vehicleType: extractVehicle(text),
        sourceGroupId: groupId,
        sourceGroupName: groupName,
        botId,
      });
      // Another number saved the same fingerprint a moment earlier (unique race).
      if (!ride) return { saved: false, reason: REASON.DUPLICATE };

      // Operational heartbeat: stamp the last successful ingest so the cron
      // stale watcher can distinguish a dead feed from a quiet group (6b).
      // Best-effort — the helper swallows its own errors, guarded again here.
      if (heartbeat) {
        try {
          await heartbeat.record();
        } catch {
          // never let an operational signal break ingestion
        }
      }

      return { saved: true, reason: REASON.SAVED, ride };
    } catch (err) {
      log.error({ err: err.message }, 'processMessage failed; message dropped');
      // Let a later copy from another number retry instead of being skipped.
      await repository.releaseMessage(groupId, msgId);
      return { saved: false, reason: REASON.ERROR };
    }
  };
}

module.exports = { createProcessMessage, REASON };

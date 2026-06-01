'use strict';

const { isBlockedSender, containsBlockedNumber } = require('./blocklist');
const { isRideMessage } = require('./isRideMessage');
const { extractPhone } = require('./extractPhone');
const { extractCities } = require('./extractCities');
const { extractVehicle } = require('./extractVehicle');
const { maskPhone } = require('./maskPhone');
const { fingerprint } = require('./fingerprint');

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
  DUPLICATE: 'duplicate',
  SAVED: 'saved',
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
 * @param {{ isDuplicate: (fp: string) => Promise<boolean>, saveRide: (d: object) => Promise<object> }} deps.repository
 * @param {string[]} deps.cityNames - DB-loaded city vocabulary (canonical + aliases)
 * @param {{ rideKeywords: string[], ignoreKeywords: string[], blockedPhoneNumbers: string[], blockedSenders: string[] }} deps.filters
 * @param {{ record: () => Promise<void> }} [deps.heartbeat] - ingestion heartbeat; fired only on a successful save (Phase 2.5 6b)
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {(msg: {text: string, senderJid: string, groupId?: string, groupName?: string, botId?: string}) => Promise<{saved: boolean, reason: string, ride?: object}>}
 */
function createProcessMessage({ resolver, repository, cityNames, filters, heartbeat, logger }) {
  const log = logger || { info() {}, warn() {}, error() {} };

  /**
   * Resolve a raw city fragment to a canonical id, or null. A resolver throw
   * (e.g. a VALIDATION_ERROR on a junk fragment) is non-fatal — treated as
   * unresolved so the raw fragment is still stored for later re-resolution.
   * @param {?string} raw
   * @returns {Promise<?string>}
   */
  async function resolveCityId(raw) {
    if (!raw) return null;
    try {
      const res = await resolver.resolve(raw);
      return res && res.status === 'resolved' ? res.cityId : null;
    } catch (err) {
      // Log a truncated fragment, never the full raw value — it comes from
      // untrusted WA text and could carry partial PII (CLAUDE.md §10).
      log.warn(
        { err: err.message, fragment: String(raw).slice(0, 30) },
        'city resolve failed; treating as unresolved',
      );
      return null;
    }
  }

  return async function processMessage(msg) {
    try {
      const { text, senderJid, groupId, groupName, botId } = msg;

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

      const [pickupCityId, dropCityId] = await Promise.all([
        resolveCityId(pickup),
        resolveCityId(drop),
      ]);

      const fp = fingerprint(text);
      if (await repository.isDuplicate(fp)) {
        return { saved: false, reason: REASON.DUPLICATE };
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
      return { saved: false, reason: REASON.ERROR };
    }
  };
}

module.exports = { createProcessMessage, REASON };

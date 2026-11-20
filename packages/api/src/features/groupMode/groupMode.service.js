'use strict';

const { AppError, ERROR_CODES, GROUP_MODE, POSTED_RIDE_STATUS, isSubscriptionActive } = require('@easecab/shared');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');
const { toPublicRide } = require('../rides/rides.service');
const { toPublicPostedRide } = require('../posted-rides/postedRides.service');

const { ALL, DUTIES } = GROUP_MODE.SPECIAL;
const preview = (s) => (s ? s.replace(/\s+/g, ' ').trim().slice(0, GROUP_MODE.PREVIEW_CHARS) : null);
const dutyText = (d) => `${d.fromCity?.canonicalName ?? d.fromCityRaw ?? '?'} → ${d.toCity?.canonicalName ?? d.toCityRaw ?? '?'}`;

/** Keyset page helper: rows came back as limit+1. `key` = the row's sort timestamp. */
function page(rows, limit, key) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore ? encodeCursor({ receivedAt: last[key], id: last.id }) : null };
}

/**
 * Group Mode (Phase 31) — the paid WhatsApp-style rides view. Everything except
 * reading/turning-off settings is behind an active subscription: the open feeds carry
 * full phone numbers.
 * @param {{ repo: ReturnType<import('./groupMode.repository').createGroupModeRepository> }} deps
 */
function createGroupModeService({ repo }) {
  async function requirePaid(userId) {
    if (!isSubscriptionActive(await repo.findSubscription(userId))) throw AppError.fromCode(ERROR_CODES.SUBSCRIPTION_EXPIRED);
  }

  /** Ids → city rows in the given order, dropping inactive/unknown ones. */
  async function orderedCities(ids) {
    const byId = new Map((await repo.citiesByIds(ids)).map((c) => [c.id, c]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  const toGroup = (c) => ({ cityId: c.id, name: c.canonicalName, namePa: c.namePa ?? null, nameHi: c.nameHi ?? null });

  return {
    /**
     * The toggle + the user's city groups. Never saved → off + the Punjab Taxi Group cities.
     * @returns {Promise<{ enabled: boolean, groups: object[] }>}
     */
    async getSettings(userId) {
      const saved = await repo.getSettings(userId);
      const pinned = [...(saved?.pinned ?? GROUP_MODE.DEFAULT_PINNED)];
      if (saved) return { enabled: Boolean(saved.enabled), groups: (await orderedCities(saved.cityIds || [])).map(toGroup), pinned };
      const byName = new Map((await repo.citiesByNames(GROUP_MODE.DEFAULT_CITY_NAMES)).map((c) => [c.canonicalName, c]));
      return { enabled: false, groups: GROUP_MODE.DEFAULT_CITY_NAMES.map((n) => byName.get(n)).filter(Boolean).map(toGroup), pinned };
    },

    /** Save toggle + groups. Turning ON needs a live subscription; turning off never does. */
    async saveSettings(userId, { enabled, cityIds, pinned }) {
      if (enabled) await requirePaid(userId);
      const kept = (await orderedCities(cityIds)).map((c) => c.id);
      const pins = pinned ?? (await repo.getSettings(userId))?.pinned ?? GROUP_MODE.DEFAULT_PINNED;
      // A pin only survives while its group does ('all' always exists).
      const keptPins = pins.filter((k) => k === GROUP_MODE.SPECIAL.ALL || kept.includes(k));
      await repo.saveSettings(userId, { enabled, cityIds: kept, pinned: keptPins });
      return this.getSettings(userId);
    },

    /** One page of bot rides with original text + phone. */
    async listRides(userId, { limit, cursor, cityIds }) {
      await requirePaid(userId);
      const key = cursor ? decodeCursor(cursor) : {};
      const rows = await repo.listOpenRides({ ...key, cityIds, limit });
      const { items, nextCursor } = page(rows, limit, 'receivedAt');
      return { rides: items.map((r) => ({ ...toPublicRide(r), text: r.rawText, phoneNumber: r.phoneNumber })), nextCursor };
    },

    /** One page of driver duties; a done duty keeps its bubble but loses its number. */
    async listDuties(userId, { limit, cursor, cityIds }) {
      await requirePaid(userId);
      const key = cursor ? decodeCursor(cursor) : {};
      const rows = await repo.listOpenDuties({ createdAt: key.receivedAt, id: key.id, cityIds, limit });
      const { items, nextCursor } = page(rows, limit, 'createdAt');
      return {
        posts: items.map((p) => ({ ...toPublicPostedRide(p), phoneNumber: p.status === POSTED_RIDE_STATUS.ACTIVE ? p.phone : null })),
        nextCursor,
      };
    },

    /**
     * Chat-list rows: per group the unread count since the user last opened it and
     * the newest message. City groups count bot rides + duties picked up there.
     * @param {string} userId
     * @param {{ key: string, since: number }[]} groups
     */
    async summary(userId, groups) {
      await requirePaid(userId);
      const cities = groups.filter((g) => g.key !== ALL && g.key !== DUTIES).map((g) => ({ cityId: g.key, since: new Date(g.since) }));
      const allG = groups.find((g) => g.key === ALL);
      const [stats, texts, all, duties] = await Promise.all([
        repo.rideGroupStats(cities),
        repo.latestRideTexts(cities.map((c) => c.cityId)),
        allG ? repo.allRidesStat(new Date(allG.since)) : null,
        repo.visibleDuties(),
      ]);
      const statBy = new Map(stats.map((s) => [s.key, s]));
      const textBy = new Map(texts.map((t) => [t.key, t.text]));
      return groups.map(({ key, since }) => {
        const mine = key === ALL ? [] : duties.filter((d) => key === DUTIES || d.fromCityId === key);
        const dutyUnread = mine.filter((d) => d.createdAt.getTime() > since).length;
        const newestDuty = mine[0];
        let ride = null; // { unread, lastAt, text }
        if (key === ALL) ride = { unread: all.unread, lastAt: all.last?.receivedAt ?? null, text: all.last?.rawText };
        else if (key !== DUTIES) ride = { ...statBy.get(key), text: textBy.get(key) };
        const rideAt = ride?.lastAt ? new Date(ride.lastAt) : null;
        const dutyWins = newestDuty && (!rideAt || newestDuty.createdAt > rideAt);
        return {
          key,
          unread: (ride?.unread ?? 0) + dutyUnread,
          lastAt: dutyWins ? newestDuty.createdAt : rideAt,
          lastText: dutyWins ? dutyText(newestDuty) : preview(ride?.text),
          lastIsDuty: Boolean(dutyWins),
        };
      });
    },
  };
}

module.exports = { createGroupModeService };

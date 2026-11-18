'use strict';

const { botSlotGroupsKey } = require('@easecab/shared');

/**
 * Which bot sessions are in which groups, from the per-session group sets the bot keeps
 * in Redis (refreshed on every connect, added to on every join).
 *
 * @param {{ redis: import('ioredis').Redis, sessions: { slot: string, name: string }[] }} deps
 */
function createGroupMembership({ redis, sessions }) {
  return {
    /** @param {string[]} jids @returns {Promise<Map<string, string[]>>} jid → session names */
    async of(jids) {
      const out = new Map(jids.map((j) => [j, []]));
      if (!jids.length) return out;
      const hits = await Promise.all(sessions.map((s) => redis.smismember(botSlotGroupsKey(s.slot), ...jids)));
      sessions.forEach((s, i) => jids.forEach((j, k) => { if (hits[i][k]) out.get(j).push(s.name); }));
      return out;
    },

    /** @returns {Promise<string[]>} groups 2+ sessions are in (duplicates to leave somewhere). */
    async shared() {
      const sets = await Promise.all(sessions.map((s) => redis.smembers(botSlotGroupsKey(s.slot))));
      const count = new Map();
      for (const set of sets) for (const j of set) count.set(j, (count.get(j) || 0) + 1);
      return [...count].filter(([, n]) => n > 1).map(([j]) => j);
    },
  };
}

module.exports = { createGroupMembership };

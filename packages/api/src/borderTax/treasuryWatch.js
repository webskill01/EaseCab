'use strict';

const { TREASURY, treasuryUp } = require('./flows/treasury');
const { checkpostUp } = require('./flows/checkpostv4');

// readings in a row before a change is believed: DOWN slower (3 × 3 min) so a flaky site doesn't alert twice
const CONFIRM = Object.freeze({ down: 3, up: 2 });
const CHECKPOST = 'CHECKPOST'; // pseudo-state: the checkpostv4 portal every state files through

/**
 * Watches each state's treasury/bank host (TREASURY[*].ping) plus the checkpost portal itself, and alerts once
 * when one goes down and once when it comes back. The last alerted state lives in Redis (load/save), so worker
 * restarts (every deploy) don't repeat a DOWN alert — that spammed Telegram on 2026-11-14.
 * @param {{ alert: (m: string) => void, load: () => Promise<Record<string, boolean>>, save: (st: string, up: boolean) => Promise<unknown>,
 *   check?: (host: string) => Promise<boolean>, portal?: () => Promise<boolean> }} deps
 * @returns {() => Promise<void>} one check round
 */
function createTreasuryWatch({ alert, load, save, check = treasuryUp, portal = checkpostUp }) {
  const watched = [
    ...Object.entries(TREASURY).filter(([, cfg]) => cfg.ping).map(([st, cfg]) => ({
      st, read: () => check(cfg.ping),
      up: `${st} payment site ${cfg.ping} is back UP — switch ${st} on in admin and re-run any failed lock clears.`,
      down: `${st} payment site ${cfg.ping} is DOWN — new ${st} filings stop with bank_down. Switch ${st} off in admin until it's back.`,
    })),
    { st: CHECKPOST, read: portal,
      up: 'Checkpost portal services.parivahan.gov.in/checkpostv4 is back UP — border tax filings work again.',
      down: 'Checkpost portal services.parivahan.gov.in/checkpostv4 is DOWN (app not loading) — new filings in every state stop with portal_down.' },
  ];
  let state = null; // key → { up: boolean, streak: number }; unknown = assumed up
  return async function tick() {
    state ??= Object.fromEntries(Object.entries(await load()).map(([st, up]) => [st, { up, streak: 0 }]));
    const readings = await Promise.all(watched.map((w) => w.read()));
    for (const [i, w] of watched.entries()) {
      const s = (state[w.st] ??= { up: true, streak: 0 });
      const up = readings[i];
      if (up === s.up) { s.streak = 0; continue; }
      s.streak += 1;
      if (s.streak < CONFIRM[up ? 'up' : 'down']) continue;
      Object.assign(s, { up, streak: 0 });
      await save(w.st, up);
      alert(up ? w.up : w.down);
    }
  };
}

module.exports = { createTreasuryWatch };

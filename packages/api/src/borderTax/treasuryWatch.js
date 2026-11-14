'use strict';

const { TREASURY, treasuryUp } = require('./flows/treasury');

// readings in a row before a change is believed: DOWN slower (3 × 3 min) so a flaky site doesn't alert twice
const CONFIRM = Object.freeze({ down: 3, up: 2 });

/**
 * Watches each state's treasury/bank host (TREASURY[*].ping) and alerts once when it goes down and once
 * when it comes back. The last alerted state lives in Redis (load/save), so worker restarts (every deploy)
 * don't repeat a DOWN alert — that spammed Telegram on 2026-11-14.
 * @param {{ alert: (m: string) => void, load: () => Promise<Record<string, boolean>>, save: (st: string, up: boolean) => Promise<unknown>,
 *   check?: (host: string) => Promise<boolean> }} deps
 * @returns {() => Promise<void>} one check round
 */
function createTreasuryWatch({ alert, load, save, check = treasuryUp }) {
  let state = null; // stateCd → { up: boolean, streak: number }; unknown state = assumed up
  return async function tick() {
    state ??= Object.fromEntries(Object.entries(await load()).map(([st, up]) => [st, { up, streak: 0 }]));
    const watched = Object.entries(TREASURY).filter(([, cfg]) => cfg.ping);
    const readings = await Promise.all(watched.map(([, cfg]) => check(cfg.ping)));
    for (const [i, [st, cfg]] of watched.entries()) {
      const s = (state[st] ??= { up: true, streak: 0 });
      const up = readings[i];
      if (up === s.up) { s.streak = 0; continue; }
      s.streak += 1;
      if (s.streak < CONFIRM[up ? 'up' : 'down']) continue;
      Object.assign(s, { up, streak: 0 });
      await save(st, up);
      alert(up
        ? `${st} payment site ${cfg.ping} is back UP — switch ${st} on in admin and re-run any failed lock clears.`
        : `${st} payment site ${cfg.ping} is DOWN — new ${st} filings stop with bank_down. Switch ${st} off in admin until it's back.`);
    }
  };
}

module.exports = { createTreasuryWatch };

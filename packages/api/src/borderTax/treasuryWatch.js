'use strict';

const { TREASURY, treasuryUp } = require('./flows/treasury');

const CONFIRM = 2; // readings in a row before a change is believed (one slow probe ≠ down)

/**
 * Watches each state's treasury/bank host (TREASURY[*].ping) and alerts when it goes down or comes back
 * (HP himkosh was down for hours on 2026-11-14 and nobody knew when it returned). In-memory state:
 * a worker restart re-learns it, and alerts again only if the host is down.
 * @param {{ alert: (m: string) => void, check?: (host: string) => Promise<boolean> }} deps
 * @returns {() => Promise<void>} one check round
 */
function createTreasuryWatch({ alert, check = treasuryUp }) {
  const state = {}; // stateCd → { up: ?boolean, streak: number }
  return async function tick() {
    const watched = Object.entries(TREASURY).filter(([, cfg]) => cfg.ping);
    const readings = await Promise.all(watched.map(([, cfg]) => check(cfg.ping)));
    watched.forEach(([st, cfg], i) => {
      const s = (state[st] ??= { up: null, streak: 0 });
      const up = readings[i];
      if (up === s.up) { s.streak = 0; return; }
      s.streak += 1;
      if (s.streak < CONFIRM) return;
      const boot = s.up === null;
      Object.assign(s, { up, streak: 0 });
      if (!up) alert(`${st} payment site ${cfg.ping} is DOWN — new ${st} filings stop with bank_down. Switch ${st} off in admin until it's back.`);
      else if (!boot) alert(`${st} payment site ${cfg.ping} is back UP — switch ${st} on in admin and re-run any failed lock clears.`);
    });
  };
}

module.exports = { createTreasuryWatch };

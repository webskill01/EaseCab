'use strict';

const fresh = () => ({ stanzas: 0, groupStanzas: 0, upserts: 0, notify: 0, noBody: 0, passed: 0, failures: {} });

/**
 * Per-socket WhatsApp traffic counters, logged every few minutes so a silent
 * number shows WHERE delivery stops (diagnostic for the ghost-device outages):
 *   stanzas = 0          → WhatsApp sends this device nothing (re-link)
 *   stanzas > 0, noBody  → frames arrive but fail to decrypt (`failures` says why)
 *   notify > 0, passed 0 → messages arrive but none are from enabled groups / text
 * Counts only — no ids, numbers or text (CLAUDE.md §3.10).
 * @returns {{ stanza: Function, upsert: Function, pass: Function, flush: () => object }}
 */
function createTrafficDiag() {
  let c = fresh();
  return {
    /** A raw <message> frame from the socket. @param {{attrs?: {from?: string}}} node */
    stanza(node) {
      c.stanzas += 1;
      const from = node && node.attrs && node.attrs.from;
      if (from && from.endsWith('@g.us')) c.groupStanzas += 1;
    },
    /** A messages.upsert batch. @param {object[]} messages @param {string} type */
    upsert(messages, type) {
      c.upserts += messages.length;
      if (type === 'notify') c.notify += messages.length;
      for (const m of messages) {
        if (m.message) continue;
        c.noBody += 1;
        const why = String((m.messageStubParameters && m.messageStubParameters[0]) || m.messageStubType || 'none').slice(0, 40);
        c.failures[why] = (c.failures[why] || 0) + 1;
      }
    },
    /** A message handed to ingest. */
    pass() {
      c.passed += 1;
    },
    /** Return the counts since the last flush and reset them. */
    flush() {
      const out = c;
      c = fresh();
      return out;
    },
  };
}

module.exports = { createTrafficDiag };

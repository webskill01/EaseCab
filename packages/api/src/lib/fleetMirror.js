'use strict';

const PEER_TIMEOUT_MS = 8000;

/**
 * Sends an EaseCab-originated bot-filter write to every fleet control panel
 * (Phase 17.5) in the panels' own protocol (POST + x-token). Deliberately WITHOUT
 * x-mirror: EaseCab peers with one panel only, so that panel must replay the write
 * to the rest of the fleet (e.g. MultiBot). Its echo back to EaseCab is a no-op
 * (duplicate add / missing remove). Fire-and-report like the fleet: never throws,
 * returns one result per peer so the admin sees which panel missed the change.
 * ponytail: no retry queue — a peer that was down is caught up by scripts/fleet-sync.js.
 *
 * @param {object} deps
 * @param {{ name: string, url: string, token: string, headers?: Record<string, string> }[]} deps.peers
 * @param {typeof fetch} [deps.fetchImpl]
 * @returns {{ peers: object[], post: (path: string, body: object) => Promise<{ peer: string, ok: boolean, error?: string }[]>, get: (peer: object, path: string) => Promise<object> }}
 */
function createFleetMirror({ peers, fetchImpl = fetch }) {
  const base = (peer) => String(peer.url).replace(/\/$/, '');
  const headers = (peer, extra) => ({ 'x-token': peer.token, ...(peer.headers || {}), ...extra });

  /** Parse a peer body; an auth proxy answers 200 + HTML, which is not the panel API. */
  async function json(res) {
    try {
      return JSON.parse(await res.text());
    } catch {
      return null;
    }
  }

  async function postOne(peer, path, body) {
    try {
      const res = await fetchImpl(`${base(peer)}${path}`, {
        method: 'POST',
        headers: headers(peer, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(PEER_TIMEOUT_MS),
      });
      const reply = await json(res);
      if (!res.ok) return { peer: peer.name, ok: false, error: (reply && reply.error) || `HTTP ${res.status}` };
      if (!reply) return { peer: peer.name, ok: false, error: 'not the panel API' };
      return { peer: peer.name, ok: reply.ok === true };
    } catch (err) {
      return { peer: peer.name, ok: false, error: err.message };
    }
  }

  return {
    peers,
    post: (path, body) => Promise.all(peers.map((peer) => postOne(peer, path, body))),
    /** GET a panel endpoint; throws on failure (used by the sync script, which wants to stop). */
    async get(peer, path) {
      const res = await fetchImpl(`${base(peer)}${path}`, {
        headers: headers(peer), signal: AbortSignal.timeout(PEER_TIMEOUT_MS),
      });
      const reply = await json(res);
      if (!res.ok || !reply) throw new Error(`${peer.name} ${path}: ${res.ok ? 'not the panel API' : `HTTP ${res.status}`}`);
      return reply;
    },
  };
}

module.exports = { createFleetMirror };

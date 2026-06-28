'use strict';

const { CITY_LLM, CITY_RESOLVER } = require('@easecab/shared');

/** A phone-length digit run means PII slipped in — never send it to the LLM. */
const PHONE_RUN = new RegExp(`\\d{${CITY_RESOLVER.PHONE_DIGIT_RUN},}`);

/**
 * Prompt: map each messy fragment to one cityId from the supplied catalog, or
 * null. Grounded (the model PICKS from your ids — it does not geocode freely),
 * which is what keeps a small free model reliable. JSON-only output.
 */
function buildPrompt(strings, catalog) {
  const cityLines = catalog.map((c) => `${c.id}\t${c.name}`).join('\n');
  const fragLines = strings.map((s, i) => `${i}\t${s}`).join('\n');
  return [
    'You map messy Indian city fragments (Punjab / Haryana / Delhi-NCR; Hinglish',
    'or Gurmukhi spellings, abbreviations, typos) to a city from a fixed list.',
    '',
    'CITY LIST (id<TAB>name):',
    cityLines,
    '',
    'FRAGMENTS (index<TAB>fragment):',
    fragLines,
    '',
    'For each fragment, return the matching city id from the list, or null if none',
    'clearly matches. Do NOT invent ids. Output ONLY a JSON array of',
    '{"i": <index>, "id": "<cityId or null>"} — no prose.',
  ].join('\n');
}

/** Pull the model's text payload out of a Gemini generateContent response. */
function extractText(body) {
  const parts = body?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts.map((p) => p?.text || '').join('');
  return text || null;
}

/**
 * Build the Gemini city-resolution boundary — the ONLY place that talks to the
 * LLM vendor (CLAUDE.md §4 layer boundary; swappable in one file). Injected into
 * the backfill service and stubbed in tests (no real API call in CI, §10).
 *
 * NEVER throws: any failure (no key, network, non-200, bad JSON, hallucinated id)
 * degrades to "resolved nothing this sweep" — the strings stay queued and the next
 * sweep retries. PII: only the fragments + the public catalog leave this process.
 *
 * @param {object} deps
 * @param {?string} deps.apiKey - GEMINI_API_KEY; when falsy resolveBatch no-ops
 * @param {string} [deps.model] - GEMINI_MODEL override (default CITY_LLM.DEFAULT_MODEL)
 * @param {typeof fetch} [deps.fetchImpl] - injectable for tests
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {{ resolveBatch: (strings: string[], catalog: {id:string,name:string}[]) => Promise<Map<string, ?string>> }}
 */
function createCityLlm({ apiKey, model, fetchImpl, logger } = {}) {
  const log = logger || { info() {}, warn() {}, error() {} };
  const doFetch = fetchImpl || globalThis.fetch;
  const modelName = model || CITY_LLM.DEFAULT_MODEL;

  /**
   * Resolve a batch of fragments. Returns a Map fragment -> cityId (only entries
   * the model resolved to a catalog id are present; unresolved/invalid omitted).
   */
  async function resolveBatch(strings, catalog) {
    const result = new Map();
    if (!apiKey) {
      log.warn?.({}, 'cityLlm: no GEMINI_API_KEY — backfill inert');
      return result;
    }
    // PII re-scrub (defense in depth): drop any fragment with a phone-like digit run.
    const safe = strings.filter((s) => typeof s === 'string' && s && !PHONE_RUN.test(s));
    if (safe.length === 0 || !Array.isArray(catalog) || catalog.length === 0) return result;

    const catalogIds = new Set(catalog.map((c) => c.id));
    const url = `${CITY_LLM.API_BASE}/${modelName}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: buildPrompt(safe, catalog) }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: CITY_LLM.MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
      },
    };

    try {
      const res = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(CITY_LLM.REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        log.warn?.({ status: res.status }, 'cityLlm: non-200 from Gemini — skipping sweep');
        return result;
      }
      const text = extractText(await res.json());
      if (!text) return result;

      const rows = JSON.parse(text);
      if (!Array.isArray(rows)) return result;
      for (const row of rows) {
        const idx = Number(row?.i);
        const cityId = row?.id;
        // Hallucination guard: index in range AND id is a real catalog id.
        if (Number.isInteger(idx) && idx >= 0 && idx < safe.length &&
            typeof cityId === 'string' && catalogIds.has(cityId)) {
          result.set(safe[idx], cityId);
        }
      }
    } catch (err) {
      log.warn?.({ err: err.message }, 'cityLlm: request/parse failed — skipping sweep');
    }
    return result;
  }

  return { resolveBatch };
}

module.exports = { createCityLlm };

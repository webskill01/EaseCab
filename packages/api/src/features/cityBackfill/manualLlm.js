'use strict';

/**
 * Drop-in for cityLlm when the answers come from a reviewed JSON file instead of
 * Gemini (used by scripts/city-backfill-manual.js while the Gemini key is unpaid).
 * Same contract as cityLlm.resolveBatch, so the backfill service writes the same
 * `ai` aliases and backfills rides exactly as a Gemini sweep would.
 *
 * @param {Record<string, ?string>} answers - raw fragment -> canonical city name (null = not a city)
 * @returns {{ resolveBatch: (strings: string[], catalog: {id:string,name:string}[]) => Promise<Map<string,string>>, unknownNames: () => string[] }}
 */
function createManualLlm(answers) {
  const unknown = new Set();
  return {
    async resolveBatch(strings, catalog) {
      const idByName = new Map(catalog.map((c) => [c.name.toLowerCase(), c.id]));
      const result = new Map();
      for (const s of strings) {
        const name = answers[s];
        if (!name) continue; // unanswered or explicitly "not a city"
        const id = idByName.get(name.toLowerCase());
        if (id) result.set(s, id);
        else unknown.add(name); // never invent a city the catalog doesn't have
      }
      return result;
    },
    unknownNames: () => [...unknown],
  };
}

module.exports = { createManualLlm };

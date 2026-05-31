'use strict';

/**
 * Directional city extractor — ported verbatim from the legacy multibot
 * `core/filter.js` (extractCities + scanCitiesWithContext + normalizeText),
 * converted ESM→CommonJS. The only behavioural change vs legacy: the static
 * CITY_ALIASES import is removed — `cities` is now the DB-loaded vocabulary
 * (canonical names + aliases). Whatever raw fragment this returns is handed to
 * the CityResolver's resolve() afterward to get a canonical id.
 *
 * Pattern priority:
 *   1. "from X to Y"        → pickup X, drop Y
 *   2. "Y drop current X"   → pickup X, drop Y
 *   3. "Y drop X"           → pickup X, drop Y
 *   4. "X to Y"             → pickup X, drop Y
 *   5. "pickup: X, drop: Y" → pickup X, drop Y
 *   6. "current X"          → pickup X
 *   7. Context-aware scan   → only cities near route keywords (no company names)
 */

function normalizeText(text) {
  if (!text) return '';

  return text
    // Fold "fancy" Unicode fonts (mathematical bold/italic, etc.) to ASCII so
    // labels like "𝐏𝐈𝐂𝐊𝐔𝐏"/"𝐃𝐑𝐎𝐏" are recognized by the patterns below.
    .normalize('NFKD')
    // Brackets are never routing-significant ("Bhuntar (Kullu)") and break the
    // [a-z\s] directional patterns — turn them into separators.
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1F100}-\u{1F1DF}]/gu, '') // Enclosed alphanumeric supplement (covers 🆓 U+1F191)
    .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '') // Symbols & Pictographs Extended-A
    .replace(/[*`~]/g, ' ') // WhatsApp bold/code/strikethrough markers
    .replace(/_/g, ' ') // WhatsApp italic markers
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extract pickup/drop cities with directional context awareness.
 * @param {string} text - raw message text
 * @param {string[]} cities - DB-loaded vocabulary (canonical names + aliases)
 * @returns {{ pickup: string|null, drop: string|null, allCities: string[] }}
 */
function extractCities(text, cities) {
  if (!text || !cities || !Array.isArray(cities) || cities.length === 0) {
    return { pickup: null, drop: null, allCities: [] };
  }

  const normalized = normalizeText(text);

  function isConfiguredCity(word) {
    // Strip surrounding punctuation so "tonk," / "(shimla)" still match vocab.
    const wordLower = word
      .toLowerCase()
      .trim()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

    for (const city of cities) {
      if (city.toLowerCase() === wordLower) {
        return city;
      }
    }

    return null;
  }

  function scanWords(words) {
    const found = [];
    for (let i = 0; i < words.length; i++) {
      let city = isConfiguredCity(words[i]);
      if (city && !found.includes(city)) {
        found.push(city);
        continue;
      }

      if (i < words.length - 1) {
        const twoWords = words[i] + ' ' + words[i + 1];
        city = isConfiguredCity(twoWords);
        if (city && !found.includes(city)) {
          found.push(city);
          continue;
        }
      }

      if (i < words.length - 2) {
        const threeWords = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
        city = isConfiguredCity(threeWords);
        if (city && !found.includes(city)) {
          found.push(city);
        }
      }
    }
    return found;
  }

  // Pattern 1: "from X to Y" → pickup: X, drop: Y
  // Dest group is greedy so multi-word drops ("lajpat nagar dehli") aren't truncated.
  const fromToPattern = /\bfrom\s+([a-z\s]+?)\s+to\s+([a-z\s]+)/i;
  const fromToMatch = normalized.match(fromToPattern);

  if (fromToMatch) {
    const sourceWords = fromToMatch[1].trim().split(/\s+/);
    const destWords = fromToMatch[2].trim().split(/\s+/);

    const pickupCities = scanWords(sourceWords);
    const dropCities = scanWords(destWords);

    if (pickupCities.length > 0 || dropCities.length > 0) {
      return {
        pickup: pickupCities[0] || null,
        drop: dropCities[0] || null,
        allCities: [...pickupCities, ...dropCities.filter((c) => !pickupCities.includes(c))],
      };
    }
  }

  // Pattern 2: "Y drop current X" → pickup: X, drop: Y
  const dropCurrentPattern = /\b([a-z\s]+?)\s+drop\s+current\s+([a-z\s]+?)(?:\s|$|[^a-z])/i;
  const dropCurrentMatch = normalized.match(dropCurrentPattern);

  if (dropCurrentMatch) {
    const destWords = dropCurrentMatch[1].trim().split(/\s+/);
    const sourceWords = dropCurrentMatch[2].trim().split(/\s+/);

    const dropCities = scanWords(destWords);
    const pickupCities = scanWords(sourceWords);

    // Require a city on BOTH sides of "drop": otherwise a trailing one-way
    // "drop" keyword in "X to Y drop" gets mis-read as a separator (reversing
    // direction). Both-sided keeps genuine "Y drop X" working.
    if (pickupCities.length > 0 && dropCities.length > 0) {
      return {
        pickup: pickupCities[0] || null,
        drop: dropCities[0] || null,
        allCities: [...pickupCities, ...dropCities.filter((c) => !pickupCities.includes(c))],
      };
    }
  }

  // Pattern 3: "Y drop X" → pickup: X, drop: Y
  const dropPattern = /\b([a-z\s]+?)\s+drop\s+([a-z\s]+?)(?:\s|$|[^a-z])/i;
  const dropMatch = normalized.match(dropPattern);

  if (dropMatch) {
    const destWords = dropMatch[1].trim().split(/\s+/);
    const sourceWords = dropMatch[2].trim().split(/\s+/);

    const dropCities = scanWords(destWords);
    const pickupCities = scanWords(sourceWords);

    // Both-sided (see Pattern 2): trailing one-way "drop" in "X to Y drop"
    // must fall through to Pattern 4 rather than reverse the route.
    if (pickupCities.length > 0 && dropCities.length > 0) {
      return {
        pickup: pickupCities[0] || null,
        drop: dropCities[0] || null,
        allCities: [...pickupCities, ...dropCities.filter((c) => !pickupCities.includes(c))],
      };
    }
  }

  // Pattern 4: "X to Y" → pickup: X, drop: Y
  // Dest group is greedy so multi-word drops ("lajpat nagar dehli") aren't truncated.
  const toPattern = /\b([a-z\s]+?)\s+to\s+([a-z\s]+)/i;
  const toMatch = normalized.match(toPattern);

  if (toMatch) {
    const sourceWords = toMatch[1].trim().split(/\s+/);
    const destWords = toMatch[2].trim().split(/\s+/);

    const pickupCities = scanWords(sourceWords);
    const dropCities = scanWords(destWords);

    if (pickupCities.length > 0 || dropCities.length > 0) {
      return {
        pickup: pickupCities[0] || null,
        drop: dropCities[0] || null,
        allCities: [...pickupCities, ...dropCities.filter((c) => !pickupCities.includes(c))],
      };
    }
  }

  // Pattern 5: "pickup: X" and/or "drop: Y"
  // Separator tolerates ":" and "-" (the ":-" stylistic colon is everywhere in
  // these messages: "PICK UP :-", "DROP :-").
  const pickupPattern = /\bpickup\s*[:-]*\s*([a-z\s]+?)(?:\s*drop|\s*to|\s*-|\s*phone|\s*\d|$)/i;
  const dropExplicitPattern = /\bdrop\s*[:-]*\s*([a-z\s]+?)(?:\s*pickup|\s*from|\s*phone|\s*\d|$)/i;

  const pickupMatch = normalized.match(pickupPattern);
  const dropExplicitMatch = normalized.match(dropExplicitPattern);

  if (pickupMatch || dropExplicitMatch) {
    const pickupWords = pickupMatch ? pickupMatch[1].trim().split(/\s+/).slice(0, 3) : [];
    const dropWords = dropExplicitMatch ? dropExplicitMatch[1].trim().split(/\s+/).slice(0, 3) : [];

    const pickupCities = scanWords(pickupWords);
    const dropCities = scanWords(dropWords);

    if (pickupCities.length > 0 || dropCities.length > 0) {
      return {
        pickup: pickupCities[0] || null,
        drop: dropCities[0] || null,
        allCities: [...pickupCities, ...dropCities.filter((c) => !pickupCities.includes(c))],
      };
    }
  }

  // Pattern 6: "current X" → pickup: X
  const currentPattern = /\bcurrent\s+([a-z\s]+?)(?:\s|$|[^a-z])/i;
  const currentMatch = normalized.match(currentPattern);

  if (currentMatch) {
    const currentWords = currentMatch[1].trim().split(/\s+/).slice(0, 3);
    const pickupCities = scanWords(currentWords);

    if (pickupCities.length > 0) {
      // Still scan the rest for drop city using context-aware method
      const allFoundCities = scanCitiesWithContext(normalized, cities);
      const dropCity = allFoundCities.find((c) => c !== pickupCities[0]) || null;

      return {
        pickup: pickupCities[0],
        drop: dropCity,
        allCities: allFoundCities,
      };
    }
  }

  // Pattern 7: Context-aware fallback — only cities near route keywords,
  // never cities in company-name / signature context.
  const citiesInContext = scanCitiesWithContext(normalized, cities);

  if (citiesInContext.length > 0) {
    return {
      pickup: citiesInContext[0] || null,
      drop: citiesInContext[1] || null,
      allCities: citiesInContext,
    };
  }

  return { pickup: null, drop: null, allCities: [] };
}

/**
 * Context-aware scanner: only returns cities appearing near route-relevant
 * keywords, not cities embedded in company names / signatures.
 * @param {string} normalized - already-normalized lowercase text
 * @param {string[]} cities - DB-loaded vocabulary
 * @returns {string[]}
 */
function scanCitiesWithContext(normalized, cities) {
  const words = normalized.split(/\s+/);
  const foundCities = [];

  const routeContextKeywords = [
    'from', 'to', 'pickup', 'drop', 'current', 'need', 'want', 'required',
    'looking', 'book', 'hire', 'rent', 'ride', 'trip', 'journey', 'travel',
    'car', 'taxi', 'cab', 'vehicle', 'driver', 'sedan', 'suv', 'innova',
    'swift', 'ertiga', 'tempo', 'bus', 'ac', 'non-ac',
  ];

  const companyContextKeywords = [
    'travels', 'transport', 'cabs', 'services', 'tours', 'holidays',
    'rental', 'rentals', 'contact', 'call', 'whatsapp', 'agency',
    'booking', 'book', 'now', 'available', 'thanks', 'regards',
    'pvt', 'ltd', 'limited', 'company', 'group',
  ];

  function isConfiguredCity(word) {
    // Strip surrounding punctuation so "tonk," / "(shimla)" still match vocab.
    const wordLower = word
      .toLowerCase()
      .trim()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

    for (const city of cities) {
      if (city.toLowerCase() === wordLower) {
        return city;
      }
    }

    return null;
  }

  function hasContextNearby(wordIndex, contextKeywords, windowSize = 5) {
    const start = Math.max(0, wordIndex - windowSize);
    const end = Math.min(words.length, wordIndex + windowSize + 1);

    for (let i = start; i < end; i++) {
      if (contextKeywords.includes(words[i])) {
        return true;
      }
    }
    return false;
  }

  for (let i = 0; i < words.length; i++) {
    let city = isConfiguredCity(words[i]);
    if (city && !foundCities.includes(city)) {
      const hasRouteContext = hasContextNearby(i, routeContextKeywords, 5);
      const hasCompanyContext = hasContextNearby(i, companyContextKeywords, 3);

      if (hasRouteContext || !hasCompanyContext) {
        foundCities.push(city);
      }
      continue;
    }

    if (i < words.length - 1) {
      const twoWords = words[i] + ' ' + words[i + 1];
      city = isConfiguredCity(twoWords);
      if (city && !foundCities.includes(city)) {
        const hasRouteContext = hasContextNearby(i, routeContextKeywords, 5);
        const hasCompanyContext = hasContextNearby(i, companyContextKeywords, 3);

        if (hasRouteContext || !hasCompanyContext) {
          foundCities.push(city);
        }
        continue;
      }
    }

    if (i < words.length - 2) {
      const threeWords = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
      city = isConfiguredCity(threeWords);
      if (city && !foundCities.includes(city)) {
        const hasRouteContext = hasContextNearby(i, routeContextKeywords, 5);
        const hasCompanyContext = hasContextNearby(i, companyContextKeywords, 3);

        if (hasRouteContext || !hasCompanyContext) {
          foundCities.push(city);
        }
      }
    }
  }

  return foundCities;
}

module.exports = { extractCities, normalizeText };

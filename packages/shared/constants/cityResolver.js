'use strict';

/**
 * CityResolverService tuning constants (Build Order Step 5).
 * Fuzzy thresholds implement the locked "two-band + winner-gap" rule
 * (DECISIONS.md 2026-05-31). No magic numbers in the service (CLAUDE.md §5).
 */
const CITY_RESOLVER = Object.freeze({
  CACHE_TTL_SECONDS: 86400, // 24h — positive resolutions only
  CACHE_KEY_PARTS: Object.freeze(['city', 'resolve']), // redisKey('city','resolve',<normalized>)
  MAX_INPUT_LENGTH: 120, // reject longer raw input up front (DoS guard; longer than any real city/route fragment)
  MIN_LENGTH: 2, // normalized strings shorter than this resolve to unresolved with no DB hit
  PHONE_DIGIT_RUN: 7, // a run of >= this many digits means a phone slipped in — caller must pass only the city fragment
  FUZZY_QUEUE_FLOOR: 0.3, // pg_trgm similarity below this → queue with no suggestion
  FUZZY_AUTO_ACCEPT: 0.55, // best similarity must reach this to be eligible for auto-accept
  FUZZY_WINNER_GAP: 0.1, // best must beat the 2nd-best city by this margin to auto-accept
});

/** resolve() result.status values. */
const RESOLVE_STATUS = Object.freeze({ RESOLVED: 'resolved', UNRESOLVED: 'unresolved' });

/** resolve() result.layer values (which layer produced a resolved hit). */
const RESOLVE_LAYER = Object.freeze({ CACHE: 'cache', EXACT: 'exact', FUZZY: 'fuzzy' });

/**
 * LLM backfill (Phase-14 #14-6). A periodic cron sweep hands the residual
 * `unresolved_city_strings` (what cache/exact/fuzzy couldn't pin) to Google
 * Gemini Flash (free tier) for a single batched, grounded resolution → writes a
 * `city_alias` (source `ai`) + backfills the live null-FK rides. OFF the ingest
 * hot path — zero feed/post latency. Provider is a stubbable injected boundary,
 * so swapping to another model is a one-file change. Free tier (~15 RPM / 1500
 * RPD) dwarfs this batched, periodic load.
 *
 * PII: ONLY normalized city fragments + the public city catalog are sent — never
 * raw WA text / phone / name (CLAUDE.md §10). The service re-applies the
 * PHONE_DIGIT_RUN scrub before every request as defense in depth.
 */
const CITY_LLM = Object.freeze({
  // `*-latest` tracks Google's current free Flash; override via GEMINI_MODEL if
  // they rename it. Gemini generateContent REST — called with global fetch (no SDK dep).
  DEFAULT_MODEL: 'gemini-flash-latest',
  API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
  BATCH_MAX: 50, // unresolved strings sent per sweep/call
  MIN_OCCURRENCE: 1, // only sweep strings seen at least this many times
  RIDE_BACKFILL_MAX: 200, // live null-FK rides re-resolved per sweep
  REQUEST_TIMEOUT_MS: 30000,
  MAX_OUTPUT_TOKENS: 4096,
  SWEEP_EVERY_TICKS: 15, // cron ticks (60s each) between sweeps → ~15 min
});

module.exports = { CITY_RESOLVER, RESOLVE_STATUS, RESOLVE_LAYER, CITY_LLM };

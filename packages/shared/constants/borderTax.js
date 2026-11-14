'use strict';

const { redisKey } = require('./redis');

/**
 * Border / checkpost tax filing (Phase 26, docs/BORDER-TAX.md §0). Free for subscribed members:
 * the bot fills the portal and hands the official bank page to the driver, who pays the govt
 * there and downloads their own slip. EaseCab never touches the tax money.
 * Portal codes below were read off checkpostv4 during the 2026-11-03 HP run.
 */
const BORDER_TAX_STATUS = Object.freeze({
  QUEUED: 'queued', // waiting for a free browser in the worker
  FILLING: 'filling', // worker is driving the portal
  AWAITING_CAPTCHA: 'awaiting_captcha', // OCR missed twice (miss → refresh → retry) — driver types it in-app
  HANDED_OFF: 'handed_off', // quote + bank page sent to the driver — our part is done (payment not tracked)
  AWAITING_PAYMENT: 'awaiting_payment', // in-app UPI QR shown; the bot's browser waits on PayU for the payment
  PAID: 'paid', // paid in-app; receipt_no / receipt_key set when the receipt was captured
  FAILED: 'failed',
  EXPIRED: 'expired', // driver missed a captcha deadline
  CANCELLED: 'cancelled', // driver cancelled
});

const BORDER_TAX_FINAL_STATUSES = Object.freeze([
  BORDER_TAX_STATUS.HANDED_OFF,
  BORDER_TAX_STATUS.PAID,
  BORDER_TAX_STATUS.FAILED,
  BORDER_TAX_STATUS.EXPIRED,
  BORDER_TAX_STATUS.CANCELLED,
]);

/** checkpostv4 permit-type codes. HP: only TEMPORARY returned a rate (CC gave "Cess…zero"). HR: NOT APPLICABLE only. */
const PERMIT_TYPE = Object.freeze({ NOT_APPLICABLE: '0', TEMPORARY: '35', CONTRACT_CARRIAGE: '102', AITP: '103', NATIONAL: '106' });

/** checkpostv4 service-type codes. HR/HP offer NOT APPLICABLE only; UP has no '0' (Ordinary / AC). */
const SERVICE_TYPE = Object.freeze({ NOT_APPLICABLE: '0', ORDINARY: '1', AC: '5' });

/**
 * checkpostv4 tax-mode codes (read live 2026-11-12). DAYS: the driver picks from + upto. Every other
 * mode is a calendar period: the driver picks the start and the portal fixes the end (HR monthly from
 * 13 Nov → 30 Nov 23:59, UP quarterly → 31 Jan) — the real end comes back with the quote.
 */
const TAX_MODE = Object.freeze({ DAYS: '1', MONTHLY: '4', QUARTERLY: '5', HALF_YEARLY: '6', YEARLY: '7' });

/** Seating (driver + passengers) — the tax slab depends on it. */
const BORDER_TAX_SEATS = Object.freeze(['4+1', '5+1', '6+1', '7+1']);

/** Multi-checkpost state: checkposts = the portal map's keys. */
function withPortal(cfg) {
  return Object.freeze({ ...cfg, portal: Object.freeze(cfg.portal), checkposts: Object.freeze(Object.keys(cfg.portal)) });
}

/** States the bot can file for. Add one only after its gateway passed a live run. */
// permitType / serviceType = the portal codes the flow selects; needsDistance = portal requires km (HR);
// taxModes = TAX_MODE codes the portal offers there, in its order (live 2026-11-12, TRANSPORT/MOTOR CAB).
const BORDER_TAX_STATES = Object.freeze({
  HP: Object.freeze({
    code: 'HP',
    name: 'Himachal Pradesh',
    permitType: PERMIT_TYPE.TEMPORARY,
    serviceType: SERVICE_TYPE.NOT_APPLICABLE,
    needsDistance: false,
    taxModes: Object.freeze([TAX_MODE.DAYS]), // TEMPORARY permit: DAYS only
    checkposts: Object.freeze([
      'TIPRA', 'KANDWAL', 'TUNUHATTI', 'SWARGAHT', 'PARWANOO', 'BADDI', 'BAROTIWALA',
      'KALAAMB', 'PAONTA SAHIB', 'GAGRET', 'MEHATPUR', 'DAMTAL',
    ]),
  }),
  // all 22 districts read live 2026-11-04: each has exactly one checkpost of the same name
  HR: Object.freeze({
    code: 'HR',
    name: 'Haryana',
    permitType: PERMIT_TYPE.NOT_APPLICABLE,
    serviceType: SERVICE_TYPE.NOT_APPLICABLE,
    needsDistance: true,
    taxModes: Object.freeze([TAX_MODE.DAYS, TAX_MODE.MONTHLY, TAX_MODE.QUARTERLY, TAX_MODE.HALF_YEARLY, TAX_MODE.YEARLY]),
    checkposts: Object.freeze([
      'PANCHKULA', 'AMBALA', 'YAMUNA NAGAR', 'KURUKSHETRA', 'KAITHAL', 'KARNAL', 'PANIPAT', 'SONIPAT',
      'JIND', 'FATEHABAD', 'SIRSA', 'HISAR', 'BHIWANI', 'CHARKHI DADRI', 'ROHTAK', 'JHAJJAR',
      'GURUGRAM', 'FARIDABAD', 'PALWAL', 'NUH', 'REWARI', 'MAHENDRAGARH',
    ]),
  }),
  // mapped live 2026-11-04: 1 day ₹100 Ordinary / ₹150 AC (AITP also ₹100); calendar-day dates
  // All India Tourist Permit + AC (user 2026-11-12: Temporary/Ordinary was the wrong pick for their cabs)
  UP: Object.freeze({
    code: 'UP',
    name: 'Uttar Pradesh',
    permitType: PERMIT_TYPE.AITP,
    serviceType: SERVICE_TYPE.AC,
    needsDistance: false,
    taxModes: Object.freeze([TAX_MODE.DAYS, TAX_MODE.MONTHLY, TAX_MODE.QUARTERLY]),
    calendarDays: true, // date-only portal inputs: valid through 23:59 of the last date, not 24h blocks
    checkposts: Object.freeze([
      'SAHARANPUR', 'SHAMLI', 'MUZAFFARNAGAR', 'BAGHPAT', 'GHAZIABAD', 'GAUTAM BUDDHA NAGAR', 'BIJNOR',
      'MATHURA', 'AGRA', 'ALIGARH', 'ETAWAH', 'RAMPUR', 'BAREILLY', 'PILIBHIT', 'LAKHIMPUR', 'BAHRAICH',
      'SHRAVASTI', 'BALRAMPUR', 'SIDDHARTH NAGAR', 'MAHARAJGANJ', 'KUSHINAGAR', 'DEORIA', 'BALLIA',
      'GHAZIPUR', 'CHANDAULI', 'SONBHADRA', 'MIRZAPUR', 'PRAYAGRAJ', 'CHITRAKOOT', 'BANDA', 'HAMIRPUR',
      'MAHOBA', 'JHANSI', 'LALITPUR', 'ORAI',
    ]),
  }),
  // mapped live 2026-11-04. Districts hold several route checkposts → `portal` maps each to its
  // [district, checkpost] option values. Permit NOT APPLICABLE by default (decision 2026-11-04):
  // ₹213/day at Sadhuwali vs ₹850 for TEMPORARY/AITP. Govt leg: IFMS (has RBI NEFT/RTGS).
  RJ: withPortal({
    code: 'RJ',
    name: 'Rajasthan',
    permitType: PERMIT_TYPE.NOT_APPLICABLE,
    serviceType: SERVICE_TYPE.NOT_APPLICABLE,
    needsDistance: false,
    taxModes: Object.freeze([TAX_MODE.DAYS]),
    calendarDays: true, // date-only portal inputs: valid through 23:59 of the last date, not 24h blocks
    portal: {
      'SAHAJAHAPUR': ['2', '8'],
      'NAREDA KALAN': ['2', '25'],
      'NOVGAON': ['2', '26'],
      'PAKKA BAAG': ['2', '27'],
      'AAKERA MOD': ['2', '31'],
      'BHIWARI MOD': ['2', '32'],
      'DHARUDHA MOD': ['2', '33'],
      'TAWADU MOD': ['2', '34'],
      'DANPUR': ['3', '29'],
      'MONA DUNGAR': ['3', '30'],
      'BAHAJ': ['5', '1'],
      'DHILAWATI': ['5', '2'],
      'JURHARA': ['5', '3'],
      'RARAH': ['5', '4'],
      'UNCHA NANGLA': ['5', '5'],
      'NIMBAHERA': ['9', '28'],
      'RAJGARH': ['10', '23'],
      'BARETHA': ['11', '6'],
      'CHAMBAL': ['11', '7'],
      'SIMMALWADA': ['12', '24'],
      'RATANPUR': ['12', '37'],
      'PATLI': ['13', '10'],
      'SADHUWALI': ['13', '11'],
      'GONERA': ['14', '14'],
      'MAKHUPURA': ['16', '18'],
      'MANDARADI': ['16', '19'],
      'RAIPUR': ['17', '16'],
      'TEENDHAR': ['17', '17'],
      'NAWATA KI DHANI': ['18', '20'],
      'PILOD': ['18', '21'],
      'PIPLI': ['18', '22'],
      'MAWAL': ['24', '35'],
      'MANDAR': ['24', '36'],
      'KASBA THANA': ['28', '15'],
      'SANGARIA': ['31', '9'],
      'BHADARA': ['31', '38'],
      'GOMANA': ['35', '12'],
      'PRATAPGARH': ['35', '13'],
    },
  }),
  // mapped live 2026-11-04: 1 day ₹215 Ordinary / ₹290 AC (same for TEMPORARY/SPECIAL/AITP). Govt leg unmapped (eTransPgi 503).
  UK: withPortal({
    code: 'UK',
    name: 'Uttarakhand',
    permitType: PERMIT_TYPE.TEMPORARY,
    serviceType: SERVICE_TYPE.ORDINARY,
    needsDistance: false,
    taxModes: Object.freeze([TAX_MODE.DAYS]),
    calendarDays: true, // date-only portal inputs: valid through 23:59 of the last date, not 24h blocks
    portal: {
      'ASHARODI': ['1', '1'],
      'KULHAL': ['1', '2'],
      'TIMLI': ['1', '3'],
      'TUNI': ['1', '4'],
      'BHAGWANPUR': ['2', '5'],
      'MANGLORE': ['2', '6'],
      'CHIDYAPUR': ['2', '7'],
      'KAUDIA': ['3', '8'],
      'KASHIPUR': ['4', '10'],
      'BAJPUR': ['4', '11'],
      'JASPUR': ['4', '12'],
      'PULBHATTA': ['4', '13'],
      'DAURAHA': ['4', '14'],
      'MANJHOLA': ['4', '15'],
      'NADEHI': ['4', '16'],
      'SITARGANJ': ['4', '17'],
      'MELAGHAT': ['4', '18'],
      'BANBASA': ['4', '19'],
      'RUDRAPUR': ['4', '9'],
    },
  }),
});

const BORDER_TAX = Object.freeze({
  MAX_DAYS: 30,
  MAX_START_AHEAD_DAYS: 7, // portal takes near-future windows; widen if drivers ask
  CAPTCHA_TIMEOUT_SEC: 240, // shorter than the portal's 10–15 min session
  HANDOFF_TTL_SEC: 300, // bank-page form kept for the app this long (SBIePay timer ~5 min, §15c)
  CAPTCHA_MAX_TRIES: 3, // portal locks the lookup for 15 min after ~8 tries — keep it low
  OCR_TRIES: 2, // OCR reads per captcha step (ddddocr, borderTax/ocr); then the driver types it
  // driver's "new code" tap rides the answer list as this token (answers are ≤ 10 chars, so no clash)
  CAPTCHA_REFRESH_TOKEN: '__refresh__',
  CAPTCHA_REFRESHES: 2, // portal: "Only 2 refreshes are allowed" — an OCR misread uses one, not a try
  OCR_TIMEOUT_MS: 10_000,
  MAX_DISTANCE_KM: 2000,
  WORKER_CONCURRENCY: 3, // browser contexts at once (8GB VPS; ~150MB each)
  PROXY_STATES: Object.freeze(['HR']), // eGRAS blocks datacenter IPs → these filings go via BORDER_TAX_PROXY_URL
  // only the treasury needs it: Vahan + PayU go direct (saves proxy data; both work from the VPS)
  PROXY_BYPASS: '*parivahan.gov.in, *payu.in', // only eGRAS via proxy (data). '*x' = x + subdomains; '.x' did NOT match in Chromium (2026-11-13)
  UNLOCK_DEFER_SEC: 30, // lock clear put off (filing queued / slot busy) → tried again after this
  LOOKUP_GAP_SEC: 120, // min gap between filings' Vahan lookups: 7 in ~70s locked us out, 9 at 2-min gaps did not (2026-11-05)
  RATES_WINDOW_DAYS: 60, // real portal quotes this recent are shown as each border's latest fee
  PAY_WAIT_SEC: 300, // in-app QR: the app's pay timer = PayU's QR life (5 min, seen live 2026-11-11)
  PAY_GRACE_SEC: 120, // the bot keeps listening this much longer: a scan at 4:59 still reports back
  RECEIPT_WAIT_SEC: 120, // PayU success → checkpost receipt page in the bot's own session
  RECEIPT_LOOKUP_TRIES: 3, // in-session receipt missed → Print Payment Receipt lookups, RECEIPT_LOOKUP_GAP_SEC apart
  RECEIPT_LOOKUP_GAP_SEC: 60,
  RECEIPT_KEEP_SEC: 86_400, // receipt PDF deleted from R2 this long after the tax validity ends — the driver saves it to the phone
  RECEIPT_SWEEP_BATCH: 100, // receipts deleted per cron tick
  BUSY_RETRY_SEC: 60, // all worker lanes busy: the app's "try again in" countdown (a lane frees at an unknown time)
  RECEIPT_PREFIX: 'border-tax/receipts/', // R2 key prefix for receipt PDFs (private; presigned GET only)
  JOB_TTL_SEC: 3600, // live job hash (step, captcha image) lifetime in Redis
  // pending-lock clearing (checkpost Check Pending Transaction): the portal frees an unpaid attempt 30 min after it
  UNLOCK_AFTER_SEC: 31 * 60, // our own unpaid bank-step filing → clear its lock this long after
  UNLOCK_POLL_SEC: 60, // worker checks for due unlocks this often
  UNLOCK_TRIES: 3, // portal/captcha errors before giving up (operator alerted)
  UNLOCK_RETRY_SEC: 300,
  UNLOCK_BANK_PENDING_SEC: 3600, // portal: "pending at the bank side" (treasury down) → ask again after this, counts as a try
  UNLOCK_TTL_SEC: 86_400, // unlock status kept for the app this long
  CREATE_RATE_LIMIT: Object.freeze({ MAX_PER_WINDOW: 5, WINDOW_SEC: 3600 }),
  LIST: Object.freeze({ DEFAULT_LIMIT: 20, MAX_LIMIT: 50 }),
  // Indian registration (PB01C9079, HP12AB1234) or Bharat series (22BH1234AA), spaces stripped.
  VEHICLE_NO_REGEX: /^(?:[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$/,
});

/** Redis keys (namespaced). Lists, not pub/sub: an answer pushed before the worker waits is not lost. */
const BORDER_TAX_KEYS = Object.freeze({
  QUEUE: redisKey('bordertax', 'queue'), // LPUSH request ids, worker BRPOPs
  job: (id) => redisKey('bordertax', 'job', id), // hash: step, captcha (data URL), deadline
  answer: (id) => redisKey('bordertax', 'answer', id), // list: driver's captcha answers
  handoff: (id) => redisKey('bordertax', 'handoff', id), // string: JSON bank form for the driver — never logged
  UNLOCKS: redisKey('bordertax', 'unlocks'), // zset: filing id → due time (ms) of its pending-lock clear
  unlock: (id) => redisKey('bordertax', 'unlock', id), // hash: status (BORDER_TAX_UNLOCK), at, receiptNo, tries
  PAUSED: redisKey('bordertax', 'paused'), // set: live states the admin switched off (new filings refused)
  LOOKUP_SLOT: redisKey('bordertax', 'lookupslot'), // string with PX TTL: held = a Vahan lookup started < LOOKUP_GAP_SEC ago
});

/** Pending-lock clear status (Redis, shown in the app). */
const BORDER_TAX_UNLOCK = Object.freeze({
  QUEUED: 'queued', // will run as soon as the portal is free
  WAITING: 'waiting', // portal frees the attempt at `at`; runs then
  CLEARED: 'cleared', // no pending attempt left in this state — the driver can file again
  PAID: 'paid', // the pending attempt was actually paid: its receipt (receiptNo) is valid
  FAILED: 'failed', // gave up after UNLOCK_TRIES (operator alerted)
});

/** failure_code values. */
const BORDER_TAX_FAILURE = Object.freeze({
  CAPTCHA_TIMEOUT: 'captcha_timeout',
  CAPTCHA_WRONG: 'captcha_wrong',
  PORTAL_ERROR: 'portal_error',
  WORKER_RESTART: 'worker_restart',
  STATE_UNSUPPORTED: 'state_unsupported',
  VEHICLE_PENDING: 'vehicle_pending', // portal: an earlier unpaid attempt locks the registration
  ALREADY_PAID: 'already_paid', // portal: tax already paid for every tried window
  PUCC_EXPIRED: 'pucc_expired', // portal: the vehicle's pollution certificate (PUC) has lapsed — driver renews first
  FITNESS_EXPIRED: 'fitness_expired', // portal: the vehicle's fitness certificate has lapsed — driver renews first
  ROAD_TAX_EXPIRED: 'road_tax_expired', // portal: the vehicle's home road tax has lapsed — driver renews first
  NO_TAX_MODE: 'no_tax_mode', // portal offers no tax mode for this vehicle at this checkpost
  BANK_DOWN: 'bank_down', // state treasury site unreachable — stopped before Vahan's Pay Online, so no lock
  NO_HANDOFF: 'no_handoff', // eTransPgi Submit never left Vahan for a bank page
  NO_QR: 'no_qr', // in-app QR: PayU opened but its UPI QR could not be read
  PAYMENT_FAILED: 'payment_failed', // in-app QR: PayU reported the payment as failed
  PAYMENT_TIMEOUT: 'payment_timeout', // in-app QR: not paid within PAY_WAIT_SEC
  PAYMENT_UNKNOWN: 'payment_unknown', // in-app QR: the bot lost the payment page (restart) — driver may have paid
});

/**
 * Portal tax window: full 24h blocks ending one minute early (10:00 → next day 09:59),
 * anything shorter makes the portal compute a zero cess and refuse.
 * @param {Date} startAt
 * @param {number} days
 * @returns {{ from: Date, upto: Date }}
 */
function borderTaxWindow(startAt, days) {
  const from = new Date(startAt);
  from.setSeconds(0, 0);
  const upto = new Date(from.getTime() + days * 86_400_000 - 60_000);
  return { from, upto };
}

// States a driver may file for now: the ones whose payment page offers a UPI QR (2026-11-11).
// HR = in-app QR (proven live); UP (SBIePay) + HP (HimKosh → PayU) still hand the bank page to the driver.
// RJ (IFMS → NEFT) and UK (SBIePay, no QR) stay off.
const BORDER_TAX_LIVE_STATES = Object.freeze(['HR', 'UP', 'HP']);

module.exports = {
  BORDER_TAX_LIVE_STATES,
  BORDER_TAX_STATUS,
  BORDER_TAX_FINAL_STATUSES,
  PERMIT_TYPE,
  SERVICE_TYPE,
  TAX_MODE,
  BORDER_TAX_SEATS,
  BORDER_TAX_STATES,
  BORDER_TAX,
  BORDER_TAX_KEYS,
  BORDER_TAX_FAILURE,
  BORDER_TAX_UNLOCK,
  borderTaxWindow,
};

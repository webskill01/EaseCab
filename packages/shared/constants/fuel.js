'use strict';

/**
 * Fuel station finder (Phase 30). Stations are seeded from oil-company locators
 * (IOCL, HPCL) + city-gas company CNG lists, then kept honest by driver reports.
 */
const FUEL_TYPES = Object.freeze({ CNG: 'cng', PETROL: 'petrol', DIESEL: 'diesel' });

const FUEL_STATION_STATUS = Object.freeze({
  ACTIVE: 'active',
  PENDING: 'pending', // driver-added, waiting for admin
  REJECTED: 'rejected',
  CLOSED: 'closed',
});

const FUEL_REPORT_KIND = Object.freeze({
  CNG_YES: 'cng_yes', // "CNG mili"
  CNG_NO: 'cng_no', // "yahan CNG nahi hai"
  CLOSED: 'closed', // pump shut / doesn't exist
});

const FUEL_SOURCES = Object.freeze({ IOCL: 'iocl', HPCL: 'hpcl', CGD: 'cgd', OSM: 'osm', DRIVER: 'driver' });

/** Brand keys stored on the row; the UI maps them to labels/colours. */
const FUEL_BRANDS = Object.freeze({
  IOCL: 'iocl',
  HPCL: 'hpcl',
  BPCL: 'bpcl',
  NAYARA: 'nayara',
  JIOBP: 'jiobp',
  SHELL: 'shell',
  CGD: 'cgd', // a city-gas company's own CNG station (IGL, Torrent, Think Gas…)
  OTHER: 'other',
});

const FUEL = Object.freeze({
  DEFAULT_RADIUS_KM: 15,
  MAX_RADIUS_KM: 50,
  NEARBY_LIMIT: 40,
  // India bounding box — a coordinate outside it is a typo or a spoof.
  LAT_MIN: 6,
  LAT_MAX: 37.5,
  LNG_MIN: 68,
  LNG_MAX: 97.5,
  ADDS_PER_DAY: 5,
  REPORTS_PER_HOUR: 30,
  RATE_WINDOW_DAY_SEC: 24 * 60 * 60,
  RATE_WINDOW_HOUR_SEC: 60 * 60,
  NAME_MAX: 80,
  ADDRESS_MAX: 200,
  ADMIN_PAGE_SIZE: 50,
  ADMIN_MAX_PAGE_SIZE: 200,
  // Pickup → drop: pumps within ROUTE_CORRIDOR_KM of the road, in road order.
  ROUTE_CORRIDOR_KM: 2,
  ROUTE_LIMIT: 150,
  ROUTE_CHUNK_KM: 25, // the route is searched in boxes this long, so one box never hits the row cap
  ROUTE_SNAP_DP: 2, // endpoints rounded to ~1 km so nearby starts share one cached route
  ROUTE_CACHE_TTL_SEC: 29 * 24 * 60 * 60, // Google allows caching route coordinates up to 30 days
  ROUTE_DRAW_POINTS: 500,
  ROUTES_PER_HOUR: 30,
});

/** Google Routes API (server key; Essentials SKU = DRIVE + TRAFFIC_UNAWARE). */
const GOOGLE_ROUTES = Object.freeze({
  URL: 'https://routes.googleapis.com/directions/v2:computeRoutes',
  FIELD_MASK: 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
  TIMEOUT_MS: 8000,
});

const ADMIN_FUEL_TAB = Object.freeze({ PENDING: 'pending', REPORTS: 'reports' });

/** State codes the seed import keeps (north India launch area; HPCL's codes, UK = Uttarakhand). */
const FUEL_IMPORT_STATES = Object.freeze(['PB', 'HR', 'CH', 'DL', 'UP', 'UK', 'HP', 'JK', 'RJ']);

module.exports = { GOOGLE_ROUTES, FUEL_TYPES, FUEL_STATION_STATUS, FUEL_REPORT_KIND, FUEL_SOURCES, FUEL_BRANDS, FUEL, ADMIN_FUEL_TAB, FUEL_IMPORT_STATES };

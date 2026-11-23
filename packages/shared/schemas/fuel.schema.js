'use strict';

const { z } = require('zod');
const { FUEL, FUEL_TYPES, FUEL_REPORT_KIND, FUEL_BRANDS, FUEL_STATION_STATUS, FUEL_SOURCES, ADMIN_FUEL_TAB } = require('../constants/fuel');

const lat = z.coerce.number().min(FUEL.LAT_MIN).max(FUEL.LAT_MAX);
const lng = z.coerce.number().min(FUEL.LNG_MIN).max(FUEL.LNG_MAX);
const fuel = z.enum(Object.values(FUEL_TYPES));

/** GET /fuel/stations — nearest stations selling `fuel` around the driver (lat+lng) or a city's centre (cityId). */
const fuelNearbyQuerySchema = z
  .object({
    lat: lat.optional(),
    lng: lng.optional(),
    cityId: z.string().uuid().optional(),
    fuel: fuel.default(FUEL_TYPES.CNG),
    radiusKm: z.coerce.number().min(1).max(FUEL.MAX_RADIUS_KM).default(FUEL.DEFAULT_RADIUS_KM),
  })
  .refine((q) => Boolean(q.cityId) !== (q.lat !== undefined && q.lng !== undefined), {
    message: 'give lat+lng or cityId',
  });

/**
 * GET /fuel/route — pumps along the road from pickup to drop. Drop is always a city;
 * pickup is a city or the phone's position (fromLat + fromLng).
 */
const fuelRouteQuerySchema = z
  .object({
    fromCityId: z.string().uuid().optional(),
    fromLat: lat.optional(),
    fromLng: lng.optional(),
    toCityId: z.string().uuid(),
    fuel: fuel.default(FUEL_TYPES.CNG),
  })
  .refine((q) => Boolean(q.fromCityId) !== (q.fromLat !== undefined && q.fromLng !== undefined), {
    message: 'give fromCityId or fromLat+fromLng',
  });

/** POST /fuel/stations — a driver adds a missing station (goes to admin review). */
const fuelStationCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(FUEL.NAME_MAX),
    brand: z.enum(Object.values(FUEL_BRANDS)).default(FUEL_BRANDS.OTHER),
    lat,
    lng,
    fuels: z.array(fuel).min(1).max(3),
    address: z.string().trim().max(FUEL.ADDRESS_MAX).optional(),
  })
  .strict();

/** POST /fuel/stations/:id/reports */
const fuelReportCreateSchema = z.object({ kind: z.enum(Object.values(FUEL_REPORT_KIND)) }).strict();

const fuelStationIdParamSchema = z.object({ id: z.string().uuid() });

/** Admin queue: driver-added stations waiting, or stations with open driver reports. */
const adminFuelQuerySchema = z.object({
  tab: z.enum(Object.values(ADMIN_FUEL_TAB)).default(ADMIN_FUEL_TAB.PENDING),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(FUEL.ADMIN_MAX_PAGE_SIZE).default(FUEL.ADMIN_PAGE_SIZE),
});

/** Admin decision on a station; any patch also closes its open reports. Empty body = dismiss. */
const adminFuelStationPatchSchema = z
  .object({
    status: z.enum(Object.values(FUEL_STATION_STATUS)).optional(),
    hasCng: z.boolean().optional(),
    hasPetrol: z.boolean().optional(),
    hasDiesel: z.boolean().optional(),
  })
  .strict();

/** One line of a seed-import JSONL file (scripts/fuel). Imported rows are never driver rows. */
const fuelImportRowSchema = z
  .object({
    source: z.enum(Object.values(FUEL_SOURCES)).exclude([FUEL_SOURCES.DRIVER]),
    sourceRef: z.string().trim().min(1).max(64),
    name: z.string().trim().min(2).max(FUEL.NAME_MAX),
    brand: z.enum(Object.values(FUEL_BRANDS)),
    lat,
    lng,
    address: z.string().trim().max(FUEL.ADDRESS_MAX).nullish(),
    city: z.string().trim().max(FUEL.NAME_MAX).nullish(),
    stateCode: z.string().trim().length(2).nullish(),
    hasCng: z.boolean(),
    hasPetrol: z.boolean(),
    hasDiesel: z.boolean(),
  })
  .strict();

module.exports = {
  fuelImportRowSchema,
  fuelNearbyQuerySchema,
  fuelRouteQuerySchema,
  fuelStationCreateSchema,
  fuelReportCreateSchema,
  fuelStationIdParamSchema,
  adminFuelQuerySchema,
  adminFuelStationPatchSchema,
};

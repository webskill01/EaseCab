// Connection smoke test — Build Order Step 3 deliverable ("connections verified").
//
// Verifies both backbone connections the whole app depends on:
//   1. PostgreSQL (Supabase) via Prisma — runs a trivial query + confirms pg_trgm.
//   2. Redis (VPS, localhost-bound) via ioredis — PING / SET / GET round-trip.
//
// Run on the VPS (where Redis is reachable):  npm run check:connections  --workspace=packages/api
// Run locally: PostgreSQL passes; Redis will fail to connect unless a local Redis
// is running — that is expected, Redis lives on the VPS bound to 127.0.0.1.
//
// Exit code 0 only if BOTH pass; non-zero otherwise (suitable for CI / deploy gate).

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();

async function checkPostgres() {
  const [{ now }] = await prisma.$queryRaw`SELECT now() AS now`;
  const cities = await prisma.city.count();
  // Confirm pg_trgm is installed (the city resolver depends on it).
  const ext = await prisma.$queryRaw`SELECT 1 AS ok FROM pg_extension WHERE extname = 'pg_trgm'`;
  const trgm = ext.length > 0;
  return { ok: trgm, detail: `server time ${now.toISOString()}, ${cities} cities, pg_trgm=${trgm ? 'enabled' : 'MISSING'}` };
}

async function checkRedis() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    lazyConnect: true,
    connectTimeout: 4000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // fail fast, no reconnect loop
  });
  redis.on('error', () => {}); // swallow connection-error events; connect()/ping() rejection is what we report on
  try {
    await redis.connect();
    const pong = await redis.ping();
    const key = '__easecab_healthcheck__';
    await redis.set(key, 'ok', 'EX', 10);
    const val = await redis.get(key);
    await redis.del(key);
    return { ok: pong === 'PONG' && val === 'ok', detail: `PING=${pong}, SET/GET round-trip ok` };
  } finally {
    redis.disconnect();
  }
}

async function run(name, fn) {
  process.stdout.write(`[${name}] checking… `);
  try {
    const { ok, detail } = await fn();
    console.log(ok ? `OK — ${detail}` : `FAIL — ${detail}`);
    return ok;
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    return false;
  }
}

(async () => {
  const pg = await run('postgres', checkPostgres);
  const redis = await run('redis', checkRedis);
  await prisma.$disconnect();

  const allOk = pg && redis;
  console.log(`\nResult: PostgreSQL=${pg ? 'OK' : 'FAIL'}  Redis=${redis ? 'OK' : 'FAIL'}`);
  // Hard-exit with the right code: ioredis can leave timers/handles that otherwise
  // hold the event loop open and mask the exit code in a CI/deploy gate.
  process.exit(allOk ? 0 : 1);
})();

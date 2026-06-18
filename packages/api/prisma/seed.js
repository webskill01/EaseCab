// Prisma seed — Build Order Step 2.
// Idempotent: safe to run repeatedly. Cities upsert on the [canonicalName, state]
// natural key; aliases upsert on the [aliasText, cityId] unique key.
//
// Run: npm run db:seed   (from packages/api)  — or  prisma db seed

const { PrismaClient } = require('@prisma/client');
const { CITIES } = require('./data/cities');
const { CITY_NAMES } = require('./data/cityNames');

const prisma = new PrismaClient();

async function seedCities() {
  let cityCount = 0;
  let aliasCount = 0;

  for (const c of CITIES) {
    // Localized display names (#10) — curated map wins, falling back to any
    // inline namePa/nameHi on the entry, else null (UI shows the English name).
    const loc = CITY_NAMES[c.canonicalName] ?? {};
    const namePa = loc.pa ?? c.namePa ?? null;
    const nameHi = loc.hi ?? c.nameHi ?? null;
    const city = await prisma.city.upsert({
      where: { canonicalName_state: { canonicalName: c.canonicalName, state: c.state } },
      update: {
        district: c.district ?? null,
        type: c.type,
        lat: c.lat ?? null,
        lng: c.lng ?? null,
        population: c.population ?? null,
        namePa,
        nameHi,
      },
      create: {
        canonicalName: c.canonicalName,
        state: c.state,
        district: c.district ?? null,
        type: c.type,
        lat: c.lat ?? null,
        lng: c.lng ?? null,
        population: c.population ?? null,
        namePa,
        nameHi,
      },
    });
    cityCount += 1;

    // Always seed the canonical name itself as an alias (lower-cased), plus the listed aliases.
    const aliasTexts = new Set(
      [c.canonicalName, ...(c.aliases ?? [])].map((a) => a.trim().toLowerCase()).filter(Boolean),
    );

    for (const aliasText of aliasTexts) {
      await prisma.cityAlias.upsert({
        where: { aliasText_cityId: { aliasText, cityId: city.id } },
        update: {},
        create: {
          cityId: city.id,
          aliasText,
          source: 'migrated',
          confidence: 1.0,
        },
      });
      aliasCount += 1;
    }
  }

  return { cityCount, aliasCount };
}

async function main() {
  console.log('Seeding cities + aliases (curated PB/HR/Delhi-NCR corridor)…');
  const { cityCount, aliasCount } = await seedCities();
  console.log(`Done. Upserted ${cityCount} cities and ${aliasCount} aliases.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

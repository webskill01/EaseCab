'use strict';

/**
 * One-off CLI to create/update an admin (CLAUDE.md §6 — admins never self-signup, so
 * there is no HTTP endpoint for this). Upserts by email; role defaults to `reviewer`.
 *
 * Usage:
 *   ADMIN_SEED_PASSWORD=<min-8-chars> \
 *     node scripts/create-admin.js --email a@x.com --name "Root" --role super
 *
 * The password is read from ADMIN_SEED_PASSWORD (env), never a CLI arg, so it does
 * not land in shell history or the process list. The raw password is never logged.
 */
const { PrismaClient } = require('@prisma/client');
const { createPasswordHasher } = require('../src/lib/passwordHasher');

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const email = arg('--email');
  const name = arg('--name', null);
  const role = arg('--role', 'reviewer');
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.error('Required: --email <email> and ADMIN_SEED_PASSWORD env (min 8 chars).');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_SEED_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }
  if (!['super', 'reviewer'].includes(role)) {
    console.error('--role must be super|reviewer.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await createPasswordHasher().hash(password);
    const admin = await prisma.adminUser.upsert({
      where: { email },
      update: { name, role, passwordHash },
      create: { email, name, role, passwordHash },
    });
    console.log(`OK: admin ${admin.email} (${admin.role}) id=${admin.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('create-admin failed:', err.message);
  process.exit(1);
});

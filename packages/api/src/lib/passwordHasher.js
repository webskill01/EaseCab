'use strict';

const bcrypt = require('bcryptjs');

/**
 * bcrypt password hashing boundary (CLAUDE.md §6, Step 24a). Injected into the admin
 * auth service as `hasher` so the service stays unit-testable without bcrypt. The CLI
 * seed script uses `hash`; the login flow uses `compare`.
 *
 * @param {number} [rounds=10] - bcrypt cost factor (tests may lower it for speed).
 * @returns {{ hash(plain: string): Promise<string>, compare(plain: string, hash: string): Promise<boolean> }}
 */
function createPasswordHasher(rounds = 10) {
  return {
    async hash(plain) { return bcrypt.hash(plain, rounds); },
    async compare(plain, hash) { return bcrypt.compare(plain, hash); },
  };
}

module.exports = { createPasswordHasher };

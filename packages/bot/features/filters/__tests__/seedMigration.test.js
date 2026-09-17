'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SQL = fs.readFileSync(
  path.join(__dirname, '../../../../api/prisma/migrations/20260917120000_add_bot_filter_entries/migration.sql'),
  'utf8',
);

// Locked decision (2026-05-31, see DECISIONS.md): free/khali = HARD IGNORE (strict).
// The lists are admin-editable now, but the seed must still ship the strict set.
test('seed ships the strict free/khali ignore set (incl. Gurmukhi/Devanagari)', () => {
  for (const word of ['free', 'khali', 'ਖਾਲੀ', 'खाली']) {
    assert.ok(SQL.includes(`'ignore_keyword', '${word}'`), `seed must ignore ${word}`);
  }
});

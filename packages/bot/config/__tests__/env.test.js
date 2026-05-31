'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

/**
 * The loader runs validation as an import side effect and exits the process on
 * failure, so it can only be exercised in a child process. (c8 does not
 * instrument this subprocess — coverage for the validation logic comes from
 * env.schema.test.js, and env.js is excluded from the coverage gate.)
 */
function run(env) {
  try {
    execFileSync(process.execPath, ['-e', "require('./config/env.js')"], {
      cwd: path.join(__dirname, '..', '..'),
      env,
      stdio: 'pipe',
    });
    return { ok: true, stderr: '' };
  } catch (e) {
    return { ok: false, stderr: e.stderr ? e.stderr.toString() : '' };
  }
}

test('exits non-zero and names a missing var without leaking values', () => {
  const r = run({ PATH: process.env.PATH });
  assert.strictEqual(r.ok, false);
  assert.match(r.stderr, /WA_TARGET_GROUP_JID/);
  // No secret/connection values must appear in operator output.
  assert.ok(!/postgresql:\/\//.test(r.stderr));
  assert.ok(!/redis:\/\//.test(r.stderr));
});

test('loads cleanly when every required var is valid', () => {
  const r = run({
    PATH: process.env.PATH,
    DATABASE_URL: 'postgresql://u:p@host:6543/db',
    REDIS_URL: 'redis://127.0.0.1:6379',
    WA_TARGET_GROUP_JID: '120363000000000000@g.us',
  });
  assert.strictEqual(r.ok, true);
});

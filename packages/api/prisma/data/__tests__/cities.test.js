'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { CITIES } = require('../cities');

test('no duplicate canonical names', () => {
  const names = CITIES.map((c) => c.canonicalName.toLowerCase());
  assert.strictEqual(new Set(names).size, names.length);
});

test('every city has at least one alias and a state', () => {
  for (const c of CITIES) {
    assert.ok(Array.isArray(c.aliases) && c.aliases.length > 0, `${c.canonicalName} aliases`);
    assert.ok(c.state && typeof c.state === 'string', `${c.canonicalName} state`);
  }
});

test('aliases are unique within a city and lowercase-comparable', () => {
  for (const c of CITIES) {
    const lowered = c.aliases.map((a) => a.toLowerCase());
    assert.strictEqual(new Set(lowered).size, lowered.length, `${c.canonicalName} dup alias`);
  }
});

test('merged legacy landmark aliases resolve to expected cities', () => {
  const find = (alias) => CITIES.find((c) => c.aliases.map((a) => a.toLowerCase()).includes(alias));
  assert.strictEqual(find('igi')?.canonicalName, 'Delhi');
  assert.strictEqual(find('golden temple')?.canonicalName, 'Amritsar');
  assert.strictEqual(find('chandigrah')?.canonicalName, 'Chandigarh'); // intentional typo
});

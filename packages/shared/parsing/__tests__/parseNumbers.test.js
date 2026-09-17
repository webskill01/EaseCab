'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { parseNumbers } = require('../parseNumbers');

const N = '9876543210';
const ok = (input, numbers) => assert.deepStrictEqual(parseNumbers(input), { numbers, invalid: [] }, input);

test('plain, +91, 91, 0, 0091 and +0091 prefixes', () => {
  for (const input of [N, `+91${N}`, `91${N}`, `0${N}`, `0091${N}`, `+0091${N}`, `+91 ${N}`, `0091 ${N}`]) ok(input, [N]);
});

test('spaces, dashes, dots and brackets inside a number', () => {
  for (const input of ['98765 43210', '98765-43210', '98765.43210', '+91-98765-43210', '(+91) 98765 43210',
    '+91 (987) 654-3210', '98 76 54 32 10', '9 8 7 6 5 4 3 2 1 0', '91 98 76 54 32 10', '0 98765 43210']) ok(input, [N]);
});

test('lists split by commas, semicolons, slashes, pipes, newlines and words', () => {
  ok('9876543210, 9876543211;9876543212/9876543213|9876543214\n9876543215 or 9876543216',
    ['9876543210', '9876543211', '9876543212', '9876543213', '9876543214', '9876543215', '9876543216']);
  ok('Mob: +91 98765 43210, WhatsApp - 098765 43211', ['9876543210', '9876543211']);
});

test('a real number that starts with 91 is not mistaken for a prefix', () => {
  ok('9123456789', ['9123456789']);
  ok('9123456789, 9876543210', ['9123456789', '9876543210']);
});

test('Devanagari, Gurmukhi, Arabic-Indic and fullwidth digits', () => {
  for (const input of ['९८७६५४३२१०', '੯੮੭੬੫੪੩੨੧੦', '٩٨٧٦٥٤٣٢١٠', '۹۸۷۶۵۴۳۲۱۰', '９８７６５４３２１０', '+९१ ९८७६५ ४३२१०']) ok(input, [N]);
});

test('reports leftovers and over-long runs as invalid', () => {
  assert.deepStrictEqual(parseNumbers('12345'), { numbers: [], invalid: ['12345'] });
  assert.deepStrictEqual(parseNumbers('123456789012345'), { numbers: [], invalid: ['123456789012345'] });
  assert.deepStrictEqual(parseNumbers(''), { numbers: [], invalid: [] });
});

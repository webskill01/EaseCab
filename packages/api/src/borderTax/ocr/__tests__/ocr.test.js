'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readCaptcha, ocrReady, stopOcr } = require('..');

const fixture = (f) => `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', 'fixtures', f)).toString('base64')}`;

// Real Vahan captchas from the 2026-11-04 live run. Skipped where python3 + ddddocr are not installed (CI).
test('OCR reads real Vahan captchas (incl. the # lookalike), known-length trim', async (t) => {
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  assert.strictEqual(await readCaptcha(fixture('vahan-4bpd6c.png')), '4bpd6c');
  // image shows 5mFT#X — ddddocr reads '#' as 井, mapped back; portal accepts lowercase
  assert.strictEqual(await readCaptcha(fixture('vahan-hash.png')), '5mft#x');
  assert.strictEqual(await readCaptcha(fixture('declaration-as4at-c8.png')), 'as4@c8'); // '@' read as an unsure round glyph
  assert.strictEqual(await readCaptcha(fixture('declaration-at-J8BA5.png')), '@J8BA5');
  // canvas reads (toDataURL): case is fixed from glyph height — the portal compares case-sensitively
  assert.strictEqual(await readCaptcha(fixture('declaration-6yspCT.png'), 6), '6yspCT'); // OCR alone: 6yspcT
  assert.strictEqual(await readCaptcha(fixture('declaration-Ny9Kqv.png'), 6), 'Ny9Kqv'); // OCR alone: Ny9kqv
  assert.strictEqual(await readCaptcha('data:image/png;base64,bm90IGFuIGltYWdl'), ''); // garbage → '' → driver
  // known length: same read; a read one char too long drops its least-confident char
  assert.strictEqual(await readCaptcha(fixture('vahan-hash.png'), 6), '5mft#x');
  const fit = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c',
    "import solve; print(solve.fit([['s',.9],['s',.4],['j',.9],['u',.9],['7',.9],['#',.8],['M',.9]], 6), solve.fit([['a',.1],['b',.9]], 6))"],
  { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  assert.strictEqual(fit.stdout.trim(), 'sju7#M ab');
});

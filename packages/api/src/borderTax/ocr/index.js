'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { BORDER_TAX } = require('@easecab/shared');

// ponytail: one long-lived python (ddddocr, ~1s model load) shared by all jobs, answers in FIFO order.
let proc = null;
let buf = '';
const waiting = [];

function start() {
  proc = spawn(process.platform === 'win32' ? 'python' : 'python3',[path.join(__dirname, 'solve.py')]);
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (d) => {
    buf += d;
    for (let i = buf.indexOf('\n'); i >= 0; i = buf.indexOf('\n')) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      waiting.shift()?.(line);
    }
  });
  const reset = () => { proc = null; buf = ''; waiting.splice(0).forEach((r) => r('')); };
  proc.on('exit', reset);
  proc.on('error', reset); // python / ddddocr missing → every answer is '' → driver fallback
  proc.stdin.on('error', reset);
}

/**
 * Reads a captcha offline. '' when OCR is unavailable or times out — the caller falls back to the driver.
 * @param {string} dataUrl PNG data URL
 * @param {number} [length] known code length: a read one char too long drops its least-confident char
 * @returns {Promise<string>}
 */
function readCaptcha(dataUrl, length = 0) {
  if (!proc) start();
  return new Promise((resolve) => {
    let settled = false;
    const done = (text) => { if (!settled) { settled = true; clearTimeout(timer); resolve(text); } };
    // a timed-out slot stays queued so later answers keep their order; it just resolves nobody
    const timer = setTimeout(() => done(''), BORDER_TAX.OCR_TIMEOUT_MS);
    waiting.push(done);
    proc.stdin.write(`${length} ${dataUrl.replace(/^data:[^,]*,/, '')}\n`);
  });
}

/** Real Vahan captcha (fixtures/) and its accepted answer. */
const SAMPLE = Object.freeze({ file: path.join(__dirname, 'fixtures', 'vahan-4bpd6c.png'), answer: '4bpd6c' });

/**
 * Boot check: OCR reads a known captcha. false → python3/ddddocr missing on this box
 * (`pip3 install -r src/borderTax/ocr/requirements.txt`) and every captcha goes to the driver.
 * @returns {Promise<boolean>}
 */
async function ocrReady() {
  const png = fs.readFileSync(SAMPLE.file).toString('base64');
  return (await readCaptcha(`data:image/png;base64,${png}`)) === SAMPLE.answer;
}

const MISS_DIR = path.join(os.tmpdir(), 'easecab-ocr-misses');

/**
 * Keeps a captcha OCR got wrong (miss or portal rejection) as `<time>-<read>.png` in MISS_DIR —
 * the raw material for new fixtures/tuning. Captcha images are not PII.
 * ponytail: unbounded dir of ~3KB files; add a cap if it ever matters
 */
function keepMiss(dataUrl, read) {
  try {
    fs.mkdirSync(MISS_DIR, { recursive: true });
    const name = `${Date.now()}-${read.replace(/[^A-Za-z0-9#@]/g, '') || 'empty'}.png`;
    fs.writeFileSync(path.join(MISS_DIR, name), Buffer.from(dataUrl.replace(/^data:[^,]*,/, ''), 'base64'));
  } catch {
    // best effort: a debug copy must never break a filing
  }
}

/** Ends the python child (tests, shutdown). */
function stopOcr() {
  proc?.kill();
}

module.exports = { readCaptcha, ocrReady, stopOcr, keepMiss, MISS_DIR };

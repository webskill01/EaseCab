'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { TREASURY, passTreasury } = require('../treasury');
const { ocrReady, stopOcr } = require('../../ocr');

const HOST = TREASURY.HP.host;
const BANK = 'https://bank.example.test/payu';
const CAPTCHA = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../../ocr/fixtures/vahan-4bpd6c.png')).toString('base64')}`;

// Shape of the himkosh challan page the user pasted 2026-11-07: payment type, bank, code, declaration.
// Submits to the bank only when everything is filled right, else alerts (like the real page).
const HIMKOSH = (withBank = true) => `<form id="f" method="post" action="${BANK}">
  <input type="radio" name="pt" id="eb" value="eb"><label for="eb">e-banking</label>
  <input type="radio" name="pt" id="man" value="man"><label for="man">Manually</label>
  ${withBank ? '<select name="bank" id="ddlBank"><option value="">--Select--</option><option value="P1">PAYU - NetBanking /Debit /Credit Card/ UPI/QR</option></select>' : ''}
  <div><img src="${CAPTCHA}"><input type="text" name="code" placeholder="ENTER CODE"></div>
  <input type="checkbox" name="agree" id="agree"><label for="agree">I have read and understood</label>
  <input type="button" value="Cancel"><input type="submit" value="Proceed">
</form>
<script>document.getElementById('f').onsubmit = (e) => {
  const ok = document.getElementById('eb').checked && document.querySelector('select')?.value === 'P1'
    && document.getElementById('agree').checked && document.querySelector('[name=code]').value === '4bpd6c';
  if (!ok) { e.preventDefault(); alert('Invalid details'); }
};</script>`;

/** A browser context with the fake treasury page loaded; bank navigations captured. */
async function setup(chromium, html) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  let found;
  const captured = new Promise((r) => { found = r; });
  await context.route(`${BANK}*`, (route) => { found(route.request().postData()); return route.abort(); });
  await context.route(`https://${HOST}/**`, (route) => route.fulfill({ contentType: 'text/html', body: html }));
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(`https://${HOST}/echallan`);
  return { browser, context, captured };
}

test('treasury pass-through: fills himkosh (e-banking, PAYU, OCR code, declaration) → bank captured; unknown page → null', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  const io = { log: () => {} };

  const ok = await setup(chromium, HIMKOSH());
  t.after(() => ok.browser.close());
  const bank = await passTreasury(ok.context, TREASURY.HP, ok.captured, io);
  assert.ok(bank, 'bank page captured');
  assert.match(bank, /bank=P1/);
  assert.match(bank, /code=4bpd6c/);

  const odd = await setup(chromium, HIMKOSH(false)); // no PAYU option → hand over the treasury page
  t.after(() => odd.browser.close());
  assert.strictEqual(await passTreasury(odd.context, TREASURY.HP, odd.captured, io), null);
});

test('treasury captcha OCR miss → the driver types it in the app (no hand-off); a timeout clears the lock', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  const blank = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
  const html = HIMKOSH().replace(CAPTCHA, blank); // OCR reads nothing off this

  const asked = [];
  const ok = await setup(chromium, html);
  t.after(() => ok.browser.close());
  const io = { log: () => {}, captcha: async (a) => { asked.push(a.step); return '4bpd6c'; } };
  assert.match(await passTreasury(ok.context, TREASURY.HP, ok.captured, io), /code=4bpd6c/);
  assert.deepStrictEqual(asked, ['treasury']);

  const late = await setup(chromium, html);
  t.after(() => late.browser.close());
  const timeout = { log: () => {}, captcha: async () => { throw Object.assign(new Error('t'), { failureCode: 'captcha_timeout' }); } };
  await assert.rejects(passTreasury(late.context, TREASURY.HP, late.captured, timeout), (e) => e.failureCode === 'captcha_timeout' && e.atBank === true);
});

test('treasury page never loaded → the captured challan request is posted again, then filled', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext();
  let found;
  const captured = new Promise((r) => { found = r; });
  await context.route(`${BANK}*`, (route) => { found(route.request().postData()); return route.abort(); });
  await context.route(`https://${HOST}/**`, (route) => route.fulfill({ contentType: 'text/html', body: HIMKOSH() }));
  await context.route('https://vahan.example.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>eTransPgi</p>' }));
  const page = await context.newPage(); // stuck on Vahan, as on the 2026-11-12 HR filings
  page.on('dialog', (d) => d.accept());
  await page.goto('https://vahan.example.test/eTransPgi');
  const again = { method: 'POST', action: `https://${HOST}/echallan`, fields: [['grn', '1']] };
  const bank = await passTreasury(context, { ...TREASURY.HP, findMs: 1500 }, captured, { log: () => {} }, again);
  assert.match(bank, /code=4bpd6c/);
});

test('treasury dead on the first IP → re-posted on a fresh proxy session, then filled', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const dead = await browser.newContext(); // eGRAS drops this IP (2026-11-18 ERR_CONNECTION_CLOSED)
  await dead.route(`https://${HOST}/**`, (route) => route.abort('connectionclosed'));
  await (await dead.newPage()).goto('about:blank');
  let found;
  const captured = new Promise((r) => { found = r; });
  const respawn = async () => {
    const c = await browser.newContext();
    await c.route(`${BANK}*`, (route) => { found(route.request().postData()); return route.abort(); });
    await c.route(`https://${HOST}/**`, (route) => route.fulfill({ contentType: 'text/html', body: HIMKOSH() }));
    c.on('page', (p) => p.on('dialog', (d) => d.accept()));
    return c;
  };
  const logs = [];
  const again = { method: 'POST', action: `https://${HOST}/echallan`, fields: [['grn', '1']] };
  const bank = await passTreasury(dead, { ...TREASURY.HP, findMs: 1500 }, captured, { log: (m) => logs.push(m) }, again, respawn);
  assert.match(bank, /code=4bpd6c/);
  assert.ok(logs.some((m) => /fresh proxy session/.test(m)));
});

test('treasury tab hangs mid-load → treated as not loaded: re-posted on a fresh session (was a bare timeout → portal_error, lock left)', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  t.after(stopOcr);
  if (!(await ocrReady())) return t.skip('ddddocr not installed');
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const hung = await browser.newContext(); // HR d354b3da 2026-11-21: eGRAS tab open, never reached domcontentloaded
  hung.setDefaultTimeout(1500);
  await hung.route(`https://${HOST}/slow.js`, () => {}); // never answered: the page sits on eGRAS before domcontentloaded
  await hung.route(`https://${HOST}/echallan`, (route) => route.fulfill({ contentType: 'text/html', body: `<script src="https://${HOST}/slow.js"></script>` }));
  const stuck = await hung.newPage();
  stuck.goto(`https://${HOST}/echallan`, { timeout: 0 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));
  let found;
  const captured = new Promise((r) => { found = r; });
  const respawn = async () => {
    const c = await browser.newContext();
    await c.route(`${BANK}*`, (route) => { found(route.request().postData()); return route.abort(); });
    await c.route(`https://${HOST}/**`, (route) => route.fulfill({ contentType: 'text/html', body: HIMKOSH() }));
    c.on('page', (p) => p.on('dialog', (d) => d.accept()));
    return c;
  };
  const again = { method: 'POST', action: `https://${HOST}/echallan`, fields: [['grn', '1']] };
  const bank = await passTreasury(hung, { ...TREASURY.HP, findMs: 1500 }, captured, { log: () => {} }, again, respawn);
  assert.match(bank, /code=4bpd6c/);
});

test('treasury never loads, even re-posted → treasury_down (driver told the govt site is down)', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  let browser;
  try { browser = await chromium.launch(); } catch { return t.skip('chromium not installed'); } // CI has none
  t.after(() => browser.close());
  const dead = async () => {
    const c = await browser.newContext();
    await c.route(`https://${HOST}/**`, (route) => route.abort('connectionclosed'));
    return c;
  };
  const context = await dead();
  await (await context.newPage()).goto('about:blank');
  const again = { method: 'POST', action: `https://${HOST}/echallan`, fields: [['grn', '1']] };
  await assert.rejects(passTreasury(context, { ...TREASURY.HP, findMs: 1000 }, new Promise(() => {}), { log: () => {} }, again, dead),
    (e) => e.failureCode === 'treasury_down');
});

test('HP PayU result: status is read off PayU\'s own post, not the himkosh encdata hop (2026-11-20 log)', () => {
  assert.ok(TREASURY.HP.back.test('https://securepayments.payu.in/Himkosh/response'));
  assert.ok(!TREASURY.HP.back.test('https://himkosh.hp.nic.in/echallan/WebPages/wrfSuccessAfterBankTransaction.aspx'));
  assert.ok(!TREASURY.HP.back.test('https://securepayments.payu.in/Himkosh/request'));
});

test('treasuryUp: listening port → true, closed port → false', async () => {
  const net = require('node:net');
  const { treasuryUp } = require('../treasury');
  const srv = net.createServer().listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  const { port } = srv.address();
  assert.strictEqual(await treasuryUp('127.0.0.1', port, 2000), true);
  srv.close();
  await new Promise((r) => srv.once('close', r));
  assert.strictEqual(await treasuryUp('127.0.0.1', port, 2000), false);
});

test('eGRAS-style Go covered by an overlay → DOM click still submits (once)', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright not installed'); }
  const html = `<form method="post" action="${BANK}"><input type="hidden" name="grn" value="1">
    <input type="submit" value="Continue" onclick="return confirm('continue?')"></form>
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.3)">Charges for Online transaction!</div>`;
  let ok;
  try { ok = await setup(chromium, html); } catch { return t.skip('chromium not launchable (CI)'); }
  t.after(() => ok.browser.close());
  const logs = [];
  const bank = await passTreasury(ok.context, { host: HOST }, ok.captured, { log: (m) => logs.push(m) });
  assert.match(bank, /grn=1/);
  assert.ok(logs.some((m) => /intercepts pointer events.*DOM click/.test(m)), logs.join('\n'));
});

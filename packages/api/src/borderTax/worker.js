'use strict';

// Side-effect import: validates env via Zod and exits the process on bad config.
const { env } = require('../../config/env.js');
// Receipt PDFs go to R2: the worker shares the API's .env (ecosystem.config.js), so it reuses its contract.
const { serverEnv } = require('../../config/serverEnv.js');

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { chromium } = require('playwright');
const { BORDER_TAX, BORDER_TAX_KEYS, BORDER_TAX_STATES, BORDER_TAX_PAID_PUSH: PAID_PUSH, BORDER_TAX_ACTION_PUSH: ACTION_PUSH, BORDER_TAX_FREE_PUSH: FREE_PUSH, BORDER_TAX_UP_PUSH: UP_PUSH, createTelegramNotifier } = require('@easecab/shared');
const { createBorderTaxRepository } = require('../features/borderTax/borderTax.repository');
const { createBorderTaxService } = require('../features/borderTax/borderTax.service');
const { createRunner } = require('./runner');
const { sweepReceipts } = require('./receiptSweep');
const { r2FromEnv } = require('../lib/r2.js');
const { ocrReady, stopOcr } = require('./ocr');
const { proxyFor } = require('./proxy');
const { canvasCodeHook } = require('./flows/portal');
const { serveBundles } = require('./flows/bundleCache');
const { serveStatic } = require('./flows/staticCache');
const { createTreasuryWatch } = require('./treasuryWatch');
const { createPushRepository } = require('../features/push/push.repository');
const { createPushSender } = require('../lib/fcm');
const { startDisplay } = require('./display');

const QUEUE_POLL_SEC = 30; // BRPOP timeout — lets the loop notice shutdown
const RECEIPT_SWEEP_MS = 3_600_000; // hourly: receipts go 24h after validity, an hour late is fine
const VIEWPORT = Object.freeze({ width: 1280, height: 900 });
// deploy: running filings (captcha, fare, 7-min QR, receipt) finish before exit; new ones wait in the queue.
// PM2 kill_timeout (ecosystem.config.js) sits above this; the deploy's SSH step allows 15 min.
const DRAIN_MS = 8 * 60_000;


/**
 * easecab-bordertax (PM2): pulls filings off the Redis queue and drives the state portal,
 * up to WORKER_CONCURRENCY browser contexts at once. The portal refuses headless
 * browsers, so Chromium runs headed — under Xvfb on the VPS (see ecosystem.config.js).
 */
async function main() {
  const logger = pino({ level: 'info' });
  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  const redis = new Redis(env.REDIS_URL);
  const repo = createBorderTaxRepository({ prisma, redis });
  const service = createBorderTaxService({ repo, logger });
  const notify = createTelegramNotifier({ token: env.TELEGRAM_ALERT_BOT_TOKEN, chatId: env.TELEGRAM_ALERT_CHAT_ID, logger });
  const alert = (text) => void notify?.(`EaseCab border tax: ${text}`); // unset env = logs only
  const stopDisplay = await startDisplay({ onExit: (code) => { logger.error({ code }, 'Xvfb died, restarting worker'); alert('Xvfb died, worker restarting'); process.exit(1); } });
  // Chromium died whenever the last root SSH session logged out (prod 2026-11-12): via the D-Bus session
  // bus pm2 inherited it registered a systemd scope under user@0, which systemd stops (and kills) at logout.
  // A dead bus address keeps it out of that scope. Still relaunched on the next job after any disconnect.
  const CHROMIUM_ENV = { ...process.env, DBUS_SESSION_BUS_ADDRESS: 'unix:path=/dev/null' };
  let launching = null;
  let stopping = false; // browser going away: errors now are the shutdown's, not the portal's
  let draining = false; // deploy/stop asked: no new filings or clears, running ones finish
  const browser = () => {
    // Playwright's own signal handlers close Chromium + process.exit(130) on PM2's SIGINT — that killed
    // payments mid-drain and skipped stopDisplay (orphan Xvfb, 2026-11-21). shutdown() owns the signals.
    launching ??= chromium.launch({ headless: false, env: CHROMIUM_ENV, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false }).then((b) => {
      b.on('disconnected', () => { launching = null; if (stopping) return; logger.warn('browser disconnected, relaunching on next filing'); alert('Chromium died, relaunching on next filing'); });
      return b;
    }, (err) => { launching = null; throw err; });
    return launching;
  };
  await browser(); // fail fast at boot if Chromium can't start
  const open = async (job) => {
    // IST clock: the VPS runs Europe/Berlin, and the portal read our IST tax_from as browser-local → receipts 4h30 late (2026-11-14)
    const context = await (await browser()).newContext({ viewport: VIEWPORT, timezoneId: 'Asia/Kolkata', proxy: proxyFor(env.BORDER_TAX_PROXY_URL, job) });
    await context.addInitScript(canvasCodeHook); // declaration captcha typed exactly as drawn (portal.js)
    await serveStatic(context); // libraries + hashed images from memory after the first filing (staticCache.js); never captchas
    await serveBundles(context); // registered after → checked first: checkpostv4's 4.9 MB bundle from disk (~20 KB/s from the portal)
    return context;
  };
  const newPage = async (job) => {
    const context = await open(job);
    // spare context on a new proxy session (new IP) for the treasury re-post — HR eGRAS dropped the
    // connection on one IP (2026-11-17/18); closed with the filing's own context
    let spares = 0; // each call = a new session: the eGRAS probe may need 2, the re-post 1 more
    context.respawn = async () => {
      spares += 1;
      const spare = await open(job && { ...job, sid: `r${spares}${job.sid}` });
      context.once('close', () => spare.close().catch(() => {}));
      return spare;
    };
    return context.newPage();
  };
  const r2 = r2FromEnv(serverEnv);
  const pushRepo = createPushRepository({ prisma, redis });
  const pushSender = createPushSender({ projectId: serverEnv.FIREBASE_PROJECT_ID, clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL, privateKey: serverEnv.FIREBASE_PRIVATE_KEY });
  const pushTo = async (userId, p, body, url = p.CLICK_PATH) => {
    const tokens = await pushRepo.findUserTokens(userId);
    if (!tokens.length) return;
    const { staleTokens } = await pushSender.sendToTokens({ tokens, data: { type: p.TYPE, source: p.SOURCE, title: p.TITLE, body, url, action: p.ACTION } });
    await pushRepo.pruneTokens(staleTokens);
  };
  const fill = (text, req) => text.replace('{vehicle}', req.vehicleNo).replace('{state}', BORDER_TAX_STATES[req.stateCd]?.name || req.stateCd);
  // payment found after the QR timed out: tell the driver (the feed banner covers a missed push)
  const onLatePaid = (req) => pushTo(req.userId, PAID_PUSH, fill(PAID_PUSH.BODY, req), `${PAID_PUSH.CLICK_PATH}?open=${req.id}`);
  // QR / amount / captcha waiting and the app not on it → opens that filing (?open=)
  const onAction = (req, kind) => pushTo(req.userId, ACTION_PUSH, fill(ACTION_PUSH[kind], req), `${ACTION_PUSH.CLICK_PATH}?open=${req.id}`)
    .catch((err) => logger.warn({ id: req.id, err: err.message }, 'action push failed'));
  // lock cleared → the vehicle can be filed again; skipped when the driver already filed it again
  const onFreed = async (req) => {
    if ((await repo.recentForVehicle(req.vehicleNo, req.stateCd, req.createdAt)).some((other) => other !== req.id)) return;
    await pushTo(req.userId, FREE_PUSH, fill(FREE_PUSH.BODY, req));
    logger.info({ id: req.id }, 'vehicle free push sent');
  };
  // a down site is back: push every driver it stopped (refused at Pay or failed on it), once
  const onUp = async (site) => {
    const users = await repo.takeWaitingUp(site);
    const name = site === BORDER_TAX.PORTAL_KEY ? UP_PUSH.PORTAL : UP_PUSH.STATE.replace('{state}', BORDER_TAX_STATES[site]?.name || site);
    for (const u of users) await pushTo(u, UP_PUSH, UP_PUSH.BODY.replace('{site}', name)).catch((err) => logger.warn({ site, err: err.message }, 'site-up push failed'));
    logger.info({ site, users: users.length }, 'site back up: waiting drivers pushed');
  };
  const runner = createRunner({ service, repo, newPage, logger, r2, alert, onAction, onLatePaid, onFreed, isStopping: () => stopping });
  const sweep = () => sweepReceipts({ repo, r2, logger }).catch((err) => logger.error({ err: err.message }, 'receipt sweep failed'));
  sweep();
  const sweepTimer = setInterval(sweep, RECEIPT_SWEEP_MS);
  const watch = createTreasuryWatch({
    alert,
    load: async () => Object.fromEntries(Object.entries(await redis.hgetall(BORDER_TAX_KEYS.TREASURY_UP)).map(([st, v]) => [st, v === '1'])),
    save: (st, up) => redis.hset(BORDER_TAX_KEYS.TREASURY_UP, st, up ? '1' : '0'),
    onUp: (site) => onUp(site).catch((err) => logger.warn({ site, err: err.message }, 'site-up pushes failed')),
  });
  const watchTick = () => watch().catch((err) => logger.warn({ err: err.message }, 'treasury watch failed'));
  watchTick();
  const watchTimer = setInterval(watchTick, BORDER_TAX.TREASURY_WATCH_SEC * 1000);

  logger.info({ recovered: await service.recoverAfterRestart() }, 'border tax worker up');
  if (await ocrReady()) logger.info('captcha OCR ready');
  else logger.warn('captcha OCR unavailable — every captcha goes to the driver (pip3 install -r src/borderTax/ocr/requirements.txt)');
  let active = 0; // filings + clears running now — a drain waits for 0
  const track = async (work) => { active += 1; try { return await work(); } finally { active -= 1; } };
  const loop = async (n) => {
    const conn = redis.duplicate(); // BRPOP blocks its connection — one per lane
    while (!draining) {
      const id = await repo.popQueue(conn, QUEUE_POLL_SEC);
      if (id && draining) { await repo.enqueue(id); break; } // popped as a drain began: the next worker files it
      if (id) await track(() => runner.run(id, conn)).catch((err) => { logger.error({ id, lane: n, err: err.message }, 'runner crashed'); alert(`runner crashed on ${id.slice(0, 8)}: ${err.message.slice(0, 200)}`); });
    }
    conn.disconnect();
  };
  const lanes = Array.from({ length: BORDER_TAX.WORKER_CONCURRENCY }, (_, n) => loop(n));
  // pending-lock clears, one at a time beside the lanes (they share the lookup gap)
  const unlocks = (async () => {
    while (!draining) {
      const id = await repo.popDueUnlock(Date.now()).catch((err) => logger.error({ err: err.message }, 'unlock poll failed'));
      if (id) await track(() => runner.unlock(id)).catch((err) => { logger.error({ id, err: err.message }, 'unlock crashed'); alert(`unlock crashed on ${id.slice(0, 8)}: ${err.message.slice(0, 200)}`); });
      else await new Promise((r) => setTimeout(r, BORDER_TAX.UNLOCK_POLL_SEC * 1000));
    }
  })();

  const shutdown = async (signal) => {
    if (draining) return;
    draining = true;
    clearInterval(sweepTimer);
    clearInterval(watchTimer);
    logger.info({ signal, active }, 'border tax worker draining: no new filings, running ones finish');
    const until = Date.now() + DRAIN_MS;
    while (active && Date.now() < until) await new Promise((r) => setTimeout(r, 1000));
    if (active) logger.warn({ active }, 'drain timed out — these are swept on next boot');
    logger.info({ signal }, 'border tax worker stopping');
    stopping = true;
    stopOcr();
    await (await launching)?.close().catch((err) => logger.warn({ err: err.message }, 'browser close failed'));
    stopDisplay();
    await Promise.race([Promise.allSettled([...lanes, unlocks]), new Promise((r) => setTimeout(r, 2000))]);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('border tax worker failed to start:', err.message); // eslint-disable-line no-console
  process.exit(1);
});

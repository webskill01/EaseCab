'use strict';

const { spawn } = require('node:child_process');

/**
 * The worker's own Xvfb (was `xvfb-run` in PM2). PM2 killed xvfb-run's whole tree on every deploy, Xvfb
 * included, so Chromium lost its display mid-payment and a drain was impossible. Now PM2 signals node
 * only (treekill: false); node drains, closes Chromium, then stops this. `-displayfd` picks a free
 * display, so an Xvfb orphaned by a SIGKILL never blocks the next start.
 * ponytail: an orphan stays until reboot (~20 MB); reap it if that ever piles up.
 * @param {{ onExit?: (code: ?number) => void }} [opts] - Xvfb died on its own (Chromium can't relaunch)
 * @returns {Promise<() => void>} stop
 */
function startDisplay({ onExit = () => {} } = {}) {
  if (process.platform !== 'linux' || process.env.DISPLAY) return Promise.resolve(() => {}); // desktop / dev
  return new Promise((resolve, reject) => {
    const x = spawn('Xvfb', ['-displayfd', '3', '-screen', '0', '1280x1024x24', '-nolisten', 'tcp'], { stdio: ['ignore', 'ignore', 'inherit', 'pipe'] });
    let stopped = false;
    x.once('error', reject);
    x.once('exit', (code) => { if (!stopped) onExit(code); });
    x.stdio[3].once('data', (d) => {
      process.env.DISPLAY = `:${String(d).trim()}`;
      resolve(() => { stopped = true; x.kill(); });
    });
  });
}

module.exports = { startDisplay };

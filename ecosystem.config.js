// PM2 process map — EaseCab (PRODUCTION).
//
// This is the deployment artifact referenced in CLAUDE.md. Processes come online as
// their build-order steps complete; entry-point paths below are the intended targets.
// Activated at the deployment phase: `pm2 start ecosystem.config.js`.
//
// IMPORTANT — this VPS is (or will be) dedicated to EaseCab. Every app has an explicit
// `max_memory_restart` so a leak (Baileys especially) restarts that ONE process instead
// of OOM-killing the box. Tuned for an 8GB VPS with comfortable headroom (see docs/BACKUPS
// .md / capacity notes). Total caps ≈ 2.1GB, leaving the OS + Postgres-client + build
// headroom free.
//
// Staging runs as SEPARATE named apps (see docs/STAGING.md), not via --env, so prod and
// staging can run side by side on the same box without name collisions.

module.exports = {
  apps: [
    {
      name: 'easecab-bot', // packages/bot — Baileys WA listener (leaks; cap aggressively)
      script: 'index.js',
      cwd: 'packages/bot', // run from the package so ./.wa-session + ./.env resolve here
      node_args: '--env-file-if-exists=.env', // PM2 runs node directly — load packages/bot/.env
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '400M',
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000, // back off so a crash-loop doesn't hammer WhatsApp (ban risk)
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'easecab-api', // packages/api — Express + SSE (single instance: SSE broadcast is in-process)
      script: 'src/server.js',
      cwd: 'packages/api', // run from the package so ./.env resolves here (like cron/bot)
      node_args: '--env-file-if-exists=.env', // load packages/api/.env — NODE_ENV comes from the file
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '500M',
      autorestart: true,
      env: { PORT: 4000 }, // NODE_ENV left to .env: demo box = development (stubs), prod = production
    },
    {
      name: 'easecab-web', // apps/web — Next.js production server (`next start`, port in the start script)
      script: 'npm',
      args: 'run start', // apps/web start = `next start -p 3000`; next is hoisted to root .bin, npm resolves it
      cwd: 'apps/web',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '600M',
      autorestart: true,
      env: { NODE_ENV: 'production', PORT: 3000 },
    },
    {
      name: 'easecab-admin', // apps/admin — Next.js production server (`next start -p 5000`)
      script: 'npm',
      args: 'run start',
      cwd: 'apps/admin',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '400M',
      autorestart: true,
      env: { NODE_ENV: 'production', PORT: 5000 },
    },
    {
      name: 'easecab-cron', // cron worker — ride status transitions + cleanup + bot stale watch
      script: 'src/cron/worker.js',
      cwd: 'packages/api', // run from the package so ./.env resolves here
      node_args: '--env-file-if-exists=.env', // load packages/api/.env (DATABASE_URL + REDIS_URL)
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '250M',
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
  ],
};

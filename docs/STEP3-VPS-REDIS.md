# Step 3 — Finish on the VPS (Redis + connection verify)

PostgreSQL (Supabase) is already provisioned and verified — migration, seed, and live
queries all passed in Step 2. The only remaining Step 3 work needs **SSH access to the
Contabo VPS**, so run this when you're at the terminal.

## 1. Install Redis on the VPS

```bash
ssh <user>@<VPS_HOST>

sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping            # expect: PONG
```

## 2. Bind Redis to localhost only (security — never expose 6379)

```bash
sudo nano /etc/redis/redis.conf
# Ensure these lines:
#   bind 127.0.0.1 -::1
#   protected-mode yes
sudo systemctl restart redis-server
```

Confirm the firewall does NOT allow 6379 from outside (CLAUDE.md §6 / SETUP.md):

```bash
sudo ufw status            # 6379 must NOT be in the allow list
```

## 3. Verify both connections from the VPS

On the VPS, inside the deployed repo (after `git pull` + `npm install`):

```bash
npm run check:connections --workspace=packages/api
# Expect: PostgreSQL=OK  Redis=OK   (exit code 0)
```

This runs `packages/api/scripts/check-connections.js`:
- PostgreSQL: trivial query + `cities` count + confirms `pg_trgm` extension.
- Redis: PING + SET/GET round-trip against `REDIS_URL` (default `redis://127.0.0.1:6379`).

## 4. Mark Step 3 done

Once `check:connections` prints `PostgreSQL=OK  Redis=OK`, Step 3 is complete —
tick it in PHASES.md and move to Step 4 (`packages/shared`).

---

### Notes
- `REDIS_URL` is already set in `packages/api/.env` (`redis://127.0.0.1:6379`).
- Running `check:connections` from a dev laptop will show `Redis=FAIL (ECONNREFUSED)` —
  that's correct; Redis is localhost-bound on the VPS and not reachable remotely.
- Reminder (from GOAL.md decisions): the DB password in `.env` starts with a literal `@`.
  Prisma tolerates it; before relying on ioredis/node-postgres URL parsing in later
  steps, percent-encode it to `%40` if any parser complains.

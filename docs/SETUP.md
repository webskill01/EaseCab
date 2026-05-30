# EaseCab — External Services & Configuration Guide

Complete setup reference for all third-party services and infrastructure.  
Work through these in priority order — some have approval delays.

---

## Priority Order

| # | Service | When needed | Delay | Action |
|---|---|---|---|---|
| 1 | **Surepass** | Phase 4 (KYC) | 2–3 days approval | Start today |
| 2 | **GitHub remote** | Now (CI/CD) | None | Set up today |
| 3 | **Supabase** | Phase 1 (DB schema) | None | Set up before Phase 1 Step 2 |
| 4 | **Firebase** | Phase 3 (Auth) + Phase 4 (Chat/Push) | None | Set up early |
| 5 | **Cloudflare R2** | Phase 4 (file storage) | None | Set up before Phase 4 |
| 6 | **PostHog** | Phase 5 (analytics) | None | 5 minutes |
| 7 | **Sentry** | Phase 5 (error tracking) | None | 10 minutes |
| 8 | **Razorpay** | Phase 4 (subscriptions) | 24–48h after Privacy Policy live | Submit docs after Step 1 |
| 9 | **Google Play Developer** | Phase 8 (TWA) | Instant ($25 one-time) | Any time |
| 10 | **UptimeRobot** | Deployment | None | Set up at launch |

---

## 1. Surepass (KYC) — Start Immediately

**What:** Aadhaar OTP verification + Driver License + RC (vehicle registration) via government APIs.  
**Risk:** May require incorporated entity. Confirm individual route during onboarding.

**Steps:**
1. Go to [surepass.io](https://surepass.io) → Register as developer
2. Select APIs needed: **Aadhaar OTP**, **Driving License**, **Vehicle Registration (RC)**
3. Submit onboarding docs (PAN, business details, use-case description)
4. Wait for approval (2–3 business days)
5. After approval: get **Client ID** and **Client Secret** from dashboard

**APIs used:**
- `POST /api/v1/aadhaar-otp/generate` — send OTP to Aadhaar-linked phone
- `POST /api/v1/aadhaar-otp/submit-otp` — verify OTP
- `POST /api/v1/rc` — verify vehicle registration
- `POST /api/v1/driving-licence` — verify DL number

**Env vars to collect:**
```
SUREPASS_CLIENT_ID=
SUREPASS_CLIENT_SECRET=
SUREPASS_BASE_URL=https://kyc-api.surepass.io
```

---

## 2. GitHub Remote Repository

**Steps:**
1. Go to github.com → New repository → Name: `easecab` → **Private**
2. Do NOT initialize with README (repo already has files)
3. Copy the SSH or HTTPS remote URL
4. In your local project:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/easecab.git
   git push -u origin main
   ```
5. Go to repo → **Settings → Secrets and variables → Actions → New repository secret**
6. Add all secrets listed in the Environment Variables section below

**Secrets to add in GitHub Actions (add as you get each service set up):**
```
DATABASE_URL
DIRECT_URL
REDIS_URL
JWT_SECRET
ADMIN_JWT_SECRET
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
SUREPASS_CLIENT_ID
SUREPASS_CLIENT_SECRET
VPS_HOST          ← your Contabo VPS IP
VPS_USER          ← typically "root" or your user
VPS_SSH_KEY       ← private key for SSH (generate a deploy key pair)
```

---

## 3. Supabase (PostgreSQL)

**What:** Managed PostgreSQL. Pro plan required — free tier pauses DB after 1 week inactivity.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → New project
2. Name: `easecab` | Region: **Singapore (ap-southeast-1)** — lowest latency for India
3. Note the **database password** you set (save it securely)
4. Upgrade to **Pro plan** ($25/month) before launch
5. Go to **Settings → Database**:
   - Copy **Connection string (Transaction mode)** → this is your `DATABASE_URL` (via pgBouncer, use for app)
   - Copy **Connection string (Session mode/Direct)** → this is your `DIRECT_URL` (use for Prisma migrations only)
6. Go to **Database → Extensions** → Enable **pg_trgm** (needed for fuzzy city search)
7. Go to **Database → Connection Pooling** → confirm pgBouncer is on Transaction mode

**Env vars to collect:**
```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Note on Prisma:** `schema.prisma` must have both URLs:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 4. Firebase (Auth + Firestore + FCM)

**What:** Phone OTP auth, real-time chat database, push notifications. All three use the same Firebase project.

### 4a. Create Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Add project → Name: `easecab` → Enable Google Analytics → Link to a Google Analytics account
3. Choose region: **asia-south1 (Mumbai)** for Firestore

### 4b. Firebase Authentication (Phone OTP)
1. Build → Authentication → Get started
2. Sign-in providers → Phone → Enable
3. Add test phone numbers for development (prevents real OTPs during testing):
   - `+91 9999999999` → verification code: `123456`

### 4c. Firestore Database (Chat)
1. Build → Firestore Database → Create database
2. Choose **Start in production mode**
3. Region: `asia-south1`
4. Set Security Rules (basic — full rules written during Phase 4):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false; // locked down until proper rules written
       }
     }
   }
   ```

### 4d. Firebase Cloud Messaging (Push)
1. Build → Cloud Messaging → already enabled by default
2. Project Settings → Cloud Messaging → Web configuration
3. Click **Generate key pair** under "Web Push certificates" → save the VAPID key

### 4e. Admin SDK (for backend)
1. Project Settings → Service accounts
2. Click **Generate new private key** → download JSON file
3. Extract from JSON: `project_id`, `private_key`, `client_email`
4. **NEVER commit this JSON file** — add to .gitignore (`firebase-adminsdk*.json`)

### 4f. Web App Config (for frontend)
1. Project Settings → Your apps → Add app → Web
2. Register app name: `easecab-web`
3. Copy the `firebaseConfig` object — these are public keys (safe in frontend)

**Env vars to collect:**
```
# Backend (Admin SDK)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@easecab.iam.gserviceaccount.com

# Frontend (public — safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=easecab.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=easecab
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=    ← from step 4d
```

---

## 5. Cloudflare R2 (File Storage)

**What:** S3-compatible object storage. Zero egress fees. Already using Cloudflare for DNS.

**Steps:**
1. Log into Cloudflare dashboard → R2 → Create bucket
2. Create **3 buckets**:
   | Bucket name | Access | Used for |
   |---|---|---|
   | `easecab-public` | Public | Profile pictures (served via CDN) |
   | `easecab-private` | Private | KYC docs, chat images (presigned URLs only) |
   | `easecab-backups` | Private | pg_dump database backups |
3. For `easecab-public`: Settings → Public access → Allow → Connect custom domain (e.g., `cdn.easecab.com`)
4. R2 → Manage R2 API tokens → Create API token
   - Permissions: **Object Read & Write**
   - Scope: All buckets (or specify individually)
   - Copy: **Access Key ID** and **Secret Access Key**
5. Account Overview → copy **Account ID**

**CORS policy for `easecab-public` (paste in bucket → Settings → CORS):**
```json
[
  {
    "AllowedOrigins": ["https://easecab.com", "https://admin.easecab.com"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**Env vars to collect:**
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=easecab-public
R2_PRIVATE_BUCKET=easecab-private
R2_BACKUP_BUCKET=easecab-backups
R2_PUBLIC_URL=https://cdn.easecab.com    ← after connecting domain
```

---

## 6. Razorpay (Subscriptions)

**⚠️ Prerequisite:** Privacy Policy + T&C pages must be **live on easecab.com** before submitting docs. Do Step 1 of the build order first.

**Steps:**
1. Go to [razorpay.com](https://razorpay.com) → Sign up
2. Complete KYC (Individual route):
   - PAN card
   - Aadhaar
   - Bank account + cancelled cheque
   - Business: Declaration letter (acceptable for individual)
   - Website: `https://easecab.com` (must be live with Privacy Policy + T&C)
3. After activation (24–48h): Dashboard → Subscriptions → Plans → Create Plan:
   - Name: `EaseCab Monthly`
   - Amount: `14900` (₹149 in paise)
   - Period: `monthly`
   - Interval: `1`
   - Copy the Plan ID
4. Settings → Webhooks → Add webhook:
   - URL: `https://api.easecab.com/api/v1/subscriptions/webhook`
   - Secret: generate a random strong string (save it — this is your HMAC secret)
   - Events to subscribe: `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, `subscription.expired`
5. Settings → API Keys → Generate new key pair

**Env vars to collect:**
```
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=   ← the webhook HMAC secret you set in step 4
RAZORPAY_PLAN_ID=plan_...
```

---

## 7. PostHog (Analytics)

**Steps:**
1. Go to [posthog.com](https://posthog.com) → Sign up → Cloud (US or EU)
2. Create project: `EaseCab`
3. Copy the **Project API key** and **Host**

**Env vars to collect:**
```
# Frontend
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Backend (optional server-side events)
POSTHOG_API_KEY=phc_...
```

---

## 8. Sentry (Error Tracking)

**Steps:**
1. Go to [sentry.io](https://sentry.io) → Sign up → Free plan
2. Create two projects:
   - Project 1: Platform = **Next.js** → Name: `easecab-web`
   - Project 2: Platform = **Node.js (Express)** → Name: `easecab-api`
3. Copy DSN for each

**Env vars to collect:**
```
# Frontend
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Backend
SENTRY_DSN=https://...@sentry.io/...
```

---

## 9. Google Play Developer Account

**Steps:**
1. Go to [play.google.com/console](https://play.google.com/console)
2. Sign in with Google account → Pay $25 registration fee
3. Complete developer profile (name, email, phone)
4. Note: needed only for Phase 8 (TWA submission) — no rush

---

## 10. UptimeRobot (Uptime Monitoring)

Set up after the app is deployed and domains are live.

**Steps:**
1. Go to [uptimerobot.com](https://uptimerobot.com) → Free plan
2. Add monitors after deployment:
   - `https://easecab.com` (HTTP, 5 min interval)
   - `https://api.easecab.com/ping` (HTTP, 5 min interval)
3. Alert contacts: add your email + WhatsApp (via Telegram or email bridge)

---

## VPS Setup (Contabo)

Run these on the Contabo VPS when you reach Phase 1 Step 3.

### Node.js (via nvm)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node -v   # should be v20.x
```

### Redis
```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # should return PONG
# Bind to localhost only (redis.conf):
# bind 127.0.0.1 -::1
```

### PM2
```bash
npm install -g pm2
pm2 startup    # follow the printed command to set up auto-start on reboot
```

### Nginx
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
# Config files go in /etc/nginx/sites-available/
# Create: easecab.com, api.easecab.com, admin.easecab.com
# (full Nginx config written during deployment phase)
```

### Certbot (SSL)
```bash
sudo apt install certbot python3-certbot-nginx -y
# Run after Nginx is configured with your domain names:
sudo certbot --nginx -d easecab.com -d www.easecab.com -d api.easecab.com -d admin.easecab.com
```

### Firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
# Do NOT expose 3000, 4000, 5000, 6379 publicly — Nginx proxies them
```

### Daily DB Backup Cron
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash
# Configure R2: rclone config → new remote → S3-compatible → Cloudflare R2
# Then add cron:
crontab -e
# Add: 0 3 * * * pg_dump $DATABASE_URL | gzip | rclone rcat r2:easecab-backups/backup_$(date +\%Y\%m\%d).sql.gz
```

---

## Complete Environment Variables Reference

Create `.env` files for each package. **Never commit these.**

### `packages/api/.env`
```env
# Database
DATABASE_URL=
DIRECT_URL=

# Redis
REDIS_URL=redis://127.0.0.1:6379

# JWT
JWT_SECRET=           # generate: openssl rand -hex 64
JWT_EXPIRES_IN=7d
ADMIN_JWT_SECRET=     # different from JWT_SECRET: openssl rand -hex 64
ADMIN_JWT_EXPIRES_IN=7d

# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=easecab-public
R2_PRIVATE_BUCKET=easecab-private
R2_PUBLIC_URL=https://cdn.easecab.com

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_ID=

# Surepass
SUREPASS_CLIENT_ID=
SUREPASS_CLIENT_SECRET=
SUREPASS_BASE_URL=https://kyc-api.surepass.io

# Sentry
SENTRY_DSN=

# PostHog (server-side)
POSTHOG_API_KEY=

# App
NODE_ENV=production
PORT=4000
CORS_ORIGINS=https://easecab.com,https://admin.easecab.com
```

### `apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=https://api.easecab.com

# Firebase (public keys — safe in frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Analytics / Monitoring
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=
```

### `apps/admin/.env.local`
```env
NEXT_PUBLIC_API_URL=https://api.easecab.com
NEXT_PUBLIC_SENTRY_DSN=
```

### `packages/bot/.env`
```env
DATABASE_URL=
REDIS_URL=redis://127.0.0.1:6379
WA_SESSION_PATH=./sessions
NODE_ENV=production
```

---

## Pre-Coding Checklist

Before writing the first line of code, confirm:

- [ ] Surepass onboarding submitted (start immediately — 2–3 day delay)
- [ ] GitHub remote created and `main` branch pushed
- [ ] Supabase project created (Pro plan, Singapore region, pg_trgm enabled)
- [ ] Firebase project created (Auth + Firestore + FCM configured)
- [ ] Cloudflare R2 buckets created (public + private + backups)
- [ ] PostHog project created
- [ ] Sentry projects created (web + api)
- [ ] All collected env vars added to GitHub Actions secrets
- [ ] `.env` template files copied locally (fill in as keys arrive)

Razorpay and Google Play can wait — Razorpay needs Privacy Policy + T&C live first.

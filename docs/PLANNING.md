# EaseCab Web App — Planning Document
> Last updated: 2026-05-29
> Purpose: Context handoff for Claude sessions — read this before any planning or coding session.
> Status: PLANNING PHASE COMPLETE — all decisions locked. Next step: tech stack finalization.

---

## ⚠️ SESSION RULE (Always Active)

**Update this file at the end of every response that changes, confirms, or adds any decision, architecture detail, or feature spec.** This file is the single source of truth across sessions. If it's not in here, the next session won't know it.

---

## 1. What Is This Project

**EaseCab** is a taxi ride leads platform for India (Punjab / Haryana / Delhi NCR first, then all-India) taxi operators and drivers.

Built on top of an existing WhatsApp bot business. The web app is a **new channel for new users** — existing WhatsApp subscribers are NOT being migrated.

- Domain: **easecab.com**
- App type: **PWA** published to Play Store via **TWA (Trusted Web Activity)**
- iOS: PWA via Safari "Add to Home Screen" (no App Store submission for MVP)

---

## 2. The Existing Bot Business (DO NOT BREAK THIS)

### Project: `whatsapp-taxi-bot-oracle-v2`
Path: `C:\Users\ACER\OneDrive\Desktop\whatsapp-taxi-bot-oracle-v2`

- Runs 2 WA bot numbers (bot-admin + bot-taxi) via Baileys
- Listens to 82+ source WhatsApp groups
- Filters: taxi keywords + phone number + not blocked
- Extracts pickup city only (11 cities)
- Routes to: free group / paid all-area group / city-specific groups
- Runs on Contabo VPS via PM2
- Currently only bot-admin instance active

**Zero changes to this bot. Ever.**

### Project: `whatsapp-taxi-bot-multibot`
Path: `C:\Users\ACER\OneDrive\Desktop\whatsapp-taxi-bot-multibot`

- Has `extractCities()` → returns `{ pickup, drop, allCities }`
- 7-pass extraction with context-aware false positive prevention
- **Port this logic into easecab-bot**

---

## 3. Data Flow Architecture

```
82+ Punjab source groups
         │
         ▼
whatsapp-taxi-bot-oracle-v2   ← zero changes
         │
         ▼
"12.ALL AREA DUTY" WhatsApp group
  (mixed-state: Punjab, Haryana, HP, Rajasthan — this is fine and desirable)
         │  easecab-bot joins as regular member
         ▼
easecab-bot (new lightweight service, separate WA number already prepared)
  → extractCities()      (pickup + drop, ported from multibot)
  → extractVehicleType() (keyword-based)
  → extractPhoneNumber() (new utility)
  → cityResolver.resolve()
  → dedup check (fingerprint, same logic as oracle-v2)
  → db.writeRide()
         │
         ▼
PostgreSQL on Contabo VPS
         │
    api.easecab.com (Express, port 4000)
         │
    easecab.com (Next.js PWA, port 3000)
    Nginx + Let's Encrypt SSL
    [Play Store via TWA]
```

---

## 4. All Confirmed Decisions

| Decision | Choice |
|---|---|
| App name | **EaseCab** |
| Domain | **easecab.com** |
| Price | **₹149/month**, single plan |
| App type | PWA → Play Store via TWA (Bubblewrap CLI or PWABuilder) |
| iOS | Safari PWA install, no App Store for MVP |
| oracle-v2 changes | **Zero** |
| App-bot source | Joins "12.ALL AREA DUTY" as regular member |
| App-bot codebase | New standalone service (`easecab-bot/`) inside backend repo |
| Backend | Separate Express API (api.easecab.com) + Next.js PWA |
| Database | PostgreSQL + Prisma |
| Auth | Phone OTP only, no passwords |
| OTP provider | **Firebase Authentication** (Google handles DLT/TRAI — no registration needed) |
| Subscription model | **7-day full-access trial** → pay ₹149/month to continue |
| After trial / expired | Soft gate only: user can browse everything, action blocked at Call/WhatsApp tap |
| Subscription period | 30 days from payment date (NOT calendar month) |
| Subscription renewal | **Stacks** — renewing early adds 30 days on top of current expiry |
| Expired/lapsed users | Can browse, soft gate fires at contact action → "Renew to continue" |
| Payment provider | Razorpay (individual route until incorporated, then upgrade) |
| Verification provider | **Surepass** (Aadhaar OTP + DL + RC) |
| Verification gate for posting | Must have submitted at least one verification doc |
| Verification gate for contacting | **None** — subscription only (trial or active) |
| Verified badge | Admin approval required |
| Ride dedup | Fingerprint-based in easecab-bot (same logic as oracle-v2) |
| Language toggle | UI labels only, ride message text stays raw |
| Punjabi language | **Gurmukhi script** (Noto Sans Gurmukhi font), NOT Roman Punjabi |
| Support button | WhatsApp link to your support number |
| Settings | Merged into Profile tab |
| Membership/Subscription UI | Section within Profile tab |
| Escrow | Future feature, verified app-posted rides only |
| Razorpay onboarding | Individual route now, upgrade when incorporated |
| VPS config | During deployment phase |
| Admin panel | admin.easecab.com (separate subdomain), 2 people managing for MVP |
| Admin notifications | All three: in-panel + email + WhatsApp when pending verifications arrive |
| Real-time chat | **Firebase Firestore** (1:1 chat per ride contact, offline sync) |
| Chat images | Yes — image sharing supported in chat |
| Chat after ride expires | Read-only (no new messages), never deleted |
| File storage | **Cloudflare R2** (zero egress, S3-compatible, global CDN) |
| Feed real-time | SSE push (rides are time-sensitive) |
| Reverse geocoding | Custom Haversine on cities table (no API needed, we have lat/lng) |
| Rate limiting | Redis on VPS (OTP + API endpoints) |
| Session auth | JWT (7-day expiry, httpOnly cookie), concurrent devices allowed |
| Account deletion | Soft-delete with 30-day recovery window |
| My Rides — Contacted Rides | Accessible to ALL logged-in users (no verification required) |
| Soft gate philosophy | Show everything always. Block only at the action point with upgrade/verify prompt. |

---

## 5. Navigation Structure (FINAL — LOCKED)

### Bottom Navigation (4 tabs)
```
[🚗 Rides]   [📋 My Rides]   [➕ Post]   [👤 Profile]
```

- **Rides** — feed of bot rides + verified rides (sub-tabs)
- **My Rides** — your posted rides + rides you contacted
- **Post** — post a verified ride (verification soft gate at submit button)
- **Profile** — profile details + verification + subscription/membership + settings + logout

### Top Bar (all tabs)
```
[EaseCab]    [💬 Messages (unread count)]    [🌐 Lang]    [💬 Support]
```
Messages icon opens chat list. Visible to all logged-in users; shows empty state if no chats yet.

### Rides Tab (top to bottom)
```
TopBar:        [EaseCab]  [💬 Messages]  [🌐 Lang]  [💬 Support]
Sub-tabs:      [Rides]    [Verified Rides]
FilterBar:     [All] [Delhi] [Chandigarh] [Amritsar] [+ More]
Trial/expiry banner (when applicable): "3 days left in your trial — Upgrade"
Feed:          Ride cards (SSE real-time push)
```

**Rides sub-tab:** Bot-forwarded rides. Anyone can browse. Gate fires only at Call/WhatsApp tap.
**Verified Rides sub-tab:** App-posted rides. Anyone can browse. Gate fires at Call/WhatsApp (subscription) or when tapping Post (verification doc required).

### My Rides Tab
```
Sub-tabs:  [Posted Rides]   [Contacted Rides]
```
- **Posted Rides:** Rides you posted on the app. CRUD: mark done, delete, repost. Requires verification (soft gate if not verified).
- **Contacted Rides:** Rides (bot + verified) where you've unlocked contact. Accessible to ALL logged-in users. Chat button on contacted verified rides.

### Post Tab
- Shows the post form to everyone.
- On submit: if no verification doc submitted → show soft gate modal "Submit verification to post rides" → link to Profile → Verification.
- If verified: posts normally.

### Profile Tab
- Profile section: photo, name, phone (non-editable), base city, vehicle type, languages
- Verification section: Aadhaar OTP + DL upload + RC upload + status badges. Note in UI: "Aadhaar OTP goes to your Aadhaar-linked mobile number, which may differ from your EaseCab number."
- Membership section: trial status / plan status, expiry, subscribe/renew, payment history
- Notification settings: city preferences (multiple, manageable), push toggles
- Language preference (English / ਪੰਜਾਬੀ / हिंदी / Hinglish)
- Logout

### First Screen (app open)
Login screen → phone number → OTP → new user: profile setup (name + base city + vehicle type) → Feed → push notification permission prompt shown after user views 2-3 rides (not immediately on launch).

---

## 6. Ride Card Specs

### Bot-scraped ride (Rides sub-tab)
```
┌──────────────────────────────────────────────┐
│  5 min ago                    [🟢 Fresh]     │
│                                              │
│     DELHI           →         CHANDIGARH     │
│                                              │
│  🚐 Tempo Traveller                          │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ "Bhai chandigarh chaloge? CP se      │   │
│  │  kal subah ████████████"             │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [WhatsApp]  [📞 Call]  [🚩 Report]          │
└──────────────────────────────────────────────┘
```

Status chip (top right):
- 🟢 Fresh (0–5 min)
- 🔵 Booked (5–30 min) — still visible, marked as likely taken
- Hidden after 30 min (removed from feed)

### App-posted ride (Verified Rides sub-tab)
```
┌──────────────────────────────────────────────┐
│  Just now                      [✅ Verified] │
│                                              │
│     DELHI           →         CHANDIGARH     │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ 👤  Rajinder Singh                   │   │
│  │     Ludhiana · Tempo Traveller · ✓   │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  🚐 Tempo Traveller  ·  ₹2,500  ·  6 Jan    │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ "Need traveller kal subah 6 baje"    │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [WhatsApp]    [📞 Call]      [🚩 Report]    │
└──────────────────────────────────────────────┘
```

### Card rules
- Timestamp: relative ("Just now" / "5 min ago" / "2h ago" / full date >24h)
- Cities: pickup left → drop right; if drop null, show pickup only
- Phone NEVER in message text — only via Call/WhatsApp buttons
- Soft gate at Call/WhatsApp: trial expired / not subscribed → bottom sheet "Renew to contact"
- Report: bottom sheet → reason chips + optional screenshot (max 5MB)
- No counter shown on buttons (trial = full access, paid = full access, no 5-limit anymore)

---

## 7. Post a Ride Form (Post Tab)

Fields:
- Pickup city (required, searchable)
- Drop city (required, searchable)
- Vehicle type (required, predefined list)
- Date + Time (required)
- Fare/Amount (optional)
- Special note (optional)
- Contact number (auto-filled from profile, editable)

Gate: Soft — form is visible. Blocked only at submit if no verification doc submitted.
After posting: ride appears in Verified Rides feed + in poster's My Rides > Posted.
Edit after posting: NOT allowed. Only delete + repost.
Max active posts: no limit defined for MVP.

---

## 8. Vehicle Type Extraction (easecab-bot)

| Display label | Keywords |
|---|---|
| Sedan | dzire, etios, amaze, city, aspire, tigor, sedan |
| Innova | innova, crysta |
| SUV | fortuner, scorpio, xuv, harrier, safari, ertiga, suv |
| Urbania | urbania, force urbania |
| Tempo Traveller | tempo, traveller, 12 seater, 14 seater, 17 seater |
| Bolero | bolero, bolero camper |
| Bus | bus, coach, mini bus, 20 seater, 24 seater |
| Auto | auto, e-rickshaw, tuk tuk |

Unrecognized → `null` (blank on card).

---

## 9. Tech Stack (FINAL — LOCKED)

### Core Services

| Layer | Service | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | Industry standard, SSR, PWA-ready |
| State / data | TanStack Query | Server state management, caching |
| Backend API | Node.js + Express | Familiar, lightweight, runs on VPS |
| ORM | Prisma | Type-safe, migrations, works with any PostgreSQL host |
| Database | **Supabase PostgreSQL** (Pro plan, $25/month) | Managed PostgreSQL, auto-backups, dashboard, connection pooling. Standard PostgreSQL underneath — zero lock-in, export SQL dump anytime. |
| Cache + rate limiting | **Redis on VPS** | In-memory, fast, no external cost. OTP limiting, API rate limiting, city list cache. |
| Real-time ride feed | **SSE** (Server-Sent Events via Express) | One-directional, lightweight. Ride updates pushed to clients as new bot rides arrive. |
| OTP / Auth | **Firebase Authentication** | Google handles TRAI/DLT compliance in India — no DLT registration needed. Free up to 10k OTPs/month. Phone-only auth. |
| Real-time chat | **Firebase Firestore** | Best-in-class real-time chat: offline sync, ordering guarantees, built-in pagination. Free tier: 50k reads/day, 20k writes/day. |
| Push notifications | **Firebase Cloud Messaging (FCM)** | Always free. Works for Android TWA + Chrome PWA. Same Firebase project as Auth + Firestore. |
| File storage | **Cloudflare R2** | Zero egress fees (vs ₹10/GB on S3/Firebase). S3-compatible API — migrate to AWS S3 with 3 config lines. 10GB free, ₹1.27/GB after. Global CDN via Cloudflare. |
| Payments | **Razorpay Subscriptions** | India-first, auto-renew subscriptions, HMAC webhook verification. |
| Verification | **Surepass** | Aadhaar OTP (UIDAI), DL (SARATHI), RC (Vahan). |
| Analytics | **PostHog** | Open source. Free 1M events/month cloud. Funnel analysis for trial→paid conversion — critical for this business model. |
| i18n | next-i18next | English, ਪੰਜਾਬੀ (Gurmukhi), हिंदी, Hinglish |
| Punjabi font | Noto Sans Gurmukhi (Google Fonts) | Standard Gurmukhi script rendering |
| Reverse geocoding | Custom Haversine on cities table | Zero API cost. cities table has lat/lng — find nearest city by distance formula. |
| Play Store | TWA via Bubblewrap CLI | Official PWA-to-Android packaging |

### Infrastructure

| Layer | Service | Why |
|---|---|---|
| Hosting (compute) | **Contabo VPS** (Ubuntu, 7.8GB RAM, 72GB disk) | Already running oracle-v2 bot. Handles all services at MVP scale. |
| Process manager | **PM2** | Manages all Node.js processes. ecosystem.config.js per service. |
| Reverse proxy | **Nginx + Let's Encrypt** | Routes subdomains, terminates SSL. Auto-renew via Certbot. |
| CDN + DDoS | **Cloudflare** (free tier) | DNS, DDoS protection, proxies all traffic. |
| CI/CD | **GitHub Actions** | Push to main → auto-deploy to VPS via SSH. Free 2,000 min/month. |
| Monitoring (uptime) | **UptimeRobot** (free) | Alerts via WhatsApp/email if easecab.com or api goes down. |
| Error tracking | **Sentry** (free) | Catches frontend + API exceptions. Free 5k errors/month. |
| DB backups | **pg_dump → Cloudflare R2** via cron | Daily at 3 AM. 30-day retention. rclone CLI with R2 S3 endpoint. |

### Process Map (Contabo VPS)

```
Nginx (80/443)
├── easecab.com        → Next.js :3000    (PM2)
├── api.easecab.com    → Express :4000    (PM2)
└── admin.easecab.com  → Admin   :5000    (PM2)

PM2 process list:
├── oracle-v2-bot      (existing — untouched)
├── easecab-bot        (new — Baileys WA listener)
├── express-api        (port 4000)
├── nextjs-app         (port 3000, Next.js standalone build)
├── admin-panel        (port 5000)
└── cron-worker        (ride status transitions + DB cleanup)

Redis             :6379  (local only, not exposed)
```

External services (config only, no infra to manage):
Supabase · Firebase · Cloudflare R2 · Razorpay · Surepass · PostHog

---

## 10. Server Specs (Contabo VPS)

```
RAM: 7.8GB total, ~5.5GB available
Disk: 72GB, ~60GB free
OS: Ubuntu
Running: oracle-v2 bot via PM2
Firewall: confirm ports 80 + 443 open during deployment
Redis: ~100MB RAM, runs on VPS alongside everything else
```

---

## 10a. Cost Breakdown

### One-time costs
| Item | Cost |
|---|---|
| Google Play Developer account | $25 (~₹2,100) |
| Domain easecab.com (if not yet bought) | ₹800–1,200/year |
| App icon design | ₹1,500–5,000 |
| **Total one-time** | **~₹5,000–9,000** |

### Monthly operating cost at MVP (0–500 users)
| Service | Cost | Notes |
|---|---|---|
| Contabo VPS | ~₹1,700 | Already paying — not a new cost |
| Supabase Pro | $25 = ~₹2,100 | Required — free tier pauses DB after 1 week inactivity |
| Firebase Auth | ₹0 | Free up to 10k OTPs/month |
| Firebase Firestore | ₹0 | Free: 50k reads/day, 20k writes/day |
| Firebase FCM | ₹0 | Always free |
| Cloudflare R2 | ₹0 | Free 10GB, zero egress |
| Redis (on VPS) | ₹0 | Existing RAM |
| PostHog | ₹0 | Free 1M events/month |
| UptimeRobot + Sentry | ₹0 | Free tiers |
| Surepass verifications | ~₹1,500–2,500 | ₹15–25 per verified user × ~100 new/month |
| Razorpay fees | 2% of revenue | Comes from revenue |
| **Total new monthly spend** | **~₹3,600–4,600/month** | Excluding VPS already paid |

### Revenue vs cost projection
| Paid subscribers | Revenue | Infra cost | Margin |
|---|---|---|---|
| 100 | ₹14,900 | ~₹4,200 | ₹10,700 |
| 500 | ₹74,500 | ~₹6,000 | ₹68,500 |
| 1,000 | ₹1,49,000 | ~₹9,000 | ₹1,40,000 |
| 3,000 | ₹4,47,000 | ~₹25,000 | ₹4,22,000 |

---

## 10b. Scaling Plan

### Stage 1: MVP (0–500 users) — No changes
Everything runs on Contabo VPS. Firebase free tiers cover all usage. No architecture changes.
**Cost: ~₹3,600–4,600/month new spend**

### Stage 2: Growth (500–3,000 users) — Minor upgrades only
Firebase Firestore may exceed free read/write limits if chat is very active.
| What changes | Why | Cost impact |
|---|---|---|
| Firebase Spark → Blaze plan | Pay-as-you-go beyond free limits | +₹1,000–3,000/month |
| Cloudflare R2 storage grows | Profile pics multiply | +₹200–500/month |
| VPS upgrade to 16GB RAM if needed | Bot + API + Redis + Next.js competing for RAM | +₹1,500/month |

**Cost: ~₹8,000–12,000/month**

### Stage 3: Scale (3,000–10,000 users) — First architecture decisions
| What changes | How |
|---|---|
| Separate VPS for oracle-v2 bot | Bot and web app on different servers — VPS crash doesn't kill both |
| Supabase read replica | Ride feed + city queries hammer DB; read replica handles read traffic |
| Next.js → Cloudflare Pages or Vercel | CDN-edge rendering, faster globally |
| Redis → Upstash (managed) | Move Redis off VPS to free up RAM |

**Cost: ~₹20,000–35,000/month. Revenue at 3,000 subscribers = ₹4,47,000/month.**

### Stage 4: Production (10,000+ users) — Infrastructure overhaul
Full cloud migration: AWS RDS (multi-AZ PostgreSQL), containerized API (Docker + ECS), managed Redis (ElastiCache), Ably or AWS AppSync replacing Firestore for chat at scale. This is a 2–3 month engineering project justified by revenue at this stage.

### Multi-provider vs all-in AWS — decision rationale
AWS all-in at MVP costs ₹10,000–15,000/month (EC2 + RDS + ElastiCache + CloudFront). Current multi-provider stack costs ₹3,600–4,600/month with better or equal reliability per service. AWS all-in makes sense at Stage 4 for enterprise SLA requirements or when managing multiple vendor dashboards becomes a bottleneck. Not before.

Lock-in risk and exit strategy per service:
| Service | Lock-in | Exit |
|---|---|---|
| Supabase | Near zero | pg_dump → any PostgreSQL host |
| Cloudflare R2 | Near zero | Change 3 config lines → AWS S3 |
| Firebase Auth | Medium | Export phone list → re-verify with Auth0/Clerk |
| Firebase Firestore | High | Export JSON → Supabase or MongoDB. Chat is low-stakes data. |
| Firebase FCM | Low | OneSignal or AWS SNS (token format change) |

---

## 10c. Deployment and Management

### CI/CD flow (GitHub Actions)
```
git push to main branch
  → GitHub Actions: npm install → build → type-check → lint
  → SSH into Contabo VPS
  → git pull → npm run build
  → pm2 restart <service>
  → Health check: curl api.easecab.com/ping
  → Notify on fail
```
Setup time: ~2 hours. After that: push code → live in ~2 minutes.

### Database backup cron (runs daily at 3 AM on VPS)
```bash
pg_dump $SUPABASE_DB_URL | gzip | \
  rclone rcat r2:easecab-backups/backup_$(date +%Y%m%d).sql.gz
# Cleanup: keep last 30 days only
```

### SSL renewal
Certbot auto-renews Let's Encrypt certs. Nginx reloads automatically. No manual action needed.

### Monitoring alerts
- UptimeRobot: pings easecab.com + api.easecab.com every 5 min → WhatsApp + email if down
- Sentry: emails on new error types in frontend or API
- PM2: `pm2 monit` for live CPU/RAM view on VPS

---

## 11. Data Model

### `cities`
```sql
id UUID PK, canonical_name VARCHAR, state VARCHAR, district VARCHAR,
type ENUM(metro/city/town/village/landmark), lat DECIMAL, lng DECIMAL,
population INT, is_active BOOLEAN
```

### `city_aliases`
```sql
id UUID PK, city_id UUID FK, alias_text VARCHAR,
source ENUM(migrated/manual/ai/inferred), confidence DECIMAL, created_at TIMESTAMPTZ
```

### `unresolved_city_strings`
```sql
id UUID PK, raw_text VARCHAR, occurrence_count INT,
suggested_city_id UUID FK nullable, reviewed_at TIMESTAMPTZ
```

### `rides` (bot-scraped)
```sql
id UUID PK
raw_text TEXT                  -- original WA message
display_text TEXT              -- raw_text with phone replaced by ████████
pickup_city_id UUID FK, drop_city_id UUID FK
pickup_raw VARCHAR, drop_raw VARCHAR
phone_number VARCHAR           -- never exposed without active subscription
vehicle_type VARCHAR           -- extracted or null
source_group_id VARCHAR, source_group_name VARCHAR
bot_id VARCHAR
received_at TIMESTAMPTZ
created_at TIMESTAMPTZ
status ENUM(fresh/booked/hidden)
expires_at TIMESTAMPTZ         -- 30 min from received_at (feed removal)
db_delete_at TIMESTAMPTZ       -- 12h from received_at (dedup window, then hard delete)
fingerprint VARCHAR            -- dedup key, lives with the row until hard delete
```

### `posted_rides` (app-native, verified rides)
```sql
id UUID PK
posted_by UUID FK(users)
from_city_id UUID FK, to_city_id UUID FK
from_city_raw VARCHAR, to_city_raw VARCHAR
vehicle_type VARCHAR
fare DECIMAL nullable
ride_date DATE, ride_time TIME
phone VARCHAR
notes TEXT
status ENUM(active/done/expired/deleted)
created_at TIMESTAMPTZ
expires_at TIMESTAMPTZ         -- 24h default
is_closed BOOLEAN DEFAULT false
```

### `users`
```sql
id UUID PK
phone VARCHAR UNIQUE
name VARCHAR
profile_pic_url TEXT
base_city VARCHAR
vehicle_type VARCHAR
languages_spoken VARCHAR[]
aadhaar_verified BOOLEAN DEFAULT false
dl_submitted BOOLEAN DEFAULT false
rc_submitted BOOLEAN DEFAULT false
verification_status ENUM(none/submitted/approved/rejected)
license_url TEXT
rc_url TEXT
notification_cities VARCHAR[]    -- cities opted in for push alerts
last_known_city VARCHAR          -- auto-updated from geolocation on app open
is_deleted BOOLEAN DEFAULT false -- soft delete, 30-day recovery
deleted_at TIMESTAMPTZ nullable
created_at TIMESTAMPTZ
```

### `subscriptions`
```sql
id UUID PK
user_id UUID FK
status ENUM(trial/active/expired/halted/cancelled)
trial_started_at TIMESTAMPTZ     -- set at account creation
trial_expires_at TIMESTAMPTZ     -- trial_started_at + 7 days
paid_started_at TIMESTAMPTZ nullable
expires_at TIMESTAMPTZ nullable  -- null during trial; set on first payment; stacks on renewal
razorpay_sub_id VARCHAR nullable
razorpay_plan_id VARCHAR nullable
-- A subscription row is created for EVERY new user at signup (status=trial)
```

### `ride_contacts` (contact history — no longer for limiting, just tracking)
```sql
id UUID PK
user_id UUID FK
ride_id UUID FK nullable           -- bot ride
posted_ride_id UUID FK nullable    -- verified ride
contacted_at TIMESTAMPTZ
UNIQUE(user_id, ride_id)
UNIQUE(user_id, posted_ride_id)
-- Used for: "Contacted Rides" history display
-- No monthly limit anymore — trial = full access, paid = full access
```

### `ride_reports`
```sql
id UUID PK, reporter_id UUID FK(users),
ride_id UUID FK nullable, posted_ride_id UUID FK nullable,
reason ENUM(fake/spam/wrong_info/inappropriate/other),
remarks TEXT, screenshot_url TEXT,
created_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ nullable
```

### `chats`
```sql
id UUID PK
posted_ride_id UUID FK (posted_rides)
initiator_id UUID FK (users)
poster_id UUID FK (users)
created_at TIMESTAMPTZ
last_message_at TIMESTAMPTZ
is_active BOOLEAN DEFAULT true    -- false = read-only (ride expired or completed)
```

### `chat_messages`
```sql
id UUID PK
chat_id UUID FK (chats)
sender_id UUID FK (users)
message_type ENUM(text/image)
message_text TEXT nullable        -- null if image
attachment_url TEXT nullable      -- null if text; image URL (max 10MB)
sent_at TIMESTAMPTZ
read_at TIMESTAMPTZ nullable
```

### `push_subscriptions` (device push tokens)
```sql
id UUID PK
user_id UUID FK
device_token TEXT                -- FCM token OR Web Push subscription JSON
platform ENUM(android/web/ios)
created_at TIMESTAMPTZ
last_seen_at TIMESTAMPTZ
-- Multiple rows per user (user can have multiple devices)
```

### `admin_users`
```sql
id UUID PK, email VARCHAR UNIQUE, name VARCHAR,
password_hash VARCHAR, role ENUM(super/reviewer),
created_at TIMESTAMPTZ
-- Separate from users table — admins are not app users
```

---

## 12. OTP Setup

> Tech choice TBD. Two options being evaluated:
> - **Firebase Auth** (phone OTP): Google handles TRAI/DLT compliance, free up to 10k/month, no DLT registration by us — ELIMINATES the biggest launch blocker
> - **MSG91**: India-specific, DLT registration mandatory (3–7 days), ₹0.15–0.20/OTP, branded sender ID ("EASECB")
> See tech stack discussion.

### Rate limiting (regardless of provider)
- Max 3 OTP requests per phone per hour (enforced in backend via Redis)
- Resend cooldown: 30 seconds
- OTP validity: 5 minutes

---

## 13. Subscription & Payment

### Subscription lifecycle
| State | Behavior | Duration |
|---|---|---|
| `trial` | Full access — can browse + contact everything | 7 days from signup |
| `active` | Full access | 30 days from payment date |
| `expired` | Browse only — soft gate at contact action | Until renewed |
| `halted` | Payment failed — 3-day grace then soft-gate | Razorpay retry window |
| `cancelled` | Browse only | Until renewed |

### Renewal stacking
When user renews while still `active`: new 30 days added on top of `expires_at`. No reset to today.

### Razorpay activation (Individual route — until incorporation)
- Personal PAN + Aadhaar + bank account + cancelled cheque
- Business proof: declaration letter acceptable
- easecab.com must be live with Privacy Policy + T&C (must be done EARLY — Step 3 of build order)
- Activation: 24–48h after docs submitted

### Razorpay webhooks (always verify HMAC signature first)
| Event | Action |
|---|---|
| `subscription.activated` | status=active, paid_started_at=now, expires_at=now+30d |
| `subscription.charged` | expires_at += 30d (stacking) |
| `subscription.halted` | notify user, 3-day grace |
| `subscription.cancelled` | status=cancelled |
| `subscription.expired` | status=expired |

---

## 14. Verification Flow (Surepass)

Surepass onboarding: 2–3 day process. Start early — blocker for verified ride posting feature.
⚠️ Risk: Surepass may require incorporated entity for full API access. Confirm during onboarding.

### Aadhaar OTP
User enters Aadhaar number → Surepass API → OTP sent to Aadhaar-linked mobile (may differ from EaseCab phone — UI note shown) → verify → `aadhaar_verified=true`

### Driver License
User enters DL number + uploads photo → Surepass checks SARATHI → admin reviews photo → approve/reject

### RC (Vehicle Registration)
User enters vehicle number + uploads RC photo → Surepass checks Vahan → admin reviews → approve/reject

### Gates
- Post a ride: `dl_submitted=true` OR `aadhaar_verified=true` (at least one)
- Verified badge: `verification_status=approved` (admin approved)
- Contact rides: active trial or paid subscription only

---

## 15. Push Notifications

| Trigger | Who | Notes |
|---|---|---|
| New ride in selected city | Active or trial users who opted in | Based on `notification_cities` |
| Trial expiring | Trial users | 2 days before trial ends: "Your trial ends in 2 days" |
| Membership expiring | Active subscribers | 3 days before expiry |
| Verified ride expiring | Poster | 6h before 24h auto-clear |
| Verification approved | User | Admin approved |
| Verification rejected | User | Admin rejected + reason |
| Your ride was contacted | Poster of verified ride | "[Name] is interested in your Delhi → Chandigarh" |
| New chat message | Chat participant | "[Name]: [message preview]" |

### Location-based setup
1. Push notification permission: requested after user views 2–3 rides (not on launch)
2. Geolocation permission: requested at same time
3. On allow: reverse geocode via Haversine to nearest city from our cities table
4. Prompt: "You're in Ludhiana — want ride alerts for this city?" → user confirms → saved to `notification_cities`
5. In-app banner (app open): "X new rides in Ludhiana in the last 10 min" (live query)
6. Push (app closed): server triggers when rides land in user's saved cities

---

## 16. In-App Chat

Chat is only between **verified users**, tied to a specific verified posted ride.

### How chat is created
1. Verified user taps Call or WhatsApp on a verified posted ride
2. `chats` row created: initiator + poster + posted_ride_id
3. Poster gets push: "[Name] is interested in your Delhi → Chandigarh ride"
4. Both access chat via Messages icon (top bar) or My Rides → ride → Chat

### Chat rules
- 1:1 per contact event per ride (multiple contactors = multiple separate chats for poster)
- Real-time delivery (tech TBD — Firebase Firestore or Socket.io)
- Images supported: max 10MB per image, storage TBD
- Read receipts: yes (single/double tick like WhatsApp)
- After ride expires/completed: chat becomes **read-only** (`is_active=false`), never deleted
- Admin can view chats for dispute resolution
- Report: users can flag a chat message (reason + screenshot)
- Block: user can block another user from a chat (prevents future chat creation)

### Chat access points
- Top bar Messages icon → chat list → individual thread
- My Rides → Contacted Rides → tap a verified ride → Chat button
- My Rides → Posted Rides → tap a ride → see all chats from contactors

---

## 17. Onboarding Flow

```
App open
  → Login screen (phone number input, +91 locked)
  → OTP sent (6-digit, 5min validity, max 3 attempts, resend after 30s)
  → New user:
      Profile setup: name (required) + base city (required) + vehicle type (optional)
      → Feed (trial started, trial_started_at = now, trial_expires_at = now + 7d)
  → Returning user:
      → Feed directly

Trial active banner: "7 days free trial — X days remaining"
Trial expiry warning (2 days before): push + in-app banner "Your trial ends in 2 days"
Trial expired: soft gate shows at contact action → bottom sheet "Subscribe ₹149/month to continue"
Subscription trigger: hit gate OR tap Upgrade anywhere → Profile tab (Membership section) → Razorpay
Payment success: active subscription + PWA install prompt shown (if not already installed)
```

---

## 18. Ride Lifecycle Summary

### Bot rides
| Time | Status | Visible in feed |
|---|---|---|
| 0–5 min | 🟢 Fresh | Yes |
| 5–30 min | 🔵 Booked | Yes (marked as likely taken) |
| 30 min | Hidden | No — removed from feed |
| 12h | Hard deleted | Row removed from DB (fingerprint gone, dedup window ends) |

### Verified (app-posted) rides
- Active until: poster marks done OR 24h auto-clear
- 6h before auto-clear: push notification to poster
- Repost available from My Rides → Posted Rides
- Cannot be edited — only delete + repost

---

## 19. City Resolution Architecture

Resolution layers (in order):
1. In-memory Map cache (~0ms) — refreshed every 5 min
2. Exact alias match in DB
3. pg_trgm fuzzy match (similarity > 0.4 threshold — covers typos like "dlli", "chadigarh")
4. Unknown → `unresolved_city_strings` queue → admin reviews → alias added → auto-resolves pending rides

Seeding: India Census 2011 (7,935+ cities, pop >5,000) + existing alias JS file from multibot.

---

## 20. PWA → Play Store (TWA)

Requirements:
1. HTTPS + Web App Manifest + Service Worker + `/.well-known/assetlinks.json` on domain
2. Build AAB: Bubblewrap CLI or PWABuilder.com
3. Google Play Developer account: $25 one-time
4. Play Store listing: Privacy Policy URL, T&C URL, 3+ screenshots, feature graphic, app icon

iOS-specific (Safari PWA):
- `apple-touch-icon` meta tags
- `apple-mobile-web-app-capable` meta tag
- `apple-mobile-web-app-status-bar-style`
- iOS has no TWA equivalent — full-screen add-to-homescreen only

Updates: web app changes are instant (no store update). Store update only for TWA shell changes (rare).

---

## 21. Admin Panel (admin.easecab.com)

Separate subdomain. Password-protected, admin_users table only.

### MVP features
- Pending verifications queue: DL + RC submissions awaiting review (approve/reject with notes)
- Ride reports queue: flagged rides, review + action (remove ride, ban user)
- User management: view, ban, unban users
- Chat moderation: view any chat thread for dispute resolution
- Unresolved city strings: review + map to canonical city
- Basic stats dashboard: signups, active trials, active subscriptions, rides/day

### Admin notifications (all three channels)
- In-panel: notification badge on pending queue items
- Email: alert to admin email on new submission
- WhatsApp: message to admin WhatsApp on new pending item

---

## 22. Pre-Launch Checklist

- [ ] **Surepass onboarding** (2–3 days — start early, confirm individual vs entity requirement)
- [ ] **Privacy Policy + T&C pages** (needed EARLY for Razorpay — do in first build sprint)
- [ ] **Razorpay document submission** (24–48h after Privacy Policy + T&C live)
- [ ] **Google Play Developer account** ($25 one-time)
- [ ] **Firebase project setup** (Auth + Firestore + FCM + project config)
- [ ] **Supabase project** (Pro plan $25/month — create before launch, free tier pauses)
- [ ] **Cloudflare R2 bucket** setup (public bucket for profile pics, private for documents)
- [ ] App icon + branding assets (being designed)
- [ ] Nginx: open ports 80 + 443 on Contabo VPS firewall
- [ ] GitHub Actions CI/CD pipeline configured
- [ ] UptimeRobot + Sentry accounts created
- [ ] pg_dump → R2 backup cron configured on VPS
- [ ] DLT registration: **NOT NEEDED** — using Firebase Auth which handles this

---

## 23. Open Questions

**All planning and tech stack decisions are fully resolved and locked.**
No pending decisions remain. Ready to begin implementation.

---

## 24. Build Order

1. Privacy Policy + T&C pages (needed for Razorpay — do this FIRST)
2. DB schema finalization + Prisma migrations
3. PostgreSQL setup on VPS + seed cities (Census 2011 + alias file)
4. Redis setup on VPS
5. CityResolverService
6. easecab-bot (Baileys listener + extraction + dedup + DB write)
7. Add app-bot number to "12.ALL AREA DUTY" WA group
8. Cron jobs: bot ride status (fresh→booked @5min, hide @30min, delete @12h)
9. Express API: auth/OTP, rides feed (SSE), subscriptions, Razorpay webhooks, Surepass
10. Chat layer (Firestore OR Socket.io — depends on tech decision)
11. Next.js PWA: login → rides feed → my rides → post → profile
12. Chat UI: Messages icon + chat list + thread
13. Push notifications (FCM or Vapid): city alerts, trial/expiry, chat messages
14. Location-based city suggestion flow (geolocation → Haversine → city prompt)
15. Admin panel (admin.easecab.com)
16. i18n (English, ਪੰਜਾਬੀ, हिंदी, Hinglish)
17. PWA manifest + service worker + offline support
18. TWA build → Play Store submission

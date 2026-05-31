# CLAUDE.md — EaseCab Project Rules

Read this file completely at the start of every session before writing any code.

---

## 1. PROJECT OVERVIEW

EaseCab is a production-grade PWA for taxi ride leads in India (Punjab/Haryana/Delhi NCR). Drivers/vendors only — no passengers.

**Stack:** Next.js 14 (App Router) + Tailwind + shadcn/ui, Express API, Supabase PostgreSQL Pro + Prisma ORM, Redis on VPS, Firebase Auth (phone OTP) + Firestore (chat) + FCM (push), Cloudflare R2 (files), Razorpay (subscriptions), Surepass (KYC), SSE (ride feed), TanStack Query, PostHog analytics, next-i18next.

**Language:** JavaScript (`.js` / `.jsx`) — no TypeScript. Zod handles all runtime validation.

**Infra:** Contabo VPS (Ubuntu, 8GB RAM) — Nginx + Let's Encrypt + PM2. CI/CD via GitHub Actions.

**Key facts:**
- 7-day full-access trial → ₹149/month (30-day rolling, stacks on renewal)
- Soft gate philosophy: users see everything; gates fire only at the action point
- `oracle-v2` (production WA bot on VPS) — **NEVER TOUCH. EVER.**

---

## 2. MONOREPO STRUCTURE

```
easecab/
├── apps/
│   ├── web/           → Next.js 14 PWA (easecab.com)
│   └── admin/         → Admin panel (admin.easecab.com)
├── packages/
│   ├── api/           → Express API (api.easecab.com, port 4000)
│   ├── bot/           → easecab-bot (Baileys WA listener)
│   └── shared/        → Zod schemas, constants, utils
├── docs/
│   ├── PLANNING.md    → Master planning doc (update every session)
│   └── DECISIONS.md   → Locked architectural decisions log
├── .github/workflows/
├── CLAUDE.md
└── ecosystem.config.js  → PM2 process map
```

Feature-first structure inside every app/package:
`features/auth/`, `features/rides/`, `features/chat/`, `features/profile/`, `features/subscription/`, `features/verification/`, `features/admin/`

Each feature folder is self-contained: components, hooks, services, tests.
**Never create top-level `components/`, `hooks/`, or `utils/` folders.**

---

## 3. ABSOLUTE NON-NEGOTIABLES

1. **Never modify oracle-v2.** Zero changes, ever.
2. **Zod validation on every external input.** API bodies, WA message parsing, env vars — all go through Zod schemas in `packages/shared/schemas/`. No raw access.
3. **Env vars validated at startup via Zod.** Process exits immediately on failure.
4. **All API responses follow this exact shape always:**
   `{ success: boolean, data?, error?: { code, message }, meta?: { page?, total? } }`
5. **All routes under `/api/v1/` prefix.**
6. **JWT in httpOnly cookies only.** Never localStorage or sessionStorage.
7. **Razorpay webhooks: verify HMAC signature before any processing.**
8. **File uploads: validate MIME type and size server-side.** Never trust Content-Type from client.
9. **All schema changes via Prisma migrations only.** Never alter DB directly.
10. **Never log PII:** phone numbers, OTPs, Aadhaar, JWT tokens, payment details.
11. **Surepass and Razorpay secrets in backend only.** Never in frontend bundle.
12. **Cloudflare R2: serve via presigned URLs only.** Never expose the bucket directly.

---

## 4. CODE QUALITY

- Max function: 40 lines. Max file: 300 lines. Split by responsibility beyond these limits.
- **Layers:** Route handler (validate input) → Service (business logic) → Repository (DB/cache only). No cross-layer leakage.
- No DB queries outside repository layer. No business logic in route handlers.
- No magic strings or numbers — all constants in `packages/shared/constants/`.
- Async/await everywhere. No `.then()` chains.
- Every catch block either re-throws, logs, or both. Never swallow silently.

---

## 5. JAVASCRIPT & VALIDATION

- Strict equality always: `===` / `!==`. Never `==` or `!=`.
- No implicit globals. ESLint enforced on every file.
- All external inputs validated with Zod schemas in `packages/shared/schemas/`. Zod is the only type safety layer — never skip it.
- All fixed value sets as frozen constant objects in `packages/shared/constants/` — e.g., `Object.freeze({ FRESH: 'fresh', BOOKED: 'booked' })`. No bare magic strings.
- Add JSDoc comments on all service and repository functions so IDE autocomplete works without TypeScript.
- Prisma client used in JavaScript mode — rely on Zod schemas (not Prisma types) for input validation.

---

## 6. SECURITY

- Rate limiting on every public endpoint via Redis. OTP: max 3/phone/hour, 30s resend cooldown, 5min validity.
- Input sanitization: strip/escape all user strings before DB write.
- Parameterized queries always — Prisma handles this, never use raw SQL with string interpolation.
- Admin JWT: separate secret and separate httpOnly cookie from user JWT.
- Admin routes check `admin_users` table — never the `users` table.
- CORS: whitelist `easecab.com`, `api.easecab.com`, `admin.easecab.com` only. No wildcard in production.
- Helmet.js on Express.
- File size limits enforced server-side: profile pics 5MB, KYC docs 10MB, chat images 10MB.

---

## 7. DATABASE

- Migrations are forward-only (roll-forward): to undo a change, write a NEW migration that reverses it. Never edit or delete an already-applied migration, and never alter tables directly. (Vanilla Prisma does not generate `down` migrations — see DECISIONS.md.)
- Required indexes: all foreign keys, `users.phone`, `rides.fingerprint`, status columns on rides/subscriptions, `expires_at` on time-sensitive tables, `created_at` on high-volume tables.
- Ride fingerprints in separate `ride_fingerprints` table with 12h TTL (was 48h — changed 2026-05-31, see DECISIONS.md) — never deleted when the ride row is deleted.
- Soft delete for users: `is_deleted` + `deleted_at`. Hard delete after 30 days via cron.
- Never expose raw Prisma errors to API responses — catch and map to `AppError`.
- Connection pooling via Supabase pgBouncer. No direct connections from bot or cron worker.

---

## 8. API DESIGN

- RESTful: GET read, POST create, PATCH update, DELETE remove.
- All list endpoints paginated from day one. Cursor-based preferred; offset for admin only.
- Error codes: `AUTH_REQUIRED`, `SUBSCRIPTION_EXPIRED`, `VERIFICATION_REQUIRED`, `RATE_LIMITED`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
- HTTP status codes used correctly: 200, 201, 400, 401, 403, 404, 409, 422, 429, 500.
- Every endpoint documented in `docs/API.md` as it is built, not after.

---

## 9. ERROR HANDLING & LOGGING

- Express: single global error handler middleware. All errors propagate via `next(err)`.
- `AppError` class: `constructor(code, message, statusCode)` — used for all thrown errors.
- Next.js: `error.jsx` + Sentry for capture.
- **Logging (pino):** structured JSON. Every request logs method, path, statusCode, responseTime. Every error logs code, message, stack (server only). Attach `requestId` (UUID) to every request.
- User-facing error messages are generic. Detail in server logs only.

---

## 10. TESTING

- Unit tests for all Service layer functions. Integration tests for all Express routes (supertest).
- Tests in `__tests__/` next to the file they test. Naming: `feature.service.test.js`, `feature.route.test.js`.
- Coverage target: 70% minimum on `packages/api/features/` service files.
- CI blocks deploy if tests fail.
- Separate test DB — never test against production Supabase.
- Mock Firebase, Razorpay, Surepass in tests — no real API calls.

---

## 11. GIT & CI/CD

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `perf:`.
- Never commit to `main`. Feature branches only.
- Branch naming: `feature/rides-feed`, `fix/otp-rate-limit`, `chore/prisma-migration`.
- PR pipeline: install → lint → test → build. All must pass before merge.
- Deploy on push to main: build → SSH to VPS → git pull → build → pm2 restart → health check `GET api.easecab.com/ping`.
- Never store secrets in code or committed `.env` files. Use GitHub Actions secrets.

---

## 12. REAL-TIME (SSE + Firestore)

**SSE (ride feed):**
- One endpoint: `GET /api/v1/rides/stream`
- 30s heartbeat ping to keep connections alive through Nginx.
- Auth via JWT cookie check on connect.
- New ride → emit to all connected clients → TanStack Query cache invalidation.
- Clean up EventSource on client disconnect immediately.

**Firestore (chat):**
- All collection/document path strings as constants in `packages/shared/constants/firestore.js`. Never hardcode inline.
- Security rules: users can only read/write their own chat documents.
- Chat read-only (`is_active=false`) when ride expires — enforced in both Firestore security rules and API.

---

## 13. PWA & TWA

- Lighthouse PWA score: 90+ before Play Store submission.
- Web App Manifest: all required icon sizes (72, 96, 128, 144, 152, 192, 384, 512px).
- Service Worker: cache app shell, show offline fallback page when network unavailable.
- `/.well-known/assetlinks.json`: correct SHA-256 fingerprint from release keystore.
- **Release keystore: generate once, back up securely. Losing it = app can never be updated on Play Store.**
- iOS meta tags required: `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`.

---

## 14. I18N

- Zero hardcoded strings in JSX files. All through `t()`.
- Key format: `namespace.feature.element` — e.g., `rides.card.freshLabel`, `auth.otp.sentMessage`.
- Punjabi: **Gurmukhi script only.** Never Roman Punjabi. Font: Noto Sans Gurmukhi via `next/font`.
- Locales: `apps/web/public/locales/{en,pa,hi,hinglish}/`.

---

## 15. PERFORMANCE

- SSE: 30s heartbeat, exponential backoff reconnect on client.
- Redis cache: city list (5min TTL), subscription status (5min TTL). Invalidate on write.
- TanStack Query stale times: ride feed = 0 (SSE-driven), user profile = 5min.
- Always `next/image` — never raw `<img>` tags.
- Add `EXPLAIN ANALYZE` as a comment on heavy DB queries before merging.

---

## 16. BUILD ORDER

Follow this sequence strictly — never skip ahead.

1. Privacy Policy + T&C pages ← **do this first** (required for Razorpay activation)
2. Prisma schema + all migrations + seed script (cities from Census 2011 + alias file)
3. PostgreSQL + Redis setup on VPS, connections verified
4. `packages/shared` — Zod schemas, constants, AppError class
5. CityResolverService (4-layer: cache → exact alias → pg_trgm fuzzy → unresolved queue)
6. `packages/bot` — easecab-bot (Baileys, extractCities, extractPhone, dedup, DB write)
7. Cron worker — ride status transitions (fresh→booked @5min, hide @30min, hard delete @12h)
8. `packages/api` — Express setup, global error handler, pino logger, Redis client, auth middleware
9. Auth routes — send-otp, verify-otp, refresh, logout
10. Rides routes — paginated list + SSE stream + contact
11. Subscription routes + Razorpay webhook handler
12. Verification routes + Surepass integration
13. Posted rides routes
14. Chat routes + Firestore setup
15. Push notification service (FCM) + city-based targeting
16. `apps/web` — Next.js setup, Tailwind, shadcn/ui, TanStack Query, i18n config
17. Login flow UI (phone input → OTP → profile setup → feed)
18. Rides feed UI (SSE connection, ride cards, filter bar, sub-tabs)
19. My Rides UI (posted + contacted tabs)
20. Post a Ride UI (form + soft gate)
21. Profile tab UI (profile, verification, membership, settings, logout)
22. Chat UI (message icon, chat list, thread, image support)
23. Push notification permission flow (after 2-3 rides viewed, geolocation → city suggestion)
24. `apps/admin` — verifications queue, reports, user management, city strings
25. PWA manifest + service worker + offline fallback
26. i18n translations (English complete first, then Punjabi, Hindi, Hinglish)
27. TWA build (Bubblewrap CLI), assetlinks.json, Play Store submission prep

---

## 17. SESSION RULES

**Start of every session:**
1. Read `docs/PLANNING.md` fully before writing any code.
2. Read `docs/DECISIONS.md` — never change a locked decision without flagging the conflict explicitly first.
3. State which Build Order step you are working on.

**End of every session:**
1. Update `docs/PLANNING.md` with any new decisions, confirmations, or architecture details.
2. Update `docs/DECISIONS.md` if any new decisions were locked this session.
3. Summarize: what was built, what was tested, what the next session starts with.

**When unsure between two approaches:** state both options, flag which aligns with locked decisions, ask before implementing. Never assume.

---

## 18. /PROJECT SKILL — CHECKPOINT SYSTEM

Every project session uses `/project`. It auto-detects mode: **SETUP** (new), **ONBOARD** (existing, no checkpoints), **RESUME** (checkpoint files found).

**Three mandatory checkpoint files:**

| File | Purpose | When Updated |
|---|---|---|
| `GOAL.md` | Project goal, tech stack, key decisions, decisions log | Written once from Opus architecture. Append decisions as they're made. |
| `PHASES.md` | Full phase roadmap with ✅/⏳/⬜ status | Only when phases change or complete |
| `PROGRESS.md` | Live session log with RESUME block | **After EVERY response, no exceptions** |

**PROGRESS.md RESUME block format (overwrite on every response):**
```
<!-- RESUME_START -->
## ⚡ RESUME FROM HERE
Project: EaseCab | Phase: [X/N] | Task: [current task]
Last did: [one sentence — what was just completed]
Next: [specific next action + exact file path]
Blocked: [No | Yes — exact reason]
Git: branch=[branch] | commit=[hash]
<!-- RESUME_END -->
```

**Scope changes** — when asked for something not in PHASES.md:
1. Acknowledge explicitly: "This isn't in the current plan — adding it now."
2. Add to PHASES.md under current phase (small) or as new phase (large).
3. Update PROGRESS.md RESUME block.
4. Append to `## Decisions Log` in GOAL.md: `[YYYY-MM-DD] Scope: Added [x]. Reason: user requested.`
5. Then implement. Never implement out-of-plan work silently.

---

## 19. CRG-CLI PROTOCOL

CRG provides 8-49× token savings vs reading raw files. Use for any project with 5+ files.

**Command:**
```
python "C:/Users/ACER/OneDrive/Desktop/Claude Skills/crg-cli.py" <cmd> --repo <path>
```

| When | Command | Purpose |
|---|---|---|
| Phase start | `impact --repo .` | See which files a change will touch before touching anything |
| Task start | `context --task "..." --repo .` | Pull focused context for current task only |
| After large changes | `build --repo .` + `embed --repo .` | Refresh graph + semantic index |
| Onboarding existing project | `build` + `arch` + `embed` | Full snapshot |

- Run via **Bash tool only** — never MCP tools (they hang).
- If CRG unavailable: fall back to `git log`, `Grep`, and targeted `Read` on specific files.
- After any scope change that adds or removes files: rebuild CRG graph.

---

## 20. ORCHESTRATOR PROTOCOL

Classify every task before starting. Route by complexity. Never skip classification.

| Class | Route | Triggers |
|---|---|---|
| **HEAVY** | Opus subagent | Architecture decisions, multi-file refactors changing data flow, complex debugging (3+ failed attempts), security audits, DB schema design, planning for 5+ interconnected files |
| **STANDARD** | Sonnet (self) | Feature implementation, tests, bug fixes with clear cause, API integration, single-file work, code review |
| **LIGHT** | Haiku subagent | File renames/moves, formatting, boilerplate/config generation, simple git ops — **no code logic** |

**Rules:**
- Doubt between HEAVY/STANDARD → handle yourself. Escalate to Opus only when reasoning genuinely exceeds capability.
- Doubt between STANDARD/LIGHT → handle yourself. Haiku only for purely mechanical work.
- One request can have multiple subtasks at different levels — decompose first, route each piece separately.
- Target distribution: ~70% Sonnet, ~20% Haiku, ~10% Opus. Over 20% Opus = over-escalating.
- Don't spawn subagents for 30-second tasks — handoff overhead (~500–1000 tokens) exceeds the savings.
- **Haiku never writes code.** Even simple one-file code tasks go to Sonnet minimum.
- When starting a phase with 5+ interconnected files, suggest `/model opusplan` — Opus designs, Sonnet writes, better output per token than full Opus throughout.

**Skills sequence every session:**
```
orchestrator → brainstorming → writing-plans → TDD (red→green→refactor)
[DB change?] → db-review   [UI work?] → ui-ux-pro-max
→ verification-before-completion → review-changes
[pre-PR] → security-review → pr-ready
```

---

## 21. CODE DISCIPLINE

**Think before coding — surface confusion early, not after mistakes.**
- State assumptions explicitly before starting. If multiple interpretations exist, present them — don't pick silently.
- If something is unclear, stop and ask. Don't implement a guess and hope it's right.
- If a simpler approach exists, say so. Push back when a request would produce unnecessary complexity.

**Simplicity first — minimum code that solves the problem.**
- No features beyond what was asked. No speculative abstractions.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for scenarios that genuinely can't happen.
- If it could be 50 lines and you wrote 200, rewrite it.

**Surgical changes — touch only what the task requires.**
- Don't "improve" adjacent code, comments, or formatting that isn't broken.
- Don't refactor things outside the scope of the current task.
- Match existing file style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it without asking.
- Every changed line should trace directly back to the user's request.

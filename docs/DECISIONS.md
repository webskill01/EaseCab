# EaseCab — Locked Decisions Log

All architectural decisions that are final and must never be changed without explicit discussion.

---

## Locked Before Coding

| Date | Decision | Reason |
|---|---|---|
| 2026-05-30 | JavaScript (JSX only) — no TypeScript. Zod is the validation layer. | Developer preference; Zod provides runtime safety at all boundaries. |
| 2026-05-30 | oracle-v2 WhatsApp bot — zero changes ever. | Production bot with paying subscribers. New `easecab-bot` joins the shared group as a separate process. |
| 2026-05-30 | Firebase Auth for phone OTP (not MSG91/DLT). | Google handles TRAI/DLT compliance. Eliminates 3-7 day DLT registration blocker. |
| 2026-05-30 | Supabase PostgreSQL Pro as primary database. | Managed PostgreSQL, auto-backups, pgBouncer, zero lock-in (standard SQL). |
| 2026-05-30 | Cloudflare R2 for file storage (not Firebase Storage). | Zero egress fees vs ₹10/GB on Firebase Storage. S3-compatible API. |
| 2026-05-30 | Firebase Firestore for in-app chat. | Best-in-class real-time 1:1 chat: offline sync, ordering guarantees. |
| 2026-05-30 | SSE (Server-Sent Events) for ride feed real-time push. | One-directional, lightweight. Rides are pushed; no need for bidirectional WebSocket. |
| 2026-05-30 | 7-day full-access trial → ₹149/month (30-day rolling, stacks on early renewal). | Previous free-tier model removed; trial converts better; stacking prevents churn. |
| 2026-05-30 | Soft gate philosophy: show everything, gate only at action point. | Maximizes perceived value before asking for payment or verification. |
| 2026-05-30 | Ride fingerprints in separate `ride_fingerprints` table, 48h TTL, survive ride deletion. | Dedup integrity requires fingerprint to outlive the ride row. |
| 2026-05-30 | JWT in httpOnly cookies only (user + admin use separate secrets + cookies). | Security. Admin checks `admin_users` table — never `users` table. |
| 2026-05-30 | Multi-provider over all-in AWS at MVP. | 2-4× cheaper at current scale. AWS all-in justified only at Stage 4 (10,000+ users). |
| 2026-05-30 | 27-step build order is strict — never skip ahead. | Privacy Policy ships first (Razorpay activation gate); backend before frontend; bot before API. |

---

## Decisions Made During Implementation

<!-- Append here as implementation decisions are locked. -->
<!-- Format: | YYYY-MM-DD | Decision | Reason | -->

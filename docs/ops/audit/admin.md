# Admin Dashboard Audit
**Date:** 2026-06-23  
**Scope:** `apps/admin/**` — read-only  
**Auditor:** Claude Code (Sonnet 4.6)

---

## Screen Inventory

| Route | Server component | Client component | Data source |
|---|---|---|---|
| `/admin/providers` | `providers/page.tsx` | `ProvidersClient.tsx` | `supabaseAdmin.from('providers')` + `profiles` join |
| `/admin/jobs` | `jobs/page.tsx` | `JobsClient.tsx` | `supabaseAdmin.from('jobs')` + Realtime channel |
| `/admin/claims` | `claims/page.tsx` | `ClaimsClient.tsx` | `supabaseAdmin.from('claims')` |
| `/admin/trust-scores` | `trust-scores/page.tsx` | `TrustScoresClient.tsx` | `supabaseAdmin.from('providers')` composite_score_* |
| `/admin/users` | `users/page.tsx` | `UsersClient.tsx` | `supabaseAdmin.from('profiles')` + `auth.admin.listUsers` |

All routes are marked `export const dynamic = 'force-dynamic'` — correct, no stale caches.

---

## 1. Auth and Access Control

### What is in place
- `lib/auth.ts → getAdminSession()` fetches the session using the user's cookie via the anon-key client, then re-checks `profiles.role = 'admin'` via the service-role client. Both checks must pass.
- `app/admin/layout.tsx` calls `requireAdmin()` which hard-redirects to `/sign-in` if either check fails. This wraps **every** `/admin/*` route in a single choke point.
- Sign-in uses Supabase `signInWithPassword` via a Server Action — no client-side token handling.
- Sign-out is also a Server Action calling `auth.signOut()`.

### Gaps

**G1 — Missing middleware CSRF/session protection (HIGH)**  
There is no `middleware.ts` in `apps/admin/`. The layout `requireAdmin()` guard runs only when Next.js renders a page. Direct `POST` calls to Server Actions (`/admin/claims`, `/admin/providers`) skip the layout entirely and hit the action with only cookie auth. Server Actions verify the service-role key, not the session, so `overrideVerificationTier`, `approveAndRefund`, and `denyClaim` could be invoked by a non-admin if they can craft a raw POST to the RSC endpoint.  
**Fix:** Add `middleware.ts` that runs `getAdminSession()` on every `/admin` path and redirects unauthenticated requests. This is a one-file fix.

**G2 — Trust-score override action does call `requireAdmin()`, but claims actions do not (HIGH)**  
`lib/actions/trust-scores.ts → overrideTrustScore` calls `requireAdmin()` at the top. None of the claims actions (`markUnderReview`, `approveAndRefund`, `denyClaim`, `markResolved` in `lib/actions/claims.ts`) do. They rely solely on the service-role client operating unguarded. Any authenticated Supabase user who knows the Server Action endpoint and a claim UUID can trigger an escrow release.  
**Fix:** Add `await requireAdmin()` at the top of each claims server action.

**G3 — Admin user provisioning is manual and undocumented in runbook (LOW)**  
`.env.local.example` has a SQL comment: `update profiles set role='admin' ...`. There is no migration, seed script, or ops runbook entry. First deployment will silently fail with a 302 loop until someone manually patches the DB.

---

## 2. Real Supabase Wiring vs Stubs

### Fully wired (real queries)
- **Providers queue** — reads `providers` table + `profiles` join for owner name/email. Maps `verification_tier` and `valid_to` to a computed status.
- **Jobs board** — reads `jobs` with nested `providers` and `profiles` FK selects. Realtime channel on the `jobs` table for live updates.
- **Claims** — reads `claims` with FK selects for provider, job, homeowner. Actions hit the `release-escrow` Edge Function (real HTTP call).
- **Trust scores** — reads `composite_score_*` columns from `providers`. Override writes back and inserts into `trust_score_overrides`. Override history is queried lazily.
- **Users** — reads `profiles` and `auth.admin.listUsers` for `last_sign_in_at`.

### Stubs / incomplete

**S1 — User drawer "Reset password" button is a UI shell (MEDIUM)**  
`UsersClient.tsx` line ~120: `<Button variant="outline" size="sm">Reset password (sends email)</Button>` — no `onClick`, no server action, no Supabase `auth.admin.generateLink` call. Clicking it does nothing.

**S2 — User drawer "Activity" section is a hardcoded placeholder (LOW)**  
The section reads: _"Job history and bookings appear here once the Supabase queries are wired (§8)."_ — this is dead copy, not conditional rendering based on whether data exists.

**S3 — Sidebar nav captions are hardcoded dummy stats (LOW)**  
"weekly queue: 14", "weekly volume: 142", "active today: 28" — all static strings in `Sidebar.tsx`. These never update and will mislead operators immediately on launch.

**S4 — Realtime job updates lose homeowner/provider names (MEDIUM)**  
`JobsClient.tsx` handles `postgres_changes` events and synthesises an `AdminJob` from the raw `jobs` row. The `jobs` table row has no inline homeowner name or provider name — those come from FK joins in the initial `fetchJobs` query. When a Realtime INSERT fires, the updated row hard-codes `homeowner: '—'` and `providerName: '—'`. Jobs that arrive via Realtime (new bookings) will show blank parties until the page is refreshed.

---

## 3. Data-Fetching Patterns

### Pattern used
All five screens use the same pattern: Server Component fetches data with service-role client → passes to `'use client'` component as props. This is correct for Next.js 14 App Router.

### Issues

**D1 — No error boundary on server data fetches (HIGH)**  
Every `page.tsx` awaits its fetch and throws on error (e.g. `throw error` in `fetchProviders`). There is a `app/admin/error.tsx` file, but it is a generic Next.js error boundary. If `fetchProviders` throws (Supabase down, env var missing, network error), the entire `/admin/providers` page crashes to a red error screen. This is acceptable in dev; in production it exposes the error message including Supabase query details.  
**Fix:** Wrap each fetch in a try/catch and return an empty array with a toast/banner rather than throwing to the boundary.

**D2 — Jobs page passes anon key to a client component as a prop (LOW, intentional but risky)**  
`jobs/page.tsx` explicitly passes `supabaseAnonKey` as a prop to `JobsClient`. The comment says it's safe. It is safe today, but if a future developer adds a protected Realtime channel (e.g. filtered by user ID), they might reuse this pattern and accidentally expose the service-role key. A safer pattern is to initialise the Realtime client in a utility that reads from `NEXT_PUBLIC_SUPABASE_ANON_KEY` directly.

**D3 — No pagination on any table (MEDIUM)**  
All fetch functions query with `.order(..., { ascending: false })` and no `.limit()` or `.range()`. With 1,000+ providers, jobs, or users the admin page will time out or return a massive payload. Add pagination (or at minimum `.limit(200)`) before production launch.

**D4 — `fetchUsers` calls `auth.admin.listUsers` with `perPage: 1000` (MEDIUM)**  
This caps the visible user list at 1,000 and silently drops the rest. The function does not loop over pages. At scale this is a data integrity issue for the users screen.

---

## 4. Claims → Escrow Flow

The claim resolution path (`approveAndRefund`, `denyClaim`) does three async steps:
1. Resolve `claim → job → booking → payment` via three sequential Supabase queries.
2. POST to the `release-escrow` Edge Function.
3. Update the `claims` row.

**C1 — No idempotency guard on escrow release (HIGH)**  
If the Edge Function call succeeds but the subsequent `claims` update fails (step 3), the admin will see the claim still in "submitted" state and may retry. A second call to `release-escrow` with the same `paymentId` could trigger a double refund or double payout. The Edge Function (`release-escrow`) may handle idempotency internally, but there is no evidence of that in the admin layer — and the admin client has no retry guard.  
**Fix:** Check `claims.status` inside `approveAndRefund` before calling the Edge Function; if already `'approved'`, return early.

**C2 — `callReleaseEscrow` falls back to the service-role key as a Bearer token (MEDIUM)**  
`lib/actions/claims.ts`: `const token = session?.access_token ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;` — if the session has expired (admin left a tab open overnight), the Edge Function is called with the service-role key, which bypasses its own `role='admin'` auth check. This is a secret-in-transit risk if the Edge Function is also reachable externally.

---

## 5. Production-Readiness Gaps (Priority Order)

| # | Severity | Gap | File | Fix size |
|---|---|---|---|---|
| 1 | **Critical** | Claims server actions have no `requireAdmin()` guard | `lib/actions/claims.ts` | ~1 line each |
| 2 | **Critical** | No `middleware.ts` — Server Actions unguarded by layout auth | (missing file) | ~20 lines |
| 3 | **High** | No idempotency check before escrow release | `lib/actions/claims.ts → approveAndRefund` | ~5 lines |
| 4 | **High** | Error throws on data fetch crash the page with Supabase error details | `lib/actions.ts` | wrap in try/catch |
| 5 | **Medium** | Realtime job updates lose homeowner/provider names | `app/admin/jobs/JobsClient.tsx` | re-fetch on INSERT or hydrate from initial list |
| 6 | **Medium** | No pagination — all tables unbounded | `lib/actions.ts` all fetch fns | `.limit()` + cursor |
| 7 | **Medium** | `auth.admin.listUsers` does not paginate beyond 1,000 | `lib/actions.ts → fetchUsers` | loop pages |
| 8 | **Medium** | "Reset password" button is a no-op stub | `UsersClient.tsx` | wire `auth.admin.generateLink` |
| 9 | **Medium** | `callReleaseEscrow` falls back to service-role key as Bearer | `lib/actions/claims.ts` | remove fallback, require valid session |
| 10 | **Low** | Sidebar stats are hardcoded strings | `components/Sidebar.tsx` | query or remove |
| 11 | **Low** | User drawer "Activity" section is placeholder copy | `UsersClient.tsx` | conditional render or remove |
| 12 | **Low** | No admin provisioning runbook | ops docs | SQL migration + seed script |

---

## 6. What Is Solid

- Auth architecture (session cookie → role check → service-role admin queries) is correct and clean.
- Server Action pattern is used consistently; no data mutations happen from the client directly.
- Trust-score override has `requireAdmin()`, audit trail insert, optimistic UI, and live preview — the most complete flow in the dashboard.
- `supabase-server.ts` lazy singleton with explicit error on missing env vars is production-safe.
- `force-dynamic` on all page routes prevents stale SSG data.
- Claims UI (SLA counter, photo grid, approve/deny inline panels) is production-quality. The missing guard is a one-line fix, not a rework.

# Messaging System — Notes & Plan (2026-06-22)

## Part 1 — Current DB layer (verified live, Supabase zkkingzdbbbriwyxbxkf)

**`messages` table** (the only messaging table — no conversations/threads/participants entity):
- `id uuid pk`, `job_id uuid NOT NULL`, `from_user_id uuid NOT NULL`, `from_role text`, `body text NOT NULL`, `sent_at timestamptz default now()`, `read_at timestamptz`
- A "thread" = all messages for a `job_id`.

**RLS (solid foundation):**
- INSERT `messages_participant_insert`: `from_user_id = auth.uid() AND is_job_participant(job_id)`
- SELECT `messages_participant_read`: `is_job_participant(job_id)`
- UPDATE `messages_participant_update`: `is_job_participant(job_id)` (for read_at)
- `is_job_participant(job_id)` = current user is the job's homeowner OR assigned_tech OR a provider-team member. Correct participant scoping.

**Realtime:** `messages` IS in the `supabase_realtime` publication → `postgres_changes` works.
**Index:** `idx_messages_job (job_id, sent_at)` → good for per-thread ordering / keyset pagination.
**Row count:** 0.

### Implication — the core design gap
Messages require a `job_id` (NOT NULL). So:
- You can only message **within a booked job**. There is **no pre-booking inquiry messaging** (homeowner can't message a provider from the profile before booking). This is exactly why "Message <provider>" dead-ends to an empty Inbox.
- No conversation list entity → the Inbox must aggregate jobs-that-have-messages.

## Part 2 — Online research (best practices, cited)

- **Realtime channel choice**: `postgres_changes` runs an RLS check per subscriber per change → doesn't scale to large fan-out; **Broadcast** is recommended for high-throughput. For a **2-party job thread it's totally fine** — keep postgres_changes now, note Broadcast as the scale path. RLS is enforced on realtime (never filter on the client). [Supabase Realtime docs]
- **Delivery semantics**: exactly-once is impractical over mobile networks → design for **at-least-once + dedup via stable message IDs** (idempotent on client & server). [Ably, educative]
- **Dedup**: every message gets a **client-generated UUID** at creation; recipients/sender ignore IDs already seen. This is the fix for optimistic-echo duplicates. [grokking, systemdesignhandbook]
- **Ordering**: per-conversation order via `sent_at` (+ id tiebreak); composite index `(job_id, sent_at)` already exists. [getstream]
- **Optimistic UI**: append immediately with the client id (WhatsApp-style), reconcile on server ack, **revert/mark-failed on error with a retry affordance**; persist a retry queue with backoff. [Stream, MUI, Medium]
- **Unread counts**: per-message `read_at` (have it) → sum unread for an **inbox-tab badge**; cursor/last-read is the alternative. [masteringbackend]
- **Pagination**: **keyset/cursor** (by sent_at/id), never offset. [getstream]
- **Security/abuse**: RLS participant-only (have it); pre-booking DMs are a **spam/abuse surface** — gate them.

## Part 4 — Implementation plan (subagent-driven)

**Global constraints:** real Supabase only (no hardcoded/demo data); Reanimated (never core Animated); match existing `lib/api/messages.ts` + `realtime.ts` patterns; preserve the participant RLS model; keep changes surgical (karpathy).

**Task 1 — DB migration (idempotent dedup):** add `messages.client_id uuid` + partial unique index `(from_user_id, client_id) where client_id is not null`. Additive, safe. Verify: apply + conflict-insert dedups.

**Task 2 — API layer (`messages.ts`):** `send()` accepts/sends `client_id`, upsert-on-conflict (idempotent); add keyset pagination to `listForJob`; expose `clientId` on the Message type. Verify: tsc clean, logic review.

**Task 3 — Thread UI reliability (homeowner + provider `thread/[id].tsx`):** optimistic append (status sending→sent), dedup vs realtime echo by `client_id`, failed state + tap-to-retry. Verify on sim: instant bubble, no dupes.

**Task 4 — Inbox reachability + unread badge:** inbox-tab unread badge (homeowner) summing thread unread; add a Provider **Inbox tab** (currently no nav path); give tech role a messages entry. Verify on sim.

**Task 5 — Pre-booking messaging (headline gap)** [sequenced last; larger]: allow homeowner↔provider conversation before a job. Approach TBD after Tasks 1–4 (likely nullable `job_id` + `homeowner_id/provider_id` on messages, or a `conversations` table, with RLS + spam gating). If scope/risk too high, flag as a scoped follow-up rather than rush it.

**Verification:** sign up a NEW provider via the app UI, then (since `provider-onboard` does NOT create a `provider_service_areas` row) add a service-area row for zip 45246 so the homeowner can discover/book them; homeowner books → real job; exchange live messages both ways on the sim → screenshot. (If Task 5 pre-booking lands, they can message without a job.)

## VERIFIED (2026-06-22) ✅
Real two-way conversation on the sim between a UI-signed-up provider (ayman.0704m@gmail.com / Marcus Greene) and the existing homeowner (ayman.m0704) over a shared job — 3 real messages persisted in Supabase + cross-delivered. Screenshot sent to user.
- **Bug caught live & fixed:** `genClientId` fallback produced a non-UUID (`c-…`) which the `uuid` client_id column rejected → send failed (and my "Failed, tap to retry" UI correctly fired). Fixed with a proper RFC-4122 v4 fallback (Hermes has no `crypto.randomUUID`). Re-verified: new sends persist WITH client_id.
- Two gotchas: Metro was left in CI mode (reloads disabled) from the QA run → restarted without CI to load new code. Supabase auth email rate-limited the provider OTP → admin-confirmed the test email + reset test password (messages themselves 100% real via app).
- Test infra created via SQL (provider id `bbbbbbbb-…-a000-…`, booking `…-b000-…`, job `…-c000-…`) + provider auth account a03bb0a3 — for cleanup.

## Execution status (2026-06-22)
- ✅ Task 1 — migration `messages.client_id` + dedup unique index (applied, verified).
- ✅ Tasks 2–3 — `messages.ts` (clientId + idempotent send on 23505), `realtime.ts` (clientId on echo), new `lib/messaging/useThreadMessages.ts` (optimistic + dedup + tap-to-retry), wired into homeowner + provider `thread/[id].tsx`. `tsc` clean.
- ⏸ Task 4 — DEFERRED: provider already reaches threads (Jobs→job→Message; Profile→inbox). Inbox-tab unread badge = nice-to-have follow-up. Tech messaging out of scope.
- ⏸ Task 5 (pre-booking) — follow-up (needs schema/RLS/spam gating). Implemented dispatch hit API 529s; did Tasks 1–3 directly instead.
- Homeowner inbox web split-pane `ThreadDetail` still uses the old (non-optimistic) path — web-only, follow-up.
- NOTE: changes are in the working tree (not committed — user hasn't asked to commit); Metro hot-reloads them for verification.

**Verification setup fact:** `provider-onboard` edge fn sets providers.{business_name,display_name,service_types} + profile role=provider_owner, valid_to stays NULL. It does NOT set provider_service_areas, composite scores, or verification_tier — add service-area (zip 45246) manually for bookability during the test.

## Part 3 — Current app layer (from code map)

**What already WORKS (job-scoped, real, not stubbed):**
- `lib/api/messages.ts`: `listForJob`, `send`, `markRead`, `listThreadsForHomeowner`, `listThreadsForProvider` — all real direct-table queries.
- Homeowner `inbox.tsx` + `thread/[id].tsx`, Provider `inbox.tsx` + `thread/[id].tsx` — render real data, mark read on mount.
- Realtime: `lib/api/realtime.ts` `subscribeToMessages(jobId)` (INSERT events, `job_id=eq`) → invalidates message + thread queries.
- Unread badge on thread rows. Entry point: job detail → `/thread/[jobId]`.

**GAPS (prioritized):**
1. **Pre-booking messaging missing** (the QA dead-end): provider profile "Message" button (`providers/[id].tsx` ~L631) routes to the generic inbox, not a thread — because messages need a `job_id`. No way to contact a provider before a job exists.
2. **No optimistic UI / dedup**: `send` invalidates + refetches (round-trip latency, no instant echo). On realtime echo there's no dedup vs the just-sent message → risk of fl/dupes. No failed-send retry state. No keyset pagination (loads all messages).
3. **No unread badge on the Inbox TAB** (only per-thread rows).
4. **Provider inbox not in tab bar** — `/(provider)/inbox` exists but no nav path; **tech role has no messaging UI at all**.
5. **Attachments stubbed** (paperclip icon, no handler; no storage/column).
6. No typing/presence; no edge-function send (no server validation/spam guard).

**Decision (karpathy: simplicity, high-impact first):** the DB is sound; focus on what makes it *production-grade* + unblocks the verifiable conversation:
- (A) Client reliability/speed: optimistic send + realtime dedup + failed/retry state + keyset pagination.
- (B) Inbox-tab unread badge + provider inbox tab nav.
- (C) Pre-booking messaging (headline gap) — needs schema (nullable `job_id` or conversations) + RLS; scope carefully.
- Attachments/typing = stretch.

## Part 4 — Implementation plan
> Synthesized from Parts 1–3.

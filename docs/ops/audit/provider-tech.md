# Provider & Tech Role Audit — Code-Level

**Audit date:** 2026-06-23
**Branch:** feat/home-dashboard
**Scope:** READ-ONLY — no code was changed.

---

## 1. Screen inventory

### (provider) route group

| Route | File | Status |
|---|---|---|
| Onboarding / welcome | `onboarding/welcome.tsx` | Real — redirects unauthenticated users to sign-up; authenticated provider_owners go to `business` step |
| Onboarding / business | `onboarding/business.tsx` | Partial — saves to local Zustand store only (no Supabase write here) |
| Onboarding / service-area | `onboarding/service-area.tsx` | Real — local store save; map geocoding works |
| Onboarding / availability | `onboarding/availability.tsx` | Real — calls `onboard()` + `saveServiceArea()` + `saveAvailability()` from `providers` API; writes to Supabase |
| Onboarding / banking | `onboarding/banking.tsx` | Mocked — `MOCK_PAYMENTS = true`; real Stripe Connect onboarding bypassed |
| Onboarding / profile | `onboarding/profile.tsx` | Real — writes `avatar_url`, `bio`, `price_range_*`, `portfolio_photos`, `onboarding_completed_at` to Supabase directly; sets `onboardingComplete` in auth store |
| Verification tier 1 | `onboarding/verification-tier1.tsx` | Real — uploads ID photos to `verification-docs` bucket; invokes `verification-tier1-submit` edge function |
| Verification tier 2 | `onboarding/verification-tier2.tsx` | Unknown without reading — not audited in depth |
| (tabs) / today | `(tabs)/today.tsx` | Mostly real — queries `listForProvider`, maps to today's jobs; **"Start day" CTA is a dead stub (`onPress={() => {}}`)** |
| (tabs) / jobs | `(tabs)/jobs.tsx` | Real for requests, active, completed; job accept/decline call `job-accept` / `job-decline` edge functions; calendar sync is best-effort; tech assignment writes via `crewApi.assignToJob` |
| (tabs) / schedule | `(tabs)/schedule.tsx` | Real — week/month grid from `listForProvider`; blocked-times create/delete wired to `providers` API; month grid uses a flat 35-cell array rooted at week start, not true calendar month |
| (tabs) / earnings | `(tabs)/earnings.tsx` | Mostly real for data fetching — reads `completion_ledger` directly; instant payout mocked (`MOCK_PAYMENTS = true`); "Standard payout" button has no `onPress` |
| (tabs) / profile | `(tabs)/profile.tsx` | Partially real — data read is real; "Edit profile (bio, photos, pricing)", "Service area", "Availability", "Notification preferences", "Preview public profile", and both Verification rows are **dead (no `onPress`)** |
| crew / index | `crew/index.tsx` | Real — reads crew list; "Today's roster" section only shows `role === 'tech'` active members; job count badge reads `todayJobCount` field |
| crew / [id] | `crew/[id].tsx` | Not read in depth — exists |
| crew / invite | `crew/invite.tsx` | Real — RHF+Zod form; calls `crewApi.invite()` which invokes `crew-invite` edge function |
| inbox | `inbox.tsx` | Real — reads `listThreadsForProvider`; threads link to `thread/[id]` |
| thread / [id] | `thread/[id].tsx` | Exists |

### (tech) route group

| Route | File | Status |
|---|---|---|
| (tabs) / today | `(tech)/(tabs)/today.tsx` | Real — queries `listForTech(userId)` which hits `jobs` table filtered by `assigned_tech_id`; shows check-in widget |
| (tabs) / earnings | `(tech)/(tabs)/earnings.tsx` | Real for display — reads `listForTech` completed jobs; shows today/week totals from `amountCents` (gross, not net); **no separate tech payout — intentional by design** |

---

## 2. Edge functions referenced vs. known state

All invocations originate from `lib/api/functions.ts` (`invokeFn` wrapper) or direct `supabase.functions.invoke`.

| Edge function | Called from | Status |
|---|---|---|
| `job-accept` | `jobs.ts / accept()` | Wired — called on accept tap in jobs.tsx; whether the function exists in Supabase project unclear (memory note: ~12 edge functions lost in June rebuild) |
| `job-decline` | `jobs.ts / decline()` | Wired |
| `provider-checkin` | `jobs.ts / submitProviderCheckIn()` | **WIRED IN LIBRARY BUT NEVER CALLED FROM THE UI** — `ProviderCheckIn` component's `submit()` only calls `captureOnCompletion` (payment capture) and `onSubmit?.(payload)`. The calling screens (today.tsx, jobs.tsx) pass no `onSubmit` prop — meaning photo uploads and notes are captured in local state but **never posted to `provider-checkin` edge function or `completion_ledger`** |
| `capture-on-completion` | `payments.ts / captureOnCompletion()` | Called best-effort in `ProviderCheckIn.submit()`; hits `mock-payments` edge function because `MOCK_PAYMENTS = true` |
| `verification-tier1-submit` | `onboarding/verification-tier1.tsx` | Wired — direct `supabase.functions.invoke` call |
| `calendar-sync` | `jobs.tsx / syncCalendar()` | Wired — called best-effort on accept/decline; invokes `calendar-sync` |
| `crew-invite` | `crew.ts / invite()` | Wired |
| `booking-create` | `bookings.ts` | Homeowner side; not provider-triggered |
| `calendar-connect` | `calendar.ts` | Wired on profile screen calendar row |
| `stripe-balance` | `payments.ts` | Wired but gated behind `MOCK_PAYMENTS` flag |
| `mock-payments` | `mockGateway.ts` | Active — all money ops route here |

---

## 3. Critical bugs and gaps

### 3.1 Check-in widget does NOT call `provider-checkin` edge function (P0)

**File:** `components/checkin/ProviderCheckIn.tsx` — `submit()` function (line ~114)

`submit()` fires a 600ms timeout, calls the optional `onSubmit` callback, then calls `captureOnCompletion`. Neither `today.tsx` nor `jobs.tsx` passes an `onSubmit` prop. Therefore:

- Before/after photos are uploaded to storage but their paths are never written to the DB.
- The `provider-checkin` edge function (which writes `job_check_ins`, flips job status to `completed`, triggers trust-score grading) is never invoked.
- `completion_ledger` is only partially populated: `captureOnCompletion` fires but `provider-checkin` does not, so the check-in record is missing.
- The "sacred 15-second check-in" flow appears to work in the UI but silently drops the data.

**Fix needed:** Pass `onSubmit` from both calling screens that calls `jobsApi.submitProviderCheckIn(...)`, or move the `invokeFn('provider-checkin', ...)` call directly into `submit()`.

### 3.2 All Stripe / payout flows are mocked (P0 before revenue launch)

**File:** `lib/payments/mockGateway.ts` — `MOCK_PAYMENTS = true`

Every money operation — provider onboarding, balance fetch, instant payout, payment capture — routes to the `mock-payments` edge function. This is appropriate for dev but must be flipped before any real transaction. The earnings screen shows a balance and "Cash out" button that currently submit to a mock. No safeguard exists to catch this in a production build.

### 3.3 "Start day" button is a dead stub (P1)

**File:** `app/(provider)/(tabs)/today.tsx` line 471

`onPress={() => {}}` — the button renders when the provider has jobs for today but does nothing. Likely intended to batch-set jobs to `en_route` or start a route. Creates user confusion.

### 3.4 Profile screen settings rows have no `onPress` (P1)

**File:** `app/(provider)/(tabs)/profile.tsx`

The following `SettingsRow` calls pass no `onPress`:
- "Edit profile (bio, photos, pricing)"
- "Service area"
- "Availability"
- "Notification preferences"
- "Preview public profile" (Pressable, no handler)
- Tier 1 / Tier 2 verification rows (tapping them does nothing)

These are dead-end taps. A provider who wants to update their bio or re-do verification has no route to do so post-onboarding.

### 3.5 Business onboarding step saves only to local Zustand store (P1)

**File:** `app/(provider)/onboarding/business.tsx`

`onContinue()` calls `setBusiness(...)` on `useProviderOnboardingStore` then pushes to `service-area`. The data (business name, service types, years, employees) stays in memory until the `availability.tsx` step, which calls `onboard()` from `providers` API. If the user taps "Save & exit" after the `business` step and before `availability`, all business data is lost. The store is persisted via `AsyncStorage` (zustand/persist) so it survives a soft restart, but it is not written to Supabase until `availability`.

### 3.6 Tech role has no schedule, no profile, no messages tabs (P1 — design gap)

**File:** `app/(tech)/(tabs)/_layout.tsx`

The tech tab bar has only two tabs: Today and Earnings. There is no:
- **Schedule/calendar** — a tech can't see their assigned week ahead.
- **Profile/settings** — sign-out is exposed directly in the Today screen (a sign-out link embedded in a job list is bad UX and a potential data-loss risk).
- **Messages** — a tech cannot message the homeowner.

The homeowner-side `inbox` for messaging exists; the tech side has nothing.

### 3.7 `listForTech` depends on `assigned_tech_id` column being populated (P1)

**File:** `lib/api/jobs.ts` — `listForTech()`

The tech's today screen only shows jobs where `assigned_tech_id = userId`. Job assignment is an optimistic UI operation in `jobs.tsx` (`crewApi.assignToJob()` writes `assigned_tech_id` directly to the `jobs` table). This path works if the column exists and RLS allows it, but there is no fallback if assignment hasn't occurred — techs see an empty screen. There is also no realtime subscription, so if a provider assigns a job after the tech has already loaded the screen, the tech won't see it without a manual pull-to-refresh (not implemented — the ScrollView has no `refreshControl`).

### 3.8 Earnings screen: tech sees gross `amountCents`, not net (P2)

**File:** `app/(tech)/(tabs)/earnings.tsx`

`todayCents` and `weekCents` sum `job.amountCents` directly. The provider earnings screen applies a 90% net calculation. Techs see the raw job amount, which overstates their earnings if the business owner takes a cut. Design decision needed: is the displayed amount the homeowner's total or the tech's share?

### 3.9 Month view in schedule is not a true calendar month (P2)

**File:** `app/(provider)/(tabs)/schedule.tsx` — `MonthGrid` component

The grid renders 35 cells with `addDays(weekStart, i - today.getDay())`, which produces a fixed 5-week window relative to today's day-of-week, not the actual month boundaries. Days from the previous/next month are not labeled or dimmed. The grid also doesn't scroll forward — there is no month navigation.

### 3.10 Job requests show an `expiresAt` countdown but the field doesn't exist on `jobs` (P2)

**File:** `app/(provider)/(tabs)/jobs.tsx` lines ~120-135

The query for pending requests selects from `jobs` but the schema note in a comment confirms `jobs` has no `expires_at` column. The code falls back to `new Date(Date.now() + 300_000).toISOString()` — a fixed 5-minute future timestamp set at query time. This countdown resets every time the query refetches, is not persisted, and is meaningless across sessions. There is no real expiry mechanism on the `booked` status.

---

## 4. Missing screens vs. homeowner parity

| Feature | Homeowner | Provider | Tech |
|---|---|---|---|
| Onboarding wizard | Yes (booking wizard) | Yes (6 steps) | None — techs are invited in, no self-onboarding |
| Inbox / messages | Yes | Yes | **Missing** |
| Schedule / calendar view | Implicitly via booking history | Yes (week + month) | **Missing** |
| Profile edit post-onboarding | Yes (account settings) | Dead stubs | **Missing** |
| Notification preferences | Yes | Dead stub | **Missing** |
| Push token registration | Yes | **Not verified** | **Not verified** |
| Claim submission | Yes (homeowner-checkin) | N/A | N/A |
| Check-in | Homeowner check-in | Provider check-in (widget exists) | Tech uses same ProviderCheckIn widget |
| Realtime job updates | Homeowner polling via query | No realtime subscription | No realtime subscription |

---

## 5. Nav path integrity

### Provider onboarding flow

`welcome` → `business` → `service-area` → `availability` → `banking` → `profile`

The layout's `STEPS` array matches these 6 routes. The back button and progress bar are correct. "Save & exit" always jumps to `/(provider)/(tabs)/today` regardless of step — acceptable.

However: `verification-tier1` and `verification-tier2` are **outside the onboarding `STEPS` array** and have no tab bar. They are only reachable from the profile screen's verification rows — which currently have no `onPress`. This means **Tier 1 and Tier 2 verification are unreachable post-onboarding**.

### Provider tabs

Today → check-in widget (modal, works)
Jobs → Requests/Active/Completed segments (works)
Jobs → thread/[id] (wired via `router.push`)
Profile → crew (wired)
Profile → inbox (wired)
Profile → edit/service-area/availability/notifications — **dead**

### Tech tabs

Today → check-in widget (works)
Earnings → list (works)
No nav to messages, schedule, or profile edit.

---

## 6. Data hooks compliance (per CLAUDE.md non-negotiables)

| Hook | Status |
|---|---|
| `completion_ledger` write on check-in | **Broken** — `provider-checkin` not called; only `captureOnCompletion` fires (mock) |
| `demand_events` write on search | Outside scope (homeowner); provider side has no search |
| RLS | Not audited here (DB-level) |
| Operator Graph temporal columns | Not audited here (DB-level) |

---

## 7. Priority summary

| Priority | Issue | File(s) |
|---|---|---|
| P0 | `provider-checkin` edge function never invoked from check-in widget — data silently dropped | `components/checkin/ProviderCheckIn.tsx`, `app/(provider)/(tabs)/today.tsx`, `app/(provider)/(tabs)/jobs.tsx` |
| P0 | `MOCK_PAYMENTS = true` — all Stripe/payout calls route to mock | `lib/payments/mockGateway.ts` |
| P1 | Post-onboarding profile edit, service-area, availability, verification — all dead stubs | `app/(provider)/(tabs)/profile.tsx` |
| P1 | Verification tier 1/2 screens unreachable post-onboarding | `app/(provider)/(tabs)/profile.tsx`, `onboarding/verification-tier1.tsx` |
| P1 | "Start day" CTA is a no-op | `app/(provider)/(tabs)/today.tsx` |
| P1 | Tech role missing schedule, profile, messages tabs | `app/(tech)/(tabs)/_layout.tsx` |
| P1 | Tech jobs screen has no pull-to-refresh and no realtime subscription | `app/(tech)/(tabs)/today.tsx` |
| P2 | Month view is not a real calendar month, no navigation | `app/(provider)/(tabs)/schedule.tsx` |
| P2 | Job request expiry countdown is fake (no DB column, resets on refetch) | `app/(provider)/(tabs)/jobs.tsx` |
| P2 | Tech earnings display gross `amountCents`, not net share | `app/(tech)/(tabs)/earnings.tsx` |

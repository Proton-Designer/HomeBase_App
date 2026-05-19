# De-mock HomeBase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every mock/test-data path from the HomeBase mobile and admin apps so both run exclusively against the real Supabase backend.

**Architecture:** Phased rip-out. Phase 1 deletes the mock infrastructure in the already-gated layer (pure deletion, no behavior change). Phase 2 fixes ungated leaks and builds the two net-new backends (postings, address autocomplete) as feature verticals. Phase 3 handles admin stubs and cosmetic cleanup. The app stays runnable between phases.

**Tech Stack:** Expo SDK 54 / React Native 0.81 / Expo Router 6, Zustand, TanStack Query, Supabase (Postgres + Edge Functions), Next.js 14 (admin).

**Verification model:** This codebase has no unit-test runner. "Test/debug/proof" for every task means: `npx tsc --noEmit` clean, `expo lint` (mobile) / `next lint` (admin) clean, repo-wide grep gates pass, and manual smoke of the affected flow against the real Supabase project. Each phase ends with a mandatory verification gate.

**Paths:** Mobile root = `Marketplace_MVP/app/apps/mobile`. Admin root = `Marketplace_MVP/app/apps/admin`. All paths below are relative to those roots unless stated.

**Git:** The repo root is not a git repo; `apps/mobile` and `apps/admin` are separate repos. Work in place. Commits are made only on the user's request — phase gates are verification checkpoints, not commit points.

---

## Phase 1 — Remove the mock infrastructure

### Task 1.1: Delete mobile mock data files

**Files:**
- Delete: `lib/mocks/providers.ts`, `lib/mocks/jobs.ts`, `lib/mocks/postings.ts`, `lib/mocks/claims.ts`, `lib/mocks/messages.ts`, `lib/mocks/subscriptions.ts`, `lib/mocks/crewMembers.ts`, `lib/mocks/providerJobs.ts`, `lib/mocks/payments.ts`

- [ ] **Step 1: Preserve the two types that live in mock files**
  `lib/mocks/postings.ts` exports `Posting` + `PostingStatus`; these are consumed by `postingStore.ts` and `app/(homeowner)/postings/*`. Before deleting, move `PostingStatus` and `Posting` into `lib/types.ts` (Task 2.4 redefines `Posting` against the real schema — for now copy them verbatim so Phase 1 compiles).
  Add to `lib/types.ts`:
  ```ts
  export type PostingStatus = 'open' | 'matched' | 'completed' | 'expired';
  export interface Posting {
    id: string;
    serviceType: ServiceType;
    headline: string;
    description: string;
    photos: string[];
    status: PostingStatus;
    postedAt: string;
    matchCount: number;
    matchedProviderId?: string;
    matchedProviderName?: string;
  }
  ```
- [ ] **Step 2: Delete the 9 mock files** (`rm lib/mocks/*.ts`).
- [ ] **Step 3: Do not run typecheck yet** — imports are now broken; Tasks 1.2–1.6 fix every consumer. Verification happens at the Phase 1 gate.

### Task 1.2: Remove the `USE_MOCKS` flag

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1:** Delete the `USE_MOCKS` export (the `export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'` line and its comment).
- [ ] **Step 2:** Leave the rest of the file (the real `supabase` client) untouched.

### Task 1.3: De-mock the mobile API layer

**Files:**
- Modify: `lib/api/auth.ts`, `providers.ts`, `jobs.ts`, `claims.ts`, `messages.ts`, `subscriptions.ts`, `crew.ts`, `bookings.ts`, `payments.ts`, `addresses.ts`, `events.ts`, `notifications.ts`, `calendar.ts`, `realtime.ts` (14 files; `storage.ts` and `index.ts` have no mock code)

- [ ] **Step 1: Per file, apply the same transform.** In each file:
  1. Change `import { supabase, USE_MOCKS } from '../supabase'` → `import { supabase } from '../supabase'`.
  2. Delete the `import { mock... } from '../mocks/...'` line(s).
  3. Delete every `if (USE_MOCKS) { ... return ...; }` block — keep only the real Supabase path that follows it.
  4. Delete `'mock-homeowner'` / `'mock-*'` ID fallbacks (e.g. `claims.ts` `listForHomeowner` — drop `|| homeownerId === 'mock-homeowner'`).
  5. Delete `[mock]` `console.log` lines.
  Worked example — `claims.ts` `create`: delete lines 2 (`import { mockClaims }`), and the `if (USE_MOCKS) { return { id: \`cl_${Date.now()}\` }; }` block; the function body becomes only the `supabase.functions.invoke('claim-create', ...)` path.
- [ ] **Step 2:** After all 14 files, run `npx tsc --noEmit` and fix any unused-import / unreachable-code warnings introduced by the deletions.
- [ ] **Step 3: Expected:** all 14 files compile; no reference to `USE_MOCKS` or `../mocks/` remains in `lib/api/`.

### Task 1.4: Remove demo-session synthesis from authStore

**Files:**
- Modify: `stores/authStore.ts`

- [ ] **Step 1:** Delete the `setMockSession` method from the `AuthState` interface and its implementation.
- [ ] **Step 2:** In `bootstrap`, delete the `EXPO_PUBLIC_USE_MOCKS` branch — when there is no session, always `set({ status: 'unauthenticated' })`.
- [ ] **Step 3:** Remove any other `EXPO_PUBLIC_USE_MOCKS` reference in the file.
- [ ] **Step 4:** Run `npx tsc --noEmit` — note which screens still import `setMockSession` (fixed in Task 1.5).

### Task 1.5: Remove demo-mode UI from sign-in

**Files:**
- Modify: `app/(auth)/sign-in.tsx`

- [ ] **Step 1:** Delete the `const USE_MOCKS = ...` line, the `setMockSession` store selector, the `onMockSignIn` function, and the entire `{USE_MOCKS ? (...demo buttons...) : null}` JSX block (the "Demo mode" section with the three "Continue as demo …" buttons).
- [ ] **Step 2:** Run `npx tsc --noEmit` on the file.

### Task 1.6: Remove remaining `USE_MOCKS` conditionals

**Files:**
- Modify: `app/(provider)/onboarding/welcome.tsx`, `app/(homeowner)/booking/_layout.tsx`, `app/(homeowner)/booking/service-select.tsx`

- [ ] **Step 1: `welcome.tsx`** — delete the `process.env.EXPO_PUBLIC_USE_MOCKS` branch; the CTA always routes to real auth (`/(auth)/sign-up` or the real onboarding entry).
- [ ] **Step 2: `booking/_layout.tsx`** — delete the `import { USE_MOCKS }` and the `if (USE_MOCKS) { setHomeownerId('mock-homeowner'); ... return; }` block; the layout always resolves the real homeowner id + address from `useAuthStore` / `fetchPrimaryAddress`.
- [ ] **Step 3: `booking/service-select.tsx`** — change `const missingAddress = !USE_MOCKS && !addressId;` to `const missingAddress = !addressId;` and remove the `USE_MOCKS` import.
- [ ] **Step 4:** Run `npx tsc --noEmit`.

### Task 1.7: De-mock the admin app

**Files:**
- Delete: `apps/admin/lib/mocks.ts`
- Modify: `apps/admin/lib/supabase-server.ts`, `apps/admin/lib/actions.ts`, `apps/admin/lib/actions/claims.ts`, `apps/admin/lib/actions/trust-scores.ts`

- [ ] **Step 1:** In `lib/actions.ts` + `lib/actions/*`, replace all type imports that point at `lib/mocks` (`ProviderQueueRow`, `AdminJob`, `AdminClaim`, `TrustScoreRow`, `AdminUser`, and their status unions) — move those type definitions into a new `apps/admin/lib/admin-types.ts` and re-point every importer (the 5 `*Client.tsx` files import these types too).
- [ ] **Step 2:** Delete `lib/mocks.ts`.
- [ ] **Step 3:** `lib/supabase-server.ts` — delete the `USE_MOCKS` const (`ADMIN_USE_MOCKS`).
- [ ] **Step 4:** In each fetcher (`fetchProviders`, `fetchJobs`, `fetchClaims`, `fetchTrustScores`, `fetchUsers`) delete the `if (USE_MOCKS) return admin...;` line **and the on-error `return admin...` fallback** — on error, `throw` (or return an explicit error result the client renders as an error state). A failed query must never silently render fake rows.
- [ ] **Step 5:** In `lib/actions/claims.ts` delete the `if (!USE_MOCKS)` wrappers (the body always runs) and any `USE_MOCKS` no-op returns.
- [ ] **Step 6:** Run `npx tsc --noEmit` in `apps/admin`.

### Task 1.8: Environment cleanup

**Files:**
- Modify: `apps/mobile/.env`, `apps/mobile/.env.example` (if present), `apps/admin/.env.local`, `apps/admin/.env.example` (if present)

- [ ] **Step 1:** Remove `EXPO_PUBLIC_USE_MOCKS` and `ADMIN_USE_MOCKS` lines from all `.env*` files.
- [ ] **Step 2:** `grep -rn "USE_MOCKS" RUNNING.md OPERATIONS_TODO.md` — remove references to demo/mock mode from docs.

### Phase 1 Verification Gate

- [ ] **G1.1:** `cd apps/mobile && npx tsc --noEmit` — clean.
- [ ] **G1.2:** `cd apps/mobile && npx expo lint` — clean.
- [ ] **G1.3:** `cd apps/admin && npx tsc --noEmit && npx next lint` — clean.
- [ ] **G1.4: Grep gate** — from `apps/mobile` and `apps/admin`, `grep -rn "USE_MOCKS\|lib/mocks\|setMockSession\|EXPO_PUBLIC_USE_MOCKS\|ADMIN_USE_MOCKS" --include='*.ts' --include='*.tsx' .` returns **zero matches** (excluding `node_modules`).
- [ ] **G1.5: Smoke** — `cd apps/mobile && npx expo start` boots; sign-in screen shows no demo buttons. `cd apps/admin && npm run dev` boots; the 5 admin pages render against real Supabase (or a clean error state, not mock rows).
- [ ] **G1.6:** STOP. Report Phase 1 results to the user before starting Phase 2.

---

## Phase 2 — Fix ungated leaks + net-new backends

### Task 2.1: Claims — store becomes draft-only, screens use the API

**Files:**
- Modify: `stores/claimStore.ts`, `app/(homeowner)/claims/index.tsx`, `app/(homeowner)/claims/[id].tsx`
- Reference: `lib/api/claims.ts` (`listForHomeowner`, `get` — already real after Phase 1), `lib/queryKeys.ts`

- [ ] **Step 1:** `claimStore.ts` — remove the `claims` array from state and the `mockClaims` seed (already broken by Task 1.1). Keep only the in-progress draft fields and `submitDraft()`. The store is now draft-only, mirroring `bookingStore`.
- [ ] **Step 2:** `lib/queryKeys.ts` — confirm/add `claims.all(homeownerId)` and `claims.detail(id)` keys.
- [ ] **Step 3:** `claims/index.tsx` — replace `useClaimStore((s) => s.claims)` with:
  ```tsx
  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims', 'all', userId],
    queryFn: () => claimsApi.listForHomeowner(userId!),
    enabled: !!userId,
  });
  ```
  Add a loading skeleton (`isLoading`) and an empty state (claims.length === 0) with a CTA to file a claim.
- [ ] **Step 4:** `claims/[id].tsx` — replace the store lookup with `useQuery(['claims','detail',id], () => claimsApi.get(id))`; handle loading + not-found.
- [ ] **Step 5:** `npx tsc --noEmit` + manual smoke: file a claim, see it appear in the list from the DB; open detail.

### Task 2.2: Tech screens — wire to real job + earnings data

**Files:**
- Modify: `lib/api/jobs.ts`, `app/(tech)/(tabs)/today.tsx`, `app/(tech)/(tabs)/earnings.tsx`
- Reference: `db-types.ts`, `lib/api/jobs.ts` `listForProvider`

- [ ] **Step 1: Introspect schema.** Run a one-off script against the live DB (use `apps/admin`'s `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`) to confirm: the `jobs` column that links a job to a tech (expected `assigned_tech_id`), and the source for tech earnings (`completion_ledger` and/or `payouts` columns, and which column ties a row to a tech). Record the real column names before writing code.
- [ ] **Step 2:** Add `listForTech(techUserId: string): Promise<Job[]>` to `lib/api/jobs.ts` — `supabase.from('jobs').select(<same select as listForProvider>).eq('assigned_tech_id', techUserId)`. Map rows with the existing `listForProvider` mapper (extract a shared `mapJobRow` helper to stay DRY).
- [ ] **Step 3:** Add a tech-earnings query (new `lib/api/jobs.ts` `listEarningsForTech` or extend an earnings API) against the confirmed earnings table, scoped to the tech.
- [ ] **Step 4:** `(tech)/today.tsx` — replace the `mockProviderActive.map(...)` block with `useQuery(['jobs','tech',userId], () => jobsApi.listForTech(userId!))`; add loading skeleton + empty state ("No jobs assigned today").
- [ ] **Step 5:** `(tech)/earnings.tsx` — replace `mockEarnings` and the hardcoded `todayCents = 12500` with the real earnings query; derive `weekCents` / `todayCents` from real rows; add loading + empty states.
- [ ] **Step 6:** `npx tsc --noEmit` + smoke with a `provider_tech` account.

### Task 2.3: Crew screens — use the real provider id

**Files:**
- Modify: `app/(provider)/crew/index.tsx`, `app/(provider)/crew/[id].tsx`, `app/(provider)/crew/invite.tsx`

- [ ] **Step 1:** In all three files, delete `import { mockOwnerProviderId } from '../../../lib/mocks/crewMembers'` (already broken by Task 1.1).
- [ ] **Step 2:** Replace every use of `mockOwnerProviderId` with the authed provider id:
  ```tsx
  const providerId = useAuthStore((s) => s.providerId);
  ```
  Gate queries/mutations on `!!providerId` (`enabled: !!providerId`); render an empty/error state when it is null instead of querying with a fake id.
- [ ] **Step 3:** `crew/[id].tsx` — also remove the `mockProviderActive` import; if "assigned jobs" for the crew member is shown, source it from `jobsApi.listForTech(memberUserId)` (Task 2.2) or hide the section if out of scope. Pick one and make it explicit.
- [ ] **Step 4:** `npx tsc --noEmit` + smoke with a `provider_owner` account: crew list reflects that owner's real team.

### Task 2.4: Build the postings API

**Files:**
- Create: `lib/api/postings.ts`
- Modify: `lib/types.ts` (finalize `Posting`), `lib/api/index.ts` (export `postings`), `lib/queryKeys.ts`

- [ ] **Step 1: Introspect the `postings` table.** Run a script (admin service-role key) — `select * from postings limit 1` plus `information_schema.columns` for table `postings` — and record the real column names, types, and the RLS posture. Confirm whether a `posting-create` Edge Function exists (`supabase functions list` or the dashboard); the deep dive found none, so the default is a direct RLS-protected insert.
- [ ] **Step 2: Finalize the `Posting` type** in `lib/types.ts` to match the real columns (adjust the Phase-1 placeholder from Task 1.1).
- [ ] **Step 3: Write `lib/api/postings.ts`** with `create`, `listForHomeowner`, `get`, following the exact pattern of the post–Phase-1 `claims.ts` (no `USE_MOCKS`): a `mapPostingRow` mapper from snake_case DB columns to the `Posting` type, `create` doing an RLS-protected `supabase.from('postings').insert(...)` (or `functions.invoke('posting-create')` if that function turns out to exist), `listForHomeowner` selecting by `homeowner_id` ordered by `created_at desc`, `get` by id with `maybeSingle()`.
- [ ] **Step 4:** Export `postings` from `lib/api/index.ts`; add `postings.all(homeownerId)` / `postings.detail(id)` to `lib/queryKeys.ts`.
- [ ] **Step 5:** `npx tsc --noEmit`.

### Task 2.5: Wire postings screens + store to the API

**Files:**
- Modify: `stores/postingStore.ts`, `app/(homeowner)/post-job/review.tsx`, `app/(homeowner)/postings/index.tsx`, `app/(homeowner)/postings/[id].tsx`

- [ ] **Step 1:** `postingStore.ts` — remove the `postings` array and `mockPostings` seed; remove the local `submitDraft()` id-fabrication. Keep only the draft fields (`serviceType`, `headline`, `description`, `photos`) and their setters — draft-only, like `bookingStore`.
- [ ] **Step 2:** `post-job/review.tsx` — `onSubmit` calls `postingsApi.create(draft)` (a `useMutation`), then on success `router.replace` to `/(homeowner)/post-job/submitted` with the returned id. Invalidate `['postings','all',userId]`.
- [ ] **Step 3:** `postings/index.tsx` — replace `usePostingStore((s) => s.postings)` with `useQuery(['postings','all',userId], () => postingsApi.listForHomeowner(userId!))`; add loading skeleton + empty state with a "Post a job" CTA.
- [ ] **Step 4:** `postings/[id].tsx` — replace the store lookup with `useQuery(['postings','detail',id], () => postingsApi.get(id))`; handle loading + not-found. The matched-provider block already uses `api.providers.detail` (real after Phase 1).
- [ ] **Step 5:** `npx tsc --noEmit` + smoke: complete the post-job flow → posting persists → appears in `postings/index` → detail opens.

### Task 2.6: Address autocomplete via Google Places

**Files:**
- Create: `apps/mobile` Edge Function `places-autocomplete` (Supabase function, deployed separately) — or document it for the operator if function deploy is out of band
- Modify: `app/(auth)/address-setup.tsx`
- Reference: `OPERATIONS_TODO.md` (Google Maps Platform key)

- [ ] **Step 1:** Confirm a Google Maps Platform API key with Places API enabled exists (per `OPERATIONS_TODO.md`). If not, this task is blocked — surface that to the user.
- [ ] **Step 2:** Create a Supabase Edge Function `places-autocomplete` that takes `{ query }` and proxies Google Places Autocomplete + Place Details, returning `{ street, city, state, zip, neighborhood }[]`. Keep the Google key server-side as an Edge Function secret. (If deploying the function is out of band, write the function source into the repo and flag the deploy step for the operator.)
- [ ] **Step 3:** `address-setup.tsx` — delete the `SUGGESTIONS` array; add a debounced (~300ms) query against the Edge Function via `useQuery`; render returned suggestions in the existing `SuggestionRow` list; on select, populate `pendingHomeownerSetup` from the chosen place.
- [ ] **Step 4:** Replace the hardcoded `"12 verified providers near you"` Pill — either drop it or wire it to a real count from `providers.search`.
- [ ] **Step 5:** `npx tsc --noEmit` + smoke: type an address, get real suggestions, select one, continue.

### Phase 2 Verification Gate

- [ ] **G2.1:** `cd apps/mobile && npx tsc --noEmit && npx expo lint` — clean.
- [ ] **G2.2: Grep gate** — zero matches for `mockOwnerProviderId`, `mockProviderActive`, `mockEarnings`, `mockClaims`, `mockPostings`, `SUGGESTIONS` (in `address-setup.tsx`), `todayCents = 12500`.
- [ ] **G2.3: Smoke each vertical against real Supabase** with fresh accounts (verifies empty states): tech today/earnings, crew list/detail/invite, claims list/detail, post-job → postings list/detail, address setup.
- [ ] **G2.4:** STOP. Report Phase 2 results to the user before starting Phase 3.

---

## Phase 3 — Admin stubs + cosmetic cleanup

### Task 3.1: Bundle a default avatar asset

**Files:**
- Create: `assets/default-avatar.png` (a neutral placeholder avatar)
- Modify: `components/shared/ProviderCard.tsx` (3 sites), `app/(homeowner)/providers/[id].tsx`

- [ ] **Step 1:** Add a neutral default-avatar image to `assets/`.
- [ ] **Step 2:** Replace each `provider.avatarUrl ?? 'https://i.pravatar.cc/150'` with `provider.avatarUrl ? { uri: provider.avatarUrl } : require('../../assets/default-avatar.png')` (fix the relative path per file).
- [ ] **Step 3:** `npx tsc --noEmit`; grep `i.pravatar.cc` → zero matches.

### Task 3.2: Wire admin stubs

**Files:**
- Modify: `apps/admin/app/admin/users/UsersClient.tsx`, `apps/admin/lib/actions.ts` (or a new `lib/actions/users.ts`), `apps/admin/app/admin/jobs/JobsClient.tsx`

- [ ] **Step 1: Password reset** — add a `resetPasswordForUser(email)` server action calling `supabase.auth.admin.generateLink({ type: 'recovery', email })` (service-role); wire the UsersClient "Reset password" button to it with a success/error toast.
- [ ] **Step 2: Activity log** — add a `fetchUserActivity(userId)` action querying the user's recent `jobs` / `bookings`; replace the UsersClient placeholder text with the rendered list (loading + empty states).
- [ ] **Step 3: JobsClient message log** — replace the "Realtime message log appears here…" placeholder with the actual realtime event feed already wired via the `admin-jobs-board` channel, or remove the placeholder if redundant.
- [ ] **Step 4:** `npx tsc --noEmit && npx next lint` in `apps/admin`.

### Task 3.3: Review placeholder content

**Files:**
- Modify: `app/(auth)/welcome.tsx`, `app/(homeowner)/(tabs)/index.tsx`, `app/(provider)/(tabs)/profile.tsx`

- [ ] **Step 1: `welcome.tsx` `STATS`** — "12 verified pros" / "4 min" imply real data. Either wire to a real count or reword to non-numeric marketing copy that does not assert a live figure.
- [ ] **Step 2: home `QUICK_BOOK` price labels** ("from $45 / visit") — these are unverified price anchors. Wire to a real per-service price floor from `providers.search`, or remove the price line.
- [ ] **Step 3: provider `profile.tsx` "< 2m" response time** — wire to a real metric or remove.
- [ ] **Step 4:** `npx tsc --noEmit`.

### Phase 3 Verification Gate

- [ ] **G3.1:** `cd apps/mobile && npx tsc --noEmit && npx expo lint` — clean. `cd apps/admin && npx tsc --noEmit && npx next lint` — clean.
- [ ] **G3.2: Final grep gate** — zero matches across both apps for: `USE_MOCKS`, `lib/mocks`, `setMockSession`, `mockOwnerProviderId`, `i.pravatar.cc`. The only allowed surviving test-data reference is the deferred, commented `pm_card_visa` in `app/(homeowner)/booking/payment.tsx`.
- [ ] **G3.3:** Add the `// DEFERRED: real Stripe PaymentSheet integration` comment above the `pm_card_visa` line in `payment.tsx` if not already present.
- [ ] **G3.4: Full smoke** — boot both apps; walk every de-mocked flow once more.
- [ ] **G3.5:** Report final results to the user.

---

## Deferred (out of scope — see spec §7)

- **Real Stripe card collection.** `payment.tsx` keeps the hardcoded `'pm_card_visa'` token with an explicit `DEFERRED` comment. The booking payment step is not production-ready for real card capture until `@stripe/stripe-react-native` is integrated in a follow-up effort.

## Self-Review Notes

- Spec coverage: Phase 1 ↔ spec §6 Phase 1; Phase 2 Tasks 2.1–2.6 ↔ spec §6 Phase 2 (claims, tech, crew, postings, address); Phase 3 ↔ spec §6 Phase 3 + §7 deferred. Cross-cutting empty/loading states are embedded in every Phase 2/3 wiring task.
- Open items from spec §10 are handled as explicit introspection steps: postings schema (Task 2.4 Step 1), tech earnings source (Task 2.2 Step 1), Places Edge Function (Task 2.6 Step 2), admin activity tables (Task 3.2 Step 2).
- Type consistency: `Posting`/`PostingStatus` moved to `lib/types.ts` in Task 1.1, finalized in Task 2.4; admin types moved to `admin-types.ts` in Task 1.7.

# De-mock HomeBase — Production-Readiness Design

> **Status:** Approved (design) — pending spec review
> **Date:** 2026-05-18
> **Topic:** Remove all mock/test data from the app and wire every surface to the real Supabase backend.

---

## 1. Context

The HomeBase mobile app (`apps/mobile`) and admin app (`apps/admin`) were built mock-first. A single environment flag — `EXPO_PUBLIC_USE_MOCKS` (mobile) / `ADMIN_USE_MOCKS` (admin) — swaps the entire app between fabricated data and the real Supabase project.

A four-agent deep dive (2026-05-18) found three problem tiers:

- **Tier 1 — ungated leaks:** screens/stores that render mock data even when the flag is off (ship fake data to production).
- **Tier 2 — no real backend:** features with zero backend implementation (postings, address autocomplete, real card capture).
- **Tier 3 — correctly gated:** screens/APIs that already defer to real Supabase when the flag is off.

The goal is to eliminate the mock layer entirely so there is exactly one code path: the real Supabase backend.

## 2. Goal & Non-Goals

**Goal:** The app — mobile and admin — runs exclusively against the real Supabase backend. No mock files, no `USE_MOCKS` branches, no demo session synthesis, no hardcoded test data in functional paths.

**Non-Goals:**
- Real Stripe card collection (PaymentSheet / `@stripe/stripe-react-native`) — **deferred** by decision; see §7.
- New product features beyond what already exists in the screen tree.
- Backend schema changes beyond what postings/address autocomplete require.
- Redesign of any screen — only data-source changes plus the empty/loading states that mock data was hiding.

## 3. Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| D1 | Mock infrastructure | **Rip it all out.** Delete `lib/mocks/`, every `USE_MOCKS` branch, demo sign-in buttons, `setMockSession`, and the env flags. One real-Supabase code path. |
| D2 | Postings backend | **In scope.** Build `lib/api/postings.ts` + wire the post-job flow and postings list/detail to the `postings` table. |
| D3 | Address autocomplete | **In scope.** Replace the hardcoded `SUGGESTIONS` array with Google Places autocomplete. |
| D4 | Real Stripe card collection | **Deferred.** Out of scope for this effort; tracked as a known gap (§7). |

## 4. Mock-Usage Inventory (authoritative)

### 4.1 Mock control point
- `apps/mobile/lib/supabase.ts` — `export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'`.
- `apps/admin/lib/supabase-server.ts` — `const USE_MOCKS = process.env.ADMIN_USE_MOCKS === 'true'`.
- No separate mock client; every `lib/api/*` function branches on the flag.

### 4.2 Mock data files
- **Mobile** `apps/mobile/lib/mocks/` (9 files): `providers.ts`, `jobs.ts`, `postings.ts`, `claims.ts`, `messages.ts`, `subscriptions.ts`, `crewMembers.ts`, `providerJobs.ts`, `payments.ts`.
- **Admin** `apps/admin/lib/mocks.ts` (1 file): `adminProviders`, `adminJobs`, `adminClaims`, `adminTrustScores`, `adminUsers`.

### 4.3 Tier 1 — ungated leaks (render mock data in production)
- `app/(tech)/(tabs)/today.tsx` — maps `mockProviderActive` directly; no real query, no gate.
- `app/(tech)/(tabs)/earnings.tsx` — uses `mockEarnings` + hardcoded `todayCents = 12500`; no gate.
- `app/(provider)/crew/index.tsx` — passes hardcoded `mockOwnerProviderId` into `crewApi.listForProvider()`.
- `app/(provider)/crew/[id].tsx` — same `mockOwnerProviderId` pattern.
- `app/(provider)/crew/invite.tsx` — passes `mockOwnerProviderId` into `crewApi.invite()`.
- `stores/postingStore.ts` — seeds `postings: mockPostings` unconditionally.
- `stores/claimStore.ts` — seeds `claims: mockClaims` unconditionally.
- `app/(homeowner)/postings/index.tsx` — reads mock-seeded `postingStore`.
- `app/(homeowner)/claims/index.tsx` & `claims/[id].tsx` — read mock-seeded `claimStore`.
- **Admin** `lib/actions.ts` + `lib/actions/*` — on a Supabase query error, fetchers fall back to mock data, masking real failures even when `ADMIN_USE_MOCKS=false`.

### 4.4 Tier 2 — no real backend
- **Postings** — no `lib/api/postings.ts`; `postingStore` is entirely local; the `postings` DB table is untouched by code.
- **Address autocomplete** — `app/(auth)/address-setup.tsx` `SUGGESTIONS` array (3 fake addresses); no geocoding API.
- **Stripe card capture** — `app/(homeowner)/booking/payment.tsx:112` hardcodes `'pm_card_visa'`; the card form is non-functional UI.

### 4.5 Tier 3 — correctly gated (gated `USE_MOCKS` branches to delete)
- `lib/api/*` (14 files: `auth`, `providers`, `jobs`, `claims`, `messages`, `subscriptions`, `crew`, `bookings`, `payments`, `addresses`, `events`, `notifications`, `calendar`, `realtime`; `storage` and `index` have none).
- Screens: homeowner `(tabs)/index`, `(tabs)/jobs`, all `booking/*`, `postings/[id]`; provider `(tabs)/today`, `schedule`, `jobs`, `earnings`, `profile`; `(provider)/onboarding/welcome`; `(auth)/sign-in` (demo buttons).
- `authStore.ts` — `setMockSession` + `EXPO_PUBLIC_USE_MOCKS` bootstrap checks.
- Admin — all 5 sections gated on `ADMIN_USE_MOCKS` (real auth already).

### 4.6 Other hardcoded test data
- `'mock-homeowner'` / `'mock-*'` ID fallbacks inside `lib/api/*` (e.g. `claims.ts` matches any homeowner as `'mock-homeowner'`).
- `[mock]` `console.log` stubs in `events.ts`, `notifications.ts`, `jobs.ts`.
- `i.pravatar.cc/150` fallback avatars — `components/shared/ProviderCard.tsx` (×3), `app/(homeowner)/providers/[id].tsx`.

### 4.7 Placeholder content (separate category — not mock data)
- `(auth)/welcome.tsx` `STATS` ("12 verified pros", "4 min"); home `(tabs)/index.tsx` `QUICK_BOOK` price labels; `address-setup.tsx` "12 verified providers near you"; `(provider)/(tabs)/profile.tsx` "< 2m" response time.
- Admin stubs: UsersClient password-reset button (unwired), UsersClient activity log (placeholder text), JobsClient realtime message log (placeholder text).

## 5. Approach

**Phased hybrid.** Front-load the safe mechanical deletion, then de-mock the leaks and net-new builds as feature verticals, keeping the app runnable throughout. Three phases, each independently verifiable, with a review checkpoint between them.

## 6. Phase Detail

### Phase 1 — Remove the mock infrastructure
Pure deletion in the already-gated layer. No behavior change for Tier-3 surfaces.

1. Delete `apps/mobile/lib/mocks/` (9 files) and `apps/admin/lib/mocks.ts`.
2. `lib/supabase.ts` — remove the `USE_MOCKS` export. `supabase-server.ts` — remove `ADMIN_USE_MOCKS`.
3. `lib/api/*` (14 files) — strip every `if (USE_MOCKS)` branch; each function keeps only its real Supabase / Edge-Function path. Remove the `'mock-*'` ID fallbacks and `[mock]` `console.log` stubs.
4. `authStore.ts` — delete `setMockSession` and the `EXPO_PUBLIC_USE_MOCKS` bootstrap checks.
5. `(auth)/sign-in.tsx` — delete demo-mode buttons, `onMockSignIn`, local `USE_MOCKS`.
6. `(provider)/onboarding/welcome.tsx`, `booking/_layout.tsx`, `booking/service-select.tsx` — remove `USE_MOCKS` conditionals.
7. Admin `lib/actions.ts` + `lib/actions/*` — remove `USE_MOCKS` branches **and the on-error mock fallback**; a failed query surfaces an error state instead of fake rows.
8. Remove `EXPO_PUBLIC_USE_MOCKS` / `ADMIN_USE_MOCKS` from `.env` files and supporting docs.

**Exit criteria:** `tsc --noEmit` clean in both apps; no remaining reference to `USE_MOCKS`, `lib/mocks`, or `setMockSession`; Tier-3 screens behave identically against real Supabase.

### Phase 2 — Fix ungated leaks + net-new backends (feature verticals)

**2a. Claims**
- `claimStore.ts` → draft-only (matches the booking/claim-draft pattern); drop the `claims` array + `mockClaims` import.
- `claims/index.tsx`, `claims/[id].tsx` → React Query against existing `claimsApi.listForHomeowner` / `claimsApi.get`.

**2b. Tech screens**
- Add `jobsApi.listForTech(techUserId)` — `jobs` where `assigned_tech_id` = current user.
- Add a tech-scoped earnings query (completion/payout rows filtered to the tech).
- `(tech)/today.tsx`, `(tech)/earnings.tsx` → real queries; add loading + empty states; remove hardcoded `todayCents`.

**2c. Crew screens**
- `crew/index.tsx`, `crew/[id].tsx`, `crew/invite.tsx` → replace `mockOwnerProviderId` with `useAuthStore(s => s.providerId)`; guard for the null-providerId case.

**2d. Postings (net-new — D2)**
- Build `lib/api/postings.ts`: `create`, `listForHomeowner`, `get`, against the `postings` table.
- `postingStore.ts` → draft-only; drop the `postings` array + `mockPostings`.
- `post-job/review.tsx` submit → `postingsApi.create`; `postings/index.tsx` + `postings/[id].tsx` → React Query.
- Add React Query keys for postings.

**2e. Address autocomplete (net-new — D3)**
- Add a Google Places Autocomplete Edge Function proxy (keeps the API key server-side).
- `address-setup.tsx` → debounced lookup against the proxy; selected place → geocoded `street/city/state/zip/neighborhood`; delete `SUGGESTIONS`.

**Exit criteria:** every Tier-1 leak gone; postings + address autocomplete functional end-to-end against real Supabase; each vertical has loading + empty states.

### Phase 3 — Admin stubs + cosmetic cleanup
1. Wire admin stubs (lower priority, included for true production-readiness): UsersClient password reset, UsersClient activity log, JobsClient realtime message log.
2. Replace `i.pravatar.cc/150` fallbacks with a bundled local default-avatar asset (`ProviderCard` ×3, `providers/[id].tsx`).
3. Placeholder content (§4.7) — review per item: convert to real data where one exists, otherwise keep as explicitly-labeled static marketing copy. No fabricated stats left implying real data.

**Exit criteria:** no `i.pravatar.cc` references; admin stubs functional; placeholder content reviewed and dispositioned.

## 7. Deferred Items / Known Gaps

- **Real Stripe card collection (D4).** The `USE_MOCKS` branch in `payments.ts` is removed in Phase 1, but `payment.tsx:112` still passes the hardcoded `'pm_card_visa'` token. It will carry an explicit `// DEFERRED: real Stripe PaymentSheet integration` comment. **Consequence:** the booking payment step is not production-ready for real card capture until `@stripe/stripe-react-native` is integrated in a follow-up effort. This is a conscious, documented gap.

## 8. Cross-Cutting Concerns

- **Empty & loading states.** Mock data meant screens were never empty. Every de-mocked screen must have a verified empty state (with CTA, per FRONTEND_GUIDE) and a loading skeleton.
- **Auth assumption.** With `setMockSession` removed, every screen requires a real Supabase session; the `'mock-*'` ID fallbacks inside API functions are removed with the mock branches.
- **Realtime.** The no-op mock unsubscribe branches in `realtime.ts` are removed; real subscriptions always run.
- **RLS.** Postings API calls and the address-autocomplete proxy must respect existing RLS; no schema change should weaken multi-tenant isolation.

## 9. Verification Strategy

- `tsc --noEmit` and `expo lint` clean after each phase (mobile); `next lint` / `tsc` clean for admin.
- Repo-wide grep gate: zero matches for `USE_MOCKS`, `lib/mocks`, `setMockSession`, `mockOwnerProviderId`, `i.pravatar.cc`, `pm_card_visa` (except the one deferred, commented `payment.tsx` line).
- Manual smoke of each de-mocked flow against the real Supabase project: tech today/earnings, crew list/detail/invite, claims list/detail, post-job → postings list/detail, address setup.
- Each vertical's empty state verified with a fresh account that has no data.

## 10. Open Items to Verify During Plan-Writing

- **Postings table** — confirm `postings` schema, columns, and RLS policies; decide direct insert vs. a new `posting-create` Edge Function.
- **Tech earnings** — confirm the data source for tech-scoped earnings (`completion_ledger`, `payouts`, or a provider-earnings rollup) and the column linking a payout to a tech.
- **Google Places** — confirm the Edge Function pattern and where the API key/secret is configured.
- **Admin activity log** — confirm which tables back the UsersClient activity view.

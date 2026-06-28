# apps/mobile — Code Quality Audit

**Date:** 2026-06-23  
**Scope:** `apps/mobile/app`, `apps/mobile/components`, `apps/mobile/lib`, `apps/mobile/stores`  
**Method:** Read-only static analysis via grep/glob; no code changed.

---

## Executive Summary

The codebase is structurally sound for a seed-stage mobile app. Expo Router, Zustand, TanStack Query, and Reanimated are used consistently. The main risks are: (1) a **hardwired mock payment gateway** in production code, (2) **8 screens bypassing `lib/api/` to call Supabase directly**, (3) **103 copy-pasted `({ cursor: 'pointer' } as object)` casts** that should be a single module-scope constant, (4) **scattered inline query-key strings** that diverge from the `queryKeys` factory, and (5) two **silent failures** on job status mutations that swallow errors with no user feedback.

---

## P1 — High Priority (production risk or data-correctness)

### P1-1: `MOCK_PAYMENTS = true` hardwired in production source

**File:** `lib/payments/mockGateway.ts:8`

```ts
export const MOCK_PAYMENTS = true;
```

Every payment path in `lib/api/payments.ts` (lines 13, 34, 55, 74, 92, 107, 126, 141) branches on this flag. There is no environment-variable gate. Shipping to TestFlight with this flag `true` means the app will never charge a real card or trigger a real Stripe payout, and revenue hooks will silently be skipped. There is no `if (process.env.NODE_ENV === 'production')` guard.

**Fix:** Gate on `process.env.EXPO_PUBLIC_MOCK_PAYMENTS !== 'false'` so the `.env.local` file controls it. Add a startup assertion in `app/_layout.tsx` that logs a loud warning (or throws in production builds) when `MOCK_PAYMENTS` is true and `__DEV__` is false.

---

### P1-2: Screens calling Supabase directly, bypassing `lib/api/`

**Files:**

| Screen | Direct call |
|---|---|
| `app/(homeowner)/(tabs)/jobs.tsx:70-74` | `supabase.from('jobs')` inside `queryFn` |
| `app/(homeowner)/(tabs)/profile.tsx:78-82` | `supabase.from('profiles')` inside mutation |
| `app/(provider)/(tabs)/earnings.tsx:119-142` | `supabase.from('completion_ledger')` in `queryFn` |
| `app/(provider)/(tabs)/jobs.tsx:95-98` | `supabase.from('calendar_tokens')` in `queryFn` |
| `app/(provider)/(tabs)/jobs.tsx:133-144` | `supabase.from('jobs')` in `queryFn` |
| `app/(provider)/(tabs)/profile.tsx:208-220` | `supabase.from('calendar_tokens')` in `queryFn` |
| `app/(provider)/(tabs)/profile.tsx:224-239` | `supabase.from('jobs')` in `queryFn` |
| `app/(provider)/onboarding/profile.tsx:111-130` | `supabase.from('providers')` + `supabase.from('profiles')` in mutations |

`lib/api/` already has `jobs.ts`, `completions.ts`, `providers.ts`. These screens re-implement ad-hoc queries outside the type-safe layer. Schema changes in Supabase will break these screens silently because the TS compiler can't see the column names.

**Fix:** Lift each inline query into the relevant `lib/api/*.ts` module. Screen `queryFn` should call the module function and receive a typed return value.

---

### P1-3: Silent failures on job-status mutations

**File:** `app/(provider)/(tabs)/jobs.tsx:314`, `:423`

```ts
jobsApi.decline(req.id).catch(() => {});
jobsApi.setStatus(job.id as string, 'en_route').catch(() => {});
```

`decline` and `setStatus('en_route')` are state-critical mutations. If they fail, the provider sees no feedback, the job stays in the wrong state in the DB, and the homeowner and provider will have divergent views. The empty catch is a data-consistency risk.

Also: `job.id as string` on line 423 casts a possibly-undefined value, bypassing type safety.

**Fix:** Use `useMutation` with an `onError` handler that shows a Toast or Alert. Remove the `as string` cast and add a guard.

---

### P1-4: `demand_events` not tracked in booking service-select and provider search

`lib/api/events.ts` defines a `booking_started` and a `search` event type. Neither is fired in:
- `app/(homeowner)/booking/service-select.tsx` (service tap — the clearest booking_started signal)
- `app/(homeowner)/providers/index.tsx` (provider search — the clearest `search` signal with zip + service filter)

Both are wired in `app/(homeowner)/(tabs)/index.tsx` (home search bar) and `app/(homeowner)/reminders.tsx`, but the higher-intent user actions in the actual booking funnel and provider browse screen are missing. This means the `demand_events` table will undercount by whatever proportion of users reach those screens via paths other than the home tab.

**Fix:** Call `api.events.track({ event: 'booking_started', serviceType, ... })` on service tap in `service-select.tsx`, and `api.events.track({ event: 'search', ... })` on filter change / initial load in `providers/index.tsx`.

---

## P2 — Medium Priority (maintainability / tech debt)

### P2-1: 103 copy-pasted `({ cursor: 'pointer' } as object)` casts

Grep across `app/` and `components/`:

```
Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null
```

This pattern appears **103 times** across at least 30 files. `AdaptiveHero.tsx:23` already shows the correct pattern:

```ts
const WEB_CURSOR = IS_WEB ? ({ cursor: 'pointer' } as object) : null;
```

The `as object` cast is also a type violation — it silences the TypeScript error rather than using `StyleSheet` correctly or a proper `ViewStyle` extension.

**Fix:** Add `export const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : null;` to `lib/motion.ts` or a new `lib/platform.ts`, then do a repo-wide replace. This removes 102 duplicate casts and one `as object` lie per site.

---

### P2-2: Inconsistent query-key strings — `queryKeys` factory is barely used

`lib/queryKeys.ts` defines a typed factory (`queryKeys.providers.detail(id)`, etc.), but most screens use raw inline string arrays:

| Inline key | Screen | Conflicts with |
|---|---|---|
| `['addresses', 'primary', userId]` | 4 screens | Not in `queryKeys` factory |
| `['homeowner-primary-address', userId]` | `booking/_layout.tsx:68`, `post-job/submitted.tsx:26` | Different key for same resource |
| `['jobs', 'homeowner', userId]` | `(tabs)/index.tsx:103` | Not in `queryKeys.jobs` |
| `['jobs', 'tech', userId]` | `(tech)/earnings.tsx`, `(tech)/today.tsx` | Not in `queryKeys.jobs` |
| `['home-service-status', userId]` | multiple | Not in factory |
| `['trust-rationale', selectedId]` | `booking/match.tsx:52` | Not in factory |

`['addresses', 'primary', userId]` and `['homeowner-primary-address', userId]` are **two different keys for the same address query**. A `queryClient.invalidateQueries` on one will not refresh the other, meaning after a profile address update the home dashboard or booking layout could show stale data indefinitely (5-minute stale window in `queryClient.ts`).

**Fix:** Add all missing keys to the `queryKeys` factory. Replace the two conflicting address keys with a single canonical `queryKeys.addresses.primary(userId)`. Run a find-replace.

---

### P2-3: Two near-duplicate thread screens

`app/(homeowner)/thread/[id].tsx` (220 lines) and `app/(provider)/thread/[id].tsx` (197 lines) are structurally identical — same layout, same `useThreadMessages` hook, same header pattern. The only real differences are: the homeowner version uses `fromRole: 'homeowner'` and has a `useBreakpoint` import; the provider version derives `fromRole` from the auth store.

**Fix:** Extract a single `<ThreadScreen fromRole={...} />` component into `components/shared/` and render it from both route files with the role passed as a prop. Eliminates ~380 duplicated lines.

---

### P2-4: `lib/api/` modules missing from `lib/api/index.ts`

`lib/api/index.ts` exports 19 modules but omits: `addresses`, `messages`, `storage`, `functions`. Screens are forced to import from deep paths (`../../../lib/api/messages`, etc.) instead of via the barrel. This is inconsistent — `fetchPrimaryAddress` is imported directly in 5 screens.

**Fix:** Add `export * as addresses from './addresses'`, `export * as messages from './messages'`, `export * as storage from './storage'`, `export * as functions from './functions'` to `lib/api/index.ts`.

---

### P2-5: `as unknown as Record<string, unknown>` double-casts in API layer

**Files:**
- `lib/api/jobs.ts:26`, `:129`
- `lib/api/bookings.ts:33`

These casts indicate the Supabase query result type is not matching the declared return type, and the code is using a double-cast to force it. This suppresses any future column-level type errors.

**Fix:** Either generate typed Supabase types with `supabase gen types typescript` and use them, or narrow the type with a proper type guard / `satisfies` check. The `as unknown as X` pattern hides real schema drift.

---

### P2-6: `schedule.tsx` 867 lines — god-screen

`app/(provider)/(tabs)/schedule.tsx` is 867 lines with inline week-view calendar rendering, month-view calendar rendering, a bottom sheet form for blocked times, and all data-fetching in a single component. No `useCallback` memoization except in 2 places; `resetForm` inline helper defined inside the component body at line 118. The calendar grid re-renders on any state change.

**Fix:** Extract `WeekView`, `MonthView`, and `BlockTimeSheet` into subcomponents (can live in the same file initially). Wrap `resetForm` in `useCallback`. This is a pure maintainability issue, not a bug, but it will become a perf issue as data grows.

---

### P2-7: Error feedback inconsistent — `Alert` (18×) vs `Toast` (2×)

Mutation error paths use `Alert.alert` in 18 places (e.g., `subscriptions/[id].tsx:157`, `:171`, `:191`, `:207`) and `Toast.show` in 2 places (`provider/earnings.tsx`). There is no policy. `Alert` blocks the UI thread and has no styling; `Toast` is already in the dependency tree via `react-native-toast-message`.

**Fix:** Establish `Toast` as the standard for non-destructive mutation errors; reserve `Alert` only for confirmation dialogs (destructive actions). Migrate the 18 error `Alert` calls to `Toast.show({ type: 'error', ... })`.

---

## P3 — Low Priority (cleanup / polish)

### P3-1: 9 console log/warn/error calls in production code

```
grep -rn "console\." apps/mobile/app apps/mobile/lib apps/mobile/stores apps/mobile/components
```

9 hits. None are behind `__DEV__` guards. These will emit in production.

**Fix:** Wrap in `if (__DEV__)` or remove.

---

### P3-2: `app/(homeowner)/post-job/photos.tsx` mock photo upload

`app/(homeowner)/post-job/photos.tsx:11–114` — a small pool of plausible photos is used for a mock "upload" in the demo. This is described in a comment as demo-only, but it runs in the same code path as real uploads because there is no environment gate. The `usePostingStore` draft will contain fake photo URLs that will 404 when submitted.

**Fix:** Gate behind `__DEV__` or `EXPO_PUBLIC_DEMO_MODE` flag, or wire a real `uploadAsset` call.

---

### P3-3: `lib/api/` has two separate `payments` sub-directories that both export

- `lib/payments/mockGateway.ts` — mock layer
- `lib/api/payments.ts` — real API (imports from `../payments/mockGateway`)

The two-level directory is confusing. `lib/api/index.ts` exports `payments` from `./payments` but the mock is in `lib/payments/`. This inverts the abstraction: the "real" API depends on the "mock" rather than the mock being injected or conditionally swapped.

**Fix:** When removing the mock gate (P1-1), consolidate into `lib/api/payments.ts` only. Delete `lib/payments/`.

---

### P3-4: `jobs.tsx` screens in both homeowner and provider tabs are 484 and 789 lines respectively

`app/(homeowner)/(tabs)/jobs.tsx` (484 lines) and `app/(provider)/(tabs)/jobs.tsx` (789 lines) mix data fetching, job card rendering, status mutation handlers, and calendar-export logic. Neither is a bug, but both are candidates for extracting subcomponents (`JobCard`, `StatusBadge`, `CalendarExportButton`) that could be shared or at least isolated for testing.

---

### P3-5: `providers/index.tsx` — `queryKey` mismatch with `queryKeys.providers.search`

`app/(homeowner)/providers/index.tsx:213` uses:

```ts
queryKey: ['providers', 'search', homeZip, activeFilter === 'all' ? undefined : activeFilter]
```

`queryKeys.providers.search(zip, service)` in `lib/queryKeys.ts` produces the same shape, but the screen uses an inline array. `booking/match.tsx:43` uses a different shape entirely: `['providers', 'shortlist', zip, serviceType]`. These two queries fetch similar data from the same table via different keys, so TanStack Query treats them as separate caches — no deduplication, no shared staleness.

**Fix:** Align on one canonical key per logical resource. Add `providers.shortlist` to `queryKeys.ts` if the data shape genuinely differs; otherwise merge into `providers.search`.

---

## Summary Table

| ID | Severity | File(s) | Description |
|---|---|---|---|
| P1-1 | Critical | `lib/payments/mockGateway.ts:8` | `MOCK_PAYMENTS=true` hardwired — no env gate |
| P1-2 | High | 8 screen files | Direct `supabase.from()` bypasses typed `lib/api/` layer |
| P1-3 | High | `(provider)/jobs.tsx:314,423` | Silent catch on state-critical mutations; `as string` cast |
| P1-4 | High | `booking/service-select.tsx`, `providers/index.tsx` | `demand_events` not tracked at highest-intent funnel points |
| P2-1 | Medium | 30+ files, 103 instances | `({ cursor: 'pointer' } as object)` copy-pasted everywhere |
| P2-2 | Medium | 15+ screens | Inline query keys diverge from factory; two conflicting address keys |
| P2-3 | Medium | Two thread screens | ~380 lines of duplicated thread UI |
| P2-4 | Medium | `lib/api/index.ts` | `addresses`, `messages`, `storage`, `functions` not barrel-exported |
| P2-5 | Medium | `lib/api/jobs.ts`, `bookings.ts` | `as unknown as Record<string,unknown>` hides schema drift |
| P2-6 | Medium | `(provider)/schedule.tsx` | 867-line god-screen, no subcomponent extraction |
| P2-7 | Medium | 18 screens | `Alert` vs `Toast` for errors — no consistent policy |
| P3-1 | Low | Various | 9 unguarded `console.*` calls in production paths |
| P3-2 | Low | `post-job/photos.tsx` | Mock photo pool runs in production code path |
| P3-3 | Low | `lib/payments/` | Two-level payments directory inverts mock/real dependency |
| P3-4 | Low | HO/provider `jobs.tsx` | 484 and 789-line tab screens without subcomponent extraction |
| P3-5 | Low | `providers/index.tsx`, `booking/match.tsx` | Two different cache keys for semantically similar provider search |

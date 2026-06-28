# HomeBase — Changelog

> **Purpose:** Running log of all significant changes to the codebase, documentation, and architecture. Newest entries always at the top.
>
> **Who maintains this:** Every agent or developer who makes a meaningful change should add an entry at the top of the `## Updates` section before ending their session.
>
> **Reading order:** Newest → Oldest (scroll down for history).

---

## How to Add an Entry

When you complete work, add a new entry block at the **very top** of the `## Updates` section below, before any existing entries. Follow this exact format:

```
---

### [YYYY-MM-DD] — [Short title describing what changed]

**Type:** [one of: Feature | Fix | Refactor | Docs | Schema | Edge Function | Config | Chore]
**Affected areas:** [e.g., apps/mobile, apps/admin, Supabase, docs, .claude/agents]
**MVP features touched:** [e.g., MVP-4, MVP-8 — or "None" if docs/config only]
**Agent/Author:** [agent name or "Manual"]

#### What changed
[2–6 sentences describing what was actually built, fixed, or changed. Be specific — mention
file names, function names, Edge Functions, or table names where relevant. Write for a future
agent who has never seen this session.]

#### Why it changed
[1–3 sentences on the reason: bug found, feature gap closed, spec alignment, etc.]

#### What to watch out for
[Optional: any gotchas, follow-up work needed, known side effects, or files that may need
updating as a result of this change. If nothing notable, write "None."]

---
```

### Field rules

| Field | Allowed values / notes |
|---|---|
| `[YYYY-MM-DD]` | ISO date of the session — use today's date, not the date you think the feature was designed |
| `Type` | Feature, Fix, Refactor, Docs, Schema, Edge Function, Config, Chore — pick the primary one |
| `Affected areas` | Use path segments: `apps/mobile`, `apps/admin`, `Supabase`, `docs/context`, `.claude/agents`, `turbo.json`, etc. |
| `MVP features touched` | Use the IDs from HOMEBASE_CONTEXT.md §6 (MVP-1 through MVP-11). Write "None" if inapplicable. |
| `Agent/Author` | The subagent name (e.g., `rn-screens`, `booking-and-checkin`) or "Manual" if done by a human |

### What counts as a meaningful change

Include entries for:
- Any new screen, component, or API module
- Any fix to a code gap (see HOMEBASE_CONTEXT.md §12)
- Any schema migration or new Edge Function
- Any breaking change to an API contract or type signature
- Any non-trivial documentation update (new guide, restructured context file)
- Any new agent definition in `.claude/agents/`
- Any dependency bump that affects behavior (not just version string bumps)

Skip entries for:
- Formatting / linting fixes with no behavior change
- Minor copy changes
- Dependency version bumps with no behavior change

---

## Updates

---

### [2026-06-12] — HO1 UI: white/blue restyle of splash + welcome; sign-up polish

**Type:** Refactor (UI)
**Affected areas:** apps/mobile
**MVP features touched:** MVP-1 (Getting Started & Account Setup)
**Agent/Author:** Claude (3 parallel rn-screens subagents) — feature-dev workflow

#### What changed
Restyled the account-setup subsystem from the blue-dominant hero look to a **white background with blue accents** (gold accents swapped to blue), and trimmed the sign-up form. Verified all three logo assets are self-contained blue-circle badges / dark wordmark art that read on white before flipping (no asset vanishes). `npx tsc --noEmit` clean.
- **`components/AppSplashScreen.tsx`:** blue gradient field → soft `['#FFFFFF', #F5F8FF]`; gold glows → faint blue (`primary[200]/[300]`, low opacity); wordmark text `textInverse`→`textPrimary`, dot gold→`primary[600]`; tagline → `textSecondary`; loader sweep gold→blue. Animations untouched.
- **`app.json`:** native launch splash `expo.splash.backgroundColor` and the `expo-splash-screen` plugin `backgroundColor` flipped `#2563EB`→`#F5F8FF` so the native→JS splash handoff doesn't flash blue→white. (android adaptiveIcon bg + web themeColor left `#2563EB`.)
- **`app/(auth)/welcome.tsx`:** root → `#F5F8FF`, gradient → near-white, atmospheric circles → faint blue; **removed the white "pill" around the wordmark** (the dark `wordmark.png` now sits directly on white); headline/body/quote text → dark tokens; gold rules/bar/provider-link → blue; "Get started" `variant` secondary→primary; SignInGhost border/text → blue.
- **`app/(auth)/sign-up.tsx`:** (1) role-toggle header copy now animates — `<AuthHeader>` wrapped in `<Animated.View key={mode} entering={FadeInDown.duration(240)}>` so copy fades/slides on switch instead of swapping instantly; (2) **removed the "Why MyHomebase" callout** (the `WhyHomeBaseCallout` usage/import + the now-unused `calloutTitle`/`bullets`/`PROVIDER_BULLETS`/`HOMEOWNER_BULLETS`) — component file kept (sign-in.tsx still uses it); (3) **removed the optional phone field** (form Controller + Zod `phone` + defaultValue + the `phone` arg in `signUp()`); `authStore.signUp` keeps `phone?` optional, just unused now.

#### Why it changed
Product direction moved the hero screens to a white/blue look; the wordmark no longer needs a visibility pill on white; the sign-up form was trimmed (no phone, no marketing callout).

#### What to watch out for
- **Not visually verified on-device** — color/typecheck only. Worth an Expo render of splash → welcome → sign-up to confirm the aesthetic (esp. the faint blue atmospheric circles and the splash handoff).
- `wordmark.png` art reads "MyHomeBase" (capital B) vs the brand "MyHomebase" — pre-existing asset, not touched here.
- SMS job-update opt-in no longer collected at signup (phone removed); if phone is wanted later it'd be a profile-settings field, not signup.

---

### [2026-06-11] — Fix: shared `invokeFn` helper for all Edge Function calls (kills the RN functions.invoke stall)

**Type:** Fix
**Affected areas:** apps/mobile
**MVP features touched:** MVP-1/2/4/9/10 (every flow that calls an Edge Function)
**Agent/Author:** Claude (Manual)

#### What changed
Generalized the `provider-onboard` hang fix into a single helper so it can't recur on any flow. `supabase.functions.invoke` can leave its promise unsettled in React Native for an **authenticated** function (the request reaches the server but the client hangs), which had already stranded provider onboarding and would have stranded **homeowner booking** (`booking-create`) and more.
- **New `lib/api/functions.ts` → `invokeFn(name, body, opts)`:** direct `fetch` to `/functions/v1/<name>` with the session `Authorization` + `apikey` headers and a 20s `AbortController` timeout; returns parsed JSON, throws on non-2xx (surfacing the body's `error`).
- Rerouted every authenticated, reachable invoke through it: `booking-create` + `homeowner-checkin` (`bookings.ts`), `job-accept`/`job-decline`/`provider-checkin` (`jobs.ts`), `claim-create` (`claims.ts`), `crew-invite` (`crew.ts`), `calendar-connect` (`calendar.ts`), `register-push-token` (`notifications.ts`), `generate-trust-rationale` (`booking/match.tsx`, kept best-effort), `calendar-sync` (`(tabs)/jobs.tsx`, best-effort).

`npx tsc --noEmit` clean (excluding the known `react-native-maps` not-installed error).

#### Why it changed
`booking-create` was the next likely stall on the test loop (same root cause as the onboarding hang). One helper fixes the whole class.

#### What to watch out for
- Left as-is (intentional): `providers-search` (unauthenticated, works), the `payments.ts` real-`stripe-*` branches (bypassed while `MOCK_PAYMENTS` is on — when re-enabling real Stripe in phase 2, route these through `invokeFn` too), and the disconnected `verification-tier{1,2}-submit` screens.
- `lib/api/providers.ts` `onboard()` and `lib/payments/mockGateway.ts` `callMock()` still carry their own equivalent direct-fetch implementations (they work); fold them into `invokeFn` later to remove the duplication.

---

### [2026-06-11] — Phase-1 FAKE money system (no Stripe) + provider-screen query fixes

**Type:** Feature (also: Fix, Edge Function)
**Affected areas:** apps/mobile, Supabase (edge function), docs/ops
**MVP features touched:** MVP-7 (payouts), MVP-8 (card-on-file/escrow), MVP-1 (subscription take), MVP-5/10 (provider screens)
**Agent/Author:** Claude (manual + 3 subagents)

#### What changed — fake money system
A phase-1 testing money layer that fakes Stripe entirely (no charges, no Connect, no real payouts) while writing the *real* DB rows so the whole provider↔homeowner loop is testable for free.
- **New `mock-payments` Edge Function** (service-role; source at `docs/ops/edge-functions/mock-payments.ts`): ops `connect-bank` / `get-account` / `bank-account` / `balance` / `attach-card` / `create-intent` / `capture` / `instant-payout`. It writes `stripe_accounts`, `payment_methods`, `payments`, `completion_ledger`, `payouts` with the service role (so ledger/earnings integrity is preserved — not client-fabricated), but every Stripe call is faked. Because the service role bypasses RLS, every op is **ownership-gated in code**: caller-scoped ops resolve the provider/homeowner from the JWT (`providerForUser(user.id)` / `user.id`), and the two id-taking ops enforce it explicitly — `create-intent` requires `booking.homeowner_id === user.id`, `capture` requires the caller be the job's provider or homeowner (403 otherwise).
- **`lib/payments/mockGateway.ts`:** `MOCK_PAYMENTS` flag + a direct-`fetch` helper (avoids the RN `functions.invoke` stall) with a 20s timeout.
- **`lib/api/payments.ts`:** every function now routes to the mock when `MOCK_PAYMENTS` is on, **keeping the real `stripe-*` invoke code in place but bypassed**. Added `getBalance`, `getBankAccount`, `getAccountStatus`.
- Screens wired: `onboarding/banking.tsx` (Connect → instant fake-connect, status check, "Skip for now"), `(tabs)/earnings.tsx` (balance/bank/cash-out via the payments API), and **capture wired** in `components/checkin/ProviderCheckIn.tsx` (best-effort on completion → captures the homeowner's authorized payment + writes `completion_ledger`). Homeowner `createIntent`/`attachPaymentMethod` already flow through `payments.ts` → mock.
- The loop: provider connect-bank → homeowner add-card/book → authorize (`requires_capture`) → provider completes check-in → capture (`succeeded` + ledger) → provider balance → instant cash-out (`payouts`). Take rate 10% subscription / 17.5% one-off; escrow holdback skipped in the mock so funds are immediately cashable for testing.

#### What changed — the 5 flagged provider-screen bugs
- **stripe-balance / stripe-bank-account 404** → fixed (earnings now uses the mocked payments API).
- **`jobs.expires_at`** (doesn't exist) + the same query filtering the invalid `status='pending'` → `jobs.tsx` now selects valid columns and filters `status='booked'` (new bookings awaiting provider confirmation = "requests"); the offer countdown falls back to a computed default.
- **`calendar_tokens.provider_id`** (wrong key) → `jobs.tsx` now queries by `user_id` (the provider profile screen was already correct).
- **`completion_ledger.fee_cents`/`net_cents`/`payout_status`** (don't exist) → `earnings.tsx` selects existing columns and derives net at the 10% take rate, captured rows read as `paid`.
- **`calendar-connect` 503** → not a code bug: the client already catches it gracefully (Alert). Root cause is an operator gap (Google OAuth creds not configured) — left as operator setup.

`npx tsc --noEmit` clean (excluding the known `react-native-maps` not-installed error).

#### What to watch out for
- **Reversibility:** flip `MOCK_PAYMENTS` to `false` (and provision Stripe keys) to restore real Stripe; the real `stripe-*` functions were never removed. The `mock-payments` function can be deleted in phase 2.
- **Check-in `onSubmit` is not wired at any mount site**, so the `provider-checkin` Edge Function that flips a job to `completed` server-side isn't invoked from the UI. The mock capture writes `completion_ledger` independently (so the money loop works), but the job's *status* won't change until `submitProviderCheckIn` is wired into `onSubmit`. Follow-up.
- **`booking-create` (homeowner booking) still uses `supabase.functions.invoke`** — the same authenticated-invoke that stalled `provider-onboard`. It may hang the homeowner booking step on device. Recommend applying the same direct-fetch pattern (a shared `invokeFn` helper) to `booking-create` and the other authed invokes (`claim-create`, `crew-invite`, calendar) before end-to-end loop testing.
- Earnings net is displayed at a flat 10% for now (completion_ledger doesn't store per-row fee); make exact by storing fee/net on the ledger if precise per-job economics matter.

---

### [2026-06-11] — Fix: provider onboarding "Continue" hangs on the schedule step (functions.invoke stall)

**Type:** Fix
**Affected areas:** apps/mobile
**MVP features touched:** MVP-10 (provider onboarding)
**Agent/Author:** Claude (Manual, via Supabase log/DB diagnosis)

#### What changed
On the availability ("Set your weekly schedule") step, pressing Continue stayed in a permanent loading spinner. Diagnosis via Supabase logs + DB: `provider-onboard` returns **200** and the rows are written (`providers`, `provider_service_areas`, `provider_availability` all populated), yet the client button never resets — the classic `supabase.functions.invoke` stall in React Native for an **authenticated** function (the request reaches the server but the promise never settles, so the `await` hangs and the handler's `finally` never runs). (The app's other invoke, `providers-search`, works because it's `verify_jwt: false`.) Fix: `lib/api/providers.ts` `onboard()` now uses a **direct `fetch`** to `/functions/v1/provider-onboard` (with `apikey` + `Authorization: Bearer <session token>`) wrapped in an `AbortController` **20s timeout** — `fetch().json()` resolves reliably and any stall becomes a surfaced error instead of an infinite spinner.

`npx tsc --noEmit` clean (excluding the known `react-native-maps` not-installed error).

#### Why it changed
The authenticated `functions.invoke` intermittently never resolved on device, stranding the onboarding flow even though the server-side write succeeded.

#### What to watch out for
- **Separate provider-screen bugs surfaced in the same Postgres logs (NOT fixed here)** — the Today/Earnings/Schedule tabs query columns/functions that don't exist and will error after onboarding completes: `jobs.expires_at`, `completion_ledger.fee_cents`, `calendar_tokens.provider_id` (should be a different key), and the `stripe-balance` / `stripe-bank-account` Edge Functions return 404, `calendar-connect` returns 503. These need a follow-up pass (align queries to the real schema / implement or stub the missing functions).
- A test provider row ("Johnson Lawn Care", `onboarding_completed_at` null) exists from the hung attempts; harmless (filtered from search) — it completes normally on the next run.

---

### [2026-06-11] — Provider onboarding: schedule UX, save & exit, soft-gate, verification removed from flow

**Type:** Feature
**Affected areas:** apps/mobile, Supabase (edge function)
**MVP features touched:** MVP-5 (availability/schedule), MVP-10 (provider onboarding), MVP-11 (verification — deferred), MVP-2 (marketplace visibility)
**Agent/Author:** Claude (orchestrated 3 rn-screens subagents + manual)

#### What changed
Reworked provider onboarding per product feedback:
- **"Set your weekly schedule" (`availability.tsx`):** replaced the two unselectable preset buttons + always-visible custom card with a **3-option selector** ("Mon–Fri 8:00 AM–5:00 PM", "Mon–Sat 7:00 AM–6:00 PM", "Custom") where the choice is clearly highlighted. The custom day/time editor only appears when **Custom** is selected. Start/end times are now **editable** via `@react-native-community/datetimepicker` and shown in **12-hour AM/PM** (stored internally as 24h `HH:MM` for the `provider_availability.time` columns). Removed the "Minimum advance notice" and "Maximum jobs per day" sections (and `notice`/`maxJobs` from the onboarding store).
- **Verification removed from the flow:** dropped `verification-tier1` + `verification-tier2` from the onboarding `STEPS`/labels and the navigation chain (availability now → banking). New flow: welcome → business → service-area → availability → banking → profile. **The verification screen files and edge functions are kept** — just disconnected, so verification is no longer a barrier to app entry (re-enable later).
- **Save & exit:** the top-right "Save" button in the onboarding layout (previously a no-op) now `router.replace`s to the provider Today tab; relabeled "Save & exit". The onboarding draft is persisted, so progress survives.
- **Soft gate instead of hard gate:** `app/index.tsx` now routes a provider to the Today tab even with incomplete onboarding (was forced into `/onboarding/welcome`). The **Today tab shows a "Finish setting up your profile" banner** (CTA resumes onboarding) and hides the job feed until complete.
- **Marketplace visibility gate:** redeployed the `providers-search` edge function (v2) with `.not('onboarding_completed_at', 'is', null)` — incomplete providers don't appear to homeowners and therefore receive no job requests until onboarding is finished.

`npx tsc --noEmit` clean (excluding the known `react-native-maps` not-installed error from the separate map task).

#### Why it changed
The schedule step was confusing and non-editable; verification isn't appropriate for the MVP/pilot; and providers needed to be able to enter the app and finish setup later without being offered jobs prematurely.

#### What to watch out for
- Verification is **disconnected, not deleted** — `verification-tier1.tsx`/`verification-tier2.tsx` and the `verify-*` edge functions remain for later re-enable.
- Brand-new providers are still routed into onboarding right after signup (sign-up/verify push to `/onboarding/business`); index's Today redirect is for app-reopen/resume.
- The banking step is unchanged and still lets a provider finish with no Stripe account (separately flagged) — now the last step before profile.
- `providers-search` returns empty until at least one provider completes onboarding (correct). If a separate posting→provider routing path is added later, apply the same `onboarding_completed_at` filter there.

---

### [2026-06-11] — Provider service-area: real interactive map (react-native-maps) with web/native fallback

**Type:** Feature
**Affected areas:** apps/mobile, package.json
**MVP features touched:** MVP-5 (service area)
**Agent/Author:** Claude (Manual)

#### What changed
Upgraded the service-area coverage preview from the geocoded ring visualization to a **real interactive map** (`react-native-maps` — Apple Maps on iOS, Google Maps on Android) with a pan/zoom map, a center marker, and a coverage `Circle` whose radius (meters) scales with the selected miles. The map recenters/zooms (`animateToRegion`) when the geocoded ZIP or radius changes; pan/zoom gestures stay free (uncontrolled `initialRegion` + imperative animate).
- New `components/maps/CoverageVisualization.tsx` — the keyless ring viz, now reused as the fallback.
- New `components/maps/ServiceAreaMap.tsx` (native) — the `MapView` + `Marker` + `Circle`, wrapped in an error boundary that falls back to `CoverageVisualization` if the native module isn't linked yet (so no red-screen between `expo install` and a rebuild).
- New `components/maps/ServiceAreaMap.web.tsx` — renders the visualization; Metro resolves it for web so `react-native-maps` never enters the web bundle.
- `service-area.tsx` renders `<ServiceAreaMap>`; the ZIP geocoding + crosshair "use my location" logic from the prior entry is unchanged.
- `package.json`: added `react-native-maps` `1.20.1`.

Typecheck is clean except the expected `Cannot find module 'react-native-maps'` until it's installed.

#### Why it changed
Requested: a real, touch-responsive map (option A). iOS uses Apple Maps (no key); the geocode + fallback keep the screen working everywhere else.

#### What to watch out for — REQUIRED operator steps
- **Run `npx expo install react-native-maps`** (reconciles the exact SDK-54 version), then **rebuild the dev client** (`npx expo run:ios` / EAS dev build). The JS bundle won't resolve the import until installed, and the native map won't render until rebuilt (the error boundary shows the fallback viz in the meantime).
- **iOS:** works keyless via Apple Maps — nothing else needed.
- **Android:** needs a real Google Maps key in `app.json` (`android.config.googleMaps.apiKey`) — the `.env` `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is still a placeholder. Until then the Android map renders blank/grey (iOS unaffected).
- **Web:** uses the coverage visualization (react-native-maps has no web support).
- Geocoded lat/lng still aren't persisted to `providers.base_lat/lng` — follow-up for distance-based matching.

---

### [2026-06-11] — Provider service-area: working geocoded coverage preview (was a dead static placeholder)

**Type:** Fix (also: Feature)
**Affected areas:** apps/mobile, app.json
**MVP features touched:** MVP-5 (service area)
**Agent/Author:** Claude (Manual)

#### What changed
The provider onboarding "Where do you serve?" step (`app/(provider)/onboarding/service-area.tsx`) had a **static, non-functional "Map preview"** and a dead crosshair button. Rebuilt it to actually work using the already-installed `expo-location` (keyless):
- **Geocodes the ZIP → recenters the preview** whenever a full 5-digit ZIP is entered (forward geocode + reverse geocode for a city/state label); shows a spinner while resolving and an honest error if the ZIP can't be located.
- **Crosshair "use my location" button now works** — requests permission, reads current position, reverse-geocodes to auto-fill the ZIP (falls back to centering on raw coordinates).
- **Radius pills drive a live coverage ring** that scales 5–25 mi; the preview shows the resolved place + coordinates.
- ZIP input now sanitized to 5 digits.
- `app.json`: added the `expo-location` config plugin with `locationWhenInUsePermission` (sets iOS `NSLocationWhenInUseUsageDescription`).

`npx tsc --noEmit` clean.

#### Why it changed
Reported: the map preview "does not display and doesn't work." The screen now geocodes, repositions on ZIP change, and all its buttons are functional.

#### What to watch out for
- **This is a geocoded coverage visualization, not a pan/zoom tile map.** A true interactive tile map needs a native module (`react-native-maps`) — not installed; would require `npx expo install react-native-maps` + an Expo Go reload or dev-client rebuild. iOS would work keyless (Apple Maps); **Android/web need a real Google Maps key** (`.env` `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is still the `PASTE_REAL_VALUE_HERE` placeholder). Offered as a follow-up.
- The `app.json` location-permission change is a config plugin — it applies on the **next dev-client rebuild** (Expo Go already bundles location permissions). The geocode-on-ZIP preview needs no permission and works immediately; only the crosshair needs the permission.
- `expo-location` forward geocoding is reliable on iOS; on Android `geocodeAsync` may return nothing without a Google key — the UI degrades to the "couldn't locate" state.
- Geocoded lat/lng are not yet persisted to `providers.base_lat/lng` (the `onboard` payload still sends only radius) — a quick follow-up that would enable true distance-based matching.

---

### [2026-06-11] — Fix: profile photo "Upload failed" (HEIC) + deprecated picker API + swallowed error

**Type:** Fix (also: Schema — storage buckets)
**Affected areas:** apps/mobile, Supabase (storage)
**MVP features touched:** MVP-2 (photo uploads)
**Agent/Author:** Claude (Manual)

#### What changed
Avatar upload failed on iOS because iPhone/simulator photos are **HEIC**, but the image buckets only allowed `jpeg/png/webp` → Supabase rejected the upload and the screen showed a generic "Upload failed" while the real error was swallowed. Fixes:
- **Migration `allow_heic_in_image_buckets`:** added `image/heic` + `image/heif` to `avatars`, `portfolio-photos`, `booking-photos`, `claim-photos` `allowed_mime_types`.
- `lib/api/storage.ts`: replaced the deprecated `ImagePicker.MediaTypeOptions.Images` with the current `mediaTypes: ['images']` (removes the runtime deprecation warning) in both `pickImageFromLibrary` and `pickImageFromCamera`.
- `app/(homeowner)/(tabs)/profile.tsx`: the avatar `catch` now surfaces the actual error message instead of a generic string, so any remaining failure is diagnosable.

`npx tsc --noEmit` clean; bucket mime lists verified.

#### Why it changed
Real-device testing surfaced the failure; the generic catch hid the root cause (mime rejection).

#### What to watch out for
- HEIC avatars render fine in the native app (`expo-image`) but **not in browsers** (the web admin dashboard / RN-web build won't show HEIC). The proper cross-platform fix is to re-encode to JPEG on pick via `expo-image-manipulator` — not installed (would need `npx expo install expo-image-manipulator` + a dev-client rebuild). Recommended follow-up if web avatar display matters.

---

### [2026-06-11] — Fix: sign-in → welcome race, + full auth-flow audit & hardening (homeowner + provider)

**Type:** Fix
**Affected areas:** apps/mobile
**MVP features touched:** MVP-1 (auth/onboarding), MVP-10 (provider onboarding)
**Agent/Author:** Claude (diagnosis + store fixes) + rn-screens subagent (screen fixes); 4 parallel read-only audit agents

#### What changed
**Reported bug — sign-in bounced existing users to the welcome screen.** Root cause (systematic-debugging): a race. `sign-in.tsx` calls `router.replace('/')` immediately after `signIn()`, but `status` only flips to 'authenticated' inside `applySession`, which ran asynchronously via the `onAuthStateChange` listener (slower since the recent DB-derived-onboarding change). So `app/index.tsx` saw `status==='unauthenticated'` → redirected to `/(auth)/welcome`, navigating away permanently. **Fix:** `signIn`, `verifyEmailOtp`, and the confirmations-off `signUp` path now `await applySession(data.session)` before returning, so navigation never races session application.

**Full audit (4 parallel agents over session-core, homeowner flow, provider flow, shared UI) → fixes applied:**
- `stores/authStore.ts`: `applySession` wrapped so `status:'authenticated'` is always set on a valid session even if profile/address/provider enrichment throws (no more stranded blank screen); homeowner onboarding now only flushes **complete** pending setup (was flushing partial data → dropped service-interests + false "address missing" error). `signOut` no longer tears down the `onAuthStateChange` listener (it's a process-lifetime singleton; killing it stopped token refresh & next-session updates) and resets the provider draft.
- **`disabled={!formState.isValid}` deadlock:** `sign-in.tsx` and `verify-email.tsx` used RHF's default `onSubmit` mode, so `isValid` stayed false and the primary button was **permanently disabled on mobile**. Added `mode:'onChange'`.
- Double-submit guards: `verify-email` (3 trigger paths → `verifyOtp` "token already used"), `service-interest` (same-frame double-tap → double flush).
- `stores/providerOnboardingStore.ts`: now **persisted** (AsyncStorage) — a refresh mid-onboarding no longer wipes the draft and overwrites the providers row with placeholder data; reset on completion + sign-out.
- Provider `business` step: `years`/`employees` no longer gate Continue (they have no DB columns and were discarded).
- Polish: password/email autofill props (sign-in/sign-up), `keyboardAvoiding` on address-setup, back-button hidden on `router.replace`-reached onboarding steps (was ejecting users to welcome via safe-back), phone regex accepts formatting.

`npx tsc --noEmit` clean throughout.

#### Why it changed
Existing users couldn't reliably sign in (race + permanently-disabled button), and the broader audit found multiple latent strand/loop/double-submit bugs across both roles' auth flows.

#### What to watch out for
- **FLAGGED, NOT FIXED (needs a product decision):** the provider **banking step** hardcodes `connected=false` and its "Continue" lets a provider **finish onboarding with no Stripe Connect account** — they can be booked but not paid. Fixing needs Stripe account-status verification (deep-link return handling / status poll) and a decision on whether banking is mandatory to finish. Recommend gating completion on a connected account or an explicit "finish later" that blocks job acceptance.
- Lower-priority audit items left: tier-2 insurance fields lack validation; `flushInFlight` returns optimistic success (mitigated by the new double-submit guards); onboarding entry step is inconsistent (`/business` for new signups vs `/welcome` for resumers) — cosmetic.

---

### [2026-06-11] — Fix: provider onboarding never created the providers row (flow persisted nothing)

**Type:** Fix
**Affected areas:** apps/mobile
**MVP features touched:** MVP-10 (crew/provider onboarding), MVP-5 (availability/service area), MVP-2 (marketplace supply)
**Agent/Author:** Claude (Manual)

#### What changed
Root-caused why `providers` had **0 rows**: the entire provider onboarding flow collected data into per-screen local `useState` and only `router.push`ed forward — there was **no shared state and `providers.onboard()` (the `provider-onboard` edge fn that creates the row) was never called anywhere**. So no provider row, no service area, no availability ever persisted; `profile.tsx`'s "finish" update hit 0 rows. Fixes:
- **New `stores/providerOnboardingStore.ts`** (Zustand) carries business details + service area + availability across steps (+ the created `providerId`).
- **`business.tsx` / `service-area.tsx` / `availability.tsx`** now read from and write to the store (so back-nav restores input). Added a 5-digit zip gate on service-area.
- **`availability.tsx` "Continue"** now actually creates the provider: calls `onboard()` → `providerId`, then persists `provider_service_areas` (zip + radius) and `provider_availability` (one row per active day), with a loading state + error Alert. Verification/banking/profile then operate on the existing row.
- **`lib/api/providers.ts`:** `onboard()` now returns `{ providerId }`; added `saveServiceArea()` and `saveAvailability()` (delete-then-insert, idempotent on re-entry).

Verified every write passes RLS (`providers` owner-insert, `provider_team` owner, `provider_service_areas`/`provider_availability` owner-write). `npx tsc --noEmit` clean.

#### Why it changed
Provider signup looked like it worked (it navigated to the app) but persisted nothing — providers never entered the marketplace, and the recent DB-authoritative completion fix would have permanently blocked the finish step (0-row update). This makes the flow real.

#### What to watch out for
- `notice`, `maxJobs` (availability) and `years`, `employees`, `phone` (business) have **no DB columns** — collected but UI-only for now (no place to store them). Add columns/fields if they need to persist.
- Service-area stores the **zip only** (no geocode) → `providers.base_lat/lng` stay null; `providers-search` should match via `provider_service_areas.zip`. If search relies on lat/lng + radius, zips need geocoding.
- `providers-search` should ideally filter `onboarding_completed_at IS NOT NULL` so half-onboarded providers (row created at availability, finished at profile) don't surface mid-onboarding.
- Worth a real provider-signup smoke test end-to-end (couldn't run the app here; verified via schema + RLS + typecheck).

---

### [2026-06-11] — Fix: provider onboarding completion is DB-authoritative (+ provider profile silently not saving)

**Type:** Fix (also: Schema)
**Affected areas:** apps/mobile, Supabase
**MVP features touched:** MVP-10 (provider onboarding), MVP-2 (provider profile/price data)
**Agent/Author:** Claude (Manual)

#### What changed
Closed the provider parallel of the refresh/onboarding-routing bug, and fixed a silent data-loss bug found while doing it.
- **Schema:** migration `add_providers_onboarding_completed_at` adds `providers.onboarding_completed_at timestamptz` — the authoritative "provider finished onboarding" signal (there was none; completion was a client-only flag).
- **`stores/authStore.ts`:** `applySession` now derives provider `onboardingComplete` from the DB via a new `fetchProviderOnboarding(userId)` (`onboarding_completed_at IS NOT NULL`), mirroring the homeowner fix — so a refresh / sign-in on a fresh device no longer bounces an onboarded provider to `onboarding/welcome`. Replaced `fetchProviderId` (now folds id + completion into one query).
- **`app/(provider)/onboarding/profile.tsx` `onFinish`:** the providers update wrote to non-existent columns `price_min`/`price_max` (real columns are `price_range_min_cents`/`price_range_max_cents`) **and never checked the returned error** — so a provider's bio/price/portfolio silently failed to persist while onboarding still "completed." Fixed: correct `*_cents` columns (dollars → cents ×100), writes `onboarding_completed_at`, and now captures errors (`throw` on failure) + asserts a row was actually updated (`.select('id').maybeSingle()`), surfacing problems instead of silently entering the app with no profile data.

`npx tsc --noEmit` clean; provider schema verified.

#### Why it changed
The provider `onboardingComplete` was a persisted client flag (set at the profile step) with no DB backing — same stale-flag/refresh failure as the homeowner side. Investigating it surfaced that the completion update was both targeting wrong columns and swallowing its error.

#### What to watch out for
- Requires a `providers` row to already exist by the profile step (created at the business step). If it doesn't, `onFinish` now throws "Provider profile not found" rather than silently looping — correct surfacing, but verify the business step reliably creates the row.
- 0 provider rows existed at migration time, so no backfill was needed; any provider who "completed" onboarding under the old (silent-fail) code never persisted profile data and will re-enter onboarding (correct — their data was never saved).

---

### [2026-06-11] — Fix: safe back-navigation (no GO_BACK crash) + homeowner stranded on address-setup after refresh

**Type:** Fix
**Affected areas:** apps/mobile
**MVP features touched:** MVP-1 (onboarding/routing)
**Agent/Author:** Claude (diagnosis) + rn-screens subagent (back-button sweep)

#### What changed
Two navigation-correctness bugs:
- **"GO_BACK was not handled by any navigator":** every back button called `router.back()` unconditionally, which throws when the screen is the root of its stack (reached via `router.replace`, deep link, or fast-refresh). Added `lib/useSafeBack.ts` — `useSafeBack(fallback?)` calls `router.back()` only when `router.canGoBack()`, else `router.replace`s the role-appropriate home (or an explicit fallback). Swept it across **every** `router.back()` call site (~24 across auth/homeowner/provider screens + `AuthScreenShell` + the booking and onboarding `_layout`s); zero `router.back()` remain.
- **Refresh strands an onboarded homeowner on `address-setup`:** `onboardingComplete` was a client-only persisted Zustand flag, set true *only* in `flushPendingHomeownerSetup`. On refresh/sign-in `applySession` flipped `status` to authenticated without reconciling the flag against the DB, so a stale/un-rehydrated `false` made `app/index.tsx` redirect to address-setup (confirmed: homeowner "Alex" has a primary address yet would route there). Fix at the source: `applySession` now **derives `onboardingComplete` from the DB** for homeowners via `fetchPrimaryAddress(userId)` (truthy ⇒ onboarded) in the same `set()` that flips `status` — eliminating both the stale-flag and the rehydration race. First-time signup is unaffected (it still flows address-setup → `service-interest` flush).

`npx tsc --noEmit` clean.

#### Why it changed
Both surfaced during real device testing: back buttons crashed on replace-reached screens, and refreshing as an onboarded homeowner bounced the user back into onboarding.

#### What to watch out for
- **Provider parallel (known, not fixed):** provider `onboardingComplete` is still the persisted flag (set at `onboarding/profile.tsx`), because there's no clean single DB "provider onboarding complete" signal. A provider signing in on a fresh device could likewise be routed to onboarding — revisit with a real completion column/RPC when the provider flow is hardened.
- `useSafeBack`'s default fallback is role-inferred from the first route segment; pass an explicit `fallback` if a screen needs a specific destination.

---

### [2026-06-11] — Redesigned OTP "Confirm signup" email to the blue/white/gold brand + hosted logo

**Type:** Docs (email template + Supabase storage)
**Affected areas:** Supabase (storage), docs/ops
**MVP features touched:** MVP-1 (account creation)
**Agent/Author:** Claude (Manual)

#### What changed
Rebuilt the Supabase "Confirm signup" OTP email to match the new brand (blue `#2563EB` + white, gold `#F3B830` accent) seen on the splash/welcome/sign-up screens. Saved as `docs/ops/email-confirm-signup.html` (paste into Authentication → Email Templates; not in-repo runtime). Key changes vs the old dark-locked version:
- **Light-first, dark-mode adaptive:** white card on `#F5F8FF` in light; deep-blue surface (`#0B1220`/`#131C30`) with white text in dark — via `prefers-color-scheme` + Gmail `[data-ogsc]/[data-ogsb]` hooks.
- **Contrast fix for the code:** OTP renders blue (`#1D4ED8`) on a light-blue chip in light mode, gold (`#F3B830`) on dark in dark mode — high contrast either way (old version was white-on-white in dark).
- **Hosted text logo:** created a **public `email-assets` Storage bucket** (migration `create_public_email_assets_bucket`); the email `<img>`s the wordmark from `…/storage/v1/object/public/email-assets/wordmark.png`, on a white pill (mirrors welcome.tsx) so it shows in both modes, with `alt="MyHomebase"` fallback for image-blocking clients.
- **Responsive OTP:** tiered sizing (30→34→42→48px) with `white-space:nowrap` so it fills the chip and never wraps/clips across screen sizes; blue→gold gradient accent rule; refined spacing/hierarchy.

#### Why it changed
The prior email used the old dark green/amber theme, broke in dark mode (invisible code), and had no real logo. New brand is blue/white/gold and needs a professional, mode-safe verification email.

#### What to watch out for
- **REQUIRED manual upload:** `apps/mobile/assets/wordmark.png` must be uploaded to the `email-assets` bucket as `wordmark.png` (Supabase dashboard → Storage). Until then the logo shows the `alt` text. The MCP/CLI here can't push the binary (no storage-upload tool / no service-role key in hand).
- Template body lives only in the Supabase dashboard — `docs/ops/email-confirm-signup.html` is the version-controlled source of truth; keep them in sync.

---

### [2026-06-11] — Fix: stranded unconfirmed signups + resend UX; profile full-name + avatar upload

**Type:** Fix (also: Feature — avatar upload)
**Affected areas:** apps/mobile
**MVP features touched:** MVP-1 (account creation), MVP-2 (photo uploads / storage wiring)
**Agent/Author:** Claude (Manual)

#### What changed
- **Stranded unconfirmed signups (`stores/authStore.ts` `signUp`):** Supabase obfuscates a re-signup of an existing email by returning an empty `identities` array and sending NO new code — so an abandoned, unconfirmed account could never re-verify. `signUp` now detects `data.user.identities.length === 0` and explicitly calls `supabase.auth.resend({ type: 'signup', email })`; if resend reports the account is already confirmed it returns "This email is already registered. Please sign in instead." Otherwise it proceeds to the verify screen with a fresh code. (Confirmations-off path still returns a session and short-circuits.)
- **Resend UX (`app/(auth)/verify-email.tsx`):** the `resendEmailOtp` call was already correct; added a 45s cooldown + countdown label and clearer success/error copy so users don't trip Supabase's per-email rate limit and read it as "broken."
- **Profile shows full name (`app/(homeowner)/(tabs)/profile.tsx`):** both the mobile and desktop layouts displayed `user.email` under the avatar; now show `profile.firstName + lastName` (falls back to "Homeowner"), and the avatar initial derives from the name.
- **Profile picture upload (same file):** the avatar is now a tappable `EditableAvatar` (camera badge). Tapping picks a square image (`pickImageFromLibrary`), uploads it to the existing **`avatars`** Storage bucket at `{userId}/{timestamp}.{ext}` (path keyed to satisfy the bucket's `auth.uid()` RLS), writes the public URL to `profiles.avatar_url`, then `refreshProfile()`s so it renders immediately (via `expo-image`). This is the first real `storage.upload` call site wired in the app (closes part of code gap #2).

`npx tsc --noEmit` clean.

#### Why it changed
Abandoned signups stranded users (no way to get a new code); the profile screen showed an email where a name belongs and had no way to set a photo.

#### What to watch out for
- **No bucket creation needed** — `avatars` already exists (public, 5 MB, jpeg/png/webp) with owner-keyed RLS.
- **Operator dependency (unchanged):** the Supabase "Confirm signup" email template must emit `{{ .Token }}` for any code to arrive (flagged in the 2026-06-08 OTP entry).
- **Anti-enumeration tradeoff:** the new signUp branch reveals whether an email is already registered (acceptable for MVP UX; revisit if enumeration hardening is wanted).
- **iOS HEIC edge case:** if the picker returns `image/heic`, the upload will be rejected by the bucket's mime allowlist — most picks are jpeg/png; add `expo-image-manipulator` conversion if HEIC shows up.
- **Scope:** only the **homeowner** profile screen was updated. The provider profile screen has the same email-vs-name pattern and could get the same treatment on request.
- One **lingering unconfirmed user** exists in `auth.users` (1 of 3) — left in place (the new resend path handles it); say the word to delete it.

---

### [2026-06-11] — Fix: homeowner data tabs 403 (RLS helper EXECUTE) + addresses.unit 400

**Type:** Fix
**Affected areas:** Supabase, apps/mobile
**MVP features touched:** MVP-2, messaging
**Agent/Author:** Claude (diagnosis) + rn-screens subagent (code fix)

#### What changed
Diagnosed via Supabase API/Postgres logs that the homeowner Messages inbox (and Jobs/Subscriptions/Claims) returned HTTP 403 with `permission denied for function is_provider_team_member`. Root cause: the `jobs`/`subscriptions`/`claims` SELECT RLS policies are permissive and OR-combined, so Postgres evaluates the provider policy's `is_provider_team_member(provider_id) OR is_provider_owner(provider_id)` even for homeowner queries — but the `lockdown_definer_helpers_and_fk_indexes` migration had revoked EXECUTE on those `SECURITY DEFINER` helpers from `authenticated`. Fixes:
- **Migration `grant_execute_rls_helpers_to_authenticated`:** `GRANT EXECUTE` on `public.is_provider_team_member(uuid)` and `is_provider_owner(uuid)` `TO authenticated`. Verified `has_function_privilege('authenticated', …) = true` for both. Restores all four homeowner tabs at once.
- **`addresses.unit` 400 (separate bug surfaced in same logs):** the homeowner jobs/job-detail fetch embedded `bookings(addresses(street,unit,city,state,zip,neighborhood))`, but `addresses` has no `unit` column → 400. Removed `unit` from both selects + the now-dead `.unit` reads in `lib/api/jobs.ts` and `app/(homeowner)/(tabs)/jobs.tsx`. No `unit` is collected anywhere (address-setup has no unit field), so removal is correct. `npx tsc --noEmit` clean.

#### Why it changed
The lockdown migration hardened the definer helpers but broke every RLS policy that calls them, silently 403-ing homeowner reads. Latent since that migration; surfaced on first real homeowner testing.

#### What to watch out for
- If the helpers are ever locked down again, the RLS policies that call them must be refactored at the same time (or they'll 403 again).
- Consider whether `unit`/apartment number should be a first-class address field later — if so it needs a schema column + form field, not a re-added select.

---

### [2026-06-11] — Replaced auto-match-to-one with the curated-shortlist booking model

**Type:** Refactor (product mechanics)
**Affected areas:** apps/mobile, docs/guides
**MVP features touched:** MVP-2 (local marketplace / homeowner chooses), MVP-3 (trust signals in selection)
**Agent/Author:** Claude (orchestrated: 4 parallel read-only Explore agents + shared-components, rn-screens, booking-and-checkin build agents)

#### What changed
The homeowner booking wizard's "match" step no longer auto-matches to a single forced provider. It now presents a **curated shortlist** of up to 5 local, available, vetted pros as comparable cards; the homeowner chooses one.
- `app/(homeowner)/booking/match.tsx`: rewritten in place (same route — `STEP_ROUTES`/navigation untouched). Now resolves the homeowner ZIP from the primary address (`fetchPrimaryAddress`) and fetches the shortlist via the existing `providers.search(zip, serviceType)` (already returns a ranked `Provider[]`) — **no backend change needed**. Renders a horizontal carousel of `ProviderCard variant="shortlist"`; selection defaults to none (CTA disabled until the homeowner taps), so choice is explicit. Trust rationale (`generate-trust-rationale`) fires only for the selected pro, not all 5.
- `components/shared/ProviderCard.tsx`: added a `shortlist` variant + `selected` prop surfacing all four comparable signals (trust, price, availability, work-sample thumbnails) with a blue selected border/check. Existing compact/standard/expanded variants untouched (no directory regression).
- `lib/api/bookings.ts`: removed the now-orphaned `route()` wrapper + `RouteMatch` type (match.tsx was its only caller; `route-booking` edge fn is deprecated for this flow but left deployed).
- Copy: 11 mobile strings + 4 `FRONTEND_GUIDE` spec lines that advertised "one pro per booking / we found your pro / we route to one verified pro per inquiry / perfect match" replaced with shortlist language ("compare vetted pros," "you choose who to hire").

**The preserved seam:** the chosen provider still flows downstream via `bookingStore.setMatchedProvider(id)` → details → payment → `booking-create` → confirmation → check-in → capture → ledger, all **unchanged**. The change is confined to the discovery→selection front half.

**Honest thin-supply states:** 0 pros → `EmptyState` ("No pros serve your area yet"), no fabricated cards; 1–2 → shows the real count ("2 pros serve your area"); 3–5 → "Compare N vetted pros near you." Never pads to a fake 5.

#### Why it changed
Auto-match-to-one shut out qualified providers (undermining the "no pay-per-lead, fair shot" promise), removed the homeowner's ability to compare/choose (contradicting the core differentiator), and leaned on cold-start ranking confidence that doesn't exist with thin trust data.

#### What to watch out for
- `providers-search`/`route-booking` edge function sources are **not in the repo** (deployed-only). The shortlist relies on `providers-search` returning a sensibly-ranked, capped set per ZIP+service; if it returns unranked or too many, that's a server-side tweak (client slices to 5).
- `route-booking` is now dead for the booking flow but still deployed — remove server-side when convenient.
- Verified: `tsc` clean; zero remaining auto-match copy; no client path can produce a single forced match.

---

### [2026-06-08] — Brand color refactored green → blue (mobile + admin)

**Type:** Refactor
**Affected areas:** apps/mobile, apps/admin
**MVP features touched:** None (visual rebrand only — no logic/flow changes)
**Agent/Author:** Claude (orchestrated: 5 read-only audit subagents + 3 build subagents — design-system, rn-screens, admin-nextjs)

#### What changed
Swapped the app's brand color from the forest-green `primary` ramp to a blue ramp (Tailwind blue, anchored so `primary[600] = #2563EB` — the load-bearing CTA shade, 148 refs). Because both apps consume brand color through a single `primary` token, the swap cascades automatically to every `colors.primary[*]` consumer and `primary-NNN` Tailwind class. Edits:
- `apps/mobile/tokens/colors.ts`: `primary` 50–900 → blue ramp; `background` `#F8F6F1` (cream) → `#F5F8FF` (cool near-white); `serviceLawnTint`/`serviceCleaningTint` cool-shifted.
- `apps/mobile/tokens/serviceTints.ts`: warm tints (cleaning/pest/gutter/tree/lawn) cool-shifted; header comment updated.
- `apps/mobile/app.json`: splash/adaptiveIcon/web theme `#1A3D2B` → `#2563EB`; web bg → `#F5F8FF`.
- Mobile hardcoded stragglers: `components/LiquidGlassTabBar.tsx` cream translucent bar → cool; `(provider)/onboarding/business.tsx` green-tinted idle border → blue; `(provider)/(tabs)/jobs.tsx` "Confirmed" status pill moved off the **brand** token to the **success** (green) token so it matches the homeowner screen and the mockups (green "Confirmed").
- `apps/admin/tailwind.config.ts`: `primary` ramp → same blue; `cream` token `#F8F6F1` → `#F5F8FF`. `apps/admin/app/globals.css`: body bg → `#F5F8FF`. Two error-page inline `#1f5e3f` buttons → `#1D4ED8`.

Kept unchanged (verified): semantic `success`/`successLight` green (`#2D6A4F`/`#D1FAE5` — Confirmed/Completed/Approved/Licensed/verified badges, "available today", escrow), gold `accent` (star ratings), `info`/`error`/neutrals. `npx tsc --noEmit` clean for both apps.

#### Why it changed
New product mockups moved the visual identity from green to blue (`#2563EB`). The audit confirmed brand-green and semantic-green were cleanly separable, so only brand chrome flipped — success/quality green stays green.

#### What to watch out for
- **Operator/asset action (not code):** `apps/mobile/assets/{icon,splash-icon,adaptive-icon,favicon}.png` are green-branded raster images and must be regenerated in the new blue palette — they cannot be edited as text.
- `info` is intentionally left at `#2563EB`, so `Pill tone="primary"` and `tone="info"` now render the same blue (matches the mockups' single-blue language; dedupe later if a distinct info hue is wanted).
- The admin `cream` Tailwind token now holds a cool value (`#F5F8FF`) — name kept to avoid churning 4 call sites; rename if it bothers.
- Color/typecheck verified, but no on-device visual smoke-test was run — worth a quick Expo render of the booking + check-in flows.

---

### [2026-06-08] — Email verification switched from confirmation link to 6-digit OTP code

**Type:** Feature
**Affected areas:** apps/mobile
**MVP features touched:** MVP-1 (homeowner account creation)
**Agent/Author:** Claude (Manual)

#### What changed
Replaced the link-based "Almost there / check your email" confirmation state with an in-app one-time-code flow:
- `authStore.ts`: added `verifyEmailOtp(email, token)` → `supabase.auth.verifyOtp({ email, token, type: 'signup' })` and `resendEmailOtp(email)` → `supabase.auth.resend({ type: 'signup', email })`.
- New screen `app/(auth)/verify-email.tsx`: 6-digit code entry (RHF+Zod, `^\d{6}$`) with `textContentType="oneTimeCode"` + `autoComplete="one-time-code"` for OS autofill, a Verify button, and a Resend link. On success routes homeowners → `/(auth)/address-setup`, providers → `/(provider)/onboarding/business`.
- `sign-up.tsx`: on `needsEmailConfirmation`, now `router.push`es to `verify-email` (passing email + role) instead of rendering the old inline link branch. Removed that branch + its orphaned state/imports (SafeAreaView, Eyebrow, AuthSplitLayout).

`npx tsc --noEmit` clean.

#### Why it changed
The link flow never handed a session back to the native app (no deep link / `emailRedirectTo`), so users had to confirm in a browser then re-sign-in. An emailed code keeps the user in-app and `verifyOtp` returns a session directly. iOS/Android autofill the code, so it's typically one tap.

#### What to watch out for
- **REQUIRED operator step (blocker):** the Supabase "Confirm signup" email template must emit `{{ .Token }}` (the 6-digit code), not just `{{ .ConfirmationURL }}`. Until that template change is made in the Supabase dashboard (Authentication → Email Templates), no code is sent and the screen cannot verify. This is NOT a code change and cannot be done from the repo.
- Email confirmation must stay ENABLED (it currently is). If it's disabled, signUp returns a session immediately and the verify screen is skipped (by design).

---

### [2026-06-08] — HO1 (Homeowner Account & Home Setup) production-readiness audit + surgical fixes

**Type:** Fix (also: Schema, Refactor)
**Affected areas:** apps/mobile, Supabase
**MVP features touched:** MVP-1, MVP-2 (ZIP scoping for provider search), data hook / non-negotiable #4
**Agent/Author:** Claude (orchestrated subagents)

#### What changed
Audited the HO1 subsystem (the `(auth)` flow + `authStore`) against `docs/subsystems/homeowners/HO1_Account_and_Home_Setup.md` across four lenses (conformance, correctness, security, simplification), then applied surgical fixes:
- **ZIP source-of-truth (Critical):** `app/(homeowner)/(tabs)/index.tsx` and `app/(homeowner)/providers/index.tsx` now source the home ZIP for provider search from the persisted primary address via `fetchPrimaryAddress(userId)` (TanStack Query, `enabled: !!zip`), instead of the transient `pendingHomeownerSetup.zip` that becomes null after flush. Removed the `'00000'` fallback that was silently mis-scoping the marketplace for every onboarded/returning homeowner.
- **Service-interest persistence:** added `homeowners.service_interests service_type[]` (migration `add_homeowner_service_interests`, nullable, covered by existing RLS) and `flushPendingHomeownerSetup` now writes the selected interests (filtered to valid `service_type` enum values). Previously collected then silently dropped.
- **`authStore.ts` correctness:** re-entrancy guard on flush (kills the double-`applySession` race), idempotent address write (SELECT existing primary before insert — `addresses` has no unique constraint on `profile_id`), flush now returns `{ error }` and callers branch on it, `signOut` unsubscribes + resets the auth listener so re-bootstrap works.
- **Routing/guards:** `app/index.tsx` homeowner branch now gates on `onboardingComplete`; the three role-group `_layout.tsx` files now redirect on role mismatch (defense-in-depth; RLS already backstops data).
- **Forms:** `sign-in.tsx` and `address-setup.tsx` converted from hand-rolled `useState` to RHF+Zod (ZIP `^\d{5}(-\d{4})?$`, state `^[A-Z]{2}$`); pending-setup keys preserved.
- **Dead code + simplification:** deleted unused `lib/api/auth.ts` (+ its barrel re-export in `lib/api/index.ts`); extracted `AuthScreenShell` / `WhyHomeBaseCallout` / `AuthHeader` into `components/auth/`, cutting `sign-up.tsx` 517→392 LOC; removed no-op code and what-not-why comments.

RLS verified green on `addresses`, `homeowners`, `profiles`, `demand_events` (ownership tied to `auth.uid()`). `npx tsc --noEmit` clean.

#### Why it changed
First subsystem in the subsystem-by-subsystem production-readiness pass. The ZIP bug silently broke the downstream marketplace; the dropped service interests violated the data-hook non-negotiable; the flush had race/idempotency/gating defects allowing half-finished accounts.

#### What to watch out for
- `demand_events` is currently **empty** — no demand signals are written anywhere yet (search-event writes belong to Subsystem 2 / `providers-search`). Non-negotiable #4 is still only partially satisfied; revisit when auditing discovery/search.
- Password rule in `sign-up.tsx` is stricter than the HO1 doc (adds uppercase+number on top of min-8) — the doc should be updated to match the code, not the reverse.
- Supabase Auth project settings (min password length, email-confirmation toggle) and server-side `zip`/`service` validation in edge functions were NOT verified — operator/remote items.
- `1.1` fix kept the redundant `getSession` in bootstrap (neutralized by the guard) rather than removing it, to avoid risking the cold-start auth transition.

---

*(No entries yet. The first agent to make a change adds their entry here, above this line.)*

# Audit: Integrations, Settings Gaps, Custom Job Pipeline

**Date:** 2026-06-24  
**Scope:** Read-only. No code or DB changes.  
**Auditor:** Claude Sonnet 4.6 subagent

---

## Part 1 — External Integrations

### 1.1 Stripe Connect (Payments)

**Status: Fully wired but env-gated behind MOCK_PAYMENTS flag.**

All money operations go through `apps/mobile/lib/payments/mockGateway.ts` (line 12):
```
export const MOCK_PAYMENTS = process.env.EXPO_PUBLIC_MOCK_PAYMENTS !== 'false';
```
When `EXPO_PUBLIC_MOCK_PAYMENTS` is not explicitly set to `'false'`, all calls route to the `mock-payments` Edge Function.

The real Stripe path is **code-complete** in `apps/mobile/lib/api/payments.ts` — every operation has a guarded real path below each mock guard:
- `stripe-attach-payment-method` (line 16)
- `stripe-create-intent` (line 38)
- `stripe-capture-on-completion` (line 57)
- `stripe-instant-payout` (line 76)
- `stripe-onboard-provider` (line 94 / 141)
- `stripe-balance` (line 110)
- `stripe-bank-account` (line 129)

**Critical known gap in payment step:** `apps/mobile/app/(homeowner)/booking/payment.tsx` line 94 hardcodes `paymentMethodId: 'pm_card_visa'` — real Stripe PaymentSheet from `@stripe/stripe-react-native` is never invoked. The comment at that line acknowledges this explicitly: `"DEFERRED: real Stripe PaymentSheet integration."` This means even with `MOCK_PAYMENTS=false`, the card input form collects nothing real — the field values (`cardNumber`, `cardExp`, `cardCvc`, lines 59–61) are captured in local state but passed to the mock token, not to Stripe's SDK. A real card tokenization step is missing.

**What's missing to go live:**
- Set `EXPO_PUBLIC_MOCK_PAYMENTS=false`
- Provision Stripe keys in env
- Replace the `pm_card_visa` stub in `booking/payment.tsx:94` with actual `@stripe/stripe-react-native` `PaymentSheet` or `CardField` integration
- Ensure Stripe Connect Express webhooks are wired (capture, payout, dispute events)

---

### 1.2 Supabase Storage (Image Upload)

**Status: Fully wired.**

`apps/mobile/lib/api/storage.ts` implements:
- `pickImageFromLibrary` / `pickImageFromCamera` — expo-image-picker with base64
- `uploadAsset` — uploads via `supabase.storage.from(bucket).upload()`
- Five buckets defined: `avatars`, `portfolio-photos`, `booking-photos`, `claim-photos`, `verification-docs`
- `avatars` and `portfolio-photos` are public; others return signed URLs (3600s)
- Avatar upload used in homeowner profile (line 76–81 of `profile.tsx`)
- Check-in before/after photos uploaded through this in `ProviderCheckIn.tsx`
- Claims photos uploaded through this in claims flow

**What's missing:**
- No bucket creation guard or validation that the five buckets exist in the target Supabase project. If they were not created in the migration, uploads silently fail.
- `portfolio-photos` bucket is defined but no provider UI exists to upload portfolio photos post-onboarding (the provider profile has no avatar upload flow unlike the homeowner).

---

### 1.3 Push Notifications

**Status: Partially wired — registration is real; delivery is unverified.**

`apps/mobile/app/_layout.tsx` (lines 53–78) dynamically imports `expo-notifications`, requests permission, and calls `notificationsApi.register(token, platform)` on auth state change.

`apps/mobile/lib/api/notifications.ts` calls `invokeFn('register-push-token', {...})` — so the token is sent to the `register-push-token` Edge Function.

**What's missing:**
- No frontend notification handler is set up (`Notifications.setNotificationHandler` / `addNotificationReceivedListener`). Tokens are registered but incoming push notifications are not handled in-app (no foreground display, no tap routing to the correct screen).
- No homeowner UI for notification preferences. No provider UI either (the "Notification preferences" row in provider profile at line 467 has no `onPress` handler — it's a dead row).
- No in-app notification center / bell icon. Critical for job match alerts, check-in confirmations, quote arrivals.

---

### 1.4 Google Calendar

**Status: Stub — connect URL initiates OAuth but integration is not complete.**

`apps/mobile/lib/api/calendar.ts` calls `invokeFn('calendar-connect', {})` and returns an `authorizeUrl`.

In provider profile (lines 240–247 of `profile.tsx`), `handleCalendarPress` opens the URL via `Linking.openURL`. The `calendar_tokens` table is queried to show connected status.

In `apps/mobile/app/(provider)/(tabs)/jobs.tsx` (lines 106–113), accepted/declined jobs trigger `invokeFn('calendar-sync', { jobId, action })` — this is a best-effort fire-and-forget.

**What's missing:**
- OAuth redirect after the `authorizeUrl` flow — there is no deep-link handler to catch the callback URL and store the token. The user is sent to a browser but there's no return path defined.
- No `calendar-disconnect` flow — once connected, no UI to unlink.
- Calendar sync is best-effort (`console.log` on failure) with no retry or status feedback.

---

### 1.5 Maps — Photon/Esri/Street View

**Status: Photon fully wired; Esri fully wired; Street View conditionally wired (keyless fallback).**

- **Photon** (`apps/mobile/lib/geo/photon.ts`): Keyless OSM geocoder. Used for address autocomplete in `AddressAutocomplete.tsx`. Fully functional.
- **Esri** (`apps/mobile/lib/geo/esri.ts`): Keyless satellite imagery URL builder. Used in home dashboard `AdaptiveHero.tsx`. Fully functional.
- **Street View** (`apps/mobile/lib/geo/streetview.ts`): Uses `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Returns `null` when no key is set (line 39: `if (!GOOGLE_KEY) return null`). The caller falls back to the Esri satellite view. The feature works but Street View imagery only activates when the Google Maps API key env var is provisioned.

**What's missing to enable Street View:**
- Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in env with a key that has the Street View Static API enabled.

---

### 1.6 AI — Claude Haiku (Check-in Grading / Trust "Why")

**Status: Backend-only — client fires `provider-checkin` Edge Function; grading assumed to happen server-side.**

`apps/mobile/lib/api/jobs.ts` line 113: `submitProviderCheckIn` calls `invokeFn('provider-checkin', input)` with `beforePhotoUrl`, `afterPhotoUrl`, `notes`, `tags`.

The client code has no direct Anthropic API calls. Per CLAUDE.md, Claude Haiku is responsible for check-in grading and trust score "why" lines. This is expected to run inside the `provider-checkin` Edge Function.

**What's missing on the client side:**
- No UI surfaces the "why this score" line from the AI back to the provider after check-in. The ProviderCheckIn success step shows a celebration screen but doesn't display the AI-generated trust rationale.
- No homeowner-facing "what the AI found" summary after a check-in is submitted and reviewed. This is a trust-builder that is missing from the UI.
- Cannot confirm without reading Edge Function source whether Haiku is actually called or stubbed inside `provider-checkin`.

---

## Part 2 — Settings Gap Analysis

### 2.1 Homeowner Profile / Settings Screen

**File:** `apps/mobile/app/(homeowner)/(tabs)/profile.tsx`

**Settings that EXIST:**
- Avatar photo (upload via Storage — wired)
- Subscriptions (links to subscription list)
- Job history (links to jobs tab)
- Damage claims (links to claims)
- Terms of service (external link)
- Privacy policy (external link)
- Sign out

**Settings that SHOULD EXIST for production (not present):**

| Category | Missing Setting | Notes |
|---|---|---|
| Account | Edit name / email | No form to change first/last name or email. Profile data is read-only after onboarding. |
| Account | Change password / reset | No password change or "forgot password" flow from within the app. |
| Account | Manage addresses | No way to add/edit/delete home addresses post-onboarding. Address is set once at signup. |
| Notifications | Notification preferences | Not present at all. No toggle for push types (job updates, chat, reminders, promotions). |
| Payments | Saved payment methods | No card management screen. Card is added once per booking and there is no persistent payment method list view. |
| Privacy | Data & privacy controls | No data export, no CCPA/GDPR request form. |
| Help | Help / Support | No in-app help center, FAQ, or contact support flow. |
| Account | Delete account | No account deletion flow. Required by App Store guidelines. |

---

### 2.2 Provider Profile / Settings Screen

**File:** `apps/mobile/app/(provider)/(tabs)/profile.tsx`

**Settings that EXIST:**
- Trust score display (wired)
- Jobs this month count (wired)
- Crew & team management (wired, owner-only)
- Calendar integration (connect via OAuth — partial, see section 1.4)
- Tier 1 / Tier 2 verification status display (real data from `verification_tier`)
- Notification preferences row (dead — no `onPress`)
- Messages (links to inbox)
- Sign out

**Provider-specific settings with dead/stub rows:**
- "Edit profile (bio, photos, pricing)" — line 344: `SettingsRow` with no `onPress`. No screen exists behind this.
- "Service area" — line 345: `SettingsRow` with no `onPress`. No post-onboarding screen to edit service area.
- "Availability" — line 346: `SettingsRow` with no `onPress`. No post-onboarding availability editing.
- "Preview public profile" — line 571–583: `Pressable` with no `onPress`.

**Settings that SHOULD EXIST for production (not present):**

| Category | Missing Setting | Notes |
|---|---|---|
| Business | Edit bio, photos, pricing | Rows exist but are dead — no destination screen. |
| Business | Service area editor | Row exists but is dead. The onboarding service-area screen is not reachable post-onboarding. |
| Business | Availability calendar | Row exists but is dead. |
| Payout/Banking | View/change bank account | Not accessible post-onboarding. Banking screen only exists in the onboarding flow. |
| Business | Public profile preview | Button is rendered but has no `onPress`. |
| Account | Change password | Not present. |
| Notifications | Notification preferences | Row exists but has no `onPress`. |
| Help | Help / Support | Not present. |
| Account | Delete account | Not present. |
| Avatar | Provider avatar upload | Homeowner has avatar upload; provider profile shows initial letter with no photo upload. |

---

## Part 3 — Custom Job Pipeline

### 3.1 Homeowner Side (Create → Submit)

**Flow is fully implemented and working.**

Steps:
1. `/(homeowner)/post-job/service.tsx` — pick service type; writes to `postingStore.draft.serviceType`
2. `/(homeowner)/post-job/headline.tsx` — write headline; writes to `postingStore.draft.headline`
3. `/(homeowner)/post-job/description.tsx` — write description; writes to `postingStore.draft.description`
4. `/(homeowner)/post-job/photos.tsx` — attach photos; writes to `postingStore.draft.photos`
5. `/(homeowner)/post-job/review.tsx` — shows summary, calls `postingsApi.create()` on submit
6. `/(homeowner)/post-job/submitted.tsx` — success screen with posting ID

`apps/mobile/lib/api/postings.ts` `create()` (line 36–63) inserts directly into `postings` table with:
- `homeowner_id`, `service_type`, `headline`, `description`, `photo_urls`
- `status: 'open'`, `match_count: 0`, `posted_at: now`

Homeowner can view all their postings at `/(homeowner)/postings/index.tsx` and drill into individual posting detail at `/(homeowner)/postings/[id].tsx`.

The posting detail screen (line 186–190) shows a `Review X quotes` button if `matchCount > 0` — but this button has no `onPress`. Quotes are not surfaced in any list UI.

### 3.2 Matching Logic

**No client-side matching exists. Matching is expected to happen in an Edge Function.**

The `postings` table has `match_count` and `matched_provider_id` columns (confirmed by the DB row type in `postings.ts` line 6–16). These are set by a server-side process (Edge Function or DB trigger). There is no visible matching Edge Function call from the client — the homeowner simply polls for status changes.

### 3.3 Provider Side — The Missing Half

**There is no provider-side screen, API function, or route for viewing or responding to postings.**

Confirmed gaps:
- `apps/mobile/lib/api/postings.ts` has only three functions: `create`, `listForHomeowner`, `get`. There is no `listForProvider`, `listOpenPostings`, or `submitQuote` function.
- No screen under `apps/mobile/app/(provider)/` references postings in any form (grep returned zero matches).
- The provider jobs screen (`/(provider)/(tabs)/jobs.tsx`) shows three segments: "New" (job requests from bookings), "Active", "Completed". None of these fetch from `postings`.
- `ProviderJobRequest` type (referenced in jobs.tsx lines 118, 130) maps to `status: 'booked'` jobs — these are jobs that came through the standard booking wizard, not from postings.

**What is missing to close the custom job loop:**

| Gap | Details |
|---|---|
| Provider posting feed | A new tab or segment where providers see open `postings` in their service area (`status='open'`, zip overlap). |
| Quote submission API | `postingsApi.submitQuote(postingId, { amountCents, message, availableAt })` — does not exist. No `quotes` table is visible in client code (no select from a quotes table anywhere). |
| Quote submission UI | No screen under `(provider)` for drafting and sending a quote. |
| Quote review UI (homeowner) | `/(homeowner)/postings/[id].tsx` line 185 renders "Review X quotes" button with no `onPress` and no route behind it. |
| Quote accept flow | After the homeowner picks a quote, no flow converts the accepted quote into a booking. The `matched_provider_id` and `status: 'matched'` on the posting would need to convert into a `bookings` + `jobs` row. |
| Matching notification | No push notification sent to homeowner when `match_count` increments, or to provider when a posting in their area is created. |

### 3.4 Full Flow State Diagram

```
Homeowner: post-job wizard → postings row (status='open')
                                    ↓
                          [MISSING: server-side match logic]
                                    ↓
                          postings.match_count++  ← no trigger visible client-side
                                    ↓
                          [MISSING: provider sees posting in feed]
                                    ↓
                          [MISSING: provider submits quote]
                                    ↓
                          [MISSING: homeowner reviews quotes list]
                                    ↓
                          [MISSING: homeowner accepts quote → booking created]
                                    ↓
                          postings.status='matched', matched_provider_id set
                          (partially rendered in /(homeowner)/postings/[id].tsx)
                                    ↓
                          [MISSING: matched card → book/schedule action wired]
                          (Message + Schedule buttons at line 223 have no onPress)
```

---

## Summary — Severity-Ranked Gaps

| # | Finding | File | Severity |
|---|---|---|---|
| 1 | Provider has **no way to see or respond to custom job postings** — the provider-side posting feed, quote API, and quote UI are entirely absent | `lib/api/postings.ts`, `app/(provider)/` | BLOCKER |
| 2 | Card payment step hardcodes `pm_card_visa` stub — **no real card tokenization** even with `MOCK_PAYMENTS=false` | `app/(homeowner)/booking/payment.tsx:94` | BLOCKER (pre-launch) |
| 3 | Push notification **incoming handler not set up** — tokens registered but foreground display and tap routing are absent | `app/_layout.tsx`, `lib/api/notifications.ts` | HIGH |
| 4 | "Review quotes" button on posting detail has **no `onPress`** — homeowner cannot see provider quotes even if they existed | `app/(homeowner)/postings/[id].tsx:185` | HIGH |
| 5 | Provider profile has **three dead settings rows** ("Edit profile", "Service area", "Availability") with no `onPress` and no destination screen | `app/(provider)/(tabs)/profile.tsx:344–346` | HIGH |
| 6 | Google Calendar OAuth has **no deep-link return handler** — user is sent to browser but the token callback URL is never caught | `lib/api/calendar.ts`, `app/(provider)/(tabs)/profile.tsx:240` | HIGH |
| 7 | Homeowner settings missing **edit name, change password, manage addresses, delete account** — App Store submission will be rejected without delete account | `app/(homeowner)/(tabs)/profile.tsx` | HIGH |
| 8 | AI Haiku **"why this score" line is never surfaced to the user** in any post-check-in screen or trust score UI | `components/checkin/ProviderCheckIn.tsx`, `components/shared/TrustScoreDisplay.tsx` | MEDIUM |
| 9 | Provider avatar upload **does not exist** — homeowner has editable avatar; provider shows initials only with no upload path | `app/(provider)/(tabs)/profile.tsx:492–513` | MEDIUM |
| 10 | Street View is silently disabled because **`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is unset** — Esri satellite used as fallback (acceptable but reduces visual quality) | `lib/geo/streetview.ts:39` | LOW |

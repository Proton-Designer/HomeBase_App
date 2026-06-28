T# HomeBase — Operations TODO (everything still needed for production)

> **Purpose:** Codebase is structurally complete. This file enumerates every API key, third-party account, dashboard configuration step, and store-listing task that must be completed **by the operator (Ayman / Kareem)** before public launch — and every credential Claude needs handed over to finish wiring.
> **Audience:** Founder + Claude Code agents. Treat each unchecked item as a hard blocker for going live.
> **Last updated:** 2026-05-14
> **Companion file:** `MVP_HB_context copy.md` § 16 covers what is already DONE.

---

## How to use this file
1. Work top-to-bottom — earlier sections unblock later ones (e.g., Supabase secrets gate Edge Function execution, which gates everything else).
2. When you complete an item, replace `[ ]` with `[x]` and (if relevant) paste the resulting ID/URL into the row so Claude can reference it later without asking again.
3. Anything labeled **HAND TO CLAUDE** is a value Claude needs in the conversation (or pasted into the appropriate `.env` / dashboard) to finish the wiring.
4. Anything labeled **OPERATOR-ONLY** must be done by a human with billing access — Claude cannot complete it via MCP/CLI.

---

## 1. Supabase — Edge Function secrets

**Where to set:** Supabase Dashboard → Project `HomeBase_MVP` → Project Settings → Edge Functions → Secrets.
**Project ref:** `rukpypuzfqrswiybvbkg`
**Source of truth:** `Marketplace_MVP/Full_Backend_Implementation/BACKEND_ENV.md`

### 1.1 Always required
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — auto-provisioned by Supabase but Edge Functions must reference it explicitly. **OPERATOR-ONLY** (already exists; verify it's exposed to functions).
- [ ] `SHARED_TRUST_SECRET` — any random 32-byte string. Used by `compute-trust-score` to gate the cron caller. Generate with `openssl rand -hex 32`. **HAND TO CLAUDE** (also set as a Postgres GUC; see §1.7).

### 1.2 Stripe (Batch C)
- [ ] `STRIPE_SECRET_KEY` (live `sk_live_…` or test `sk_test_…` for staging) — **HAND TO CLAUDE**
- [ ] `STRIPE_WEBHOOK_SECRET` (whsec_…) — **HAND TO CLAUDE** (obtained when registering the webhook; see §2.2)
- [ ] `APP_FEE_BPS_ONE_OFF` = `1750` (17.5% one-off take per `MVP_HB_context copy.md` §5; default in code is `1000`)
- [ ] `APP_FEE_BPS_SUB` = `1000` (10% subscription take per `MVP_HB_context copy.md` §5; default in code is `1200`)
- [ ] `ESCROW_BPS` = `500` (5% holdback)
- [ ] `ESCROW_HOLD_DAYS` = `7`

### 1.3 Anthropic (Batch D)
- [ ] `ANTHROPIC_API_KEY` (`sk-ant-…`) — **HAND TO CLAUDE**. Without this, `homeowner-checkin`, `provider-checkin`, and `generate-trust-rationale` fall through to non-AI defaults (functions tolerate absence).
- Model in use: `claude-haiku-4-5-20251001`.

### 1.4 Telnyx (Batch E — SMS)
- [ ] `TELNYX_API_KEY` (V2 key, prefix `KEY…`) — **HAND TO CLAUDE**
- [ ] `TELNYX_FROM_NUMBER` (E.164, e.g. `+12145551234`) — **HAND TO CLAUDE**
- [ ] `TELNYX_MESSAGING_PROFILE_ID` — **HAND TO CLAUDE** (the A2P 10DLC campaign anchor)

### 1.5 Resend (Batch E — Email)
- [ ] `RESEND_API_KEY` (`re_…`) — **HAND TO CLAUDE**
- [ ] `RESEND_FROM` (e.g. `HomeBase <hello@homebase.app>`) — defaults exist in code; only override if the sending domain differs.

### 1.6 Google (Batch E — Calendar OAuth)
- [ ] `GOOGLE_CLIENT_ID` — **HAND TO CLAUDE**
- [ ] `GOOGLE_CLIENT_SECRET` — **HAND TO CLAUDE**
- [ ] `GOOGLE_REDIRECT_URI` = `homebase://calendar-callback` (default already in code)

### 1.7 Postgres GUC for cron
- [ ] Run once in the SQL editor (Database → SQL):
  ```sql
  alter database postgres set app.shared_trust_secret = '<the SHARED_TRUST_SECRET value from §1.1>';
  ```
  This lets `pg_cron` read the secret via `current_setting('app.shared_trust_secret', true)` without leaking it into `cron.job` metadata.

---

## 2. Stripe — full setup

### 2.1 Stripe account + Connect platform
- [ ] **OPERATOR-ONLY** Create a Stripe account at https://dashboard.stripe.com if one doesn't exist
- [ ] **OPERATOR-ONLY** Enable **Connect** → choose **Express** accounts → set platform branding (logo, color, support email)
- [ ] **OPERATOR-ONLY** In Connect settings, enable **Instant Payouts** for connected accounts (required for same-day-payout pitch — see `MVP_HB_context copy.md` §3)
- [ ] **OPERATOR-ONLY** Provide business details (tax ID, bank account) to receive platform fees
- [ ] **OPERATOR-ONLY** Decide test vs. live for MVP. Pilot in Austin → start with test keys, flip to live before first paying booking.

### 2.2 Webhook registration
- [ ] **OPERATOR-ONLY** In Stripe Dashboard → Developers → Webhooks → Add endpoint:
  - URL: `https://rukpypuzfqrswiybvbkg.supabase.co/functions/v1/stripe-webhook`
  - Events to subscribe to: `account.updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `payout.paid`, `payout.failed`
- [ ] Copy the resulting **Signing secret** (`whsec_…`) into Supabase as `STRIPE_WEBHOOK_SECRET` (§1.2)
- [ ] Verify with a test event: dashboard → Send test webhook → confirm 200 in Supabase Edge Function logs

### 2.3 Publishable key for mobile app
- [ ] Copy the **Publishable key** (`pk_live_…` or `pk_test_…`) into `apps/mobile/.env` as `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (§5.1)
- [ ] **HAND TO CLAUDE** if a real Stripe PaymentSheet integration is desired now (FE currently uses the `'pm_card_visa'` mock token under `USE_MOCKS=true` — needs swap to `@stripe/stripe-react-native` PaymentSheet before public launch, per `MVP_HB_context copy.md` decision log)

---

## 3. Telnyx — full setup

**Order matters** — A2P 10DLC registration takes 1-3 business days, so start this early.

- [ ] **OPERATOR-ONLY** Sign up at https://telnyx.com (no card needed to start)
- [ ] **OPERATOR-ONLY** Purchase a US local number (Numbers → Buy Numbers, ~$1/mo)
- [ ] **OPERATOR-ONLY** Create a **Messaging Profile** (Messaging → Messaging Profiles), name it `HomeBase Transactional`. Copy the profile ID.
- [ ] **OPERATOR-ONLY** Generate a **V2 API Key** (Mission Control → API Keys → Create V2 key). Treat like a password.
- [ ] **OPERATOR-ONLY** Register a **10DLC campaign** (Messaging → 10DLC). Required for US-to-US A2P traffic. Use case: "Customer Care / Account Notifications". Approval 1-3 business days.
- [ ] **OPERATOR-ONLY** Attach the purchased number to both the messaging profile and the approved 10DLC campaign
- [ ] Paste API key, from number, and profile ID into Supabase secrets (§1.4)
- [ ] Send a test message: in Edge Function logs, invoke `send-sms` with `{to: '<your cell>', body: 'HomeBase test'}` and confirm SMS delivery

---

## 4. Anthropic / Resend / Google Cloud — third-party accounts

### 4.1 Anthropic
- [ ] **OPERATOR-ONLY** Sign up at https://console.anthropic.com
- [ ] **OPERATOR-ONLY** Add billing (set a usage cap, e.g. $200/mo at MVP scale — check-ins cost ~$0.001 each on Haiku)
- [ ] **OPERATOR-ONLY** Create an API key (`sk-ant-…`), paste into Supabase secrets as `ANTHROPIC_API_KEY` (§1.3)

### 4.2 Resend
- [ ] **OPERATOR-ONLY** Sign up at https://resend.com
- [ ] **OPERATOR-ONLY** Verify the sending domain (e.g. `homebase.app` — DNS records: SPF, DKIM, DMARC). Until verified, emails will go to a `onresend.dev` subdomain and trip spam filters.
- [ ] **OPERATOR-ONLY** Create an API key (`re_…`), paste into Supabase as `RESEND_API_KEY` (§1.5)
- [ ] (Optional) Connect Resend to Supabase Auth as the SMTP provider (§6.4) so confirmation emails come from HomeBase too

### 4.3 Google Cloud project
- [ ] **OPERATOR-ONLY** Create a Google Cloud project at https://console.cloud.google.com (e.g. `homebase-prod`)
- [ ] **OPERATOR-ONLY** Enable APIs: **Maps SDK for Android**, **Maps SDK for iOS**, **Maps JavaScript API**, **Places API**, **Geocoding API**, **Distance Matrix API**, **Calendar API**
- [ ] **OPERATOR-ONLY** Create an **API key** restricted to those APIs (Credentials → Create credentials → API key → restrict). Paste into `apps/mobile/.env` as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (§5.1)
- [ ] **OPERATOR-ONLY** Configure the OAuth consent screen (App name "HomeBase", user support email, developer email, app logo). Publish in production mode (not Testing) — Testing mode caps users at 100 and shows a scary warning.
- [ ] **OPERATOR-ONLY** Create **OAuth 2.0 Client IDs** for Calendar OAuth:
  - One for **Web application** with authorized redirect URI `https://rukpypuzfqrswiybvbkg.supabase.co/auth/v1/callback` (used by Supabase Auth Google provider — see §6.5)
  - One for **iOS** with the bundle ID
  - One for **Android** with the package name + SHA-1 fingerprint (get the SHA-1 from EAS credentials — see §8.2)
  - Paste Web client ID/secret into Supabase as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (§1.6)

---

## 5. Environment files (local + deployed)

### 5.1 `apps/mobile/.env` (already exists; example at `.env.example`)
Replace placeholder values with real ones:
```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_SUPABASE_URL=https://rukpypuzfqrswiybvbkg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DtmeztCM3z2A1Oy8RdL2YA_8qvpDs_a   # already set
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…   # from §2.3
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza…           # from §4.3
```
- [ ] Update file with real Stripe + Maps keys
- [ ] **OPERATOR-ONLY** Mirror these as EAS secrets so production builds get them (`eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value …`)

### 5.2 `apps/admin/.env.local` (already exists; example at `.env.local.example`)
```
NEXT_PUBLIC_SUPABASE_URL=https://rukpypuzfqrswiybvbkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…
SUPABASE_SERVICE_ROLE_KEY=eyJ…   # OPERATOR-ONLY — never expose to client
ADMIN_USE_MOCKS=false
```
- [ ] Paste the service-role key (Supabase Dashboard → Settings → API → service_role)
- [ ] **OPERATOR-ONLY** Mirror as Vercel project env vars (Production scope) when admin is deployed (§9)

---

## 6. Supabase Auth — dashboard configuration

Code-side wiring is complete (`supabase.auth.signUp/signIn/signOut`, role-aware sign-up, `handle_new_user` trigger). The remaining work is dashboard config.

### 6.1 URL configuration
- [ ] **OPERATOR-ONLY** Dashboard → Authentication → URL Configuration:
  - Site URL: production web URL (e.g. `https://app.homebase.com`) — placeholder until domain is registered, can be the Vercel preview URL initially
  - Additional Redirect URLs:
    - `homebase://confirm`
    - `homebase://reset`
    - `homebase://oauth-callback`
    - Local dev fallbacks: `exp://localhost:8081`, `exp://192.168.*.*:8081`

### 6.2 Email confirmation
- [ ] **OPERATOR-ONLY** Confirm "Enable email confirmations" stays **ON** (the FE handles `needsEmailConfirmation` from `signUp` response — turning it off bypasses verification)

### 6.3 Email templates
- [ ] **OPERATOR-ONLY** Customize Confirm signup / Magic Link / Reset Password templates to HomeBase branding (subject + body HTML). Keep subject lines short and editorial.

### 6.4 SMTP (custom sender)
- [ ] **OPERATOR-ONLY** Dashboard → Authentication → Email → Custom SMTP:
  - Switch on Custom SMTP and point at Resend (host `smtp.resend.com`, port `465`, user `resend`, pass = the `RESEND_API_KEY` from §4.2)
  - Sender email: `hello@homebase.app` (must match the verified Resend domain)
  - Without this, all auth emails arrive from `noreply@mail.app.supabase.io` — that's a non-starter for production.

### 6.5 Google OAuth provider (sign-in with Google)
- [ ] **OPERATOR-ONLY** Dashboard → Authentication → Providers → Google:
  - Toggle on
  - Paste Web OAuth Client ID + Client Secret from §4.3
  - Authorized redirect URI to register in Google Cloud: `https://rukpypuzfqrswiybvbkg.supabase.co/auth/v1/callback`

### 6.6 (Deferred — do NOT enable at MVP)
- Phone auth (would require Twilio Verify — we're on Telnyx; revisit later if needed)
- Magic link as primary path
- MFA / 2FA

---

## 7. Code-level feature gaps — CLAUDE-CAN-DO (no operator setup required)

A multi-agent cross-reference of the 11 MVP features against the codebase (2026-05-14) found **5 wiring gaps that don't need any third-party credentials** — Claude can fix them in-session as soon as the operator says go. None block app boot, but each one degrades a hypothesis-critical feature from "shipping" to "stubbed."

Verified via grep: each gap is the Edge Function existing & deployed, with **zero callers in the mobile codebase**.

### 7.1 MVP-3 — AI "why this score" not generated  *[~30 min]*
**Status:** `generate-trust-rationale` Edge Function is deployed but NEVER invoked from the mobile app. The "Why this provider" reasons in the booking match screen are hardcoded mock strings.

- [ ] **HAND TO CLAUDE:** Replace the hardcoded reasons array at `apps/mobile/app/(homeowner)/booking/match.tsx:65-69` with a `useQuery` that invokes `supabase.functions.invoke('generate-trust-rationale', { body: { providerId } })` and renders the returned single-line rationale. Cache by providerId for the session; fall back to the static reasons array if the function returns null (so Anthropic outages don't break the match screen).

### 7.2 MVP-4 — Check-in & onboarding photos not uploaded to Storage  *[~1-2 hours]*
**Status:** The 4 Storage buckets exist with RLS policies, but **zero `supabase.storage.from(...).upload(...)` calls exist anywhere in the mobile codebase**. Photos are passed as URL strings (sometimes Unsplash mock URLs).

- [ ] **HAND TO CLAUDE:** Wire real Storage uploads on every photo capture surface:
  - `apps/mobile/components/checkin/HomeownerCheckIn.tsx:230-312` — homeowner check-in optional photo → `booking-photos/{bookingId}/after-homeowner.jpg`
  - `apps/mobile/components/checkin/ProviderCheckIn.tsx` (before + after photos) → `booking-photos/{bookingId}/before.jpg` and `.../after-provider.jpg`
  - `apps/mobile/app/(provider)/onboarding/profile.tsx` → avatar to `avatars/{userId}/avatar.jpg` + portfolio shots to `portfolio-photos/{providerId}/{uuid}.jpg`
  - `apps/mobile/app/(provider)/onboarding/verification-tier1.tsx` (ID front/back) → new `verification-docs/{providerId}/id-{front,back}.jpg` private bucket (needs migration `0012_verification_docs_bucket.sql`)
  - `apps/mobile/app/(provider)/onboarding/verification-tier2.tsx` (insurance docs) → same `verification-docs` bucket
  - `apps/mobile/app/(homeowner)/claims/photos.tsx` → `claim-photos/{claimId}/{idx}.jpg`
  - Pattern: `expo-image-picker.launchImageLibraryAsync` → blob → `supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', upsert: true })` → store the returned path in the DB; resolve via `getPublicUrl` for public buckets or `createSignedUrl(path, 3600)` for private buckets at render time.

### 7.3 MVP-6 — Calendar sync never triggered on job acceptance  *[~30 min]*
**Status:** `calendar-connect` is wired (provider profile has the "Connect Google Calendar" button reading from `calendar_tokens`), but `calendar-sync` is **never invoked from anywhere in the mobile codebase** — accepted jobs don't push events to the provider's Google Calendar.

- [ ] **HAND TO CLAUDE:** After a provider accepts a job in `(provider)/(tabs)/jobs.tsx` (or wherever `job-accept` is currently invoked), chain a `supabase.functions.invoke('calendar-sync', { body: { jobId, action: 'create' } })` call. Also handle `cancelled` status → `action: 'delete'`. Gate on the provider actually having a row in `calendar_tokens` (skip silently otherwise). Also align the schema reference: code reads `calendar_tokens` but `BACKEND_GUIDE.md` defines `calendar_syncs` — keep `calendar_tokens` (it's the deployed truth) and update the doc reference.

### 7.4 MVP-8 — Stripe capture-on-completion defined but never called  *[~15 min]*
**Status:** `captureOnCompletion(jobId)` is exported at `apps/mobile/lib/api/payments.ts:50-62` but has **zero callers**. This means jobs complete without ever actually capturing the homeowner's card — the payment intent stays in `requires_capture` state until it auto-voids after 7 days. This is a critical revenue bug.

- [ ] **HAND TO CLAUDE:** Hook `payments.captureOnCompletion({ jobId })` into the homeowner check-in submission handler at `apps/mobile/components/checkin/HomeownerCheckIn.tsx` (immediately after the `homeowner-checkin` Edge Function returns success). Mirror in the provider check-in if the homeowner hasn't submitted within the 2-hour grace window. Surface failures as a non-blocking toast (the check-in itself must always succeed even if Stripe momentarily fails).

### 7.5 MVP-5 — Schedule validation against availability + blocked-time UI  *[~2 hours]*
**Status:** Provider sets availability (`(provider)/onboarding/availability.tsx`) and the schedule grid renders booked jobs (`(provider)/(tabs)/schedule.tsx`), but there's no UI to **block off** a specific date/time, and we can't verify the `route-booking` Edge Function actually rejects matches that fall outside `provider_availability`.

- [ ] **HAND TO CLAUDE (UI):** Add a "Block time" affordance on the provider schedule screen that writes to `provider_blocked_times` (the table exists in the schema per `BACKEND_GUIDE.md`). Modal: date + start/end time + reason. Show blocked slots as a struck-out band in the schedule grid.
- [ ] **HAND TO CLAUDE (verify):** Inspect the deployed `route-booking` Edge Function (via Supabase MCP `get_edge_function('route-booking')`) and confirm its candidate filter joins `provider_availability` AND excludes `provider_blocked_times` for the requested datetime window. If not, redeploy the function with the join added.

### 7.6 Phase 4 / not-MVP gaps (intentionally deferred, do NOT fix now)
- **Operator Graph temporal columns** (`valid_from`, `valid_to`) — Phase 4 OS feature per `MVP_HB_context copy.md` § 16.7. MVP uses append-only `completion_ledger` + `trust_score_history` instead, which is correct.
- **Real Stripe PaymentSheet** replacing the `'pm_card_visa'` mock token — listed in §11 (Phase 1.5 nice-to-have); needs live Stripe keys first (§5.1).
- **`stripe-get-balance` Edge Function** for real provider available-balance display — also §11.

### 7.7 Original Storage-buckets task (now covered by §7.2)
The "wire Storage uploads on photo screens" task that previously lived in §7 is now part of §7.2 above (consolidated with the check-in photo work since they share the same upload pattern).

---

## 8. Mobile app — Apple + Google developer accounts, EAS, store builds

### 8.1 Apple Developer Program
- [ ] **OPERATOR-ONLY** Enroll at https://developer.apple.com ($99/yr; takes 24-48hr if not already enrolled)
- [ ] **OPERATOR-ONLY** Create an **App ID** in Certificates, Identifiers & Profiles with bundle ID `com.homebase.app` (or whatever is in `apps/mobile/app.json` → `expo.ios.bundleIdentifier`)
- [ ] **OPERATOR-ONLY** Create an **App Store Connect** record (App Information, pricing free, primary category Lifestyle or Business)
- [ ] **OPERATOR-ONLY** Prepare App Privacy answers (collects personally identifiable info, location, photos — disclose accurately)
- [ ] **OPERATOR-ONLY** Generate an **App-Specific Password** + an **API Key** for EAS Submit (Settings → Keys → App Store Connect API)

### 8.2 Google Play Console
- [ ] **OPERATOR-ONLY** Enroll at https://play.google.com/console ($25 one-time)
- [ ] **OPERATOR-ONLY** Create an app entry (package name matching `apps/mobile/app.json` → `expo.android.package`, default language English)
- [ ] **OPERATOR-ONLY** Generate a **Service Account JSON** for EAS Submit (Play Console → Setup → API access → link a Google Cloud project, create service account with "Release manager" role, download JSON)
- [ ] Note the SHA-1 fingerprint of the Play app signing key — paste into the Android OAuth Client (§4.3)

### 8.3 EAS (Expo Application Services)
- [ ] **OPERATOR-ONLY** `npm i -g eas-cli` then `eas login`
- [ ] **OPERATOR-ONLY** `eas init` inside `Marketplace_MVP/app/apps/mobile` (creates the project on Expo's side)
- [ ] **OPERATOR-ONLY** `eas secret:create` for each `EXPO_PUBLIC_*` env var from §5.1
- [ ] **OPERATOR-ONLY** `eas credentials` → upload Apple distribution certificate + provisioning profile (or let EAS manage), and upload Play service account JSON
- [ ] **OPERATOR-ONLY** First builds: `eas build -p ios --profile production`, `eas build -p android --profile production`
- [ ] **OPERATOR-ONLY** Submit: `eas submit -p ios` and `eas submit -p android`
- [ ] Store listings to prepare:
  - Screenshots (6.5" iPhone, 5.5" iPhone, 12.9" iPad if iPad support; 1080×1920 Android phone)
  - App icon (1024×1024 PNG no alpha for iOS; 512×512 for Android)
  - Short description, full description, keywords, support URL, marketing URL, privacy policy URL
  - **OPERATOR-ONLY** Write a public Privacy Policy + Terms of Service — required by both stores. Host on the Vercel-deployed marketing site or admin domain.

### 8.4 Push notifications (Expo)
- [ ] **OPERATOR-ONLY** For iOS: upload an **APNs key** (Apple → Keys → Apple Push Notification service) to EAS via `eas credentials`
- [ ] **OPERATOR-ONLY** For Android: nothing extra — FCM is auto-provisioned by EAS for managed workflow apps
- [ ] Smoke test: `expo-notifications.getExpoPushTokenAsync()` returns a token in dev; trigger `register-push-token` Edge Function; send a test push from `https://expo.dev/notifications`.

---

## 9. Admin dashboard — deployment

### 9.1 Vercel
- [ ] **OPERATOR-ONLY** Create a Vercel project pointing at `Marketplace_MVP/app/apps/admin` (Framework: Next.js, Root Directory: `Marketplace_MVP/app/apps/admin`, Build: `npm run build`)
- [ ] **OPERATOR-ONLY** Set Production env vars (mirror `.env.local` from §5.2):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` ← critical, never `NEXT_PUBLIC_…`
  - `ADMIN_USE_MOCKS=false`
- [ ] **OPERATOR-ONLY** Add custom domain (e.g. `admin.homebase.app`)
- [ ] **OPERATOR-ONLY** Restrict access: either Vercel Password Protection, or build SSO via Supabase Auth + role check (`profiles.role = 'admin'` — admin role does NOT exist yet in the `user_role` enum; would need a follow-up migration to add it)

### 9.2 Domains
- [ ] **OPERATOR-ONLY** Register `homebase.app` (or chosen production domain) — Cloudflare Registrar or Namecheap
- [ ] **OPERATOR-ONLY** Configure DNS:
  - `homebase.app` → Vercel marketing site (or holding page)
  - `admin.homebase.app` → Vercel admin
  - `mail.homebase.app` → Resend (SPF/DKIM/DMARC TXT records)
  - Universal links: `apple-app-site-association` and `assetlinks.json` for deep linking (later)

---

## 10. Verification gate — flip `USE_MOCKS=false` only when all of these pass

Before flipping to real data in production, run through this checklist (also documented in the plan file `/Users/aymanmohammed/.claude/plans/buzzing-bouncing-zebra.md`):

- [ ] **Schema sanity:** Supabase MCP `list_tables(public)` shows 22 tables (21 from migrations + `messages`)
- [ ] **Advisors clean:** `get_advisors(security)` → zero WARN. `get_advisors(performance)` → no unindexed-FK lints on `payments / jobs / demand_events / completion_ledger`.
- [ ] **Cron live:** `select * from cron.job where jobname = 'recompute-trust-scores-nightly';` returns 1 row with `active=true`
- [ ] **Typecheck:** `cd Marketplace_MVP/app/apps/mobile && npm run typecheck` clean; `cd Marketplace_MVP/app/apps/admin && npm run typecheck` clean
- [ ] **Smoke test (homeowner):** sign-up → email confirm → address → home tab → start booking → payment screen renders price from cents → confirmation appears
- [ ] **Smoke test (provider):** sign-up via `?role=provider` → business → service area → availability → banking (Stripe Connect Express returns onboarding URL) → dashboard
- [ ] **Smoke test (job lifecycle):** provider accepts → en route → in progress → complete → check-in submitted → `completion_ledger` row exists → `compute-trust-score` runs nightly → `providers.composite_score_overall` updates
- [ ] **Smoke test (admin):** provider queue loads real data, claims load with real columns, trust scores show rolled-up composites, zero console errors
- [ ] **Edge function logs:** Supabase MCP `get_logs('edge-function')` after the smoke test — zero 5xx; `stripe-webhook` shows the Stripe test event with HMAC verified
- [ ] **Realtime:** open a job detail screen in simulator, change the row via Supabase Studio, FE re-renders within 2s
- [ ] **SMS:** book a job → homeowner phone receives Telnyx SMS confirmation
- [ ] **Email:** sign-up triggers confirmation email from `hello@homebase.app` via Resend SMTP (not from `mail.app.supabase.io`)
- [ ] **Push:** provider receives Expo push when a new job is routed to them

When all 13 checks pass, flip `EXPO_PUBLIC_USE_MOCKS=false` + `ADMIN_USE_MOCKS=false` and ship.

---

## 11. Nice-to-haves (Phase 1.5 — post-MVP-launch polish)

These are not blockers but should land within the first month of paid operation:

- [ ] Real Stripe PaymentSheet (`@stripe/stripe-react-native`) replacing the `'pm_card_visa'` mock token under `USE_MOCKS=true`
- [ ] `stripe-get-balance` Edge Function so the provider earnings tab shows a real available balance (currently mocked)
- [ ] Add `admin` role to the `user_role` enum + lock down admin dashboard with Supabase SSO instead of Vercel password
- [ ] Sentry SDK in both mobile + admin for error monitoring (DSN per project)
- [ ] PostHog SDK for product analytics (funnel: sign-up → first booking → first check-in)
- [ ] Apple/Google universal links for `homebase://` deep links (booking confirmation emails should open the app)
- [ ] Configure Telnyx **Voice** number (for future Phase 4 voice agent — bind to the same number purchased for SMS)

---

## 12. What Claude can do autonomously vs. what needs operator hands

| Task | Operator-only | Claude-can-do |
|---|---|---|
| Set Supabase Edge Function secrets | ✅ (dashboard requires SSO login) | — |
| Apply DB migrations | — | ✅ via MCP `apply_migration` |
| Deploy Edge Functions | — | ✅ via MCP `deploy_edge_function` |
| Run advisors / read logs | — | ✅ via MCP `get_advisors` / `get_logs` |
| Create Stripe Connect account | ✅ | — |
| Register Stripe webhook | ✅ | — |
| Buy Telnyx number / register 10DLC | ✅ | — |
| Verify Resend domain (DNS) | ✅ | — |
| Create Google Cloud OAuth credentials | ✅ | — |
| Apple/Google dev accounts, EAS submit | ✅ | — |
| Vercel deployment | ✅ | — |
| Wire FE Storage uploads | — | ✅ once buckets are confirmed |
| Add real Stripe PaymentSheet | — | ✅ once Stripe live keys are in `.env` |
| Write env files | ✅ paste real values; ✅ Claude edits `.env.example` and structure | — |

---

*HomeBase · Operations TODO · 2026-05-14 · Use alongside `MVP_HB_context copy.md` §16.*

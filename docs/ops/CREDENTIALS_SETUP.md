# HomeBase — Credentials setup

Single source of truth for wiring real credentials into the HomeBase MVP. Every
piece of code is already pointed at the right env var name; this document tells
you which dashboard to grab each value from and where to paste it.

---

## 1. Overview

You need accounts (or live API keys) at **Supabase, Stripe, Anthropic, Telnyx,
Resend, Google Cloud (OAuth + Maps)**. Once you have those, three things to do:

1. Paste the **client-side** values into `apps/mobile/.env` and
   `apps/admin/.env.local` (see sections 2–3).
2. Paste the **server-side** values into the Supabase Dashboard under
   `Project Settings → Edge Functions → Secrets` (see section 4).
3. Run through the verification checklist in section 6.

No code changes are required after this. All call sites already read
`process.env.*` (mobile/admin) or `Deno.env.get(...)` (edge functions) against
the names listed below.

Project: **HomeBase_MVP** — Supabase ref `rukpypuzfqrswiybvbkg`.

---

## 2. Mobile app — `apps/mobile/.env`

Copy-pasteable block. File is gitignored.

```env
# Demo toggle — `true` for offline mocks, `false` for live data.
EXPO_PUBLIC_USE_MOCKS=false

# Supabase — Dashboard → Settings → API
EXPO_PUBLIC_SUPABASE_URL=https://rukpypuzfqrswiybvbkg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…           # "Publishable key"

# Stripe — Dashboard → Developers → API keys → Publishable key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…             # or pk_live_…

# Google Maps — Cloud Console → APIs & Services → Credentials → API key
# Enable: Maps SDK iOS, Maps SDK Android, Maps JS API, Places API, Geocoding API
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza…
```

After editing, restart Metro with `npx expo start --clear` — Expo inlines env
vars at bundle time, not on hot reload.

---

## 3. Admin app — `apps/admin/.env.local`

Copy-pasteable block. File is gitignored.

```env
# Supabase — same project as mobile
NEXT_PUBLIC_SUPABASE_URL=https://rukpypuzfqrswiybvbkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…           # same as mobile

# Service-role key — SERVER ONLY. Dashboard → Settings → API → "service_role".
# Never prefix with NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc…

# Demo toggle — `false` to hit Supabase, `true` for mock fixtures.
ADMIN_USE_MOCKS=false
```

For Vercel: paste the same values into **Project → Settings → Environment
Variables** (Production + Preview).

> An admin user must exist in Supabase Auth **and** have `role='admin'` in the
> `profiles` table before sign-in works. There is no admin signup UI:
> ```sql
> update profiles set role='admin'::user_role where email='ops@homebase.app';
> ```

---

## 4. Supabase Edge Function secrets

All 25 deployed edge functions read secrets via `Deno.env.get(NAME)`. Set them
in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
(or `supabase secrets set NAME=VALUE` via the CLI).

### 4.1 Always required

| Secret | Where to get it | Used by |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → "service_role" key | Every function that bypasses RLS for cross-table writes. Supabase auto-injects this for edge functions, but the project still expects it to be referenced explicitly. |
| `SHARED_TRUST_SECRET` | Generate locally: `openssl rand -base64 32` | `compute-trust-score` — gates the cron caller. Must match the value used by `pg_cron` (see section 4.6). |

### 4.2 Stripe

Dashboard: **https://dashboard.stripe.com/apikeys** (toggle Test/Live in the top-right).

| Secret | Where to get it | Used by |
|---|---|---|
| `STRIPE_SECRET_KEY` | Developers → API keys → "Secret key" (`sk_test_…` or `sk_live_…`) | `stripe-onboard-provider`, `stripe-attach-payment-method`, `stripe-create-intent`, `stripe-capture-on-completion`, `stripe-instant-payout`, `stripe-webhook` |
| `STRIPE_WEBHOOK_SECRET` | Developers → Webhooks → click the endpoint → "Signing secret" (`whsec_…`) | `stripe-webhook` (HMAC verification) |
| `APP_FEE_BPS_ONE_OFF` | Operator decision. Default `1000` (=10%) | `stripe-create-intent` |
| `APP_FEE_BPS_SUB` | Operator decision. Default `1200` (=12%) | `stripe-create-intent` |
| `ESCROW_BPS` | Operator decision. Default `500` (=5%) | `stripe-create-intent`, `stripe-capture-on-completion` |
| `ESCROW_HOLD_DAYS` | Operator decision. Default `7` | `stripe-capture-on-completion` |

**Webhook endpoint** to register in Stripe (Developers → Webhooks → "Add endpoint"):

```
URL: https://rukpypuzfqrswiybvbkg.supabase.co/functions/v1/stripe-webhook
```

Subscribe to events:

```
account.updated
payment_intent.succeeded
payment_intent.payment_failed
charge.refunded
payout.paid
payout.failed
```

After saving, click into the endpoint and copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

### 4.3 Anthropic (Claude)

Dashboard: **https://console.anthropic.com/settings/keys**

| Secret | Where to get it | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | Console → API keys → "Create Key" (`sk-ant-…`) | `homeowner-checkin`, `provider-checkin`, `generate-trust-rationale` |

Functions target `claude-haiku-4-5-20251001`. They fall through to non-AI defaults
if the key is unset, so the rest of the app keeps working but check-in grading
and trust rationale lines are skipped.

### 4.4 Telnyx (SMS)

Dashboard: **https://portal.telnyx.com/**. One-time setup:

1. Sign up at telnyx.com (no card required).
2. **Numbers → Buy a Number** (US local ~$1/mo).
3. **Messaging → Messaging Profiles → Create** → name `HomeBase Transactional`. Copy the profile ID.
4. **Mission Control → API Keys → Create V2 key** (format `KEY…`).
5. **Messaging → 10DLC** → register your brand + campaign (required for US A2P; 1–3 business days for approval).
6. Attach the purchased number to the messaging profile + 10DLC campaign.

| Secret | Where to get it | Used by |
|---|---|---|
| `TELNYX_API_KEY` | Mission Control → API Keys (V2) | `send-sms` |
| `TELNYX_FROM_NUMBER` | The E.164 number you purchased, e.g. `+12145551234` | `send-sms` |
| `TELNYX_MESSAGING_PROFILE_ID` | Messaging → Messaging Profiles → profile detail page | `send-sms` (optional but recommended — your A2P 10DLC campaign anchor) |

### 4.5 Resend (email)

Dashboard: **https://resend.com/api-keys**

| Secret | Where to get it | Used by |
|---|---|---|
| `RESEND_API_KEY` | API Keys → "Create API Key" (`re_…`) | `send-email` |
| `RESEND_FROM` | Operator decision. Default `HomeBase <hello@homebase.app>` | `send-email` |

Verify your sending domain in Resend → Domains before live traffic, otherwise
emails will bounce or be marked spam.

### 4.6 Google OAuth (Calendar sync)

Dashboard: **https://console.cloud.google.com/apis/credentials**

1. Create a project (or use existing).
2. **APIs & Services → Library →** enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → External → fill in app name, support email, scopes (`./auth/calendar.events`).
4. **Credentials → Create Credentials → OAuth client ID → Web application**.
5. Add the redirect URIs listed in section 5.

| Secret | Where to get it | Used by |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Credentials → your OAuth client → "Client ID" (`…apps.googleusercontent.com`) | `calendar-connect`, `calendar-sync` |
| `GOOGLE_CLIENT_SECRET` | Credentials → your OAuth client → "Client secret" | `calendar-connect`, `calendar-sync` |
| `GOOGLE_REDIRECT_URI` | Default `homebase://calendar-callback` — must exactly match one of the URIs you added in the Google Cloud Console | `calendar-connect` |

### 4.7 Cron (post-setup; one-time SQL run)

In Supabase Dashboard → SQL Editor, run **once** to schedule nightly trust score
recomputation (replace `SHARED_TRUST_SECRET_VALUE` with the actual value you
set in section 4.1):

```sql
select cron.schedule(
  'recompute-trust-scores-nightly',
  '15 6 * * *',
  $$
  select net.http_post(
    url := 'https://rukpypuzfqrswiybvbkg.supabase.co/functions/v1/compute-trust-score',
    headers := jsonb_build_object('content-type','application/json','x-shared-secret','SHARED_TRUST_SECRET_VALUE'),
    body := jsonb_build_object('providerId', id)
  )
  from public.providers where valid_to is null;
  $$
);
```

---

## 5. Google OAuth — exact callback URLs

In Google Cloud Console → Credentials → your OAuth client → **Authorized
redirect URIs**, add all three:

```
https://rukpypuzfqrswiybvbkg.supabase.co/auth/v1/callback     # Supabase Auth handler (for "Sign in with Google" if used)
homebase://calendar-callback                                   # native deep link, matches GOOGLE_REDIRECT_URI
http://localhost:8081/--/calendar-callback                     # Expo dev client during local dev
```

If you later add a web build, also add the hosted origin (e.g.
`https://app.homebase.co/calendar-callback`).

In **Supabase Dashboard → Authentication → Providers → Google**, paste the
same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` if you want Supabase Auth's
"Sign in with Google" to work. (The Calendar integration uses its own OAuth
flow via the edge functions and doesn't require enabling the Supabase
provider.)

---

## 6. Verification checklist

Run through this after pasting credentials. Each item proves one wiring path.

- [ ] **Supabase client (mobile)** — set `EXPO_PUBLIC_USE_MOCKS=false`, run
  `npx expo start --clear`, sign in with a real test user. Expect Home tab to
  load the dashboard from Supabase (not the mock provider grid). If you see
  the mock cards, the env vars aren't loaded — kill Metro, confirm `.env` is
  in `apps/mobile/`, and restart with `--clear`.
- [ ] **Supabase service role (admin)** — set `ADMIN_USE_MOCKS=false`, run
  `npm run dev` in `apps/admin/`, visit `/admin/jobs`. Expect a list of real
  jobs (or "no jobs yet" if empty). A red error `Missing env var:
  SUPABASE_SERVICE_ROLE_KEY` means the key wasn't pasted into `.env.local`.
- [ ] **Stripe webhook reachability** — in Stripe Dashboard → Webhooks → your
  endpoint → "Send test webhook" → pick `payment_intent.succeeded`. Then
  Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs. Expect a
  `200 OK` line. A `401` means `STRIPE_WEBHOOK_SECRET` is wrong.
- [ ] **Stripe end-to-end payment** — book a job in the mobile app using
  Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC). Verify
  the job row in Supabase shows `payment_intent_id` set and the
  `payment_intent.succeeded` event lands in the webhook log.
- [ ] **Anthropic check-in grading** — submit a provider check-in. Supabase →
  Edge Functions → `provider-checkin` → Logs should show `ai_grade=…`. If you
  see `ai_grade=skipped (no key)`, `ANTHROPIC_API_KEY` is not set.
- [ ] **Telnyx + Resend** — manually invoke `send-sms` and `send-email` from
  the Supabase Dashboard ("Test function") with a JSON payload containing a
  recipient you control. Confirm the message arrives. Failures show up in the
  function logs with Telnyx/Resend error bodies.

If all six pass, the integration is live.

---

## 7. Failure modes

Common errors and what they mean:

| Symptom | Likely cause | Fix |
|---|---|---|
| Mobile app shows demo provider cards despite `EXPO_PUBLIC_USE_MOCKS=false` | Metro cached the previous bundle | `npx expo start --clear`, also confirm `.env` lives in `apps/mobile/`, not the repo root |
| Sign-in screen surfaces "Continue as demo homeowner" buttons in prod | `EXPO_PUBLIC_USE_MOCKS=true` | Set to `false` in `.env`, restart Metro |
| Admin page throws `Missing env var: SUPABASE_SERVICE_ROLE_KEY` | Service-role key absent from `.env.local` / Vercel | Paste from Supabase Dashboard → Settings → API |
| Edge function returns 500, log says `STRIPE_SECRET_KEY is not defined` | Secret not set in Supabase Dashboard | Project Settings → Edge Functions → Secrets → add it |
| Stripe webhook log shows 401 / signature verification failed | `STRIPE_WEBHOOK_SECRET` mismatch (e.g. copied from test mode while running live) | Re-copy the signing secret from the exact endpoint you registered |
| `provider-checkin` runs but `ai_grade` is always `skipped` | `ANTHROPIC_API_KEY` not set or invalid | Paste real key, redeploy or wait for the function to refresh env (Supabase reloads secrets on next cold start) |
| SMS sends 422 from Telnyx | 10DLC campaign not approved or number not attached | Check Telnyx → Messaging → 10DLC status; finish campaign registration |
| Resend returns "domain not verified" | Sender domain in `RESEND_FROM` isn't verified in Resend | Resend → Domains → verify DNS records |
| Calendar OAuth redirects to a Google "redirect_uri_mismatch" page | Redirect URI in Google Cloud Console doesn't exactly match `GOOGLE_REDIRECT_URI` | Add the exact URI (including scheme + path) to Authorized redirect URIs |
| `compute-trust-score` returns 403 | `x-shared-secret` header from cron doesn't match `SHARED_TRUST_SECRET` | Update the SQL `cron.schedule` body to use the same value you set in Supabase secrets |

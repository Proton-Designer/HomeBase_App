# HomeBase — Running the App Locally

Single-source instructions for running the HomeBase MVP frontend (mobile + web) and backend (Supabase) in development and production. **Read `MVP_HB_context copy.md` § 16 (current state) and `OPERATIONS_TODO.md` (operator setup) before flipping `USE_MOCKS=false`.**

---

## 0. Repo layout

```
HB_MRKT_MVP/                                     ← project root
├── CLAUDE.md                                    ← agent guardrails
├── MVP_HB_context copy.md                       ← startup overhead + § 16 status
├── OPERATIONS_TODO.md                           ← what credentials/accounts are still needed
└── Marketplace_MVP/
    ├── MVP_OVERVIEW.md
    ├── PHASES.md
    ├── Frontend_and_Basic_Backend/FRONTEND_GUIDE.md
    ├── Full_Backend_Implementation/
    │   ├── BACKEND_GUIDE.md
    │   └── BACKEND_ENV.md
    └── app/                                     ← Turborepo monorepo (YOU ARE HERE)
        ├── package.json                         ← root scripts (turbo dev / build / typecheck)
        ├── turbo.json
        └── apps/
            ├── mobile/                          ← Expo SDK 51 + Expo Router 6 (iOS + Android + Web)
            └── admin/                           ← Next.js 14 (internal ops dashboard)
```

All commands below assume you are in `Marketplace_MVP/app/` unless otherwise noted.

---

## 1. Prerequisites (install once)

| Tool | Version | Install |
|---|---|---|
| Node | ≥ 20.x | https://nodejs.org or `nvm install 20` |
| npm | ≥ 10.x | bundled with Node 20 |
| Expo CLI | latest | bundled — invoked via `npx expo` |
| EAS CLI | latest (for native builds + OTA) | `npm i -g eas-cli` |
| Watchman (macOS) | latest | `brew install watchman` |
| Xcode + Simulator | latest | Mac App Store (only for iOS dev) |
| Android Studio | latest, with an emulator AVD | https://developer.android.com/studio (only for Android dev) |
| Supabase CLI (optional) | latest | `brew install supabase/tap/supabase` (used for local stack + types) |

**One-time monorepo install** (run from `Marketplace_MVP/app/`):

```bash
npm install
```

This hoists shared deps into the root `node_modules` and installs each workspace's package.json.

---

## 2. Environment files

The repo ships `.env.example` and `.env.local.example` with safe defaults. Copy them to the active files before first run:

```bash
# Mobile (Expo) — already exists at apps/mobile/.env with publishable Supabase key.
# Just verify the keys below are populated:
cat apps/mobile/.env

# Admin (Next.js) — service-role key is REQUIRED for the admin dashboard to read all rows.
cat apps/admin/.env.local
```

### What each variable does

**`apps/mobile/.env`**
| Variable | Required for | Notes |
|---|---|---|
| `EXPO_PUBLIC_USE_MOCKS` | dev convenience | `true` = run entirely off in-memory fixtures (no network). `false` = real Supabase. Default `false`. |
| `EXPO_PUBLIC_SUPABASE_URL` | live mode | `https://rukpypuzfqrswiybvbkg.supabase.co` (already set) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | live mode | publishable key (`sb_publishable_...`) — already set |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | booking payment screen | `pk_test_...` or `pk_live_...` — fill in before testing payments |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | provider service area, address autocomplete | restrict to Maps SDK + Places + Geocoding |

**`apps/admin/.env.local`**
| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | same as mobile |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-side only**, never expose. Get it from Supabase Dashboard → Settings → API → `service_role` |
| `ADMIN_USE_MOCKS` | `true` to fall through to mock fixtures, `false` for live data |

If you don't have real Stripe / Google keys yet, leave the placeholders and set `EXPO_PUBLIC_USE_MOCKS=true` — every screen still works against in-memory fixtures.

---

## 3. Running the frontend

### 3.1 The fast path — run everything at once

From `Marketplace_MVP/app/`:

```bash
npm run dev
```

Turbo spins up both workspaces in parallel:
- **Mobile (Expo)** — Metro bundler at `http://localhost:8081` with QR code for device scanning
- **Admin (Next.js)** — `http://localhost:3000`

Press `Ctrl+C` to stop both.

### 3.2 Run them individually

```bash
# Only the Expo mobile app (iOS, Android, web from one Metro)
npm run dev:mobile

# Only the Next.js admin
npm run dev:admin
```

### 3.3 Pick a target on the mobile app

After `npm run dev:mobile`, the Metro terminal shows:

| Key | Action |
|---|---|
| `i` | open iOS Simulator (Mac only) |
| `a` | open Android Emulator |
| `w` | open in browser (web build of the same RN codebase) |
| scan QR | open in Expo Go on a physical device (same Wi-Fi) |

For a real-device build with native modules (you'll need this once `expo-image-picker` / Stripe SDK / push are exercised), use a **development client** instead of Expo Go:

```bash
# From apps/mobile/
npx eas build --profile development --platform ios       # produces an .ipa to install via TestFlight
npx eas build --profile development --platform android   # produces an .apk
```

Then on the device, scan the Metro QR with the dev client (NOT Expo Go).

### 3.4 Web-only preview (no native bundler)

The Expo app builds to static web — handy for sharing a preview URL:

```bash
cd apps/mobile
npm run preview:web   # builds dist/ then serves on http://localhost:4173
```

### 3.5 Admin dashboard

The admin is a vanilla Next.js 14 app:

```bash
cd apps/admin
npm run dev           # http://localhost:3000
```

Routes:
- `/admin/providers` — verification queue (Tier 1 / Tier 2 approval)
- `/admin/jobs` — real-time jobs board
- `/admin/claims` — damage claim review
- `/admin/trust-scores` — composite score overrides
- `/admin/users` — user management

Admin is intentionally unauthenticated in dev. Lock it behind Vercel Password Protection (or build SSO with a `profiles.role='admin'` check) before deploying — see `OPERATIONS_TODO.md` § 9.1.

---

## 4. Running the backend (Supabase)

The backend is hosted Supabase (no local server to start). Project: `HomeBase_MVP` (`rukpypuzfqrswiybvbkg`, us-east-2).

### 4.1 Inspect the live project

| Task | How |
|---|---|
| Dashboard | https://supabase.com/dashboard/project/rukpypuzfqrswiybvbkg |
| SQL editor | Dashboard → SQL → New query |
| Edge Function logs | Dashboard → Edge Functions → pick a function → Logs |
| Auth settings | Dashboard → Authentication → Configuration |
| Storage buckets | Dashboard → Storage |
| Realtime publication | Dashboard → Database → Replication |

### 4.2 Schema changes (DB migrations)

**Never edit a deployed table by hand.** Every schema change ships as a numbered migration. The series so far (14 migrations) lives in the Supabase project's history.

To apply a new migration:
- **Via Claude / MCP** (preferred during this session): use `mcp__plugin_supabase_supabase__apply_migration` with `name='0015_my_change'`.
- **Via Supabase CLI** (operator workflow): `supabase db push` from a `supabase/` directory mirroring the migrations.
- **Via Dashboard SQL editor**: paste the migration into Dashboard → SQL → Run. Then save it as `Marketplace_MVP/Full_Backend_Implementation/migrations/00XX_name.sql` for history.

### 4.3 Edge Functions

24 functions are deployed. To edit one:

```bash
# Pull the deployed source (operator workflow, requires `supabase` CLI logged in):
supabase functions download <function-slug>

# Edit, then redeploy:
supabase functions deploy <function-slug> --project-ref rukpypuzfqrswiybvbkg
```

Or use the MCP `deploy_edge_function` tool from Claude.

Functions log to Dashboard → Edge Functions → logs in near-real-time. A failed function call from the mobile app surfaces as a thrown error from `supabase.functions.invoke(...)`.

### 4.4 Edge Function secrets

Set via Dashboard → Project Settings → Edge Functions → Secrets. See `Full_Backend_Implementation/BACKEND_ENV.md` for the full list, and `OPERATIONS_TODO.md` § 1 for which are still needed.

Until secrets are populated, functions that depend on them gracefully degrade:
- `homeowner-checkin`, `provider-checkin`, `generate-trust-rationale` fall through to non-AI defaults if `ANTHROPIC_API_KEY` is missing
- Stripe functions return 503 with a clear error message if `STRIPE_SECRET_KEY` is missing
- `send-sms` will error if `TELNYX_API_KEY` is missing (the mobile app catches and ignores SMS failures)

### 4.5 Local Supabase stack (optional, advanced)

Not required for daily dev — the hosted project handles everything. But for offline iteration on migrations:

```bash
# From the repo root (creates supabase/ directory if missing)
supabase init
supabase start            # spins up local Postgres + Auth + Storage + Studio at http://localhost:54323
supabase db reset         # applies migrations to local
# Point apps/mobile/.env at http://localhost:54321 instead of the hosted URL
```

---

## 5. Switching between mock mode and live mode

Both apps support an in-memory fallback so you can demo without any backend traffic:

```bash
# apps/mobile/.env
EXPO_PUBLIC_USE_MOCKS=true

# apps/admin/.env.local
ADMIN_USE_MOCKS=true
```

Then restart the dev servers (Metro and Next don't hot-reload env changes).

Mock mode reads from `apps/mobile/lib/mocks/*` and `apps/admin/lib/mocks.ts` — useful for UI iteration and offline demos.

---

## 6. Common commands cheat sheet

| Task | Command (run from `Marketplace_MVP/app/`) |
|---|---|
| Install all deps | `npm install` |
| Run everything | `npm run dev` |
| Run only mobile | `npm run dev:mobile` |
| Run only admin | `npm run dev:admin` |
| Typecheck both | `npm run typecheck` |
| Lint both | `npm run lint` |
| Mobile-only typecheck | `cd apps/mobile && npx tsc --noEmit` |
| Web build of mobile | `cd apps/mobile && npm run build:web` |
| Production build of admin | `cd apps/admin && npm run build && npm start` |
| Native dev build (iOS) | `cd apps/mobile && npx eas build --profile development --platform ios` |
| Native dev build (Android) | `cd apps/mobile && npx eas build --profile development --platform android` |
| Store submission | `cd apps/mobile && npx eas build --profile production --platform all && npx eas submit` |

---

## 7. First-run smoke checklist

After cloning fresh and running `npm install` + `npm run dev`:

1. **Mobile boots:** Metro starts, QR code visible. Press `w` → browser opens to a homeowner sign-up screen with HomeBase branding.
2. **Admin boots:** `http://localhost:3000` redirects to `/admin/providers` and renders an empty table (zero providers in DB yet).
3. **Typecheck clean:** `npm run typecheck` exits 0.
4. **Supabase reachable:** sign up a new homeowner from the mobile app — confirmation email arrives (only if SMTP is set per `OPERATIONS_TODO.md` § 6.4; otherwise the Auth flow still succeeds but no email).
5. **Realtime alive:** open a job detail screen; in another tab, change that row in Supabase Studio. The mobile screen re-renders within ~2s.

If any of these fails, see `OPERATIONS_TODO.md` for what's missing.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Unable to resolve module 'expo-image-picker'` | Stale Metro cache after npm install | `cd apps/mobile && npx expo start -c` |
| `Invalid SUPABASE_URL` on mobile boot | `.env` not picked up | Restart Metro fully (`Ctrl+C` then `npm run dev`), env vars don't hot-reload |
| Admin dashboard shows empty tables but mock mode is off | `SUPABASE_SERVICE_ROLE_KEY` missing or wrong | Re-paste from Dashboard → Settings → API |
| `429 Too Many Requests` from Supabase | hit free-tier rate limit during testing | wait 60s, or upgrade project to Pro plan |
| Photo upload returns `403 RLS` | bucket policy mismatch with auth user | check `OPERATIONS_TODO.md` § 7.2 — paths must start with `${auth.uid()}/...` |
| `Stripe Connect onboarding URL` returns 503 | `STRIPE_SECRET_KEY` not set in Edge Function secrets | set per `OPERATIONS_TODO.md` § 1.2 |
| Telnyx SMS fails silently | `TELNYX_*` secrets not set or 10DLC campaign not approved | `OPERATIONS_TODO.md` § 3 |
| Calendar sync 409 "Calendar not connected" | provider hasn't completed OAuth flow | open provider profile → tap "Connect Google Calendar" (requires `GOOGLE_CLIENT_*` per § 1.6) |

---

## 9. Where to read next

- **What is HomeBase?** → `MVP_HB_context copy.md`
- **What's the MVP scope?** → `Marketplace_MVP/MVP_OVERVIEW.md`
- **Frontend design spec** → `Marketplace_MVP/Frontend_and_Basic_Backend/FRONTEND_GUIDE.md`
- **Backend spec** → `Marketplace_MVP/Full_Backend_Implementation/BACKEND_GUIDE.md`
- **What's still needed for production?** → `OPERATIONS_TODO.md`
- **Agent guardrails (for Claude Code sessions)** → `CLAUDE.md`

---

*HomeBase · Run-the-app guide · 2026-05-14*

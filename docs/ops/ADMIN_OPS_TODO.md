# HomeBase Admin — Operations TODO to Production

> **Purpose:** The admin dashboard (`Marketplace_MVP/app/apps/admin/`) is **code-complete** as of 2026-05-14. This file is the **operator's checklist** for turning that working code into a live, secure, production-ready admin tool used by HomeBase ops staff.
> **Companion docs:** `OPERATIONS_TODO.md` (whole-product setup) · `RUNNING.md` (run locally) · `apps/admin/README.md` (architecture).
> **Audience:** Ayman + Kareem. Every checkbox is something a human with billing access must do — Claude has already done everything that could be done in code.

---

## How to use this file

Work top to bottom. Each step is self-contained. When you finish a step, replace `[ ]` with `[x]` and (if relevant) paste IDs/URLs into the line so future-you doesn't re-look-them-up.

Estimated total time: **~90 minutes** if Vercel + Supabase accounts already exist, **~3 hours** if starting from scratch.

---

## Step 1 — Create the first admin user (5 min)

The admin app intentionally has **no signup flow**. The only way to become an admin is to be elevated by SQL.

- [ ] **Open Supabase Dashboard** → https://supabase.com/dashboard/project/rukpypuzfqrswiybvbkg/auth/users
- [ ] Click **"Add user" → "Create new user"**
  - Email: your operations address (e.g. `ops@homebase.app`)
  - Password: a strong one — store in a password manager
  - Auto Confirm User: **ON** (so they can sign in immediately without email confirmation)
- [ ] Copy the new user's UUID from the dashboard.
- [ ] Open the **SQL Editor** → run:
  ```sql
  update profiles
  set role = 'admin'::user_role
  where email = 'ops@homebase.app';
  ```
- [ ] Verify with:
  ```sql
  select id, email, role from profiles where role = 'admin';
  ```
  You should see exactly one row.

**Why this matters:** without an admin row, every page in the dashboard redirects to `/sign-in` and `/sign-in` rejects you. Without provisioning at least one admin, the dashboard is unreachable.

**Best practice:** provision **at least two admins** so a forgotten password doesn't lock the team out.

---

## Step 2 — Test locally before deploying (10 min)

Confirm the auth gate, claim flow, and trust score override all work against the live Supabase project from your laptop before shipping to Vercel.

- [ ] From `Marketplace_MVP/app/`:
  ```bash
  npm install
  npm run dev:admin
  ```
- [ ] Visit `http://localhost:3000` → you should be redirected to `/sign-in`.
- [ ] Sign in with the admin email + password from Step 1.
- [ ] You land on `/admin/providers`. The sidebar footer shows your email.
- [ ] Click each of the 5 nav items — each renders without errors (queues will be empty until real users/jobs/claims exist).
- [ ] Click **Sign out** in the sidebar footer → you should be back on `/sign-in`.

**If any step fails** see the [Troubleshooting](#troubleshooting) section.

---

## Step 3 — Set Edge Function secrets that the admin depends on (15 min)

The admin's claim resolution flow calls the `release-escrow` Edge Function. That function uses the Stripe secret key to issue real refunds. **Until these secrets exist, refunds will silently no-op** (the function still flips the holdback status but doesn't move money).

- [ ] **Supabase Dashboard** → Project Settings → Edge Functions → Secrets → Add new secret:
  - `STRIPE_SECRET_KEY` = your Stripe `sk_test_...` or `sk_live_...` key
- [ ] Also set these (used by other parts of the marketplace, listed for completeness — see `OPERATIONS_TODO.md` § 1 for the full list):
  - `STRIPE_WEBHOOK_SECRET`
  - `ESCROW_BPS=500`
  - `ESCROW_HOLD_DAYS=7`
- [ ] Verify the function picked up the secrets by checking logs: Dashboard → Edge Functions → `release-escrow` → Logs. The next admin-triggered refund should show `"refund created"` not `"STRIPE_SECRET_KEY not configured"`.

**Skip note:** if you're still in pre-launch testing with no real provider charges, you can leave `STRIPE_SECRET_KEY` empty. Admin still works; claim status still flips; only the Stripe refund API call is skipped. The Supabase `escrow_holdbacks.status` change still happens so the audit trail is intact.

---

## Step 4 — Deploy to Vercel (20 min)

The admin is a stock Next.js 14 app. Vercel is the path of least resistance.

### 4.1 Push the monorepo to GitHub (if not done)

- [ ] From the repo root:
  ```bash
  git init && git add . && git commit -m "Initial commit"
  git remote add origin git@github.com:<your-org>/homebase.git
  git push -u origin main
  ```

### 4.2 Create the Vercel project

- [ ] Go to https://vercel.com/new → Import the GitHub repo
- [ ] **Framework Preset**: Next.js (auto-detected)
- [ ] **Root Directory**: `Marketplace_MVP/app/apps/admin` ← **critical** — the monorepo has multiple workspaces, you must point Vercel at the admin folder specifically
- [ ] **Build Command**: leave default (`next build`)
- [ ] **Output Directory**: leave default (`.next`)
- [ ] **Install Command**: `npm install` (Vercel handles the workspace install automatically)

### 4.3 Set production environment variables

Vercel project → Settings → Environment Variables → add for the **Production** environment:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://rukpypuzfqrswiybvbkg.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_DtmeztCM3z2A1Oy8RdL2YA_8qvpDs_a`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (Dashboard → Settings → API → `service_role` secret) — **NEVER** add `NEXT_PUBLIC_` prefix to this one
- [ ] `ADMIN_USE_MOCKS` = `false`

### 4.4 Click Deploy

- [ ] First deploy runs automatically. Wait ~2 min.
- [ ] Visit the assigned Vercel URL (`<project>.vercel.app`) → you should land on `/sign-in`.
- [ ] Sign in → land on `/admin/providers`.

---

## Step 5 — Lock down access (10 min)

The admin sign-in page is publicly reachable on the internet. Anyone who knows the URL can attempt to brute-force the login. Lock it down at the **edge** (Vercel) so the sign-in page itself requires extra authentication.

Pick ONE option:

### Option A — Vercel Password Protection (recommended for solo/small team, $20/mo Team plan)

- [ ] Vercel → Project Settings → **Deployment Protection** → enable **Password Protection**
- [ ] Set a team-wide password (different from the admin login)
- [ ] Share the password with all ops staff via 1Password / similar

### Option B — Vercel Authentication (free on Pro/Team plans, restricts to Vercel team members)

- [ ] Vercel → Project Settings → **Deployment Protection** → enable **Vercel Authentication**
- [ ] Add each ops staff member as a Vercel team member

### Option C — Build SSO (4-hour eng task, not necessary at MVP scale)

Skip unless / until you have >5 ops staff.

**Don't skip this step.** The Supabase auth gate stops unauthenticated users from seeing data, but Vercel-level protection prevents brute-forcing the sign-in page itself.

---

## Step 6 — Add a custom domain (10 min)

- [ ] Register a subdomain at your domain registrar — recommended: `admin.homebase.app`
- [ ] Vercel → Project Settings → **Domains** → Add domain → paste `admin.homebase.app`
- [ ] Vercel will show the DNS records (usually a single CNAME). Add them at your registrar (Cloudflare / Namecheap / etc.)
- [ ] Wait 1–5 min for DNS propagation. Visit `https://admin.homebase.app` → it should resolve to the admin sign-in page.
- [ ] (Optional) Add the apex `homebase.app` for the marketing site to a separate Vercel project later.

---

## Step 7 — Configure Supabase Auth for production (5 min)

The auth gate needs to know about the production admin URL so password reset and session cookies work correctly.

- [ ] Supabase Dashboard → Authentication → **URL Configuration**
- [ ] **Site URL**: `https://admin.homebase.app` (or whatever you set in Step 6)
- [ ] **Additional Redirect URLs**: add both:
  - `https://admin.homebase.app/**`
  - `http://localhost:3000/**` (for local dev)
- [ ] Save.

If you don't have a custom domain yet, use the `<project>.vercel.app` URL Vercel assigned in Step 4.

---

## Step 8 — Wire push notifications to claim status changes (30 min, optional but recommended)

**Status:** code-complete except for the final 4 wires inside the claim server actions.

The homeowner mobile app at `app/(homeowner)/claims/submitted.tsx:87` already promises:

> "You'll receive a push notification when your claim status changes."

But the four claim server actions (`markUnderReview`, `approveAndRefund`, `denyClaim`, `markResolved`) don't currently invoke the `send-push` Edge Function. This is a code task — **hand it to Claude** when you have time:

> "Add `send-push` invocations to `lib/actions/claims.ts` so the homeowner gets notified when a claim status changes. Look up the homeowner's `expo_push_token` from `push_tokens` table, then call `supabase.functions.invoke('send-push', { body: { token, title, body, data: { claimId } } })` after each status update."

Until this is wired, claim updates still propagate visually — homeowners just have to open the app to see them. The push promise on submitted.tsx is currently aspirational.

- [ ] (Optional) Hand the above task to Claude after the rest of the operator setup is done.

---

## Step 9 — Provision the remaining ops staff (5 min per person)

Once Step 1's first admin is in place, that admin can provision additional admins from the Supabase Dashboard directly:

- [ ] For each new ops staff member:
  - [ ] Supabase Dashboard → Authentication → Add user (auto-confirm)
  - [ ] SQL Editor:
    ```sql
    update profiles
    set role = 'admin'::user_role
    where email = '<their-email>';
    ```
  - [ ] Share the credentials securely (1Password)

**Why no UI for this?** Adding users to the admin via the dashboard UI is intentionally simple. Building an "invite admin" flow in the app would require an additional approval ladder + email sender — overkill for 2-5 ops staff. Revisit if the team grows past 10.

---

## Step 10 — Smoke test against production (10 min)

Run through every flow once on the live Vercel deployment to confirm nothing was missed.

### Provider verification queue
- [ ] Visit `/admin/providers`
- [ ] Click a provider row → drawer opens with details
- [ ] Click **"Approve Tier 1"** → success toast, tier pill updates in the table
- [ ] Open the mobile app as a homeowner → search for that provider → confirm the Tier 1 badge now shows on their card

### Claims
- [ ] Visit `/admin/claims`
- [ ] If you have any submitted claims, expand one
- [ ] Click **"Mark under review"** → status pill updates, claim moves between tabs
- [ ] (Test mode only) Click **"Approve & refund"** with a small refund amount → confirm Stripe Dashboard shows a refund event
- [ ] Open the mobile app as the homeowner who filed the claim → confirm the status pill updates

### Trust score override
- [ ] Visit `/admin/trust-scores`
- [ ] Expand a provider, override one component (e.g. Reliability) → enter a 10+ char reason → submit
- [ ] Confirm the row updates immediately
- [ ] Confirm a new row in `trust_score_overrides` table via SQL:
  ```sql
  select * from trust_score_overrides order by created_at desc limit 5;
  ```
- [ ] Refresh the page — the override should persist
- [ ] Open the mobile app as a homeowner → search for that provider → confirm the new score shows on their card

### Sign-out
- [ ] Click **Sign out** in sidebar → land on `/sign-in`
- [ ] Try visiting `/admin/providers` directly → redirected to `/sign-in`

If all 8 smoke tests pass, the admin is **production-ready**.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Sign-in returns "Invalid credentials" | User exists in `auth.users` but not in `profiles`, or `profiles.role` is not `admin` | Step 1: confirm SQL update succeeded; check `select email, role from profiles where email='...'` |
| Sign-in succeeds but immediately redirects to `/sign-in` | `requireAdmin()` sees no admin profile row; cookie issues | Hard refresh (Cmd+Shift+R); confirm Supabase Site URL in Step 7 matches the domain you're on |
| All admin tables empty even with real data in DB | `ADMIN_USE_MOCKS=true` or service-role key missing/wrong | Vercel → Settings → Env Vars → confirm `ADMIN_USE_MOCKS=false` and `SUPABASE_SERVICE_ROLE_KEY` is set; redeploy |
| Approve & refund button errors "STRIPE_SECRET_KEY not configured" | Step 3 not done | Set the secret in Supabase Dashboard → Edge Functions → Secrets |
| Approve & refund button errors "Forbidden: admin role required" | The session token from your browser isn't getting through to the Edge Function | Sign out and back in; if persists, hand to Claude — server action's auth-token forwarding may need a re-check |
| Trust score override submits but the value rolls back overnight | Expected — the nightly cron `recompute-trust-scores-nightly` rebuilds scores from `completion_ledger`. The audit trail in `trust_score_overrides` is still preserved. Use overrides for short-term corrections, not permanent scores. | Working as designed |
| `/admin/users` shows blank "Last sign-in" column | `auth.admin.listUsers()` failed silently (service-role key issue, or you have > 50 users) | Increase the page size in `fetchUsers()` or hand to Claude to add pagination |

---

## Done checklist

When all of these are checked, the admin app is fully production-ready:

- [ ] Step 1 — First admin provisioned
- [ ] Step 2 — Local smoke passes
- [ ] Step 3 — Stripe secret set (or intentionally skipped during pre-launch)
- [ ] Step 4 — Deployed to Vercel
- [ ] Step 5 — Vercel password / SSO protection enabled
- [ ] Step 6 — Custom domain pointing at Vercel
- [ ] Step 7 — Supabase Auth Site URL updated
- [ ] Step 8 — (Optional) Push notifications wired
- [ ] Step 9 — All ops staff provisioned
- [ ] Step 10 — Production smoke test passes

---

*HomeBase Admin Ops TODO · 2026-05-14*

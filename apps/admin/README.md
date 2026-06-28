# HomeBase Admin

Internal operations dashboard for the HomeBase marketplace. Next.js 14 (App Router), Tailwind, TanStack Table. Reads + writes live data via the `HomeBase_MVP` Supabase project; gated to users with `profiles.role = 'admin'`.

This is one of two Next.js / Expo workspaces in the monorepo at `Marketplace_MVP/app/`. The mobile app lives next to this one at `apps/mobile/`.

---

## What's in here

| Route | What it does | Wiring |
|---|---|---|
| `/admin/providers` | Tier 1 / Tier 2 verification queue with drawer detail | `fetchProviders` + `overrideVerificationTier` |
| `/admin/jobs` | Live jobs board, filter by status | `fetchJobs` (Supabase realtime ready) |
| `/admin/claims` | Damage claim review — Submitted → Under Review → Approved (refund) / Denied → Resolved | `fetchClaims` + `markUnderReview` / `approveAndRefund` / `denyClaim` / `markResolved` → `release-escrow` Edge Function |
| `/admin/trust-scores` | Composite trust score overrides with full audit trail | `fetchTrustScores` + `overrideTrustScore` (writes to `trust_score_overrides` table) |
| `/admin/users` | User list with role filter + last sign-in timestamp | `fetchUsers` (uses `auth.admin.listUsers` for `last_sign_in_at`) |
| `/sign-in` | Email/password sign-in (Supabase Auth) | `signInAction` |

Sign-out is wired in the sidebar footer — clears the Supabase session and redirects to `/sign-in`.

---

## First-time setup

### 1. Install + env

```bash
cd Marketplace_MVP/app
npm install
cp apps/admin/.env.local.example apps/admin/.env.local
```

Then fill in `apps/admin/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rukpypuzfqrswiybvbkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Dashboard → Settings → API → service_role
ADMIN_USE_MOCKS=false                    # 'true' for offline demo
```

`SUPABASE_SERVICE_ROLE_KEY` is server-side only. Never prefix it with `NEXT_PUBLIC_`.

### 2. Provision your first admin

There is intentionally no admin signup flow. Create the user in Supabase Auth (Dashboard → Authentication → Add user), then elevate them in SQL:

```sql
update profiles
set role = 'admin'::user_role
where email = 'ops@homebase.app';
```

Keep at least two admins so a single forgotten password doesn't lock everyone out.

### 3. Run

```bash
# From Marketplace_MVP/app/
npm run dev:admin            # → http://localhost:3000
```

Without a session, you'll land on `/sign-in`. Sign in with the admin email/password you just provisioned. You'll be redirected to `/admin/providers`.

---

## Architecture notes

### Data layer

- `lib/supabase-server.ts` — `supabaseAdmin` client using the **service role** key. Bypasses RLS. Used only in server actions / server components.
- `lib/auth.ts` — `createSupabaseServerClient()` (per-request, reads cookies), `getAdminSession()`, `requireAdmin()`. Use the latter as the first line of every server action / page.
- `lib/actions.ts` — read-side server functions (`fetchProviders`, `fetchJobs`, etc.) plus `overrideVerificationTier`.
- `lib/actions/claims.ts` — claim resolution actions; invokes `release-escrow` via the admin's session token (the Edge Function verifies the caller is an admin).
- `lib/actions/trust-scores.ts` — score override + audit insert.
- `lib/mocks.ts` — fixtures returned when `ADMIN_USE_MOCKS=true` (or when the live query errors during dev).

### Auth gate

- `middleware.ts` runs on every `/admin/*` request, checks the session via `@supabase/ssr`, and redirects to `/sign-in` if no user is found. The role check (`profiles.role = 'admin'`) happens in `app/admin/layout.tsx` via `requireAdmin()`.
- Sign-in / sign-out actions live at `app/sign-in/actions.ts`.

### Component primitives

- `components/ui/Button.tsx`, `Card.tsx`, `Drawer.tsx`, `Pill.tsx` — shared shadcn-style primitives.
- `components/Sidebar.tsx` — left rail nav + admin email + sign-out.
- `components/PageHeader.tsx` — title + description block at the top of each page.

### Server actions

Every mutation goes through a server action. Pattern:

```ts
'use server';

import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function doSomething(formData: FormData) {
  await requireAdmin();
  // ... write via supabaseAdmin (bypasses RLS) ...
  revalidatePath('/admin/the-page');
}
```

Invoke from a client component via:

```tsx
<form action={doSomething}>
  <input name="id" value={row.id} type="hidden" />
  <button>Do it</button>
</form>
```

---

## Deployment (Vercel)

The admin is a stock Next.js 14 app and deploys cleanly to Vercel.

1. **Push the monorepo to GitHub** if you haven't.
2. **vercel.com/new** → Import repo. **Critical settings:**
   - Framework Preset: Next.js
   - **Root Directory**: `Marketplace_MVP/app/apps/admin`
   - Build / Install / Output: leave defaults
3. **Environment Variables** (Production scope):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← NEVER `NEXT_PUBLIC_`
   - `ADMIN_USE_MOCKS=false`
4. **Lock down access.** Until you build SSO with your own provider, enable Vercel Password Protection (Settings → Deployment Protection → Password) or Vercel Authentication (limit to your team's Vercel accounts). The Supabase auth gate stops unauthenticated users from seeing data — but Vercel-level protection prevents the sign-in page itself from being public.
5. **Custom domain.** Settings → Domains → add `admin.homebase.app` (or your chosen ops domain). Add the CNAME at your registrar.
6. **Deploy.** Vercel auto-deploys on push. Or trigger manually from the admin folder: `vercel --prod`.

The admin reaches Supabase over HTTPS — no VPC config or extra network setup needed.

---

## Scripts

| Command | Effect |
|---|---|
| `npm run dev` | Local dev server, hot reload |
| `npm run build` | Production build |
| `npm run start` | Run the production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

All commands can also be run from the monorepo root via `npm run dev:admin`, `npm run typecheck` (Turbo will scope to the admin workspace).

---

## What's deliberately not in here

- **No public marketing site.** That lives elsewhere (or doesn't exist yet).
- **No customer-facing UI.** Homeowners + providers use the mobile app at `apps/mobile/`.
- **No bulk import / CSV tools.** Add as needed; the patterns in `lib/actions/*.ts` are reusable.
- **No write surface for jobs.** The board is read-only — homeowners + providers run the lifecycle from the mobile app.
- **No write surface for users beyond role-elevation via SQL.** Banning / suspending is intentionally not built — flag it via a claim or escalate to support if needed.

---

## Where to read next

- `MVP_HB_context copy.md` — startup overhead + current state
- `OPERATIONS_TODO.md` — what credentials / accounts the operator still needs to provision
- `RUNNING.md` (in the parent `app/` dir) — full mobile + admin run guide
- `Marketplace_MVP/Full_Backend_Implementation/BACKEND_GUIDE.md` — DB schema + Edge Function reference

---

*HomeBase Admin · 2026-05-14*

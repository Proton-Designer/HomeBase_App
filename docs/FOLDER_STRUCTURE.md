# HomeBase — Complete Folder Structure Reference

> **Purpose:** A map of the entire repository — every folder, every file category, what it's for, and where to find things. Use this when you need to locate a screen, component, API module, doc, or config file.
> **Last updated:** 2026-06-06

---

## Repository Root

```
MyHomebase/                          ← Turborepo monorepo root
├── CLAUDE.md                        ← Non-negotiables, stack, subagent registry — READ FIRST
├── AGENT_START_HERE.md              ← New agent onboarding guide — sequential reading order
├── package.json                     ← Workspace root (workspaces: apps/*)
├── turbo.json                       ← Turborepo pipeline config (build, lint, typecheck)
├── .prettierrc                      ← Prettier config (shared)
├── .gitignore
│
├── apps/                            ← All deployable applications
│   ├── mobile/                      ← React Native (Expo) app — homeowner + provider + tech
│   └── admin/                       ← Next.js 14 admin dashboard — internal ops only
│
├── docs/                            ← All documentation, specs, guides, ops runbooks
│   ├── AGENT_START_HERE.md          ← Agent onboarding guide
│   ├── FOLDER_STRUCTURE.md          ← This file
│   ├── CHANGELOG.md                 ← Running log of all updates (newest first)
│   ├── context/                     ← Startup & product context files
│   ├── guides/                      ← Implementation specs and technical guides
│   ├── ops/                         ← Operations, credentials, todo lists
│   ├── product/                     ← Product requirement documents
│   └── superpowers/                 ← Agent plans and design specs
│
└── .claude/
    └── agents/                      ← Subagent definitions (read before delegating)
```

---

## docs/ — Documentation

### docs/context/
Core context files. Every agent reads these before starting work.

```
docs/context/
├── HOMEBASE_CONTEXT.md              ← MASTER: what HomeBase is, moat, tech stack, build status,
│                                      non-negotiables, revenue model, phase roadmap, glossary
├── COMPETITORS_OVERVIEW.md          ← High-level competitor briefing (Angi, Thumbtack, TaskRabbit,
│                                      Handy, Lawn Love) — read for competitive awareness
└── competitors/                     ← Individual deep-dive files per competitor
    ├── ANGI.md                      ← Angi / HomeAdvisor full profile
    ├── THUMBTACK.md                 ← Thumbtack full profile
    ├── TASKRABBIT.md                ← TaskRabbit full profile
    ├── HANDY.md                     ← Handy full profile
    ├── LAWN_LOVE.md                 ← Lawn Love full profile
    ├── HOUSECALL_PRO.md             ← Housecall Pro (B2B FSM) full profile
    └── JOBBER.md                    ← Jobber (B2B FSM) full profile
```

### docs/guides/
Technical implementation specs. These are the build blueprints.

```
docs/guides/
├── FRONTEND_GUIDE.md                ← FULL frontend spec: design tokens, all 21 screens,
│                                      component specs, animations, UX principles
├── MVP_OVERVIEW.md                  ← 11 MVP features, wedge hypothesis, build order, constraints
├── PHASES.md                        ← 3-phase frontend build split (Foundation / Core Flows / Admin)
├── BACKEND_GUIDE.md                 ← Schema, business logic, Stripe Connect, AI scoring,
│                                      routing engine, Edge Function contracts
├── BACKEND_ENV.md                   ← Operator secret setup checklist (env vars per service)
├── SERVICES_INTEGRATION.md          ← Integration guides for Telnyx, Resend, Google Calendar,
│                                      Stripe Connect, Checkr, Google Maps
└── REVAMP_DESIGN_BRIEF.md           ← Design refresh brief (visual identity, NativeWind tokens)
```

### docs/ops/
Operational runbooks and setup checklists.

```
docs/ops/
├── OPERATIONS_TODO.md               ← Everything requiring operator action before public launch
│                                      (API keys, Stripe webhooks, app store submission, etc.)
├── ADMIN_OPS_TODO.md                ← Admin dashboard operational checklist
├── CREDENTIALS_SETUP.md             ← Step-by-step credentials and secrets setup
└── RUNNING.md                       ← How to run the app locally (mobile + admin)
```

### docs/product/
Product requirement documents (PRDs).

```
docs/product/
├── HomeBase_Homeowner_Product_Doc.docx   ← Full homeowner-facing PRD
└── HomeBase_Provider_Product_Doc.docx    ← Full provider-facing PRD
```

### docs/superpowers/
Agent-generated plans and design specs.

```
docs/superpowers/
├── plans/
│   └── 2026-05-18-demock-app.md          ← Implementation plan: replace mock data with real Supabase
└── specs/
    └── 2026-05-18-demock-app-design.md   ← Design spec for the demock work
```

---

## apps/mobile/ — React Native (Expo) App

Single codebase for all three user roles: homeowner, provider (owner), and provider tech. Role-based screen rendering via Expo Router file groups.

### Top-level files
```
apps/mobile/
├── app.json                ← Expo app config (name, slug, icons, scheme)
├── babel.config.js         ← Babel config (NativeWind plugin, module resolver)
├── package.json
├── tsconfig.json
├── tailwind.config.js      ← NativeWind 4 + design token theme extension
├── .env                    ← Real env vars (gitignored)
└── .env.example            ← Env var template
```

### app/ — Expo Router Screen Files

All screens live here, organized by route group (= user role). The root `_layout.tsx` handles auth gating and role routing.

```
app/
├── _layout.tsx             ← Root layout: auth gate, role-based redirect, QueryClient, Zustand
├── index.tsx               ← Entry redirect (→ auth or role home)
├── +not-found.tsx          ← 404 screen
│
├── (auth)/                 ← Authentication screens (no auth required)
│   ├── _layout.tsx
│   ├── welcome.tsx         ← Welcome / splash screen
│   ├── sign-up.tsx         ← Account creation (homeowner or provider)
│   ├── sign-in.tsx         ← Login screen
│   ├── address-setup.tsx   ← Homeowner: add home address post sign-up
│   └── service-interest.tsx ← Homeowner: select services of interest
│
├── (homeowner)/            ← All homeowner screens (requires homeowner role)
│   ├── _layout.tsx         ← Homeowner layout wrapper + stack navigator
│   │
│   ├── (tabs)/             ← Bottom tab navigator for homeowner main app
│   │   ├── _layout.tsx     ← Tab bar config (Home, Book, Jobs, Inbox, Profile)
│   │   ├── index.tsx       ← Home tab: personalized feed, upcoming jobs
│   │   ├── book.tsx        ← Book tab: service selection entry point
│   │   ├── jobs.tsx        ← My Jobs tab: active + past jobs list
│   │   ├── inbox.tsx       ← Inbox tab: message threads list
│   │   └── profile.tsx     ← Profile tab: account settings, subscriptions, billing
│   │
│   ├── booking/            ← 6-step booking wizard (SACRED FLOW — do not simplify)
│   │   ├── _layout.tsx
│   │   ├── service-select.tsx  ← Step 1: choose service (lawn / cleaning)
│   │   ├── details.tsx         ← Step 2: job details, frequency, notes
│   │   ├── schedule.tsx        ← Step 3: date + time selection
│   │   ├── match.tsx           ← Step 4: matched provider reveal (routing result)
│   │   ├── payment.tsx         ← Step 5: card-on-file selection / add new card
│   │   └── confirmation.tsx    ← Step 6: booking confirmed
│   │
│   ├── job/
│   │   └── [id].tsx        ← Job detail screen: status timeline, provider info, message CTA
│   │
│   ├── providers/          ← Provider browsing (pre-booking)
│   │   ├── _layout.tsx
│   │   ├── index.tsx       ← Provider list / search
│   │   └── [id].tsx        ← Provider profile: trust score, portfolio, reviews, book CTA
│   │
│   ├── subscriptions/      ← Manage recurring subscriptions
│   │   ├── _layout.tsx
│   │   ├── index.tsx       ← Active subscriptions list
│   │   └── [id].tsx        ← Single subscription: pause, cancel, change frequency
│   │
│   ├── claims/             ← Damage claim flow (MVP-9)
│   │   ├── _layout.tsx
│   │   ├── index.tsx       ← Claims list
│   │   ├── [id].tsx        ← Existing claim detail
│   │   ├── incident.tsx    ← New claim step 1: incident type
│   │   ├── description.tsx ← New claim step 2: describe what happened
│   │   ├── photos.tsx      ← New claim step 3: upload photos
│   │   ├── review.tsx      ← New claim step 4: review before submit
│   │   ├── submitted.tsx   ← New claim: submission confirmation
│   │   └── resolution.tsx  ← Claim resolution outcome screen
│   │
│   ├── post-job/           ← Alternative: homeowner posts a job (vs. booking direct)
│   │   ├── _layout.tsx
│   │   ├── service.tsx
│   │   ├── headline.tsx
│   │   ├── description.tsx
│   │   ├── photos.tsx
│   │   ├── review.tsx
│   │   └── submitted.tsx
│   │
│   ├── postings/           ← Browse/manage homeowner's own job postings
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── [id].tsx
│   │
│   └── thread/
│       └── [id].tsx        ← Message thread with provider for a specific job
│
├── (provider)/             ← All provider screens (requires provider_owner role)
│   ├── _layout.tsx
│   │
│   ├── (tabs)/             ← Bottom tab navigator for provider main app
│   │   ├── _layout.tsx     ← Tab bar config (Today, Jobs, Schedule, Earnings, Profile)
│   │   ├── today.tsx       ← Today tab: today's job queue, quick actions
│   │   ├── jobs.tsx        ← All Jobs tab: full job list with filters
│   │   ├── schedule.tsx    ← Schedule tab: calendar view + availability management
│   │   ├── earnings.tsx    ← Earnings tab: revenue, payouts, payout history
│   │   └── profile.tsx     ← Profile tab: business info, verification, trust score
│   │
│   ├── onboarding/         ← 7-step provider onboarding flow (first-time setup)
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx             ← Step 1: welcome + overview
│   │   ├── business.tsx            ← Step 2: business name, type, services offered
│   │   ├── service-area.tsx        ← Step 3: service area (zip codes / radius)
│   │   ├── availability.tsx        ← Step 4: weekly recurring availability
│   │   ├── profile.tsx             ← Step 5: profile photo, bio, portfolio photos
│   │   ├── verification-tier1.tsx  ← Step 6: background check (Tier 1)
│   │   └── banking.tsx             ← Step 7: Stripe Connect Express onboarding
│   │   (verification-tier2.tsx     ← Tier 2 insurance verification — can be done post-onboarding)
│   │
│   ├── crew/               ← Crew management (MVP-10)
│   │   ├── _layout.tsx
│   │   ├── index.tsx       ← Crew member list
│   │   ├── invite.tsx      ← Invite new tech (email + role)
│   │   └── [id].tsx        ← Individual crew member profile, job history
│   │
│   ├── inbox.tsx           ← Provider inbox: all message threads across jobs
│   └── thread/
│       └── [id].tsx        ← Message thread with homeowner for a specific job
│
└── (tech)/                 ← Tech (crew member) screens (requires provider_tech role)
    ├── _layout.tsx
    └── (tabs)/
        ├── _layout.tsx     ← Tab bar config (Today, Earnings only — limited access)
        ├── today.tsx       ← Today tab: assigned jobs + check-in widget
        └── earnings.tsx    ← Earnings tab: own earnings summary only
```

### components/ — React Native Components

```
components/
├── AppErrorBoundary.tsx    ← Top-level error boundary for the app
├── AppSplashScreen.tsx     ← Animated splash screen component
├── FontProvider.tsx        ← Custom font loading (Expo Font)
├── LiquidGlassTabBar.tsx   ← Custom animated tab bar (liquid glass effect)
├── WebShell.tsx            ← Web-specific shell wrapper for Expo web target
│
├── auth/
│   └── AuthSplitLayout.tsx ← Split-screen layout used in auth screens
│
├── checkin/                ← Check-in widget implementations (SACRED — do not modify lightly)
│   ├── HomeownerCheckIn.tsx ← Homeowner post-service check-in (15-second flow)
│   └── ProviderCheckIn.tsx  ← Provider at-job check-in (arrival + completion)
│
├── responsive/
│   └── ResponsiveContainer.tsx ← Breakpoint-aware container for web/tablet
│
├── shared/                 ← Shared components used across all role screens
│   ├── index.ts            ← Barrel export for all shared components
│   ├── ProviderCard.tsx    ← Provider listing card (trust score, verification badge, rating)
│   ├── TrustScoreDisplay.tsx ← Composite trust score ring + 4-component breakdown
│   ├── JobStatusTimeline.tsx ← Job status step indicator (booked → en route → in progress → done)
│   ├── VerificationBadge.tsx ← Tier 1 / Tier 2 badge component
│   ├── CheckInWidget.tsx   ← Shared check-in widget shell
│   ├── SkeletonLoader.tsx  ← Shimmer skeleton for loading states
│   ├── BottomSheetWrapper.tsx ← Bottom sheet modal wrapper (RNBSH)
│   ├── EmptyState.tsx      ← Empty state with illustration + CTA
│   └── QueryErrorState.tsx ← Error state for React Query failures
│
└── ui/                     ← Base design-system UI primitives
    ├── index.ts            ← Barrel export for all UI primitives
    ├── Button.tsx          ← Button (primary, secondary, ghost, danger variants)
    ├── Input.tsx           ← Text input with label, error, helper text
    ├── Card.tsx            ← Surface card with shadow + border radius
    ├── Chip.tsx            ← Small filter/tag chip
    ├── Pill.tsx            ← Status pill (colored label)
    ├── Eyebrow.tsx         ← Small caps section label
    ├── Hero.tsx            ← Large hero heading component
    └── Section.tsx         ← Section wrapper with optional title + padding
```

### lib/ — Utilities, API, State

```
lib/
├── supabase.ts             ← Supabase client singleton (anon key, auto session refresh)
├── queryClient.ts          ← TanStack Query client config (stale time, retry logic)
├── queryKeys.ts            ← Centralized React Query key factory (prevents stale key bugs)
├── types.ts                ← All shared TypeScript types mirroring Supabase schema
├── motion.ts               ← Reanimated 4 animation presets (spring configs, easing curves)
├── cn.ts                   ← NativeWind class merge utility (clsx + twMerge)
├── responsive.ts           ← Responsive sizing helpers (device breakpoints, scale)
├── useBreakpoint.ts        ← Hook: current breakpoint (mobile / tablet / desktop)
│
├── api/                    ← All Supabase / Edge Function API modules
│   ├── index.ts            ← Barrel export for all API modules
│   ├── auth.ts             ← Sign up, sign in, sign out, session, profile fetch
│   ├── addresses.ts        ← Address CRUD for homeowners
│   ├── bookings.ts         ← Create booking, list for homeowner, cancel
│   ├── calendar.ts         ← Calendar connect (OAuth), sync trigger
│   ├── claims.ts           ← Create claim, list claims, fetch claim detail
│   ├── crew.ts             ← Invite tech, list crew members, remove member
│   ├── events.ts           ← Provider availability / blocked-time events
│   ├── jobs.ts             ← List for provider, accept, decline, update status
│   ├── messages.ts         ← Send, list, mark read, realtime subscription
│   ├── notifications.ts    ← Register push token, trigger push notification
│   ├── payments.ts         ← Attach payment method, create/capture Stripe intent, payout
│   ├── postings.ts         ← Homeowner job postings (browse, bid, award)
│   ├── providers.ts        ← Provider search, profile fetch, trust score fetch
│   ├── realtime.ts         ← Supabase Realtime subscription helpers
│   ├── storage.ts          ← Supabase Storage upload/download helpers
│   └── subscriptions.ts    ← Manage recurring subscriptions (pause, cancel, change)
│
├── constants/
│   ├── index.ts            ← App-wide constants (service types, booking states, etc.)
│   └── labels.ts           ← Display strings / label constants
│
└── scoring/
    └── weights.ts          ← Trust score component weights (Reliability/Quality/Comm/Prof)
```

---

## apps/admin/ — Next.js 14 Admin Dashboard

Internal HomeBase ops tool only — not customer-facing.

```
apps/admin/
├── app/
│   ├── layout.tsx              ← Root layout (fonts, global styles)
│   ├── page.tsx                ← Root redirect → /admin
│   ├── globals.css             ← Global Tailwind CSS
│   ├── global-error.tsx        ← Global error boundary
│   │
│   ├── sign-in/
│   │   ├── page.tsx            ← Admin sign-in page
│   │   └── actions.ts          ← Server action: Supabase auth sign-in
│   │
│   └── admin/                  ← Protected admin section (middleware-guarded)
│       ├── layout.tsx          ← Admin layout: sidebar nav + header
│       ├── error.tsx           ← Admin section error boundary
│       │
│       ├── providers/          ← Provider management
│       │   ├── page.tsx        ← Server component: fetch + render
│       │   └── ProvidersClient.tsx ← Client: filterable table (verification, trust, status)
│       │
│       ├── jobs/               ← Job board
│       │   ├── page.tsx
│       │   └── JobsClient.tsx  ← Client: real-time job status board with TanStack Table
│       │
│       ├── claims/             ← Damage claims queue
│       │   ├── page.tsx
│       │   └── ClaimsClient.tsx ← Client: triage, assign, resolve claims
│       │
│       ├── trust-scores/       ← Trust score overrides
│       │   ├── page.tsx
│       │   └── TrustScoresClient.tsx ← Client: view + manually override composite scores
│       │
│       └── users/              ← User management
│           ├── page.tsx
│           └── UsersClient.tsx ← Client: all users, roles, last sign-in
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← Browser Supabase client (for client components)
│   │   └── server.ts           ← Server Supabase client (for Server Components + actions)
│   └── actions.ts              ← Server actions: fetchProviders, fetchJobs, fetchClaims,
│                                  fetchTrustScores, fetchUsers
│
├── middleware.ts               ← Edge middleware: auth guard for /admin/* routes
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## .claude/agents/ — Subagent Definitions

Each file defines a specialized subagent. Read the relevant file before delegating a task.

```
.claude/agents/
├── design-system.md        ← Design tokens, base components, Expo Router scaffold
├── rn-screens.md           ← Any of the 21 mobile screens
├── booking-and-checkin.md  ← 6-step booking wizard + 15-second check-in widget (sacred flows)
├── shared-components.md    ← ProviderCard, TrustScoreDisplay, JobStatusTimeline, etc.
├── admin-nextjs.md         ← Everything under apps/admin/
├── frontend-qa.md          ← Read-only review pass before merging UI changes
├── services-researcher.md  ← External research tasks (market, competitor, integration)
└── web-native.md           ← Web-specific adaptations of the RN codebase
```

---

## Key File Quick-Reference

| What you need | Where to find it |
|---|---|
| What HomeBase is + full context | `docs/context/HOMEBASE_CONTEXT.md` |
| Competitor intelligence (overview) | `docs/context/COMPETITORS_OVERVIEW.md` |
| Competitor intelligence (deep dive) | `docs/context/competitors/[COMPETITOR].md` |
| This folder map | `docs/FOLDER_STRUCTURE.md` |
| Recent changes + update log | `docs/CHANGELOG.md` |
| Agent onboarding guide | `docs/AGENT_START_HERE.md` (also at repo root) |
| Non-negotiables + stack summary | `CLAUDE.md` (repo root) |
| Frontend spec (all 21 screens) | `docs/guides/FRONTEND_GUIDE.md` |
| Backend spec (schema, Edge Functions) | `docs/guides/BACKEND_GUIDE.md` |
| 11 MVP features + build constraints | `docs/guides/MVP_OVERVIEW.md` |
| Frontend build phases (3 phases) | `docs/guides/PHASES.md` |
| Secrets + env var checklist | `docs/guides/BACKEND_ENV.md` |
| Pre-launch operator checklist | `docs/ops/OPERATIONS_TODO.md` |
| How to run locally | `docs/ops/RUNNING.md` |
| Homeowner screen (any specific one) | `apps/mobile/app/(homeowner)/...` |
| Provider screen (any specific one) | `apps/mobile/app/(provider)/...` |
| Tech screen | `apps/mobile/app/(tech)/...` |
| Auth screens | `apps/mobile/app/(auth)/...` |
| Shared components | `apps/mobile/components/shared/` |
| UI primitives (Button, Input, Card…) | `apps/mobile/components/ui/` |
| Check-in widget implementations | `apps/mobile/components/checkin/` |
| API modules (Supabase / Edge Functions) | `apps/mobile/lib/api/` |
| TypeScript types (mirrors DB schema) | `apps/mobile/lib/types.ts` |
| React Query key factory | `apps/mobile/lib/queryKeys.ts` |
| Admin dashboard screens | `apps/admin/app/admin/` |
| Admin server actions | `apps/admin/lib/actions.ts` |
| Subagent definitions | `.claude/agents/` |

---

*HomeBase · Folder Structure Reference · 2026-06-06*

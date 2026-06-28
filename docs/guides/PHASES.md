# Frontend Build — 3 Phase Split

The `FRONTEND_GUIDE.md` is split into three execution phases. Each phase is shippable: by end of Phase 1 the app boots and the design language is real; by end of Phase 2 every user-facing flow works against mocks; by end of Phase 3 the admin app exists and the FE talks to real Supabase.

---

## Phase 1 — Foundation (this phase)

**Goal:** App scaffold, design language, navigation, shared components, mock data layer, auth screens. App boots and renders the welcome flow end-to-end against mocks.

**Guide sections covered:**
- §1 Project Setup (full)
- §2 Design System & Theme (full)
- §3 Navigation Architecture (full)
- §6 Shared Components Library (all 8 components)
- §8.1, §8.7 Supabase client stub + mock data layer
- §9 State Management (Zustand stores, React Query setup, query key conventions)
- §4.1–§4.5 Auth screens (Welcome, Sign Up, Sign In, Address Setup, Service Interest)

**Deliverables:**
1. Turborepo monorepo at `Marketplace_MVP/app/` with `apps/mobile/` (Expo) and `apps/admin/` (Next.js) initialized
2. All dependencies installed per §1
3. Design tokens (`tokens/colors.ts`, `tokens/typography.ts`, `tokens/spacing.ts`, `tokens/shadows.ts`)
4. Base UI components (`Button`, `Input`, `Card`)
5. Expo Router file tree with auth/homeowner/provider/tech route groups + auth gate in root layout
6. 8 shared components (`ProviderCard`, `TrustScoreDisplay`, `JobStatusTimeline`, `VerificationBadge`, `CheckInWidget` shell, `SkeletonLoader`, `BottomSheet`, `EmptyState`)
7. Zustand stores (`authStore`, `bookingStore`, `jobStore`)
8. React Query client + key conventions
9. Mock data layer (`lib/mocks/providers.ts`, `lib/mocks/jobs.ts`) gated by `EXPO_PUBLIC_USE_MOCKS`
10. Auth screens 4.1–4.5 with animations per spec
11. App boots via `npm run dev` / `expo start`

**Subagents used:**
- `design-system` (lead) — §1, §2
- `shared-components` — §6
- `rn-screens` — §3 navigation + §4.1–§4.5 auth screens
- `frontend-qa` — final pass

---

## Phase 2 — Core Flows

**Goal:** Every homeowner and provider screen lives. The booking wizard and check-in widget hit the spec. Mocks still backing data.

**Guide sections covered:**
- §4.6–§4.18 Homeowner main app (Browse, Book entry, 6-step Booking Flow, My Jobs, Job Detail, Check-in, Inbox, Profile, Provider Detail, Claim Flow)
- §5 Provider App (Onboarding 7 steps, Today, Schedule, Jobs, Earnings, Profile, At-job Check-in)
- §10 Animations & Polish — applied to booking step transitions, trust ring animations, check-in micro-celebrations
- §11 Error Handling & Loading States

**Subagents used:**
- `booking-and-checkin` — sacred flows (booking wizard + both check-in variants)
- `rn-screens` — all other homeowner + provider screens
- `shared-components` — extending components as screens demand them
- `frontend-qa` — pass after each major flow

---

## Phase 3 — Admin App + Real API + Polish

**Goal:** Internal Next.js admin app shipped. Mock layer swappable for real Supabase. Polish pass.

**Guide sections covered:**
- §7 Web Admin Dashboard (Providers queue, Jobs board with Realtime, Claims, Trust Score Overrides, Users)
- §8.2–§8.6 Real Supabase wiring (auth, provider, homeowner, payment endpoints, realtime subscriptions)
- §10 final animation polish pass
- §12 Key UX Principles enforcement audit

**Subagents used:**
- `admin-nextjs` (lead) — entire `apps/admin/`
- `rn-screens` — replacing mock calls with real Supabase queries
- `frontend-qa` — final compliance pass against §12 principles

---

## Build order rule

Phases are sequential. Within a phase, parallelism is OK across subagent boundaries. Do not start Phase 2 work until Phase 1 boots cleanly and the shared components render in isolation.

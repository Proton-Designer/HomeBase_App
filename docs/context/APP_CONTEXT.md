# HomeBase — App Context Reference

> **Purpose:** Quick-reference overview of what HomeBase is, what's built, what's pending, and the key constraints. Read this alongside `MVP_HB_context copy.md` for full depth.
> **Last updated:** 2026-05-19

---

## What HomeBase Is

HomeBase is an **AI-native home services platform** with a dual-layer architecture:

- **Layer 1 — Consumer Marketplace**: connects homeowners with vetted home service providers (lawn care, house cleaning) for subscription and one-off bookings. This is the MVP wedge.
- **Layer 2 — HomeBase OS**: an AI operating system sold to home service companies (HSCs) that runs their entire business — scheduling, quoting, cash flow, reputation, and crew management — as a unified intelligence layer. This is Phase 4+.

The analogy: **HomeBase Marketplace : HomeBase OS = Amazon Retail : AWS.** The marketplace generates the verified transaction data that powers the OS. The OS upgrade path captures operators who entered via the marketplace.

---

## The Core Differentiators (vs. Angi / Thumbtack / TaskRabbit)

| HomeBase | Incumbents |
|---|---|
| No lead-resale: one inquiry → one provider | Sell same lead to 3–8 contractors |
| Subscription-first (weekly/biweekly/monthly) | Transactional only |
| Earns on completion (10% take rate) | Earns on inquiry (pay-per-lead) |
| 15-second check-in widget: verified quality capture | Unverified star ratings |
| Composite trust score from verified jobs | Gameable reviews |
| Same-day Stripe Instant payouts | Up to 12 business days (TaskRabbit) |
| Real damage protection: escrow + binding SLA | Fine-print disclaimers |
| Crew/team accounts (Owner + Tech roles) | Solo 1099 gig model only |
| Masked contacts until job confirmed | Phone numbers sold immediately |

---

## Users

### Homeowner
Residential property owner/renter needing recurring or one-off home services. MVP services: **lawn care** and **house cleaning**. Primary pain: lead-spam platforms, no subscriptions, no quality accountability.

### Provider / Operator
Two personas:
- **O1 — Solo Provider** (1–2 people, $50K–$200K revenue): replaces Angi/Thumbtack lead-gen spend with HomeBase's completion-based take rate.
- **O2 — Small Operator** (3–20 employees, $200K–$2M revenue): replaces lead-gen spend + FSM software subscription.

Two roles within a provider account:
- **Owner**: full admin access (onboarding, schedule, earnings, crew, verification, banking)
- **Tech**: limited access (assigned jobs today, check-in, own earnings summary only)

---

## Revenue Model

| Line | Rate | Trigger |
|---|---|---|
| Subscription take rate | 10% | Recurring booking (weekly/biweekly/monthly) |
| One-off take rate | 17.5% | Single non-recurring booking |
| Featured placement + verification badge | $29/mo (provider) | Operator opt-in |
| Premium homeowner tier | $5.99/mo | Priority matching + service guarantees |
| HomeBase OS | $349/mo | Phase 4+ (B2B SaaS) |
| Capital advances | 6–8% fee | Phase 5+ (underwritten on verified job data) |
| Data licensing | $50–250K/seat | Phase 5+ (insurers, PE, franchises) |

Founding-200 operators: 8% take rate (vs. standard 10/17.5%) as incentive.

---

## The 11 MVP Features

| ID | Feature |
|---|---|
| MVP-1 | Subscription plans (weekly/biweekly/monthly) for lawn + cleaning |
| MVP-2 | Single-routed booking (no lead resale) |
| MVP-3 | Composite trust score (4 components + AI "why this score") |
| MVP-4 | 15-second post-service check-in widget |
| MVP-5 | Schedule-as-source-of-truth (availability + service area drive routing) |
| MVP-6 | Two-way Google Calendar sync |
| MVP-7 | Instant payouts via Stripe Instant |
| MVP-8 | Card-on-file + escrow holdback |
| MVP-9 | Damage protection / claim flow |
| MVP-10 | Crew/team accounts (Owner + Tech roles) |
| MVP-11 | Verification Tier 1 (background-checked) + Tier 2 (insured) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo SDK 54 (managed workflow), Expo Router 6, NativeWind 4, Reanimated 4 |
| Web admin | Next.js 14 App Router + shadcn/ui + TanStack Table |
| State | Zustand 4.5 (UI), TanStack Query 5 (server) |
| Forms | React Hook Form 7 + Zod 3 |
| Backend | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) |
| Payments | Stripe Connect Express only |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) — check-in grading + trust score "why" lines |
| Calendar | Google Calendar API (two-way sync) |
| Maps | Google Maps Platform (geocoding + Distance Matrix) |
| SMS | Telnyx (Programmable Messaging v2) |
| Email | Resend |
| Push | Expo Push Notifications |

---

## Non-Negotiables (Enforce in Every Change)

1. **No lead-resale, ever.** One inquiry → one provider. Never surface multiple providers lead-auction style.
2. **Earn on completion, not inquiry.** Revenue hooks tie to verified job completion (check-in submitted + payment captured).
3. **The check-in widget is sacred.** 15 seconds of taps, polished, always works. Never simplify out of existence.
4. **Data hooks are required.** Every completed booking writes to `completion_ledger`; every search writes to `demand_events`.
5. **Trust Ladder Rung 1 only at MVP.** Operator approves every action; no autonomous agent moves.
6. **RLS on every table.** Multi-tenant security is not retrofittable.
7. **Operator Graph hygiene.** Temporal columns (`valid_from`, `valid_to`) on key fact tables; no orphaned records.
8. **Single RN codebase.** Homeowner + provider screens in one Expo repo, role-based screen rendering.

---

## What Is Built (as of 2026-05-19)

### Monorepo & Mobile App Skeleton — DONE
- Turborepo monorepo at `Marketplace_MVP/app/`
  - `apps/mobile` — Expo SDK 54 managed, Expo Router 6, single codebase for homeowner + provider + tech roles
  - `apps/admin` — Next.js 14 App Router admin dashboard (internal ops only)
- Design system: tokens, base components, NativeWind 4 wired to FRONTEND_GUIDE spec
- All 21 mobile screens scaffolded (homeowner browse/book/jobs/inbox/profile; provider onboarding/dashboard/schedule/earnings/profile; tech today; auth)
- 6-step booking wizard (homeowner) + 15-second check-in widget (both homeowner + provider variants) — both sacred flows built
- 8 shared components: ProviderCard, TrustScoreDisplay, JobStatusTimeline, VerificationBadge, SkeletonLoader, BottomSheet, EmptyState + check-in components

### Supabase Backend — DONE
- Live project: `HomeBase_MVP` (id: `rukpypuzfqrswiybvbkg`, us-east-2, Postgres 17.6, ACTIVE_HEALTHY)
- 21 tables, all RLS-enabled: `profiles, addresses, homeowners, providers, provider_team, bookings, jobs, subscriptions, claims, postings, completion_ledger, demand_events, stripe_accounts, payment_methods, payments, escrow_holdbacks, payouts, routing_decisions, push_tokens, calendar_tokens, notification_log, messages`
- 11 migrations applied
- 24 Edge Functions deployed (all ACTIVE): `providers-search`, `booking-create`, `claim-create`, `crew-invite`, `homeowner-checkin v2`, `provider-checkin v2`, `job-accept`, `job-decline`, `provider-onboard`, `route-booking`, `stripe-{onboard-provider, attach-payment-method, create-intent, capture-on-completion, instant-payout, webhook}`, `compute-trust-score`, `generate-trust-rationale`, `send-{sms, email, push}`, `register-push-token`, `calendar-connect`, `calendar-sync`
- Auth: Supabase Auth (email/password) + `profiles` table + `handle_new_user` trigger; `user_role` enum (`homeowner | provider_owner | provider_tech`)
- Storage: 4 buckets (`avatars` public, `portfolio-photos` public, `booking-photos` private, `claim-photos` private)
- Realtime: `jobs` and `messages` tables on `supabase_realtime` publication
- Cron: `recompute-trust-scores-nightly` at `15 6 * * *` UTC
- Security advisors: zero WARN; Performance advisors: zero unindexed-FK WARN

### Messaging — DONE
- `messages` table with RLS (homeowner + matched provider/team only per job)
- API: `listForJob`, `send`, `markRead`, `listThreadsForHomeowner`, `listThreadsForProvider`
- Realtime subscription on `messages` channel
- Homeowner + provider inbox/thread screens wired

### Frontend ↔ DB Alignment — DONE
- All API call sites aligned to real schema (no references to nonexistent columns/tables)
- Admin fetchers (`fetchProviders`, `fetchJobs`, `fetchClaims`, `fetchTrustScores`, `fetchUsers`) rewritten against real columns

### SMS Integration — DONE
- `send-sms` Edge Function v2 on Telnyx (`api.telnyx.com/v2/messages`)
- All Twilio references replaced

---

## 5 Remaining Code Gaps (Claude Can Fix In-Session)

These don't require operator setup — pure code wiring:

| # | Gap | Details |
|---|---|---|
| 1 | **MVP-3 AI rationale** | `generate-trust-rationale` Edge Function deployed but never invoked; match screen shows hardcoded mock reasons |
| 2 | **MVP-4 photo storage** | Zero `supabase.storage.from(...).upload(...)` calls in mobile codebase; photos are URL strings only |
| 3 | **MVP-6 calendar sync** | `calendar-sync` Edge Function never invoked from accepted-job handler |
| 4 | **MVP-8 Stripe capture** | `captureOnCompletion(jobId)` exported but never called — **critical revenue bug**: cards never actually captured at check-in |
| 5 | **MVP-5 blocked-time UI** | `provider_blocked_times` table exists but no UI to write to it; `route-booking` join against availability + blocked times unverified |

---

## What Remains After Code Gaps (Operator-Only Setup)

Once the 5 code gaps are closed, all remaining work is operator provisioning only (see `OPERATIONS_TODO.md`):
- Third-party account setup (Telnyx, Resend, Stripe, Google, Checkr, etc.)
- Edge Function secrets in Supabase dashboard
- Supabase Auth config (OAuth providers, email templates)
- Stripe webhook registration
- `.env` file population with real keys
- Apple/Google developer accounts
- EAS store build submission

---

## Phase Roadmap

| Phase | Timeline | Focus |
|---|---|---|
| **Phase 1 — Marketplace MVP** | NOW | Austin TX beachhead (78704), 100 operators, 600 homeowners |
| **Phase 2 — Expansion** | Month 6–12 | 4 cities, 1,200 operators, V2 AI (no-show/churn prediction) |
| **Phase 3 — Density + OS Beta** | Month 12–18 | 10 cities, HomeBase OS beta with 50–100 paying operators |
| **Phase 4 — OS Commercial** | Month 18–24 | $349/mo OS live, full 8-agent stack, 6,000 operators |
| **Phase 5 — Financial Products** | Year 3+ | Capital advances, embedded insurance, data licensing |

---

## Subagents (Defined in `.claude/agents/`)

| Agent | When to Use |
|---|---|
| `design-system` | Theme tokens, base components, monorepo + Expo Router scaffold |
| `rn-screens` | Building any of the 21 mobile screens against the design system |
| `booking-and-checkin` | 6-step booking wizard or 15-second check-in widget (sacred flows) |
| `shared-components` | ProviderCard, TrustScoreDisplay, JobStatusTimeline, VerificationBadge, SkeletonLoader, BottomSheet, EmptyState |
| `admin-nextjs` | Anything under `apps/admin/` |
| `frontend-qa` | Read-only review pass before merging UI changes |

---

## Founding Team

- **Ayman Mohammed** — Technical co-founder. Full-stack engineer. Product + engineering lead.
- **Kareem** — Non-technical co-founder. Operator relationships, sales, GTM.

Both based in Texas. Beachhead market: Austin, TX (zip code 78704).

---

## Key Files Reference

| File | Purpose |
|---|---|
| `MVP_HB_context copy.md` | Full startup context — what HomeBase is, moat, why, full implementation status |
| `Marketplace_MVP/MVP_OVERVIEW.md` | 11 MVP features, wedge hypothesis, tech stack, constraints |
| `Marketplace_MVP/PHASES.md` | 3-phase frontend build split |
| `Marketplace_MVP/Frontend_and_Basic_Backend/FRONTEND_GUIDE.md` | Full frontend implementation spec |
| `Marketplace_MVP/Full_Backend_Implementation/BACKEND_GUIDE.md` | Schema, business logic, Stripe, AI scoring, routing |
| `Marketplace_MVP/Full_Backend_Implementation/BACKEND_ENV.md` | Operator secret setup checklist |
| `OPERATIONS_TODO.md` | Everything that requires operator action before public launch |
| `CLAUDE.md` | Non-negotiables, stack, subagent registry — read before any change |

---

*HomeBase · App Context · 2026-05-19*

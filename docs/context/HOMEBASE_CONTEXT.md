# HomeBase — Master Context File

> **Purpose:** The single authoritative reference for what HomeBase is, why it exists, what's built, what's pending, and every constraint agents must respect. Read this first — before any code change, any feature addition, any architectural decision.
> **Last updated:** 2026-06-06

---

## 1. What HomeBase Is

HomeBase is an **AI-native home services platform** built on a dual-layer architecture:

- **Layer 1 — Consumer Marketplace**: connects homeowners with vetted home service providers (lawn care, house cleaning) for subscription and one-off bookings. This is the MVP wedge — live now.
- **Layer 2 — HomeBase OS**: an AI operating system sold B2B to home service companies (HSCs) that runs their entire business — scheduling, quoting, cash flow, reputation, and crew management — as a unified intelligence layer. This is Phase 4+.

The analogy driving every product and architecture decision: **HomeBase Marketplace : HomeBase OS = Amazon Retail : AWS.** The marketplace generates verified transaction data that powers the OS. The OS upgrade path captures operators who entered via the marketplace.

---

## 2. The Problem HomeBase Solves

### For homeowners:
The current home services market is broken by lead-spam platforms. Angi, Thumbtack, and HomeAdvisor sell the same homeowner's contact info to 3–8 contractors simultaneously. The contractor who calls fastest wins the job — not the best one. The result:
- **41% of homeowners report being deceived** by service providers (Leaf Home / Morning Consult 2025)
- **No verified quality data** — star ratings are gameable and unverified
- **No accountability** — damage guarantees exist only in fine print
- **No subscriptions** — managing recurring home services requires re-booking every time

### For home service operators:
Running a home services business is operationally brutal. A 10-person lawn care company spends:
- **3+ hours/day on admin**: scheduling, quoting, chasing payments, answering calls, managing reviews
- **$500–$2,000/month on lead-gen** (Angi, Thumbtack, Google LSA) with a return of ~15 cents per dollar spent
- The best software (ServiceTitan at $300+/mo, Jobber at $49–249/mo) is built for larger companies and doesn't solve the demand problem

The "missing middle" — home service businesses with 1–20 employees — has no product designed for them.

---

## 3. The Core Differentiators

| HomeBase | Incumbents (Angi / Thumbtack / TaskRabbit) |
|---|---|
| Local-only matching: requests sent to nearby providers only | Sell same lead to 3–8 contractors nationally |
| Subscription-first (weekly/biweekly/monthly) | Transactional only — every booking is a new transaction |
| Earns on completion (10% take rate) | Earns on inquiry (pay-per-lead or lead pack) |
| 15-second check-in widget: verified quality capture | Unverified star ratings only |
| Composite trust score from verified jobs | Gameable reviews from anyone |
| Same-day Stripe Instant payouts | Up to 12 business days (TaskRabbit) |
| Real damage protection: escrow + binding SLA | Fine-print disclaimers |
| Crew/team accounts (Owner + Tech roles) | Solo 1099 gig model only |
| Masked contacts until job confirmed | Phone numbers sold immediately |

---

## 4. The Two Users

### Homeowner
A residential property owner or renter needing recurring or one-off home services. MVP services: **lawn care** and **house cleaning** (highest recurring demand, lowest trust variance).

**Primary jobs to be done:**
- Find a trusted, vetted provider — book once, have it recur
- Track job status in real time
- Rate service quality via the 15-second check-in
- File a damage claim if something goes wrong
- Manage active subscriptions (pause, cancel, change frequency)

**Key fears addressed by the product:**
- "Will this stranger damage my property?" → Verification badges, trust score, damage protection prominently displayed
- "Am I getting spammed by contractors from across the country?" → Only local, vetted providers in your area can quote; homeowner chooses who to hire
- "What if they don't show up?" → Provider reliability score, schedule-as-source-of-truth, SMS reminders

### Provider / Operator
Two personas:

**O1 — Solo Provider** (1–2 people, $50K–$200K revenue)
- Already on Angi/Thumbtack/TaskRabbit, paying $500–$2K/month for leads that mostly don't convert
- Primary pitch: replace lead-gen spend with HomeBase's completion-based take rate

**O2 — Small Operator** (3–20 employees, $200K–$2M revenue)
- May already use Jobber or Housecall Pro
- Primary pitch: marketplace demand + HomeBase OS replacing both lead-gen spend AND FSM subscription

**Roles within a provider account:**
- **Owner**: full admin access — onboarding, schedule, earnings, crew management, verification, banking
- **Tech**: limited access — sees assigned jobs today, marks status, submits check-in, views own earnings summary only

---

## 5. Revenue Model

| Line | Rate | Trigger |
|---|---|---|
| Subscription take rate (L1) | 10% | Recurring booking (weekly/biweekly/monthly) on completion |
| One-off take rate (L2) | 17.5% | Single non-recurring booking on completion |
| Featured placement + verification badge (L4) | $29/mo (provider) | Operator opt-in |
| Premium homeowner tier (L4) | $5.99/mo | Priority matching + service guarantees |
| HomeBase OS subscription (L3) | $349/mo flat | Phase 4+ — B2B SaaS, no per-seat pricing |
| Capital advances (L5) | 6–8% fee | Phase 5+ — underwritten on verified job data |
| Insurance (L5) | MGA partnership | Phase 5+ — priced using HomeBase quality + dispute data |
| Data licensing (L5) | $50–250K/seat | Phase 5+ — sold to insurers, PE roll-ups, national franchises |

**Founding-200 operators:** 8% take rate (vs. standard 10/17.5%) as founding-member incentive.

**Revenue trajectory:**
| Year | Cities | Operators | GMV | Revenue | Notes |
|------|--------|-----------|-----|---------|-------|
| Year 1 | 1 (Austin) | 100 | — | $80K | Beachhead, marketplace only |
| Year 2 | 4 | 1,200 | — | $1.75M | OS launches, break-even Q2 |
| Year 3 | 10 | 6,000 | $92M | $15.5M | 76% blended CM |

**Path to $1B+:** 20,000 operators × OS ($84M ARR) + marketplace take on $500M+ GMV + financial products ≈ $194M revenue → $1B+ at 10x multiple.

---

## 6. The 11 MVP Features (Exact Scope)

| ID | Feature | Core Purpose |
|---|---|---|
| MVP-1 | Subscription plans (weekly/biweekly/monthly) for lawn + cleaning | Prove recurring revenue; 10% take rate |
| MVP-2 | Local provider marketplace (no pay-per-lead) | Homeowner request goes to local providers only; they quote, homeowner chooses; nobody pays until job is verified complete |
| MVP-3 | Composite trust score (4 components + AI "why this score") | Differentiate from star ratings; make trust legible |
| MVP-4 | 15-second post-service check-in widget | Primary data capture mechanism; feeds trust score |
| MVP-5 | Schedule-as-source-of-truth (availability + service area drive routing) | No ghost jobs; no provider receiving jobs they can't take |
| MVP-6 | Two-way Google Calendar sync | Reduce provider no-shows; increase scheduling trust |
| MVP-7 | Instant payouts via Stripe Instant | Attract quality providers away from slow-payout platforms |
| MVP-8 | Card-on-file + escrow holdback | Enable recurring billing; protect homeowners from new providers |
| MVP-9 | Damage protection / claim flow | Remove the #1 homeowner fear; create real accountability |
| MVP-10 | Crew/team accounts (Owner + Tech roles) | Enable small businesses, not just solo operators |
| MVP-11 | Verification Tier 1 (background-checked) + Tier 2 (insured) | Trust infrastructure; foundation for composite score |

---

## 7. The Data Flywheel (The Moat)

Every other strategic decision traces back to this.

**What the marketplace generates that no incumbent has:**
1. **Verified completion ledger** — every job actually completed, what it cost, quality, who did it. Check-in verified, not self-reported.
2. **Composite trust score history** — 4-component time-series scores per provider, computed from verified check-ins
3. **Cross-operator pricing distribution** — real provider prices per zip per service type from actual transactions
4. **Dispute outcomes corpus** — what kinds of jobs generate claims, which providers have issues
5. **Demand patterns by zip × category × season × day-part**
6. **Property Encounter Graph** — temporal record of what was done at each address, by whom, with what quality outcome

**Why incumbents can't replicate this:** ServiceTitan, Jobber, and Housecall Pro are per-tenant SaaS. Their MSAs contractually prohibit using one operator's data to improve another's product. They cannot pool cross-operator data. HomeBase is a marketplace first — pooled data is a structural feature, not an add-on.

**The compounding timeline:**
- At **100 operators**: useful for trust scoring and basic routing
- At **1,000 operators**: AI dispatcher converges (no-show prediction crosses AUC 0.80)
- At **5,000 operators**: pricing distribution defensible per zip × service × scope
- At **10,000 operators**: insurance underwriting, capital advance default-rate calibration, data licensing viable

---

## 8. HomeBase OS — What It Actually Is (Phase 4+)

Not a bundle of AI features — a unified intelligence layer running the operator's entire business, with **8 AI agents sharing one brain (the Operator Graph)**.

### The 8 Agents:
| Agent | What it does |
|---|---|
| **Conductor** | Orchestrates all other agents, handles operator voice/chat, builds "Today Queue" of prioritized actions |
| **Quote Agent** | Auto-prices jobs from address data + marketplace zip benchmarks + operator pricebook |
| **Dispatch Agent** | Predicts no-shows, optimizes crew routing, re-balances routes in real time |
| **Cash Flow Agent** | Monitors receivables, forecasts 30/60/90-day revenue, triggers same-day payouts, underwrites capital advances |
| **Reputation Agent** | Monitors reviews across Google/Yelp/Facebook, drafts responses in operator tone, syndicates verified reviews |
| **Crew Intelligence Agent** | Tracks performance, predicts burnout, surfaces hiring candidates from marketplace gig pool |
| **Customer Intelligence Agent** | Scores churn risk, identifies upsell moments, personalizes communication timing |
| **Relations Agent** | Manages customer relationships, drafts outreach, tracks interaction history |

### The Operator Graph:
A temporal knowledge graph (Graphiti/Zep pattern) storing everything HomeBase knows about an operator's business: customers, jobs, crew, payments, reviews, disputes, properties — all versioned over time. This is the "memory" that makes agents smarter the longer an operator uses HomeBase.

### The Trust Ladder:
| Rung | Mode | At MVP |
|---|---|---|
| Rung 0 | Observe (agents show data, make no suggestions) | — |
| Rung 1 | Suggest (agent suggests, operator approves) | **← MVP default** |
| Rung 2 | Auto-reversible (agent executes + notifies, operator can undo) | Phase 4+ |
| Rung 3 | Autonomous (agent executes, logs to audit trail) | Phase 4+ |

---

## 9. Tech Stack

### Marketplace MVP (Phase 1 — live):
| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo SDK 54 (managed workflow), Expo Router 6, NativeWind 4, Reanimated 4 (never core `Animated`) |
| Web admin | Next.js 14 App Router + shadcn/ui + TanStack Table |
| State | Zustand 4.5 (UI state), TanStack Query 5 (server state) |
| Forms | React Hook Form 7 + Zod 3 |
| Backend | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) |
| Payments | Stripe Connect Express only |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) — check-in grading + trust score "why" lines |
| Calendar | Google Calendar API (two-way sync) |
| Maps | Google Maps Platform (geocoding + Distance Matrix) |
| SMS | Telnyx (Programmable Messaging v2) |
| Email | Resend |
| Push | Expo Push Notifications |

### HomeBase OS (Phase 4+):
| Layer | Technology |
|---|---|
| Cockpit | Next.js 14 web dashboard (operator-facing SaaS) |
| Agent orchestration | LangGraph (Python) — multi-agent state machines with Postgres checkpointing |
| LLM routing | Claude Sonnet for Conductor + reasoning; Haiku for classification/drafting |
| Memory | Zep/Graphiti pattern — temporal knowledge graph per operator |
| Event bus | Redis Streams (Upstash) + Postgres outbox pattern |
| Voice (Phase 4) | Vapi or Retell AI → Telnyx voice infrastructure |
| Integrations | Stripe Connect, QuickBooks Online, Google Calendar, Google Business Profile, Plaid, OR-Tools (VRP), Checkr (KYC) |
| Observability | LangSmith (agent tracing) + Sentry + PostHog |

---

## 10. Non-Negotiables (Enforce in Every Change)

These are inviolable. Any code change that violates these must be rejected.

1. **No pay-per-lead, ever.** Providers never pay to receive a request or to submit a quote. Revenue only triggers on verified job completion. Never build a mechanism that charges providers for contact, clicks, or inquiries.
2. **Earn on completion, not inquiry.** Revenue hooks tie to verified job completion (check-in submitted + payment captured), never to clicks, impressions, or contact exchanges.
3. **The check-in widget is sacred.** 15 seconds of taps, polished, always works. It is the primary data-generation mechanism. Never simplify it out of existence.
4. **Data hooks are non-negotiable.** Every completed booking writes to `completion_ledger`; every search writes to `demand_events`. Skipping these delays the entire Phase 4 roadmap.
5. **Trust Ladder Rung 1 only at MVP.** No autonomous agent actions. Everything requires operator approval. Build the audit trail from Day 1.
6. **RLS on every table.** No row in any table should be accessible by the wrong user role. Multi-tenant security is not retrofittable — build it right from the schema layer.
7. **Operator Graph hygiene.** Temporal columns (`valid_from`, `valid_to`) on key fact tables. No orphaned records.
8. **Single RN codebase.** Homeowner + provider screens in one Expo repo, role-based screen rendering. Do not create two separate apps.
9. **Frontend polish is not optional.** The marketplace must feel premium. The check-in widget and trust score display are the two moments that make or break the demo.
10. **Stripe Connect Express only.** Do not implement custom payment flows. All money movement goes through Stripe Connect.
11. **Expo managed workflow.** Do not eject to bare workflow unless absolutely required.
12. **Reanimated 4 only.** Never use core `Animated` API.

---

## 11. Current Implementation Status (as of 2026-06-06)

### Monorepo & App Skeleton — DONE
- Turborepo monorepo at repo root with two workspaces:
  - `apps/mobile` — Expo SDK 54 managed, Expo Router 6, single codebase for homeowner + provider + tech roles
  - `apps/admin` — Next.js 14 App Router internal ops dashboard
- Design system: design tokens, base UI components (`Button`, `Input`, `Card`, `Chip`, `Pill`, `Eyebrow`, `Hero`, `Section`), NativeWind 4 wired to FRONTEND_GUIDE spec
- All 21 mobile screens scaffolded across 3 role groups + auth
- 6-step booking wizard (homeowner) + 15-second check-in widget (homeowner + provider variants) — both sacred flows built
- 8 shared components: `ProviderCard`, `TrustScoreDisplay`, `JobStatusTimeline`, `VerificationBadge`, `CheckInWidget`, `SkeletonLoader`, `BottomSheet/BottomSheetWrapper`, `EmptyState`

### Supabase Backend — DONE
- Live project: `HomeBase_MVP` (`rukpypuzfqrswiybvbkg`, us-east-2, Postgres 17.6, ACTIVE_HEALTHY)
- **21 tables, all RLS-enabled:** `profiles, addresses, homeowners, providers, provider_team, bookings, jobs, subscriptions, claims, postings, completion_ledger, demand_events, stripe_accounts, payment_methods, payments, escrow_holdbacks, payouts, routing_decisions, push_tokens, calendar_tokens, notification_log, messages`
- **11 migrations applied:** foundation_core → marketplace_and_data_hooks → advisor_fixes → payments_and_routing → notifications_and_calendar → lockdown_definer_helpers_and_fk_indexes → storage_buckets → cron_trust_score → messages → drop_public_bucket_listing → messages_from_role_user_role
- **24 Edge Functions deployed (all ACTIVE):** `providers-search`, `booking-create`, `claim-create`, `crew-invite`, `homeowner-checkin v2`, `provider-checkin v2`, `job-accept`, `job-decline`, `provider-onboard`, `route-booking`, `stripe-{onboard-provider, attach-payment-method, create-intent, capture-on-completion, instant-payout, webhook}`, `compute-trust-score`, `generate-trust-rationale`, `send-{sms, email, push}`, `register-push-token`, `calendar-connect`, `calendar-sync`
- Auth: Supabase Auth (email/password) + `profiles` table + `handle_new_user` trigger; `user_role` enum (`homeowner | provider_owner | provider_tech`)
- Storage: 4 buckets (`avatars` public, `portfolio-photos` public, `booking-photos` private, `claim-photos` private) with RLS object policies
- Realtime: `jobs` and `messages` tables on `supabase_realtime` publication
- Cron: `recompute-trust-scores-nightly` at `15 6 * * *` UTC via `pg_cron` + `pg_net`
- Security advisors: zero WARN; Performance advisors: zero unindexed-FK WARN; 10 btree indexes on hot foreign keys

### Messaging — DONE
- `messages` table with RLS (homeowner + matched provider/team only per job)
- API: `listForJob`, `send`, `markRead`, `listThreadsForHomeowner`, `listThreadsForProvider`
- Realtime subscription via `subscribeToMessages(jobId, cb)` on `messages` channel
- Homeowner + provider inbox/thread screens wired; job detail routes to thread screens

### Frontend ↔ DB Alignment — DONE
- All API call sites aligned to real schema; no references to nonexistent columns or tables
- Admin fetchers rewritten against real columns; auth via `auth.admin.listUsers()`

### SMS Integration — DONE
- `send-sms` Edge Function v2 on Telnyx (`api.telnyx.com/v2/messages`)
- All Twilio references replaced across codebase and docs

---

## 12. The 5 Remaining Code Gaps

These require no operator setup — pure code wiring. Claude can fix in-session.

| # | MVP Feature | Gap | What's Missing |
|---|---|---|---|
| 1 | MVP-3 | **AI rationale not invoked** | `generate-trust-rationale` Edge Function is deployed but never called; match screen shows hardcoded mock reasons instead of real AI-generated rationale |
| 2 | MVP-4 | **Photo uploads missing** | Zero `supabase.storage.from(...).upload(...)` calls in the entire mobile codebase; all photo fields are URL strings only |
| 3 | MVP-6 | **Calendar sync never triggered** | `calendar-sync` Edge Function deployed but never invoked from the accepted-job handler |
| 4 | MVP-8 | **Stripe capture never fires** | `captureOnCompletion(jobId)` is exported but never called — cards are authorized but never captured at check-in completion. **Critical revenue bug.** |
| 5 | MVP-5 | **Blocked-time UI missing** | `provider_blocked_times` table exists but no UI to write to it; also need to verify `route-booking` correctly joins availability + blocked times |

---

## 13. What Remains After Code Gaps (Operator-Only Setup)

Once the 5 code gaps are closed, all remaining work is operator provisioning (see `docs/ops/OPERATIONS_TODO.md`):
- Third-party account setup: Telnyx phone number + messaging profile, Resend domain verification, Stripe Connect application, Google API project, Checkr account
- Edge Function secrets in Supabase dashboard
- Supabase Auth config (OAuth providers, email templates)
- Stripe webhook registration
- `.env` file population with real keys
- Apple Developer + Google Play Console accounts
- EAS store build submission

---

## 14. Phase Roadmap

| Phase | Timeline | Focus |
|---|---|---|
| **Phase 1 — Marketplace MVP** | NOW | Austin TX beachhead (78704), 100 operators, 600 homeowners |
| **Phase 2 — Expansion** | Month 6–12 | 4 cities, 1,200 operators, V2 AI (no-show prediction, homeowner churn prediction) |
| **Phase 3 — Density + OS Beta** | Month 12–18 | 10 cities, HomeBase OS beta with 50–100 paying operators, all 6 agents operational |
| **Phase 4 — OS Commercial** | Month 18–24 | $349/mo OS live, full 8-agent stack, 6,000 operators, migration tooling for ServiceTitan/Jobber |
| **Phase 5 — Financial Products** | Year 3+ | Capital advances, embedded insurance, data licensing, cross-operator benchmarking for PE roll-ups |

---

## 15. Subagents (Defined in `.claude/agents/`)

| Agent | When to Use |
|---|---|
| `design-system` | Theme tokens, base components, monorepo + Expo Router scaffold |
| `rn-screens` | Building any of the 21 mobile screens against the design system |
| `booking-and-checkin` | 6-step booking wizard or 15-second check-in widget (sacred flows only) |
| `shared-components` | ProviderCard, TrustScoreDisplay, JobStatusTimeline, VerificationBadge, SkeletonLoader, BottomSheet, EmptyState |
| `admin-nextjs` | Anything under `apps/admin/` |
| `frontend-qa` | Read-only review pass before merging any UI changes |
| `services-researcher` | External research tasks (competitor analysis, market data) |
| `web-native` | Web-specific adaptations of the React Native codebase |

---

## 16. Competitive Context

HomeBase's three structural advantages over all incumbents:

**1. The data flywheel:** The marketplace generates verified transaction data at a rate that compounds with operator count. At 10,000 operators, HomeBase holds the largest verified home services dataset in existence. No competitor can replicate this — it requires a marketplace to generate it, and per-tenant SaaS contractually can't pool cross-operator data.

**2. The marketplace-OS dual structure:** Operators who use the marketplace are on the OS upgrade path. Operators who use the OS generate data that makes the marketplace smarter. The two layers reinforce each other — this is the moat-widening mechanism.

**3. The alignment flip:** HomeBase earns only when jobs complete. Angi and Thumbtack earn the moment a homeowner contacts a provider — regardless of whether the job ever happens. They cannot adopt completion-based revenue without destroying their P&L. Angi's Network Revenue declined 79% YoY in Q4 2025 trying to pivot away from pay-per-lead, proving the model is failing.

> For detailed competitor intelligence, see `docs/context/COMPETITORS_OVERVIEW.md` and `docs/context/competitors/` for individual deep-dives.

---

## 17. Founding Team

- **Ayman Mohammed** — Technical co-founder. Full-stack engineer. Product + engineering lead.
- **Kareem** — Non-technical co-founder. Operator relationships, sales, GTM.

Both based in Texas. Beachhead market: Austin, TX (zip code 78704 first, then broader Austin metro).

---

## 18. Glossary

| Term | Definition |
|---|---|
| **HSC** | Home Services Company — any business providing lawn, cleaning, pest, HVAC, etc. services |
| **Provider / Operator** | Interchangeable in context. "Provider" = individual on the marketplace. "Operator" = business owner using HomeBase OS |
| **Tech** | A crew member employed by an operator. Tech role = limited app access (assigned jobs + check-in only) |
| **Subscription** | A recurring booking (weekly, biweekly, monthly) for the same service at the same address |
| **One-off** | A single non-recurring booking |
| **Check-in widget** | The 15-second post-service quality capture flow completed after each job |
| **Composite trust score** | The 4-component (Reliability / Quality / Communication / Professionalism) score computed from verified check-ins |
| **Matching engine** | The algorithm that surfaces local qualified providers to a homeowner request; homeowner selects who to hire |
| **Escrow holdback** | A 24–48 hour delay on payouts to new providers (< 5 completed jobs) to protect against fraud |
| **Operator Graph** | The temporal knowledge graph storing everything known about an operator's business |
| **Trust Ladder** | The 4-rung system by which operators grant increasing autonomy to AI agents |
| **Event bus** | Redis Streams + Postgres outbox pattern propagating signals between agents |
| **Completion ledger** | The append-only log of verified completed jobs — foundation of the data flywheel |
| **T0–T5** | Data density thresholds: T2 = 50K bookings (AI dispatcher useful), T3 = 500K (vision quoting accurate), etc. |
| **Beachhead** | Austin, TX — specifically zip code 78704 and surrounding area — the first market |
| **Founding-200** | The first 200 operators on HomeBase, receiving an 8% take rate as founding-member incentive |
| **Take rate** | HomeBase's percentage cut of each transaction (10% subscription, 17.5% one-off) |
| **Wedge** | The initial product that gets operators/homeowners into HomeBase before the full OS ships |
| **Phase 4** | HomeBase OS commercial launch (~Month 18–24) |
| **Phase 5** | Financial products wave — capital advances, insurance, data licensing (Year 3+) |

---

*HomeBase · Master Context File · 2026-06-06 · Read before any build session.*

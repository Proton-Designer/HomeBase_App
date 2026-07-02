# HomeBase — Full Startup Context for Claude Code Agents

> **Purpose:** This file gives any Claude Code agent complete overhead context on what HomeBase is, why it exists, how it makes money, who uses it, what we are ultimately building, **and what is currently built vs. still pending**. Read this first before touching any code.
> **Last updated:** 2026-05-14

---

## 1. What HomeBase Is

HomeBase is an **AI-native home services platform** built on a dual-layer architecture:

- **Layer 1 — Consumer Marketplace**: connects homeowners with vetted home service providers (lawn care, house cleaning, pest control, etc.) for subscription and one-off bookings
- **Layer 2 — HomeBase OS**: an AI operating system sold to home service companies (HSCs) that runs their entire business — scheduling, quoting, cash flow, reputation, and crew management — as a unified intelligence layer

The marketplace is the **wedge and the data source**. HomeBase OS is the **long-term margin engine**.

The analogy that drives every product and architecture decision: **HomeBase marketplace is to HomeBase OS what Amazon retail is to AWS.** The marketplace generates data, distribution, and trust at scale. The OS compounds on that data to deliver capabilities no standalone B2B tool can replicate.

---

## 2. The Problem HomeBase Solves

### For homeowners:
The current home services market is broken by lead-spam platforms. Angi, Thumbtack, and HomeAdvisor sell the same homeowner's contact info to 3–8 contractors simultaneously. The contractor who calls fastest wins the job — not the best one. The result:
- **41% of homeowners report being deceived** by service providers (Leaf Home / Morning Consult 2025)
- **No verified quality data** — star ratings are gameable and unverified
- **No accountability** — damage guarantees exist only in fine print (TaskRabbit Happiness Pledge denials, NBC LA 2024; Thumbtack guarantee collapses, Trustpilot 2025)
- **No subscriptions** — managing recurring home services requires re-booking every time

### For home service operators:
Running a home services business is operationally brutal. A 10-person lawn care company spends:
- **3+ hours/day on admin**: scheduling, quoting, chasing payments, answering calls, managing reviews
- **$500–$2,000/month on lead-gen** (Angi, Thumbtack, Google LSA) with a **return of ~15 cents per dollar spent** (R1 primary research)
- The best software (ServiceTitan at $300+/mo, Jobber at $49–249/mo) is built for larger companies and doesn't solve the demand problem — it only organizes it

The "missing middle" — home service businesses with 1–20 employees — has no product designed for them. They're too small for ServiceTitan and too real for TaskRabbit.

---

## 3. The HomeBase Solution

### Marketplace differentiators (vs. Angi / Thumbtack / TaskRabbit / Handy):

| What HomeBase does | What incumbents do |
|---|---|
| **No lead-resale**: one inquiry → one provider routed | Sell same lead to 3–8 contractors simultaneously |
| **Subscription-first**: recurring weekly/biweekly/monthly | Transactional only — every booking is a new transaction |
| **Earns on completion** (10% take) | Earns on the inquiry (pay-per-lead or lead pack) |
| **15-second check-in widget**: verified post-service quality capture | Star ratings only, easily gamed |
| **Composite trust score** from verified jobs | Unverified reviews from anyone |
| **Instant same-day payouts** via Stripe Instant | Up to 12 business days (TaskRabbit) |
| **Real damage protection**: escrow + binding SLA | Fine-print disclaimers |
| **Crew/team accounts**: small business → not just solo gigs | Solo 1099 gig model only |
| **Masked contacts** until job confirmed | Phone numbers sold immediately |

### HomeBase OS differentiators (vs. ServiceTitan / Jobber / Housecall Pro):

| What HomeBase OS has | What incumbents have |
|---|---|
| **Cross-operator AI** trained on all marketplace transactions | Per-tenant data only (contractually siloed) |
| **Marketplace as built-in demand engine** | No demand generation |
| **Verified job data** (check-in confirmed) | Self-reported data |
| **Property Encounter Graph** — temporal record of every job at every address | Static customer records |
| **8 AI agents sharing one brain** | Feature modules, no AI orchestration |
| **Trust Ladder** — graduated operator autonomy | No autonomy concept |

---

## 4. The Two Users

### Homeowner
- Owns or rents a home, needs recurring or one-time home services
- Primary services at MVP: **lawn care** and **house cleaning** (highest recurring demand, lowest trust variance)
- Pain: can't find reliable providers, gets spammed by lead-gen platforms, no subscription option, no quality accountability
- What they want: book once, have it recur, trust it will get done right, know someone has their back if something goes wrong

### Home Service Operator / Provider
There are two personas:

**Persona O1 — The Solo Provider** (1-2 people, $50K–$200K revenue)
- Typically on Angi/Thumbtack/TaskRabbit already
- Paying $500–$2K/month for leads that mostly don't convert
- Manages schedule via phone/text/Google Calendar
- Gets paid 7–30 days after job completion
- Primary pitch: replace lead-gen spend with HomeBase's completion-based take rate

**Persona O2 — The Small Operator** (3–20 employees, $200K–$2M revenue)
- Has crew, needs dispatch/scheduling tools
- May already use Jobber or Housecall Pro
- Spending $49–$300+/month on FSM software that doesn't solve demand
- Primary pitch: marketplace demand + HomeBase OS replacing both their lead-gen spend AND their FSM subscription

**Tech role** — crew member at an operator's company. Simplified app access: sees assigned jobs, marks status, submits check-in. No business admin access.

---

## 5. Revenue Model

HomeBase has five revenue lines that stack across phases:

### L1 — Marketplace subscription take rate (Day 1)
**10%** of every subscription booking (weekly/biweekly/monthly recurring jobs). Lower rate incentivizes subscriptions over one-off.

### L2 — Marketplace one-off take rate (Day 1)
**17.5%** of every one-off booking. Higher rate reflects the single-transaction nature and higher matching cost.

### L3 — HomeBase OS subscription (Phase 4)
**$349/month flat** per operator. Pure B2B SaaS with no usage ceiling. Covers all 6 AI agents, integrations, and the full cockpit. No per-seat pricing.

### L4 — Featured placement + verification bundle (Day 1)
**$29/month** for operators: verified badge on profile + featured placement in search results. Homeowners can pay **$5.99/month** for a premium tier with priority matching and service guarantees.

### L5 — Phase 5 financial products
- **Capital advances**: revenue-based advances at 6–8% fees on operator job volume, underwritten using HomeBase's verified job + payment data
- **Insurance**: policies priced using HomeBase's proprietary quality and dispute data (MGA partnership)
- **Data licensing**: anonymized industry data sold to insurers, PE roll-up funds, national franchises at $50–250K/seat

### Revenue trajectory:
| Year | Cities | Operators | GMV | Revenue | Notes |
|------|--------|-----------|-----|---------|-------|
| Year 1 | 1 (Austin) | 100 | — | $80K | Beachhead, marketplace only |
| Year 2 | 4 | 1,200 | — | $1.75M | OS launches, break-even Q2 |
| Year 3 | 10 | 6,000 | $92M | $15.5M | 76% blended CM |

**Path to $1B+:** At 20,000 operators, OS alone = $84M ARR. Add marketplace take on $500M+ GMV and the base revenue clears $140M+. Phase 5 financial products layer on top at near-100% margins.

---

## 6. The Data Flywheel (The Moat)

This is the most important strategic concept in HomeBase. Every other decision traces back to it.

**What the marketplace generates that no incumbent has:**
1. **Verified completion ledger** — every job that was actually completed, what it cost, what quality it was, who did it. Not self-reported. Check-in verified.
2. **Composite trust score history** — 4-component time-series scores per provider, computed from verified check-ins
3. **Cross-operator pricing distribution** — what real providers in each zip code charge for each service type, from actual transactions
4. **Dispute outcomes corpus** — what kinds of jobs generate claims, which providers have issues, resolved by independent ops
5. **Demand patterns by zip × category × season × day-part** — where and when homeowners are looking for services
6. **Property Encounter Graph** — temporal record of what was done at each address, by whom, with what quality outcome

**Why incumbents can't replicate this:**
ServiceTitan, Jobber, and Housecall Pro are per-tenant SaaS. Their per-tenant MSAs contractually prohibit using one operator's data to improve another operator's product. They cannot pool cross-operator data even if they wanted to. HomeBase is a marketplace first — the pooled data is a structural feature, not an add-on.

**The compounding timeline:**
- At **100 operators**: useful for trust scoring and basic routing
- At **1,000 operators**: AI dispatcher converges (no-show prediction crosses AUC 0.80)
- At **5,000 operators**: pricing distribution defensible per zip × service × scope
- At **10,000 operators**: insurance underwriting, capital advance default-rate calibration, data licensing viable

---

## 7. The HomeBase OS — What It Actually Is

HomeBase OS is **not a bundle of AI features**. It is a unified intelligence layer that runs the operator's entire business, with 8 AI agents sharing one brain (the Operator Graph).

### The 8 Agents:

| Agent | What it does |
|-------|-------------|
| **Conductor** | Orchestrates all other agents, handles operator voice/chat, builds the "Today Queue" of prioritized actions |
| **Quote Agent** | Auto-prices jobs from address data + marketplace zip benchmarks + operator pricebook |
| **Dispatch Agent** | Predicts no-shows, optimizes crew routing, re-balances routes in real time |
| **Cash Flow Agent** | Monitors receivables, forecasts 30/60/90-day revenue, triggers same-day payouts, underwrites capital advances |
| **Reputation Agent** | Monitors reviews across Google/Yelp/Facebook, drafts responses in operator tone, syndicates verified reviews |
| **Crew Intelligence Agent** | Tracks performance, predicts burnout, surfaces hiring candidates from marketplace gig pool |
| **Customer Intelligence Agent** | Scores churn risk, identifies upsell moments, personalizes communication timing |
| **Relations Agent** | Manages customer relationships, drafts outreach, tracks interaction history |

### The Operator Graph:
A temporal knowledge graph (built on the Graphiti/Zep pattern) that stores everything HomeBase knows about an operator's business: customers, jobs, crew, payments, reviews, disputes, properties — all versioned over time. This is the "memory" that makes agents smarter the longer an operator uses HomeBase.

### The Trust Ladder:
How operators grant increasing autonomy to agents. At MVP, everything is **Rung 1** (suggest + approve). As operators build trust, agents can graduate:
- **Rung 0**: Observe (agents show data, make no suggestions)
- **Rung 1**: Suggest (agent suggests action, operator approves) ← MVP default
- **Rung 2**: Auto-reversible (agent executes + notifies, operator can undo in window)
- **Rung 3**: Autonomous (agent executes, logs to audit trail)

### The Event Bus:
Redis Streams + Postgres outbox pattern. A signal in one agent propagates to others: a crew member flagged for quality issues by the Crew Intelligence Agent → the Dispatch Agent avoids assigning them to a high-LTV customer this week. This cross-agent signal propagation is what makes the OS multiplicative, not just additive.

---

## 8. Competitive Landscape

### Consumer marketplace competitors:

| Competitor | Model | Weakness HomeBase Exploits |
|---|---|---|
| **Angi** (HomeAdvisor) | Pay-per-lead, sells to 3–8 contractors | FTC settlement ($7.2M, 2023), lead spam, provider exodus |
| **Thumbtack** | Pay-per-lead / quote credits | Same lead-resale problem, provider NPS terrible |
| **TaskRabbit** | Solo Taskers, 15-30% fee | No crew/team support, 12-day payout lag, no subscriptions |
| **Handy** | W2 cleaners, urban only | Geography-limited, no lawn, no real marketplace dynamics |
| **Lawn Love** | Lawn-only marketplace | Single vertical, no subscription mechanic, no check-in quality data |

**Structural moat vs. all consumer platforms:** HomeBase earns on completion, not inquiry. This alignment is **literally incompatible** with Angi/Thumbtack's revenue model — they cannot adopt it without destroying their own margins.

### B2B FSM (Field Service Management) competitors:

| Competitor | Pricing | Weakness HomeBase Exploits |
|---|---|---|
| **ServiceTitan** | $300-500/mo + per-tech | Built for $3M+ companies, overkill for small ops, no marketplace |
| **Jobber** | $49-249/mo | No AI, no demand generation, no cross-operator data |
| **Housecall Pro** | $49+/mo | Same as Jobber, visual refresh only |
| **FieldEdge** | $100+/mo | Even more legacy, HVAC-focused |
| **Yardbook** | Free / $50/mo | No AI, no demand, used by 1-person shops |

**The ceiling no incumbent can break:** They are per-tenant SaaS. They cannot pool cross-operator data (contractual) and they have no marketplace (no demand engine). HomeBase is structurally positioned to outperform all of them on the features that matter most to small operators, while costing the same or less.

---

## 9. Phase Roadmap

### Phase 1 — Marketplace MVP (NOW)
- Austin, TX beachhead (78704 zip code first)
- 11 marketplace features (see MVP subfolder for full spec)
- 100 operators, 600 homeowners
- Prove: operators switch from Angi/Thumbtack, homeowners book subscriptions, check-in data quality is real

### Phase 2 — Marketplace Expansion (Month 6–12)
- 4 cities (Austin + 3 adjacent markets)
- V2 AI features unlock (no-show prediction, homeowner churn prediction)
- 1,200 operators, 12,000 homeowners

### Phase 3 — Density + OS Beta (Month 12–18)
- 10 cities
- HomeBase OS beta with first 50–100 paying operators
- All 6 agents operational (V1 capability)
- $15.5M ARR target by end of Year 3

### Phase 4 — HomeBase OS Commercial Launch (Month 18–24)
- $349/month OS subscription live
- Full agent stack: Conductor (voice), Quote Agent (vision-based), Dispatch (AI no-show prediction), Cash Flow, Reputation, Crew Intelligence
- 6,000 operators across 10 cities
- Migration tooling for ServiceTitan/Jobber/HCP operators

### Phase 5 — Financial Products (Year 3+)
- MRR-backed capital advances
- Embedded insurance (MGA partnership)
- Data licensing product
- Cross-operator benchmarking sold to PE roll-up funds

---

## 10. Tech Stack

### Marketplace (Phase 1 MVP):
- **Mobile**: React Native (Expo) — homeowner app + provider app (same codebase, role-based screens)
- **Web**: Next.js 14 (App Router) — ops/admin dashboard
- **Database**: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
- **Payments**: Stripe Connect Express
- **AI**: Anthropic Claude API — Haiku (`claude-haiku-4-5-20251001`) for check-in grading + trust score generation
- **Calendar**: Google Calendar API
- **Maps**: Google Maps Platform (geocoding + Distance Matrix)
- **SMS**: Telnyx (Programmable Messaging v2)
- **Email**: Resend
- **Push**: Expo Push Notifications

### HomeBase OS (Phase 4):
- **Cockpit**: Next.js 14 web dashboard (operator-facing SaaS)
- **Agent orchestration**: LangGraph (Python) — multi-agent state machines with Postgres checkpointing
- **LLM routing**: Anthropic Claude Sonnet for Conductor + agent reasoning; Haiku for classification/drafting
- **Memory**: Zep/Graphiti pattern for Operator Graph — temporal knowledge graph per operator
- **Event bus**: Redis Streams (Upstash) + Postgres outbox pattern
- **Voice** (Phase 4): Vapi or Retell AI → Telnyx voice infrastructure
- **Integrations**: Stripe Connect, QuickBooks Online, Google Calendar, Google Business Profile, Plaid, OR-Tools (VRP), Checkr (KYC)
- **Observability**: LangSmith (agent tracing) + Sentry + PostHog

### Why this stack:
- Supabase gives RLS out of the box — critical for multi-tenant data isolation
- LangGraph is the production standard for stateful multi-agent systems (2025 maturity)
- All model inference is API-accessed — no model training or ML infrastructure required at MVP
- Per-token economics (Claude Haiku at $1/$5 per million tokens) make per-operator costs cents, not dollars

---

## 11. The YC Application Context

HomeBase applied to YC Summer 2026. The application is in `/YC/YC_final_application.md`. Key framing:

**One-liner (50 chars):** "AI operating system for home services operators."

**Core thesis for YC:**
- Maps to YC S26 RFS Theme #15 (AI Operating System for Companies) and Theme #11 (SaaS Challengers)
- The marketplace-as-flywheel structure is the Amazon→AWS pattern applied to home services
- The data moat (cross-operator verified transaction data) cannot be replicated by incumbents due to contractual + architectural barriers
- The "why now": multi-agent frameworks, voice AI, frontier vision models, and embedded fintech infrastructure all crossed production-readiness in 2025 — this product is only buildable today

**The $1B path:**
1. 20,000 operators × $349/mo OS = $84M ARR
2. Marketplace take on $500M+ GMV = ~$60M
3. Capital advances (6-8% fees) = ~$35M
4. Data licensing = ~$15M
5. Total: ~$194M revenue → $1B+ valuation at 10x multiple

---

## 12. Founding Team

- **Ayman Mohammed** — Technical co-founder. Full-stack engineer. Leads product and engineering.
- **Kareem** — Non-technical co-founder. Operator relationships, sales, GTM.

Both based in Texas. Austin, TX is the beachhead market for good reason — it's one of the fastest-growing metros in the US with high density of home service demand and a fragmented provider market.

---

## 13. What Makes This Venture-Scale

Three things compound into a structural moat:

**1. The data flywheel:** The marketplace generates verified transaction data at a rate that compounds with operator count. At 10,000 operators, HomeBase holds the largest verified home services dataset in existence — pricing, quality, disputes, demand patterns. No competitor can access this because it requires a marketplace to generate it.

**2. The marketplace-OS dual structure:** Operators who use the marketplace are captured into the OS upgrade path. Operators who use the OS generate data that makes the marketplace smarter. The two layers reinforce each other. This is the architecture that makes the moat widening, not just deep.

**3. The alignment flip:** HomeBase earns only when jobs complete. This is structurally incompatible with Angi/Thumbtack's lead-resale model. They cannot copy it without destroying their own P&L. HomeBase's competitive position strengthens as incumbents deteriorate — Angi's Network Revenue declined 79% YoY in Q4 2025 as they tried to pivot away from lead-resale, proving the model is failing without having an answer.

---

## 14. Key Product Principles (Non-Negotiable for Claude Code)

These are the principles that must be respected in every implementation decision:

1. **No lead-resale, ever.** A homeowner inquiry routes to one provider. One. This is the structural commitment that makes HomeBase trustworthy. Do not build any mechanism that allows a lead to go to multiple providers simultaneously.

2. **Earn on completion, not inquiry.** Revenue hooks must tie to verified job completion (check-in submitted + payment captured), not to clicks, impressions, or contact exchanges.

3. **The check-in widget is sacred.** It is the primary data-generation mechanism and the core trust-building interaction. It must be fast (15 seconds), delightful, and always work. Never simplify it out of existence.

4. **Data hooks are non-negotiable.** Even at MVP, every completed booking writes to `completion_ledger`, every search writes to `demand_events`. These feed Phase 4 AI. Skipping them delays the entire roadmap.

5. **Trust Ladder at Rung 1 at MVP.** No autonomous agent actions at MVP. Everything requires operator approval. Build the audit trail from Day 1.

6. **Frontend polish is not optional.** The marketplace must feel premium (Fiverr/Upwork quality flow + HomeBase's own distinct aesthetic). The OS cockpit must feel like a real professional SaaS product (Linear/Vercel quality). The check-in widget and trust score display are the two moments that make or break the demo.

7. **RLS on everything.** No row in any table should be accessible by the wrong user role. Multi-tenant security is not retrofittable — build it right from the schema layer.

8. **The Operator Graph is the brain.** Every data point stored must be designed to feed the Operator Graph over time. This means temporal columns (`valid_from`, `valid_to`) on key fact tables, proper entity relationships, and no orphaned records.

---

## 15. Glossary

| Term | Definition |
|------|-----------|
| **HSC** | Home Services Company — any business providing lawn, cleaning, pest, HVAC, etc. services |
| **Provider / Operator** | Interchangeable in context. "Provider" = individual on the marketplace. "Operator" = business owner using HomeBase OS |
| **Tech** | A crew member employed by an operator. Tech role = limited app access (assigned jobs + check-in only) |
| **Subscription** | A recurring booking (weekly, biweekly, monthly) for the same service at the same address |
| **One-off** | A single non-recurring booking |
| **Check-in widget** | The 15-second post-service quality capture flow that homeowners complete after each job |
| **Composite trust score** | The 4-component (Reliability/Quality/Communication/Professionalism) score computed from verified check-ins |
| **Routing engine** | The algorithm that matches a homeowner booking to exactly one provider |
| **Escrow holdback** | A 24-48 hour delay on payouts to new providers (< 5 completed jobs) to protect against fraud |
| **Operator Graph** | The temporal knowledge graph that stores everything known about an operator's business |
| **Trust Ladder** | The 4-rung system by which operators grant increasing autonomy to AI agents |
| **Event bus** | Redis Streams + outbox pattern that propagates signals between agents |
| **Completion ledger** | The append-only log of verified completed jobs — the foundation of the data flywheel |
| **T0–T5** | Data density thresholds: T2 = 50K bookings (AI dispatcher useful), T3 = 500K (vision quoting accurate), etc. |
| **Beachhead** | Austin, TX — specifically zip code 78704 and surrounding area — the first market |
| **Founding-200** | The first 200 operators on HomeBase receive an 8% take rate (vs. 10/17.5% standard) as founding-member incentive |
| **Take rate** | HomeBase's percentage cut of each transaction (10% subscription, 17.5% one-off) |
| **Wedge** | The initial product feature or market segment that gets operators/homeowners into HomeBase before the full OS ships |
| **Phase 4** | The HomeBase OS commercial launch wave (~Month 18–24) |
| **Phase 5** | Financial products wave — capital advances, insurance, data licensing (Year 3+) |

---

## 16. Current Implementation Status (as of 2026-05-14)

This section tracks what is actually built in the repo vs. what still needs operator action. **Companion file:** `OPERATIONS_TODO.md` (sibling of this file) lists every API key, third-party account, dashboard config step, and store-listing task that must be completed before public launch.

> **⚠️ SNAPSHOT SUPERSEDED (updated 2026-07-02).** The subsections below are the 2026-05-14 state and are now stale — trust the current code and the recent ops docs over this snapshot:
> - **Supabase project changed.** §16.2's project `rukpypuzfqrswiybvbkg` was deleted and rebuilt on 2026-06-17 as **`zkkingzdbbbriwyxbxkf`** (schema restored from a code audit; ~18 edge functions live, now mirrored in `docs/ops/edge-functions/`). Repo paths also moved from `Marketplace_MVP/app/` to the repo root (`apps/mobile`, `apps/admin`).
> - **The "5 wiring gaps" in §16.7 are largely resolved.** Confirmed wired since: **Stripe capture** (gap 4 — `captureOnCompletion` is now called from both check-in widgets; `net_cents` accuracy fixed 2026-07-01) and **photo storage** (gap 2 — `uploadAsset()` writes to Storage buckets from the check-in and verification flows). Re-verify the AI-rationale, calendar-sync-invocation, and blocked-time-UI items against current code.
> - **Two months of hardening since.** See `docs/ops/BUG_INVESTIGATION_2026-06-27.md`, `docs/ops/MESSAGING_NOTES.md`, and the `docs/ops/CTO_NIGHT*` docs: a ~66-bug audit + fixes, provider-onboarding rework, a render-loop sweep, auth hardening (bounded await-timeouts + `processLock` + offline-purge fix), a messaging reliability layer, and a service-catalog / job-mapper consolidation.

### 16.1 Monorepo & app skeletons — **DONE**
- Turborepo monorepo at `Marketplace_MVP/app/` with two workspaces:
  - `apps/mobile` — Expo SDK 54 (managed workflow) + Expo Router 6, single codebase for homeowner + provider + tech roles
  - `apps/admin` — Next.js 14 App Router admin dashboard (internal ops only)
- Design system (`tokens/`, base `components/ui/`, NativeWind 4 config) wired to FRONTEND_GUIDE spec
- All 21 mobile screens scaffolded (homeowner browse/book/jobs/inbox/profile; provider onboarding/dashboard/schedule/earnings/profile; tech today; auth)
- The two sacred flows are built: 6-step booking wizard (homeowner) + 15-second check-in widget (both homeowner post-service and provider at-job variants)
- 8 shared components (ProviderCard, TrustScoreDisplay, JobStatusTimeline, VerificationBadge, SkeletonLoader, BottomSheet, EmptyState, plus check-in components)
- Web build of the same RN codebase via Expo Router web target

### 16.2 Supabase backend — **DONE**
Live project: `HomeBase_MVP` (`rukpypuzfqrswiybvbkg`, us-east-2, ACTIVE_HEALTHY, Postgres 17.6).

- **21 tables, all RLS-enabled:** `profiles, addresses, homeowners, providers, provider_team, bookings, jobs, subscriptions, claims, postings, completion_ledger, demand_events, stripe_accounts, payment_methods, payments, escrow_holdbacks, payouts, routing_decisions, push_tokens, calendar_tokens, notification_log, messages`
- **11 migrations applied:** foundation_core → marketplace_and_data_hooks → advisor_fixes → payments_and_routing → notifications_and_calendar → lockdown_definer_helpers_and_fk_indexes → storage_buckets → cron_trust_score → messages → drop_public_bucket_listing → messages_from_role_user_role
- **24 Edge Functions deployed (all ACTIVE):** `providers-search`, `booking-create`, `claim-create`, `crew-invite`, `homeowner-checkin v2`, `provider-checkin v2`, `job-accept`, `job-decline`, `provider-onboard`, `route-booking`, `stripe-{onboard-provider, attach-payment-method, create-intent, capture-on-completion, instant-payout, webhook}`, `compute-trust-score`, `generate-trust-rationale`, `send-{sms, email, push}` (send-sms v2 wired to Telnyx), `register-push-token`, `calendar-connect`, `calendar-sync`
- **Auth:** Supabase Auth (email/password) + `profiles` table + `handle_new_user` trigger; `user_role` enum (`homeowner | provider_owner | provider_tech`) drives role-aware sign-up
- **Storage:** 4 buckets created (`avatars` public, `portfolio-photos` public, `booking-photos` private, `claim-photos` private) with RLS object policies
- **Realtime:** `jobs` and `messages` tables on the `supabase_realtime` publication
- **Cron:** `recompute-trust-scores-nightly` scheduled at `15 6 * * *` UTC via `pg_cron` + `pg_net` (active=true)
- **Security advisors:** zero WARN — three SECURITY DEFINER RLS helpers (`rls_auto_enable`, `is_provider_owner`, `is_provider_team_member`) have EXECUTE revoked from anon/authenticated; broad SELECT policies on public buckets dropped
- **Performance advisors:** zero unindexed-FK WARN — 10 btree indexes added on hot foreign keys

### 16.3 End-to-end messaging — **DONE**
- `messages` table (id, job_id, from_user_id, from_role::user_role, body, sent_at, read_at) with RLS so only the homeowner + matched provider/team can SELECT/INSERT for a given job
- `apps/mobile/lib/api/messages.ts` exposes `listForJob`, `send`, `markRead`, `listThreadsForHomeowner`, `listThreadsForProvider`
- Realtime subscription via `subscribeToMessages(jobId, cb)` on the `messages` postgres_changes channel
- Homeowner inbox + thread screen and provider inbox + thread screen wired
- Job detail "Message provider" button routes to `/(homeowner)/thread/${jobId}`
- Provider job card "Message homeowner →" affordance + provider profile "Messages" row both route to the provider inbox

### 16.4 Frontend ↔ DB alignment — **DONE**
Every previously-broken API call site has been aligned to the real schema:
- `lib/api/bookings.ts` — `listForHomeowner` joins inline `composite_score_*` + `display_name` (no nonexistent `provider_scores` table)
- `lib/api/jobs.ts` — `listForProvider` joins `profiles!jobs_homeowner_id_fkey` + `bookings(addresses(...))` instead of nonexistent `homeowners(first_name, ...)`
- `lib/api/providers.ts` — column names renamed to `*_cents`, mapper converts to dollars at the boundary
- `lib/api/realtime.ts` — `IncomingMessage` type + payload mapping aligned to the real `messages` column names
- Admin `apps/admin/lib/actions.ts` — all 5 fetchers (`fetchProviders`, `fetchJobs`, `fetchClaims`, `fetchTrustScores`, `fetchUsers`) rewritten against real columns; `fetchUsers` reads `last_sign_in_at` via `auth.admin.listUsers()`
- Admin client components updated (ProvidersClient, ClaimsClient, TrustScoresClient, UsersClient, JobsClient) — dropped UI fields that depended on nonexistent columns; pickup is via `verification_tier`, `incident_type`, rolled-up `composite_score_*`

### 16.5 Telnyx integration — **DONE (code)**
- `send-sms` Edge Function v2 deployed, posting to `https://api.telnyx.com/v2/messages` with `Bearer ${TELNYX_API_KEY}` and JSON body `{from, to, text, messaging_profile_id}`
- Caller contract `{to, body}` unchanged — booking confirmations, en-route alerts, check-in reminders all flow through the same Edge Function
- All Twilio references replaced across `BACKEND_GUIDE.md`, `BACKEND_ENV.md`, `MVP_OVERVIEW.md` (and this file)

### 16.6 Documentation — **DONE**
- `CLAUDE.md` (root) — non-negotiables, stack, subagent registry
- `MVP_HB_context copy.md` — this file
- `Marketplace_MVP/MVP_OVERVIEW.md`
- `Marketplace_MVP/PHASES.md`
- `Marketplace_MVP/Frontend_and_Basic_Backend/FRONTEND_GUIDE.md`
- `Marketplace_MVP/Full_Backend_Implementation/BACKEND_GUIDE.md`
- `Marketplace_MVP/Full_Backend_Implementation/BACKEND_ENV.md` — operator secret setup checklist

### 16.7 What is NOT yet built (handled in `OPERATIONS_TODO.md`)

A multi-agent cross-reference (2026-05-14) against `MVP_OVERVIEW.md`'s 11 MVP features confirmed the codebase is **structurally complete** — all 21 mobile screens, all 5 admin sections, all 11 MVP features, all 8 non-negotiables (the 9th, Operator Graph temporal columns, is intentionally Phase-4-deferred). However, **5 code-level wiring gaps remain** that don't need any operator action — Claude can fix them in-session:

1. **MVP-3 AI rationale** — `generate-trust-rationale` Edge Function deployed but never invoked; match screen uses hardcoded mock reasons.
2. **MVP-4 photo storage** — zero `supabase.storage.from(...).upload(...)` calls in the entire mobile codebase; all photos are URL strings.
3. **MVP-6 calendar sync** — `calendar-sync` Edge Function never invoked from accepted-job handler.
4. **MVP-8 Stripe capture** — `captureOnCompletion(jobId)` exported but never called; cards never actually captured at check-in (critical revenue bug).
5. **MVP-5 blocked-time UI + routing verification** — `provider_blocked_times` table exists but no UI to write to it; need to verify `route-booking` joins availability + blocked times.

The remaining work — once those 5 code gaps are fixed — is purely **operator setup**: provisioning third-party accounts, setting Edge Function secrets, configuring Supabase Auth in the dashboard, registering Stripe webhooks, populating `.env` files with real keys, registering Apple/Google developer accounts, and submitting store builds via EAS. See `OPERATIONS_TODO.md` § 7 for the code-level gaps and §§ 1–10 for the operator-only checklist.

---

*HomeBase · MVP Context File · 2026-05-14 · For Claude Code agents — read this before any build session.*

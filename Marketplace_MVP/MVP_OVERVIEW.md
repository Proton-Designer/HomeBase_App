# HomeBase — Marketplace MVP Overview

> **Claude Code context file.** This document orients Claude Code to the full scope, architecture, and intent of the Marketplace MVP. Read this before touching any code in this directory.

---

## What This Is

The **HomeBase Marketplace MVP** is the initial wedge product — a consumer-facing home services marketplace that connects homeowners with vetted, trusted local service providers. It is the product that proves the core hypothesis before the B2B "HomeBase OS" layer is introduced.

This folder contains everything needed to build the Marketplace MVP from scratch: frontend specs, backend specs, API contracts, data models, and implementation guidance.

---

## The Wedge Hypothesis

HomeBase wins by being fundamentally different from Angi, Thumbtack, and TaskRabbit — not incrementally better. The MVP must prove all five of these simultaneously:

| Hypothesis | How It Is Proven in the MVP |
|---|---|
| Homeowners prefer single-routed booking over lead spam | Booking flow routes to exactly one provider; homeowner never sees a lead-auction mechanic |
| Subscription bookings drive retention | Subscription plan selection is a first-class booking path (MVP-1) |
| Verifiable trust data beats star ratings | 15-second post-service check-in (MVP-4) powers composite trust score (MVP-3) that is prominent on every provider card |
| Instant payouts attract better providers | Same-day Stripe Instant payout after job completion (MVP-7) |
| Damage protection converts fence-sitters | Binding SLA + escrow holdback visible to homeowners before booking (MVP-8, MVP-9) |

The MVP is not feature-complete. It is hypothesis-complete. Every feature is included because it tests something that cannot be learned without it. Features that are "nice to have" but don't test the wedge are excluded.

---

## What This Is NOT

Do not build any of the following in the Marketplace MVP:

- **HomeBase OS** — the B2B SaaS operating system for home services companies (separate product, separate codebase, Phase 2+)
- **Scheduling optimization AI** — advanced route optimization, multi-crew dispatch, workforce analytics
- **Third-party integrations beyond the MVP stack** — no QuickBooks sync, no CRM integrations, no Zapier hooks
- **Provider marketplace features beyond lawn + cleaning** — pest control, HVAC, plumbing, etc. are "coming soon" placeholders only
- **In-app marketing tools** — no provider ad campaigns, no promoted placement bidding
- **Phase 4+ features** — loyalty programs, referral systems, multi-location franchise tools, enterprise contracts
- **iOS/Android native modules** — the entire mobile app is React Native (Expo managed workflow) only

---

## The 11 MVP Features (Exact Scope)

These are the only features in scope. No more, no less.

| ID | Feature | Core Purpose |
|---|---|---|
| MVP-1 | Subscription plans (weekly/biweekly/monthly) for lawn + cleaning | Prove recurring revenue model; 10% take rate |
| MVP-2 | Single-routed booking (no lead resale) | Core differentiation from Angi/Thumbtack; one inquiry → one provider |
| MVP-3 | Composite trust score (4 components + AI "why this score") | Differentiate from star ratings; make trust legible and verifiable |
| MVP-4 | 15-second post-service check-in widget | Primary data capture mechanism; feeds trust score |
| MVP-5 | Schedule-as-source-of-truth | Provider availability/service area drives routing; no ghost jobs |
| MVP-6 | Two-way calendar sync (Google Calendar primary) | Reduce provider no-shows; increase scheduling trust |
| MVP-7 | Instant payouts via Stripe Instant | Attract quality providers away from platforms with slow payout cycles |
| MVP-8 | Card-on-file + escrow holdback | Enable recurring billing; protect homeowners from new providers |
| MVP-9 | Damage protection / claim flow | Remove the #1 homeowner fear; create real accountability |
| MVP-10 | Crew/team accounts (Owner + Tech roles) | Enable small businesses, not just solo operators |
| MVP-11 | Verification Tier 1 (background-checked) + Tier 2 (insured) | Trust infrastructure; foundation for the composite score |

---

## The Two User Types

### Homeowner

A homeowner is a residential property owner or renter who needs recurring or one-off home services.

**Primary jobs to be done:**
- Find a trusted, vetted provider for lawn care or cleaning
- Book a recurring subscription (set it and forget it)
- Book a one-off job with confidence
- Track job status in real time
- Rate the service quality via the 15-second check-in
- File a damage claim if something goes wrong
- Manage active subscriptions (pause, cancel, change frequency)

**Key fears to address in the UI:**
- "Will this stranger damage my property?" → Verification badges, trust score, damage protection prominently displayed
- "Am I getting spammed by 5 different contractors?" → Single-routed booking, no lead resale
- "What if they don't show up?" → Provider reliability score, schedule-as-source-of-truth, SMS reminders

### Provider / Operator

A provider is a small business owner (typically 1–10 employees) running a lawn care or cleaning company.

**Primary jobs to be done:**
- Get jobs routed to them without buying leads
- Set availability and service area so they only receive fitting jobs
- Accept/decline jobs within a time window
- Check in at job completion to capture quality data
- Get paid same day
- Manage crew members (Owner assigns jobs to Techs)
- Build trust score over time to attract better clients

**Roles within a provider account:**
- **Owner**: full admin access — onboarding, schedule, earnings, crew management, verification, banking
- **Tech**: limited access — see assigned jobs for today, complete check-in, view own earnings summary. Cannot access schedule management, crew management, or banking.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile app | React Native (Expo, managed workflow) | Single codebase for both homeowner and provider apps; role-based screen rendering |
| Web admin | Next.js 14 (App Router) | Internal HomeBase ops dashboard only; not customer-facing |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) | Primary database, auth, file storage, real-time subscriptions |
| API layer | Supabase Edge Functions + Next.js API routes | Edge Functions for business logic; Next.js routes for Stripe webhooks |
| Payments | Stripe Connect Express | Marketplace payouts; Stripe Instant for same-day payouts |
| AI | Anthropic Claude API (claude-haiku-4 for speed + cost) | Post-service check-in photo grading; trust score "why this score" 1-liner generation |
| Calendar | Google Calendar API | Two-way sync for provider availability (Nylas optional abstraction) |
| Maps | Google Maps Platform | Geocoding, service area calculation, routing |
| SMS | Telnyx | Booking confirmations, provider en-route alerts, check-in reminders |
| Email | Resend (preferred) or SendGrid | Transactional email |
| Push notifications | Expo Push Notifications | Job alerts, booking updates, payout confirmations |

### Architecture Pattern

```
React Native App (Expo)
    ↓ REST + Realtime
Supabase (Auth + Postgres + Storage + Realtime)
    ↓ Edge Functions
Business Logic Layer (routing, scoring, escrow)
    ↓
Stripe Connect Express    Claude API (Haiku)    Google Calendar API    Telnyx
```

Supabase Realtime is used for live job status updates (provider en route, job started, job completed) — these fire push notifications AND update the homeowner's job status screen in real time.

---

## Folder Structure

```
Marketplace_MVP/
├── MVP_OVERVIEW.md                          ← You are here
│
├── Frontend_and_Basic_Backend/
│   └── FRONTEND_GUIDE.md                   ← Complete guide for UI + basic API wiring
│                                              Start here when building
│
└── Full_Backend_Implementation/
    └── BACKEND_GUIDE.md                    ← Complete guide for schema, business logic,
                                               payments, AI scoring, routing engine
```

### Build Order

1. **Start with `Frontend_and_Basic_Backend/FRONTEND_GUIDE.md`** — build the full UI with mocked/stubbed API calls. This lets you validate UX flow and iterate quickly without waiting for backend complexity.
2. **Then build `Full_Backend_Implementation/BACKEND_GUIDE.md`** — implement the real database schema, routing engine, Stripe Connect flows, AI scoring, and calendar sync.
3. Wire the two together — replace stubs with real API calls.

This order keeps frontend and backend work parallelizable if there are multiple engineers.

---

## Build Timeline

Target: **8–10 weeks** for a testable MVP.

| Week | Milestone |
|---|---|
| 1–2 | Design system, component library, navigation scaffolding, auth flows |
| 3–4 | Homeowner onboarding + Browse/Book screens; Provider onboarding flow |
| 5–6 | Booking flow (full multi-step); Provider job queue + accept/decline |
| 7 | Check-in widget (both homeowner post-service + provider at-job check-in); Trust score display |
| 8 | Stripe Connect integration; instant payout flow; card-on-file |
| 9 | Calendar sync; damage claim flow; crew/team accounts |
| 10 | Admin dashboard; polish pass; QA; edge case handling |

---

## What Claude Code Can Decide Freely

The following decisions are intentionally left open for Claude Code to make. These are implementation details, not product decisions:

- **Component library choice**: NativeWind + custom components, Tamagui, or Gluestack UI — pick what integrates cleanest with Expo SDK 51+
- **Animation library**: Reanimated 3 + Gesture Handler is strongly recommended; the specific spring configs, easing curves, and timing are Claude Code's call
- **Icon set**: Lucide React Native preferred (consistent, well-maintained), but Phosphor Icons is also acceptable
- **Date/time picker**: prefer a React Native native feel; DateTimePicker from `@react-native-community/datetimepicker` or a polished third-party library
- **Color palette refinements**: the palette in FRONTEND_GUIDE.md is directional. Claude Code can adjust lightness/saturation to achieve better contrast ratios or visual harmony while keeping the deep green + warm amber + cream identity
- **Specific empty state illustrations**: SVG illustrations or Lottie animations — Claude Code's choice; just make sure they exist and are contextually relevant
- **Map component specifics**: react-native-maps with Google Maps provider is the standard; specific marker designs and cluster styles are Claude Code's call
- **Loading skeleton shapes**: match the shape of the content being loaded, but exact proportions are Claude Code's call
- **Toast notification library**: `react-native-toast-message` or similar — just ensure it's consistent across the app
- **Form validation**: React Hook Form + Zod is the recommended pattern; Claude Code can adapt
- **Folder/file naming conventions within the component tree**: follow a consistent pattern (feature-based grouping recommended)

---

## Key Constraints Claude Code Must Respect

These are NOT optional:

1. **Single codebase for both apps**: homeowner and provider screens live in the same React Native repo, differentiated by the `role` field on the authenticated user. Do not create two separate apps.
2. **No lead resale mechanics**: the booking flow must never show a homeowner multiple provider options to "choose from" as if shopping leads. The routing engine selects one provider. The homeowner sees one matched provider (with their trust score and profile) and can either confirm or cancel.
3. **Check-in data is the product**: the post-service check-in is not an afterthought. It must be the most polished, lowest-friction interaction in the entire app.
4. **Trust score must be visible everywhere a provider appears**: on browse cards, in booking confirmation, in job history, in the check-in result — everywhere.
5. **Stripe Connect Express only**: do not implement custom payment flows. All money movement goes through Stripe Connect.
6. **Supabase Auth only**: do not add a separate auth system. Use Supabase Auth for all authentication including OAuth providers.
7. **Expo managed workflow**: do not eject to bare workflow unless absolutely required. Stay in managed workflow.

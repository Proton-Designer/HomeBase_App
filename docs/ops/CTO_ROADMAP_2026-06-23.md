# MyHomebase — CTO Roadmap & Feature Specs (2026-06-23)

Written as the technical cofounder. Grounded in the actual codebase + this session's QA. Opinionated and prioritized. Goal: move from "MVP that works" to "product people keep."

## Where we are (honest)
- **Homeowner flow works end-to-end** (onboarding → discovery → 6-step booking → payment → job timeline → 15-sec check-in → claims). Both data hooks fire (`demand_events`, `completion_ledger`). All ~16 edge functions deployed.
- **Messaging works** (job-scoped, realtime, optimistic + idempotent dedup as of this week).
- **The moat is real but unbuilt:** the home-centric dashboard + Operator Graph + earn-on-completion are the differentiators vs Thumbtack/Angi (reactive lead-gen). We win by being the home's *operating system*, not a lead marketplace.
- **The gap is depth + supply + polish**, not core plumbing.

## The 6 highest-leverage bets (ranked)

### 1. Recurring plans = the business. (Now)
One-off bookings are a transaction; recurring plans are a company. LTV, retention, and predictable GMV all live here. We already have a `subscriptions` table + the Home Care Plan foundation shipped tonight (`home_service_status`, confirm-loop). 
**Build:** make "Set up a recurring plan" the primary CTA on every reminder + post-booking; a real Plan screen (the home's full care schedule); auto-create the next job from the plan. **Why first:** every other metric compounds off repeat.

### 2. Push notifications — the retention loop. (Now)
The app currently only creates value when opened. `register-push-token` edge fn + `push_tokens` table already exist. 
**Build:** expo-notifications registration on login; push on (a) maintenance due (the reminder confirm-loop, off-app), (b) job status changes (en route / completed), (c) new message, (d) a quote on a posting. This is what turns a 2x/year app into monthly. Pair with the reminders confirm-loop so a push → "Already handled / Book / Snooze" round-trips.

### 3. Pre-booking messaging (conversations model). (Next)
Today messaging is `job_id`-scoped, so "Message a provider" before booking dead-ends — the #1 discovery friction. 
**Build:** a `conversations(homeowner_id, provider_id, job_id nullable)` table; `messages.conversation_id`; RLS participant-only; spam gating (rate-limit + only after a profile view). Lets a homeowner ask a question pre-booking → higher booking conversion. Spec: keep job threads as conversations with a job_id; pre-booking ones have null job_id.

### 4. Supply-side growth loop + provider tooling. (Next)
A two-sided marketplace dies on the thin side. Homeowner side is polished; provider/tech side is thinner (see audit). 
**Build:** provider onboarding that actually sets service areas (today `provider-onboard` doesn't — homeowners can't discover new pros without a manual service-area row); provider earnings clarity; tech messaging access; a "respond to posting with a quote" flow (the no-pay-per-lead core). Supply quality + density is the moat.

### 5. Trust Ladder depth. (Next)
Trust scores are visible everywhere (good) and derive from real check-ins (good). 
**Build:** the verification tiers (Tier 1 → 2 → 3) with visible badges + the "why this score" line (Phase-4 Haiku is in the stack for this); surface verification status in discovery ranking. Trust is the reason a homeowner picks HomeBase over a Craigslist handyman.

### 6. Data flywheel → Phase-4 AI. (Later, but instrument now)
`demand_events` + `completion_ledger` are wired. 
**Build toward:** demand heatmaps (where to recruit supply), cadence prediction (smarter reminders than seasonal templates), check-in grading + "why this score" (Haiku). Every booking/search already feeds this — protect those hooks.

## Production-readiness (quality bar)
- **Design-system fidelity:** the brand spec (FRONTEND_GUIDE) calls for forest-green + Fraunces; the app ships blue + Inter. Aligning tokens is the single biggest "looks production" lever — but app-wide, so do it as one careful, verified token change (see audit/ux-design.md).
- **Empty states:** Jobs/Subscriptions are bare buttons; Inbox/Claims are good — bring all up to that bar.
- **RLS performance:** advisors found 27 `auth_rls_initplan` + 201 multiple-permissive-policy lints — real cost at scale. Safe remediation plan in audit/backend-rls.md (wrap `auth.uid()` in `(select …)`, consolidate duplicate policies). FK indexes already added tonight.
- **Messaging polish:** attachments (stubbed), inbox-tab unread badge (needs LiquidGlassTabBar support), web split-pane optimistic wiring.

## Roadmap
**Now (this week):** recurring plans CTA + Plan screen · push notifications (reminders + job status) · finish Home Care Plan onboarding seed · design-system token alignment.
**Next (2–4 wks):** pre-booking conversations · provider onboarding service-areas + quote-on-posting · trust tiers/badges · RLS perf remediation.
**Later:** demand heatmaps · cadence prediction · check-in AI grading · attachments/typing.

## Tonight's shipped items + audit synthesis
See CTO_NIGHT_2026-06-23.md (running log) and docs/ops/audit/*.md (parallel audit outputs, synthesized below once complete).

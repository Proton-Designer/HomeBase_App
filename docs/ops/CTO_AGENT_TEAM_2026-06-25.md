# CTO Agent-Team Audit & Improve — 2026-06-25

Autonomous overnight run. User asleep — do not prompt; final Telegram update + screenshots + terminate caffeinate at the end. **Cost-constrained: user is on a $200/month plan.** If cost trends unexpectedly high → STOP and optimize (full CTO discretion granted).

## Task 1 (do first, directly)
Remove the **availability** step from provider onboarding (availability changes constantly). Bake availability into **job acceptance** — provider sets the time/availability **per job** when accepting a request.
- Onboarding STEPS: drop `availability`; re-wire service-area → banking.
- Job accept: provider picks/confirms the job's date-time on Accept → sets `jobs.scheduled_at`.

## Task 2 — Agent team (orchestrator = me / CTO)
Roles & models:
- **Analyzer = Sonnet** — breaks features into granular requirements; audits each across multiple facets; may launch **≤3 parallel Explore subagents** (code) + use iOS sim / Playwright to test. Output: structured audit (gaps ranked by impact).
- **Thinker = Opus** — has **2 brainstorm subagents** (distinct perspectives); evaluates both honestly/critically → best solution.
- **Builder = Opus** — may deploy **≤2 subagents** to implement the chosen change. tsc-clean.

Process (per subsystem, one at a time):
1. Orchestrator breaks the subsystem → features → granular requirements/expectations.
2. Feed requirements to the Analyzer → audit.
3. **Gate (cost control):** only requirements with a REAL gap/improvement go to Thinker → Builder. Already-solid items are recorded, not sent down the expensive path. (Most provider screens were rebuilt 2026-06-24 and are solid — expect few opus cycles per subsystem.)
4. Thinker → best solution → Builder → implement → orchestrator verifies (representative sim/browser check) → tsc.

Cost guardrails:
- Analyzer (sonnet) + Explore (cheap) do the bulk; Opus (thinker/builder) only fires on genuine gaps.
- Sim/browser testing done representatively by the orchestrator/analyzer serially (single shared simulator — no parallel sim access).
- Monitor cumulative subagent tokens per workflow notification; pace accordingly; halt + report if ballooning.
- Agents may use ALL tools / MCP servers (browser, sim) / skills as needed.

Subsystem order (provider side first, then homeowner): Onboarding → Today/Daily-Ops → Job Management → Schedule/Availability → Check-in → Earnings → Custom-Job Requests → Messaging → Notifications → Profile/Reputation → Verification → Crew → Integrations → Tech sub-role → (then homeowner subsystems).

## Loop / oversight
- Sequential per subsystem; workflow completion notifications drive the next step.
- Progress ledger appended below.
- FINAL: Telegram summary + screenshots; `TaskStop` caffeinate (task b0c0rv2xm).

## BUILD PASS — DONE
- ✅ **Notification event-wiring** (item 1, HIGH) — BUILT + verified live. Migration `notification_event_triggers`: 4 SECURITY DEFINER triggers create `notifications` rows on: new message (→ other participant), quote received (→ homeowner), quote accepted (→ provider), booking confirmed (→ homeowner). Tested: a message insert correctly created a `new_message` notification for the provider-owner with data.jobId/threadId; test rows cleaned up. The center/badge/realtime already consume `notifications`, so these now light up in-app.

### DEFERRED to user decision (money/product calls — precise fix-plans below, not built unattended)
- **net/fee model:** read `payments.application_fee_cents` (already the source of truth) at capture; write `net_cents`+`fee_cents` onto `completion_ledger`; read `net_cents` in earnings/today/jobs instead of hardcoded ×0.9. One-off fee is 17.5% (not 10%), so earnings currently overstate net ~7.5% for one-off jobs. Needs confirm of the live fee schedule per booking type before touching money display.
- **job-request expiry:** add `expires_at` to jobs + pg_cron to expire/re-route stale `booked`. Re-route behavior (notify-next-provider vs cancel) is a product decision.
- **notification_prefs enforcement (push path):** send-push should read `profiles.notification_prefs` + a type→pref map before sending; in-app (just built) intentionally fires for all events.
- **post-onboarding edit screens:** pre-populate service-area/profile from DB on post-onboarding entry.
- **missing HO settings:** address-management, payment-methods, help/support screens (needed for App Store).
- **reminders:** dismissCount≥2 suppression + snooze/mute telemetry.
- **acceptQuote atomicity:** move the 3 writes into an RPC/edge fn transaction.

## (historical) CONSOLIDATED ARCHITECTURAL BACKLOG
1. **Notification event-wiring (HIGH):** the notification CENTER works but almost nothing creates rows. Build: DB trigger on `messages` insert → `new_message` notification for the recipient; wire `booking_confirmed`/`booking_declined` (job-accept/decline), `job_completed_checkin`, `quote_received` (posting_quotes insert), `quote_accepted`. Highest-value = new_message + quote events.
2. **notification_prefs enforcement (HIGH):** send-push-notification ignores `profiles.notification_prefs` — add a type→pref map + skip when off. Add missing pref keys (claim_update, verification_approved).
3. **net/fee model (MEDIUM):** store `net_cents`/`fee_cents` on completion_ledger at capture; read it in earnings/today/jobs instead of hardcoded ×0.9 (one-off = 17.5% fee, not 10%).
4. **Job-request expiry (MEDIUM):** add `expires_at` to jobs + a pg_cron to auto-expire/re-route stale `booked` requests; until then the countdown is cosmetic.
5. **Post-onboarding edit screens (MEDIUM):** pre-populate the service-area/profile screens from the DB when entered post-onboarding (today they start empty).
6. Quote-accepted → real booking/job conversion (currently only marks posting matched).

### Subsystems 10-14 — Profile/Reputation, Crew, Verification, Integrations, Tech ✅ audited + fixed
- Profile/avatar/TrustSummary/preview/settings-rows: all OK (solid).
- Tech greeting hardcoded 'Tech' → FIXED (uses profile.firstName).
- FALSE alarms verified: crew.remove() IS RLS-protected (provider_team UPDATE = is_provider_owner only); verification edge fns ARE deployed.
- Backlog: verification needs an 'Under review' state (verification_tier stays 0 post-submit until operator promotes); calendar OAuth has no return deep-link handler (status won't auto-update); tech earnings show gross not net + tech has no schedule/profile/messages tabs (MVP scope); crew todayJobCount badge always 0 (no jobs join).

## PROGRESS LEDGER (continued)
### HOMEOWNER subsystems ✅ all audited + fixed (tsc-clean)
**Home / Adaptive Hero / Discovery:**
- HIGH: hero priority — a future booking eclipsed overdue maintenance → fixed (overdue/due_soon reminder now outranks a non-live booking; 'recommended' yields to the booking).
- MEDIUM: cold-boot flash (showed 'add your home' + setup nudge before auth hydrated) → guarded both with `|| !userId`.
- FALSE alarm: demand_events 'enum mismatch' — live table accepts the client values (8 booking_started + view_provider/search/booking_completed/posting_created rows present). Data flywheel intact.
- Backlog: reminders dismissCount≥2 suppression + snooze/mute telemetry not wired; discovery shows 'no pros' instead of 'add address' when no zip; SearchIntentBar text not cleared.
**Booking catalog + wizard:** catalog/service-select/match all OK (8s timeout + 3 distinct empty states solid; matched-provider carry respected). Backlog: details photo picker no-op + save-pref dead toggle + payment $0.00 no skeleton (low); pm_card_visa stub (known).
**Subscriptions:** MEDIUM trust badge never showed (select omitted composite_score_overall/verification_tier) → FIXED (both queries + maps). create-from-booking handled server-side (QA-confirmed).
**Custom-job creation:** wizard writes postings OK. Backlog: acceptQuote 3-call non-atomic; detail query-key stale after post.
**Claims:** HIGH submit had no catch → silent failure → FIXED (try/catch + Alert). Backlog (ops): release-escrow needs STRIPE_SECRET_KEY set or refunds no-op.
**Profile/Account/Notif-prefs:** all OK (avatar, name/phone, delete-account 2-step, prefs optimistic all solid). Backlog: no address-management / payment-methods / help screens (deferred; needed for App Store).

### Subsystem 7 — Custom-Job Requests ✅ audited + fixed
- accept→booking now carries the chosen provider (setMatchedProvider) so the match step doesn't re-run generic search.
- listOpenForProvider: provider with no service_types now returns [] (was returning ALL postings).
- FALSE alarms verified against live DB: postings + posting_quotes BOTH have RLS (3 policies each); match_count IS maintained by the trigger I added. (Analyzer read stale backend-rls.md + code-only.)
- Backlog: accept→real-booking conversion (FK postingId/quoteId) + quote notifications → consolidated backlog.

### Subsystem 8 — Messaging ✅ audited + fixed (reliability layer confirmed solid)
- Confirmed bug: thread HeaderAvatar rendered initials even when an avatar URL existed → now renders the image (expo-image).
- Optimistic send/idempotency/pagination/typing/quick-replies/attachment-deferral all verified SOLID.
- Backlog: provider inbox not in the tab bar (accessible via profile/jobs only); homeowner mobile inbox lacks its own realtime (badge updates on focus); 'Seen' has no timestamp; desktop ThreadDetail missing read-receipt sub.

### Subsystem 9 — Notifications ✅ audited (plumbing solid; gaps are backend event-wiring)
- Center/bell/badge/push-registration/RLS/mark-read all verified working. Table-name 'notification_log' = FALSE alarm (live table is 'notifications').
- Real gaps → consolidated backlog: events don't create notification rows; prefs not enforced.

## PROGRESS LEDGER
- [x] Task 1 DONE: onboarding 'availability' step removed (STEPS = welcome/business/service-area/banking/profile); provider row now created at service-area step; job-accept edge fn v2 + jobsApi.accept(scheduledAt) + a per-job date-time picker modal on Accept (provider sets when they'll do the job). tsc clean.
- [~] Reusable `subsystem-audit` workflow authored (3 Explore → Sonnet analyzer, structured audit). Strategy: run audits in PARALLEL across subsystems (read-only, safe), then gate real gaps into serial Opus think→build.
- User clarified: $200/mo MAX plan (20x) — headroom is fine; be thorough, just non-wasteful + look for anomalies.
- Process note: analyzers found genuine bugs. Mechanical/clear gaps → fixed directly (cost-efficient, no Opus). Reserve Opus think→build for true design questions (architectural backlog below).

### Subsystem 1 — Provider Onboarding ✅ audited + fixed
- CRITICAL: dup-onboard guard added (service-area onContinue skips onboard() if providerId already exists → fixes the back-from-banking UNIQUE-constraint break + post-onboarding service-area edit).
- Stale welcome copy fixed. (owner_user_id "discrepancy" = FALSE alarm; live DB uses owner_user_id, BACKEND_GUIDE doc is stale.)
- Architectural backlog: post-onboarding EDIT screens don't pre-populate from DB (standalone-edit gap); dead availability.tsx + store availability state (cleanup); verify verification-tier edge fns deployed.

### Subsystem 2 — Today / Daily Ops ✅ audited + fixed (mostly OK — last night's rework solid)
- KPI strip stale after check-in → handleCheckInClose now invalidates today-ledger/jobs/detail.
- markEnRoute mutation: added onError Alert.
- KPI strip no longer vanishes on ledger error (shows '—'), mobile + desktop.

### Subsystem 3 — Job Management ✅ audited + fixed
- Active filter now excludes 'booked' (was double-showing new jobs in Requests + Active).
- HIGH net-payout bug: check-in from Jobs tab now uses amountCents×0.9 (was gross).
- Homeowner name fix on active + completed cards (was showing provider's own name).
- Accept default time → same-day-able (was forced +1 day 9am).
- Decline no longer fires a bogus calendar delete.
- Crew assignment now hydrates from DB (assigned_tech_id added to select + Job type + hydrate effect) + refetch on assign.
- Architectural backlog: job request expiry is client-only (no expires_at column / no server auto-expire+re-route cron) — top item; crew-assign lacks crew-membership validation (consider edge fn); no job-detail screen (MVP-acceptable); web datetime picker fallback is read-only.

### Subsystem 4 — Schedule & Availability ✅ audited + fixed
- MonthStrip freeze beyond ±28 days → widened to ±42 (STRIP_DAYS 84).
- Blocked-times query had no error state → added isError, passed to WeekAgenda.
- AvailabilityPanel misleading "homeowners can book you" copy → reworded to routing model (+ "you confirm the time on accept") — resolves the per-job-vs-global consistency question: GLOBAL availability = routing window (which days/hours to receive requests); PER-JOB time = when you actually do it. They're complementary, kept both.
- FALSE alarm: blocked_times "schema mismatch" — live DB has start_at/end_at (matches API); BACKEND_GUIDE doc is stale.
- Backlog: web block-date has no past guard (native does).

### Subsystem 5 — Check-in (sacred flow) ✅ audited + fixed
- CRITICAL: HomeownerCheckIn advanced to the success screen BEFORE awaiting submit → a failed review was silently lost. Now awaits, Alerts + stays on the step on failure, celebrates only on success, + double-submit guard + loading.
- ProviderCheckIn success haptic fired before the await → moved to the success path only.
- today.tsx MOBILE onClose still bypassed cache invalidation (earlier replace only caught desktop) → fixed to handleCheckInClose.
- (Edge fns verified to write check_ins + completion_ledger + recompute score; "unspecified in BACKEND_GUIDE" = doc gap, not code bug.)

### Subsystem 6 — Earnings & Payouts ✅ audited + fixed
- Instant payout wasn't disabled when no bank connected → now disabled + (mock would have allowed a payout with no bank).
- Dead "Standard payout" button (no onPress) → made informational.
- Filter labels "this week/month" → "last 7/30 days" (windows are rolling).
- Backlog (MEDIUM, systemic): earnings net hardcodes gross×0.9 but one-off jobs have a 17.5% platform fee → net overstated + inconsistent with balance. Proper fix = store net_cents/fee_cents on completion_ledger at capture and read it everywhere (today KPI, jobs, earnings). Needs the fee-model decision — flagged, not built.

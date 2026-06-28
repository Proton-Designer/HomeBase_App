# AGENT_START_HERE — New Agent Onboarding Guide

> **Who this is for:** Any Claude agent, subagent, or new session starting work on HomeBase.
> **What this is:** A sequential reading guide. This file does not contain context itself — it tells you exactly where to go, in what order, and what you need to extract from each file before starting work.

---

## Step 1 — Read CLAUDE.md (Repo Root)

**Path:** `/CLAUDE.md` (repo root, same level as this file)

**Read this first, before anything else.** It is short and contains:
- The 8 non-negotiables that apply to every single code change
- The stack (do not deviate from these choices)
- The subagent registry (what each agent does and when to use them)

**What to extract:** The 8 non-negotiables and the tech stack. These are hard constraints — any implementation decision that conflicts with them is wrong.

---

## Step 2 — Must Read the Master Context File (right now)

**Path:** `docs/context/HOMEBASE_CONTEXT.md`

This is the single most important document in the repo. Read the entire file. It contains:
- What HomeBase is and the dual-layer architecture (Marketplace → HomeBase OS)
- The problem being solved (for homeowners and for operators)
- The core differentiators vs. Angi / Thumbtack / TaskRabbit
- Both user types (Homeowner, Provider/Operator, Tech) and their jobs-to-be-done
- The revenue model (all 5 revenue lines, take rates, phase roadmap)
- The 11 MVP features — their IDs and what each proves
- The data flywheel and why incumbents cannot replicate it (the moat)
- The complete current implementation status — what's built, what's pending
- The 5 remaining code gaps (critical — check before assuming anything is wired)
- The full tech stack with version numbers
- All 12 non-negotiables (expanded from CLAUDE.md)
- The phase roadmap (Phase 1 through Phase 5)
- The full glossary

**What to extract:** The 5 remaining code gaps (§12), the non-negotiables (§10), and the current implementation status (§11). These tell you what actually exists in the codebase vs. what still needs to be built.

---

## Step 3 — Must Read the Folder Structure Map (right now)

**Path:** `docs/FOLDER_STRUCTURE.md`

Before touching any file, know where everything is. This document maps:
- The complete `apps/mobile/` screen tree (all 3 role groups, all routes)
- Every component in `components/shared/` and `components/ui/`
- Every API module in `lib/api/`
- The admin dashboard structure in `apps/admin/`
- Every documentation file and what it contains
- A quick-reference table for "where do I find X?"

**What to extract:** The specific path to whatever you're working on. Don't guess — look it up here first.

---

## Step 4 — Read the Competitors Overview (if your task involves competitive context)

**Path:** `docs/context/COMPETITORS_OVERVIEW.md`

Read this if your task involves any of: provider acquisition messaging, feature design, pricing decisions, marketing copy, or anything where understanding how HomeBase differs from incumbents matters.

It covers:
- All 5 consumer marketplace competitors (Angi, Thumbtack, TaskRabbit, Handy, Lawn Love)
- Both B2B FSM tools (Housecall Pro, Jobber)
- The comparative matrix (lead-resale, payout speed, recurring bookings, verification, crew accounts)
- What each competitor's weakness means for HomeBase's strategy
- 5 strategic implications for every agent

**Skip this step** only if your task is purely internal (bug fix, config change, data migration) with no competitive dimension.

---

## Step 5 — Read the Relevant Implementation Guide

Based on your task, read the appropriate guide from `docs/guides/`:

| If your task involves... | Read this file |
|---|---|
| Any mobile screen (homeowner, provider, tech, auth) | `docs/guides/FRONTEND_GUIDE.md` |
| The booking wizard or check-in widget (SACRED FLOWS) | `docs/guides/FRONTEND_GUIDE.md` §4.8–4.13 + §5.5 |
| Supabase schema, Edge Functions, or business logic | `docs/guides/BACKEND_GUIDE.md` |
| Environment variables or third-party secrets | `docs/guides/BACKEND_ENV.md` |
| The scope of MVP features (what's in/out) | `docs/guides/MVP_OVERVIEW.md` |
| The 3-phase build structure | `docs/guides/PHASES.md` |
| Telnyx, Resend, Google Calendar, Stripe, Checkr | `docs/guides/SERVICES_INTEGRATION.md` |
| Pre-launch operator setup (keys, webhooks, store) | `docs/ops/OPERATIONS_TODO.md` |

**Do not skip the relevant guide.** It contains colors, sizes, timings, animation specs, and API contracts that are not in the context file.

---

## Step 6 — Check the Changelog

**Path:** `docs/CHANGELOG.md`

Before starting, scan the changelog for recent entries that might affect your task. Look for:
- Recent changes to files you're about to touch
- Recently closed code gaps that might affect your assumptions
- Schema migrations or Edge Function changes that happened since the context file was last updated

This prevents you from building on stale assumptions.

---

## Step 7 — Deep-Dive a Specific Competitor (If Needed)

**Path:** `docs/context/competitors/[COMPETITOR].md`

Individual competitor files — go here only if your task requires detailed knowledge of a specific platform:

| File | Use when |
|---|---|
| `competitors/ANGI.md` | Comparing to the largest incumbent; FTC history; lead-resale specifics |
| `competitors/THUMBTACK.md` | AI distribution threat (ChatGPT/Alexa); dynamic pricing critique; provider ROI data |
| `competitors/TASKRABBIT.md` | Single-provider model comparison; IKEA integration; fee structure |
| `competitors/HANDY.md` | Managed dispatch model; FTC/NY AG settlement details; worker treatment |
| `competitors/LAWN_LOVE.md` | Lawn care vertical specifically; satellite measurement; provider payment issues |
| `competitors/HOUSECALL_PRO.md` | B2B FSM software; Phase 4 OS pricing comparison; operational feature set |
| `competitors/JOBBER.md` | B2B FSM software; CRM depth; QuickBooks integration; AI Receptionist comparison |

---

## Step 8 — Identify the Right Subagent (If Delegating)

**Path:** `.claude/agents/`

If you are an orchestrator agent delegating work, read the agent definition file before delegating. Use the right agent for the task:

| Agent | Task type |
|---|---|
| `design-system` | Design tokens, base UI components, monorepo scaffold |
| `rn-screens` | Any of the 21 mobile screens |
| `booking-and-checkin` | 6-step booking wizard OR 15-second check-in widget ONLY |
| `shared-components` | ProviderCard, TrustScoreDisplay, JobStatusTimeline, VerificationBadge, SkeletonLoader, BottomSheet, EmptyState |
| `admin-nextjs` | Anything under `apps/admin/` |
| `frontend-qa` | Read-only review pass before merging |
| `services-researcher` | External research (market data, competitor intel, integration docs) |
| `web-native` | Web-specific adaptations of the RN codebase |

---

## Key Constraints — Commit These to Memory

Before writing a single line of code, confirm you know these:

1. **No pay-per-lead.** Providers never pay to receive or respond to a request. Revenue only triggers on verified job completion. No exceptions.
2. **Earn on completion, not inquiry.** Payment hooks tie to verified job completion only.
3. **Check-in widget is sacred.** 15 seconds. Polished. Never remove or simplify.
4. **Completion ledger + demand events always write.** Every completed booking → `completion_ledger`. Every search → `demand_events`. No skipping.
5. **RLS on every table.** Never write a query that bypasses row-level security.
6. **Reanimated 4 only.** Never use the core React Native `Animated` API.
7. **Expo managed workflow.** No bare workflow eject.
8. **Stripe Connect Express only.** No custom payment flows.
9. **Trust Ladder Rung 1 at MVP.** No autonomous agent actions. All actions require operator approval.
10. **Single RN codebase.** Homeowner + provider in one Expo app. No separate apps.

---

## What to Do Before Finishing Your Session

1. Add an entry to `docs/CHANGELOG.md` for any meaningful change you made (see the format instructions at the top of that file)
2. Update any documentation that became stale as a result of your changes
3. If you discovered something wrong or missing in the context files, flag it or fix it

---

## Quick Reference — Most-Used Paths

| What | Where |
|---|---|
| Non-negotiables | `CLAUDE.md` (root) |
| Full startup context | `docs/context/HOMEBASE_CONTEXT.md` |
| Folder map | `docs/FOLDER_STRUCTURE.md` |
| Recent changes | `docs/CHANGELOG.md` |
| Competitor overview | `docs/context/COMPETITORS_OVERVIEW.md` |
| Frontend spec | `docs/guides/FRONTEND_GUIDE.md` |
| Backend spec | `docs/guides/BACKEND_GUIDE.md` |
| MVP feature scope | `docs/guides/MVP_OVERVIEW.md` |
| Homeowner screens | `apps/mobile/app/(homeowner)/` |
| Provider screens | `apps/mobile/app/(provider)/` |
| Tech screens | `apps/mobile/app/(tech)/` |
| Auth screens | `apps/mobile/app/(auth)/` |
| Shared components | `apps/mobile/components/shared/` |
| API modules | `apps/mobile/lib/api/` |
| Admin dashboard | `apps/admin/app/admin/` |
| Subagent definitions | `.claude/agents/` |

---

*HomeBase · Agent Onboarding Guide · 2026-06-06*

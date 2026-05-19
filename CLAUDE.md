# HomeBase — Claude Code Instructions

## Required reading (load before any change)
- `MVP_HB_context copy.md` — startup overhead: what HomeBase is, the moat, why
- `Marketplace_MVP/MVP_OVERVIEW.md` — marketplace MVP scope, the 11 features, the wedge hypothesis
- `Marketplace_MVP/Frontend_and_Basic_Backend/FRONTEND_GUIDE.md` — full frontend implementation spec
- `Marketplace_MVP/PHASES.md` — the 3-phase build split

## Non-negotiables (enforce in every change)
1. **No lead-resale, ever.** A homeowner inquiry routes to exactly one provider. Never surface multiple providers to "choose from" lead-auction style.
2. **Earn on completion, not inquiry.** Revenue hooks tie to verified job completion (check-in submitted + payment captured), never to clicks/impressions/contact exchanges.
3. **The check-in widget is sacred.** 15 seconds of taps, polished, always works. Never simplify out of existence.
4. **Data hooks are required.** Every completed booking writes to `completion_ledger`; every search writes to `demand_events`. Skipping these delays Phase 4 AI.
5. **Trust Ladder Rung 1 only at MVP.** Operator approves every action; no autonomous agent moves. Build the audit trail from day one.
6. **RLS on every table.** Multi-tenant security is not retrofittable.
7. **Operator Graph hygiene.** Temporal columns (`valid_from`, `valid_to`) on key fact tables; no orphaned records.
8. **Single RN codebase.** Homeowner + provider screens in one Expo repo, role-based screen rendering. No separate apps.

## Stack (do not deviate)
- **Mobile:** React Native + Expo SDK 51 (managed workflow), Expo Router 3.5, NativeWind 4, Reanimated 3 (never core `Animated`).
- **State:** Zustand 4.5 (UI), TanStack Query 5 (server).
- **Forms:** React Hook Form 7 + Zod 3.
- **Admin:** Next.js 14 App Router, shadcn/ui, TanStack Table.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions).
- **Payments:** Stripe Connect Express only.
- **AI:** Anthropic Claude Haiku for check-in grading + trust score "why this score" lines.

## Subagents (definitions in `.claude/agents/`)
| Agent | Use when |
|---|---|
| `design-system` | Theme tokens, base components, monorepo + Expo Router scaffold |
| `rn-screens` | Building any of the 21 mobile screens against the design system |
| `booking-and-checkin` | The 6-step booking wizard or the 15-second check-in widget (sacred flows) |
| `shared-components` | ProviderCard, TrustScoreDisplay, JobStatusTimeline, VerificationBadge, SkeletonLoader, BottomSheet, EmptyState |
| `admin-nextjs` | Anything under `apps/admin/` |
| `frontend-qa` | Read-only review pass before merging UI changes |

## Output rules
- Default to no comments. Only add a comment when WHY is non-obvious.
- Don't write planning/decision docs unless asked.
- Match the FRONTEND_GUIDE colors/sizes/timings exactly. Adjust only for WCAG AA contrast.

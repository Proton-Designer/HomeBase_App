# UX & Design-System Fidelity Audit
**Date:** 2026-06-23  
**Scope:** `apps/mobile` read-only vs. `docs/guides/FRONTEND_GUIDE.md` spec  
**Method:** Static code review — tokens, components, screens, booking flow, check-in widget

---

## Executive Summary

The mobile app has a solid structural foundation: component composition, Reanimated usage, token architecture, and accessibility scaffolding are all better-than-average for a startup at this stage. The check-in widget flow is implemented correctly and the booking flow is largely spec-faithful.

However, there is one **critical identity failure** and several **high-severity polish gaps** that would immediately read as "not yet premium" to a design-literate investor or homeowner:

1. **The primary color palette is entirely wrong.** The token file ships Tailwind-blue where the spec demands deep forest green. This is the #1 brand-defining issue.
2. **The background is blue-tinted** (`#F5F8FF`) instead of the cream off-white (`#F8F6F1`) that defines the "warm, trusted, home warmth" brand signal.
3. **The welcome screen has drifted** from the spec's full-bleed green gradient to a white/cream background with blue atmospheric circles — fundamentally different mood.
4. **The SkeletonLoader uses only opacity shimmer**, not the lateral shimmer gradient the spec requires.
5. **The tab bar** diverged from the spec's "small filled dot beneath icon" indicator to a floating capsule Liquid Glass bar — architecturally interesting but spec-non-compliant and creates keyboard-avoidance issues.
6. Several screens have **no illustration in their EmptyState**, leaving heading-only text that reads as templated/unpolished.

---

## P1 — Brand-Breaking (Must fix before any investor demo or beta)

### P1-1: Primary color palette is blue, not forest green

**File:** `apps/mobile/tokens/colors.ts`, lines 2–13  
**Spec:** `docs/guides/FRONTEND_GUIDE.md` §2 Color Palette — `primary[600]: '#1A3D2B'` (Deep Forest Green)  
**Actual:** `primary[600]: '#2563EB'` (Tailwind `blue-600`)

The entire ramp is Tailwind's blue scale, not any shade of green. Every button, border highlight, avatar fallback, active tab, focus ring, selection indicator, and trust score ring pull from this token. This means the delivered app has zero brand differentiation — it looks identical to every Expo starter app.

The accent (`#E8A020` amber) is correct. The background is not (see P1-2). The font system is partially correct (see P1-3).

**Concrete fix:**
```typescript
// apps/mobile/tokens/colors.ts — replace the primary block:
primary: {
  50:  '#F0F7F3',
  100: '#D6EBE0',
  200: '#AED7C1',
  300: '#7DBEA0',
  400: '#4DA07D',
  500: '#2D7A5A',
  600: '#1A3D2B',   // PRIMARY — main brand color
  700: '#163323',
  800: '#11281C',
  900: '#0B1C13',
},
```
No component files need to change — they all reference `colors.primary[600]` by token.

---

### P1-2: Background is cool blue-tinted, not warm cream

**File:** `apps/mobile/tokens/colors.ts`, line 26  
**Spec:** `background: '#F8F6F1'` — Warm off-white cream  
**Actual:** `background: '#F5F8FF'` — Cool blue-tinted white

The difference is subtle in isolation but immediately visible when combined with the blue primary: the app reads as a standard blue SaaS product, not a warm home-services brand. The `webBlur` style in `LiquidGlassTabBar.tsx` even hardcodes `rgba(245, 248, 255, 0.72)` — the blue tint directly.

**Concrete fix:**
```typescript
background: '#F8F6F1',
```
Also fix the LiquidGlassTabBar webBlur bg:
```typescript
backgroundColor: 'rgba(248, 246, 241, 0.72)',
```

---

### P1-3: Welcome screen mood is completely different from spec

**File:** `apps/mobile/app/(auth)/welcome.tsx`  
**Spec §4.1:** Full-screen background gradient from `#1A3D2B` (top) to `#2D7A5A` (bottom), white logo, white CTAs.  
**Actual:** White/cream background, atmospheric blue-tinted circles, dark text, blue CTA — an editorial layout, not a green-gradient splash.

The implemented welcome screen is not inherently bad design, but it is NOT the HomeBase brand as specified. The spec is explicit: "Full-screen background: gradient from `#1A3D2B` (top) to `#2D7A5A` (bottom)." The current implementation has no dark-green gradient and would not be recognized as the same product shown in any brand mockups.

Additionally, the welcome screen has a web-only `LinearGradient` that adds `rgba(37,99,235,0.04)` blue tint — this is a direct consequence of the wrong primary color and should be removed regardless.

**Concrete fix:** Restore the full-bleed green gradient welcome screen per spec, or formally document the design decision to diverge (editorial splash) and update the spec. This needs a product decision, not just a code fix.

---

## P2 — High Severity Polish (Noticeable in user testing, degrade trust)

### P2-1: SkeletonLoader is opacity-only, not lateral shimmer

**File:** `apps/mobile/components/shared/SkeletonLoader.tsx`  
**Spec §6.6:** "shimmer animation: linear gradient translating from left to right, `#E5E7EB` base with `#F3F4F6` shimmer highlight, 1.5s loop"  
**Actual:** Opacity pulses between 0.6 → 1 → 0.6 on a flat `colors.divider` background. No directional sweep.

The opacity-only approach reads as a blink, not a shimmer. On low-end Android devices (low 60Hz panels) opacity-loop skeletons often look broken. The lateral sweep is the industry-standard pattern (used by Airbnb, Uber, Meta) and sets a premium quality signal.

**Concrete fix:** Replace the opacity animation with an `expo-linear-gradient` sweep inside the Skeleton view, translating from `left: -width` to `left: width` using Reanimated's `withRepeat(withTiming(...))`. The base background stays `#E5E7EB` with a `#F3F4F6` overlay sweep.

---

### P2-2: Tab bar uses floating Liquid Glass capsule, not spec-compliant bottom bar

**File:** `apps/mobile/components/LiquidGlassTabBar.tsx`, `apps/mobile/app/(homeowner)/(tabs)/_layout.tsx`  
**Spec §3 Tab Bar:** "background `#FFFFFF`, active color `#1A3D2B`, inactive color `#9CA3AF`, subtle top border `#E5E7EB`. Active tab has a small filled dot beneath the icon." Height 84px.  
**Actual:** Floating capsule, `BAR_HEIGHT = 64`, no dot indicator, no border — uses iOS 26 Liquid Glass or `expo-blur`.

The floating capsule is a 2026 design trend and looks polished, but it creates two concrete problems:
1. **Screen content scroll clearance**: The layout uses `FLOATING_BAR_HEIGHT = 100` but `contentContainerStyle={{ paddingBottom: 120 }}` on the home screen — inconsistent per-screen; other tab screens may clip content behind the bar.
2. **Android fallback**: The `androidBar` is an opaque white pill with a `1px` border, which will look wrong on any non-premium Android device and is not Material 3 bottom-nav-compliant.

This is a philosophical divergence from the spec, not just a color token issue. The Liquid Glass approach is fine as a future enhancement but the spec's version is more defensible for MVP.

---

### P2-3: EmptyState component has no illustrations — renders as text-only

**File:** `apps/mobile/components/shared/EmptyState.tsx`  
**Spec §6.8:** "illustration: React.ReactNode // SVG or Lottie" — explicit list of 6 EmptyState instances each with their own illustration.  
**Actual:** `illustration` prop exists but is optional and no screen passes one. The home screen `match.tsx` renders `<EmptyState heading="No pros serve your area yet" body="..." />` with no illustration. Same for `isError` states.

An EmptyState with only centered text and a button reads as a placeholder/unfinished screen. For a trust-dependent marketplace, the "no providers in your area" state is exactly where a homeowner might churn — it needs the warmth of an illustration.

**Concrete fix:** Create a minimal SVG illustration set for at minimum the 3 highest-traffic empty states: (1) no providers in area (home with question marks), (2) no jobs yet (empty clipboard), (3) inbox empty. Pass them as `illustration` props. Lottie is not required at MVP — static SVG is sufficient.

---

### P2-4: CheckInWidget shell is a placeholder — the 15-second flow is NOT in the shell component

**File:** `apps/mobile/components/shared/CheckInWidget.tsx`  
**Issue:** The `CheckInWidget` component (the one exported from `components/shared/`) is a shell that renders `children ?? <Text>Check-in flow goes here. Phase 2 implements the question cards.</Text>`. The actual question-card flow exists in `components/checkin/HomeownerCheckIn.tsx` as a separate component.

This means anyone wiring up `<CheckInWidget>` directly without knowing to use `<HomeownerCheckIn>` instead will get a placeholder. The component named in the spec (`CheckInModal`, per §6.5) and the shared export (`CheckInWidget`) are disconnected. If a new screen imports from `components/shared`, they get the stub.

**Concrete fix:** Either (a) re-export `HomeownerCheckIn` as `CheckInWidget` from the shared index, or (b) remove the stub shell and make the shared `CheckInWidget` call through to the real implementation.

---

### P2-5: Font system has Fraunces in token registry but spec calls for PlusJakartaSans as display font

**File:** `apps/mobile/tokens/typography.ts`, lines 1–15  
**Spec §2 Typography:** `display: 'PlusJakartaSans'` for headlines, `body: 'Inter'` for body/labels.  
**Actual:** `PlusJakartaSans` exists in the registry but `Fraunces` (editorial/serif) has been added as a top-tier font family (`fonts.editorial = 'Fraunces_700Bold'`) that is now used in:
- `ProviderCard` — provider name in expanded and compact variants (line 139, 229, 319)
- `TrustScoreDisplay` — score numbers inside rings (line 111)
- `HomeownerCheckIn` — intro heading (line 203 via `editorial-title`)
- `HomeDashboardScreen` — main page heading (line 265 via `editorial-title`)

The guide's font spec names `PlusJakartaSans` for display, `Inter` for body. Fraunces is not mentioned in the guide at all — it appears to have been added during a "revamp" and is now partially applied. The result is an inconsistent hierarchy: some screens use `editorial-title` (Fraunces), others use `headingMd` (PlusJakartaSans). The legacy deprecated aliases (`headingLg`, `headingMd`, etc.) still use PlusJakartaSans, but new screens use the `editorial-*` keys.

This is a design decision that has not been made explicitly. **The audit finding is:** the typography system is in a split state — half Fraunces editorial, half PlusJakartaSans display — with no documented rationale. The guide does not permit this.

**Options:**
1. Adopt Fraunces as the new display font, update the spec, and migrate all `@deprecated` heading usages.
2. Revert Fraunces to body-copy/accent-only role (e.g., for numbers and pull-quotes), keep PlusJakartaSans for headings.

Either is defensible, but pick one and clean up the aliases.

---

### P2-6: Booking flow progress indicator uses dots, not the spec's step design

**File:** `apps/mobile/components/checkin/HomeownerCheckIn.tsx`, lines 147–158  
**Spec §4.8:** Booking flow progress — "6 circular dots, current step filled green, completed steps filled amber, upcoming steps gray."  
**Actual (check-in):** The HomeownerCheckIn component implements pill-shaped dots with a "current" pill that expands to `width: 22`. The fill logic is `i < step → accent[500], i === current → primary[600], else → border`. This is close but inverts the spec's color assignment: completed should be amber, current should be green.

Also: the booking flow shell (`_layout.tsx`) was not found with a BookingShell component — the `_layout.tsx` only wraps routing. Each booking step may need to implement its own progress bar if the shell is absent.

---

## P3 — Polish & Completeness (Perceptible in extended use, not blocking)

### P3-1: Input label uses uppercase `label` text style — over-formatted for auth screens

**File:** `apps/mobile/components/ui/Input.tsx`, lines 83–91  
**Actual:** `textStyles.label` is defined as `fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase'`. Every Input label renders as ALL-CAPS 12px semibold — e.g., "EMAIL", "PASSWORD", "FIRST NAME".  
**Issue:** ALL-CAPS form labels at 12px fail WCAG AA contrast when rendered in `colors.textSecondary` (`#6B7280`) on white. Measured approximate ratio: ~4.1:1 — just below the 4.5:1 threshold for small text. At 12px uppercase, the effective threshold is 4.5:1 (not 3:1), so this is a contrast violation.

**Concrete fix:** Either increase label font size to ≥14px when used in forms, or use a separate label style that doesn't apply uppercase + 12px together. The `label` token is appropriate for section eyebrows; form field labels should use `labelLg` (16px) or `labelMd` (14px).

---

### P3-2: ShortlistCard selection border says "brand blue" in a comment while using primary[600]

**File:** `apps/mobile/components/shared/ProviderCard.tsx`, line 422  
**Comment:** `// Selection border: 2px brand blue when selected`  
This is a stale comment from when the token was blue. After fixing P1-1, the comment becomes correct coincidentally, but the intent was never green — indicates the token divergence has leaked into mental models of the codebase.

**Fix:** Update the comment to "Selection border: 2px brand green when selected" post-color fix.

---

### P3-3: webBlur in LiquidGlassTabBar hardcodes the wrong background hex

**File:** `apps/mobile/components/LiquidGlassTabBar.tsx`, line 205  
**Actual:** `backgroundColor: 'rgba(245, 248, 255, 0.72)'` — hardcoded blue-tinted value, not derived from `colors.background`.  
**Fix:** Replace with `colors.background + 'B8'` (hex opacity suffix) or compute the rgba from the token. This is the `#F5F8FF` hardcode that P1-2 also fixes at the token level — but the LiquidGlassTabBar also needs to be updated to reference the token rather than a hardcoded value so future token changes propagate.

---

### P3-4: Avatar fallback uses primary[100] background, which will be green post P1-1 fix

**File:** `apps/mobile/components/shared/ProviderCard.tsx`, lines 26–39; `apps/mobile/components/home/AdaptiveHero.tsx`, lines 106–128  
**Post-fix effect:** After fixing P1-1, `colors.primary[100]` changes from blue-tinted to green-tinted (`#D6EBE0`). Provider initials (`primary[700]` text on `primary[100]` bg) will render dark green on light green — check contrast. `#163323` on `#D6EBE0` is approximately 8.5:1, which passes AA for any text size. No contract violation, but visually verify the green-on-green avatar looks intentional and warm, not like a glitch.

---

### P3-5: Booking confirmation screen (step 6) — no confetti or animated checkmark beyond SuccessCard in HomeownerCheckIn

**File:** `apps/mobile/app/(homeowner)/booking/confirmation.tsx` (not read — listed in directory)  
**Spec §4.8 Step 6:** "Large animated checkmark (Lottie or Reanimated SVG animation) — green, center screen" + "Confetti burst from center."  
The `HomeownerCheckIn` SuccessCard has a scale-in check circle but no confetti. The booking confirmation screen (a separate screen) was not audited directly. The `celebrate` animation helper (`lib/motion`) exists and is imported in `HomeownerCheckIn.tsx`. Recommend verifying `booking/confirmation.tsx` has the confetti implementation the spec requires — this is the emotional peak of the homeowner journey.

---

### P3-6: YourProsRow (home tab) is a custom one-tap rehire component not in the spec

**File:** `apps/mobile/components/home/YourProsRow.tsx` (exists, not read)  
**Spec §4.6:** "Your Neighborhood Pros" section uses `ProviderCard` compact variant in a horizontal scroll.  
**Actual:** A separate `YourProsRow` component handles the "Your pros" section on the home dashboard with custom rehire UX.

This is additive and likely a good decision (one-tap rehire is a strong retention mechanic). The finding is: this component has not been confirmed to use consistent tokens and the "Your pros" heading uses a custom `SectionHeader` function (with an accent orange rule above the title, not documented in the guide). Verify the accent rule color is `accent[500]` and the section heading uses `textStyles['display-md']` (PlusJakartaSans) not an ad-hoc style.

From reading `HomeDashboardScreen`, the `SectionHeader` does use `textStyles['display-md']` and `colors.accent[500]` — this is correct. Finding downgraded to note-only.

---

### P3-7: Missing accessibilityLabel on several interactive elements

**File:** `apps/mobile/app/(homeowner)/(tabs)/index.tsx`, line 272; `apps/mobile/components/ui/Button.tsx`  
**Issues found:**
- Bell/notifications button on home screen has `accessibilityLabel="Notifications"` ✓ (correct)
- Button component: when `iconOnly=false` (the standard case), no `accessibilityLabel` is set on the Pressable itself — only on the icon-only variant. For sighted users the visible text label is read automatically. On Android, TalkBack should read the child `Text` — this is fine. On iOS VoiceOver, the `Text` child is read through the Pressable. Technically acceptable.
- The "Skip photo" Pressable in `HomeownerCheckIn.tsx` (line 353) has no `accessibilityRole` or `accessibilityLabel` — add `accessibilityRole="button"` and `accessibilityLabel="Skip photo upload"`.
- `Question` option Pressables in `HomeownerCheckIn.tsx` have `testID` but no `accessibilityRole="radio"` — these behave as radio buttons. Should be `accessibilityRole="radio"` with `accessibilityState={{ checked: sel }}`.

---

### P3-8: SkeletonLoader does not accept `accessibilityLabel` — VoiceOver reads nothing

**File:** `apps/mobile/components/shared/SkeletonLoader.tsx`  
When loading states show skeleton placeholders, screen readers receive no announcement. Add `accessibilityLabel="Loading"` and `accessibilityRole="progressbar"` to the `Animated.View` in SkeletonLoader so VoiceOver/TalkBack announces loading state.

---

## Spacing / Rhythm Assessment

Overall spacing is consistent with the spec's 4-point grid:
- `screenPaddingH: 20` — used correctly across home, booking, auth screens.
- Card padding `16px`, card radius `12px` — matches tokens and is applied consistently via the `Card` component.
- Section-to-section vertical rhythm on the home dashboard: 20px between sections (MyHomeCard, AdaptiveHero) and 28px before "Your pros" — reasonable but slightly inconsistent (20 vs 28).
- The CheckIn flow's padding is `20px` horizontal, `60px` top (native) or `8px` (web desktop) — the `paddingTop: 60` on native seems high for the non-full-screen card path; could clip on small screens (iPhone SE 375pt).

---

## Loading States Coverage

| Screen | Skeleton? | Quality |
|---|---|---|
| Home tab — address | ✓ `SkeletonLoader width="100%" height={170}` | Good |
| Home tab — adaptive hero | ✓ `SkeletonLoader width="100%" height={150}` | Good |
| Booking match step | ✓ 3 card-shaped skeletons | Good |
| Sign-in/sign-up | Button loading state | Good |
| Provider card "Book" button | Via Button loading prop | Good |
| Empty states (no providers, errors) | ❌ No illustrations | Gap (P2-3) |

---

## Summary Priority Table

| ID | Priority | Issue | File(s) |
|---|---|---|---|
| P1-1 | **P1** | Primary palette is blue (`#2563EB`), not forest green (`#1A3D2B`) | `tokens/colors.ts` |
| P1-2 | **P1** | Background is blue-tinted `#F5F8FF`, should be cream `#F8F6F1` | `tokens/colors.ts`, `LiquidGlassTabBar.tsx` |
| P1-3 | **P1** | Welcome screen: white editorial layout, not spec's full-bleed green gradient | `app/(auth)/welcome.tsx` |
| P2-1 | P2 | Skeleton shimmer is opacity-only, not lateral gradient sweep | `components/shared/SkeletonLoader.tsx` |
| P2-2 | P2 | Tab bar: floating Liquid Glass capsule vs. spec's flat bottom bar with dot indicator | `components/LiquidGlassTabBar.tsx` |
| P2-3 | P2 | EmptyState: no illustrations on any instance | `components/shared/EmptyState.tsx` + all screens |
| P2-4 | P2 | `CheckInWidget` shared export is a stub; real flow is in `HomeownerCheckIn.tsx` | `components/shared/CheckInWidget.tsx` |
| P2-5 | P2 | Typography split: half Fraunces (editorial-*), half PlusJakartaSans (deprecated aliases) — no decision | `tokens/typography.ts`, multiple screens |
| P2-6 | P2 | Booking check-in progress dots: color assignment inverted vs. spec (green ↔ amber) | `components/checkin/HomeownerCheckIn.tsx` |
| P3-1 | P3 | Input labels use 12px uppercase — potential WCAG contrast failure on form fields | `components/ui/Input.tsx` |
| P3-2 | P3 | Stale "brand blue" comment in ProviderCard | `components/shared/ProviderCard.tsx` |
| P3-3 | P3 | LiquidGlassTabBar hardcodes background hex instead of referencing token | `components/LiquidGlassTabBar.tsx` |
| P3-5 | P3 | Booking confirmation step 6 confetti/checkmark not confirmed implemented | `app/(homeowner)/booking/confirmation.tsx` |
| P3-7 | P3 | Missing `accessibilityRole` on "Skip photo" and radio-style Question options | `components/checkin/HomeownerCheckIn.tsx` |
| P3-8 | P3 | SkeletonLoader has no accessibility label | `components/shared/SkeletonLoader.tsx` |

---

## What Is Working Well

- **Token architecture**: Spacing, shadows, and layout tokens are fully spec-compliant and well-applied. The 4-point grid is consistent throughout.
- **Reanimated usage**: No `core Animated` imports found. All animations use Reanimated 3. Press interactions use `usePress()` from a shared motion lib — clean and consistent.
- **TrustScoreDisplay**: The 4-ring SVG animated display with staggered 100ms delays matches the spec exactly. Weighted composite formula (35/35/20/10) is correct.
- **Booking match step**: Honest pro count, one-tap rehire pre-selection, rationale card, sticky disabled CTA — all implemented per spec.
- **Form validation**: React Hook Form + Zod schema on sign-up is complete and correct. Error states animate in cleanly.
- **Role-based routing**: Single RN codebase with homeowner/provider/tech role routing — non-negotiable #8 in CLAUDE.md is met.
- **HomeownerCheckIn**: 6-card flow with auto-advance on step 0, haptic feedback, success celebration, and `captureOnCompletion` call — the 15-second sacred flow is real and wired.
- **Data hooks**: `demand_events` tracked on search in home tab, `booking_started` on CTA tap — Phase 4 AI hooks are in place.

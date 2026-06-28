# Booking Wizard — Redesign Spec

**Date:** 2026-06-24  
**Scope:** `apps/mobile/app/(homeowner)/booking/*` + `_layout.tsx` + `stores/bookingStore.ts`  
**Agent:** booking-and-checkin

---

## 1. Problems Being Solved

| # | Problem | Root cause |
|---|---------|------------|
| 1 | Subscription vs one-time choice is buried below 10 service cards | It only appears after a service is selected and the user has scrolled past the grid |
| 2 | Schedule step asks homeowners to pick a specific date/time | Providers control their own schedules; the slots shown are static and not provider-aware |
| 3 | Pre-selected service (from catalog) still renders all 10 service cards | `params.service` pre-fills the store value but doesn't change the UI layout |
| 4 | Match step has no timeout — loading skeleton runs forever on slow/hanging network | No `setTimeout` guard; `isLoading` stays `true` indefinitely if the network request hangs |

---

## 2. New Flow (5 Steps, Down from 6)

```
service-select → match → details → payment → confirmation
```

The `schedule` route is removed entirely. Timing preference (4 chips) moves into step 1.

**New `STEP_ROUTES`** in `_layout.tsx`:
```ts
const STEP_ROUTES = [
  'service-select',
  'match',
  'details',
  'payment',
  'confirmation',
] as const;
```

**New `STEP_LABELS`**:
```ts
const STEP_LABELS = {
  'service-select': 'Service',
  match: 'Match',
  details: 'Details',
  payment: 'Payment',
  confirmation: 'Confirmed',
};
```

The "Step X of 6" footer text updates automatically from the array length.

---

## 3. Scheduling Model (Conceptual Change)

**Old model (wrong):** Homeowner picks a specific date + one of 5 fixed time slots. Provider is expected to show up at that time. No provider availability is consulted.

**New model:** Homeowner expresses a *preferred window* (rough urgency). Provider, after seeing the booking request in their queue, confirms a specific day and time within their availability. Homeowner receives an in-app/push notification.

**Why this is right:** Providers set availability in `provider_availability` (day_of_week, start_time, end_time). Their real-world schedule is not the same as a static list of 5 slots. The old UX creates a false expectation ("come at 10am Tuesday") that providers cannot guarantee.

**MVP implementation:** The `scheduledAt` field in the DB is populated with a *soft deadline* computed from the chosen window. The confirmation screen shows the window label + "Your provider will confirm a specific day." The provider-side time-proposal flow (propose → homeowner accepts) is a follow-on feature; this spec creates the homeowner-facing half.

**Soft deadline computation** (add to `service-select.tsx`):
```ts
function windowToDate(window: PreferredWindow): Date {
  const now = new Date();
  switch (window) {
    case 'this_week':       // end of this Sunday
      return endOfWeek(now, { weekStartsOn: 1 });
    case 'next_1_2_weeks':  // 14 days from now
      return addDays(now, 14);
    case 'this_month':      // end of current month
      return endOfMonth(now);
    case 'flexible':        // 30-day soft placeholder
      return addDays(now, 30);
  }
}
```

Import `endOfWeek`, `endOfMonth` from `date-fns` (already in lockfile).

---

## 4. Data Model Changes

### 4.1 `bookingStore.ts`

Add one field and one setter:

```ts
preferredWindow: 'this_week' | 'next_1_2_weeks' | 'this_month' | 'flexible' | null;
setPreferredWindow: (w: PreferredWindow | null) => void;
```

Export `PreferredWindow` type from `lib/types.ts`:
```ts
export type PreferredWindow = 'this_week' | 'next_1_2_weeks' | 'this_month' | 'flexible';
```

Initial value: `preferredWindow: null`.

Remove `scheduledAt` setter from the service-select step — it now gets set in `service-select.tsx` via `setScheduledAt(windowToDate(preferredWindow))` when the user taps Continue.

The `scheduledAt` field and its setter remain in the store; they're still needed by `payment.tsx` → `bookings.create()`.

---

## 5. Step 1: `service-select.tsx` (Major Redesign)

### 5.1 Entry Modes

**Mode A — Fresh arrival** (`!params.service` or `serviceType === null`)  
Show the full service grid. After the user taps a service card, auto-scroll to sub-section B.

**Mode B — Pre-selected arrival** (`params.service` is set and `serviceType` is populated on mount)  
Do NOT render the 10-card grid. Instead, render a compact locked service row at the top of the screen, then jump directly to sub-section B (subscription/frequency).

### 5.2 Layout: Top-to-Bottom Element Order

```
[Address missing warning — only if !addressId]

[Sub-section A: Service Selection — only in Mode A]
  editorial-title: "What service do you need?"
  body-md subhead: "Pick a service and compare vetted pros near you."
  Animated service grid (10 cards, staggered FadeInDown)

[Compact selected service — only in Mode B, or Mode A after selection]
  Row: service icon tint • service label • price range • "Change" link
  (tapping "Change" clears serviceType, returns to Mode A grid)

[Sub-section B: How to book — appears after service selection, FadeIn]
  title-lg: "How would you like to book?"
  Two large cards (BookingTypeCard — NOT pills):
    Card 1: "Subscription" (highlighted, primary[600] border if selected)
      body-sm: "Billed per visit · pause anytime"
      badge: "Save 10%" (accent[500] background, textInverse color)
    Card 2: "One-time"
      body-sm: "Pay per visit, no commitment"
  [If supportsSubscription === false (tree): single card "One-time only for this service" + Pill tone="info"]

  [Frequency row — only if bookingType === 'subscription', FadeIn]
    Frequency chips (horizontal, pill-shaped, full-width spread)
    Estimated price blurb (body-sm, numericTabular)

[Sub-section C: When do you need this? — appears after bookingType is set, FadeIn]
  title-lg: "When do you need this?"
  4 chips (full-width, 2 per row, pill-shaped):
    "This week"      | "Next 1–2 weeks"
    "This month"     | "I'm flexible"
  body-sm hint: "Your provider will confirm a specific day once matched."

[Continue button — sticky footer]
```

### 5.3 `canContinue` Logic

```ts
const canContinue =
  !missingAddress &&
  !!serviceType &&
  !!bookingType &&
  (bookingType !== 'subscription' || !!frequency) &&
  !!preferredWindow;
```

### 5.4 Continue Action

```ts
const onContinue = () => {
  setScheduledAt(windowToDate(preferredWindow!));
  router.push('/(homeowner)/booking/match');
};
```

### 5.5 BookingTypeCard Component (new, replaces `BookingTypePill`)

Replace the existing `BookingTypePill` (paddingVertical: 18, pill shape) with `BookingTypeCard`:

```
BookingTypeCard props: { label, subtitle, badge?, selected, onPress, testID }
Style:
  flex: 1
  paddingVertical: 20
  paddingHorizontal: 16
  borderRadius: 16
  borderWidth: 2
  borderColor: selected ? colors.primary[600] : colors.border
  backgroundColor: selected ? colors.primary[50] : colors.surface
  gap: 6
  alignItems: 'flex-start'  ← left-aligned, not centered

Contents (top to bottom):
  Row: title-md label + (if selected) check circle 26×26 primary[600]
  body-sm subtitle (textSecondary)
  (if badge) Pill: label={badge} tone="accent" (small, self-contained)
```

Left-alignment matters here: "Subscription" vs "One-time" reads as a real choice, not a toggle button. The badge anchors to the label, making it scannable.

### 5.6 PreferredWindowChip Component (new, inline)

```
4 chips in a 2×2 grid (View with flexDirection:'row', flexWrap:'wrap', gap:8):

Each chip:
  flex: 1
  minWidth: '45%'
  paddingVertical: 14
  paddingHorizontal: 12
  borderRadius: 12
  borderWidth: 1.5
  borderColor: selected ? colors.primary[600] : colors.border
  backgroundColor: selected ? colors.primary[600] : colors.surface

Text: title-md, color: selected ? textInverse : textPrimary
```

Window labels and IDs:
```ts
const WINDOWS = [
  { id: 'this_week',       label: 'This week' },
  { id: 'next_1_2_weeks',  label: 'Next 1–2 weeks' },
  { id: 'this_month',      label: 'This month' },
  { id: 'flexible',        label: "I'm flexible" },
] as const;
```

testID pattern: `booking-service-select-window-{id}` (e.g. `booking-service-select-window-this_week`)

### 5.7 Auto-scroll Behavior

In Mode A (grid visible), after a service card is tapped, call `scrollViewRef.current?.scrollTo({ y: subscriptionSectionY, animated: true })`. Capture `subscriptionSectionY` via `onLayout` on the sub-section B container. This brings the booking type choice into view without the user having to scroll.

```ts
const scrollViewRef = useRef<ScrollView>(null);
const [subscriptionSectionY, setSubscriptionSectionY] = useState(0);

// In sub-section B container:
onLayout={(e) => setSubscriptionSectionY(e.nativeEvent.layout.y)}

// In service card onPress:
setServiceType(svc.id);
setTimeout(() => {
  scrollViewRef.current?.scrollTo({ y: subscriptionSectionY, animated: true });
}, 80); // slight delay for layout to settle
```

### 5.8 testIDs (maintain existing pattern)
- `booking-step-service-select` (root View)
- `booking-service-card-{id}` (each service card — unchanged)
- `booking-service-select-type-subscription` (subscription BookingTypeCard — renamed from pill)
- `booking-service-select-type-one-off` (one-time BookingTypeCard)
- `booking-service-select-freq-{id}` (frequency chips — unchanged)
- `booking-service-select-window-{id}` (NEW — preferred window chips)
- `booking-service-select-next` (Continue button — unchanged)
- `booking-service-select-change-service` (NEW — "Change" link in compact mode)

---

## 6. Step 2: `match.tsx` (Improved States)

### 6.1 Loading Timeout Guard

Add to the component:
```ts
const [timedOut, setTimedOut] = useState(false);

useEffect(() => {
  if (!showLoading) return; // already resolved
  const t = setTimeout(() => setTimedOut(true), 8000);
  return () => clearTimeout(t);
}, [showLoading]);

// Reset if the query resolves before timeout
useEffect(() => {
  if (!showLoading) setTimedOut(false);
}, [showLoading]);
```

### 6.2 State Priority Order (top to bottom in render)

```
1. showLoading && !timedOut  → SkeletonLoader (existing)
2. showLoading && timedOut   → TimeoutState (new)
3. isError                   → QueryErrorState (existing, but add Retry)
4. !zip || proCount === 0    → EmptyNoProviders (redesigned)
5. proCount >= 1             → Shortlist (existing)
```

### 6.3 TimeoutState (new inline component)

Position: centered, same container as loading skeleton.

```
View (flex:1, padding:24, alignItems:'center', justifyContent:'center', gap:20)
  EmptyState
    heading: "Taking a bit longer than usual"
    body: "Check your connection, then tap retry."
    ctaLabel: "Retry"
    onCta: () => { setTimedOut(false); refetch(); }
```

`refetch` comes from the `useQuery` return: destructure `refetch` from the providers query.

testID: `booking-match-timeout-retry` on the internal Button rendered by EmptyState.

### 6.4 EmptyNoProviders State (redesigned)

**Current**: Single EmptyState with no actions, passive copy.

**New**: Two-action EmptyState with demand capture.

```
View (flex:1, padding:24)
  EmptyState
    heading: "No pros in your area yet"
    body: "We're growing fast. We'll notify you the moment a vetted pro becomes available."
    ctaLabel: "Notify me"
    onCta: handleNotifyMe

  [Secondary action — below EmptyState, not inside it]
  Pressable: "Try a different service →"
    textStyle: body-sm, fontFamily: Inter_600SemiBold, color: colors.primary[600]
    onPress: () => router.back()
    testID: "booking-match-try-different"
```

**`handleNotifyMe` implementation:**
```ts
const [notifyRequested, setNotifyRequested] = useState(false);

const handleNotifyMe = async () => {
  try {
    await track({
      event: 'demand_event',
      serviceType: serviceType ?? undefined,
      metadata: { zip, reason: 'no_providers_available', bookingType },
    });
    setNotifyRequested(true);
  } catch {
    // silent — demand event is best-effort
    setNotifyRequested(true);
  }
};
```

After `notifyRequested` is true, replace the EmptyState CTA with an inline confirmation:
```
Pill label="We'll let you know when a pro is available" tone="success"
```

This writes to `demand_events` via the existing `track()` function, which the Operator Graph reads for coverage expansion decisions.

testID: `booking-match-notify-me` (the Notify me Button inside EmptyState).

### 6.5 Single Provider Case

Do not auto-select. Show the 1-card carousel normally. The "Continue with this pro" button title changes to "Book with [provider.name]" when only 1 provider is in the list and it is selected. This makes the choice feel explicit, not automatic.

```ts
const ctaLabel =
  selectedId && proCount === 1
    ? `Book with ${shortlist[0]?.name ?? 'this pro'}`
    : 'Continue with this pro';
```

### 6.6 Existing Match Step Elements (unchanged)

- Horizontal carousel with `ProviderCard` variant="shortlist"
- Trust rationale card (springs in on selection)
- Pre-selection of `matchedProviderId` from "Your Pros" rehire path
- `booking-match-next` testID on CTA
- `booking-match-provider-card-{id}` testIDs on cards

### 6.7 Remove `scheduledAt` Navigation Dependency

The match step currently navigates from `schedule.tsx`. After removing that step, it is entered directly from `service-select.tsx`. No change to the match step's internal logic is needed for this; the `scheduledAt` value is now set in `service-select.tsx`'s `onContinue`.

---

## 7. Step 3: `details.tsx` (Minor Fix)

### 7.1 Wire the "Edit" address button

Currently the Edit `Pressable` has no `onPress`. Fix:
```tsx
onPress={() => router.push('/(homeowner)/profile/address' as never)}
```

If a dedicated address-edit route doesn't exist yet, push to `/(auth)/address-setup` as a fallback (matching the warning card in service-select). Leave a `// TODO: replace with address-edit route` comment.

### 7.2 No Other Changes

The details step layout, photo picker stub, save-instructions toggle, testIDs, and Continue navigation to `/payment` are all unchanged.

---

## 8. Step 4: `payment.tsx` (Unchanged)

No changes. The payment step already correctly reads `scheduledAt` from the store (set in `service-select.tsx` → `windowToDate(preferredWindow)`), includes it in `bookings.create()`, and navigates to confirmation.

The `isNewProvider` escrow card, Stripe PaymentSheet stub, and price breakdown are all unchanged.

---

## 9. Step 5: `confirmation.tsx` (Copy Update)

### 9.1 Scheduled-at Display

The confirmation card currently renders:
```tsx
<Row Icon={CalendarDays} text={scheduledAt ? format(scheduledAt, "EEE, MMM d 'at' h:mm a") : 'TBD'} />
```

Replace with a preferred-window-aware display:

```tsx
// Add to component:
const preferredWindow = useBookingStore((s) => s.preferredWindow);

const WINDOW_LABELS: Record<string, string> = {
  this_week:      'This week',
  next_1_2_weeks: 'Next 1–2 weeks',
  this_month:     'This month',
  flexible:       'When convenient',
};

const scheduledText = preferredWindow
  ? WINDOW_LABELS[preferredWindow] ?? 'TBD'
  : scheduledAt
    ? format(scheduledAt, "EEE, MMM d 'at' h:mm a")
    : 'TBD';

// In the Row:
<Row Icon={CalendarDays} text={scheduledText} />
```

### 9.2 Confirmation Note

Below the Row for CalendarDays (still inside the Card), add:
```tsx
<Text style={{ ...textStyles['body-sm'], color: colors.textTertiary, marginTop: 6 }}>
  Your provider will confirm a specific day and time.
</Text>
```

This sets the right expectation without alarming the user.

### 9.3 No Other Changes

The celebration animation, confetti particles, "We've sent confirmation to your email" copy, View job / Back to home buttons, and track() call are all unchanged.

---

## 10. `_layout.tsx` (Step Count Update)

### 10.1 Remove `schedule` from `STEP_ROUTES`

```ts
const STEP_ROUTES = [
  'service-select',
  'match',
  'details',
  'payment',
  'confirmation',
] as const;
```

### 10.2 Remove `schedule` from `STEP_LABELS`

```ts
const STEP_LABELS: Record<(typeof STEP_ROUTES)[number], string> = {
  'service-select': 'Service',
  match:            'Match',
  details:          'Details',
  payment:          'Payment',
  confirmation:     'Confirmed',
};
```

### 10.3 Desktop Sidebar

The "What happens next" sidebar on desktop iterates `STEP_ROUTES`. After removing `schedule`, it will automatically show 5 items instead of 6. No other change needed.

### 10.4 Footer Step Counter

The footer `Step {currentIdx + 1} of {STEP_ROUTES.length}` calculates dynamically. Will now read "Step 1 of 5", "Step 2 of 5", etc. automatically.

---

## 11. Loading & Error States Summary

| Step | State | Component | Behavior |
|------|-------|-----------|----------|
| service-select | missing address | `Card tone="tinted" tintColor={warningLight}` | Blocks Continue, shows "Set your address" CTA |
| match | address loading | `SkeletonLoader` × 3 | Existing |
| match | providers loading (<8s) | `SkeletonLoader` × 3 + "Finding vetted pros…" text | Existing |
| match | providers loading (≥8s) | `EmptyState` heading="Taking a bit longer than usual" + Retry | **NEW** |
| match | network error | `QueryErrorState` with `refetch` | Existing |
| match | zero providers | `EmptyState` + "Notify me" + "Try a different service" | **REDESIGNED** |
| match | ≥1 providers | horizontal carousel + trust rationale | Existing |
| payment | provider load error | `QueryErrorState` with `refetchProvider` | Existing |
| payment | submitting | Button loading state | Existing |
| payment | submission error | Inline error text below cards | Existing |

---

## 12. Edge Cases

### 12.1 Pre-selected service with no subscription support (tree)

Mode B (compact service display) + sub-section B shows the `Pill label="One-time only for this service" tone="info"` (no BookingTypeCard toggle). Sub-section C (window picker) still renders. `bookingType` is force-set to `'one_off'` and `frequency` to `null` as currently coded.

### 12.2 User taps "Change" in compact service mode

Action: `setServiceType(null); setBookingType(null); setFrequency(null); setPreferredWindow(null);`

This resets sub-sections B and C and reveals the full grid. The URL does NOT change (the `service` query param remains, but `serviceType` is now null in the store). If the user selects a new service, it overrides the param.

### 12.3 Back navigation from match to service-select

Back nav returns to service-select in whatever mode it was in (Mode A or B). The store values persist (service, bookingType, frequency, preferredWindow). The compact service row and all sub-sections show the previously selected state. The user can edit any sub-section.

### 12.4 Zero providers + "Notify me" already tapped

If the user taps "Notify me" and then goes back and re-enters the match step with the same service/zip, `notifyRequested` is `useState(false)` — local component state, not persisted. So it resets. This is fine for MVP; the demand event was already written to the DB.

### 12.5 Provider availability vs preferred window mismatch

No validation at booking time. The provider sees the request with the preferred window label in their job queue. This is acceptable for MVP — the provider declines or proposes an alternative via messaging.

### 12.6 Deep-link to `/booking/schedule`

After removing this route, any deep-link to `/booking/schedule` will 404. The booking entry points (catalog cards, home reminders) link to `/booking/service-select` or `/booking/service-select?service=lawn` — the schedule route is never deep-linked from outside the wizard. Verify no external push notifications reference this route before deletion.

### 12.7 `scheduledAt` in DB is a soft placeholder

`payment.tsx → bookings.create()` passes `scheduledAt.toISOString()`. For `preferredWindow: 'this_week'`, this is e.g. `2026-06-28T23:59:59.000Z`. The `jobs` table display in the admin panel will show this date. Add a note to the admin UI (`apps/admin`) that `scheduled_at` for new bookings is a "preferred window deadline" not a confirmed appointment. This is a follow-on admin annotation task.

---

## 13. Animation Specs

All animations use Reanimated 4 via the existing `lib/motion.ts` helpers.

| Element | Animation | Spec |
|---------|-----------|------|
| Sub-section B (booking type) appears | `FadeIn.duration(220)` | Same as current "How often?" reveal |
| BookingTypeCard selection | Press scale via `usePress()` hook | Same as existing AnimatedPressable pattern |
| Sub-section C (window picker) appears | `FadeIn.duration(220)` | After `bookingType` is set |
| Preferred window chip selection | None (no spring) | Chips use `borderColor` + `backgroundColor` state, no animation — keeps it snappy |
| Match timeout state | `FadeIn.duration(300)` | Gentle fade from skeleton to timeout card |
| Match notify confirmation Pill | `FadeIn.duration(200)` | Replaces CTA on tap |

---

## 14. Data Sources per Step

| Step | Tables / Edge Functions | New calls |
|------|------------------------|-----------|
| service-select | `addresses` (primary address — existing) | None |
| match | `providers-search` edge fn (existing), `generate-trust-rationale` edge fn (existing), `demand_events` write via `track()` | `track({ event: 'demand_event', ... })` in handleNotifyMe |
| details | None (bookingStore only) | None |
| payment | `providers` table (detail), `booking-create` edge fn, `create-payment-intent` edge fn | None |
| confirmation | `providers` table (detail — cached from payment step), `track({ event: 'booking_completed' })` | Read `preferredWindow` from store |

---

## 15. Files to Change

| File | Type of change |
|------|----------------|
| `app/(homeowner)/booking/_layout.tsx` | Remove 'schedule' from STEP_ROUTES and STEP_LABELS |
| `app/(homeowner)/booking/service-select.tsx` | Major redesign: Mode A/B, BookingTypeCard, PreferredWindowChip, auto-scroll, `preferredWindow` state |
| `app/(homeowner)/booking/schedule.tsx` | **DELETE** |
| `app/(homeowner)/booking/match.tsx` | Add timeout guard, redesign empty state, fix single-provider CTA label |
| `app/(homeowner)/booking/details.tsx` | Wire Edit address button |
| `app/(homeowner)/booking/confirmation.tsx` | Read `preferredWindow`, update CalendarDays row, add confirmation note |
| `stores/bookingStore.ts` | Add `preferredWindow` field and `setPreferredWindow` setter |
| `lib/types.ts` | Export `PreferredWindow` type |

---

## 16. Design Decisions Red-Teamed

### "Why not ask subscription vs one-time FIRST (before service)?"
Rejected. The user can't make this choice in a vacuum. "Do I want weekly or one-time?" requires knowing they're booking lawn care. Monthly pest control vs one-time tree trimming are completely different mental models. The choice must be contextual. Sub-section B (after service selection) is the earliest viable placement.

### "Why not a separate 'schedule' step showing provider availability slots?"
This requires a new API: fetch available slots per provider per window. That's a day of backend work (query `provider_availability`, subtract `provider_blocked_times`, generate slot candidates). More importantly, it encodes a broken contract: homeowners set the time, providers show up. Real service businesses confirm appointments, they don't just accept any slot a customer picks. The 4-chip preferred window is honest about how this actually works and takes 30 seconds for the user to complete.

### "Why not auto-select the single provider in the match step?"
Auto-selection removes user agency. HomeBase's trust model requires the homeowner to actively choose who enters their home. Showing the provider card and requiring a tap (even if it's the only option) maintains this intentionality and keeps the trust rationale card visible. If we auto-select, the user never sees the trust score explanation.

### "Why 4 fixed window chips instead of a date range picker?"
A date range picker adds interaction cost and creates false precision (the user selects "Jun 26–Jun 28" but the provider can't guarantee those specific days). The 4 chips ("This week", "Next 1–2 weeks", "This month", "I'm flexible") capture real user intent (urgency level) at near-zero interaction cost. They also map cleanly to the soft-deadline computation for `scheduled_at`.

### "Won't removing the schedule step confuse users about when the provider is coming?"
The confirmation screen now explicitly says "Your provider will confirm a specific day and time." This sets the right expectation. The soft-deadline model (window as a deadline, not an appointment) is what async service marketplaces actually use. Uncertainty about exact timing is the honest state at booking time.

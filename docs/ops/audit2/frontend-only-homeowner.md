# Homeowner Frontend Audit — Inert / Hardcoded / Non-functional Elements

**Scope:** `apps/mobile/app/(homeowner)/**` and all shared components consumed exclusively by homeowner screens.
**Method:** Static read — no code modified, no DB queries run.
**Date:** 2026-06-24

---

## Priority Key

| Level | Meaning |
|---|---|
| P0 | Revenue-blocking or blocks core user flow entirely |
| P1 | Prominent UI element does nothing; homeowner hits a dead end |
| P2 | Fake/hardcoded data shown as if real; misleads the user |
| P3 | Missing feedback; silent failure; quality regression |

---

## P0 — Revenue-Blocking

### 1. Booking payment: card capture is a complete stub
**File:** `apps/mobile/app/(homeowner)/booking/payment.tsx:86–102`

The "Add a card" sheet collects card number, expiry, and CVC but ignores all three. `handleAddCard` always calls:
```ts
payments.attachPaymentMethod({ paymentMethodId: 'pm_card_visa' })
```
with a hardcoded Stripe test token, regardless of input. The UI even shows the disclaimer "Demo mode: card details are stubs" (lines 371, 462). Completing the booking therefore never captures real payment details.

**What it should do:** Tokenize the card via `@stripe/stripe-react-native` `PaymentSheet` or `createPaymentMethod`, then pass the returned `PaymentMethod.id` to `payments.attachPaymentMethod`. The code comment at line 90–97 explicitly acknowledges this as deferred.

**Missing:** `@stripe/stripe-react-native` integration; the three Input fields are decorative for now.

---

### 2. Postings detail: "Review X quotes" button has no `onPress`
**File:** `apps/mobile/app/(homeowner)/postings/[id].tsx:183–190`

When `posting.status === 'open'` and `posting.matchCount > 0`, a "Review N quotes" button is rendered but wired to nothing:
```tsx
<Button
  label={`Review ${posting.matchCount} ${posting.matchCount === 1 ? 'quote' : 'quotes'}`}
  variant="outline"
  style={{ marginTop: 12 }}
/>
```
No `onPress` prop. Tapping does nothing. This is the primary CTA once providers have responded.

**What it should do:** Navigate to a quotes comparison screen (route does not exist yet — likely `/(homeowner)/postings/quotes/[id]` or a modal showing provider quote cards with trust scores and pricing).

**Missing:** Quotes comparison screen + route; `onPress` wiring.

---

### 3. Postings detail: "Message" and "Schedule" buttons both dead in matched state
**File:** `apps/mobile/app/(homeowner)/postings/[id].tsx:224–231`

When `posting.status === 'matched'` and `matchedProvider` is loaded, two action buttons are shown but neither has an `onPress`:
```tsx
<Button label="Message" variant="outline" leftIcon={...} style={{ flex: 1 }} />
<Button label="Schedule" style={{ flex: 1 }} />
```
The homeowner has been matched with a provider and can do nothing from this screen.

**What they should do:**
- **Message:** Navigate to `/(homeowner)/thread/{jobId}` where `jobId` is the job spawned from this posting match. If no job exists yet, should create a pre-booking thread or be disabled.
- **Schedule:** Push into the booking flow with `matchedProviderId` and `serviceType` pre-populated (same pattern as `YourProsRow` rehire).

**Missing:** Job ID resolution from posting → job; routing; both `onPress` handlers.

---

### 4. Postings detail: "Close this posting" button has no `onPress`
**File:** `apps/mobile/app/(homeowner)/postings/[id].tsx:261`

Rendered when `posting.status === 'open'` in the sticky footer:
```tsx
<Button label="Close this posting" variant="ghost" fullWidth />
```
No `onPress`. Tapping does nothing.

**What it should do:** Call `api.postings.close(posting.id)` (or `api.postings.update(id, { status: 'expired' })`), invalidate the `['postings', 'detail', id]` and `['postings', 'all', userId]` query keys, and navigate back.

**Missing:** `api.postings.close` implementation (check if it exists in `lib/api/postings.ts`); `onPress` handler.

---

## P1 — Prominent Inert UI

### 5. "My Home" card does nothing when tapped
**Files:** `apps/mobile/app/(homeowner)/(tabs)/index.tsx:301–317` and `apps/mobile/components/home/MyHomeCard.tsx:36–188`

In `index.tsx`, `MyHomeCard` is rendered without an `onPress` prop:
```tsx
<MyHomeCard
  addressLine={address.street}
  cityStateZip={`${address.city}, ${address.state} ${address.zip}`}
  frontViewUrl={frontViewUrl ?? null}
  lat={lat}
  lng={lng}
  stats={stats}
  onPressReminders={() => router.push('/(homeowner)/reminders')}
/>
```

`MyHomeCard` at line 166 of the component renders as `<View>` (not `AnimatedPressable`) when `onPress` is absent. The `ChevronRight` icon on line 109 of `MyHomeCard.tsx` implies the card is tappable, but it is not.

**What it should do:** Navigate to a home detail/history page (e.g., `/(homeowner)/home`) showing service history, photos of the home, upcoming and past jobs grouped by service type, and aggregate stats. This screen does not yet exist.

**Missing:** Home detail route + screen; `onPress` prop wired in `index.tsx`.

---

### 6. Inbox: Paperclip attachment button is decorative
**File:** `apps/mobile/app/(homeowner)/(tabs)/inbox.tsx:365`

In the desktop `ThreadDetail` inline panel, the send-compose bar contains:
```tsx
<Pressable hitSlop={8}>
  <Paperclip size={20} color={colors.textSecondary} />
</Pressable>
```
No `onPress`. The Paperclip renders and is interactive visually (has `hitSlop`) but does nothing.

**What it should do:** Open an image/file picker (`expo-image-picker` or `expo-document-picker`), upload the selected asset to Supabase Storage via `uploadAsset`, and call `sendMessage` with an `attachmentUrl` field.

**Missing:** `onPress` handler; upload logic; `messages` table / `sendMessage` API needs an `attachmentUrl` column or a separate `attachments` table; the `Bubble` component needs to render attachments.

Note: The mobile `/(homeowner)/thread/[id].tsx` screen likely has the same issue — check that file if needed.

---

### 7. Provider profile "Message" button misroutes
**File:** `apps/mobile/app/(homeowner)/providers/[id].tsx:187–189`

`handleMessage` is:
```ts
const handleMessage = () => {
  router.push('/(homeowner)/(tabs)/inbox');
};
```

This navigates to the inbox list, not to a specific conversation thread. At browse time (before any booking), there is no job thread linking the homeowner to this provider. The homeowner ends up on an empty inbox or sees an unrelated thread list.

**What it should do:** Either (a) look up if an existing job/thread exists between this homeowner and provider and deep-link to `/(homeowner)/thread/{jobId}`, or (b) disable the Message button with a tooltip ("Book first to message this pro"), or (c) create a pre-booking inquiry thread.

**Missing:** Thread lookup by `(homeownerId, providerId)` pair; conditional routing; or an inquiry thread creation endpoint.

---

## P2 — Hardcoded / Fake Data Shown as Real

### 8. Service catalog prices are static strings, not from DB
**File:** `apps/mobile/app/(homeowner)/(tabs)/book.tsx:44–55`

The 10 service cards display prices like `"From $45/visit"`, `"From $80/visit"`, etc., hardcoded in the JS bundle:
```ts
const SERVICES = [
  { id: 'lawn', price: 'From $45/visit', ... },
  { id: 'cleaning', price: 'From $80/visit', ... },
  ...
```

These never reflect actual provider `priceRangeMinCents` / `priceRangeMaxCents` values. A homeowner may see $45 on the catalog and then land on a $95 quote on the payment step — a trust-eroding gap.

**What it should do:** Either remove the price from the catalog card (it's a discovery surface, not a quoting surface), or derive it from a market minimum across providers in the homeowner's ZIP. The payment step already shows a real price from `provider.priceRangeMinCents`.

**Missing:** Nothing to wire per se — a product decision is needed first. The card should drop the price string or label it "typically" with an `*`.

---

### 9. Provider "since X year" is a fabricated formula
**File:** `apps/mobile/app/(homeowner)/providers/[id].tsx:432–434`

The provider trust card shows:
```tsx
<Text ...>since {new Date().getFullYear() - Math.floor(provider.checkInCount / 18)} on MyHomebase</Text>
```

This is a made-up calculation (checkInCount ÷ 18 = assumed years). A provider with 36 check-ins would show "since 2024" even if they joined in 2023 or 2025. It's a fabricated statistic.

**What it should do:** Use the provider's actual `createdAt` (or a `joinedYear` field). The `api.providers.detail()` response should expose this. Verify the type in `lib/types.ts` and the query in `lib/api/providers.ts` — if `created_at` is not selected, add it.

**Missing:** `provider.createdAt` field in the detail response; replace the formula with `new Date(provider.createdAt).getFullYear()`.

---

## P3 — Silent Failures / Missing Feedback

### 10. Check-in window expiry is silent on job detail
**File:** `apps/mobile/app/(homeowner)/job/[id].tsx:103–105`

```ts
const within48h = completedAt && Date.now() - completedAt.getTime() < 48 * 60 * 60 * 1000;
const checkInEligible = job.status === 'completed' && within48h;
```

When the 48-hour window has passed, `checkInEligible` is `false` and the "Submit check-in" button simply disappears. The homeowner sees a completed job with no indication that they missed the check-in window and no path to leave feedback. The check-in is the primary trust-score input; silently dropping the CTA loses that signal.

**What it should do:** When `job.status === 'completed' && !within48h`, render a muted notice: "Check-in window closed (48h after completion)". Optionally link to a short-form satisfaction survey as a fallback.

**Missing:** A conditional notice in the `<View style={{ gap: 10 }}>` block at line 230; no backend changes needed.

---

### 11. "Already handled" on AdaptiveHero maintenance card has no loading state or feedback
**File:** `apps/mobile/components/home/AdaptiveHero.tsx:433–443` / `apps/mobile/app/(homeowner)/(tabs)/index.tsx:207–217`

The "Already handled" Pressable calls `markReminderHandled(svc)` which fires `api.homeServiceStatus.markHandled()` and then invalidates the `home-service-status` query. The handler is correctly wired, but:

1. No loading/disabled state on the Pressable — the homeowner can tap repeatedly, firing multiple API calls.
2. No optimistic removal of the card — it persists on screen until the `home-service-status` query refetches and `computeReminders` re-runs (one full round-trip).
3. No toast or confirmation that the action registered.

The MEMORY note ("Already Handled" on a reminder does nothing or needs many taps) likely refers to this: on slow connections, the reminder card simply stays on screen with no indication the tap landed.

**What it should do:** Track an `isHandling` local state per service type, disable the Pressable during the in-flight call, and remove the card optimistically (or show a brief success indicator) before the query invalidates.

**Missing:** Loading state; optimistic update in `markReminderHandled`; feedback indication.

---

## Summary Table

| # | File:line | Element | Impact | What's missing |
|---|---|---|---|---|
| 1 | `booking/payment.tsx:86–102` | Card form ignores all input; sends hardcoded `pm_card_visa` | P0 | Real Stripe PaymentSheet tokenization |
| 2 | `postings/[id].tsx:183–190` | "Review quotes" button — no `onPress` | P0 | Quotes review screen + handler |
| 3 | `postings/[id].tsx:224–231` | "Message" and "Schedule" both no `onPress` in matched state | P0 | Thread routing + booking re-entry |
| 4 | `postings/[id].tsx:261` | "Close this posting" — no `onPress` | P0 | `api.postings.close` call |
| 5 | `(tabs)/index.tsx:303` / `MyHomeCard.tsx` | "My Home" card — `onPress` not wired, inert | P1 | Home detail route |
| 6 | `(tabs)/inbox.tsx:365` | Paperclip attachment — no `onPress` | P1 | File picker + upload + message attachment |
| 7 | `providers/[id].tsx:187–189` | "Message" routes to inbox root, not a thread | P1 | Thread lookup or booking-first gate |
| 8 | `(tabs)/book.tsx:44–55` | Service catalog prices are hardcoded strings | P2 | Drop or derive from provider data |
| 9 | `providers/[id].tsx:432–434` | "Since X year" is fabricated (checkInCount ÷ 18) | P2 | `provider.createdAt` from DB |
| 10 | `job/[id].tsx:103–105` | 48h check-in window expiry is silent | P3 | Dismissive notice for closed window |
| 11 | `AdaptiveHero.tsx:433–443` | "Already handled" has no loading state or optimistic removal | P3 | Loading state + optimistic update |

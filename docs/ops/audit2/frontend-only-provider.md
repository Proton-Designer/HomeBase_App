# Provider + Tech Frontend Audit — Dead UI / Stubs / Missing Wiring

**Scope:** `apps/mobile/app/(provider)/**` and `apps/mobile/app/(tech)/**`
**Date:** 2026-06-24
**Method:** Read-only static analysis of every file in both route groups plus the API layer they call.

---

## P0 — Completely dead (onPress missing or empty function)

### 1. "Preview public profile" button — no-op Pressable
**File:** `apps/mobile/app/(provider)/(tabs)/profile.tsx:570–594`

The button rendered in the hero header of the Provider Profile screen has no `onPress`:
```tsx
<Pressable
  hitSlop={6}
  style={{ ... }}
>
  <ExternalLink size={14} color={colors.textInverse} />
  <Text>Preview public profile</Text>
</Pressable>
```
No `onPress` prop at all. Tapping it does nothing. There is also no public-facing provider profile screen in the router to navigate to even if the handler were added.

**Missing:** `onPress` handler + a `/(homeowner)/providers/[id]` or `/(provider)/public-profile` screen that renders the homeowner-facing view.

---

### 2. "Start day" button — empty arrow function
**File:** `apps/mobile/app/(provider)/(tabs)/today.tsx:471`

```tsx
<Pressable
  onPress={() => {}}
  ...
>
  <Text>Start day</Text>
```

The button is conditionally rendered when `todayJobs.length > 0`, so it appears exactly when it matters most. The intended behavior (begins an ordered, job-by-job route — opening the first job's check-in or navigating to jobs) is completely absent.

**Missing:** Handler that navigates to `/(provider)/(tabs)/jobs` or opens the check-in for the first `todayJobs` entry.

---

### 3. "Edit profile (bio, photos, pricing)" settings row — no onPress
**File:** `apps/mobile/app/(provider)/(tabs)/profile.tsx:344`

```tsx
<SettingsRow label="Edit profile (bio, photos, pricing)" Icon={Briefcase} />
```

`SettingsRow` accepts `onPress?: () => void`. When omitted the Pressable fires nothing. There is no edit-profile screen reachable post-onboarding. The upload + edit logic exists only in `apps/mobile/app/(provider)/onboarding/profile.tsx`, which is a one-time flow that writes `onboarding_completed_at` and redirects to Today — it cannot be used as a settings editor.

**Missing:** A standalone `/(provider)/edit-profile` screen (or modal), plus an `onPress` here navigating to it.

---

### 4. "Service area" settings row — no onPress
**File:** `apps/mobile/app/(provider)/(tabs)/profile.tsx:345`

```tsx
<SettingsRow label="Service area" Icon={Briefcase} />
```

Same pattern as Edit profile. The edit logic is only in `onboarding/service-area.tsx`. Tapping this row does nothing.

**Missing:** `/(provider)/settings/service-area` screen (or reuse of the onboarding step) + `onPress`.

---

### 5. "Availability" settings row — no onPress
**File:** `apps/mobile/app/(provider)/(tabs)/profile.tsx:346`

```tsx
<SettingsRow label="Availability" Icon={Calendar} last />
```

Same pattern. Availability editing is only in `onboarding/availability.tsx`.

**Missing:** `/(provider)/settings/availability` screen + `onPress`.

---

### 6. "Notification preferences" settings row — no onPress and no screen
**File:** `apps/mobile/app/(provider)/(tabs)/profile.tsx:467`

```tsx
<SettingsRow label="Notification preferences" Icon={Bell} last />
```

No `onPress`, and no notification preferences screen exists anywhere in the router.

**Missing:** `/(provider)/settings/notifications` screen (push opt-in/out per event type) + `onPress`.

---

### 7. Verification Tier 1 and Tier 2 rows — Pressable with no onPress
**File:** `apps/mobile/app/(provider)/(tabs)/profile.tsx:412–455`

Both verification rows are rendered inside a `.map()` as `<Pressable ...>` with no `onPress`. The rows correctly derive their status labels from `verificationTier` (real backend data), but tapping them does nothing — a provider cannot initiate or continue their verification from here.

The onboarding screens `onboarding/verification-tier1.tsx` and `onboarding/verification-tier2.tsx` exist but are only part of the sequential onboarding flow and not reachable post-onboarding.

**Missing:** `onPress` handlers navigating to the verification onboarding screens (or a dedicated settings sub-screen) from the post-onboarding profile.

---

### 8. "Standard payout (2 business days, free)" button — no onPress
**File:** `apps/mobile/app/(provider)/(tabs)/earnings.tsx:349–359`

```tsx
<Pressable hitSlop={6} style={{ marginTop: 10, alignItems: 'center' }}>
  <Text>Standard payout (2 business days, free)</Text>
</Pressable>
```

No `onPress`. Tapping does nothing. Standard payouts via Stripe Connect's automated schedule are never exposed to the provider. If they want the free settlement path, they have no UI to trigger it.

**Missing:** Either an edge-function call to `stripe-standard-payout` (not yet written) or copy explaining that standard payouts are automatic, so the button itself may be misleading.

---

### 9. "Update/Connect bank account" button — no onPress
**File:** `apps/mobile/app/(provider)/(tabs)/earnings.tsx:399–409`

```tsx
<Pressable hitSlop={6} style={{ marginTop: 8 }}>
  <Text>
    {bankAccount?.connected && bankAccount.last4
      ? 'Update bank account'
      : 'Connect bank account'}
  </Text>
</Pressable>
```

No `onPress`. The `payments.onboardProvider()` function exists in `lib/api/payments.ts:88–103` and generates a Stripe Connect onboarding URL. It is never called from anywhere in the provider UI post-onboarding. A provider who skips the banking step during onboarding, or who needs to update their bank account, has no way to do so.

**Missing:** `onPress` that calls `payments.onboardProvider()` and opens the returned `onboardingUrl` via `Linking.openURL`.

---

## P1 — Functionally wired but logically broken

### 10. "Upcoming" section in Today renders nothing when upcoming jobs exist
**File:** `apps/mobile/app/(provider)/(tabs)/today.tsx:379–417`

The `UpcomingSection` block:
```tsx
{(allJobs as ...).filter((j) => {
  const d = new Date(j.scheduledAt as string);
  return d > today;
}).length === 0 ? (
  <Card><Text>No upcoming jobs...</Text></Card>
) : null}
```

If there are upcoming jobs (`.length > 0`) the branch renders `null` — the jobs are silently swallowed. There is no code path that renders actual upcoming job rows. The section header "Upcoming" appears but the body is blank. The empty state is the only rendered outcome.

**Missing:** An `else` branch that maps future jobs to `PressableJobRow` (or a dedicated upcoming row component).

---

### 11. "Mark en route" fires-and-forgets with no feedback and no UI refresh
**File:** `apps/mobile/app/(provider)/(tabs)/jobs.tsx:421–426`

```tsx
onPress={() => {
  jobsApi.setStatus(job.id as string, 'en_route').catch(() => {});
}}
```

No `refetchJobs()` call, no optimistic update, no success toast, no error surface. After tapping, the button is still visible and the status pill still reads "Confirmed". The mutation silently succeeds (or fails) with no user feedback. This also means there is no "Mark in progress" transition visible after en route.

**Missing:** Optimistic status update + `refetchJobs()` on success + Toast on error.

---

### 12. todayJobCount on crew members is always undefined
**File:** `apps/mobile/lib/api/crew.ts:5–30` and `apps/mobile/app/(provider)/crew/index.tsx:229–255`

The `listForProvider` API selects only `provider_team` and `profiles` columns — it never queries jobs. The `CrewMember` type expects `todayJobCount?: number`, but the API never populates it. The crew roster renders a badge (`tech.todayJobCount` jobs today) that is always 0 or invisible because the field is always `undefined`.

**Missing:** Either a `count` sub-select against `jobs` scoped to today + active tech, or a separate API call per tech.

---

## P2 — No photo upload path from post-onboarding profile

### 13. Profile photo cannot be changed after onboarding completes
**File:** `apps/mobile/app/(provider)/(tabs)/profile.tsx:491–513`

The Provider Profile hero renders a circle with the business name initial:
```tsx
<View style={{ width: 88, height: 88, borderRadius: 44, ... }}>
  <Text>{displayInitial}</Text>
</View>
```

There is no `onPress`, no image picker, no upload. If the provider set a photo during onboarding it also doesn't appear here — `providerData.avatarUrl` is loaded by `useQuery` but never rendered (the component always renders the initial-letter fallback regardless of whether `avatarUrl` is populated).

The upload infrastructure (`pickImageFromLibrary`, `uploadAsset` to `avatars` bucket, `updateProfile`) all exist. Nothing connects them to this screen.

**Missing:** (a) Render `providerData.avatarUrl` when present; (b) tap-to-upload handler using `storage.pickAndUpload` → `providers.updateProfile({ avatarUrl })`.

---

## P3 — Tech side structural gaps

### 14. Tech greeting hardcodes "Tech" as the display name
**File:** `apps/mobile/app/(tech)/(tabs)/today.tsx:52`

```tsx
<Text>{greeting}, Tech</Text>
```

The tech's profile name is never fetched. The `useAuthStore` has `profile?.firstName` available (set during auth init), but it's not used. Every tech sees "Good morning, Tech".

**Missing:** Use `useAuthStore(s => s.profile?.firstName)` in the greeting.

---

### 15. Tech earnings shows gross job amount, not tech payout
**File:** `apps/mobile/app/(tech)/(tabs)/earnings.tsx:163`

```tsx
+${(job.amountCents / 100).toFixed(2)}
```

`amountCents` is the full homeowner charge. There is no tech payout split defined in the schema or the API. The tech sees the full booking amount as their "earning," which is incorrect. No split percentage, no deduction for the provider owner's cut, no display of what the tech actually receives.

**Missing:** A tech payout field in `jobs` (or a separate `crew_payouts` table) plus the correct value surfaced in this screen.

---

### 16. Tech has no profile/settings tab and sign-out is buried in scroll
**File:** `apps/mobile/app/(tech)/(tabs)/_layout.tsx`

The tech tab bar has only two tabs: Today and Earnings. There is no account/profile tab. Sign-out is rendered at the bottom of the Today scroll view (`today.tsx:140–154`), below the jobs list — it will be below the fold on most screens unless the tech scrolls all the way down.

**Missing:** A `profile.tsx` tab in `(tech)/(tabs)/` with name, notification prefs, and sign-out.

---

### 17. Completed job cards show no escrow status
**File:** `apps/mobile/app/(provider)/(tabs)/jobs.tsx:468–515`

Completed job cards render homeowner name, service type, and amount. There is no indication of whether the 7-day escrow has cleared, whether the payout is pending or released, or whether a claim was filed. The earnings screen has a status dot (`paid` / `in_transit` / `pending`) but that data isn't derived from an escrow release timestamp — it always defaults to `'paid' as PayoutStatus` (earnings.tsx:139).

**Missing:** Escrow status from `completion_ledger.released_at` or a `payout_status` column; surface it on completed job cards and in the earnings row status.

---

## Summary table

| # | Location | Element | Status |
|---|----------|---------|--------|
| 1 | `profile.tsx:570` | "Preview public profile" button | Dead — no onPress, no target screen |
| 2 | `today.tsx:471` | "Start day" button | Dead — `onPress={() => {}}` |
| 3 | `profile.tsx:344` | "Edit profile" settings row | Dead — no onPress, no edit screen |
| 4 | `profile.tsx:345` | "Service area" settings row | Dead — no onPress |
| 5 | `profile.tsx:346` | "Availability" settings row | Dead — no onPress |
| 6 | `profile.tsx:467` | "Notification preferences" row | Dead — no onPress, no screen |
| 7 | `profile.tsx:412–455` | Verification tier rows | Dead — no onPress |
| 8 | `earnings.tsx:349` | "Standard payout" button | Dead — no onPress |
| 9 | `earnings.tsx:399` | "Connect/Update bank account" | Dead — no onPress, `onboardProvider()` never called |
| 10 | `today.tsx:406–416` | Upcoming jobs section | Broken — positive case renders null |
| 11 | `jobs.tsx:421–426` | "Mark en route" button | Fires-and-forgets — no feedback, no refresh |
| 12 | `crew/index.tsx:229` | Tech badge job count | Always undefined — not fetched by API |
| 13 | `profile.tsx:491` | Provider avatar | No upload path post-onboarding; avatarUrl never rendered |
| 14 | `(tech)/today.tsx:52` | Tech greeting | Hardcoded "Tech" name |
| 15 | `(tech)/earnings.tsx:163` | Tech earnings amount | Shows gross job amount, not tech payout |
| 16 | `(tech)/(tabs)/_layout.tsx` | Tech tab bar | No profile/settings tab; sign-out buried |
| 17 | `jobs.tsx:468–515` | Completed job cards | No escrow/payout status displayed |

---

## What IS wired to real backend (confirmed)

- Today KPI strip earnings and jobs-done count: derived from real `listForProvider` jobs filtered by today + status === 'completed'. Real.
- Trust score display on Today and Profile: fetched from `providers.composite_score_*` columns. Real when data exists; shows "—" until first graded check-in.
- Jobs segments (Requests/Active/Completed): all driven by real Supabase queries. Accept/Decline calls edge functions. Real.
- Check-in widget: triggered from both Today and Jobs screens; calls `provider-checkin` edge function. Real.
- Earnings history rows: fetched from `completion_ledger` with a `net = gross * 0.9` derivation (hardcoded take rate); `status` always defaults to `'paid'`. Partially real — ledger data is live, status derivation is a stub.
- Instant payout: calls `mock-payments` edge function when `EXPO_PUBLIC_MOCK_PAYMENTS !== 'false'` (env-gated). Real in mock mode.
- Balance: calls `mock-payments` edge function. Real in mock mode.
- Schedule (week grid + block-time): fetched from `jobs` + `provider_blocked_times`. Block-time create/delete mutations wired. Real.
- Crew list, invite, remove, assign-to-job: all wired to `provider_team` table + edge functions. Real.
- Messaging / Inbox: `listThreadsForProvider` query + `/(provider)/thread/[id]` screen. Real.
- Calendar connect: calls `calendar-connect` edge function + `Linking.openURL`. Real.
- Google Calendar sync on accept/decline: calls `calendar-sync` edge function (best-effort). Real.

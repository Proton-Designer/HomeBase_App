# Provider Today Screen — Design Spec

**Screen:** `app/(provider)/(tabs)/today.tsx`  
**Author:** design audit, June 2026  
**Status:** buildable spec — no code edits in this file

---

## 1. Issues Found in the Current Implementation

### 1a. Data correctness

| KPI | Current source | Bug | Correct source |
|---|---|---|---|
| Today's earnings | `todayJobs.filter(completed).reduce(sum, payoutCents)` | `payoutCents` is undefined on the `Job` type; falls through to `amountCents` (gross, not net) | `completion_ledger` filtered to today, `SUM(amount_cents) * 0.9` |
| Jobs done | `todayJobs.filter(completed).length` | `status === 'completed'` on the jobs row doesn't mean the check-in+payment path completed; a row can be set completed without a ledger entry | `completion_ledger` count for today |
| Trust score | `reliability * 0.35 + quality * 0.35 + ...` (client-side recompute) | The composite is already stored as `composite_score_overall`; label says "avg trust score" which implies an average over time, not a component score | `providerProfile.compositeScore.overall` |

### 1b. Upcoming section is completely empty

The UpcomingSection code path only renders an empty-state Card when there are zero upcoming jobs. When jobs exist, the condition is false → `null`. There is no rendering for the actual upcoming job rows. The section is broken for any provider with future jobs.

```tsx
// current — only renders empty state, never the actual rows
{allJobs.filter(futureJobs).length === 0 ? <Card>empty</Card> : null}
```

### 1c. "Start day" button is a no-op

`onPress={() => {}}` — the button is fully built visually but wired to nothing. No state transition, no navigation, no API call.

### 1d. Responsive / layout

- `ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}` — `gap` on ScrollView `contentContainerStyle` is correct for RN 0.76+ (Expo 54), but the `padding: 20` applies equally top/bottom which is fine; no clipping issue there.
- The editorial headline (`"Three jobs on the block."` at `fontSize: 32`) renders fine at 335pt usable width.
- The real title issue: with no `paddingTop` beyond the scroll container's `padding: 20`, the eyebrow text sits only 20pt below the SafeAreaView bottom edge on the first render. After iOS 16 Dynamic Island devices this can feel cramped. Add `paddingTop: 8` to the hero section or use 28 as the top padding value.
- The 3-column KPI strip squeezes `fontSize: 36` numbers into 125pt columns (375pt phone). `"$1,234"` at 36px in PlusJakartaSans Bold is ~130pt — overflows. Reduce KPI number font to `fontSize: 28` or switch to 2 columns and a third stat below.

---

## 2. Brainstorm — Four Distinct Layouts

### Layout A — Command Center (Timeline First)
Provider opens → immediately sees the next job prominently, route metaphor, stats below.

```
[date chip + online/offline toggle]
[NEXT JOB — large pinned card: time countdown, drive CTA, status pill]
[Today's route list]
[KPI bar: net earned / jobs left / trust]
[Upcoming compact list]
[Trust card — collapsed]
```

### Layout B — Daily Briefing (Sticky Header)
Newspaper-style; sticky top strip with live stats, main scroll is content.

```
[STICKY: provider name · today's date · trust score chip]
[Today's jobs (cards)]
[Today's earnings + payout action]
[Trust score 2×2 rings]
[Next 7-day mini-calendar]
[FAB: "Check in"]
```

### Layout C — Next Action (Hero + Smart CTA + List)
Evolution of current design; fix data, add a smart action button at the right position.

```
[Hero: date eyebrow + editorial headline]
[KPI strip — corrected]
[Smart action button — context-aware label]
[Today's jobs section]
[Upcoming section — FIXED to render rows]
[Trust score card — collapsible]
```

### Layout D — Tabbed-Within-Screen
Mini segmented control inside Today: My Day | Schedule | Score.

```
[Header: date + earnings chip]
[Segmented toggle: My Day | Schedule | Score]
[My Day: jobs + action button]
[Schedule: upcoming 7-day view]
[Score: trust breakdown]
```

---

## 3. Red-Team Each Layout

### Layout A — Command Center
- **Fails on 0-job days.** The large "Next job" hero card is an empty state that eats 120pt of screen for nothing. Providers with quiet days see a broken composition every morning.
- **Redundancy.** "Next job" + "today's route list" show the same first job twice.
- **Online/offline toggle** adds complexity not in the current data model. The `providers.is_available_today` boolean exists but toggling it from Today needs a mutation + optimistic update not yet wired.
- **Good:** The countdown timer to first job is genuinely useful. Can extract that idea into a slim banner instead.

### Layout B — Daily Briefing
- **Sticky header is a trap.** It permanently occupies ~56pt on a screen where content competes for space. The provider's trust score is not something they need to see on every scroll tick.
- **FAB is orphaned.** No FAB anywhere else in the app. Introduces a new interaction pattern for a single screen.
- **Good:** The trust score chip in the header keeps it always visible without requiring scroll. Can extract that as a small inline element instead of a sticky.

### Layout C — Next Action
- **Closest to current design** — lower implementation risk, builds on what providers already learned.
- **KPI strip at the top** is good UX for a dashboard but needs font-size reduction (see §1d).
- **Smart action button** solves the no-op problem cleanly without restructuring the whole screen.
- **Upcoming section fix** is a mechanical correction, not a redesign.
- **Trust card at the bottom** is correct priority: providers care about it weekly, not first-thing.
- **Red-team:** On a 0-job day the KPI strip shows $0 / 0 / trust which is accurate but a little deflating. Mitigate by hiding the KPI strip on 0-job days (show earnings only after the first job completes).

### Layout D — Tabbed-Within-Screen
- **Navigation anti-pattern.** The app already has a Schedule tab and an Earnings tab. A nested segmented control duplicates information and hides it behind a tap. Providers will miss the Schedule and Score sub-tabs.
- **Discovery failure.** Most users never tap the other tabs; they stay on "My Day" and lose the upcoming view entirely.
- **Eliminated.**

---

## 4. Decision

**Layout C — Next Action**, with one targeted element borrowed from Layout A: a **slim "Next job" context bar** (single line: time · service · address · drive) inserted between the KPI strip and the smart action button. This is not a full card — it's a lightweight information row that collapses when the job is en route or completed.

---

## 5. Concrete Screen Spec

### 5.1 Container

```
SafeAreaView edges={['top']} bg={colors.background}
  └── ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 28,        // ← was 20; extra 8pt so eyebrow breathes below the safe area
          paddingBottom: 36,
        }}
        children as a <View style={{ gap: 20 }}> wrapper
```

The `gap: 20` goes on the inner `<View>`, not the ScrollView's contentContainerStyle, to avoid cross-platform edge cases with the layout engine.

### 5.2 HeroSection

No structural change. Fix:

```tsx
// paddingTop: 28 on container handles breathing room — remove any local top gap here

<View style={{ gap: 10 }}>
  <Text /* eyebrow */ >
    {'today · ' + format(today, 'EEEE, MMMM d').toLowerCase()}
  </Text>
  <Text /* editorial headline */ >
    {jobCount === 0
      ? 'Quiet morning.'
      : jobCount === 1
      ? 'One job today.'
      : `${jobCountWord(jobCount)} on the block.`}
  </Text>
  <View /* accent rule */ />
  <Text /* body copy */ >
    {jobCount === 0
      ? 'No jobs scheduled — your next one shows up here when it routes.'
      : firstIncompleteJob
      ? `first up at ${format(new Date(firstIncompleteJob.scheduledAt), 'h:mm a').toLowerCase()}.`
      : 'all done for today.'}
  </Text>
</View>
```

`firstIncompleteJob` = first element of `todayJobs` where `status !== 'completed' && status !== 'cancelled'`.

### 5.3 KPI Strip (corrected)

**Condition:** render only when `onboardingComplete && todayJobs.length > 0`. On quiet days, omit entirely (showing $0 / 0 jobs first thing in the morning is noise).

**Data sources:**

| Stat | Source | Query |
|---|---|---|
| Net today | `completion_ledger` | `SELECT SUM(amount_cents) FROM completion_ledger WHERE provider_id = $1 AND completed_at >= today_start AND completed_at < today_end` → multiply by 0.9 |
| Jobs done | Same query, count of rows | |
| Trust score | `providers.compositeScore.overall` | Already fetched via `providersApi.detail(providerId)` |

**Query key:** `['provider', 'today-ledger', providerId, todayDateString]`

```tsx
// New API function: lib/api/completions.ts (extend existing file)
export async function fetchProviderTodayCompletions(
  providerId: string,
  todayStart: string,  // ISO start of today UTC
  todayEnd: string,    // ISO end of today UTC
): Promise<{ netCents: number; jobsDone: number }> {
  const { data, error } = await supabase
    .from('completion_ledger')
    .select('amount_cents')
    .eq('provider_id', providerId)
    .gte('completed_at', todayStart)
    .lt('completed_at', todayEnd);
  if (error) throw error;
  const rows = (data ?? []) as { amount_cents: number }[];
  const gross = rows.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
  return { netCents: Math.round(gross * 0.9), jobsDone: rows.length };
}
```

`todayStart` and `todayEnd` are computed client-side:
```tsx
const today = new Date();
const todayStart = startOfDay(today).toISOString();   // date-fns
const todayEnd   = endOfDay(today).toISOString();
```

**Font size fix:** reduce KPI value from `fontSize: 36` → `fontSize: 28`. At 28px, `"$1,234"` fits within a 125pt column on a 375pt phone.

**Label fix:** `'avg trust score'` → `'trust score'`

**Trust score display:** use `providerProfile?.compositeScore?.overall ?? null`. Do not recompute client-side. If `overall` is 0 (no completed jobs), show `'—'`.

```tsx
const kpiItems = [
  {
    value: todayLedger
      ? `$${(todayLedger.netCents / 100).toFixed(0)}`
      : '—',
    label: "today's net",
  },
  {
    value: todayLedger ? `${todayLedger.jobsDone}` : '—',
    label: 'done',
  },
  {
    value: providerProfile?.compositeScore?.overall
      ? providerProfile.compositeScore.overall.toFixed(1)
      : '—',
    label: 'trust score',
  },
];
```

Loading state: show `SkeletonLoader` strips in place of values (reuse existing `SkeletonLoader` component).

### 5.4 Next Job Context Bar

**Condition:** render when `firstIncompleteJob` exists AND its status is `'booked' | 'confirmed' | 'en_route' | 'in_progress'`.

**Visual:** 1-row pill/bar inside a `Card variant="outlined"`, no shadow, compact.

```
[status pill][time · service · street · N min drive →]
```

```tsx
<Card
  variant="outlined"
  style={{ paddingVertical: 12, paddingHorizontal: 14 }}
>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <StatusPill status={firstIncompleteJob.status} />   {/* new small component, see §5.7 */}
    <Text style={textStyles['body-sm'], { flex: 1, color: colors.textPrimary }}>
      {format(scheduledAt, 'h:mm a')}
      {' · '}
      {SERVICE_LABEL[serviceType]}
      {street ? ' · ' + street : ''}
    </Text>
    {driveTimeMinutes != null && (
      <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary, ...numericTabular }}>
        {driveTimeMinutes}m
      </Text>
    )}
    <Navigation size={14} color={colors.primary[600]} />
  </View>
</Card>
```

Tapping the context bar navigates to the job detail OR opens the ProviderCheckIn modal (same behavior as tapping the job row). Use `router.push('/(provider)/(tabs)/jobs')` as a fallback until a dedicated job detail screen exists.

### 5.5 Smart Action Button

**Purpose:** A single primary CTA that changes label and action based on the state of `firstIncompleteJob`. This replaces the current no-op "Start day" button.

**Conditions:**

| `firstIncompleteJob.status` | Button label | Action |
|---|---|---|
| `'booked'` or `'confirmed'` | "I'm heading out →" | Call `jobsApi.setStatus(jobId, 'en_route')`, then `refetchJobs()`. Show loading state during mutation. On success: optimistic label flip to next state. |
| `'en_route'` | "I've arrived — check in" | Open `ProviderCheckIn` modal with `jobId` and `payoutCents` |
| `'in_progress'` | "Submit check-in" | Open `ProviderCheckIn` modal |
| All today's jobs `'completed'` or `'cancelled'`, or 0 jobs | Button is hidden | — |

**Payout cents for modal:** use `Math.round(firstIncompleteJob.amountCents * 0.9)` — not the raw `amountCents`.

**Implementation:**

```tsx
const firstIncompleteJob = todayJobs.find(
  (j) => j.status !== 'completed' && j.status !== 'cancelled'
);

const { mutate: markEnRoute, isPending: enRoutePending } = useMutation({
  mutationFn: () => jobsApi.setStatus(firstIncompleteJob!.id, 'en_route'),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['provider', 'jobs', providerId] });
  },
});

// render
{firstIncompleteJob?.status === 'booked' || firstIncompleteJob?.status === 'confirmed' ? (
  <Button
    label="I'm heading out →"
    fullWidth
    size="lg"
    loading={enRoutePending}
    onPress={() => markEnRoute()}
  />
) : firstIncompleteJob?.status === 'en_route' ? (
  <Button
    label="I've arrived — check in"
    fullWidth
    size="lg"
    onPress={() => {
      setCheckInJobId(firstIncompleteJob.id);
      setCheckInPayoutCents(Math.round(firstIncompleteJob.amountCents * 0.9));
    }}
  />
) : firstIncompleteJob?.status === 'in_progress' ? (
  <Button
    label="Submit check-in"
    fullWidth
    size="lg"
    onPress={() => {
      setCheckInJobId(firstIncompleteJob.id);
      setCheckInPayoutCents(Math.round(firstIncompleteJob.amountCents * 0.9));
    }}
  />
) : null}
```

**Note:** `queryClient` must be imported via `useQueryClient()`.

### 5.6 Today's Jobs Section

No structural change to `PressableJobRow`. Fixes:

1. **`payoutCents` mapping** — the `Job` type has no `payoutCents` field. In the `TodayJob` map:

```tsx
// WRONG (current)
payoutCents: ((j.payoutCents ?? j.amountCents) as number) ?? 0,

// CORRECT
payoutCents: Math.round(((j.amountCents as number) ?? 0) * 0.9),
```

2. **Status pill** — add the `StatusPill` (see §5.7) to each `PressableJobRow` between the time and the service label. This makes it immediately clear which jobs are done vs. upcoming vs. in-progress.

3. **Tapping a job row** — current behavior opens ProviderCheckIn modal, which is the right flow for in-progress jobs. But tapping a `'booked'` or `'completed'` job should not open the check-in modal. Guard:

```tsx
onPress={() => {
  if (job.status === 'in_progress' || job.status === 'en_route') {
    setCheckInJobId(job.id);
    setCheckInPayoutCents(Math.round(job.payoutCents)); // already net from above
  }
  // booked/confirmed/completed: navigate to job detail or no-op for now
}}
```

4. **Section header** — add total potential net earnings for today as a subtitle:

```tsx
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
  <Text style={textStyles['title-lg']}>Today's jobs</Text>
  <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, ...numericTabular }}>
    {todayJobs.length > 0
      ? `$${(todayJobs.reduce((s, j) => s + j.payoutCents, 0) / 100).toFixed(0)} potential`
      : null}
  </Text>
</View>
```

### 5.7 StatusPill (new small component)

A small inline badge. Reuse the `Chip`/`Pill` pattern from `components/ui/`.

```tsx
const STATUS_PILL_CONFIG: Record<JobStatus, { label: string; bg: string; text: string }> = {
  booked:        { label: 'Upcoming', bg: colors.infoLight,    text: colors.info },
  confirmed:     { label: 'Confirmed', bg: colors.infoLight,   text: colors.info },
  en_route:      { label: 'En route',  bg: colors.warningLight, text: colors.warning },
  in_progress:   { label: 'In progress', bg: colors.accent[100], text: colors.accent[700] },
  completed:     { label: 'Done',      bg: colors.successLight, text: colors.success },
  cancelled:     { label: 'Cancelled', bg: colors.divider,     text: colors.textTertiary },
};

function StatusPill({ status }: { status: JobStatus }) {
  const cfg = STATUS_PILL_CONFIG[status];
  return (
    <View style={{
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: cfg.bg,
    }}>
      <Text style={{
        fontFamily: fonts.bodySemibold, fontSize: 10, fontWeight: '600',
        color: cfg.text, letterSpacing: 0.3,
      }}>
        {cfg.label}
      </Text>
    </View>
  );
}
```

Place this at `components/shared/StatusPill.tsx` and export from `components/shared/index.ts`.

### 5.8 Upcoming Section (FIXED)

**Bug:** The existing code renders nothing when jobs exist. The full implementation:

```tsx
const upcomingJobs = (allJobs as Job[]).filter((j) => {
  const d = new Date(j.scheduledAt);
  return d > endOfDay(today);          // date-fns endOfDay
});

// Group by date string
const upcomingByDate = upcomingJobs.reduce<Record<string, Job[]>>((acc, j) => {
  const key = format(new Date(j.scheduledAt), 'yyyy-MM-dd');
  if (!acc[key]) acc[key] = [];
  acc[key].push(j);
  return acc;
}, {});

// Render up to 5 days
const upcomingDates = Object.keys(upcomingByDate).sort().slice(0, 5);
```

**UpcomingDayRow** (inline component, no separate file needed):

```tsx
function UpcomingDayRow({ dateKey, jobs }: { dateKey: string; jobs: Job[] }) {
  const router = useRouter();
  const date = parseISO(dateKey);             // date-fns parseISO
  const totalNetCents = Math.round(
    jobs.reduce((s, j) => s + j.amountCents, 0) * 0.9
  );
  return (
    <Pressable
      onPress={() => router.push('/(provider)/(tabs)/schedule')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        gap: 12,
      }}
    >
      {/* Date column */}
      <View style={{ width: 44 }}>
        <Text style={{
          fontFamily: fonts.displaySemibold, fontSize: 22, fontWeight: '600',
          color: colors.textPrimary, ...numericTabular, lineHeight: 26,
        }}>
          {format(date, 'd')}
        </Text>
        <Text style={{
          fontFamily: fonts.body, fontSize: 10, fontStyle: 'italic',
          color: colors.textTertiary, textTransform: 'lowercase',
        }}>
          {format(date, 'EEE').toLowerCase()}
        </Text>
      </View>

      {/* Job count + service list */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
          {jobs.length === 1 ? '1 job' : `${jobs.length} jobs`}
        </Text>
        <Text style={{
          ...textStyles['body-sm'], color: colors.textSecondary, fontStyle: 'italic',
        }} numberOfLines={1}>
          {[...new Set(jobs.map((j) => SERVICE_LABEL[j.serviceType] ?? j.serviceType))].join(' · ')}
        </Text>
      </View>

      {/* Net earnings */}
      <Text style={{
        fontFamily: fonts.displaySemibold, fontSize: 14, fontWeight: '600',
        color: colors.success, ...numericTabular,
      }}>
        ${(totalNetCents / 100).toFixed(0)}
      </Text>
      <ChevronRight size={14} color={colors.textTertiary} />
    </Pressable>
  );
}
```

**Section wrapper:**

```tsx
<View>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
    <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Upcoming</Text>
    <Pressable onPress={() => router.push('/(provider)/(tabs)/schedule')} hitSlop={6}>
      <Text style={{ ...textStyles['body-sm'], fontFamily: fonts.bodySemibold, color: colors.primary[600] }}>
        Full schedule
      </Text>
    </Pressable>
  </View>

  {upcomingDates.length === 0 ? (
    <Card>
      <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
        Nothing scheduled yet — open schedule to set availability.
      </Text>
    </Card>
  ) : (
    <Card style={{ padding: 0 }}>
      {upcomingDates.map((dateKey) => (
        <UpcomingDayRow
          key={dateKey}
          dateKey={dateKey}
          jobs={upcomingByDate[dateKey]}
        />
      ))}
    </Card>
  )}
</View>
```

Last `UpcomingDayRow` should have `borderBottomWidth: 0` — apply via index check in the map.

### 5.9 Trust Score Card

No structural change to the existing `TrustCard`. Two fixes:

1. Pass `scores` from `providerProfile.compositeScore` as a proper `CompositeScore` shape — the current code destructures the four sub-scores into a new object, which loses `overall`. Just pass the `compositeScore` object directly:

```tsx
const compositeScore = providerProfile?.compositeScore ?? null;

const TrustCard = compositeScore ? (
  <Card>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
        Your trust score
      </Text>
      <TrendingUp size={14} color={colors.success} />
    </View>

    {/* Overall — use compositeScore.overall directly */}
    <View style={{ alignItems: 'center', marginBottom: 12 }}>
      <Text style={{
        fontFamily: fonts.editorial, fontSize: 44, fontWeight: '700', lineHeight: 48,
        color: colors.textPrimary, ...numericTabular,
      }}>
        {compositeScore.overall > 0 ? compositeScore.overall.toFixed(1) : '—'}
      </Text>
      <Text style={{
        fontFamily: fonts.body, fontSize: 11, fontStyle: 'italic',
        color: colors.textSecondary, marginTop: 2,
      }}>
        composite
      </Text>
    </View>

    <TrustScoreDisplay
      scores={{
        reliability: compositeScore.reliability,
        quality: compositeScore.quality,
        communication: compositeScore.communication,
        professionalism: compositeScore.professionalism,
      }}
      size="sm"
      showOverall={false}
      animated
    />
  </Card>
) : (
  <Card>
    <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
      Complete your first job to build your trust score.
    </Text>
  </Card>
);
```

2. The trust card stays at the bottom of the scroll. No change to ordering.

---

## 6. Final Element Order — Mobile (top to bottom)

```
SafeAreaView
  ScrollView
    <View gap={20}>
      HeroSection                    (always)
      KPIStrip                       (only when onboardingComplete && todayJobs.length > 0)
      NextJobContextBar              (only when firstIncompleteJob exists)
      SmartActionButton              (only when firstIncompleteJob exists)
      TodayJobsSection               (only when onboardingComplete; includes empty state)
      UpcomingSection                (only when onboardingComplete; FIXED to render rows)
      TrustCard                      (only when onboardingComplete)
      OnboardingBanner               (replaces KPI/jobs/upcoming/trust when !onboardingComplete)
    </View>
  /ScrollView
/SafeAreaView
ProviderCheckIn modal (overlay, z-indexed above everything)
```

---

## 7. Desktop (isDesktop) Layout

Keep the existing two-column structure. Changes:

```
Left column (flex: 2):
  TodayJobsSection
  UpcomingSection (FIXED)
  SmartActionButton

Right column (flex: 1):
  KPIStrip (stacked vertically, not 3-column strip)
  NextJobContextBar
  TrustCard
```

The KPI strip on desktop re-renders as 3 stacked rows (not a 3-column strip) since the right column is narrower.

---

## 8. Loading and Error States

| Section | Loading | Error |
|---|---|---|
| KPI strip | `SkeletonLoader` strips for each value | Hide strip entirely (don't show $0) |
| Today's jobs | Existing skeleton `<Card><Text>Loading…</Text></Card>` | `<QueryErrorState onRetry={refetchJobs} />` |
| Today-ledger query | `'—'` values in KPI strip | `'—'` values in KPI strip; do not block render |
| Upcoming | Render section header, then loading row inside Card | Render empty state message |
| Trust card | No loading state; `providerProfile` fetched in parallel | Empty state card (no score yet) |

---

## 9. New Query Keys and Data Dependencies

```
['provider', 'jobs', providerId]
  → jobsApi.listForProvider(providerId)
  → powers: todayJobs, upcomingJobs

['provider', 'today-ledger', providerId, format(today, 'yyyy-MM-dd')]
  → completionsApi.fetchProviderTodayCompletions(providerId, todayStart, todayEnd)
  → powers: KPI netCents, KPI jobsDone

['provider', 'detail', providerId]
  → providersApi.detail(providerId)
  → powers: KPI trust score, TrustCard

All three run in parallel (three separate useQuery calls). The page renders
incrementally as each resolves.
```

---

## 10. Edge Cases

| Scenario | Behaviour |
|---|---|
| 0 jobs today | Hero: "Quiet morning." · No KPI strip · No SmartActionButton · No NextJobBar · TodayJobsSection shows EmptyState with CTA to schedule tab |
| All jobs cancelled | Same as 0 jobs effectively; filter cancelled from firstIncompleteJob |
| Provider has never completed a job | Trust card shows "Complete your first job to build your trust score." · Trust score KPI shows `'—'` |
| `completion_ledger` query fails | KPI strip values degrade to `'—'`; don't block the whole screen |
| First job already en route (mid-day open) | SmartActionButton = "I've arrived — check in"; NextJobBar shows en route pill |
| Multiple jobs in progress simultaneously | SmartActionButton targets `firstIncompleteJob` (earliest by `scheduledAt`); other in-progress jobs visible in the jobs list and accessible via tap |
| Upcoming section has >5 days | Cap at 5 days; "See full schedule →" link opens schedule tab |
| `driveTimeMinutes` is null | Omit drive time from NextJobContextBar; do not show "0m drive" |
| `onboardingComplete` is false | Show OnboardingBanner; hide all other sections |

---

## 11. Responsive / Title Fix Summary

- Container `paddingTop: 28` (up from 20) to give the eyebrow label more breathing room below the safe area on Dynamic Island devices.
- KPI strip value `fontSize: 28` (down from 36) to prevent overflow on 375pt iPhones with 3 columns.
- No `numberOfLines` needed on the editorial headline — it wraps naturally within the 335pt usable width.
- On iPad/desktop, the KPI strip renders as three stacked `<View flexDirection="row" justifyContent="space-between">` rows in the right sidebar column, not a 3-column horizontal strip.

---

## 12. Components Summary

| Component | Action | Location |
|---|---|---|
| `StatusPill` | Create | `components/shared/StatusPill.tsx` + export from index |
| `UpcomingDayRow` | Create inline | `app/(provider)/(tabs)/today.tsx` |
| `SmartActionButton` | Inline in today.tsx (replace current StartDayButton) | `app/(provider)/(tabs)/today.tsx` |
| `NextJobContextBar` | Inline in today.tsx | `app/(provider)/(tabs)/today.tsx` |
| `fetchProviderTodayCompletions` | Add | `apps/mobile/lib/api/completions.ts` |
| KPI strip values | Fix data source + font size | `app/(provider)/(tabs)/today.tsx` |
| Upcoming section | Fix rendering + add UpcomingDayRow | `app/(provider)/(tabs)/today.tsx` |
| TrustCard | Use `compositeScore.overall` directly | `app/(provider)/(tabs)/today.tsx` |
| `payoutCents` in TodayJob map | Fix to 90% net | `app/(provider)/(tabs)/today.tsx` |

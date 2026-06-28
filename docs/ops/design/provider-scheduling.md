# Provider Scheduling — Design Spec

**Status:** Design complete, ready to build  
**Replaces:** `apps/mobile/app/(provider)/(tabs)/schedule.tsx` (867-line god screen)  
**Author:** Design pass, June 2026

---

## 1. Audit: What Is Broken in the Current Screen

Before designing forward, every logic gap and bug in the existing file is catalogued here. These are not nitpicks — several directly affect what homeowners can and cannot book.

### 1.1 Month view is not a calendar month

```ts
// Line 531 — existing code
Array.from({ length: 35 }, (_, i) => {
  const d = addDays(weekStart, i - today.getDay());
  ...
```

`weekStart` is the Monday of the current week. `i - today.getDay()` offsets from it by a value that depends on the current day of the week (0–6). The header reads "June 2026" but the cells may start in late May and the grid ends wherever 35 days lands — not at month boundaries. This is a rolling-35-day strip masquerading as a month calendar.

**Fix required:** compute the real first weekday of the month, generate 5–6 complete rows with leading/trailing out-of-month cells greyed out.

### 1.2 No week navigation — the week is frozen

```ts
// Lines 53-54 — existing code
const today = new Date();
const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
```

`today` is not state. It is computed once on mount and never changes. There is no previous/next week button. The provider can only see the current week.

**Fix required:** `selectedDate` must be React state; week/month navigation must advance it.

### 1.3 Blocked times query window never updates

```ts
// Lines 90-91 — existing code
const fromDate = days[0].toISOString();
const toDate = addDays(days[6], 1).toISOString();
```

`days` is derived from the frozen `weekStart`. Even if navigation were added, the blocked-times query would still fetch the original week because `fromDate`/`toDate` are constants, not derived from the navigated week.

**Fix required:** derive query bounds from `selectedDate` state.

### 1.4 All jobs for all time are loaded

`listForProvider(providerId)` returns every job ever for this provider. The grid then filters by `isSameDay`. As jobs accumulate over months this becomes expensive and the grid rendering does the filtering work that belongs in the query.

**Fix required:** add date-range parameters to `listForProvider` or create a dedicated `listForProviderInRange(providerId, from, to)` function.

### 1.5 `provider_availability` table is invisible to the provider after onboarding

The `provider_availability` table (rows: `provider_id`, `day_of_week`, `start_time`, `end_time`) is the definitive record of when a provider accepts bookings. It is written once during onboarding via `saveAvailability` and never exposed in the UI again. The provider has no way to see or change their working hours from the Schedule tab.

This is the most consequential bug: a provider who wants to stop working Saturdays has no path to do so. Homeowners searching for Saturday appointments may still see this provider as available.

**Fix required:** surface and edit `provider_availability` as a first-class element of the Schedule screen.

### 1.6 `homeownerFirstName` does not exist on the Job type

```ts
// Line 466 — existing code
(job as unknown as Record<string, unknown>).homeownerFirstName as string
  ?? (job as unknown as Record<string, unknown>).providerName as string
  ?? 'Job'
```

The `Job` type has `homeownerName` (full name string), not `homeownerFirstName`. The first branch of this coalesce always resolves to `undefined`, so the job chip always displays `providerName` or 'Job', never the homeowner's name.

**Fix required:** use `job.homeownerName?.split(' ')[0] ?? job.homeownerName ?? 'Job'`.

### 1.7 All-day blocking not supported, form shows only hour-to-hour

The "Block time" form requires `startTime` and `endTime` pickers (default 9am–10am). A provider who wants to block an entire day (vacation, sick day) must manually set 12:00 AM to 11:59 PM. No "All day" toggle exists.

**Fix required:** "All day" toggle sets `start_at` to `T00:00:00` and `end_at` to `T23:59:59` automatically.

### 1.8 Multiple overlapping blocks in one cell: only the first is shown/deleteable

```ts
// Lines 482-508 — existing code
{cellBlocks.length > 0 ? (
  <Pressable onPress={() => handleDeleteBlock(cellBlocks[0])} ...>
```

If two blocks overlap in the same hour cell, only `cellBlocks[0]` is rendered and only it is deleteable via tap. The second block is invisible.

**Fix required:** show a count indicator when multiple blocks overlap; tapping opens a detail sheet listing all blocks for that cell.

### 1.9 No upcoming blocked times list

The provider has no way to see all their upcoming blocked periods as a list. They are only visible in the 7-day grid, which means anything beyond the current week is inaccessible. A vacation block three weeks away is invisible.

**Fix required:** add a "Blocked times" section listing all future blocks in chronological order.

### 1.10 Jobs in the grid are not tappable

Job chips render but have no `onPress`. The provider cannot tap a job to see details, navigate to check-in, or manage it.

**Fix required:** job chips must navigate to the job detail screen.

### 1.11 `today` is not reactive

```ts
const today = new Date(); // computed once at mount
```

If the provider leaves the app open past midnight, `today` still points to yesterday. This affects the "today" highlight and any "minimum date" guards on the block-time form.

**Fix required:** derive today from a `useMemo` with a daily-refresh or use `startOfDay(new Date())` computed on each render pass (acceptable on mobile — RN re-renders on foreground resume).

### 1.12 Week grid is too cramped at 7 columns on mobile

At 375px wide, 7 day columns minus a 52px time gutter = ~46px per column. Job text truncates to ~4 characters. This is not a fixable styling problem — it is a layout architecture problem. Seven columns on a 375px screen cannot show readable job information.

**Fix required:** replace the 7-column time grid with a day-sectioned agenda list. The month mini-strip replaces the month grid for overview.

---

## 2. Brainstorm: Four Distinct Layouts

### Option A — Horizontal Date Strip + Agenda List

A scrollable strip of the current month's days runs horizontally at the top (like the iOS Calendar date strip). Below it, a vertical list of "day sections" shows jobs and blocks for the selected day or selected week. Availability editing is accessed from a settings icon.

**Red-team:**
- Familiar mental model; agenda cards are fully readable.
- The monthly overview is only meaningful when you can scroll the strip and see dots. On mobile this strip gets crowded (30+ dots in a row).
- Editing recurring availability (working hours) has no natural home — it feels like a hidden settings screen.
- Infinite scroll in the strip is powerful but the provider cannot see their whole month at a glance.
- **Verdict:** Good for day-by-day browsing, poor for monthly overview and availability editing.

### Option B — Full Month Calendar + Day Detail Bottom Sheet

A true month calendar grid fills the screen above the fold. Tapping a date opens a bottom sheet with that day's jobs and blocks. Recurring availability is in a separate "Availability" settings section outside this screen.

**Red-team:**
- Best monthly overview. Providers can see at a glance which days are busy.
- Day cells are still small (≤ 40px) — you can show at most 1–2 dots per day meaningfully.
- Managing recurring availability separately from the schedule creates a context-switch. Provider needs to cross-reference: "I have a job Tuesday at 10am, so I should block 9–11am" — switching screens breaks this flow.
- Two taps to see job details (tap day → tap job in sheet).
- **Verdict:** Best overview, worst for availability editing, extra tap to reach details.

### Option C — Refactored Week Grid + Availability Section Below

Keep the current 7-column time grid but fix all bugs, add week navigation, and add an availability section below the grid. Block times also become a list section at the bottom.

**Red-team:**
- Minimal change surface — fixes bugs without rethinking the UX.
- The 7-column grid problem (1.12) is inherent to this approach. Job text will still be unreadable at 7 columns on a 375px screen no matter how well the grid is styled.
- Mixes job viewing and availability editing in one cognitive space; long scroll on a screen already doing too much.
- **Verdict:** Right fixes, wrong layout. Grid architecture is the problem, not just the bugs.

### Option D — Two-Tab Architecture: "Jobs" Tab + "Availability" Tab

Two horizontal tabs within the Schedule screen. "Jobs" tab: agenda-style list of upcoming jobs, filterable by week or month view. "Availability" tab: working hours editor + blocked times management.

**Red-team:**
- Cleanest separation of concerns. Each tab is purpose-built.
- A provider blocking a time slot after seeing a conflicting job requires a tab switch — breaks the cross-reference workflow.
- Two levels of nested tabs (app tab bar → screen sub-tabs) adds cognitive depth.
- Navigation state (selected day) needs to be shared between tabs or the UI feels disconnected.
- **Verdict:** Best architecture for separation, worst for the cross-reference use case that drives the primary scenario.

---

## 3. Decision: Synthesized Design — Month Strip + Day Agenda + Availability Panel

None of the four options wins cleanly. The chosen design synthesizes the best parts:

| Source | Element taken |
|---|---|
| Option A | Agenda list (jobs as readable cards, not cramped grid cells) |
| Option B | Month strip for overview (compact, not full-screen) |
| Option C | Keep the existing data mutations; fix all bugs listed in section 1 |
| Option D | Availability section as a persistent card, not a separate tab |

**Core principle:** providers have two distinct jobs on this screen — *viewing their committed schedule* (homeowner-booked jobs) and *managing their own availability* (when they accept new bookings). These are different mental modes. The design keeps them on one screen but visually separates them with a clear divider and section labels.

---

## 4. Screen Architecture

### 4.1 Screen composition (top to bottom)

```
SafeAreaView (background: colors.background)
│
├── ScreenHeader                         [static, 56px]
│     "schedule" (Fraunces italic eyebrow)
│     "[Month Year]" (PlusJakarta 700, 30px)
│
├── MonthStrip (horizontal scroll)       [80px]
│     7-day mini week + prev/next arrows
│     Day cells: number + dot indicators
│     Selected day: primary[600] fill
│
├── WeekAgenda (ScrollView)              [fills remaining]
│     ├── DaySection (Mon)
│     │     ├── DaySectionHeader         ("Monday 23" or "Today")
│     │     ├── JobAgendaCard × N        (each job this day)
│     │     ├── BlockedTimeChip × N      (each block this day)
│     │     └── EmptyDayRow              (if nothing: "open day")
│     ├── DaySection (Tue)
│     │   ...
│     └── DaySection (Sun)
│
├── AvailabilityPanel                    [collapsible card]
│     "Working hours" label
│     7-day toggle + time range per day
│     [Edit hours] → AvailabilitySheet
│
└── BlockedTimesPanel                    [collapsible card]
      Upcoming blocks list (chronological)
      [+ Block time] button → BlockTimeSheet
```

### 4.2 Navigation & floating action

- **Week navigation:** left/right chevrons flanking the month label in the header advance `selectedWeekStart` by ±7 days. The MonthStrip scrolls to the new week automatically.
- **Month navigation:** the MonthStrip can be swiped horizontally (PanGesture); crossing a month boundary updates the header eyebrow text.
- **Block time:** a ghost `+ Block time` row is appended after each DaySection's last item (or as the only item in an open day). Tapping it pre-fills the BlockTimeSheet with that day's date. A persistent "Block time" button also lives in the BlockedTimesPanel.
- **Job tap:** tapping a JobAgendaCard navigates to `/(provider)/jobs/[id]` (the existing job detail screen).

---

## 5. Component Specifications

### 5.1 `MonthStrip`

**Props:** `selectedDate: Date`, `onDateSelect: (d: Date) => void`, `jobs: Job[]`, `blockedTimes: BlockedTime[]`

**Layout (height: 80px, paddingHorizontal: 20):**
- Left: `<ChevronLeft>` (24px, `colors.textSecondary`) — press: `selectedDate -= 7 days`
- Center: `FlatList` horizontal, `showsHorizontalScrollIndicator={false}`, data = 35 days centered on current week (±2 weeks from selected). Each cell is 44px × 60px.
- Right: `<ChevronRight>` — press: `selectedDate += 7 days`

**DayCell (44×60):**
```
[ EEE label — 10px Inter 600, textTertiary / primary[600] if selected or today ]
[ date number — 20px PlusJakarta 700, numericTabular ]
[ indicator dot row — 4px gap between up to 3 dots ]
```

Dot colors:
- `colors.primary[600]` = has a job
- `colors.borderStrong` = has a block
- Both = split dot (left half primary, right half borderStrong — render as two 3px half-circles)

Selected day cell: `borderRadius: 10`, `backgroundColor: colors.primary[600]`, text `colors.textInverse`.

Today (unselected): border `1.5px solid colors.primary[400]`, no fill.

**Auto-scroll:** when `selectedDate` changes, scroll the FlatList to center the selected cell using `ref.scrollToOffset`.

### 5.2 `WeekAgenda`

**Props:** `weekStart: Date`, `jobs: Job[]`, `blockedTimes: BlockedTime[]`, `onJobPress: (job: Job) => void`, `onBlockDay: (date: Date) => void`, `onDeleteBlock: (block: BlockedTime) => void`

**Layout:** `ScrollView` with `contentContainerStyle={{ gap: 0, paddingBottom: 120 }}`.

For each of the 7 days of the selected week, render a `DaySection`.

### 5.3 `DaySection`

**Props:** `date: Date`, `jobs: Job[]`, `blocks: BlockedTime[]`, `onJobPress`, `onBlockPress`, `onBlockDay`

**Header (DaySectionHeader):**
```
┌────────────────────────────────────────────┐
│ MON          23            2 visits        │
│ (label)    (date)         (count caption)  │
└────────────────────────────────────────────┘
```

- Day abbreviation: 11px Inter 600, uppercase, `colors.textTertiary`; today = `colors.primary[600]`
- Date number: 22px PlusJakartaSans 700, `numericTabular`, `colors.textPrimary`; today = `colors.primary[600]`
- Count caption: 11px Inter 400 italic, `colors.accent[600]`; "open" if no jobs/blocks
- Background: `colors.divider` if today, else transparent
- `paddingHorizontal: 20`, `paddingVertical: 10`
- Bottom border: 1px `colors.border`

Below the header, job cards and block chips are indented `paddingLeft: 20, paddingRight: 20`.

**Empty day row:**
```
  ╌╌ open ╌╌  [+ Block]
```
11px Inter italic `colors.textTertiary`. The `[+ Block]` is a ghost button (no background, just `colors.primary[600]` text, 11px, 600 weight).

### 5.4 `JobAgendaCard`

**Props:** `job: Job`, `onPress: () => void`

```
┌─────────────────────────────────────────────────┐
│ ┃  10:00 AM    Lawn Service                  →  │
│ ┃  Sarah M. · 12 Oak Lane · $185             →  │
│ ┃  [confirmed pill]                              │
└─────────────────────────────────────────────────┘
```

- Left accent bar: 3px wide, `colors.primary[600]`, `borderRadius: 2`
- Time: 13px Inter 600, `numericTabular`, `colors.textPrimary`
- Service type: 13px Inter 600 `colors.textPrimary`
- Homeowner + address: 12px Inter 400, `colors.textSecondary`, single line with `·` separators
- Amount: 12px Inter 600, `numericTabular`, `colors.textSecondary`
- Status pill: uses existing `Pill` / `Chip` component, maps `job.status` to color:
  - `booked` → `colors.infoLight` bg, `colors.info` text
  - `confirmed` → `colors.successLight` bg, `colors.success` text
  - `en_route` → `colors.warningLight` bg, `colors.warning` text
  - `in_progress` → `colors.primary[50]` bg, `colors.primary[700]` text
  - `completed` → `colors.divider` bg, `colors.textTertiary` text
  - `cancelled` → `colors.errorLight` bg, `colors.error` text
- Chevron right: 16px, `colors.textTertiary`
- Card: `Card` component, `variant="pressable"`, `onPress`, `marginBottom: 8`

**Homeowner name extraction (bug fix):**
```ts
const firstName = job.homeownerName?.split(' ')[0] ?? 'Client';
```

### 5.5 `BlockedTimeChip`

**Props:** `block: BlockedTime`, `onDelete: () => void`

```
┌──────────────────────────────────────────────┐
│ ▓  [CalendarX 14px]  Vacation · 9 AM–5 PM  ✕ │
└──────────────────────────────────────────────┘
```

- Background: `colors.divider`
- Border-left: 3px `colors.borderStrong`
- Icon: `CalendarX` from lucide-react-native, 14px, `colors.textSecondary`
- Reason (or "Blocked"): 12px Inter 500, `colors.textSecondary`
- Time range: 12px Inter 400, `colors.textTertiary` — format: "9 AM – 5 PM" or "All day"
- Delete X: 16px `X` icon, `colors.textTertiary`; press triggers `Alert.alert` confirm → `onDelete`
- `marginBottom: 6`, `borderRadius: 8`, `paddingHorizontal: 12`, `paddingVertical: 8`

**Multi-block indicator:** if there are 2+ blocks on the same day, show all of them stacked. Each is its own chip — no "show only first" limitation.

### 5.6 `AvailabilityPanel`

**Props:** `providerId: string`

**Data source:** `useQuery({ queryKey: ['availability', providerId], queryFn: () => listAvailability(providerId) })`

(New API function — see Section 6.1)

**Layout (Card, variant="outlined"):**
```
┌──────────────────────────────────────────────┐
│ WORKING HOURS            [Edit]              │
│                                              │
│  Mon Tue Wed Thu Fri                         │
│  ●   ●   ●   ●   ●   (active days, filled)  │
│  ○                   (inactive days, hollow) │
│  9:00 AM – 5:00 PM                           │
└──────────────────────────────────────────────┘
```

- Section label: `label` text style (11px Inter 600, uppercase, `colors.textTertiary`)
- [Edit] button: 11px Inter 600, `colors.primary[600]`, navigates to `AvailabilitySheet`
- Day pills: 7 pills in a row, each 32×32. Active: `colors.primary[600]` fill, `colors.textInverse` text. Inactive: `colors.divider` fill, `colors.textTertiary` text. Not pressable in this view (edit-only in sheet).
- Time summary: "9:00 AM – 5:00 PM" if all active days share the same window (common case). If days have different windows: "Mon–Fri: 8 AM–4 PM · Sat: 9 AM–2 PM". Font: 13px Inter 400, `colors.textSecondary`.

**Empty state (no availability set):** 
`EmptyState` component variant inside the card: heading "No working hours set", body "Set your regular hours so homeowners know when to book you.", CTA "Set hours" → opens `AvailabilitySheet`.

**Loading:** `SkeletonLoader` two rows (day pills row + time text row).

### 5.7 `AvailabilitySheet` (BottomSheetWrapper, snapPoints: ['70%', '92%'])

Allows the provider to set which days they work and what hours.

**Content:**
```
Working hours

  Active days
  [ Mon ] [ Tue ] [ Wed ] [ Thu ] [ Fri ] [ Sat ] [ Sun ]
    (toggle on/off per day)

  Hours  (applies to all active days — per-day hours is Phase 2)
  Start: [ 9:00 AM ▾ ]   End: [ 5:00 PM ▾ ]

  [Save working hours]
```

**Interactions:**
- Day pill toggles active/inactive. Visual: same filled/hollow pill as AvailabilityPanel.
- Start/End: DateTimePicker (mode: "time", minuteInterval: 30) on native; text input (HH:MM) on web.
- If no days are selected, show an inline warning: "Select at least one day." Disable the save button.
- Save calls `saveAvailability(providerId, activeDays, start, end)` (existing function in providers.ts).
- On success: dismiss sheet, invalidate `['availability', providerId]` query, show toast "Working hours saved".
- Note for Phase 2: per-day different hours (e.g., Mon–Fri 9–5, Sat 9–12) is a separate row per day. At MVP, one start/end applies to all active days.

### 5.8 `BlockTimeSheet` (BottomSheetWrapper, snapPoints: ['65%', '88%'])

Replaces the existing inline sheet content. Identical form fields but with two improvements:

**New field: All day toggle**
```
  ┌─────────────────────────────────────────────┐
  │ Date           Wednesday, June 25           │
  │ All day        ○ ────────────── ●           │  ← toggle (RN Switch)
  │ Start time     [hidden when all-day on]      │
  │ End time       [hidden when all-day on]      │
  │ Reason (opt.)  ________________________      │
  └─────────────────────────────────────────────┘
  [Block this time]
```

- When "All day" is ON: `startAt = date + T00:00:00`, `endAt = date + T23:59:59`. Time pickers are hidden (animated collapse via Reanimated `useAnimatedStyle` + `withTiming`).
- Pre-fill date when opened from a day's "Block" ghost button.

**Multi-day support (MVP scope: single day only)**  
Multi-day block (e.g., vacation June 25–29) deferred to Phase 2. At MVP, one date per block. The spec notes the data model already supports it (`start_at`/`end_at` across days), but the UI for range selection (date range picker) adds complexity.

---

## 6. Data Model

### 6.1 Tables read/written

| Table | Operation | When |
|---|---|---|
| `jobs` | SELECT with date range filter | On week navigation; load jobs for `weekStart` to `weekStart + 7d` |
| `provider_blocked_times` | SELECT, INSERT, DELETE | Load on week nav; create/delete via BlockTimeSheet |
| `provider_availability` | SELECT, DELETE + INSERT (replace) | Load on mount; save via AvailabilitySheet |

### 6.2 New API function needed

File: `apps/mobile/lib/api/providers.ts`

```ts
export type AvailabilityRow = {
  id: string;
  provider_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  start_time: string;  // "HH:MM:SS"
  end_time: string;    // "HH:MM:SS"
};

export async function listAvailability(providerId: string): Promise<AvailabilityRow[]> {
  const { data, error } = await supabase
    .from('provider_availability')
    .select('*')
    .eq('provider_id', providerId)
    .order('day_of_week', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AvailabilityRow[];
}
```

### 6.3 Updated `listForProvider` signature

A new overload or separate function adds date range filtering:

```ts
// apps/mobile/lib/api/jobs.ts
export async function listForProviderInRange(
  providerId: string,
  from: string,  // ISO
  to: string,    // ISO
): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_LIST_SELECT)
    .eq('provider_id', providerId)
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)
    .in('status', ['booked', 'confirmed', 'en_route', 'in_progress']) // exclude completed/cancelled from calendar
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapJobListRow);
}
```

Keep the original `listForProvider` for the provider jobs list tab (which shows all-time history).

### 6.4 How this connects to the homeowner booking flow

The homeowner booking wizard calls the `booking-create` edge function which writes to `bookings` and then `jobs`. The homeowner sees available time slots based on:

1. `provider_availability.day_of_week` → is this provider working on the requested day of the week?
2. `provider_availability.start_time / end_time` → does the requested time fall within those hours?
3. `provider_blocked_times` → is there an explicit block covering the requested time?

**Gap:** the `providers-search` edge function currently only checks `is_available_today` (a boolean column on the `providers` table). It does NOT cross-reference `provider_availability` or `provider_blocked_times` for the specific date the homeowner selects.

This spec surfaces the risk: even if a provider correctly sets their availability on the Schedule tab, the booking system may still allow homeowners to book them on a day or time they have explicitly blocked. This is a backend gap that the Schedule screen redesign makes visible — and which the engineering task list should address in the edge function (`booking-create` must validate against both tables before confirming).

**Recommended short-term mitigation:** the `AvailabilityPanel` should display a banner: "Homeowners can book you on your active days within your working hours. Blocked times are excluded." This sets expectations correctly while the edge function validation is being added.

---

## 7. State Management

### 7.1 Local state in `schedule.tsx`

```ts
const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
const weekStart = useMemo(
  () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
  [selectedDate],
);
const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
```

All queries derive from `weekStart` and `weekEnd`. Navigating to the next week: `setSelectedDate(addDays(selectedDate, 7))`.

### 7.2 TanStack Query keys

```ts
// Jobs for visible week
queryKey: ['provider', 'jobs', providerId, weekStart.toISOString()],

// Blocked times for visible week (+ 4 weeks ahead for the upcoming list)
queryKey: ['blocked-times', providerId, weekStart.toISOString()],

// Recurring availability (stable — only invalidated on save)
queryKey: ['availability', providerId],
```

### 7.3 Sheet refs

```ts
const blockTimeSheetRef = useRef<BottomSheetWrapperHandle>(null);
const availabilitySheetRef = useRef<BottomSheetWrapperHandle>(null);

// pre-fill date when opening from a specific day
const [blockPreFillDate, setBlockPreFillDate] = useState<Date | null>(null);

function openBlockSheet(date: Date) {
  setBlockPreFillDate(date);
  blockTimeSheetRef.current?.present();
}
```

---

## 8. Loading, Empty, and Error States

### 8.1 Loading (initial week load)

- `MonthStrip`: render immediately with day numbers; dots are hidden (no jobs/blocks loaded yet — no skeleton needed since the strip is structural).
- `WeekAgenda`: render 7 `DaySectionHeader` stubs, each with one `SkeletonLoader` row (80px × `colors.divider`, `borderRadius: 8`).
- `AvailabilityPanel`: `SkeletonLoader` for the day pills row + time text.

### 8.2 Empty (jobs loaded, day has nothing)

Each DaySection with no jobs and no blocks shows:
```
  ╌╌ Open ╌╌  [+ Block]
```
No full-screen empty state — empty days are expected and desirable (they mean the provider is free).

### 8.3 Empty (no jobs for entire week)

No special treatment beyond the per-day "Open" rows. The AvailabilityPanel at the bottom is the CTA: "Set your working hours so homeowners can find and book you."

### 8.4 Error states

- Jobs fetch error: replace WeekAgenda with `QueryErrorState` (existing component). `onRetry` re-fetches.
- Blocked times fetch error: show an inline warning banner inside the week agenda: "Could not load blocked times. [Retry]"  — do not hide the jobs.
- Availability fetch error: show inside AvailabilityPanel card: "Could not load working hours. [Retry]"
- Create block error: inline `formError` text inside BlockTimeSheet (existing pattern, keep it).
- Delete block error: `Alert.alert` "Could not remove block. Try again." (keep existing pattern).
- Save availability error: inline error in AvailabilitySheet below the save button.

### 8.5 Optimistic delete for blocks

When the provider taps ✕ on a BlockedTimeChip and confirms, immediately remove the chip from the list (optimistic update). If `deleteMutation` fails, re-add the chip and show the error alert. This matches the messaging system's reliability pattern established in the codebase.

---

## 9. Interactions and Gestures

### 9.1 MonthStrip swipe

The `FlatList` in MonthStrip is natively horizontally scrollable. Scrolling past the last loaded day should load more (extend the data array by another 14 days in that direction). No lazy loading needed at MVP — generate ±4 weeks of cells upfront (56 days total, trivially cheap).

### 9.2 Week agenda scroll + sticky headers

`DaySectionHeader` elements should be sticky (position: sticky / `stickyHeaderIndices` in ScrollView). As the user scrolls down through Monday's jobs, "MON 23" stays pinned at the top until Tuesday's header scrolls into view.

Implementation: render WeekAgenda as a single `SectionList` where each section is a day. Pass `stickySectionHeadersEnabled={true}`. This is the correct RN primitive for this pattern.

### 9.3 Jump to "today"

If the provider navigates away from the current week, show a "Today" ghost button in the header (appears when `weekStart !== startOfWeek(today)`). Pressing it: `setSelectedDate(startOfDay(new Date()))`.

### 9.4 Animated collapse for AvailabilityPanel and BlockedTimesPanel

Both panels are collapsible. Collapsed state shows only the section header + a chevron. Expanded shows the full content. Use `useAnimatedStyle` + `withTiming` on a shared value `heightAnim` from `useSharedValue(1)` (0 = collapsed, 1 = expanded). Start expanded on first render.

---

## 10. File Decomposition Plan

The 867-line god screen becomes:

```
apps/mobile/
├── app/(provider)/(tabs)/schedule.tsx        ← orchestrator (~120 lines)
└── components/schedule/
    ├── index.ts                              ← barrel export
    ├── MonthStrip.tsx                        ← ~100 lines
    ├── WeekAgenda.tsx                        ← ~80 lines (SectionList wrapper)
    ├── DaySection.tsx                        ← ~60 lines (header + items)
    ├── JobAgendaCard.tsx                     ← ~70 lines
    ├── BlockedTimeChip.tsx                   ← ~50 lines
    ├── AvailabilityPanel.tsx                 ← ~80 lines
    ├── AvailabilitySheet.tsx                 ← ~150 lines (form + pickers)
    └── BlockTimeSheet.tsx                    ← ~150 lines (extracted from god screen)
```

`schedule.tsx` after decomposition:

```ts
export default function ProviderScheduleScreen() {
  const providerId = useAuthStore((s) => s.providerId) ?? '';
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = addDays(weekStart, 6);
  const blockTimeSheetRef = useRef<BottomSheetWrapperHandle>(null);
  const availabilitySheetRef = useRef<BottomSheetWrapperHandle>(null);
  const [blockPreFillDate, setBlockPreFillDate] = useState<Date>(new Date());

  const { data: weekJobs = [], isError: jobsError } = useQuery({ ... });
  const { data: blockedTimes = [], isError: blocksError } = useQuery({ ... });
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({ ... });

  return (
    <SafeAreaView ...>
      <ScreenHeader ... />
      <MonthStrip
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        jobs={weekJobs}
        blockedTimes={blockedTimes}
      />
      <WeekAgenda
        weekStart={weekStart}
        jobs={weekJobs}
        blockedTimes={blockedTimes}
        onJobPress={(job) => router.push(`/(provider)/jobs/${job.id}`)}
        onBlockDay={(date) => { setBlockPreFillDate(date); blockTimeSheetRef.current?.present(); }}
        onDeleteBlock={(block) => { /* alert + deleteMutation */ }}
        isLoading={jobsLoading || blocksLoading}
        isError={jobsError || blocksError}
      />
      <AvailabilityPanel
        providerId={providerId}
        onEdit={() => availabilitySheetRef.current?.present()}
      />
      <BlockTimeSheet
        ref={blockTimeSheetRef}
        providerId={providerId}
        prefilledDate={blockPreFillDate}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['blocked-times', providerId] })}
      />
      <AvailabilitySheet
        ref={availabilitySheetRef}
        providerId={providerId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['availability', providerId] })}
      />
    </SafeAreaView>
  );
}
```

---

## 11. Edge Cases

| Scenario | Handling |
|---|---|
| Job overlapping a blocked time | Both appear on the same day. The block chip renders below the job card. The UI does NOT hide or flag the conflict — that is an operator concern. The provider sees both and can decide to delete the block. |
| Provider has no `provider_availability` rows | AvailabilityPanel shows EmptyState with "Set hours" CTA. Note: this means homeowners cannot currently book them (edge function should gate on `is_available_today` which may be false). |
| A block covers multiple jobs on the same day | Both items render. Jobs render as JobAgendaCard (confirmed bookings are real commitments), blocks render as BlockedTimeChip. Visual signal to the provider that there is a conflict. |
| Navigating to a future week with no jobs | All 7 DaySections show "Open · + Block". This is correct and expected. |
| Navigating to a past week | Jobs that are `completed` or `cancelled` may appear. Past weeks are read-only — the "Block" ghost button is hidden on DaySections with dates before today. |
| `providerId` is null/empty | All queries are disabled (`enabled: !!providerId`). Show `QueryErrorState` with message "No provider account found." |
| Network offline | TanStack Query serves from cache. If no cache: `QueryErrorState` with retry. |
| Block with no reason | Chip label: "Blocked" (no reason text). Existing behavior, keep it. |
| All-day block + jobs on same day | All-day block renders as a BlockedTimeChip at the top of the DaySection (before job cards), styled with `colors.error + 10% opacity` background (light red tint) to signal that an explicit all-day block may conflict with booked jobs. |
| Two blocks at identical times | Both chips render. Each has its own delete ✕. This is valid (e.g., "Vacation" + "Doctor appointment" both all-day). |

---

## 12. Tokens Reference

All values here are from `apps/mobile/tokens/`. No custom color values.

| Use | Token |
|---|---|
| Active day / job accent | `colors.primary[600]` |
| Today ring | `colors.primary[400]` |
| Blocked time chip bg | `colors.divider` |
| Blocked time border | `colors.borderStrong` |
| Open day text | `colors.textTertiary` |
| Error / warning block | `colors.errorLight` bg + `colors.error` text |
| Confirmed job | `colors.successLight` bg + `colors.success` text |
| Screen background | `colors.background` |
| Card / panel | `colors.surface` |
| Screen eyebrow | `colors.accent[600]` italic, 11px `fonts.bodySemibold` |
| Screen title | `fonts.editorial`, 30px |
| Section headers | `textStyles['label']` (11px Inter 600, uppercase) |
| Job time/name | `textStyles['body-sm']` + `fonts.bodySemibold` |
| Homeowner/address | `textStyles['body-sm']` `colors.textSecondary` |

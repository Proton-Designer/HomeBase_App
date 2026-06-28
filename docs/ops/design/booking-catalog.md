# Booking Catalog (Book Tab) — Design Spec

**Screen:** `apps/mobile/app/(homeowner)/(tabs)/book.tsx`
**Date:** 2026-06-24
**Status:** Ready to build

---

## Problem Statement

Current layout has three compounding failures:

1. **Custom job entry buried.** Post a custom job + My postings live below all 10 service cards. A user who needs something non-catalog must scroll past the entire menu before reaching the CTA they need. On a 6" phone, that is 4–5 screen-lengths of scroll.
2. **No search.** 10 services requires visual scanning of every card. There is no way to jump directly to "pool" or "solar" without reading all cards in order.
3. **Prices are fabricated.** Hardcoded `'From $45/visit'` bears zero relationship to what local providers actually charge. A homeowner who books based on that number and gets a $120 quote loses trust in the platform immediately.

---

## Candidate Layouts (Brainstormed + Red-Teamed)

### Option A — "Search-First" sticky top bar

Header → sticky Search → 2-col service grid → custom CTA at bottom.

**Red-team:** Sticky search wastes permanent screen real estate for a list of 10 items. 2-col cards with "Tree & Plant Trimming" at 18px wrap to 2 lines and break the card height. Search solves discovery; it does not solve the custom CTA burial problem.

**Verdict:** Solves search, not the priority-order problem. 2-col on mobile breaks long titles.

### Option B — "Intent-Split" tabs (Browse | Post Custom)

Segmented toggle at top: Browse Services / Post Custom Job. Each tab shows the relevant content.

**Red-team:** Splits two things the user should see together. A homeowner who does not know they can post custom jobs will never discover the tab. Returning users checking open requests must tap a tab just to see one card. Adds a layer of navigation for something that should be immediately visible.

**Verdict:** Adds friction, hides discoverability. Rejected.

### Option C — "Custom-First Before Catalog"

Page header → Search → Custom job CTA → Active postings strip (conditional) → Services grid.

**Red-team:** Custom CTA before the service grid could confuse first-time users who came here expecting a menu. Posting strip creates a visual section that is invisible on first launch (no postings yet), so the CTA and the grid may feel disconnected at first use. Service grid still requires full scroll on mobile at 1 column.

**Tuning:** Put the active postings strip *after* the CTA (not between CTA and grid) so the CTA is always adjacent to the grid heading. Compact the service cards from 160px to 96px height on mobile to cut scroll depth by ~40%.

**Verdict:** Best intent hierarchy. Tuning resolves the red-team failures.

### Option D — "Category Filters + Grid"

Horizontal filter chips (Recurring / One-off / Custom) above a service grid; Custom is pinned as the last card in the grid.

**Red-team:** The 10 services do not break cleanly into those categories (pest is quarterly, not weekly or one-off). Custom pinned as a grid card is the lowest visibility position possible — it is buried by definition. Adds mental model complexity (why is there a Custom card next to Pool?).

**Verdict:** Over-engineered. Categories do not map to services cleanly. Rejected.

### Synthesis: Option C, tuned

The winning layout applies Option C's intent hierarchy with the red-team fixes:
- Compact service cards (96px height, smaller icon)
- Active postings strip sits *below* the custom CTA, *before* the services eyebrow
- Search is inline (not sticky) — justified by list size (10 items)
- Filter chips are removed (complexity without payoff at this scale)

---

## Final Layout — Top to Bottom

```
SafeAreaView  bg=colors.background  edges=['top']
└── ScrollView  paddingBottom=32

    ── Section  tight ─────────────────────────────────────────────
    [A] Page header
    [B] Search bar
    [C] Post custom job CTA card
    [D] Active postings strip  (conditional — hidden when 0 postings)
    [E] "SERVICES" section divider
    [F] 10 ServiceCards  (compact, 1-col mobile / 2-col tablet / 3-col desktop)
    ──────────────────────────────────────────────────────────────────
```

---

## Element Specifications

### [A] Page Header

No changes from current implementation. Keep existing:

```tsx
<Eyebrow>Book a service</Eyebrow>
<Text style={[textStyles['editorial-title'], { color: colors.textPrimary, marginTop: 8 }]}>
  What do you need?
</Text>
<Text style={[textStyles['body-lg'], { color: colors.textSecondary, marginTop: 6, maxWidth: 540 }]}>
  Pick a service to compare vetted pros — no bidding wars.
</Text>
```

---

### [B] Search Bar

**Position:** Immediately below the subtitle, `marginTop: 20`.

**Component:** Use existing `<Input>` from `components/ui/Input.tsx`.

**Props:**
```tsx
<Input
  variant="filled"          // gray background, no border at rest
  placeholder="Search services…"
  leftIcon={<Search size={18} color={colors.textTertiary} />}
  rightIcon={query.length > 0
    ? <Pressable onPress={() => setQuery('')}><X size={16} color={colors.textTertiary} /></Pressable>
    : null}
  value={query}
  onChangeText={setQuery}
  returnKeyType="search"
  clearButtonMode="never"   // we supply our own clear icon
  autoCorrect={false}
  autoCapitalize="none"
/>
```

**State:** `const [query, setQuery] = useState('');`

**Filter logic (client-side, no debounce needed at 10 items):**
```ts
const filtered = SERVICES.filter(
  (s) =>
    query.trim() === '' ||
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    s.subtitle.toLowerCase().includes(query.toLowerCase()),
);
```

**Empty search state:**

When `filtered.length === 0`:
- Hide the services grid entirely
- Show inline empty state below the search bar:
  ```
  [Icon: SearchX  size=32  color=colors.textTertiary]
  "No match for '{query}'"  — textStyles['title-md']  textPrimary
  "Describe the job yourself and get quotes from local pros."  — body-sm  textSecondary
  [Button: "Post a custom job"  variant=primary]  → router.push('/(homeowner)/post-job/service')
  ```
- Empty state container: centered, paddingVertical: 32

Do NOT show the services grid or active postings strip while search is active with zero results.

---

### [C] Post Custom Job CTA Card

**Position:** Below search bar, `marginTop: 16`.

**Intent:** This is the most structurally important change. The CTA must be visible without any scroll on a standard phone (375px viewport). It lands ~160px below the fold from the search bar. Combined with the header (~140px), total above-fold height is ~300px, which fits on all phones ≥ 375pt tall.

**Design:** Keep the existing card structure — it is well-designed. The only change is its vertical position (moved from below the 10-card grid to above it).

```tsx
<Pressable onPress={() => router.push('/(homeowner)/post-job/service')} style={platformCursorPointer}>
  <Card
    tone="tinted"
    tintColor={colors.accent[100]}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}
  >
    <View style={{
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: colors.accent[500],
      alignItems: 'center', justifyContent: 'center',
    }}>
      <PenLine size={22} color={colors.textInverse} />
    </View>
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
        Post a custom job
      </Text>
      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
        Describe the work, attach photos, get quotes from local pros.
      </Text>
    </View>
    <ChevronRight size={20} color={colors.accent[700]} />
  </Card>
</Pressable>
```

**Sizing note:** Icon reduced from 56px to 48px (saves 16px height). Padding reduced from 20 to 18. This keeps the card under 80px tall so it does not push the services grid off-screen on 375pt phones.

---

### [D] Active Postings Strip

**Visibility:** Rendered only when `postings.length > 0`. Entirely absent from DOM when 0 (no empty state, no placeholder).

**Position:** Below the custom CTA card, `marginTop: 12`.

**Purpose:** Reduces re-posting the same job. Returning users see their pending quotes before starting a new booking. Acts as a "continue where you left off" shortcut.

**Structure:**

```
[Row: Eyebrow "YOUR OPEN REQUESTS"  |  flex:1  |  Pill "{openCount}" tone="info"]
marginTop: 12

[horizontal ScrollView  showsHorizontalScrollIndicator=false  paddingVertical=4]
  [PostingChip x N]  gap=8

[Pressable marginTop=8 alignSelf='flex-end']
  "See all postings →"  body-sm  fontFamily=Inter_600SemiBold  color=colors.primary[600]
```

**Show only:** postings with `status === 'open' || status === 'matched'` in the chip strip. Completed and expired postings are accessible via "See all postings" link.

**`<PostingChip>` — new component (create at `components/booking/PostingChip.tsx`):**

```
Card  variant='outlined'  style={inline}
  flexDirection: 'row'
  alignItems: 'center'
  gap: 8
  paddingHorizontal: 12
  paddingVertical: 10
  minWidth: 200
  maxWidth: 280
  borderRadius: 12

  [ServiceIcon  size=18  color=colors.primary[600]]        ← reuse icon map from SERVICES array
  [View flex:1]
    [Text textStyles['title-md'] numberOfLines=1]           headline
    [Text textStyles['body-sm'] color=textSecondary numberOfLines=1]
      "{matchCount} quote{s}" or "Awaiting quotes"
  [Pill label=statusLabel tone=statusTone]
```

Status → Pill tone mapping:
| `status`    | `label`      | `tone`    |
|-------------|--------------|-----------|
| `open`      | `Awaiting`   | `info`    |
| `matched`   | `Quoted`     | `success` |
| `completed` | `Done`       | `neutral` |
| `expired`   | `Expired`    | `error`   |

Tap on chip → `router.push({ pathname: '/(homeowner)/postings' })` (or a posting detail route if one exists).

**Query:** Reuse the existing `useQuery` already present in `book.tsx`:
```ts
const { data: postings = [] } = useQuery({
  queryKey: ['postings', 'all', userId],
  queryFn: () => postingsApi.listForHomeowner(userId!),
  enabled: !!userId,
});
const openPostings = postings.filter(p => p.status === 'open' || p.status === 'matched');
```

**Loading state for strip:** While `isLoading`, render two skeleton chips (fixed width 220px, height 56px, borderRadius 12, backgroundColor colors.divider, opacity 0.6). Do not show the "See all postings" link while loading.

---

### [E] Services Section Divider

**Position:** Below the postings strip (or below CTA if no postings), `marginTop: 24`.

```tsx
<Eyebrow style={{ marginBottom: 12 }}>Services</Eyebrow>
```

No title or subtitle — the page header already set the context. The Eyebrow label is enough to visually anchor the transition from the CTA/strip area to the catalog.

---

### [F] ServiceCard Grid

**Breakpoints (unchanged):**
- Mobile: `width='100%'` (1 column)
- Tablet: `width='48%'` (2 columns)
- Desktop: `width='32%'` (3 columns)

**2-col on mobile explicitly rejected:** The longest service name ("Tree & Plant Trimming") wraps to 2 lines at ≈163px card width at `title-lg` (18px), breaking card height. 1-col preserved on mobile.

**Card height: compacted from 160px to 96px `minHeight`.**

Compaction changes:
- `padding`: 18 → 14
- Icon circle: 64×64 → 48×48 (`borderRadius: 24`)
- Icon size: 30 → 24
- `textStyles['title-lg']` (18px) → `textStyles['title-md']` (16px) for the service name
- `subtitle` stays `body-sm` (13px)
- Price label stays `body-sm` + `numericTabular` (13px)

These 4 changes cut individual card height by ~64px without removing any content. 10 cards × 64px = 640px of recovered scroll depth.

**Gap between cards:** 12 (reduced from 14 — saves another 126px across 9 gaps).

**ServiceCard props interface** (updated):
```ts
{
  index: number;
  title: string;
  subtitle: string;
  price: string | null;    // null = loading; undefined = no data → show 'Get a quote'
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
  width: string | number;
  onPress: () => void;
}
```

**Stagger entrance:** Keep `enterStaggered(index)` — it already handles web no-op correctly.

---

## Price Ranges — Data Source and API

### Problem

All 10 prices are hardcoded constants (`'From $45/visit'`). These are fabricated numbers that do not reflect local market data. A homeowner comparing providers will see "From $45" in the catalog, then open quotes at $75–$120 — an unpleasant surprise that erodes trust.

### Correct Source

The `providers` table already stores `price_range_min_cents` and `price_range_max_cents` per provider. The correct price to show in the catalog is **the minimum `price_range_min_cents` across all active local providers for that service type** — i.e., the lowest price a homeowner in this area could realistically get.

### New API Function

Add to `apps/mobile/lib/api/providers.ts`:

```ts
/**
 * Returns the floor price (lowest price_range_min_cents) for each service type
 * among active providers. Used to surface real price ranges on the Book catalog.
 * Falls back gracefully — returns an empty Record if no providers are seeded.
 */
export async function getPriceFloors(): Promise<Partial<Record<ServiceType, number>>> {
  const { data, error } = await supabase
    .from('providers')
    .select('service_types, price_range_min_cents')
    .eq('is_active', true)
    .not('price_range_min_cents', 'is', null);

  if (error || !data) return {};

  const floors: Partial<Record<ServiceType, number>> = {};
  for (const row of data as { service_types: string[]; price_range_min_cents: number }[]) {
    for (const svcType of (row.service_types ?? [])) {
      const existing = floors[svcType as ServiceType];
      if (existing === undefined || row.price_range_min_cents < existing) {
        floors[svcType as ServiceType] = row.price_range_min_cents;
      }
    }
  }
  return floors;
}
```

**Query key:** `['price-floors']` (add to `lib/queryKeys.ts`).

**Why client-side aggregation instead of a SQL GROUP BY?**
The providers table is small (tens of rows at MVP scale) and the client already fetches providers for the search flow. Doing the aggregation in JS avoids an additional edge function or RPC. If the table grows past a few hundred rows, move to a Supabase RPC: `SELECT unnest(service_types) AS svc, MIN(price_range_min_cents) AS floor FROM providers WHERE is_active = true GROUP BY svc`.

### Usage in `book.tsx`

```ts
import { getPriceFloors } from '../../../lib/api/providers';

const { data: priceFloors = {}, isLoading: pricesLoading } = useQuery({
  queryKey: ['price-floors'],
  queryFn: getPriceFloors,
  staleTime: 5 * 60 * 1000,   // 5 min — floor prices don't change per-visit
});
```

### Price Label Derivation

```ts
const PRICE_UNIT: Record<ServiceType, '/visit' | '/job'> = {
  lawn:      '/visit',
  cleaning:  '/visit',
  pool:      '/visit',
  pest:      '/visit',
  pressure:  '/job',
  window:    '/visit',
  gutter:    '/visit',
  detailing: '/visit',
  tree:      '/job',
  solar:     '/visit',
};

function priceLabel(id: ServiceType, floors: Partial<Record<ServiceType, number>>, loading: boolean): string | null {
  if (loading) return null;                               // null = render skeleton
  const cents = floors[id];
  if (!cents) return 'Get a quote';                       // no local providers yet
  return `From $${Math.round(cents / 100)}${PRICE_UNIT[id]}`;
}
```

**Hardcoded fallback (development / no providers seeded):**

Keep the existing `SERVICES` array `price` field as the seed constant. When `priceFloors[id]` is undefined AND `pricesLoading === false`, fall back to the hardcoded string rather than showing "Get a quote". This means the catalog always shows *something* useful, even in a fresh dev environment. Hardcoded fallback is clearly annotated in code so it does not survive to production accidentally:

```ts
// HARDCODED FALLBACK — replace once providers table is seeded in production
const PRICE_FALLBACK: Record<ServiceType, string> = { ... };
```

---

## Loading States

| State | Behavior |
|---|---|
| `userId` is null (logged out) | Postings query disabled; strip not rendered |
| `postingsLoading === true` | Strip shows 2 skeleton chips (220×56px, `colors.divider`, opacity 0.6) |
| `pricesLoading === true` | Price label slot in each ServiceCard shows a skeleton bar (60×12px, `colors.divider`, borderRadius 6) |
| `pricesError` | Silent fallback to hardcoded prices — not a critical failure, no toast |
| `postingsError` | Strip hidden — not shown if data unavailable, no toast |
| Search `filtered.length === 0` | Hide grid and strip; show centered empty state with CTA |

---

## Error States

No error toasts on this screen. The Book catalog is a discovery surface, not a transactional screen. Showing errors would increase anxiety for users who are just browsing. Failures degrade gracefully (hardcoded prices, hidden strip) without communicating failure.

Exception: if `userId` is present but `postings` fails consistently, the next screen in the booking flow will surface the error at the point of need.

---

## Edge Cases

| Case | Handling |
|---|---|
| Homeowner has postings but ALL are completed/expired | Strip hidden (filter to open+matched only) |
| Homeowner has 10+ open postings | Strip shows first N in the horizontal scroll; "See all postings" link handles overflow |
| Service type not in `priceFloors` | Show hardcoded fallback string (not "Get a quote") during seeding phase |
| `postings` is loading but `query` changes | Search still filters SERVICES synchronously; postings strip shows skeleton |
| Search clears while filtered | `filtered` immediately resets to all 10; grid re-enters with stagger (index 0–9) |
| Tablet/Desktop with long search + postings strip visible | Strip scrolls horizontally within its fixed section width; grid stays responsive |
| Provider has `price_range_min_cents = 0` | Treated as null (guard: `if (!cents || cents <= 0) return fallback`) |

---

## Removed Elements

**"My postings" outlined card** (current bottom section) is removed. Its functionality is fully replaced by:
1. The active postings chip strip (per-posting visibility, immediately actionable)
2. The "See all postings →" text link (same navigation target)

The removal eliminates one scroll stop and the redundant section heading ("Don't see exactly what you need?") that currently separates services from custom — a heading that was only necessary because they were in the wrong order.

---

## New Component: `PostingChip`

**File:** `apps/mobile/components/booking/PostingChip.tsx`

**Props:**
```ts
interface PostingChipProps {
  posting: Posting;
  serviceIcon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
}
```

**Uses:** `Card` (variant=`'outlined'`), `Pill`, standard `Text` styles, `usePress` from `lib/motion.ts`.

**Does not use:** any new third-party package. No new dependencies.

---

## Modified Components

**`ServiceCard`** (inline in `book.tsx`) — two prop changes:
- `price: string` → `price: string | null` (null = render skeleton shimmer)
- `minHeight: number` removed — replaced with fixed `height: 96`

Internal layout change: icon 48px, padding 14, title `title-md` instead of `title-lg`.

---

## Interaction & Animation

| Interaction | Behavior |
|---|---|
| Tap ServiceCard | `usePress` scale/opacity; navigates to `/(homeowner)/booking/service-select` |
| Tap Custom CTA card | Same `usePress` via `Card pressable` variant; navigates to `/(homeowner)/post-job/service` |
| Tap PostingChip | `usePress`; navigates to `/(homeowner)/postings` |
| Tap "See all postings →" | No animation; navigates to `/(homeowner)/postings` |
| Search text changes | Services grid re-renders synchronously; `enterStaggered` re-fires on mount of filtered results |
| Search clear (tap X) | `setQuery('')`; grid re-enters with stagger |
| New posting strip visible (postings loaded after initial render) | Strip fades in with `entering={enter}` from `lib/motion.ts` |

---

## Demand Event

When a homeowner types in the search bar, track after 300ms idle (debounced `setTimeout`, cleared on each keystroke):

```ts
if (query.trim().length >= 2) {
  void track({
    event: 'catalog_search',
    metadata: { query: query.trim(), resultCount: filtered.length },
  });
}
```

If `filtered.length === 0`, this writes a `demand_events` row for an uncovered service type — exactly the signal needed for Phase 4 category expansion decisions.

---

## Full Section Order Reference

```
SafeAreaView (bg: colors.background)
  ScrollView (contentContainerStyle: { paddingBottom: 32 })
    Section (tight)
      [A] Eyebrow "Book a service"                               — unchanged
          H1 "What do you need?"                                 — unchanged
          Body "Pick a service to compare vetted pros…"          — unchanged
      [B] Input (search, variant=filled, marginTop=20)
      [C] Pressable → Card (custom CTA, marginTop=16)
      [D] IF openPostings.length > 0:
            Row (Eyebrow + Pill, marginTop=20)
            ScrollView horizontal (PostingChips, marginTop=8)
            "See all postings →" text link (marginTop=8, alignSelf=flex-end)
      [E] Eyebrow "Services" (marginTop=24, marginBottom=12)
      [F] IF filtered.length > 0:
            View (flexWrap=wrap, gap=12)
              AnimatedPressable × filtered.length (ServiceCard compact)
          ELSE:
            EmptySearchState (SearchX icon + copy + CTA button)
```

---

## Files to Create or Modify

| File | Action |
|---|---|
| `app/(homeowner)/(tabs)/book.tsx` | Modify — restructure layout, add search state, use price floors query, compact ServiceCard |
| `lib/api/providers.ts` | Modify — add `getPriceFloors()` function |
| `lib/queryKeys.ts` | Modify — add `priceFloors: () => ['price-floors'] as const` under a new `catalog` key |
| `components/booking/PostingChip.tsx` | Create — new compact chip component |

No new packages required. No new navigation routes required. All destinations already exist.

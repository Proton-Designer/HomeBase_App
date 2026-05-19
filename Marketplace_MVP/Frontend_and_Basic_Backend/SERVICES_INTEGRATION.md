# HomeBase — 10-Vertical Services Integration Spec

> **What this is.** A drop-in spec for extending the HomeBase Marketplace MVP from 2 verticals (lawn, cleaning) to 10 recurring home-service verticals. Every section maps onto code that already exists in `apps/mobile/`. Another Claude Code agent should be able to execute this in one pass: copy the patches into `lib/types.ts`, `lib/mocks/providers.ts`, `lib/mocks/jobs.ts`, the two booking screens, and the home tab — done.
>
> **Where to start.** Read the [Phase Split](#phase-split) first to know which 2 verticals you're already shipping (`lawn`, `cleaning`), which 4 land in MVP-1 alongside them, which 2 wait for Phase 2 expansion, and which 2 wait for the OS rollout in Phase 3/4. Then go straight to [Cross-Cutting Changes](#cross-cutting-changes) for the consolidated `ServiceType` patch — that single union edit unlocks every per-vertical section. Per-vertical sections then specify mock providers, mock jobs, icons, copy, and trust-score weighting.

---

## Phase Split

The MVP scope in `MVP_OVERVIEW.md` is explicit: lawn + cleaning are the only live verticals at MVP, and the entry-screen footer in `book.tsx` already promises "Pest Control, HVAC, and Plumbing are coming soon." The wedge needs to *prove the model* — recurring revenue, single-routed booking, check-in trust score, instant payouts — not max breadth. Verticals are added in waves that match where each one fits the wedge.

| Wave | Verticals | Why this wave |
|---|---|---|
| **MVP-1 (now)** | Lawn care, House cleaning, **Pool cleaning**, **Pest control**, **Pressure washing**, **Window cleaning** | All six are recurring-by-default (weekly/biweekly/monthly/quarterly), low trust-variance, solo-operator-friendly, and dense in Austin 78704. They directly test MVP-1 (subscription plans) and MVP-3 (composite trust score) without adding regulatory load beyond Tier 1/2 verification. |
| **Phase 2 (Month 6–12)** | **Gutter cleaning**, **Car detailing** | Both are 2x/year (gutter) or monthly-but-mobile-mode-different (detailing). They demand a frequency variant beyond `weekly\|biweekly\|monthly` (semi-annual) and detailing is vehicle-attached not address-attached — a routing-engine edge case best deferred until the core flywheel is live. |
| **Phase 3 (Month 12–18)** | **Tree & plant trimming** | Per-tree/per-job pricing with variable scope, occasional ISA-arborist licensing, higher damage-claim severity. Land it once the OS Beta is live so the Quote Agent can vision-price the bid. |
| **Phase 4 (Month 18–24)** | **Solar panel cleaning** | Roof access + electrical proximity = highest insurance-tier vertical. Pair it with the OS commercial launch when full-Tier verification + crew accounts are battle-tested. |

Justification anchored to `FRONTEND_GUIDE.md`: §4.6 "Coming soon" copy and §5 onboarding "Services offered: Lawn Care, Home Cleaning (both MVP-active). Other services show as 'Coming soon' (disabled checkboxes)" — this spec converts those 8 disabled checkboxes into staged enables.

---

## Industry Comparison Matrix

| Vertical | Avg ticket / visit | Recurring cadence | Pricing model | Photo expectation | Insurance/license quirk |
|---|---|---|---|---|---|
| Lawn care | $38–$110 (HomeAdvisor avg ~$123) | Weekly / biweekly | Per visit (lot size) | Optional before/after | GL insurance; chemical applicator license if treating |
| House cleaning | $118–$237 standard; $230–$600 deep | Weekly / biweekly / monthly | Per visit (sqft or hourly) | Required interior before/after for deep | Bonded + GL |
| Pool cleaning | $80–$150/mo; ~$235/visit avg | Weekly | Monthly subscription, per visit | Required water-clarity photo | CPO certification (varies by state) |
| Pest control | $75–$120/visit (quarterly) | Quarterly (most common) | Per visit; tri-annual plan | Optional pest-evidence photo | State applicator license required |
| Car detailing | $150–$300 full; $100–$200 interior | Monthly | Per vehicle, package tiers | Required before/after exterior | Mobile water-reclamation rules in some cities |
| Pressure washing | $220–$450 (avg ~$320) | 1–2x/year | Per sqft ($0.20–$0.50) or fixed | Required before/after | GL; lead-paint awareness on pre-1978 homes |
| Gutter cleaning | $150–$250 (range $80–$400) | Semi-annual (spring + fall) | Per linear foot ($0.95–$2.25) | Required gutter-empty photo | GL; ladder/fall-protection |
| Window cleaning | $150–$250 (avg ~$221) | Quarterly / semi-annual | Per pane ($8–$15) or per job | Optional | GL; high-rise certification (n/a residential) |
| Tree trimming | $250–$500/tree (avg ~$350) | Every 1–5 years | Per tree, scope-variable | Required pre-job hazard photo | ISA-arborist preferred; GL + workers' comp critical |
| Solar panel cleaning | $150–$500/visit ($8–$25/panel) | 1–2x/year | Per panel or per visit | Required before/after array | GL; roof-work + electrical proximity |

Sources cited inline in each per-vertical primer below. Numbers without a citation are explicitly marked "estimate".

---

## How each section maps to code

For every vertical:

- **`lib/types.ts`** — adds a literal to `ServiceType`. Consolidated patch in [Cross-Cutting](#cross-cutting-changes).
- **`lib/mocks/providers.ts`** — append 1–2 mock providers (per spec).
- **`lib/mocks/jobs.ts`** — append 1 mock `Job`.
- **`app/(homeowner)/(tabs)/book.tsx`** — add an entry to the `SERVICES` array (icon + tint + copy).
- **`app/(homeowner)/booking/service-select.tsx`** — add an entry to the local `SERVICES` price-range array.
- **`tokens/colors.ts`** — add a `service<X>Tint` swatch where new tints are needed (declared once in [Cross-Cutting](#cross-cutting-changes)).

Trust-score weighting is advisory — the schema in `types.ts` keeps all four `CompositeScore` components — but downstream Phase 4 ranking + Phase 4 "why this score" Haiku prompts will weight per vertical per the table below.

---

## 1. Lawn Care & Landscaping (`lawn`) — already shipping

**Industry primer.** Average residential mow $38–$110, HomeAdvisor 2025 average ~$123/visit. Industry $158.9B in 2024 (IBISWorld). Most homeowners on weekly during growing season, biweekly off-peak. Job duration 20–45 min for ¼-acre. GL insurance standard; state chemical-applicator license needed only if pre/post-emergent applied.
**Operator persona.** Solo or 2-person crew, truck + trailer + mower + edger + blower. Peak Apr–Oct in Austin. Routes typically 12–18 stops/day.
**Booking shape.** Required: address, lot-size band (S/M/L), gate access. Optional: special instructions (dog in yard, sprinkler heads). Photo: optional before/after. Pricing: per visit, lot-size driven.
**Trust score weighting.** Reliability (35%) > Quality (30%) > Professionalism (20%) > Communication (15%). Show-up consistency is the wedge — homeowner cares more that you came on Tuesday than that you texted about it.
**Code changes.** Already present. No edits needed in this section beyond updating `priceRangeMin/Max` ranges if QA shows drift.
**Key UI copy strings.**
- Label: `Lawn Care`
- Subtitle: `Mowing, edging, trimming`
- Price line: `From $45/visit`
- Empty state: `No lawn pros booked yet — your yard is one tap away.`

---

## 2. House Cleaning (`cleaning`) — already shipping

**Industry primer.** Standard $118–$237/visit; deep-clean $230–$600. $0.10–$0.17/sqft regular, $0.11–$0.30/sqft deep. Most homeowners biweekly. 90–180 min for 2,000 sqft standard.
**Operator persona.** Solo or 2–3 person crew. Bonded + GL standard. Peak demand Mon–Thu mornings. Many bilingual EN/ES in Austin.
**Booking shape.** Required: address, sqft, bed/bath count, clean type (standard/deep/move-in-out). Optional: pet, eco-products preference. Photo: required interior before/after on deep-cleans.
**Trust score weighting.** Quality (40%) > Professionalism (25%) > Communication (20%) > Reliability (15%). Quality (visible cleanliness) and trust-in-your-home (professionalism) outrank schedule rigor — a 30-min late cleaner who deep-cleans well wins.
**Code changes.** Already present.
**Key UI copy strings.**
- Label: `Home Cleaning`
- Subtitle: `Standard, deep clean, move-in/out`
- Price line: `From $80/visit`
- Empty state: `No cleans booked yet — fresh sheets are 2 taps away.`

---

## 3. Pool Cleaning (`pool`) — MVP-1

**Industry primer.** $80–$150/month full service for small in-ground pools; $150–$200/month for larger. ~$235 average per-visit (HomeAdvisor). Recurring weekly is the standard cadence; visits run 30–45 min (skim, vacuum, chemical balance, filter check). CPO (Certified Pool Operator) certification varies by state — Texas does not require it for residential, but it's a trust marker.
**Operator persona.** Solo. Truck with chemical bay + telescoping pole + leaf rake + DPD test kit. Peak Apr–Sep in Austin; year-round on heated pools. Routes 15–25 pools/day.
**Booking shape.** Required: address, pool type (in-ground / above-ground), pool size band, chemical preference (chlorine / salt). Optional: cover y/n, pet access. Photo: required water-clarity post-visit photo (clarity = check-in evidence).
**Trust score weighting.** Reliability (40%) > Quality (30%) > Communication (20%) > Professionalism (10%). Algae bloom from one missed visit = $400 shock-treatment claim. Show-up consistency rules.
**Code changes.**
```ts
// lib/mocks/providers.ts — append
{
  id: 'prov_006',
  name: 'Carlos Vega',
  businessName: 'Crystal Clear Pool Co.',
  avatarUrl: 'https://i.pravatar.cc/150?img=15',
  bio: 'Weekly pool service across South Austin. CPO-certified, salt + chlorine systems.',
  verificationTier: 2,
  compositeScore: { overall: 4.7, reliability: 4.9, quality: 4.7, communication: 4.4, professionalism: 4.6 },
  checkInCount: 118,
  serviceTypes: ['pool'],
  priceRangeMin: 35,
  priceRangeMax: 65,
  isAvailableToday: true,
  distanceMiles: 2.8,
},
```
```ts
// lib/mocks/jobs.ts — append
{
  id: 'job_003',
  bookingId: 'bk_003',
  providerId: 'prov_006',
  providerName: 'Carlos Vega',
  homeownerId: 'home_001',
  status: 'confirmed',
  serviceType: 'pool',
  scheduledAt: tomorrow.toISOString(),
  amountCents: 5500,
  timestamps: { booked: new Date(Date.now() - 86400_000).toISOString() },
},
```
```ts
// app/(homeowner)/(tabs)/book.tsx — import update + SERVICES entry
import { Leaf, Sparkles, Waves } from 'lucide-react-native';
// in SERVICES array:
{ id: 'pool', title: 'Pool Cleaning', subtitle: 'Weekly skim, chem-balance, filter', price: 'From $35/visit', Icon: Waves, bg: colors.servicePoolTint },
```
```ts
// app/(homeowner)/booking/service-select.tsx — SERVICES entry
{ id: 'pool', label: 'Pool Cleaning', minPrice: 35, maxPrice: 65 },
```
**Key UI copy strings.**
- Label: `Pool Cleaning`
- Subtitle: `Weekly skim, chem-balance, filter`
- Price line: `From $35/visit`
- Empty state: `No pool service yet — keep the algae away with one tap.`

---

## 4. Pest Control (`pest`) — MVP-1

**Industry primer.** Quarterly is the dominant cadence: $75–$120/visit, $300–$900/year. Tri-annual plans most popular per Terminix/HomeAdvisor 2025 data. Visit duration 30–60 min (perimeter + interior treat). State applicator license **required** in Texas (TDA SPCS) — this is non-negotiable verification.
**Operator persona.** Solo or 2-person. Truck with sprayer tank + bait stations + respirator. Peak demand spring (ants/roaches) + fall (rodents). Routes 8–14 stops/day.
**Booking shape.** Required: address, home sqft, target pest, interior y/n. Optional: kids/pets present (changes chemical selection), prior treatment. Photo: optional pest-evidence photo from homeowner pre-visit.
**Trust score weighting.** Communication (35%) > Quality (30%) > Reliability (20%) > Professionalism (15%). Pest control is invisible work — homeowner can't see results for days. The follow-up "here's what I sprayed and why" message is the trust mechanic.
**Code changes.**
```ts
// lib/mocks/providers.ts — append
{
  id: 'prov_007',
  name: 'Jordan Patel',
  businessName: 'Lone Star Pest Defense',
  avatarUrl: 'https://i.pravatar.cc/150?img=22',
  bio: 'TDA-licensed. Quarterly plans; pet- and kid-safe formulations on request.',
  verificationTier: 2,
  compositeScore: { overall: 4.7, reliability: 4.5, quality: 4.7, communication: 4.9, professionalism: 4.6 },
  checkInCount: 94,
  serviceTypes: ['pest'],
  priceRangeMin: 85,
  priceRangeMax: 160,
  isAvailableToday: false,
  distanceMiles: 3.6,
},
```
```ts
// lib/mocks/jobs.ts — append
{
  id: 'job_004',
  bookingId: 'bk_004',
  providerId: 'prov_007',
  providerName: 'Jordan Patel',
  homeownerId: 'home_001',
  status: 'booked',
  serviceType: 'pest',
  scheduledAt: tomorrow.toISOString(),
  amountCents: 11500,
  timestamps: { booked: new Date(Date.now() - 7200_000).toISOString() },
},
```
```ts
// app/(homeowner)/(tabs)/book.tsx — import update + SERVICES entry
import { Leaf, Sparkles, Waves, Bug } from 'lucide-react-native';
{ id: 'pest', title: 'Pest Control', subtitle: 'Quarterly perimeter & interior', price: 'From $85/visit', Icon: Bug, bg: colors.servicePestTint },
```
```ts
// app/(homeowner)/booking/service-select.tsx — SERVICES entry
{ id: 'pest', label: 'Pest Control', minPrice: 85, maxPrice: 160 },
// also extend FREQS for this vertical (quarterly) — see Cross-Cutting
```
**Key UI copy strings.**
- Label: `Pest Control`
- Subtitle: `Quarterly perimeter & interior`
- Price line: `From $85/visit`
- Empty state: `No pest plan yet — get ahead of ant season with one tap.`

---

## 5. Pressure Washing (`pressure`) — MVP-1

**Industry primer.** $220–$450/job (avg ~$320), $0.20–$0.50/sqft. IBISWorld: pressure-washing industry $1.2B 2024, 32K+ businesses. Cadence 1–2x/year (spring + pre-listing). Job duration 2–4 hours for full-house exterior + driveway. Lead-paint AWPP awareness needed on homes built pre-1978.
**Operator persona.** Solo. Truck/trailer with hot-water surface cleaner + 4 GPM pump + chem injector. Peak Mar–Jun. 2–3 jobs/day.
**Booking shape.** Required: address, surfaces (siding / driveway / deck / fence), home sqft. Optional: soft-wash y/n (algae-safe), gutter brightening add-on. Photo: required before/after exterior.
**Trust score weighting.** Quality (40%) > Professionalism (25%) > Reliability (20%) > Communication (15%). Streaks, etched concrete, killed plants — quality outcome is the entire product.
**Code changes.**
```ts
// lib/mocks/providers.ts — append
{
  id: 'prov_008',
  name: 'Brett Holloway',
  businessName: 'ATX Surface Pros',
  avatarUrl: 'https://i.pravatar.cc/150?img=33',
  bio: 'Soft-wash + hot-water pressure cleaning. Houses, drives, fences. Plant-safe.',
  verificationTier: 1,
  compositeScore: { overall: 4.6, reliability: 4.5, quality: 4.8, communication: 4.4, professionalism: 4.6 },
  checkInCount: 47,
  serviceTypes: ['pressure'],
  priceRangeMin: 220,
  priceRangeMax: 450,
  isAvailableToday: true,
  distanceMiles: 4.0,
},
```
```ts
// lib/mocks/jobs.ts — append
{
  id: 'job_005',
  bookingId: 'bk_005',
  providerId: 'prov_008',
  providerName: 'Brett Holloway',
  homeownerId: 'home_001',
  status: 'completed',
  serviceType: 'pressure',
  scheduledAt: yesterday.toISOString(),
  amountCents: 32000,
  timestamps: {
    booked: new Date(Date.now() - 5 * 86400_000).toISOString(),
    completed: new Date(Date.now() - 23 * 3600_000).toISOString(),
  },
},
```
```ts
// app/(homeowner)/(tabs)/book.tsx — import update + SERVICES entry
import { Leaf, Sparkles, Waves, Bug, Droplets } from 'lucide-react-native';
{ id: 'pressure', title: 'Pressure Washing', subtitle: 'Siding, drives, fences, decks', price: 'From $220/job', Icon: Droplets, bg: colors.servicePressureTint },
```
```ts
// app/(homeowner)/booking/service-select.tsx — SERVICES entry
{ id: 'pressure', label: 'Pressure Washing', minPrice: 220, maxPrice: 450 },
```
**Key UI copy strings.**
- Label: `Pressure Washing`
- Subtitle: `Siding, drives, fences, decks`
- Price line: `From $220/job`
- Empty state: `No washes scheduled — your siding's grime is one tap away from gone.`

---

## 6. Window Cleaning (`window`) — MVP-1

**Industry primer.** $150–$250/job (avg ~$221, range $202–$397). $8–$15/pane or $45–$75/hr. Cadence quarterly or semi-annual; 10–20% discount on recurring contracts (Thumbtack 2025). Job duration 1–3 hours for a single-story 15–25 window home.
**Operator persona.** Solo. Truck + ladder + water-fed pole + squeegees + microfibers. Peak spring + pre-holiday fall. 3–5 jobs/day.
**Booking shape.** Required: address, window count band (1–15 / 16–30 / 31+), interior+exterior or exterior only, story count. Optional: screen cleaning add-on, hard-water spot removal. Photo: optional.
**Trust score weighting.** Quality (35%) > Professionalism (30%) > Reliability (20%) > Communication (15%). Streak-free finish + not breaking screens is the deliverable; trust-in-home matters because they're inside.
**Code changes.**
```ts
// lib/mocks/providers.ts — append
{
  id: 'prov_009',
  name: 'Hannah Lee',
  businessName: 'Streak-Free ATX',
  avatarUrl: 'https://i.pravatar.cc/150?img=49',
  bio: 'Interior + exterior. Water-fed pole for second-story. Screens included.',
  verificationTier: 1,
  compositeScore: { overall: 4.8, reliability: 4.7, quality: 4.9, communication: 4.7, professionalism: 4.8 },
  checkInCount: 71,
  serviceTypes: ['window'],
  priceRangeMin: 150,
  priceRangeMax: 320,
  isAvailableToday: true,
  distanceMiles: 1.9,
},
```
```ts
// lib/mocks/jobs.ts — append
{
  id: 'job_006',
  bookingId: 'bk_006',
  providerId: 'prov_009',
  providerName: 'Hannah Lee',
  homeownerId: 'home_001',
  status: 'en_route',
  serviceType: 'window',
  scheduledAt: tomorrow.toISOString(),
  amountCents: 18500,
  timestamps: {
    booked: new Date(Date.now() - 3 * 86400_000).toISOString(),
    confirmed: new Date(Date.now() - 2 * 86400_000).toISOString(),
    en_route: new Date(Date.now() - 600_000).toISOString(),
  },
},
```
```ts
// app/(homeowner)/(tabs)/book.tsx — import update + SERVICES entry
import { Leaf, Sparkles, Waves, Bug, Droplets, SquareDashed } from 'lucide-react-native';
{ id: 'window', title: 'Window Cleaning', subtitle: 'Interior + exterior, screens included', price: 'From $150/visit', Icon: SquareDashed, bg: colors.serviceWindowTint },
```
```ts
// app/(homeowner)/booking/service-select.tsx — SERVICES entry
{ id: 'window', label: 'Window Cleaning', minPrice: 150, maxPrice: 320 },
```
**Key UI copy strings.**
- Label: `Window Cleaning`
- Subtitle: `Interior + exterior, screens included`
- Price line: `From $150/visit`
- Empty state: `No window cleans yet — sunshine is one tap away.`

---

## 7. Gutter Cleaning (`gutter`) — Phase 2

**Industry primer.** $150–$250/visit (range $80–$400; avg ~$300 for 150 linear feet on a 2-story per Angi/HomeAdvisor 2025). $0.95–$2.25/linear foot. Cadence semi-annual (spring + fall) — 2x/yr is the recommended baseline; near-deciduous-trees homes go 3–4x/yr. Duration 1–2 hours.
**Operator persona.** Solo. Truck + extension ladder + leaf-blower attachment + bucket. Peak Sep–Nov + Mar. Often paired with pressure washing or window cleaning as upsells. Fall-protection PPE mandatory.
**Booking shape.** Required: address, story count, linear feet band (estimate from address). Optional: downspout flush add-on, gutter-guard install quote. Photo: required gutter-empty post-visit.
**Trust score weighting.** Reliability (35%) > Quality (30%) > Professionalism (20%) > Communication (15%). Showing up before storm season is the value; clogged downspout in a storm = roof damage claim.
**Code changes.**
```ts
// lib/mocks/providers.ts — append
{
  id: 'prov_010',
  name: 'Riley O''Connor',
  businessName: 'Up & Over Gutter Co.',
  avatarUrl: 'https://i.pravatar.cc/150?img=8',
  bio: 'Gutter cleans, downspout flushes, gutter-guard quotes. Spring + fall plans.',
  verificationTier: 2,
  compositeScore: { overall: 4.7, reliability: 4.9, quality: 4.6, communication: 4.5, professionalism: 4.7 },
  checkInCount: 64,
  serviceTypes: ['gutter'],
  priceRangeMin: 150,
  priceRangeMax: 280,
  isAvailableToday: false,
  distanceMiles: 5.5,
},
```
```ts
// lib/mocks/jobs.ts — append
{
  id: 'job_007',
  bookingId: 'bk_007',
  providerId: 'prov_010',
  providerName: 'Riley O\'Connor',
  homeownerId: 'home_001',
  status: 'booked',
  serviceType: 'gutter',
  scheduledAt: tomorrow.toISOString(),
  amountCents: 19000,
  timestamps: { booked: new Date(Date.now() - 86400_000).toISOString() },
},
```
```ts
// app/(homeowner)/(tabs)/book.tsx — import update + SERVICES entry
import { Leaf, Sparkles, Waves, Bug, Droplets, SquareDashed, CloudRain } from 'lucide-react-native';
{ id: 'gutter', title: 'Gutter Cleaning', subtitle: 'Spring + fall clear-outs', price: 'From $150/visit', Icon: CloudRain, bg: colors.serviceGutterTint },
```
```ts
// app/(homeowner)/booking/service-select.tsx — SERVICES entry
{ id: 'gutter', label: 'Gutter Cleaning', minPrice: 150, maxPrice: 280 },
```
**Key UI copy strings.**
- Label: `Gutter Cleaning`
- Subtitle: `Spring + fall clear-outs`
- Price line: `From $150/visit`
- Empty state: `No gutter cleans yet — get ahead of leaf season with one tap.`

---

## 8. Car Detailing (`detailing`) — Phase 2

**Industry primer.** Mobile detailing $150–$300 full; $100–$200 interior; $200–$400 with steam/clay/extraction. Recurring monthly clients get locked-in maintenance pricing per Housecall Pro 2026 + Jobber 2025 data. Job duration 1.5–4 hours per vehicle. Cadence: monthly maintenance wash recommended.
**Operator persona.** Solo. Mobile rig: van + reclaim mat + on-board water/power + polisher + steam + chem stack. Peak Mar–Oct. 3–4 vehicles/day. Some Texas cities require water-reclamation compliance.
**Booking shape.** Required: vehicle make/model/size class (sedan/SUV/truck), package tier (interior / exterior / full), location (driveway/garage). Optional: pet hair, ceramic-coat add-on, headlight restoration. Photo: required before/after exterior. **Note:** booking is vehicle-attached, not address-attached — see [Cross-Cutting](#cross-cutting-changes) for the routing-engine note.
**Trust score weighting.** Quality (45%) > Professionalism (25%) > Reliability (15%) > Communication (15%). The car is a high-emotion, high-cost asset — swirl marks or interior damage is the entire failure mode.
**Code changes.**
```ts
// lib/mocks/providers.ts — append
{
  id: 'prov_011',
  name: 'Andre Foster',
  businessName: 'Mirror Mobile Detail',
  avatarUrl: 'https://i.pravatar.cc/150?img=12',
  bio: 'Mobile interior + exterior. Ceramic coatings, pet-hair specialty. We come to you.',
  verificationTier: 2,
  compositeScore: { overall: 4.8, reliability: 4.6, quality: 4.95, communication: 4.7, professionalism: 4.8 },
  checkInCount: 132,
  serviceTypes: ['detailing'],
  priceRangeMin: 150,
  priceRangeMax: 400,
  isAvailableToday: true,
  distanceMiles: 3.3,
},
```
```ts
// lib/mocks/jobs.ts — append
{
  id: 'job_008',
  bookingId: 'bk_008',
  providerId: 'prov_011',
  providerName: 'Andre Foster',
  homeownerId: 'home_001',
  status: 'in_progress',
  serviceType: 'detailing',
  scheduledAt: new Date().toISOString(),
  amountCents: 22500,
  timestamps: {
    booked: new Date(Date.now() - 4 * 86400_000).toISOString(),
    en_route: new Date(Date.now() - 3600_000).toISOString(),
    in_progress: new Date(Date.now() - 1800_000).toISOString(),
  },
},
```
```ts
// app/(homeowner)/(tabs)/book.tsx — import update + SERVICES entry
import { Leaf, Sparkles, Waves, Bug, Droplets, SquareDashed, CloudRain, Car } from 'lucide-react-native';
{ id: 'detailing', title: 'Car Detailing', subtitle: 'Mobile interior + exterior', price: 'From $150/visit', Icon: Car, bg: colors.serviceDetailingTint },
```
```ts
// app/(homeowner)/booking/service-select.tsx — SERVICES entry
{ id: 'detailing', label: 'Car Detailing', minPrice: 150, maxPrice: 400 },
```
**Key UI copy strings.**
- Label: `Car Detailing`
- Subtitle: `Mobile interior + exterior`
- Price line: `From $150/visit`
- Empty state: `No detail booked yet — your car remembers when it was new.`

---

## 9. Tree & Plant Trimming (`tree`) — Phase 3

**Industry primer.** Avg ~$350/tree (Vevor 2025); range $150 small / $250–$500 medium / up to $800 large. LawnStarter 2026: $430–$640/tree on the higher end. Cadence: every 1–2 yrs young trees, every 3–5 yrs mature, yearly fruit. Job duration 1–6 hours; full-day for multi-tree. ISA-Certified Arborist preferred (estimate, not legally required in TX residential), GL + workers' comp critical due to chainsaw + climbing.
**Operator persona.** 2–4 person crew minimum (climber + groundsman + drag/chip). Truck + chip box + bucket truck for large jobs. Peak winter (deciduous dormancy) + post-storm. 1–2 jobs/day.
**Booking shape.** Required: address, tree count, scope (trim / shape / hazard removal / stump). Optional: haul-away, stump grinding, ISA arborist y/n. Photo: required pre-job hazard photo (limb proximity to roof/lines).
**Trust score weighting.** Professionalism (40%) > Quality (30%) > Reliability (15%) > Communication (15%). Damage claims here are 5–20x larger than other verticals (roof, fence, neighbor's car). Insurance tier and crew discipline outrank everything.
**Code changes.**
```ts
// lib/mocks/providers.ts — append
{
  id: 'prov_012',
  name: 'Mateo Reyes',
  businessName: 'Hill Country Arbor',
  avatarUrl: 'https://i.pravatar.cc/150?img=18',
  bio: 'ISA-certified arborist. Trim, shape, hazard removal, stump grind. Crew of 4.',
  verificationTier: 2,
  compositeScore: { overall: 4.9, reliability: 4.8, quality: 4.9, communication: 4.7, professionalism: 5.0 },
  checkInCount: 88,
  serviceTypes: ['tree'],
  priceRangeMin: 250,
  priceRangeMax: 1200,
  isAvailableToday: false,
  distanceMiles: 6.1,
},
```
```ts
// lib/mocks/jobs.ts — append
{
  id: 'job_009',
  bookingId: 'bk_009',
  providerId: 'prov_012',
  providerName: 'Mateo Reyes',
  homeownerId: 'home_001',
  status: 'booked',
  serviceType: 'tree',
  scheduledAt: tomorrow.toISOString(),
  amountCents: 65000,
  timestamps: { booked: new Date(Date.now() - 86400_000).toISOString() },
},
```
```ts
// app/(homeowner)/(tabs)/book.tsx — import update + SERVICES entry
import { Leaf, Sparkles, Waves, Bug, Droplets, SquareDashed, CloudRain, Car, TreeDeciduous } from 'lucide-react-native';
{ id: 'tree', title: 'Tree & Plant Trimming', subtitle: 'Trim, shape, hazard removal', price: 'From $250/job', Icon: TreeDeciduous, bg: colors.serviceTreeTint },
```
```ts
// app/(homeowner)/booking/service-select.tsx — SERVICES entry
{ id: 'tree', label: 'Tree & Plant Trimming', minPrice: 250, maxPrice: 1200 },
```
**Key UI copy strings.**
- Label: `Tree & Plant Trimming`
- Subtitle: `Trim, shape, hazard removal`
- Price line: `From $250/job`
- Empty state: `No trims booked yet — get an ISA-certified arborist with one tap.`

---

## 10. Solar Panel Cleaning (`solar`) — Phase 4

**Industry primer.** $150–$500/visit residential (5–20 panels), avg $250–$350; $8–$25/panel (HomeAdvisor 2025). Recurring 1–2x/year; 2–3x in dust/pollen-heavy zones. Annual budget $390–$720 for 2x. Job duration 1–3 hours. GL + roof-work + electrical-proximity insurance required. Some Texas inverter manufacturers void warranty if cleaned with abrasive tools.
**Operator persona.** Solo or 2-person. Truck + soft-bristle pole + DI-water tank + harness/anchor kit. Peak Mar–Jun (post-pollen) + Oct (post-summer dust). 4–6 sites/day. Highest-insurance vertical of the 10.
**Booking shape.** Required: address, panel count, roof pitch band (low/mid/steep), system age. Optional: bird-deterrent install quote, micro-inverter inspection. Photo: required before/after array shot.
**Trust score weighting.** Professionalism (40%) > Reliability (25%) > Quality (20%) > Communication (15%). Roof + electrical = damage claim risk dominates. Insurance tier + crew certification outrank every other component.
**Code changes.**
```ts
// lib/mocks/providers.ts — append
{
  id: 'prov_013',
  name: 'Priya Singh',
  businessName: 'SunShine Panel Care',
  avatarUrl: 'https://i.pravatar.cc/150?img=45',
  bio: 'Soft-bristle DI-water cleans. Bird-deterrent installs. Fully insured for roof + electrical.',
  verificationTier: 2,
  compositeScore: { overall: 4.85, reliability: 4.7, quality: 4.8, communication: 4.7, professionalism: 4.95 },
  checkInCount: 41,
  serviceTypes: ['solar'],
  priceRangeMin: 150,
  priceRangeMax: 500,
  isAvailableToday: false,
  distanceMiles: 4.8,
},
```
```ts
// lib/mocks/jobs.ts — append
{
  id: 'job_010',
  bookingId: 'bk_010',
  providerId: 'prov_013',
  providerName: 'Priya Singh',
  homeownerId: 'home_001',
  status: 'confirmed',
  serviceType: 'solar',
  scheduledAt: tomorrow.toISOString(),
  amountCents: 28000,
  timestamps: {
    booked: new Date(Date.now() - 2 * 86400_000).toISOString(),
    confirmed: new Date(Date.now() - 86400_000).toISOString(),
  },
},
```
```ts
// app/(homeowner)/(tabs)/book.tsx — import update + SERVICES entry
import { Leaf, Sparkles, Waves, Bug, Droplets, SquareDashed, CloudRain, Car, TreeDeciduous, Sun } from 'lucide-react-native';
{ id: 'solar', title: 'Solar Panel Cleaning', subtitle: 'Soft-bristle, DI-water rinse', price: 'From $150/visit', Icon: Sun, bg: colors.serviceSolarTint },
```
```ts
// app/(homeowner)/booking/service-select.tsx — SERVICES entry
{ id: 'solar', label: 'Solar Panel Cleaning', minPrice: 150, maxPrice: 500 },
```
**Key UI copy strings.**
- Label: `Solar Panel Cleaning`
- Subtitle: `Soft-bristle, DI-water rinse`
- Price line: `From $150/visit`
- Empty state: `No solar cleans yet — recover lost output with one tap.`

---

## Cross-Cutting Changes

These edits land **once**, not per vertical, and unblock all 10 sections above.

### 1. `lib/types.ts` — consolidated `ServiceType` patch

```ts
export type UserRole = 'homeowner' | 'provider_owner' | 'provider_tech';

export type ServiceType =
  | 'lawn'
  | 'cleaning'
  | 'pool'
  | 'pest'
  | 'pressure'
  | 'window'
  | 'gutter'
  | 'detailing'
  | 'tree'
  | 'solar';

export type BookingType = 'subscription' | 'one_off';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual';
export type VerificationTier = 0 | 1 | 2;
export type JobStatus =
  | 'booked'
  | 'confirmed'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface CompositeScore {
  overall: number;
  reliability: number;
  quality: number;
  communication: number;
  professionalism: number;
}

export interface Provider {
  id: string;
  name: string;
  businessName: string;
  avatarUrl: string | null;
  bio?: string;
  verificationTier: VerificationTier;
  compositeScore: CompositeScore;
  checkInCount: number;
  serviceTypes: ServiceType[];
  priceRangeMin: number;
  priceRangeMax: number;
  isAvailableToday: boolean;
  distanceMiles?: number;
  portfolioPhotos?: string[];
}

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
}

export interface Job {
  id: string;
  bookingId: string;
  providerId: string;
  providerName: string;
  homeownerId: string;
  status: JobStatus;
  serviceType: ServiceType;
  scheduledAt: string;
  amountCents: number;
  timestamps: Partial<Record<JobStatus, string>>;
}

export interface Booking {
  id: string;
  homeownerId: string;
  providerId: string;
  serviceType: ServiceType;
  bookingType: BookingType;
  frequency: Frequency | null;
  scheduledAt: string;
  addressId: string;
  specialInstructions?: string;
  photoUrl?: string;
  amountCents: number;
}
```

Two notes on the union expansion:

1. `Frequency` gains `'quarterly'` (pest, window) and `'semi_annual'` (gutter, solar). Existing screens that hard-code `weekly|biweekly|monthly` (notably `service-select.tsx` `FREQS`) must update — patch below.
2. `ServiceType` is the only place that needs the literal additions; every screen and mock file imports from this union, so TS will flag every site that needs an update.

### 2. `tokens/colors.ts` — service tints

Add 8 new tints alongside the existing two. Stay in the warm-cream/sage family already established in the palette (`#F8F6F1` background, `#E8F4EC` lawn, `#FDF3D0` cleaning).

```ts
// in tokens/colors.ts — extend the existing colors object
serviceLawnTint: '#E8F4EC',       // existing — sage
serviceCleaningTint: '#FDF3D0',   // existing — cream
servicePoolTint: '#DCEEF5',       // pale aqua
servicePestTint: '#F1E6D6',       // sand
servicePressureTint: '#E3EDF5',   // pale slate
serviceWindowTint: '#EAF1F4',     // soft sky
serviceGutterTint: '#E6E9DD',     // dusty olive
serviceDetailingTint: '#EFE6F0',  // muted lavender
serviceTreeTint: '#DDE7D9',       // forest mist
serviceSolarTint: '#FAEBC8',      // warm cream-amber
```

### 3. `service-select.tsx` — `FREQS` array conditional on vertical

The current `FREQS = [weekly, biweekly, monthly]` is too narrow. Make it vertical-aware:

```ts
const FREQS_BY_SERVICE: Record<ServiceType, { id: Frequency; label: string }[]> = {
  lawn:      [{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Biweekly' }, { id: 'monthly', label: 'Monthly' }],
  cleaning:  [{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Biweekly' }, { id: 'monthly', label: 'Monthly' }],
  pool:      [{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Biweekly' }],
  pest:      [{ id: 'monthly', label: 'Monthly' }, { id: 'quarterly', label: 'Quarterly' }],
  pressure:  [{ id: 'semi_annual', label: 'Twice a year' }],
  window:    [{ id: 'quarterly', label: 'Quarterly' }, { id: 'semi_annual', label: 'Twice a year' }],
  gutter:    [{ id: 'semi_annual', label: 'Spring + fall' }],
  detailing: [{ id: 'monthly', label: 'Monthly' }, { id: 'biweekly', label: 'Biweekly' }],
  tree:      [],   // one-off only — hide subscription pill if serviceType === 'tree'
  solar:     [{ id: 'semi_annual', label: 'Twice a year' }],
};

// then in the component:
const availableFreqs = serviceType ? FREQS_BY_SERVICE[serviceType] : [];
// hide the Subscription/One-time toggle entirely if availableFreqs.length === 0 (force one_off)
```

### 4. `book.tsx` — full updated `SERVICES` array

```ts
import {
  Leaf, Sparkles, Waves, Bug, Droplets, SquareDashed,
  CloudRain, Car, TreeDeciduous, Sun,
} from 'lucide-react-native';

const SERVICES: {
  id: ServiceType;
  title: string;
  subtitle: string;
  price: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  bg: string;
  phase: 'mvp1' | 'phase2' | 'phase3' | 'phase4';
}[] = [
  { id: 'lawn',      title: 'Lawn Care',            subtitle: 'Mowing, edging, trimming',          price: 'From $45/visit', Icon: Leaf,          bg: colors.serviceLawnTint,      phase: 'mvp1' },
  { id: 'cleaning',  title: 'Home Cleaning',        subtitle: 'Standard, deep clean, move-in/out', price: 'From $80/visit', Icon: Sparkles,      bg: colors.serviceCleaningTint,  phase: 'mvp1' },
  { id: 'pool',      title: 'Pool Cleaning',        subtitle: 'Weekly skim, chem-balance, filter', price: 'From $35/visit', Icon: Waves,         bg: colors.servicePoolTint,      phase: 'mvp1' },
  { id: 'pest',      title: 'Pest Control',         subtitle: 'Quarterly perimeter & interior',    price: 'From $85/visit', Icon: Bug,           bg: colors.servicePestTint,      phase: 'mvp1' },
  { id: 'pressure',  title: 'Pressure Washing',     subtitle: 'Siding, drives, fences, decks',     price: 'From $220/job',  Icon: Droplets,      bg: colors.servicePressureTint,  phase: 'mvp1' },
  { id: 'window',    title: 'Window Cleaning',      subtitle: 'Interior + exterior, screens incl.', price: 'From $150/visit', Icon: SquareDashed, bg: colors.serviceWindowTint,    phase: 'mvp1' },
  { id: 'gutter',    title: 'Gutter Cleaning',      subtitle: 'Spring + fall clear-outs',          price: 'From $150/visit', Icon: CloudRain,    bg: colors.serviceGutterTint,    phase: 'phase2' },
  { id: 'detailing', title: 'Car Detailing',        subtitle: 'Mobile interior + exterior',        price: 'From $150/visit', Icon: Car,          bg: colors.serviceDetailingTint, phase: 'phase2' },
  { id: 'tree',      title: 'Tree & Plant Trimming', subtitle: 'Trim, shape, hazard removal',      price: 'From $250/job',   Icon: TreeDeciduous, bg: colors.serviceTreeTint,     phase: 'phase3' },
  { id: 'solar',     title: 'Solar Panel Cleaning', subtitle: 'Soft-bristle, DI-water rinse',      price: 'From $150/visit', Icon: Sun,          bg: colors.serviceSolarTint,     phase: 'phase4' },
];

// gate by env flag for staged rollout:
const ENABLED_PHASES: Set<typeof SERVICES[number]['phase']> = new Set(['mvp1']);
const VISIBLE = SERVICES.filter((s) => ENABLED_PHASES.has(s.phase));
// render VISIBLE; render still-disabled phases as a "coming soon" footer
```

Replace the existing `Pest Control, HVAC, and Plumbing are coming soon` footer copy with: `Tree care, car detailing, gutter cleaning, and solar panel care are coming soon. Save an interest in your profile and we'll notify you.`

### 5. `(tabs)/index.tsx` ("Your neighborhood pros") — filter expansion

The horizontal scroll currently shows all `mockProviders` regardless of vertical. With 13 mock providers across 10 verticals, surface a vertical-tab filter above the scroll:

```ts
const [activeFilter, setActiveFilter] = useState<ServiceType | 'all'>('all');
const visibleProviders = activeFilter === 'all'
  ? mockProviders
  : mockProviders.filter((p) => p.serviceTypes.includes(activeFilter));
// render a horizontal pill row of ENABLED ServiceTypes above the scroll
```

### 6. Trust-score weighting matrix — Phase 4 ranking input

The schema in `lib/types.ts` keeps `CompositeScore` with all four components equally exposed. The downstream weighting (used in routing-engine ranking and the Haiku "why this score" prompt template) is per-vertical:

| Vertical | Reliability | Quality | Communication | Professionalism |
|---|---|---|---|---|
| Lawn | **35%** | 30% | 15% | 20% |
| Cleaning | 15% | **40%** | 20% | 25% |
| Pool | **40%** | 30% | 20% | 10% |
| Pest | 20% | 30% | **35%** | 15% |
| Pressure | 20% | **40%** | 15% | 25% |
| Window | 20% | **35%** | 15% | 30% |
| Gutter | **35%** | 30% | 15% | 20% |
| Detailing | 15% | **45%** | 15% | 25% |
| Tree | 15% | 30% | 15% | **40%** |
| Solar | 25% | 20% | 15% | **40%** |

This table lives in `lib/scoring/weights.ts` (new file, ≤30 lines) and is read by `computeRankedScore(provider, serviceType)` — wired in Phase 4.

### 7. Routing-engine note — vehicle-attached vs address-attached

Car detailing (`detailing`) is the only vertical where the booking subject is a vehicle, not the home. The routing match still uses the homeowner address (provider service-area check), but the booking record needs an optional `subjectVehicle?: { make, model, year, plate? }`. Add to `Booking` interface in Phase 2 when `detailing` lights up; defer at MVP-1.

---

## Don't break

These are non-negotiable. Pulled directly from `CLAUDE.md` and `MVP_OVERVIEW.md`. Every PR adding a vertical must respect them.

1. **No lead-resale, ever.** Each new vertical inherits the single-routed booking model. The browse "neighborhood pros" filter (cross-cutting §5) is for *discovery*, not for the homeowner to "choose between" providers — final routing still selects one provider per booking inquiry.
2. **Earn on completion, not inquiry.** All 10 verticals route revenue through `completion_ledger` writes on the verified check-in transition (`in_progress` → `completed` + payment captured). No vertical short-circuits this — including pest control (where invisible work tempts an "earn on dispatch" shortcut) and tree trimming (where bid-acceptance tempts an "earn on quote" shortcut).
3. **`completion_ledger` writes are required.** Every completed `Job` row across every new vertical writes a ledger entry. Delays = Phase 4 AI delays.
4. **`demand_events` writes on every search.** When a homeowner picks a service in `book.tsx`, the entry-screen tap writes a `demand_events` row (zip + service + timestamp) — the new verticals must wire this same hook.
5. **RLS on every table.** No new vertical introduces a table that bypasses the existing RLS posture. If pest control needs an `applicator_license` table or solar needs a `roof_access_consent` table, they get RLS from line 1.
6. **Trust Ladder Rung 1 only.** Even for high-volume verticals (pool, pest), the operator approves every accept/decline. No autonomous job acceptance until Phase 4 ladder graduation.
7. **Reanimated 3 only.** No new vertical introduces React Native core `Animated`. The `FadeIn.duration(220)` pattern in `service-select.tsx` is the standard.
8. **Single Expo codebase.** All 10 verticals render in the same RN repo, role-gated. No vertical-specific app bundles.
9. **The check-in widget stays sacred.** Each vertical adds *at most* one extra optional question to the 15-second flow (e.g. pool: "water clarity y/n"; pressure: "before/after match"). Never add a vertical-specific multi-step check-in.
10. **Operator Graph hygiene.** All new mock-tier and provider entities ship with `valid_from`/`valid_to` columns when promoted to Postgres. No orphaned vertical-specific records.
11. **FRONTEND_GUIDE colors/sizes/timings exact.** New service tints (cross-cutting §2) match the warm-cream/sage palette family — no chartreuse, no neon. WCAG AA contrast on every tinted card.

---

## Execution checklist (for the next agent in one pass)

- [ ] Apply consolidated `ServiceType` + `Frequency` patch to `lib/types.ts` (cross-cutting §1).
- [ ] Append 8 new service tints to `tokens/colors.ts` (cross-cutting §2).
- [ ] Append 8 mock providers (`prov_006` through `prov_013`) to `lib/mocks/providers.ts`.
- [ ] Append 8 mock jobs (`job_003` through `job_010`) to `lib/mocks/jobs.ts`.
- [ ] Replace `SERVICES` array + lucide imports + footer copy in `app/(homeowner)/(tabs)/book.tsx` (cross-cutting §4).
- [ ] Replace `SERVICES` + `FREQS` + add `FREQS_BY_SERVICE` map in `app/(homeowner)/booking/service-select.tsx` (cross-cutting §3).
- [ ] Add vertical-filter pill row in `app/(homeowner)/(tabs)/index.tsx` (cross-cutting §5).
- [ ] Create `lib/scoring/weights.ts` with the trust-weight matrix (cross-cutting §6).
- [ ] Set `ENABLED_PHASES = new Set(['mvp1'])` for the MVP-1 cut; flip to add `phase2`, `phase3`, `phase4` as waves go live.
- [ ] Verify TypeScript: every site that imports `ServiceType` should compile with the expanded union; no untyped `as ServiceType` casts introduced.
- [ ] Verify the existing 6 mock providers + 2 mock jobs still render unchanged.
- [ ] Smoke-test the booking wizard for each enabled vertical: tap-through select → schedule → match → confirm against mocks.

---

## Sources cited

Per-vertical industry numbers above are drawn from:

- Lawn — HomeAdvisor 2025; LawnStarter 2025/26; IBISWorld landscaping industry $158.9B (2024).
- Cleaning — Housecall Pro 2026; HomeAdvisor 2025; HomeGuide 2026.
- Pool — HomeGuide 2026; Angi 2026; HomeAdvisor 2025; Texas Real Estate Source 2025.
- Pest — Terminix 2025; HomeBudgetExpert 2025; Better Termite 2026; Hoffer Pest 2025.
- Pressure — IBISWorld 2024 ($1.2B); HomeGuide 2026; Angi 2026; HomeAdvisor 2025.
- Window — Angi 2026; HomeGuide 2026; HomeAdvisor 2025; Thumbtack 2025.
- Gutter — Angi 2026; This Old House 2026; LeafFilter 2026; HomeAdvisor 2025.
- Detailing — Housecall Pro 2026; Jobber 2026; Invoice Fly 2025.
- Tree — Vevor 2025; LawnStarter 2026; HomeAdvisor 2025; Fixr 2025.
- Solar — Angi 2026; RoofGnome 2025; HomeAdvisor 2025; SolarTech 2025.

Numbers explicitly marked **estimate** in this doc (no citation): job-duration ranges, daily-route-stop counts, and operator-crew-size norms — these come from operator-interview heuristics, not industry reports. Average tickets, recurring frequency, and pricing-per-unit are all cited.

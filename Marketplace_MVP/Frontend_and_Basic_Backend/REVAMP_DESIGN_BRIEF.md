# HomeBase Revamp — Design Brief

> Brief that every revamp agent must read before touching code. The aesthetic direction is **committed**; do not negotiate it.

## The aesthetic: **Editorial Marketplace**

Magazine-quality typography meets premium service brand. Refined, generous, confident — never corporate, never gig-economy. Reference points: Aesop (luxe + warm + minimal text), Hinge Health (warm-confident product), Cabin (editorial blocks), Stripe (typographic restraint), Notion home (content-led pacing). Anti-references: Thumbtack, Angi, generic dashboard SaaS.

The thesis is `MVP_OVERVIEW.md` "trust + warmth + premium without pretension." Every visual choice should make a homeowner feel they're hiring from a curated short-list, not browsing a directory.

## Type system

- **Display (hero, headlines, pricing):** **Fraunces** — a distinctive variable serif that signals editorial premium. *One* distinctive choice that separates HomeBase from every generic React Native template. Load via `@expo-google-fonts/fraunces`.
- **Subhead / titles:** Plus Jakarta Sans 700 (already loaded). Used for section labels, card titles, button text.
- **Body:** Inter 400/500 (already loaded). Used for everything ≤16px and any prose.
- **Numerals:** Fraunces tabular-nums for prices, scores, counts. (`fontVariant: ['tabular-nums']`)

Type scale (replaces existing `textStyles`):
- `editorial-hero`: Fraunces 700, 48/52, -1.5% letter-spacing
- `editorial-title`: Fraunces 600, 30/36, -1% letter-spacing
- `display-md`: Plus Jakarta 700, 22/28
- `title-lg`: Plus Jakarta 600, 18/24
- `title-md`: Plus Jakarta 600, 16/22
- `body-lg`: Inter 400, 17/26 (long-form copy on hero/marketing)
- `body-md`: Inter 400, 15/22 (default)
- `body-sm`: Inter 400, 13/19 (meta, captions)
- `label`: Inter 600, 12/16, +0.5% letter-spacing, uppercase

## Color (tokens stay; usage gets stricter)

Brand colors stay (`primary[600]` forest green, `accent[500]` warm amber, `cream` `#F8F6F1`). Stricter rules:

- **Page backgrounds**: cream (`#F8F6F1`) — never plain white. Plain white is reserved for elevated surfaces (cards, sheets).
- **Hero/feature backgrounds**: subtle vertical gradient `primary[700]` → `primary[600]`, *or* warm radial tint mesh on cream (`primary[50]` low-opacity blobs).
- **Service tint cards**: 8 new tints live in `tokens/colors.ts` per `SERVICES_INTEGRATION.md` §2. Use them on Browse + Book entry — cards on cream are tinted, never plain white.
- **Borders**: 1px `border` (`#E5E7EB`) only on inputs, table rules, and divider rules. Cards use shadows for separation, not borders, *unless* the variant is `outlined`.
- **Accent (`accent[500]`)**: reserved for verified/insured badges, "Save 10%" subscription marker, and exactly one CTA per screen. Don't sprinkle it.
- **Text**: `textPrimary` for headlines/body, `textSecondary` for meta, `textTertiary` for captions/state. Never use `textPrimary` on a primary-green background — use `textInverse`.

## Motion language

Every transition uses Reanimated 3. Three primitive motion presets, applied consistently:

1. **`enter`** — entrance for any non-static element on mount: `FadeIn.duration(280).easing(Easing.out(Easing.cubic))` + 8px translateY. Stagger lists at `60ms` per item.
2. **`press`** — interactive press: `withTiming(0.98, { duration: 110 })` scale + 6% opacity dim, `withSpring` release. Already on Button/Card; ensure every pressable adopts it.
3. **`celebrate`** — successful completion (booking confirmation, check-in submit, payout): spring scale 0 → 1 with `damping: 9, stiffness: 110`, then a subtle glow pulse via `withRepeat`.

Plus three named choreographies for hero moments:

- **`hero-load`** — staggered: backdrop fades in (200ms), display heading rises (300ms delay), body copy rises (400ms), CTA rises (500ms). Already in `welcome.tsx` — formalize as a reusable hook `useHeroLoad()`.
- **`step-advance`** — booking-wizard step transitions: outgoing slide left + fade, incoming slide right + fade. 250ms each, `Easing.out(Easing.cubic)`.
- **`score-reveal`** — trust-score rings animate from 0 → score over 800ms ease-out, 100ms stagger between rings. Already in `TrustScoreDisplay`; do not regress.

## Spacing & layout

- 12-col grid at desktop (≥1024). Content max-width 1200px. Outer gutter: 24px on tablet, 32px on desktop.
- Vertical rhythm: every section is `py-16` (64px) on desktop, `py-12` (48px) on tablet, `py-8` (32px) on mobile. No squishing.
- **Cards** stay 16px padding mobile / 20px tablet / 24px desktop. Card radius 14px (premium, not chunky).
- **Sections** use a `<Section>` primitive (new in `components/ui/Section.tsx`) that handles vertical rhythm + max-width + responsive padding. Every screen uses Sections to compose, never raw padding.

## Surfaces (depth)

Three elevations:

- **Surface 0** — page background, cream, no shadow.
- **Surface 1** — primary cards: `shadow-md`, 14px radius, white bg.
- **Surface 2** — overlays/sheets/popovers/featured cards: `shadow-lg`, 16–20px radius, white bg, optional 1px hairline border `borderColor: 'rgba(26, 61, 43, 0.08)'` for definition over busy backgrounds.

Plus tinted service cards (Browse + Book entry): tinted bg + `shadow-sm` only — they sit atop cream and need less elevation to read.

## Hover/focus on web

- Pressables: `cursor: 'pointer'`, hover `scale(1.012)` + opacity 0.96, focus-visible 2px outline at `primary[400]` with 2px offset.
- Cards (`pressable` variant): hover lifts shadow from `md` → `lg`, scale 1.01.
- Inputs: focus ring `primary[600]` 1.5px (already there).
- Sidebar nav (in `WebShell`): hover applies `bg primary[50]`, active route stays `primary[100]` + `primary[700]` text.

## Imagery

- Avatars stay `pravatar.cc`. Provider portfolio + service hero photos use Unsplash homestead/cleaning/exterior shots; constrain to a curated 12-image set so the visual language stays consistent (no surprise sky-blues or neon).
- Round corners on every image: 12px on cards, 14px on hero images, 999px on avatars.

## Service vertical UI (per SERVICES_INTEGRATION.md)

All 10 services must be visible in the UI:

- **Book entry**: render the full `SERVICES` array. MVP-1 phase (lawn, cleaning, pool, pest, pressure, window) = pressable. Phase 2/3/4 = visible card with a soft "Coming [date]" pill on the corner; tap shows a "Notify me" sheet (defer the sheet impl — just block the booking flow).
- **Browse / "Neighborhood pros"**: vertical-filter pill row above the horizontal scroll. Filter pills include all 10 services; non-MVP-1 ones are dimmed.
- **Service-select step inside booking wizard**: `FREQS_BY_SERVICE` map per spec. Hide the subscription/one-off toggle when the vertical doesn't support subscriptions (e.g. `tree`).

## Don't break (from CLAUDE.md)

1. No lead-resale UX — Browse filter is for discovery, not selection.
2. Reanimated 3 only — never RN core `Animated`.
3. Trust score appears wherever a provider appears.
4. Check-in flow stays ≤15 seconds.
5. Single codebase — same files render on iOS/Android/web with `Platform.select` + `useBreakpoint` branches.
6. The `replaceImportMeta` plugin in `babel.config.js` stays — never remove it.
7. WebShell stays the desktop layout — add to it, don't replace it.

## Definition of done for each screen

A revamp pass on a screen is complete when **all** of these are true:

- Uses `<Section>` for spatial rhythm.
- Uses the new `editorial-*` and `display-*`/`title-*`/`body-*` text styles, not hard-coded fontFamily/fontSize pairs.
- Has a desktop branch via `useBreakpoint() === 'desktop'` with content max-width 1200px.
- All press interactions use the `press` motion preset (typically already inherited from Button/Card).
- Lists stagger entrance via `enter` + 60ms stagger.
- Empty states use `<EmptyState>` with verbatim copy from `FRONTEND_GUIDE.md` §6.8.
- Skeletons match content shape on data-driven screens.
- Where a provider renders, `TrustScoreDisplay` (or its compact variant) is visible.
- 0 raw hex colors outside `tokens/colors.ts`.
- 0 className usage (we use inline `style` per Phase 1–3 convention).

## Verification (Definition of done for the whole revamp)

- `tsc --noEmit` clean
- `npm run build:web` clean, bundle ≥4.5 MB, 0 `import.meta` references
- `npx expo export --platform ios --output-dir /tmp/ios-build` clean
- Headless Chrome at 1440×900 renders the new sidebar + Welcome editorial hero
- Headless Chrome at 414×896 renders mobile hero, no sidebar
- All 10 services render in Book entry with phase markers
- Browse vertical-filter row renders with all 10 pills
- 0 raw `Animated.` imports from `react-native` (only `react-native-reanimated`)

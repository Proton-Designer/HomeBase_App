# HomeBase — Frontend & Basic Backend Guide

> **Claude Code context file.** This is the complete implementation guide for the HomeBase Marketplace MVP frontend (React Native + Next.js admin) and the minimal API surface needed to wire the UI to the backend. Read `MVP_OVERVIEW.md` first for product context and scope.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Design System & Theme](#2-design-system--theme)
3. [Navigation Architecture](#3-navigation-architecture)
4. [Homeowner App — Screen Specifications](#4-homeowner-app--screen-specifications)
5. [Provider App — Screen Specifications](#5-provider-app--screen-specifications)
6. [Shared Components Library](#6-shared-components-library)
7. [Web Admin Dashboard (Next.js)](#7-web-admin-dashboard-nextjs)
8. [Basic Backend / API Wiring](#8-basic-backend--api-wiring)
9. [State Management](#9-state-management)
10. [Animations & Polish Specifications](#10-animations--polish-specifications)
11. [Error Handling & Loading States](#11-error-handling--loading-states)
12. [Key UX Principles](#12-key-ux-principles)

---

## 1. Project Setup

### Repository Structure

```
homebase/
├── apps/
│   ├── mobile/                    # React Native (Expo) — homeowner + provider
│   └── admin/                     # Next.js 14 — internal ops dashboard
├── packages/
│   ├── ui/                        # Shared design tokens + components (optional monorepo)
│   ├── api-client/                # Typed API client shared between apps
│   └── types/                     # Shared TypeScript types
├── supabase/
│   ├── migrations/                # Database migrations
│   └── functions/                 # Edge Functions
└── package.json                   # Monorepo root (Turborepo recommended)
```

### Mobile App Init

```bash
npx create-expo-app@latest apps/mobile --template blank-typescript
cd apps/mobile
npx expo install expo-router expo-constants expo-linking expo-status-bar
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install expo-image-picker expo-location expo-notifications
npx expo install @stripe/stripe-react-native
```

### Core Dependencies (Mobile)

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "@supabase/supabase-js": "^2.43.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "nativewind": "^4.0.0",
    "@stripe/stripe-react-native": "^0.37.0",
    "react-native-maps": "^1.14.0",
    "lucide-react-native": "^0.372.0",
    "react-native-toast-message": "^2.2.0",
    "date-fns": "^3.6.0",
    "@react-native-community/datetimepicker": "^8.0.0"
  }
}
```

### Admin App Init

```bash
npx create-next-app@latest apps/admin --typescript --tailwind --app --no-src-dir
cd apps/admin
npm install @supabase/supabase-js @tanstack/react-query zustand
npm install @tanstack/react-table lucide-react date-fns
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-badge
```

### Environment Variables

```env
# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# apps/admin/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 2. Design System & Theme

### Brand Identity

HomeBase is a **premium, trusted home services marketplace**. The visual language must communicate:
- **Trustworthiness** — not a gig economy hustle platform
- **Home warmth** — the green and cream palette evokes nature, lawn, domesticity
- **Quality and precision** — generous whitespace, clean typography, every pixel intentional
- **Premium without pretension** — approachable, not intimidating

Reference points: Airbnb's booking flow polish, Linear's clean information density, a premium concierge service's communication warmth.

### Color Palette

```typescript
// tokens/colors.ts
export const colors = {
  // Primary — Deep Forest Green
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

  // Accent — Warm Amber/Gold
  accent: {
    50:  '#FEFBF0',
    100: '#FDF3D0',
    200: '#FAE4A1',
    300: '#F7CF68',
    400: '#F3B830',
    500: '#E8A020',   // ACCENT — verified, premium, quality
    600: '#C4841A',
    700: '#9E6914',
    800: '#7A500F',
    900: '#573908',
  },

  // Background & Surface
  background: '#F8F6F1',   // Warm off-white cream — primary background
  surface: '#FFFFFF',       // Card surfaces
  surfaceElevated: '#FFFFFF', // Bottom sheets, modals

  // Text
  textPrimary:   '#1C1C1E',
  textSecondary: '#6B7280',
  textTertiary:  '#9CA3AF',
  textInverse:   '#FFFFFF',

  // Semantic
  success:     '#2D6A4F',
  successLight:'#D1FAE5',
  warning:     '#E8A020',
  warningLight:'#FEF3C7',
  error:       '#DC2626',
  errorLight:  '#FEE2E2',
  info:        '#2563EB',
  infoLight:   '#DBEAFE',

  // Utility
  border:         '#E5E7EB',
  borderStrong:   '#D1D5DB',
  divider:        '#F3F4F6',
  overlay:        'rgba(0,0,0,0.5)',
  overlayLight:   'rgba(0,0,0,0.15)',
} as const;
```

**Creative freedom note:** Claude Code may adjust lightness and saturation values to achieve WCAG AA contrast ratios (4.5:1 for body text, 3:1 for large text) while preserving the overall deep-green + warm-amber + cream identity.

### Typography

```typescript
// tokens/typography.ts
export const typography = {
  fonts: {
    display: 'PlusJakartaSans',   // For headlines and display text
    body: 'Inter',                 // For body copy, labels, UI text
  },

  // Font weights
  weights: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    extrabold:'800',
  },

  // Size scale (px, converted to sp/dp in RN)
  sizes: {
    xs:   12,
    sm:   14,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line heights
  lineHeights: {
    tight:  1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Preset text styles
export const textStyles = {
  displayLarge:  { fontFamily: 'PlusJakartaSans', fontSize: 48, fontWeight: '800', lineHeight: 1.1 },
  displayMedium: { fontFamily: 'PlusJakartaSans', fontSize: 36, fontWeight: '700', lineHeight: 1.2 },
  displaySmall:  { fontFamily: 'PlusJakartaSans', fontSize: 30, fontWeight: '700', lineHeight: 1.2 },
  headingLg:     { fontFamily: 'PlusJakartaSans', fontSize: 24, fontWeight: '700', lineHeight: 1.3 },
  headingMd:     { fontFamily: 'PlusJakartaSans', fontSize: 20, fontWeight: '600', lineHeight: 1.3 },
  headingSm:     { fontFamily: 'PlusJakartaSans', fontSize: 18, fontWeight: '600', lineHeight: 1.4 },
  bodyLg:        { fontFamily: 'Inter', fontSize: 18, fontWeight: '400', lineHeight: 1.6 },
  bodyMd:        { fontFamily: 'Inter', fontSize: 16, fontWeight: '400', lineHeight: 1.6 },
  bodySm:        { fontFamily: 'Inter', fontSize: 14, fontWeight: '400', lineHeight: 1.5 },
  labelLg:       { fontFamily: 'Inter', fontSize: 16, fontWeight: '500', lineHeight: 1.4 },
  labelMd:       { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', lineHeight: 1.4 },
  labelSm:       { fontFamily: 'Inter', fontSize: 12, fontWeight: '500', lineHeight: 1.4 },
  caption:       { fontFamily: 'Inter', fontSize: 12, fontWeight: '400', lineHeight: 1.4 },
} as const;
```

### Spacing & Layout

```typescript
// tokens/spacing.ts
export const spacing = {
  0:   0,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
  20:  80,
  24:  96,
} as const;

export const layout = {
  screenPaddingH: 20,    // Horizontal padding for full-width screens
  cardPadding:    16,
  cardRadius:     12,
  buttonRadius:   10,
  pillRadius:     999,
  inputRadius:    8,
  avatarSm:       32,
  avatarMd:       44,
  avatarLg:       64,
  avatarXl:       96,
  bottomNavHeight: 84,   // Includes safe area
  headerHeight:   56,
} as const;
```

### Shadows

```typescript
// tokens/shadows.ts
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;
```

### Core UI Components

#### Button

```typescript
// components/ui/Button.tsx
// Variants: primary | secondary | ghost | destructive | outline
// Sizes: sm | md | lg
// States: default | loading | disabled

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

// primary: bg #1A3D2B, text white
// secondary: bg #E8A020, text white
// ghost: transparent, text #1A3D2B
// destructive: bg #DC2626, text white
// outline: border #1A3D2B, text #1A3D2B

// Loading state: shows ActivityIndicator inline, disables press
// All buttons: 200ms press animation (scale 0.97 + slight opacity)
// Full-width variant via `fullWidth` prop
// Left/right icon slots via `leftIcon` / `rightIcon` props
```

#### Input

```typescript
// components/ui/Input.tsx
// States: default | focused | error | disabled
// Variants: outline (default) | filled
// Props: label, placeholder, helperText, errorMessage, leftIcon, rightIcon, secureTextEntry
// Focus: border transitions to primary green, 200ms
// Error: border transitions to error red, errorMessage shown below with fade-in
// Floating label animation on focus (optional, Claude Code's call)
```

#### Card

```typescript
// components/ui/Card.tsx
// Default: white bg, md shadow, 12px radius, 16px padding
// Pressable variant: press scale 0.98 + shadow increase, 200ms
// Outlined variant: border instead of shadow
```

---

## 3. Navigation Architecture

### Expo Router File Structure

```
apps/mobile/app/
├── _layout.tsx                    # Root layout — auth gate, theme provider
├── (auth)/
│   ├── _layout.tsx
│   ├── welcome.tsx                # Splash / Welcome
│   ├── sign-up.tsx
│   ├── sign-in.tsx
│   └── address-setup.tsx
├── (homeowner)/
│   ├── _layout.tsx                # Tab navigator for homeowner
│   ├── (tabs)/
│   │   ├── index.tsx              # Home/Browse
│   │   ├── book.tsx               # Book tab (entry)
│   │   ├── jobs.tsx               # My Jobs
│   │   ├── inbox.tsx              # Inbox/Messages
│   │   └── profile.tsx            # Profile
│   ├── booking/
│   │   ├── _layout.tsx
│   │   ├── service-select.tsx     # Step 1
│   │   ├── schedule.tsx           # Step 2
│   │   ├── match.tsx              # Step 3
│   │   ├── details.tsx            # Step 4
│   │   ├── payment.tsx            # Step 5
│   │   └── confirmation.tsx       # Step 6
│   ├── provider/
│   │   └── [id].tsx               # Provider profile detail
│   ├── job/
│   │   └── [id].tsx               # Job detail
│   └── claim/
│       └── new.tsx                # File damage claim
├── (provider)/
│   ├── _layout.tsx                # Tab navigator for provider (Owner role)
│   ├── (tabs)/
│   │   ├── today.tsx              # Today / Dashboard
│   │   ├── schedule.tsx           # Schedule / Calendar
│   │   ├── jobs.tsx               # Jobs queue
│   │   ├── earnings.tsx           # Earnings
│   │   └── profile.tsx            # Profile / Settings
│   ├── job/
│   │   └── [id].tsx               # Job detail sheet
│   └── onboarding/
│       ├── _layout.tsx
│       ├── business.tsx
│       ├── service-area.tsx
│       ├── availability.tsx
│       ├── verification.tsx
│       ├── banking.tsx
│       └── profile.tsx
├── (tech)/
│   ├── _layout.tsx                # Simplified tab nav for Tech role
│   ├── (tabs)/
│   │   ├── today.tsx
│   │   └── earnings.tsx
│   └── job/
│       └── [id].tsx
└── +not-found.tsx
```

### Root Layout Auth Gate

```typescript
// app/_layout.tsx
// On mount: check Supabase session
// If no session → redirect to /(auth)/welcome
// If session + role === 'homeowner' → redirect to /(homeowner)/(tabs)/
// If session + role === 'provider_owner' → redirect to /(provider)/(tabs)/today
// If session + role === 'provider_tech' → redirect to /(tech)/(tabs)/today
// If session + provider.onboarding_complete === false → redirect to /(provider)/onboarding/business

// Wrap entire app in:
// - QueryClientProvider (TanStack Query)
// - StripeProvider (Stripe React Native)
// - ThemeProvider (custom theme context)
// - GestureHandlerRootView
// - SafeAreaProvider
```

### Tab Bar Design

```
Homeowner tabs:
  Home (House icon)  |  Book (Calendar+ icon)  |  Jobs (Briefcase icon)  |  Inbox (MessageCircle icon)  |  Profile (User icon)

Provider (Owner) tabs:
  Today (Sun icon)  |  Schedule (CalendarDays icon)  |  Jobs (ClipboardList icon)  |  Earnings (DollarSign icon)  |  Profile (User icon)

Tech tabs:
  Today (Sun icon)  |  Earnings (DollarSign icon)
```

Tab bar: background `#FFFFFF`, active color `#1A3D2B` (primary green), inactive color `#9CA3AF`, subtle top border `#E5E7EB`. Active tab has a small filled dot beneath the icon (not a line — more premium). Height 84px including safe area bottom inset.

---

## 4. Homeowner App — Screen Specifications

---

### 4.1 Splash / Welcome Screen

**File:** `app/(auth)/welcome.tsx`

**Purpose:** First impression. Sets the brand tone and provides two paths: new users and returning users.

**Layout:**
- Full-screen background: gradient from `#1A3D2B` (top) to `#2D7A5A` (bottom)
- Centered HomeBase logomark (SVG, white) with animated reveal on mount
- Tagline below logo: "Find trusted home services near you" — `textStyles.headingMd`, white, fade up from below
- Two CTAs at bottom (bottom 48px from safe area):
  - `[Get Started]` — large primary button, accent amber background
  - `[Sign In]` — ghost button, white text, white border
- Fine print: "Serving [City] and surrounding neighborhoods" — small, white/70

**Animations:**
- Logo: scale from 0.7 → 1.0 + fade in, spring physics, on mount (~600ms)
- Tagline: fade in + translate Y from +16 → 0, 300ms delay after logo
- CTAs: fade in + translate Y from +24 → 0, 500ms delay
- Background: subtle parallax gradient shift, very slow (decorative only)

**API calls:** None.

---

### 4.2 Sign Up Screen

**File:** `app/(auth)/sign-up.tsx`

**Purpose:** Account creation for new homeowners.

**Layout:**
- Back button top-left
- "Create your account" heading
- Google OAuth button (prominent, above divider "or")
- Email input
- Password input (toggle visibility)
- Phone number input (optional, labeled "For SMS job updates (optional)")
- `[Create account]` primary CTA
- "Already have an account? Sign in" link at bottom
- Terms of service + privacy policy consent copy below CTA (small gray text, links are tappable)

**Validation (React Hook Form + Zod):**
- Email: valid email format
- Password: minimum 8 characters, at least 1 uppercase, 1 number
- Phone: valid E.164 format if provided (optional)

**On submit:**
1. Call `POST /auth/signup` (Supabase Auth)
2. If success: set role as `homeowner` in `users` table
3. Redirect to `/(auth)/address-setup`

**Error states:**
- Email already in use: inline error below email field
- Network error: toast with retry

---

### 4.3 Sign In Screen

**File:** `app/(auth)/sign-in.tsx`

**Layout:**
- "Welcome back" heading
- Google OAuth button
- Email + password inputs
- "Forgot password?" link (right-aligned, opens reset flow)
- `[Sign in]` primary CTA
- "New to HomeBase? Create account" link

**On submit:**
1. Call `POST /auth/signin` (Supabase Auth)
2. Fetch user profile + role
3. Route based on role (see Root Layout Auth Gate)

---

### 4.4 Address Setup Screen

**File:** `app/(auth)/address-setup.tsx`

**Purpose:** Capture home address for service area matching. This is required — providers are only shown if they serve the homeowner's zip code.

**Layout:**
- "Where is your home?" heading
- Subheading: "We'll find verified providers in your neighborhood"
- Google Places Autocomplete input (full address, not just city)
  - As user types, show animated dropdown with address suggestions
  - On selection: auto-fill street, city, state, zip in confirmation view
- Map view below input: shows pin at selected address
  - Pin drops with spring animation on address selection
- Service coverage indicator:
  - If providers exist in the area: green badge "12 verified providers near you" with check icon + fade-in animation
  - If no coverage: amber badge "We're growing into your area — join the waitlist"
- `[Continue]` CTA — disabled until address is selected and confirmed

**API call:** `GET /providers/search?zip=XXXXX&count_only=true` — check coverage

**On success:** Save address to user profile, redirect to Service Interest Selection.

---

### 4.5 Service Interest Selection Screen

**File:** `app/(auth)/service-interest.tsx` (consider embedding in address-setup flow)

**Layout:**
- "What services do you need?" heading
- Horizontal scrollable row of service pill buttons:
  - `[Lawn Care]` — active, selectable
  - `[Home Cleaning]` — active, selectable
  - `[Pest Control]` — grayed out, "Coming soon" tooltip on press
  - `[HVAC]` — grayed out, "Coming soon"
  - `[Plumbing]` — grayed out, "Coming soon"
- Selected state: pill fills with primary green, white text, checkmark icon
- Multi-select allowed
- `[Let's go →]` CTA — enabled even with no selection (homeowner can browse later)

**On submit:** Save interests to user profile, navigate to main app `/(homeowner)/(tabs)/`.

---

### 4.6 Home / Browse Tab

**File:** `app/(homeowner)/(tabs)/index.tsx`

**Purpose:** Discovery hub. Convert browsing homeowners into bookers.

**Layout (scrollable):**

**Section 1 — Hero**
- Background: full-width card with primary green gradient
- Headline: "Book a trusted pro in [neighborhood]" — white, `headingLg`
- Sub: "Verified, insured, and rated by your neighbors"
- `[Book now →]` CTA — amber button, navigates to Book tab

**Section 2 — Quick Book Cards**
- Horizontal scroll (or 2-column grid) of service cards
- Each card: illustrated service icon, service name, "From $XX/visit", `[Book]` button
- Lawn Care card (active) + Home Cleaning card (active)
- Cards are large, tap anywhere to navigate to booking flow for that service

**Section 3 — "Your Neighborhood Pros"**
- Section heading + "See all" link
- Horizontal scroll of ProviderCard components (see Section 6)
- Cards show: provider avatar, name, service types, composite trust score (numeric + mini rings), verified badges, availability dot

**Section 4 — "How HomeBase Works" (first-time users only)**
- 3-step illustrated explainer:
  1. "Tell us what you need" — search/match icon
  2. "Compare your top vetted pros" — person with checkmark icon
  3. "They arrive, you review" — star/check icon
- Horizontal swipeable cards or vertical stacked layout
- Hide after user has completed first booking (persisted in user profile)

**Section 5 — "Why HomeBase is Different"**
- 4-item feature list:
  1. No lead spam — a curated shortlist, not 5 contractors bidding
  2. Verified & insured providers (Tier 1 + Tier 2 badges explained)
  3. Instant pay for pros — means better providers choose HomeBase
  4. Real damage protection — binding SLA, not fine print
- Use icons + short bold heading + 1-line explainer for each
- Can be collapsed/expanded on subsequent visits

**Empty state (new user, no providers in area):**
- Centered illustration of a home with question marks
- "We're still growing in your area"
- "Join the waitlist and we'll notify you when providers arrive"
- `[Join Waitlist]` CTA

**API calls:**
- `GET /providers/search?zip=XXXXX&limit=10` — fetch nearby providers for horizontal scroll
- Cached via React Query, stale-while-revalidate 5 minutes

---

### 4.7 Book Tab — Service Selection

**File:** `app/(homeowner)/(tabs)/book.tsx`

**Purpose:** Entry point to booking flow.

**Layout:**
- "What do you need?" heading
- Two large illustrated cards:
  - **Lawn Care** — outdoor/lawn illustration, "Mowing, edging, trimming", "From $45/visit"
  - **Home Cleaning** — home interior illustration, "Standard, deep clean, move-in/out", "From $80/visit"
- Each card: full-width, 160px height, rounded corners, subtle shadow, press animation
- On press → navigate to `booking/service-select` with the service type pre-selected

---

### 4.8 Booking Flow (Multi-Step)

**File structure:** `app/(homeowner)/booking/`

The booking flow is the **most critical UX in the app**. It must feel as smooth and confidence-building as Airbnb's. Never make the user feel lost. Every step should feel like progress.

**Global booking flow shell:**
- Fixed header with: back button (left), progress indicator (center, step X of 6), "Cancel" link (right)
- Progress indicator: 6 circular dots, current step filled green, completed steps filled amber, upcoming steps gray
- Step transitions: horizontal slide — new step slides in from right, current step exits to left (Reanimated 3)
- Sticky bottom CTA area: white background, `[Continue]` button, step-specific helper text above it

---

#### Step 1 — Service Details

**File:** `app/(homeowner)/booking/service-select.tsx`

**Fields:**
- Service type: Lawn Care | Home Cleaning (radio — pre-selected from previous screen)
- Booking type:
  - `[Subscription]` — lower price badge "+ Save 10%" next to label
  - `[One-time]`
  - Large toggle with subtle animation between states
- If Subscription selected → show frequency selector:
  - `[Weekly]` / `[Biweekly]` / `[Monthly]` — pill toggle
  - Price breakdown: "~$X per visit • billed after each service"
- If One-time → show estimated price range for the service

**Validation:** Must select service type and booking type before Continue.

---

#### Step 2 — Schedule

**File:** `app/(homeowner)/booking/schedule.tsx`

**Components:**
- "Smart suggestion" at top: "Next available this week: [Day, Date] at [Time]" — tap to auto-select
- Date picker: horizontal scrollable week strip, each day shows day name + date number + availability dot (green = available, gray = not)
- Time picker: grid of available time slots for selected date (pulled from provider availability — stubbed in frontend-only build)
- If subscription: "Your [Frequency] service will automatically recur. You can pause or cancel anytime."
- Subscription visual: small calendar showing recurring dates faintly behind the selected date

**API call:** `GET /providers/availability?service=lawn&zip=XXXXX&date=YYYY-MM-DD` (stubbed in frontend phase)

---

#### Step 3 — Provider Match

**File:** `app/(homeowner)/booking/match.tsx`

**This is a critical screen. It must build trust.**

**Initial state (loading):**
- "Finding vetted pros near you..." copy
- Skeleton cards while the local search resolves; no artificial delay

**Shortlist state:**
- "Compare your top pros" heading (honest count — e.g. "2 pros serve your area" when supply is thin; never pad to a fake 5)
- 3–5 selectable ProviderCards (shortlist variant) — trust, price, availability, work samples; homeowner taps to choose one. Each card surfaces:
  - Large avatar (96px circle, verified badge overlay)
  - Name + business name
  - Verification badges (Tier 1 and/or Tier 2) — prominent
  - Composite trust score: 4 quadrant rings (Reliability/Quality/Communication/Professionalism) with numeric scores, animated fill on entrance
  - Review count: "Based on 47 verified check-ins"
  - Service area confirmation: "Serves [neighborhood]"
  - Next available slot: "Available [Day] at [Time]"
- "Why this provider?" expandable section:
  - 1-2 sentences on why this specific provider was matched (stubbed copy for now: "Marcus has the highest reliability score for lawn care in your area and has zero cancellations in the last 90 days.")
- CTA: `[Confirm this pro]` — green primary button
- "Not the right fit? We'll find another" — ghost link below (re-triggers matching animation, returns a different stub result)

**API call:** `GET /bookings/match?service=lawn&date=YYYY-MM-DD&time=HH:MM&zip=XXXXX`

---

#### Step 4 — Job Details

**File:** `app/(homeowner)/booking/details.tsx`

**Fields:**
- Address: pre-filled from profile, with "Edit" link (opens address bottom sheet)
- Special instructions: textarea, placeholder "Gate code, dog in backyard, preferred parking area..."
  - Character limit: 500
  - Live character counter
- Property photo (optional): tap to upload, shows thumbnail preview with remove button
- Checkbox: "Save these instructions for future bookings"

---

#### Step 5 — Payment

**File:** `app/(homeowner)/booking/payment.tsx`

**Components:**
- "Payment method" section:
  - If card on file: show masked card (Visa •••• 4242), green checkmark, "Edit" link
  - If no card: `[Add a card]` → Stripe SetupIntent sheet (Stripe React Native)
- Price breakdown card:
  - Service: $XX.XX
  - Platform fee: Included
  - Subscription savings (if subscription): -$X.XX (amber text)
  - **Total: $XX.XX**
- Escrow notice (new provider): small info callout: "Your payment is held for 24 hours after service completion — released automatically if no issues are reported."
- SLA badge: small "Protected by HomeBase" badge with shield icon
- `[Confirm & Book]` primary CTA

**API call:** `POST /stripe/setup-intent` (if no card on file)

---

#### Step 6 — Confirmation

**File:** `app/(homeowner)/booking/confirmation.tsx`

**This must feel celebratory. This is the successful outcome.**

**Animation sequence on mount:**
1. Large animated checkmark (Lottie or Reanimated SVG animation) — green, center screen
2. Confetti burst from center (subtle, not overwhelming — 1–2 seconds)
3. "You're all set!" heading fades in
4. Job summary card slides up from below

**Job summary card:**
- Provider avatar + name
- Service type + date/time
- Address
- "Subscription: Biweekly" (if subscription)
- Total charged

**CTAs below summary:**
- `[Add to Calendar]` — calls native calendar via Expo Calendar API
- `[View job]` — navigates to job detail screen
- `[Back to home]` — pops to home tab

**SMS/email confirmation:** "We've sent confirmation details to [email]" — small gray copy.

---

### 4.9 My Jobs Tab

**File:** `app/(homeowner)/(tabs)/jobs.tsx`

**Layout (segmented control):** Active | Subscriptions | History

**Active section:**
- List of upcoming/in-progress jobs
- Each item: provider avatar, service type icon, status pill, "Next: [Day, Date Time]"
- Status pills: Confirmed (green), En Route (amber), In Progress (blue), Completed (gray), Cancelled (red)
- Tap → Job Detail screen

**Subscriptions section:**
- List of active subscriptions
- Each item: service type, frequency, next date, provider name, monthly cost estimate
- Actions per subscription (bottom sheet on long-press or swipe): Pause, Change frequency, Cancel

**History section:**
- Completed jobs, most recent first
- Check-in completion status: "Reviewed" (green check) or "Review pending" (amber dot)
- Tap → Job Detail screen
- "Book again" quick action on each row

---

### 4.10 Job Detail Screen

**File:** `app/(homeowner)/job/[id].tsx`

**Layout:**
- Header: "Job #XXXX" with status pill
- Timeline component (vertical progress bar):
  - Steps: Booked → Confirmed → En Route → In Progress → Completed
  - Each step: icon + label + timestamp when reached
  - Current step: animated pulsing indicator
- Provider card (compact)
- Service details section: type, date/time, address, special instructions
- Chat CTA: `[Message [Provider Name]]` — navigates to Inbox thread
- Damage claim CTA (only if job is Completed + within 48hr window): `[Report an issue]` — link

---

### 4.11 Post-Service Check-In Modal

**This is the most important interaction in the app.** It feeds the trust score. Treat it accordingly.

**Trigger:** Fires as a full-screen modal 30–60 minutes after job completion. If dismissed, re-prompts once after 2 hours. After second dismissal, marks as optional missed.

**Design philosophy:** Make this feel like a 15-second delight, not a survey. Card-based, big tappable areas, no fiddly sliders.

**Screen structure (4 cards + photo):**

**Card 0 (Intro — 2 seconds, auto-advances):**
- Provider avatar + name
- "How was your [Lawn Care] with [Provider]?"
- Animated appearance, then auto-transitions to Card 1

**Card 1 — Reliability**
- "Did [Provider] show up on time?"
- 3 large pill options: `[Early / On time]` `[A bit late]` `[Very late / No show]`
- Background: white card, large tap targets (minimum 48px height)
- Progress: 1 of 4 dots at top

**Card 2 — Quality**
- "How was the quality of work?"
- 5-star tap rating (large, 40px stars) with label that updates: "Poor" / "Fair" / "Good" / "Great" / "Excellent"
- Progress: 2 of 4

**Card 3 — Communication**
- "How was communication before + during the job?"
- 3 pill options: `[Great]` `[Fine]` `[Poor]`
- Progress: 3 of 4

**Card 4 — Professionalism**
- "Did the pro behave professionally?"
- 3 pill options: `[Yes, very professional]` `[Mostly]` `[Had concerns]`
- Progress: 4 of 4

**Card 5 — Photo (optional)**
- "Share a photo of the finished work (optional)"
- Large tap-to-upload zone with dashed border + camera icon
- After photo selected: shows thumbnail preview with replace/remove options
- `[Submit review]` primary CTA + "Skip photo" ghost link
- Copy: "Photos help future homeowners see real work quality"

**Card 6 — Success celebration:**
- Animated checkmark (large, spring physics)
- "Thank you! Your review helps your neighbors."
- Provider trust score update preview: "Marcus's Reliability score just went up" with upward arrow animation
- `[Done]` CTA

**Transitions between cards:**
- Spring physics horizontal swipe — new card bounces in from right with slight overshoot (stiffness: 200, damping: 20)
- Haptic feedback on each card advance (Expo Haptics `impactAsync(Medium)`)
- Cannot go back — check-in is forward-only by design

**API call:** `POST /bookings/:id/checkin` — submit on Card 5 (before or after photo)

---

### 4.12 Inbox / Messages Tab

**File:** `app/(homeowner)/(tabs)/inbox.tsx`

**Layout:**
- List of message threads, one per job
- Each thread: provider avatar, provider name, last message preview, timestamp, unread dot
- System notification threads (distinct visual treatment — HomeBase shield icon as "sender")
- Tap → Message thread screen

**Message thread screen:**
- Standard chat bubble UI
- Homeowner: right-aligned, green bubbles
- Provider: left-aligned, white bubbles with light border
- Masked phone number notice (until job confirmed): "Contact info is revealed after booking is confirmed"
- Input bar: text field + send button + attachment icon

**Realtime:** Subscribe to Supabase Realtime channel `messages:job_id=XXX` for live message updates.

---

### 4.13 Profile Tab

**File:** `app/(homeowner)/(tabs)/profile.tsx`

**Layout:**
- Top section: avatar (tap to edit), name, email, member since
- Settings rows (grouped lists):
  - **Account**: Edit profile, Change email, Change password
  - **Subscriptions**: View active subscriptions, Payment methods
  - **Trust & Safety**: Review history, Damage claims
  - **Notifications**: Toggle SMS, email, push for each notification type
  - **Support**: Help center, Contact support
  - **Legal**: Terms of service, Privacy policy
- `[Sign out]` — red text link at bottom

---

## 5. Provider App — Screen Specifications

The provider app shares the same React Native codebase. Navigation routes to `/(provider)` or `/(tech)` based on the `role` field in auth state.

---

### 5.1 Provider Onboarding Flow (Owner)

This is a 7-step flow. Do NOT rush the user. Each step is important for getting them on the platform correctly.

**Global onboarding shell:**
- Progress bar at top (thin, primary green fill, animated)
- Step counter: "Step X of 7"
- Back button on all steps except step 1
- "Save progress & finish later" option in header (saves draft state to Supabase)

---

#### Onboarding Step 1 — Welcome / Auth

**File:** `app/(provider)/onboarding/welcome.tsx`

- "Start earning with HomeBase" heading
- Value props: "No lead fees • Instant payouts • Flexible schedule"
- Google OAuth + email/password options
- "Already have an account? Sign in" link

---

#### Onboarding Step 2 — Business Details

**File:** `app/(provider)/onboarding/business.tsx`

**Fields:**
- Business name
- Services offered: checkboxes for Lawn Care, Home Cleaning (both MVP-active)
  - Other services show as "Coming soon" (disabled checkboxes)
- Years in business: dropdown (< 1 year / 1–3 years / 3–5 years / 5+ years)
- Number of employees: (Just me / 2–5 / 6–10 / 10+)
- Business phone

---

#### Onboarding Step 3 — Service Area Setup

**File:** `app/(provider)/onboarding/service-area.tsx`

**Two methods (toggle between):**

**Method A — Radius:**
- Zip code input (auto-detected from location if permission granted)
- Radius slider: 5 / 10 / 15 / 20 / 25 miles
- Map preview showing the circle coverage area with animated radius update

**Method B — Zip selection:**
- Map with zip code polygons, tap to select/deselect
- Selected zips show in list below map with remove button

**Note below:** "You'll only receive job requests within this area. You can expand or reduce it anytime."

---

#### Onboarding Step 4 — Availability Setup

**File:** `app/(provider)/onboarding/availability.tsx`

**Layout:**
- "Set your weekly schedule" heading
- 7-day grid (Mon–Sun columns)
- For each day: toggle on/off, then time block start/end pickers
- Template presets: "Mon–Fri 8am–5pm", "Mon–Sat 7am–6pm", "Custom"
- "Block specific dates" section: tap a date on mini-calendar to block it
- "Minimum advance notice": selector (Same day / 24 hours / 48 hours)
- "Maximum jobs per day": number input

---

#### Onboarding Step 5 — Verification Tier 1

**File:** `app/(provider)/onboarding/verification-tier1.tsx`

**Layout:**
- Explanation: "HomeBase requires all providers to pass a background check. This takes 3–5 business days."
- What's checked: criminal record, sex offender registry, identity verification
- ID upload: front + back of government-issued ID (Expo ImagePicker → Supabase Storage)
- Consent checkbox: "I consent to a background check conducted by [partner]"
- `[Submit for background check]` CTA
- After submission: status screen showing "Pending (3-5 business days)" with email notification promise

**Note:** Background check integration (Checkr) is stubbed in frontend phase. The UI submits the ID images and shows the pending state. Backend wires Checkr in Full Backend phase.

---

#### Onboarding Step 6 — Verification Tier 2

**File:** `app/(provider)/onboarding/verification-tier2.tsx`

**Layout:**
- "Upload your insurance certificate" heading
- Certificate of Insurance (COI) upload (PDF or image)
- Policy expiry date picker
- Coverage amount input (minimum $300,000 general liability)
- "Manual review" notice: "Our team will verify your insurance within 1 business day"
- Can skip Tier 2 and complete Tier 1 only — but Tier 2 badge requires both

---

#### Onboarding Step 7 — Banking Setup

**File:** `app/(provider)/onboarding/banking.tsx`

**Layout:**
- "Set up instant payouts" heading
- Value prop: "Get paid the same day you complete a job"
- `[Connect bank account]` CTA → launches Stripe Connect Express onboarding (Stripe React Native)
- After Stripe Connect complete: confirmation showing bank name + masked account number
- Instant payout info: "1% fee (minimum $0.50) for same-day payout. Standard 2-day payout is free."

---

#### Onboarding Step 8 — Profile Completion

**File:** `app/(provider)/onboarding/profile.tsx`

**Fields:**
- Profile photo: tap to upload (Expo ImagePicker)
- Bio: textarea, 300 character limit, placeholder "Tell homeowners about your experience, approach, and what makes your service stand out"
- Pricing range: min–max per visit (displayed on provider cards to set expectations)
- Portfolio photos: up to 6 photos of past work (optional but strongly encouraged)
  - "Providers with portfolio photos receive 3x more bookings"

**On completion:** Navigate to `/(provider)/(tabs)/today` with a welcome celebration (confetti + "You're ready to start receiving jobs!")

---

### 5.2 Provider Today / Dashboard Tab

**File:** `app/(provider)/(tabs)/today.tsx`

**Purpose:** At-a-glance view of what matters right now.

**Layout:**

**Section 1 — Greeting + date**
- "Good morning, [Name]" — `headingMd`
- "[Day], [Full Date]"

**Section 2 — Today's Jobs**
- Chronological list of confirmed jobs for today
- Each job card: time slot, homeowner name (first name + last initial), service type, address (street + neighborhood), drive-time estimate (Google Maps estimate), status pill
- Swipe right on job card → "Mark en route" action
- Swipe left → "Call support" (for issues only)
- Empty state: "No jobs scheduled today. Your next job is [Day] at [Time]."

**Section 3 — Upcoming (next 7 days)**
- Compact list: Date | Count of jobs
- Tap row → jumps to Schedule tab on that date

**Section 4 — Earnings Summary**
- This week: $XXX.XX
- This month: $XXX.XX
- `[Cash out]` button → navigates to Earnings tab instant payout flow

**Section 5 — Trust Score Card**
- "Your HomeBase Score" heading
- 4-component trust score in a 2x2 grid (Reliability / Quality / Communication / Professionalism)
- Each: circular progress ring (40px diameter), numeric score (X.X/5.0), component name
- Overall composite score: large prominent number + trend arrow (up/down from last 30 days)
- "Improve your score" expandable section: 2–3 tips based on which components are lowest (stubbed copy in frontend phase)

---

### 5.3 Provider Schedule / Calendar Tab

**File:** `app/(provider)/(tabs)/schedule.tsx`

**Layout:**
- Toggle: Week view (default) | Month view
- Week view: 7-column grid, time axis on left, 30-minute slots
  - Confirmed jobs: dark green blocks with job time + homeowner name
  - Pending jobs: amber outline blocks
  - Blocked time: diagonal stripe pattern, gray
  - Available time: white / light cream
- Month view: calendar grid, days with jobs show a colored dot
- Tap on empty slot → "Block time" bottom sheet (set a manual block)
- Tap on job block → Job Detail bottom sheet

**Bottom sheet — Block Time:**
- Date + start/end time
- Reason (optional): Vacation / Personal / Other
- Recurring option: block every [weekday] until [date]

**API calls:**
- `GET /providers/schedule?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `POST /providers/schedule/block`

---

### 5.4 Provider Jobs Tab

**File:** `app/(provider)/(tabs)/jobs.tsx`

**Segmented control:** New Requests | Active | Completed

**New Requests section:**
- Incoming job requests (routed from homeowners)
- Each request: service type, date/time, neighborhood (not full address until accepted), estimated payout (after HomeBase fee)
- **Accept/Decline interaction** — this must be fast and clear:
  - Two large buttons: `[Accept]` (green) + `[Decline]` (outlined red)
  - Countdown timer: "Expires in 4:32" with visual countdown ring around the card
  - After countdown: job auto-reassigns, card grays out with "Expired" label
  - Accept animation: green flash + card slides out with success haptic
  - Decline: confirmation bottom sheet ("Are you sure? This job will be reassigned") before finalizing

**Active section:**
- Accepted jobs that are upcoming or in-progress
- Status updates: `[Mark as En Route]` → `[Mark as Started]` → triggers check-in flow on job completion
- In-progress job: persistent bottom banner "Job in progress with [Homeowner first name] • Tap to check in"

**Completed section:**
- Past completed jobs
- Payout amount per job
- Check-in submitted / not submitted status
- Tap → Job Detail

**API calls:**
- `GET /providers/jobs?status=pending`
- `POST /providers/jobs/:id/accept`
- `POST /providers/jobs/:id/decline`
- `PATCH /providers/jobs/:id/status` — en_route / started / completed

---

### 5.5 Provider Check-In Flow (At-Job)

**Trigger:** Provider taps "I've arrived" from job card, OR persistent bottom card on Today tab during an active job.

**This is distinct from the homeowner's post-service check-in. The provider check-in is at the JOB SITE, for job completion documentation.**

**Steps:**

**Step 1 — Before photo:**
- "Before you start: take a photo of the area"
- Large camera viewfinder with capture button
- "Tip: Capture the full lawn / full room so the homeowner can see the difference"

**Step 2 — Service notes:**
- "Any notes about this job?" — textarea
- Quick-select tags: "Gate was locked", "Dog present", "Area in poor condition", "Excellent access"

**Step 3 — After photo:**
- "Finished! Take an after photo"
- Same camera UI as step 1
- Side-by-side preview of before + after (small thumbnails) after capture

**Step 4 — Submit:**
- Summary: before/after photos + notes
- `[Submit check-in]` primary CTA
- Submitting: shows "Submitting..." then animated checkmark success
- "Your payout will be processed today" message with payout amount

**API call:** `POST /providers/jobs/:id/checkin` — multipart form with before_photo, after_photo, notes, tags

---

### 5.6 Provider Earnings Tab

**File:** `app/(provider)/(tabs)/earnings.tsx`

**Layout:**

**Section 1 — Balance**
- Large display: "Available balance: $XXX.XX"
- If balance > $1: shimmer animation on the amount (draws attention to payout CTA)
- `[Cash out now]` — amber primary button
  - Tap → "Instant Payout" bottom sheet:
    - Amount: $XXX.XX
    - Fee: 1% ($X.XX, minimum $0.50)
    - You receive: $XXX.XX
    - Delivery: "In your bank account within minutes"
    - `[Confirm payout]` → animated success → "Payout initiated!"
  - Alternative: `[Standard payout (2 business days, free)]` ghost link

**Section 2 — Earnings History**
- Filter: This week | This month | Last month | All time
- List of completed jobs with: date, service, homeowner (first name), gross amount, HomeBase fee (shown as line item), net payout
- Take-rate shown transparently per job (10% for subscriptions, 17.5% for one-off)

**Section 3 — Payout History**
- List of past payouts: date, amount, bank account, status (Completed / Pending)

**Section 4 — Bank Account**
- Masked account number, bank name
- `[Update bank account]` — re-launches Stripe Connect onboarding

**API calls:**
- `GET /providers/earnings`
- `POST /stripe/payout`

---

### 5.7 Provider Profile / Settings Tab

**File:** `app/(provider)/(tabs)/profile.tsx`

**Layout:**

**Top section:**
- Avatar + business name + composite trust score (prominent, with "Your public score" label)
- `[Preview public profile]` link — shows what homeowners see

**Settings groups:**

**Business:**
- Edit profile (bio, photos, pricing range)
- Service area (edit coverage)
- Availability (edit weekly schedule)

**Crew:**
- `[Manage crew members]` → crew management screen
- Shows current Tech accounts: name, email, status (Active / Invited / Suspended)
- `[Invite a tech]` → enter email, sends invite link
- Tap a tech → see their assigned jobs, deactivate option

**Integrations:**
- Google Calendar: Connect / Disconnect toggle
  - When connected: "Syncing to [calendar name]" green dot
  - When disconnected: "Connect to avoid double-bookings" prompt

**Verification:**
- Tier 1 status: Verified (green badge) / Pending / Not started
- Tier 2 status: Verified / Pending / Expires [date]
- If approaching expiry (<30 days): amber warning with "Renew insurance" CTA

**Account:**
- Change email
- Change password
- Notification preferences
- `[Sign out]`

---

### 5.8 Tech Role — Simplified View

**File:** `app/(tech)/(tabs)/today.tsx`

Tech accounts see a stripped-down version of the provider app.

**What Tech can see:**
- Today's assigned jobs (same job card as Owner today view)
- Job detail (tap a job)
- Provider check-in flow (identical to Owner)
- Own earnings summary (today + this week)

**What Tech cannot see:**
- Full earnings / payout controls (no cash out)
- Schedule management
- Crew management
- Verification status
- Settings beyond notifications and sign-out

**Navigation:** 2-tab nav — Today | Earnings (simplified).

---

## 6. Shared Components Library

These components are used across both homeowner and provider apps. Build these first as they are the visual language of the entire product.

---

### 6.1 ProviderCard

**Variants:** Compact (horizontal scroll) | Standard (vertical list) | Expanded (booking match result)

```typescript
interface ProviderCardProps {
  providerId: string;
  name: string;
  businessName: string;
  avatarUrl: string | null;
  verificationTier: 0 | 1 | 2;
  compositeScore: {
    overall: number;           // 0–5.0
    reliability: number;
    quality: number;
    communication: number;
    professionalism: number;
  };
  checkInCount: number;
  serviceTypes: ('lawn' | 'cleaning')[];
  priceRangeMin: number;
  priceRangeMax: number;
  isAvailableToday: boolean;
  distanceMiles?: number;
  onPress: () => void;
}
```

**Compact card (horizontal scroll):**
- Width: 200px, height: 240px
- Avatar: 64px circle, top-center
- Name below avatar
- Trust score: compact 4-ring display (small, 24px rings) below name
- Price range: "$XX–$XX/visit"
- Availability dot: green "Available today" OR gray "Next available [Day]"
- Verified badge: Tier 1 + optional Tier 2 icons below name

**Standard card (vertical list):**
- Horizontal layout: avatar left, content right
- Avatar: 48px with tier badge overlay
- Name + business name
- Trust score: single overall score (large, bold) + "X.X overall" label
- 4-ring mini breakdown visible on hover/press (animate in)
- Price range + check-in count ("47 verified reviews")
- `[Book]` CTA button right-aligned

**Expanded card (booking match):**
- Full-width, more vertical space
- Large avatar (96px)
- All trust score detail (4 rings at full size with labels + scores)
- Bio excerpt (2 lines)
- All verification badges
- Portfolio photo strip (3 photos horizontal)

**Trust score ring animation:** On mount, rings animate from 0 to their value over 800ms with ease-out. Each ring starts 100ms after the previous (stagger).

---

### 6.2 TrustScoreDisplay

```typescript
interface TrustScoreDisplayProps {
  scores: {
    reliability: number;
    quality: number;
    communication: number;
    professionalism: number;
  };
  size: 'sm' | 'md' | 'lg';
  showLabels: boolean;
  showAIExplanation?: boolean;  // If true, show Claude-generated "why this score" per component
  aiExplanations?: {
    reliability: string;
    quality: string;
    communication: string;
    professionalism: string;
  };
  animated: boolean;
}
```

**Layout:**
- 2x2 grid of score rings
- Each ring: SVG circular progress (stroke-dasharray animation), score number inside, label below
- Colors:
  - 4.5–5.0: success green
  - 3.5–4.4: accent amber
  - 2.5–3.4: warning orange
  - Below 2.5: error red
- If `showAIExplanation`: info icon next to each component → tap opens bottom sheet with the AI-generated explanation sentence
- Overall composite score: shown prominently above or below the grid (calculated as weighted average)

**Composite score weights:**
- Reliability: 35%
- Quality: 35%
- Communication: 20%
- Professionalism: 10%

---

### 6.3 JobStatusTimeline

```typescript
type JobStatus = 'booked' | 'confirmed' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

interface JobStatusTimelineProps {
  currentStatus: JobStatus;
  timestamps: Partial<Record<JobStatus, string>>;  // ISO timestamp for each reached status
  providerName: string;
}
```

**Layout:** Vertical timeline, left-aligned
- Each step: icon circle (filled green if completed, pulsing green if current, gray if future) + label + timestamp
- Connecting line between steps (green for completed segments, gray for future)
- Current step: larger icon + bold label + animated pulse ring

**Steps:** Booked → Confirmed → En Route → In Progress → Completed

---

### 6.4 VerificationBadge

```typescript
interface VerificationBadgeProps {
  tier: 1 | 2;
  size: 'sm' | 'md';
  showTooltip?: boolean;
}
```

**Tier 1:** Shield icon + "Background Checked" label. Green shield.
**Tier 2:** Shield icon + lock overlay + "Insured" label. Gold/amber shield.

**Tooltip (on long press):**
- Tier 1: "This provider has passed a national criminal background check"
- Tier 2: "This provider carries general liability insurance (verified by HomeBase)"

---

### 6.5 CheckInWidget

The 15-second check-in. See Section 4.11 for full specification. The component is `<CheckInModal>` — a full-screen modal with card-based question flow.

---

### 6.6 SkeletonLoader

```typescript
interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  animated?: boolean;  // shimmer effect — default true
}
```

Shimmer animation: linear gradient translating from left to right, `#E5E7EB` base with `#F3F4F6` shimmer highlight, 1.5s loop.

Use this for ALL loading states. Never show blank screens.

---

### 6.7 BottomSheet

Use `@gorhom/bottom-sheet` for all bottom sheet interactions. Configure:
- Snap points: ['40%', '80%'] for most sheets
- Background: white, top border radius 20px
- Drag indicator: 4x32px gray pill, centered at top, 8px from top edge
- Backdrop: semi-transparent black (0.5 opacity) with tap-to-dismiss

---

### 6.8 EmptyState

```typescript
interface EmptyStateProps {
  illustration: React.ReactNode;  // SVG or Lottie
  heading: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}
```

**Instances to implement:**

| Screen | Heading | Body | CTA |
|---|---|---|---|
| Browse — no providers | "We're growing in your area" | "Join the waitlist to be notified when we launch near you" | Join Waitlist |
| My Jobs — no jobs | "No jobs yet" | "Browse providers near you and book your first service" | Browse providers |
| My Jobs History — empty | "No completed jobs" | "Your completed jobs and reviews will appear here" | Book a service |
| Provider Today — no jobs | "No jobs today" | "Your next scheduled job is [Day]. Check your schedule." | View schedule |
| Provider Jobs — no requests | "No new job requests" | "Complete your profile to start receiving job matches in your area" | Complete profile |
| Inbox — no messages | "No messages yet" | "Messages with your providers will appear here after booking" | Browse providers |

---

## 7. Web Admin Dashboard (Next.js)

**File:** `apps/admin/`

This is **internal tooling** for the HomeBase founding team. It is not customer-facing. Design priority: functional and clear over beautiful.

**Design language:**
- Tailwind CSS
- Simple table-based layout
- shadcn/ui components (clean, accessible, low-effort)
- Sidebar navigation (left, 240px), main content area (right)

**Tech:** Next.js 14 App Router, Supabase client with service role key (admin access), TanStack Query for data fetching, TanStack Table for all table views.

---

### 7.1 Layout

**Sidebar:**
- HomeBase logo top-left
- Navigation items:
  - Providers (verification queue)
  - Jobs (active board)
  - Claims (damage claims)
  - Trust Scores (overrides)
  - Users (user management)
- Bottom: signed-in admin user + sign out

**Main area:**
- Page heading + action buttons (top row)
- Content below

---

### 7.2 Providers Queue

**Route:** `/admin/providers`

**Tabs:** All | Pending Review | Background Check | Verified | Suspended

**Table columns:**
- Business name | Owner name | Email | Verification tier | Status | Submitted date | Actions

**Row actions:**
- View details → side panel with submitted documents
- Approve Tier 1 / Approve Tier 2
- Request more info (sends email)
- Reject (with reason)

**Background check status:** Pulled from Checkr webhook (display only in frontend phase — shows raw status string)

---

### 7.3 Active Jobs Board

**Route:** `/admin/jobs`

**Real-time board** — Supabase Realtime subscription on `jobs` table.

**Filter bar:** Service type | Date | Status | Provider | Zip

**Table columns:**
- Job ID | Homeowner | Provider | Service | Scheduled time | Status | Amount | Created

**Status pills:** Booked / Confirmed / En Route / In Progress / Completed / Cancelled

**Row click → detail drawer:** Full job detail, check-in data if submitted, messages log.

---

### 7.4 Damage Claims

**Route:** `/admin/claims`

**Tabs:** Open | Under Review | Resolved | Rejected

**Table columns:**
- Claim ID | Job ID | Homeowner | Provider | Filed date | Damage description | Photos | Status | Assigned to

**Row click → claim detail:**
- Full incident description
- Uploaded photos (image gallery)
- Timeline of claim events
- Resolution workflow:
  - `[Approve claim]` → triggers escrow release to homeowner
  - `[Reject claim]` → with required reason text
  - `[Request more info]` → sends email to homeowner
- SLA timer: shows days elapsed since filing (turns red at 5 days)

---

### 7.5 Trust Score Overrides

**Route:** `/admin/trust-scores`

**Purpose:** Manually flag suspicious check-ins or adjust scores in edge cases.

**Table:** Provider name | Current scores (4 components) | Flagged check-ins count | Last updated | Actions

**Row click → score detail:**
- Full list of check-ins feeding this score
- Each check-in: date, homeowner, scores given, photos, flag/unflag button
- Manual adjustment: override individual component score with required note
- Override history log

---

### 7.6 User Management

**Route:** `/admin/users`

**Filter:** Homeowners | Providers | Techs | All

**Table:** Name | Email | Role | Join date | Status | Last active | Actions

**Row actions:**
- View profile
- Suspend (with reason + duration)
- Permanently ban
- Reset password (sends email)
- View all jobs/bookings

---

## 8. Basic Backend / API Wiring

This section documents the minimal API surface needed to wire up the frontend. In the frontend-only build phase, stub these with hardcoded mock data using React Query's `initialData` or a local mock layer. Replace with real Supabase calls in the full backend phase.

---

### 8.1 Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

---

### 8.2 Auth Endpoints

All auth is handled via Supabase Auth directly. No custom auth endpoints needed.

```typescript
// Auth actions (call directly in components via Supabase client)

// Sign up
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { role: 'homeowner' } }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// Google OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: 'homebase://auth/callback' }
});

// Sign out
await supabase.auth.signOut();

// Get current session
const { data: { session } } = await supabase.auth.getSession();
```

---

### 8.3 Provider Endpoints

All provider data reads/writes go through Supabase RPC or direct table queries via the client. Custom business logic (routing, scoring) goes through Edge Functions.

```typescript
// Provider profile (own)
// GET /providers/profile
const { data } = await supabase
  .from('providers')
  .select('*, provider_scores(*), provider_verification(*)')
  .eq('user_id', session.user.id)
  .single();

// Update profile
// PUT /providers/profile
await supabase
  .from('providers')
  .update({ bio, avatar_url, pricing_min, pricing_max })
  .eq('user_id', session.user.id);

// Provider onboarding (business details + service area + availability)
// POST /providers/onboard — call Supabase Edge Function
const { data } = await supabase.functions.invoke('provider-onboard', {
  body: { businessDetails, serviceArea, availability }
});

// Provider job queue
// GET /providers/jobs
const { data } = await supabase
  .from('jobs')
  .select('*, homeowners(first_name, address_neighborhood), bookings(*)')
  .eq('provider_id', providerId)
  .order('scheduled_at', { ascending: true });

// Accept job
// POST /providers/jobs/:id/accept
const { data } = await supabase.functions.invoke('job-accept', {
  body: { jobId }
});

// Decline job
// POST /providers/jobs/:id/decline
const { data } = await supabase.functions.invoke('job-decline', {
  body: { jobId, reason }
});

// Submit provider check-in
// POST /providers/jobs/:id/checkin
const { data } = await supabase.functions.invoke('provider-checkin', {
  body: { jobId, beforePhotoUrl, afterPhotoUrl, notes, tags }
});
```

---

### 8.4 Homeowner Endpoints

```typescript
// Search providers
// GET /providers/search?zip=XXXXX&service=lawn
const { data } = await supabase.functions.invoke('providers-search', {
  body: { zip, service, date }
});

// Provider detail
// GET /providers/:id
const { data } = await supabase
  .from('providers')
  .select(`
    *,
    provider_scores(*),
    provider_verification(*),
    check_ins(count),
    portfolio_photos(*)
  `)
  .eq('id', providerId)
  .single();

// Create booking
// POST /bookings
const { data } = await supabase.functions.invoke('booking-create', {
  body: {
    serviceType,
    bookingType,       // 'subscription' | 'one_off'
    frequency,         // 'weekly' | 'biweekly' | 'monthly' | null
    scheduledAt,
    addressId,
    specialInstructions,
    photoUrl
  }
});

// Get homeowner bookings
// GET /bookings
const { data } = await supabase
  .from('bookings')
  .select('*, jobs(*), providers(name, avatar_url, provider_scores(*))')
  .eq('homeowner_id', homeownerId)
  .order('created_at', { ascending: false });

// Submit homeowner post-service check-in
// POST /bookings/:id/checkin
const { data } = await supabase.functions.invoke('homeowner-checkin', {
  body: {
    jobId,
    reliability: 'on_time' | 'bit_late' | 'very_late',
    quality: 1–5,
    communication: 'great' | 'fine' | 'poor',
    professionalism: 'very' | 'mostly' | 'concerns',
    photoUrl
  }
});

// File damage claim
// POST /claims
const { data } = await supabase.functions.invoke('claim-create', {
  body: { jobId, description, photos, damageCategory }
});
```

---

### 8.5 Payment Endpoints

```typescript
// Add card on file (setup intent)
// POST /stripe/setup-intent
const { data } = await supabase.functions.invoke('stripe-setup-intent', {
  body: { homeownerId }
});
// Returns: { clientSecret: string }
// Use with Stripe React Native <CardField> or <PaymentSheet>

// Instant payout request (provider)
// POST /stripe/payout
const { data } = await supabase.functions.invoke('stripe-instant-payout', {
  body: { providerId, amount }  // amount in cents
});
// Returns: { payoutId: string, estimatedArrival: string }
```

---

### 8.6 Realtime Subscriptions

```typescript
// Job status updates (homeowner — live tracking)
const subscription = supabase
  .channel(`job:${jobId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'jobs',
    filter: `id=eq.${jobId}`
  }, (payload) => {
    // Update job status in jobStore
    jobStore.updateJobStatus(jobId, payload.new.status);
  })
  .subscribe();

// New messages (inbox)
const msgSubscription = supabase
  .channel(`messages:${jobId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `job_id=eq.${jobId}`
  }, (payload) => {
    // Append message to thread
  })
  .subscribe();

// New job request (provider — incoming jobs)
const jobRequestSub = supabase
  .channel(`provider-jobs:${providerId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'jobs',
    filter: `provider_id=eq.${providerId}`
  }, (payload) => {
    // Show incoming job notification + update jobs tab badge
  })
  .subscribe();
```

---

### 8.7 Mock Data Layer (Frontend-Only Phase)

Until the full backend is wired, use this pattern to stub API calls:

```typescript
// lib/mocks/providers.ts
export const mockProviders: Provider[] = [
  {
    id: 'prov_001',
    name: 'Marcus Johnson',
    businessName: 'Johnson Premium Lawn Care',
    avatarUrl: 'https://i.pravatar.cc/150?img=11',
    verificationTier: 2,
    compositeScore: {
      overall: 4.8,
      reliability: 4.9,
      quality: 4.8,
      communication: 4.6,
      professionalism: 4.9,
    },
    checkInCount: 147,
    serviceTypes: ['lawn'],
    priceRangeMin: 45,
    priceRangeMax: 85,
    isAvailableToday: true,
    distanceMiles: 2.3,
  },
  // ... more mock providers
];

// In React Query hooks:
const { data: providers } = useQuery({
  queryKey: ['providers', zip],
  queryFn: () => USE_MOCK_DATA
    ? Promise.resolve(mockProviders)
    : fetchProvidersFromAPI(zip),
});
```

Set `USE_MOCK_DATA = true` via an env variable (`EXPO_PUBLIC_USE_MOCKS=true`) so it can be toggled per environment.

---

## 9. State Management

### Setup

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserRole = 'homeowner' | 'provider_owner' | 'provider_tech';

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  providerId: string | null;   // null for homeowners
  isLoading: boolean;

  setSession: (session: Session | null) => void;
  setRole: (role: UserRole) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      role: null,
      providerId: null,
      isLoading: true,

      setSession: (session) => set({ session, user: session?.user ?? null }),
      setRole: (role) => set({ role }),
      signOut: () => set({ session: null, user: null, role: null, providerId: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

```typescript
// stores/bookingStore.ts
// Holds in-progress booking flow state across multi-step form

interface BookingFlowState {
  serviceType: 'lawn' | 'cleaning' | null;
  bookingType: 'subscription' | 'one_off' | null;
  frequency: 'weekly' | 'biweekly' | 'monthly' | null;
  scheduledAt: Date | null;
  matchedProviderId: string | null;
  addressId: string | null;
  specialInstructions: string;
  photoUrl: string | null;

  setServiceType: (t: BookingFlowState['serviceType']) => void;
  setBookingType: (t: BookingFlowState['bookingType']) => void;
  setFrequency: (f: BookingFlowState['frequency']) => void;
  setScheduledAt: (d: Date) => void;
  setMatchedProvider: (id: string) => void;
  setInstructions: (text: string) => void;
  setPhoto: (url: string) => void;
  reset: () => void;
}
```

```typescript
// stores/jobStore.ts
// Active jobs with realtime updates

interface JobState {
  activeJobs: Job[];
  jobStatusById: Record<string, JobStatus>;

  setActiveJobs: (jobs: Job[]) => void;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
}
```

### TanStack Query Configuration

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes
      gcTime: 1000 * 60 * 30,           // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,       // Not applicable in RN, keep false
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Query Key Conventions

```typescript
// lib/queryKeys.ts
export const queryKeys = {
  providers: {
    search: (zip: string, service?: string) => ['providers', 'search', zip, service],
    detail: (id: string) => ['providers', id],
    jobs: (providerId: string) => ['providers', providerId, 'jobs'],
    earnings: (providerId: string) => ['providers', providerId, 'earnings'],
    schedule: (providerId: string, week: string) => ['providers', providerId, 'schedule', week],
  },
  bookings: {
    all: (userId: string) => ['bookings', userId],
    detail: (id: string) => ['bookings', id],
    match: (params: object) => ['bookings', 'match', params],
  },
  jobs: {
    detail: (id: string) => ['jobs', id],
  },
  claims: {
    all: (userId: string) => ['claims', userId],
  },
} as const;
```

---

## 10. Animations & Polish Specifications

Use Reanimated 3 for all animations. Use `withSpring`, `withTiming`, `withSequence`, and `withDelay` as appropriate. Never use `Animated` from React Native core.

---

### 10.1 Route Transitions

Expo Router default transitions work well. Customize:
- Stack push: slide from right (default on iOS — keep)
- Modal: slide from bottom (default)
- Tab switch: fade (replace default slide — feels more premium)

---

### 10.2 Booking Flow Step Transitions

```typescript
// Horizontal slide between steps
const slideIn = useSharedValue(width);
const slideOut = useSharedValue(0);

// On step advance:
slideOut.value = withTiming(-width, { duration: 250, easing: Easing.out(Easing.cubic) });
slideIn.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
```

---

### 10.3 Provider Card Interactions

**On press (both compact and standard):**
```typescript
// Scale spring + shadow increase
const scale = useSharedValue(1);
const shadowOpacity = useSharedValue(0.08);

onPressIn: () => {
  scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
  shadowOpacity.value = withTiming(0.15, { duration: 150 });
}
onPressOut: () => {
  scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  shadowOpacity.value = withTiming(0.08, { duration: 200 });
}
```

**Trust score breakdown reveal (on press in browse context):**
```typescript
// Compact card → expanded trust score rings slide down
const expandHeight = useSharedValue(0);
// Reveal with spring, 300ms
```

---

### 10.4 Check-In Widget Card Transitions

```typescript
// Spring physics card transition — slight overshoot for tactile feel
const translateX = useSharedValue(width);

const advanceCard = () => {
  // Current card exits left
  runOnUI(() => {
    'worklet';
    translateX.value = withSpring(-width, {
      damping: 18,
      stiffness: 180,
    });
  })();

  // New card enters from right with overshoot
  nextTranslateX.value = width;
  nextTranslateX.value = withSpring(0, {
    damping: 15,
    stiffness: 150,
    overshootClamping: false,
  });

  // Haptic on advance
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};
```

---

### 10.5 Trust Score Ring Animation

```typescript
// SVG circular progress ring — fill from 0 to value on mount
// Each ring staggered by 100ms

const animatedProgress = useSharedValue(0);

useEffect(() => {
  animatedProgress.value = withDelay(
    ringIndex * 100,
    withTiming(targetScore / 5.0, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    })
  );
}, []);

// In SVG: strokeDashoffset = circumference * (1 - animatedProgress.value)
```

---

### 10.6 Payout Balance Shimmer

Applied to the available balance amount on the Earnings tab when balance > $0.

```typescript
// Shimmer: LinearGradient animated from left to right
const shimmerTranslate = useSharedValue(-200);

useEffect(() => {
  if (balance > 0) {
    shimmerTranslate.value = withRepeat(
      withTiming(200, { duration: 1800, easing: Easing.linear }),
      -1,  // infinite
      false
    );
  }
}, [balance]);
```

---

### 10.7 Success States (Booking + Check-In)

**Booking confirmation (Step 6):**
- Animated checkmark: draw SVG path with stroke dash animation, 600ms
- Confetti: use `react-native-confetti-cannon` — 200 particles, 2 second burst, centered
- Card slide-up: `withSpring` from bottom, slight overshoot

**Check-in submission:**
- Animated checkmark (same as above)
- Trust score update message fades in after checkmark completes (300ms delay)

---

### 10.8 Skeleton Loaders

Every list item and card must show a skeleton before data loads. Do not show:
- Blank screens
- Empty boxes
- Loading spinners (use only for inline button loading states)

```typescript
// components/ui/SkeletonProviderCard.tsx
// Matches exact dimensions and layout of ProviderCard standard variant
// Uses shimmer animation via linear gradient
```

Shimmer gradient: `['#E5E7EB', '#F9FAFB', '#E5E7EB']` from left to right, 1.5s loop.

---

## 11. Error Handling & Loading States

### Toast System

Use `react-native-toast-message` configured at app root level.

**Toast types:**
- Success: green left border, checkmark icon
- Error: red left border, X icon, always includes retry action for network errors
- Info: blue left border, info icon
- Warning: amber left border, warning icon

```typescript
// lib/toast.ts
export const toast = {
  success: (message: string) => Toast.show({ type: 'success', text1: message }),
  error: (message: string, onRetry?: () => void) => Toast.show({
    type: 'error',
    text1: 'Something went wrong',
    text2: message,
    props: { onRetry }
  }),
  info: (message: string) => Toast.show({ type: 'info', text1: message }),
};
```

### Network Error Pattern

```typescript
// All mutations follow this pattern:
const { mutate, isPending } = useMutation({
  mutationFn: createBooking,
  onSuccess: (data) => {
    router.push(`/booking/confirmation?id=${data.id}`);
  },
  onError: (error) => {
    toast.error(error.message, () => mutate(variables));
  },
});
```

### Loading States by Context

| Context | Loading Treatment |
|---|---|
| Initial screen load | Skeleton matching content layout |
| Inline button action | Button shows spinner, label changes to "Processing..." |
| List refresh (pull-to-refresh) | Native RefreshControl |
| Background data refresh | No UI — silent background update via React Query |
| Navigation transition | Screen transition animation (no separate loader) |
| Provider matching (booking step 3) | Custom branded animation (2-3s) |
| File upload | Progress bar below the upload zone |

### Offline Handling

```typescript
// Detect offline state with @react-native-community/netinfo
// Show persistent amber banner at top of screen when offline: "No internet connection"
// Queue write operations (check-in submissions, messages) for retry when back online
// Reads: serve from React Query cache, show "Last updated X minutes ago" label
```

---

## 12. Key UX Principles

These are non-negotiable design principles that Claude Code must honor throughout every screen and interaction.

---

**1. The booking flow must feel as smooth as Airbnb's.**

Every step should feel like forward progress. Never make the user feel like they're filling out a form — they should feel like they're getting closer to something good. Use progress indicators, positive reinforcement copy, and smooth transitions. If a step requires user effort (like the address entry or card addition), acknowledge the completion with a micro-celebration.

---

**2. Trust score is the hero of every provider card.**

HomeBase's entire product thesis rests on trust being legible and verifiable. The composite trust score must be the first thing a homeowner notices on a provider card — more prominent than the provider's photo. The 4-component breakdown (not just an overall number) is what makes HomeBase different from a 4.8-star rating. Make those rings beautiful, animated, and immediately understandable.

---

**3. The check-in widget is the most important interaction in the app.**

This generates the data that powers the trust score. Every design decision about the check-in must optimize for completion rate — it must feel like 15 seconds, not like a survey. Large tap targets, spring animations, haptic feedback, immediate visual progress. Never let it feel tedious. The homeowner should feel like they're doing something meaningful for their neighborhood, not filling out a form.

---

**4. Empty states must earn their keep.**

An empty state is an opportunity, not a failure. A new homeowner with no bookings should immediately know what to do. A new provider with no jobs should know exactly what action will change that. Every empty state must have a clear, specific CTA that moves the user forward. Generic "Nothing here yet" messages are not acceptable.

---

**5. Never show a blank screen.**

Skeleton loaders must exist for every screen that fetches data. This applies everywhere: provider lists, job queues, earnings, message threads. The skeleton must match the shape and dimensions of the content — not just three horizontal gray bars.

---

**6. Error handling must be graceful and recoverable.**

Network errors are common on mobile. Every error state must include a way to retry without losing context. Never leave the user stranded on an error screen with no path forward. Toasts should be specific ("Couldn't connect to server — tap to retry") not generic ("Something went wrong"). Validation errors should be inline, not full-page.

---

**7. The provider experience must feel professional.**

Providers are small business operators, not gig workers. The provider app should feel like a business tool — clean, reliable, information-dense where needed. The Today dashboard is their command center. Earnings must be transparent and clear down to the take-rate per job. Trust score must feel like a professional metric they're proud to build, not a rating they're being judged by.

---

**8. Mobile-native feel throughout.**

Bottom sheets instead of modals. Swipe gestures for common actions. Haptic feedback on confirmations and check-in advances. Pull-to-refresh on all lists. Tap targets minimum 44px (iOS HIG compliance). Safe area insets respected on all screens. Keyboard avoidance on all forms.

---

**9. Be specific with copy.**

Avoid generic placeholder copy. Every label, CTA, error message, empty state, and confirmation should be written with the specific context in mind. "Book [Service Type] with [Provider Name]" not "Book service". "Marcus just marked your lawn job complete" not "Your job status has changed". The copy is part of the premium experience.

---

**10. The trust score "why this score" AI explanation must be humble and specific.**

When Claude (Haiku) generates a 1-line explanation for a trust score component, it must be grounded in the actual check-in data (how many check-ins, what patterns), not confident-sounding generic copy. "Based on 47 check-ins, Marcus is marked on time or early 94% of the time" is good. "Marcus is a highly reliable professional who always arrives on time" is not — it sounds like ad copy, not data. This is a display-only concern for the frontend (show the string returned by the API), but the UI must allocate appropriate space and treat it as contextual annotation, not a marketing headline.

---

*End of FRONTEND_GUIDE.md*

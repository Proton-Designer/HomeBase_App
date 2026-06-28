import type { TextStyle } from 'react-native';

export const fonts = {
  editorial: 'Fraunces_700Bold',
  editorialSemibold: 'Fraunces_600SemiBold',
  editorialMedium: 'Fraunces_500Medium',
  editorialRegular: 'Fraunces_400Regular',
  display: 'PlusJakartaSans_700Bold',
  displaySemibold: 'PlusJakartaSans_600SemiBold',
  displayMedium: 'PlusJakartaSans_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const sizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

/**
 * Editorial Marketplace text styles. The keys prefixed `editorial-`/`display-`/`title-`/`body-`/`label`
 * are the canonical names used by the design system. The legacy keys (`displayLarge`, `headingLg`, etc.)
 * remain as aliases so existing screens compile — prefer the new keys for any new work.
 */
export const textStyles: Record<string, TextStyle> = {
  // ---- Canonical (per REVAMP_DESIGN_BRIEF type scale) ----
  'editorial-hero': {
    fontFamily: fonts.editorial,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
    letterSpacing: -0.72, // -1.5%
  },
  'editorial-title': {
    fontFamily: fonts.editorialSemibold,
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 36,
    letterSpacing: -0.3, // -1%
  },
  'display-md': {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  'title-lg': {
    fontFamily: fonts.displaySemibold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  'title-md': {
    fontFamily: fonts.displaySemibold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  'body-lg': {
    fontFamily: fonts.body,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
  },
  'body-md': {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  'body-sm': {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.6, // +0.5%
    textTransform: 'uppercase',
  },

  // ---- Legacy aliases (deprecated — kept so existing screens don't break) ----
  /** @deprecated use 'editorial-hero' */
  displayLarge: { fontFamily: fonts.editorial, fontSize: 48, fontWeight: '700', lineHeight: 52, letterSpacing: -0.72 },
  /** @deprecated use 'editorial-title' */
  displayMedium: { fontFamily: fonts.editorialSemibold, fontSize: 36, fontWeight: '600', lineHeight: 43, letterSpacing: -0.36 },
  /** @deprecated use 'editorial-title' */
  displaySmall: { fontFamily: fonts.editorialSemibold, fontSize: 30, fontWeight: '600', lineHeight: 36, letterSpacing: -0.3 },
  /** @deprecated use 'editorial-title' */
  headingLg: { fontFamily: fonts.editorialSemibold, fontSize: 30, fontWeight: '600', lineHeight: 36, letterSpacing: -0.3 },
  /** @deprecated use 'display-md' */
  headingMd: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  /** @deprecated use 'title-lg' */
  headingSm: { fontFamily: fonts.displaySemibold, fontSize: 18, fontWeight: '600', lineHeight: 25 },
  /** @deprecated use 'body-lg' */
  bodyLg: { fontFamily: fonts.body, fontSize: 17, fontWeight: '400', lineHeight: 26 },
  /** @deprecated use 'body-md' */
  bodyMd: { fontFamily: fonts.body, fontSize: 15, fontWeight: '400', lineHeight: 22 },
  /** @deprecated use 'body-sm' */
  bodySm: { fontFamily: fonts.body, fontSize: 13, fontWeight: '400', lineHeight: 19 },
  /** @deprecated use 'title-md' */
  labelLg: { fontFamily: fonts.bodyMedium, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  /** @deprecated use 'body-sm' */
  labelMd: { fontFamily: fonts.bodyMedium, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  /** @deprecated use 'label' */
  labelSm: { fontFamily: fonts.bodyMedium, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  /** @deprecated use 'body-sm' */
  caption: { fontFamily: fonts.body, fontSize: 12, fontWeight: '400', lineHeight: 17 },
};

/**
 * Tabular-numeral helper — apply to any `<Text>` rendering prices, scores, or counts so digits
 * line up regardless of weight (esp. with Fraunces' proportional default).
 *
 * Typed as `TextStyle` so it spreads cleanly into `style={{ ... }}` without callers casting.
 */
export const numericTabular: TextStyle = {
  fontVariant: ['tabular-nums'],
};

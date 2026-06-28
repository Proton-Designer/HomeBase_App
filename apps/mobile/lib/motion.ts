import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * IMPORTANT — two things are happening here at once:
 *
 * 1. Stable refs. Every `entering` value exported must be a STABLE reference
 *    across renders. Reanimated treats a new `entering` value passed to
 *    <Animated.View> as a brand-new entrance and re-fires the animation —
 *    which the user perceives as "modules glitching in and out" on state
 *    changes. We build all builders once at module scope.
 *
 * 2. Web disables entering. On web, Reanimated 4's `entering` builders
 *    produce a visible "snap" — the element first paints at its natural
 *    position, then the worklet runtime snaps it to the `from` state
 *    (translateY: 8, opacity: 0), then animates to the `to` state. The
 *    user sees their content land in place, then drop down 8px and slide
 *    back up roughly one second later. To avoid that, we expose `undefined`
 *    on web so <Animated.View entering={undefined}> renders without animation.
 *    Native (iOS / Android) keeps the full Reanimated entrance — it composes
 *    correctly on the native side.
 */

const IS_WEB = Platform.OS === 'web';

const NATIVE_ENTER = FadeInDown.duration(280)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ transform: [{ translateY: 8 }] });

/** Default entrance for any non-static element on mount. `undefined` on web. */
export const enter = (IS_WEB ? undefined : NATIVE_ENTER) as
  | typeof NATIVE_ENTER
  | undefined;

/** Pre-built native stagger entrance instances. Empty (undefined-yielding) on web. */
const NATIVE_STAGGERED = Array.from({ length: 32 }, (_, i) =>
  FadeInDown.delay(i * 60)
    .duration(280)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ transform: [{ translateY: 8 }] })
);
const LAST_NATIVE_STAGGER = NATIVE_STAGGERED[NATIVE_STAGGERED.length - 1];

/**
 * Staggered list-item entrance. On native: returns a stable, indexed builder.
 * On web: returns `undefined` so <Animated.View entering={...}> is a no-op.
 */
export const enterStaggered = (index: number) => {
  if (IS_WEB) return undefined;
  return NATIVE_STAGGERED[index] ?? LAST_NATIVE_STAGGER;
};

/** Booking-wizard step transition duration; outgoing slide+fade left, incoming slide+fade right. */
export const STEP_TRANSITION_DURATION = 250;

/**
 * Pure-opacity cross-fade pair for swapping text content in place (e.g. the
 * sign-up homeowner⇄provider header). No translateY — a vertical slide here
 * reads as a "shake" when the surrounding layout also reflows. Stable refs,
 * `undefined` on web (sidesteps Reanimated's web entering "snap" artifact).
 * Out is quicker than in so the incoming copy leads the dissolve.
 */
const NATIVE_CROSSFADE_IN = FadeIn.duration(220).easing(Easing.out(Easing.cubic));
const NATIVE_CROSSFADE_OUT = FadeOut.duration(140).easing(Easing.in(Easing.cubic));
export const crossFadeIn = (IS_WEB ? undefined : NATIVE_CROSSFADE_IN) as
  | typeof NATIVE_CROSSFADE_IN
  | undefined;
export const crossFadeOut = (IS_WEB ? undefined : NATIVE_CROSSFADE_OUT) as
  | typeof NATIVE_CROSSFADE_OUT
  | undefined;

/**
 * Layout transition for elements that need to glide to a new position when a
 * sibling's height changes (e.g. the form sliding up/down as the sign-up header
 * grows/shrinks between roles). Without it the reflow snaps. `undefined` on web.
 */
const NATIVE_SMOOTH_LAYOUT = LinearTransition.duration(240).easing(Easing.out(Easing.cubic));
export const smoothLayout = (IS_WEB ? undefined : NATIVE_SMOOTH_LAYOUT) as
  | typeof NATIVE_SMOOTH_LAYOUT
  | undefined;

/**
 * Press preset — scale to 0.98 + 6% opacity dim on pressIn, spring back on pressOut.
 * Returns the `animatedStyle` to spread onto an `Animated.View`/`AnimatedPressable` and
 * `onPressIn`/`onPressOut` handlers to wire to the pressable.
 */
export function usePress() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.98, { duration: 110 });
    opacity.value = withTiming(0.94, { duration: 110 });
  }, [opacity, scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 160 });
  }, [opacity, scale]);

  return { animatedStyle, onPressIn, onPressOut };
}

/* Hero-load choreography — module-scope stable builders.
 * Timings follow the editorial brief: logo 0ms, headline 120ms, body 220ms,
 * cta 380ms, stats 500ms. Each slot is built once so Reanimated never sees a
 * new reference across re-renders (avoids the "re-fires on state change" bug). */
const NATIVE_HERO_LOGO = FadeIn.duration(220).easing(Easing.out(Easing.cubic));
const NATIVE_HERO_HEADLINE = FadeInDown.delay(120)
  .duration(380)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ transform: [{ translateY: 12 }] });
const NATIVE_HERO_BODY = FadeInDown.delay(220)
  .duration(360)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ transform: [{ translateY: 10 }] });
const NATIVE_HERO_CTA = FadeInDown.delay(380)
  .duration(340)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ transform: [{ translateY: 8 }] });
const NATIVE_HERO_STATS = FadeInDown.delay(500)
  .duration(320)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ transform: [{ translateY: 6 }] });

const NATIVE_HERO_LOAD = Object.freeze({
  logo: NATIVE_HERO_LOGO,
  headline: NATIVE_HERO_HEADLINE,
  body: NATIVE_HERO_BODY,
  cta: NATIVE_HERO_CTA,
  stats: NATIVE_HERO_STATS,
});

const WEB_HERO_LOAD = Object.freeze({
  logo: undefined,
  headline: undefined,
  body: undefined,
  cta: undefined,
  stats: undefined,
}) as unknown as typeof NATIVE_HERO_LOAD;

/**
 * Hero-load choreography. Stable refs across renders. On web, every member is
 * `undefined` so `<Animated.View entering={choreo.headline}>` renders without
 * animation — sidesteps Reanimated's web "snap to initial values then animate"
 * compositing artifact.
 */
export function useHeroLoad() {
  return IS_WEB ? WEB_HERO_LOAD : NATIVE_HERO_LOAD;
}

/**
 * Spring-physics celebration — drives a `scale` from 0 → 1 and `opacity` from 0 → 1.
 * Pass in two pre-created `useSharedValue` instances; this only fires the `withSpring` animations.
 */
export function celebrate(
  scale: { value: number },
  opacity: { value: number },
) {
  scale.value = withSpring(1, { damping: 9, stiffness: 110 });
  opacity.value = withSpring(1, { damping: 16, stiffness: 130 });
}

/**
 * Convenience hook for memoized arbitrary entering builders. If a screen needs a
 * one-off entering animation, do `useStableEnter(() => FadeIn.duration(...))`.
 */
export function useStableEnter<T>(factory: () => T): T {
  return useMemo(factory, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Wrap any inline Reanimated builder at a screen call site so it only runs on
 * native: `entering={onlyNative(FadeIn.duration(220))}`. On web it returns
 * `undefined` so the entering animation is a no-op (sidesteps the "snap to
 * initial values then animate" web compositing artifact).
 */
export function onlyNative<T>(builder: T): T | undefined {
  return IS_WEB ? undefined : builder;
}

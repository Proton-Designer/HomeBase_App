import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../tokens';

interface AppSplashScreenProps {
  /** When true, the splash fades itself out, then calls `onExitComplete`. */
  exiting?: boolean;
  onExitComplete?: () => void;
}

const LOADER_WIDTH = 128;
const SWEEP_WIDTH = 56;

/**
 * Branded loading screen shown while the app bootstraps the auth session.
 * Hands off seamlessly from the native splash (same `#2563EB` field), then
 * fades itself out over the mounted app when `exiting` is set.
 *
 * All motion is shared-value driven (not `entering` builders) so it composes
 * correctly on web as well as native.
 */
export function AppSplashScreen({ exiting = false, onExitComplete }: AppSplashScreenProps) {
  const rootOpacity = useSharedValue(1);

  // Staggered entrance — each value runs 0 -> 1.
  const markIntro = useSharedValue(0);
  const wordIntro = useSharedValue(0);
  const tagIntro = useSharedValue(0);
  const loaderIntro = useSharedValue(0);

  // Idle loops — keep the screen alive if bootstrap runs long.
  const breath = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    markIntro.value = withDelay(80, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    wordIntro.value = withDelay(360, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
    tagIntro.value = withDelay(600, withTiming(1, { duration: 440, easing: Easing.out(Easing.cubic) }));
    loaderIntro.value = withDelay(820, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));

    breath.value = withDelay(
      980,
      withRepeat(withTiming(1, { duration: 1750, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    sweep.value = withRepeat(
      withTiming(1, { duration: 1320, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [markIntro, wordIntro, tagIntro, loaderIntro, breath, sweep]);

  useEffect(() => {
    if (!exiting) return;
    rootOpacity.value = withTiming(
      0,
      { duration: 380, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished && onExitComplete) runOnJS(onExitComplete)();
      },
    );
  }, [exiting, onExitComplete, rootOpacity]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));

  const markStyle = useAnimatedStyle(() => {
    const scale = (0.82 + 0.18 * markIntro.value) * (1 + 0.035 * breath.value * markIntro.value);
    return { opacity: markIntro.value, transform: [{ scale }] };
  });

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordIntro.value,
    transform: [{ translateY: (1 - wordIntro.value) * 16 }],
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagIntro.value,
    transform: [{ translateY: (1 - tagIntro.value) * 10 }],
  }));

  const loaderStyle = useAnimatedStyle(() => ({ opacity: loaderIntro.value }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -SWEEP_WIDTH + sweep.value * (LOADER_WIDTH + SWEEP_WIDTH) }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>
      <LinearGradient
        colors={['#FFFFFF', colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <View style={styles.center}>
        <Animated.View style={[styles.markWrap, markStyle]}>
          <Image
            source={require('../assets/logo-icon.png')}
            style={styles.mark}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="MyHomebase"
          />
        </Animated.View>

        <Animated.Text style={[styles.wordmark, wordStyle]}>
          MyHomebase<Text style={styles.wordmarkDot}>.</Text>
        </Animated.Text>

        <Animated.Text style={[styles.tagline, tagStyle]}>curated home services</Animated.Text>
      </View>

      <Animated.View style={[styles.loaderArea, loaderStyle]}>
        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.sweep, sweepStyle]}>
            <LinearGradient
              colors={['rgba(37,99,235,0)', colors.primary[500], 'rgba(37,99,235,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -150,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: colors.primary[200],
    opacity: 0.18,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -200,
    left: -150,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: colors.primary[300],
    opacity: 0.10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 52,
  },
  markWrap: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 132,
    height: 132,
  },
  wordmark: {
    fontFamily: fonts.editorial,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    color: colors.textPrimary,
    marginTop: 32,
  },
  wordmarkDot: {
    color: colors.primary[600],
  },
  tagline: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 12.5,
    lineHeight: 18,
    letterSpacing: 0.4,
    color: colors.textSecondary,
    marginTop: 12,
  },
  loaderArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 104,
    alignItems: 'center',
  },
  loaderTrack: {
    width: LOADER_WIDTH,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(37,99,235,0.10)',
    overflow: 'hidden',
  },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SWEEP_WIDTH,
  },
});

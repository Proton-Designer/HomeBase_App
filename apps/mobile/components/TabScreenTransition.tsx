import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

/**
 * Fades a tab screen's CONTENT in/out as it gains/loses focus.
 *
 * Why content-level and not the navigator's `animation` option: enabling the
 * bottom-tab `animation` makes react-native-screens keep several screens
 * presented and toggle each one's native `activityState` on every switch. On
 * the new architecture that bookkeeping desyncs after many transitions and
 * leaves a screen detached-but-presented → blank white. This decouples the
 * motion entirely: the navigator does a plain, instant, always-reliable swap
 * and we only animate `opacity` on already-attached content.
 *
 * Opacity is driven DECLARATIVELY by `isFocused` (not an imperative reset), so:
 *  - it can never flicker (a focused screen always animates toward 1), and
 *  - it can never get stuck blank — `withTiming` always resolves to the focused
 *    target, no matter how many times you switch.
 *
 * Skipped on web (sidesteps Reanimated's web entering "snap" artifact).
 */
const IS_WEB = Platform.OS === 'web';
const FILL = { flex: 1 } as const;
const FADE = { duration: 200, easing: Easing.out(Easing.cubic) };

function TabScreenTransition({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.value = isFocused ? 1 : 0;
  }, [isFocused, focus]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focus.value, FADE),
  }));

  if (IS_WEB) return <View style={FILL}>{children}</View>;
  return <Animated.View style={[FILL, animatedStyle]}>{children}</Animated.View>;
}

/** Stable `screenLayout` callback — wraps every tab screen in the focus transition. */
export const tabScreenLayout = ({ children }: { children: React.ReactNode }) => (
  <TabScreenTransition>{children}</TabScreenTransition>
);

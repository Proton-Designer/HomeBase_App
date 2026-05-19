import React from 'react';
import { type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../tokens';

export interface SkeletonProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width,
  height,
  borderRadius = 8,
  animated = true,
  style,
}: SkeletonProps) {
  const phase = useSharedValue(0);

  React.useEffect(() => {
    if (animated) {
      phase.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
    }
  }, [animated, phase]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.5, 1], [0.6, 1, 0.6]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.divider,
          overflow: 'hidden',
        },
        animated ? shimmerStyle : null,
        style,
      ]}
    />
  );
}

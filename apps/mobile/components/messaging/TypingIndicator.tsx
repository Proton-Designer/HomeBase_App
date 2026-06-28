import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../tokens';

interface TypingIndicatorProps {
  avatarUrl: string | null;
  name: string;
}

function AnimatedDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(delay > 0 ? 0.4 : 0.4, { duration: delay }),
        withTiming(1, { duration: 300 }),
        withTiming(0.4, { duration: 300 }),
      ),
      -1,
      false,
    );
  }, [delay, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.textTertiary,
        },
        animStyle,
      ]}
    />
  );
}

function SmallAvatar({ uri, name }: { uri: string | null; name: string }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: 28, height: 28, borderRadius: 14 }}
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.Text
        style={{
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 12,
          color: colors.primary[700],
        }}
      >
        {initial}
      </Animated.Text>
    </View>
  );
}

export function TypingIndicator({ avatarUrl, name }: TypingIndicatorProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 4,
      }}
      accessibilityLabel="Other person is typing"
      accessibilityLiveRegion="polite"
    >
      <SmallAvatar uri={avatarUrl} name={name} />
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          minWidth: 52,
        }}
      >
        <AnimatedDot delay={0} />
        <AnimatedDot delay={200} />
        <AnimatedDot delay={400} />
      </View>
    </Animated.View>
  );
}

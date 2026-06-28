import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../../tokens';

interface NewMessagePillProps {
  onPress: () => void;
  count?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NewMessagePill({ onPress, count }: NewMessagePillProps) {
  const label = count != null && count > 0 ? `${count} new message${count > 1 ? 's' : ''} ↓` : 'New message ↓';

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={{
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
        pointerEvents: 'box-none',
      }}
    >
      <AnimatedPressable
        onPress={onPress}
        accessibilityLabel={label}
        accessibilityRole="button"
        style={[
          {
            backgroundColor: colors.primary[600],
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          },
          Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        ]}
      >
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: colors.textInverse,
          }}
        >
          {label}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

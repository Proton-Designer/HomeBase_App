import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  View,
  type PressableProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, shadows } from '../../tokens';
import { usePress } from '../../lib/motion';

type Variant = 'default' | 'pressable' | 'outlined';
type Tone = 'surface' | 'tinted';

export interface CardProps {
  variant?: Variant;
  tone?: Tone;
  tintColor?: string;
  onPress?: PressableProps['onPress'];
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const baseStyle: ViewStyle = {
  borderRadius: 14,
  padding: 16,
};

// Stable web-only style refs. We deliberately do NOT include a CSS
// `transitionDuration` here — combining a CSS transition with Reanimated's
// JS-driven inline-style updates causes constant micro-motion ("glitching")
// because every shared-value tick fires a CSS transition.
const IS_WEB = Platform.OS === 'web';
const WEB_PRESSABLE_BASE = IS_WEB ? ({ cursor: 'pointer' } as object) : null;
const WEB_FOCUS_OUTLINE = {
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineColor: colors.primary[400],
  outlineOffset: 2,
} as unknown as ViewStyle;

function resolveBg(tone: Tone, tintColor?: string) {
  if (tone === 'tinted' && tintColor) return tintColor;
  return colors.surface;
}

export function Card({
  variant = 'default',
  tone = 'surface',
  tintColor,
  onPress,
  style,
  children,
  testID,
}: CardProps) {
  // Reanimated press is always created (rules of hooks) but its animatedStyle
  // is ONLY applied on native — on web, JS-driven inline transforms race with
  // CSS transitions and produce constant micro-motion ("glitching").
  const press = usePress();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const bg = resolveBg(tone, tintColor);
  const baseShadow = tone === 'tinted' ? shadows.sm : shadows.md;

  if (variant === 'pressable' && onPress) {
    const webHover = IS_WEB
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
          onFocus: () => setFocused(true),
          onBlur: () => setFocused(false),
        } as object)
      : {};
    return (
      <AnimatedPressable
        testID={testID}
        onPress={onPress}
        {...webHover}
        onPressIn={IS_WEB ? undefined : press.onPressIn}
        onPressOut={IS_WEB ? undefined : press.onPressOut}
        style={[
          baseStyle,
          { backgroundColor: bg },
          IS_WEB && hovered ? shadows.lg : baseShadow,
          WEB_PRESSABLE_BASE,
          IS_WEB && focused ? WEB_FOCUS_OUTLINE : null,
          IS_WEB ? null : press.animatedStyle,
          style,
        ]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  if (variant === 'outlined') {
    return (
      <View
        style={[
          baseStyle,
          {
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: bg,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return <View style={[baseStyle, { backgroundColor: bg }, baseShadow, style]}>{children}</View>;
}

export type _CardViewProps = ViewProps;

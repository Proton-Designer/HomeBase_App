import React, { useState } from 'react';
import { Platform, Pressable, Text, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, textStyles } from '../../tokens';
import { usePress } from '../../lib/motion';

export interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE = {
  sm: { height: 28, paddingH: 12, fontSize: 13 },
  md: { height: 36, paddingH: 16, fontSize: 14 },
};

export function Chip({
  label,
  selected = false,
  disabled = false,
  size = 'md',
  onPress,
  leftIcon,
  style,
}: ChipProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  const [hovered, setHovered] = useState(false);
  const s = SIZE[size];

  const bg = selected ? colors.primary[600] : colors.surface;
  const fg = selected ? colors.textInverse : colors.textPrimary;
  const borderColor = selected ? colors.primary[600] : colors.border;

  const webHover =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...webHover}
      style={[
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          borderRadius: 999,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        Platform.OS === 'web' && !disabled
          ? ({ cursor: 'pointer', transitionDuration: '120ms' } as object)
          : null,
        Platform.OS === 'web' && hovered && !selected
          ? { backgroundColor: colors.primary[50] }
          : null,
        animatedStyle,
        style,
      ]}
    >
      {leftIcon}
      <Text
        style={{
          ...textStyles['title-md'],
          fontSize: s.fontSize,
          color: fg,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, shadows, textStyles } from '../../tokens';
import { usePress } from '../../lib/motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeStyle: Record<Size, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: 36, paddingH: 14, fontSize: 14 },
  md: { height: 48, paddingH: 18, fontSize: 16 },
  lg: { height: 56, paddingH: 22, fontSize: 17 },
};

const variantStyle: Record<
  Variant,
  { bg: string; border?: string; text: string; pressBg?: string }
> = {
  primary: { bg: colors.primary[600], text: colors.textInverse, pressBg: colors.primary[700] },
  secondary: { bg: colors.accent[500], text: colors.textInverse, pressBg: colors.accent[600] },
  ghost: { bg: 'transparent', text: colors.primary[600] },
  destructive: { bg: colors.error, text: colors.textInverse },
  outline: {
    bg: 'transparent',
    border: colors.primary[600],
    text: colors.primary[600],
  },
};

const IS_WEB = Platform.OS === 'web';
const WEB_PRESSABLE_BASE = IS_WEB ? ({ cursor: 'pointer' } as object) : null;
const WEB_FOCUS_OUTLINE = {
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineColor: colors.primary[400],
  outlineOffset: 2,
} as unknown as ViewStyle;

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconOnly = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  // Reanimated press is always created (rules of hooks) but its animatedStyle
  // is ONLY applied on native — on web, JS-driven inline transforms race with
  // CSS transitions and produce constant micro-motion ("glitching").
  const press = usePress();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const v = variantStyle[variant];
  const s = sizeStyle[size];
  const isDisabled = disabled || loading;

  const webHover =
    IS_WEB
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
          onFocus: () => setFocused(true),
          onBlur: () => setFocused(false),
        } as object)
      : {};

  const iconOnlyDimensions: ViewStyle | null = iconOnly
    ? { width: s.height, paddingHorizontal: 0 }
    : null;

  return (
    <AnimatedPressable
      {...rest}
      {...webHover}
      disabled={isDisabled}
      accessibilityLabel={iconOnly ? label : undefined}
      onPressIn={(e) => {
        if (!IS_WEB) press.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!IS_WEB) press.onPressOut();
        onPressOut?.(e);
      }}
      style={[
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border ? 1.5 : 0,
          borderRadius: 10,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.55 : 1,
        },
        iconOnlyDimensions,
        IS_WEB && !isDisabled ? WEB_PRESSABLE_BASE : null,
        IS_WEB && hovered && !isDisabled ? shadows.lg : null,
        IS_WEB && hovered && !isDisabled && v.pressBg ? { backgroundColor: v.pressBg } : null,
        IS_WEB && focused ? WEB_FOCUS_OUTLINE : null,
        IS_WEB ? null : press.animatedStyle,
        style,
      ]}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: iconOnly ? 0 : 8,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={v.text} />
        ) : (
          <>
            {leftIcon}
            {!iconOnly ? (
              <Text
                style={{
                  ...textStyles['title-md'],
                  color: v.text,
                  fontSize: s.fontSize,
                }}
              >
                {label}
              </Text>
            ) : null}
            {rightIcon}
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}

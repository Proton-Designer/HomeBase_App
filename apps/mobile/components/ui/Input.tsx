import React, { useState } from 'react';
import {
  TextInput,
  Text,
  View,
  Pressable,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, textStyles } from '../../tokens';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  variant?: 'outline' | 'filled';
}

export function Input({
  label,
  helperText,
  errorMessage,
  leftIcon,
  rightIcon,
  secureTextEntry,
  variant = 'outline',
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [reveal, setReveal] = useState(false);
  const focusValue = useSharedValue(0);
  const errorValue = useSharedValue(0);

  React.useEffect(() => {
    errorValue.value = withTiming(errorMessage ? 1 : 0, { duration: 200 });
  }, [errorMessage, errorValue]);

  const animBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      errorValue.value,
      [0, 1],
      [
        interpolateColor(focusValue.value, [0, 1], [colors.border, colors.primary[600]]),
        colors.error,
      ]
    ) as unknown as string,
  }));

  const isPassword = !!secureTextEntry;

  const textInputStyle = React.useMemo(
    () => [
      {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        color: colors.textPrimary,
        paddingVertical: 12,
      },
      inputStyle,
    ],
    [inputStyle]
  );

  return (
    <View style={containerStyle}>
      {label ? (
        <Text
          style={{
            ...textStyles.label,
            color: colors.textSecondary,
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            backgroundColor: variant === 'filled' ? colors.divider : colors.surface,
            borderRadius: 8,
            borderWidth: 1.5,
            minHeight: 48,
          },
          animBorder,
        ]}
      >
        {leftIcon ? <View style={{ marginRight: 10 }}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          secureTextEntry={isPassword && !reveal}
          placeholderTextColor={colors.textTertiary}
          style={textInputStyle}
          onFocus={(e) => {
            focusValue.value = withTiming(1, { duration: 200 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focusValue.value = withTiming(0, { duration: 200 });
            onBlur?.(e);
          }}
        />
        {isPassword ? (
          <Pressable onPress={() => setReveal((v) => !v)} hitSlop={12}>
            {reveal ? (
              <EyeOff size={18} color={colors.textSecondary} />
            ) : (
              <Eye size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        ) : rightIcon ? (
          <View style={{ marginLeft: 10 }}>{rightIcon}</View>
        ) : null}
      </Animated.View>
      {errorMessage ? (
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: colors.error,
            marginTop: 6,
          }}
        >
          {errorMessage}
        </Text>
      ) : helperText ? (
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 6,
          }}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

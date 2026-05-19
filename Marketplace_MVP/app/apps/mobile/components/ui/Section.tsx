import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../tokens';
import { useBreakpoint } from '../../lib/useBreakpoint';

type Tone = 'cream' | 'surface' | 'feature';

export interface SectionProps {
  tone?: Tone;
  tight?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  children?: React.ReactNode;
}

const VERTICAL_PADDING = {
  mobile: 32,
  tablet: 48,
  desktop: 64,
};

const HORIZONTAL_GUTTER = {
  mobile: 20,
  tablet: 24,
  desktop: 32,
};

export function Section({
  tone = 'cream',
  tight = false,
  style,
  contentStyle,
  children,
}: SectionProps) {
  const bp = useBreakpoint();
  const py = tight ? VERTICAL_PADDING[bp] / 2 : VERTICAL_PADDING[bp];
  const px = HORIZONTAL_GUTTER[bp];

  const inner = (
    <View
      style={[
        {
          width: '100%',
          maxWidth: 1200,
          alignSelf: 'center',
          paddingHorizontal: px,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (tone === 'feature') {
    return (
      <LinearGradient
        colors={[colors.primary[700], colors.primary[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[{ width: '100%', paddingVertical: py }, style]}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        {
          width: '100%',
          paddingVertical: py,
          backgroundColor: tone === 'surface' ? colors.surface : colors.background,
        },
        style,
      ]}
    >
      {inner}
    </View>
  );
}

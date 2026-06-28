import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { colors, textStyles } from '../../tokens';

export interface EyebrowProps {
  children: React.ReactNode;
  tone?: 'default' | 'inverse' | 'accent';
  style?: TextStyle;
}

export function Eyebrow({ children, tone = 'default', style }: EyebrowProps) {
  const color =
    tone === 'inverse'
      ? colors.textInverse
      : tone === 'accent'
        ? colors.accent[600]
        : colors.textSecondary;
  return <Text style={[textStyles.label, { color }, style]}>{children}</Text>;
}

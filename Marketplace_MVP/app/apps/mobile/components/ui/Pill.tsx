import React from 'react';
import { Platform, Pressable, Text, View, type ViewStyle } from 'react-native';
import { colors, textStyles } from '../../tokens';

const IS_WEB = Platform.OS === 'web';

export type PillTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'info' | 'error';

export interface PillProps {
  label: string;
  tone?: PillTone;
  leftIcon?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.divider, fg: colors.textPrimary },
  primary: { bg: colors.primary[50], fg: colors.primary[700] },
  accent: { bg: colors.accent[100], fg: colors.accent[700] },
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning },
  info: { bg: colors.infoLight, fg: colors.info },
  error: { bg: colors.errorLight, fg: colors.error },
};

export function Pill({ label, tone = 'neutral', leftIcon, onPress, style }: PillProps) {
  const t = TONES[tone];
  const pillStyle = [
    {
      height: 28,
      paddingHorizontal: 12,
      borderRadius: 999,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: t.bg,
      alignSelf: 'flex-start' as const,
    },
    IS_WEB && onPress ? ({ cursor: 'pointer' } as object) : null,
    style,
  ];

  const content = (
    <>
      {leftIcon}
      <Text
        style={{
          ...textStyles['body-sm'],
          color: t.fg,
          fontFamily: 'Inter_600SemiBold',
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={pillStyle}>
        {content}
      </Pressable>
    );
  }

  return <View style={pillStyle}>{content}</View>;
}

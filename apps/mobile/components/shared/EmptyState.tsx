import React from 'react';
import { Platform, Text, View, type ViewStyle } from 'react-native';
import { Button } from '../ui/Button';
import { colors, textStyles } from '../../tokens';

const IS_WEB = Platform.OS === 'web';

export interface EmptyStateProps {
  illustration?: React.ReactNode;
  heading: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  illustration,
  heading,
  body,
  ctaLabel,
  onCta,
  style,
}: EmptyStateProps) {
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingVertical: 56,
          gap: 14,
        },
        style,
      ]}
    >
      <View style={{ alignItems: 'center', maxWidth: 400, width: '100%', gap: 14 }}>
      {illustration ? <View style={{ marginBottom: 8 }}>{illustration}</View> : null}
      <Text
        style={{
          ...textStyles['title-lg'],
          fontSize: IS_WEB ? (textStyles['title-lg'].fontSize ?? 20) * 1.1 : undefined,
          color: colors.textPrimary,
          textAlign: 'center',
        }}
      >
        {heading}
      </Text>
      <Text
        style={{
          ...textStyles['body-md'],
          fontSize: IS_WEB ? (textStyles['body-md'].fontSize ?? 16) * 1.1 : undefined,
          color: colors.textSecondary,
          textAlign: 'center',
          maxWidth: 360,
        }}
      >
        {body}
      </Text>
      {ctaLabel && onCta ? (
        <View style={{ marginTop: 8 }}>
          <Button label={ctaLabel} onPress={onCta} variant="primary" />
        </View>
      ) : null}
      </View>
    </View>
  );
}

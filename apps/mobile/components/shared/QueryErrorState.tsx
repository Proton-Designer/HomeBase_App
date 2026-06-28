import React from 'react';
import { Platform, Text, View, type ViewStyle } from 'react-native';
import { Button } from '../ui/Button';
import { colors, textStyles } from '../../tokens';

const IS_WEB = Platform.OS === 'web';

export interface QueryErrorStateProps {
  /** Heading shown above the message. */
  heading?: string;
  /** Explanatory body copy. */
  body?: string;
  /** Retry handler — typically a React Query `refetch`. Hidden when omitted. */
  onRetry?: () => void;
  style?: ViewStyle;
}

/**
 * Standard fallback for a failed data fetch. Pair with a query's `isError`
 * so a network/server failure shows a retryable message instead of an
 * infinite spinner or blank screen.
 */
export function QueryErrorState({
  heading = "We couldn't load this",
  body = 'Something went wrong reaching MyHomebase. Check your connection and try again.',
  onRetry,
  style,
}: QueryErrorStateProps) {
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
        {onRetry ? (
          <View style={{ marginTop: 8 }}>
            <Button label="Try again" onPress={onRetry} variant="primary" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

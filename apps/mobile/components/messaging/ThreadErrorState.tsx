import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, textStyles } from '../../tokens';

/** Shown when the thread message query fails (e.g. 401/403) so the screen doesn't
 *  render a silent empty thread with no way to recover. */
export function ThreadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text
        style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}
      >
        Couldn't load messages. Check your connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={{
          marginTop: 16,
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: colors.primary[600],
          borderRadius: 8,
        }}
      >
        <Text style={{ ...textStyles['body-md'], color: colors.textInverse }}>Retry</Text>
      </Pressable>
    </View>
  );
}

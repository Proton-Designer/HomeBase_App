import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '../../tokens';

export function UnreadDivider() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        paddingHorizontal: 20,
      }}
      accessibilityRole="header"
      accessibilityLabel="Unread messages start here"
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.primary[200] }} />
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          color: colors.primary[600],
          paddingHorizontal: 10,
        }}
      >
        New messages
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.primary[200] }} />
    </View>
  );
}

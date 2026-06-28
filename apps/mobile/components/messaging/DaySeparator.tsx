import React from 'react';
import { Text, View } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { colors } from '../../tokens';

interface DaySeparatorProps {
  date: Date;
}

function formatSeparatorLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) return format(date, 'EEE MMM d');
  return format(date, 'MMM d, yyyy');
}

export function DaySeparator({ date }: DaySeparatorProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        paddingHorizontal: 20,
      }}
      accessibilityRole="none"
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 11,
          color: colors.textTertiary,
          paddingHorizontal: 10,
        }}
      >
        {formatSeparatorLabel(date)}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
    </View>
  );
}

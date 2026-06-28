import React from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { CalendarX, X } from 'lucide-react-native';
import { colors, fonts } from '../../tokens';
import type { TextStyle } from 'react-native';
import type { BlockedTime } from '../../lib/api/providers';

function isAllDay(block: BlockedTime): boolean {
  const start = parseISO(block.start_at);
  const end = parseISO(block.end_at);
  return start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() >= 59;
}

function formatTimeRange(block: BlockedTime): string {
  if (isAllDay(block)) return 'All day';
  const start = parseISO(block.start_at);
  const end = parseISO(block.end_at);
  return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
}

export interface BlockedTimeChipProps {
  block: BlockedTime;
  onDelete: (block: BlockedTime) => void;
  /** When true, renders with a light-red tint to signal conflict with booked jobs */
  isAllDayConflict?: boolean;
}

export function BlockedTimeChip({ block, onDelete, isAllDayConflict }: BlockedTimeChipProps) {
  const timeRange = formatTimeRange(block);
  const label = block.reason || 'Blocked';

  function handleDelete() {
    Alert.alert(
      'Remove block',
      block.reason ? `Remove "${block.reason}"?` : 'Remove this blocked time?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDelete(block),
        },
      ],
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isAllDayConflict ? colors.errorLight : colors.divider,
        borderRadius: 8,
        marginBottom: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderLeftWidth: 3,
        borderLeftColor: isAllDayConflict ? colors.error : colors.borderStrong,
        gap: 8,
      }}
    >
      <CalendarX size={14} color={colors.textSecondary} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 12,
            fontWeight: '500',
            color: isAllDayConflict ? colors.error : colors.textSecondary,
          } as TextStyle}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            color: isAllDayConflict ? colors.error : colors.textTertiary,
          } as TextStyle}
          numberOfLines={1}
        >
          · {timeRange}
        </Text>
      </View>
      <Pressable
        onPress={handleDelete}
        hitSlop={10}
        accessibilityLabel={`Remove block: ${label}`}
        style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
      >
        <X size={16} color={isAllDayConflict ? colors.error : colors.textTertiary} />
      </Pressable>
    </View>
  );
}

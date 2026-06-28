import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { format, isAfter, parseISO, startOfDay } from 'date-fns';
import { CalendarX, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Card } from '../ui/Card';
import { BlockedTimeChip } from './BlockedTimeChip';
import { colors, fonts, textStyles } from '../../tokens';
import type { TextStyle } from 'react-native';
import type { BlockedTime } from '../../lib/api/providers';

export interface BlockedTimesPanelProps {
  blockedTimes: BlockedTime[];
  onBlockPress: (date: Date) => void;
  onDeleteBlock: (block: BlockedTime) => void;
}

export function BlockedTimesPanel({ blockedTimes, onBlockPress, onDeleteBlock }: BlockedTimesPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const heightAnim = useSharedValue(1);

  const contentStyle = useAnimatedStyle(() => ({
    maxHeight: withTiming(heightAnim.value * 600, { duration: 260 }),
    opacity: withTiming(heightAnim.value, { duration: 200 }),
    overflow: 'hidden',
  }));

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    heightAnim.value = next ? 1 : 0;
  }

  const today = startOfDay(new Date());
  const upcoming = blockedTimes
    .filter((b) => isAfter(parseISO(b.end_at), today))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));

  return (
    <Card variant="outlined" style={{ marginHorizontal: 16, marginBottom: 16 }}>
      {/* Header */}
      <Pressable
        onPress={toggleExpand}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center' }}
        accessibilityLabel={expanded ? 'Collapse blocked times' : 'Expand blocked times'}
        accessibilityRole="button"
      >
        <CalendarX size={14} color={colors.textTertiary} style={{ marginRight: 6 }} />
        <Text style={{ ...textStyles['label'], color: colors.textTertiary, flex: 1 }}>
          Blocked times
        </Text>
        <Pressable
          onPress={() => onBlockPress(new Date())}
          hitSlop={8}
          accessibilityLabel="Add blocked time"
          style={[
            {
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: colors.primary[50],
              borderRadius: 999,
              marginRight: 8,
            },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <Text
            style={{
              fontFamily: fonts.bodySemibold,
              fontSize: 11,
              fontWeight: '600',
              color: colors.primary[700],
            } as TextStyle}
          >
            + Block time
          </Text>
        </Pressable>
        {expanded ? (
          <ChevronUp size={16} color={colors.textTertiary} />
        ) : (
          <ChevronDown size={16} color={colors.textTertiary} />
        )}
      </Pressable>

      {/* Content */}
      <Animated.View style={contentStyle}>
        <View style={{ marginTop: 12, gap: 0 }}>
          {upcoming.length === 0 ? (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                fontStyle: 'italic',
                color: colors.textTertiary,
              } as TextStyle}
            >
              No upcoming blocked times.
            </Text>
          ) : (
            upcoming.map((block) => {
              const dateLabel = format(parseISO(block.start_at), 'EEE, MMM d');
              return (
                <View key={block.id}>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 11,
                      fontWeight: '600',
                      color: colors.textTertiary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      marginBottom: 4,
                      marginTop: 6,
                    } as TextStyle}
                  >
                    {dateLabel}
                  </Text>
                  <BlockedTimeChip
                    block={block}
                    onDelete={onDeleteBlock}
                  />
                </View>
              );
            })
          )}
        </View>
      </Animated.View>
    </Card>
  );
}

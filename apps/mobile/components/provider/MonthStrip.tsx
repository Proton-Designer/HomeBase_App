import React, { useEffect, useMemo, useRef } from 'react';
import { FlatList, Platform, Pressable, Text, View } from 'react-native';
import { addDays, differenceInDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, fonts, numericTabular } from '../../tokens';
import type { TextStyle } from 'react-native';
import type { Job } from '../../lib/types';
import type { BlockedTime } from '../../lib/api/providers';

const CELL_WIDTH = 44;
const CELL_HEIGHT = 60;
const STRIP_DAYS = 84; // ±42 days from today (covers ~3 months of navigation)

// Stable reference: computed once per session (spec §1.11 accepts no midnight flip)
const SESSION_TODAY = startOfDay(new Date());
const STRIP_START = addDays(SESSION_TODAY, -42);

export interface MonthStripProps {
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
  jobs: Job[];
  blockedTimes: BlockedTime[];
}

function DayCell({
  day,
  isSelected,
  isToday,
  hasJob,
  hasBlock,
  onPress,
}: {
  day: Date;
  isSelected: boolean;
  isToday: boolean;
  hasJob: boolean;
  hasBlock: boolean;
  onPress: () => void;
}) {
  const labelColor = isSelected
    ? colors.textInverse
    : isToday
    ? colors.primary[600]
    : colors.textTertiary;
  const dateColor = isSelected
    ? colors.textInverse
    : isToday
    ? colors.primary[600]
    : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityLabel={format(day, 'EEEE, MMMM d')}
      accessibilityRole="button"
      style={[
        {
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          gap: 2,
        },
        isSelected
          ? { backgroundColor: colors.primary[600] }
          : isToday
          ? {
              borderWidth: 1.5,
              borderColor: colors.primary[400],
            }
          : null,
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          color: labelColor,
        } as TextStyle}
      >
        {format(day, 'EEE')}
      </Text>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 20,
          fontWeight: '700',
          ...numericTabular,
          color: dateColor,
          lineHeight: 24,
        } as TextStyle}
      >
        {format(day, 'd')}
      </Text>
      {/* Dot indicators */}
      <View style={{ flexDirection: 'row', gap: 3, height: 6, alignItems: 'center' }}>
        {hasJob && !hasBlock ? (
          <View
            style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSelected ? colors.textInverse : colors.primary[600] }}
          />
        ) : hasBlock && !hasJob ? (
          <View
            style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSelected ? colors.textInverse : colors.borderStrong }}
          />
        ) : hasJob && hasBlock ? (
          // Split dot: left half = job color, right half = block color
          <View style={{ width: 8, height: 4, flexDirection: 'row', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: 4, height: 4, backgroundColor: isSelected ? colors.textInverse : colors.primary[600] }} />
            <View style={{ width: 4, height: 4, backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : colors.borderStrong }} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function MonthStrip({ selectedDate, onDateSelect, jobs, blockedTimes }: MonthStripProps) {
  const flatListRef = useRef<FlatList<Date>>(null);

  const days = useMemo(
    () => Array.from({ length: STRIP_DAYS }, (_, i) => addDays(STRIP_START, i)),
    [],
  );

  const selectedIndex = differenceInDays(startOfDay(selectedDate), STRIP_START);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < STRIP_DAYS) {
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [selectedIndex]);

  return (
    <View
      style={{
        height: CELL_HEIGHT + 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable
        onPress={() => onDateSelect(addDays(selectedDate, -7))}
        hitSlop={8}
        accessibilityLabel="Previous week"
        style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
      >
        <ChevronLeft size={24} color={colors.textSecondary} />
      </Pressable>

      <FlatList
        ref={flatListRef}
        data={days}
        keyExtractor={(d) => d.toISOString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: CELL_WIDTH,
          offset: CELL_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: day }) => {
          const sel = isSameDay(day, selectedDate);
          const tod = isSameDay(day, SESSION_TODAY);
          const hasJob = jobs.some((j) => isSameDay(new Date(j.scheduledAt), day));
          const hasBlock = blockedTimes.some((b) => isSameDay(parseISO(b.start_at), day));
          return (
            <DayCell
              day={day}
              isSelected={sel}
              isToday={tod}
              hasJob={hasJob}
              hasBlock={hasBlock}
              onPress={() => onDateSelect(day)}
            />
          );
        }}
      />

      <Pressable
        onPress={() => onDateSelect(addDays(selectedDate, 7))}
        hitSlop={8}
        accessibilityLabel="Next week"
        style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
      >
        <ChevronRight size={24} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

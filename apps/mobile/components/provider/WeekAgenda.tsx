import React, { useMemo } from 'react';
import { Platform, Pressable, SectionList, Text, View, type ListRenderItemInfo } from 'react-native';
import { addDays, format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import { colors, fonts, numericTabular, textStyles } from '../../tokens';
import type { TextStyle } from 'react-native';
import type { Job } from '../../lib/types';
import type { BlockedTime } from '../../lib/api/providers';
import { JobAgendaCard } from './JobAgendaCard';
import { BlockedTimeChip } from './BlockedTimeChip';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { QueryErrorState } from '../shared/QueryErrorState';

type SectionItem =
  | { kind: 'job'; job: Job }
  | { kind: 'block'; block: BlockedTime }
  | { kind: 'empty' }
  | { kind: 'skeleton'; idx: number };

interface DaySection {
  date: Date;
  key: string;
  data: SectionItem[];
}

function isAllDayBlock(block: BlockedTime): boolean {
  const s = parseISO(block.start_at);
  const e = parseISO(block.end_at);
  return s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 23 && e.getMinutes() >= 59;
}

function DaySectionHeader({ date, jobCount, blockCount }: { date: Date; jobCount: number; blockCount: number }) {
  const today = startOfDay(new Date());
  const isToday = isSameDay(date, today);
  const dayColor = isToday ? colors.primary[600] : colors.textTertiary;
  const dateColor = isToday ? colors.primary[600] : colors.textPrimary;

  const total = jobCount + blockCount;
  const countLabel =
    total === 0
      ? 'open'
      : `${jobCount > 0 ? `${jobCount} ${jobCount === 1 ? 'visit' : 'visits'}` : ''}${
          jobCount > 0 && blockCount > 0 ? ' · ' : ''
        }${blockCount > 0 ? `${blockCount} block${blockCount > 1 ? 's' : ''}` : ''}`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: isToday ? colors.divider : colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: 11,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: dayColor,
          width: 36,
        } as TextStyle}
      >
        {format(date, 'EEE').toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 22,
          fontWeight: '700',
          ...numericTabular,
          color: dateColor,
          marginRight: 8,
          lineHeight: 28,
        } as TextStyle}
      >
        {format(date, 'd')}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 11,
          fontStyle: 'italic',
          color: total === 0 ? colors.textTertiary : colors.accent[600],
          flex: 1,
        } as TextStyle}
      >
        {countLabel}
      </Text>
    </View>
  );
}

export interface WeekAgendaProps {
  weekStart: Date;
  jobs: Job[];
  blockedTimes: BlockedTime[];
  onJobPress: (job: Job) => void;
  onBlockDay: (date: Date) => void;
  onDeleteBlock: (block: BlockedTime) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  footer?: React.ReactElement;
}

export function WeekAgenda({
  weekStart,
  jobs,
  blockedTimes,
  onJobPress,
  onBlockDay,
  onDeleteBlock,
  isLoading,
  isError,
  onRetry,
  footer,
}: WeekAgendaProps) {
  const today = startOfDay(new Date());

  const sections = useMemo<DaySection[]>(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dayJobs = jobs.filter((j) => isSameDay(new Date(j.scheduledAt), date));
      const dayBlocks = blockedTimes.filter((b) => isSameDay(parseISO(b.start_at), date));

      const data: SectionItem[] = [];

      if (isLoading) {
        data.push({ kind: 'skeleton', idx: 0 });
      } else {
        // All-day blocks at top
        const allDay = dayBlocks.filter(isAllDayBlock);
        const partial = dayBlocks.filter((b) => !isAllDayBlock(b));

        for (const block of allDay) data.push({ kind: 'block', block });
        for (const job of dayJobs) data.push({ kind: 'job', job });
        for (const block of partial) data.push({ kind: 'block', block });

        if (data.length === 0) {
          data.push({ kind: 'empty' });
        }
      }

      return { date, key: date.toISOString(), data };
    });
  }, [weekStart, jobs, blockedTimes, isLoading]);

  if (isError && !isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <QueryErrorState onRetry={onRetry} />
      </View>
    );
  }

  return (
    <SectionList<SectionItem, DaySection>
      sections={sections}
      keyExtractor={(item, index) => {
        if (item.kind === 'job') return item.job.id;
        if (item.kind === 'block') return item.block.id;
        if (item.kind === 'skeleton') return `skeleton-${item.idx}`;
        return `empty-${index}`;
      }}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }) => {
        const dayJobs = jobs.filter((j) => isSameDay(new Date(j.scheduledAt), section.date));
        const dayBlocks = blockedTimes.filter((b) => isSameDay(parseISO(b.start_at), section.date));
        return (
          <DaySectionHeader
            date={section.date}
            jobCount={dayJobs.length}
            blockCount={dayBlocks.length}
          />
        );
      }}
      renderItem={({ item, section }: ListRenderItemInfo<SectionItem> & { section: DaySection }) => {
        if (item.kind === 'skeleton') {
          return (
            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
              <SkeletonLoader width="100%" height={72} borderRadius={14} />
            </View>
          );
        }

        if (item.kind === 'empty') {
          const isPast = isBefore(section.date, today);
          return (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontStyle: 'italic',
                  color: colors.textTertiary,
                }}
              >
                — open —
              </Text>
              {!isPast ? (
                <Pressable
                  onPress={() => onBlockDay(section.date)}
                  hitSlop={8}
                  accessibilityLabel={`Block time on ${format(section.date, 'EEEE')}`}
                  style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 11,
                      fontWeight: '600',
                      color: colors.primary[600],
                    } as TextStyle}
                  >
                    + Block
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }

        if (item.kind === 'job') {
          return (
            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
              <JobAgendaCard job={item.job} onPress={() => onJobPress(item.job)} />
            </View>
          );
        }

        if (item.kind === 'block') {
          const dayJobs = jobs.filter((j) => isSameDay(new Date(j.scheduledAt), section.date));
          const isAllDay = isAllDayBlock(item.block);
          return (
            <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
              <BlockedTimeChip
                block={item.block}
                onDelete={onDeleteBlock}
                isAllDayConflict={isAllDay && dayJobs.length > 0}
              />
            </View>
          );
        }

        return null;
      }}
      renderSectionFooter={({ section }) => {
        const isPast = isBefore(section.date, today);
        const hasItems = section.data.some((i) => i.kind === 'job' || i.kind === 'block');
        if (isPast || !hasItems) return <View style={{ height: 4 }} />;
        return (
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 6,
              paddingBottom: 12,
            }}
          >
            <Pressable
              onPress={() => onBlockDay(section.date)}
              hitSlop={8}
              accessibilityLabel={`Block time on ${format(section.date, 'EEEE')}`}
              style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 11,
                  fontWeight: '600',
                  color: colors.primary[600],
                } as TextStyle}
              >
                + Block time
              </Text>
            </Pressable>
          </View>
        );
      }}
      ListFooterComponent={
        footer
          ? () => (
              <View style={{ paddingTop: 8, paddingBottom: 24 }}>
                {footer}
              </View>
            )
          : undefined
      }
      contentContainerStyle={{ paddingBottom: 0 }}
    />
  );
}

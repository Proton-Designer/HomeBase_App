import React, { useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, fonts } from '../../../tokens';
import type { TextStyle } from 'react-native';

import { useAuthStore } from '../../../stores/authStore';
import {
  listBlockedTimes,
  deleteBlockedTime,
  type BlockedTime,
} from '../../../lib/api/providers';
import type { Job } from '../../../lib/types';

import { listForProviderInRange } from '../../../lib/api/jobs';
import { MonthStrip } from '../../../components/provider/MonthStrip';
import { WeekAgenda } from '../../../components/provider/WeekAgenda';
import { AvailabilityPanel } from '../../../components/provider/AvailabilityPanel';
import { BlockedTimesPanel } from '../../../components/provider/BlockedTimesPanel';
import {
  BlockTimeSheet,
  type BlockTimeSheetHandle,
} from '../../../components/provider/BlockTimeSheet';
import {
  AvailabilitySheet,
  type AvailabilitySheetHandle,
} from '../../../components/provider/AvailabilitySheet';

const SESSION_TODAY = startOfDay(new Date());

export default function ProviderScheduleScreen() {
  const router = useRouter();
  const providerId = useAuthStore((s) => s.providerId) ?? '';
  const queryClient = useQueryClient();

  // ── navigation state ─────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date>(SESSION_TODAY);

  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate],
  );
  // End of Sunday (not Sunday 00:00) — the jobs query bound is inclusive (.lte), so a
  // midnight bound would silently drop every job scheduled during the day on Sunday.
  const weekEnd = useMemo(() => endOfDay(addDays(weekStart, 6)), [weekStart]);

  // Current week's start for "Today" button visibility
  const currentWeekStart = useMemo(
    () => startOfWeek(SESSION_TODAY, { weekStartsOn: 1 }),
    [],
  );
  const isOnCurrentWeek = isSameDay(weekStart, currentWeekStart);

  // ── sheet refs ────────────────────────────────────────────────────────────────
  const blockTimeSheetRef = useRef<BlockTimeSheetHandle>(null);
  const availabilitySheetRef = useRef<AvailabilitySheetHandle>(null);
  function openBlockSheet(date: Date) {
    blockTimeSheetRef.current?.present(date);
  }

  // ── jobs query ───────────────────────────────────────────────────────────────
  const {
    data: weekJobs = [],
    isLoading: jobsLoading,
    isError: jobsError,
    refetch: refetchJobs,
  } = useQuery<Job[]>({
    queryKey: ['provider', 'jobs', providerId, weekStart.toISOString()],
    queryFn: () =>
      listForProviderInRange(
        providerId,
        weekStart.toISOString(),
        weekEnd.toISOString(),
      ),
    enabled: !!providerId,
    staleTime: 60_000,
  });

  // ── blocked times query (today + 90 days, independent of week view) ─────────
  const blocksFrom = SESSION_TODAY.toISOString();
  const blocksTo = addDays(SESSION_TODAY, 90).toISOString();

  const {
    data: blockedTimes = [],
    isLoading: blocksLoading,
    isError: blocksError,
    refetch: refetchBlocks,
  } = useQuery<BlockedTime[]>({
    queryKey: ['blocked-times', providerId, blocksFrom, blocksTo],
    queryFn: () => listBlockedTimes(providerId, blocksFrom, blocksTo),
    enabled: !!providerId,
    staleTime: 60_000,
  });

  // ── delete block with optimistic update ──────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBlockedTime(id),
    onError: () => {
      // Re-fetch to restore the removed block
      queryClient.invalidateQueries({ queryKey: ['blocked-times', providerId] });
      Alert.alert('Could not remove block. Try again.');
    },
  });

  function handleDeleteBlock(block: BlockedTime) {
    // Optimistic: remove from cache immediately
    queryClient.setQueryData<BlockedTime[]>(
      ['blocked-times', providerId, blocksFrom, blocksTo],
      (old) => (old ?? []).filter((b) => b.id !== block.id),
    );
    deleteMutation.mutate(block.id);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Screen header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 4,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: 2 }}>
          <Text
            style={{
              fontFamily: fonts.bodySemibold,
              fontSize: 11,
              fontStyle: 'italic',
              letterSpacing: 0.4,
              color: colors.accent[600],
              textTransform: 'lowercase',
            } as TextStyle}
          >
            schedule
          </Text>
          <Text
            style={{
              fontFamily: fonts.editorial,
              fontSize: 30,
              fontWeight: '700',
              lineHeight: 36,
              letterSpacing: -1,
              color: colors.textPrimary,
            } as TextStyle}
          >
            {format(weekStart, 'MMMM yyyy')}
          </Text>
        </View>

        {/* "Today" ghost button — appears when provider navigates away from current week */}
        {!isOnCurrentWeek ? (
          <Pressable
            onPress={() => setSelectedDate(SESSION_TODAY)}
            hitSlop={8}
            accessibilityLabel="Jump to today"
            style={[
              {
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.primary[400],
                marginBottom: 4,
              },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 12,
                fontWeight: '600',
                color: colors.primary[600],
              } as TextStyle}
            >
              Today
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Month strip with left/right chevrons */}
      <MonthStrip
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        jobs={weekJobs}
        blockedTimes={blockedTimes}
      />

      {/* Week agenda — SectionList, flex 1, panels in footer */}
      <WeekAgenda
        weekStart={weekStart}
        jobs={weekJobs}
        blockedTimes={blockedTimes}
        onJobPress={(job: Job) => router.push(`/(provider)/thread/${job.id}`)}
        onBlockDay={openBlockSheet}
        onDeleteBlock={handleDeleteBlock}
        isLoading={jobsLoading || blocksLoading}
        isError={jobsError || blocksError}
        onRetry={() => { void refetchJobs(); void refetchBlocks(); }}
        footer={
          <View style={{ gap: 8 }}>
            <AvailabilityPanel
              providerId={providerId}
              onEdit={() => availabilitySheetRef.current?.present()}
            />
            <BlockedTimesPanel
              blockedTimes={blockedTimes}
              onBlockPress={openBlockSheet}
              onDeleteBlock={handleDeleteBlock}
            />
          </View>
        }
      />

      {/* Sheets */}
      <BlockTimeSheet
        ref={blockTimeSheetRef}
        providerId={providerId}
        prefilledDate={SESSION_TODAY}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['blocked-times', providerId] });
        }}
      />
      <AvailabilitySheet
        ref={availabilitySheetRef}
        providerId={providerId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['availability', providerId] });
        }}
      />
    </SafeAreaView>
  );
}

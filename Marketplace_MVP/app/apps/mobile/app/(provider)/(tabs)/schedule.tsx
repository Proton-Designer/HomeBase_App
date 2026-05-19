import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, addDays, startOfWeek, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { CalendarX } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Section } from '../../../components/ui/Section';
import { QueryErrorState } from '../../../components/shared';
import {
  BottomSheetWrapper,
  type BottomSheetWrapperHandle,
} from '../../../components/shared/BottomSheetWrapper';
import * as jobsApi from '../../../lib/api/jobs';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import {
  listBlockedTimes,
  createBlockedTime,
  deleteBlockedTime,
  type BlockedTime,
} from '../../../lib/api/providers';
import { useAuthStore } from '../../../stores/authStore';
import { colors, textStyles, numericTabular, fonts } from '../../../tokens';
import type { TextStyle } from 'react-native';
import type { Job } from '../../../lib/types';

type ScheduleView = 'week' | 'month';
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function dayVisitCaption(jobCount: number): string {
  if (jobCount === 0) return 'open';
  return `${jobCount} ${jobCount === 1 ? 'visit' : 'visits'}`;
}

// DateTimePicker is iOS/Android only — web falls back to a text input.
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

type PickerField = 'date' | 'startTime' | 'endTime';

export default function ProviderScheduleScreen() {
  const [view, setView] = useState<ScheduleView>('week');
  const today = new Date();
  const isDesktop = useBreakpoint() === 'desktop';
  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const providerId = useAuthStore((s) => s.providerId) ?? '';

  // Scheduled jobs for the week
  const { data: weekJobs = [], isError: weekJobsError, refetch: refetchWeekJobs } = useQuery<Job[]>({
    queryKey: ['provider', 'jobs', providerId],
    queryFn: () => jobsApi.listForProvider(providerId),
    enabled: !!providerId,
    staleTime: 60_000,
  });
  const queryClient = useQueryClient();
  const sheetRef = useRef<BottomSheetWrapperHandle>(null);

  // ── form state ──────────────────────────────────────────────────────────────
  const [blockDate, setBlockDate] = useState(today);
  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date(today);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [endTime, setEndTime] = useState<Date>(() => {
    const d = new Date(today);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [reason, setReason] = useState('');
  const [activePicker, setActivePicker] = useState<PickerField | null>(null);
  const [formError, setFormError] = useState('');

  // Web fallback: text inputs
  const [dateText, setDateText] = useState(() => format(today, 'yyyy-MM-dd'));
  const [startText, setStartText] = useState('09:00');
  const [endText, setEndText] = useState('10:00');

  // ── query: blocked times for visible week ───────────────────────────────────
  const fromDate = days[0].toISOString();
  const toDate = addDays(days[6], 1).toISOString();

  const { data: blockedTimes = [], isError: blockedTimesError, refetch: refetchBlockedTimes } = useQuery<BlockedTime[]>({
    queryKey: ['blocked-times', providerId, fromDate, toDate],
    queryFn: () => listBlockedTimes(providerId, fromDate, toDate),
    enabled: !!providerId,
  });

  // ── mutation: create ────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createBlockedTime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-times', providerId] });
      sheetRef.current?.dismiss();
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  // ── mutation: delete ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteBlockedTime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-times', providerId] });
    },
  });

  function resetForm() {
    setBlockDate(today);
    setStartTime(() => { const d = new Date(today); d.setHours(9, 0, 0, 0); return d; });
    setEndTime(() => { const d = new Date(today); d.setHours(10, 0, 0, 0); return d; });
    setReason('');
    setFormError('');
    setDateText(format(today, 'yyyy-MM-dd'));
    setStartText('09:00');
    setEndText('10:00');
  }

  function buildISO(date: Date, time: Date): string {
    const d = new Date(date);
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return d.toISOString();
  }

  function handleSubmit() {
    setFormError('');
    let startAt: string;
    let endAt: string;

    if (isNative) {
      startAt = buildISO(blockDate, startTime);
      endAt = buildISO(blockDate, endTime);
    } else {
      // Parse web text inputs
      const dateParts = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const startParts = startText.match(/^(\d{1,2}):(\d{2})$/);
      const endParts = endText.match(/^(\d{1,2}):(\d{2})$/);
      if (!dateParts || !startParts || !endParts) {
        setFormError('Use formats: date YYYY-MM-DD, time HH:MM');
        return;
      }
      const base = new Date(`${dateText}T00:00:00`);
      const s = new Date(base);
      s.setHours(parseInt(startParts[1], 10), parseInt(startParts[2], 10), 0, 0);
      const e = new Date(base);
      e.setHours(parseInt(endParts[1], 10), parseInt(endParts[2], 10), 0, 0);
      startAt = s.toISOString();
      endAt = e.toISOString();
    }

    if (endAt <= startAt) {
      setFormError('End time must be after start time');
      return;
    }

    if (!providerId) {
      setFormError('No provider account found');
      return;
    }

    createMutation.mutate({
      providerId,
      startAt,
      endAt,
      reason: reason.trim() || undefined,
    });
  }

  function handleDeleteBlock(block: BlockedTime) {
    Alert.alert(
      'Remove block',
      block.reason ? `Remove "${block.reason}"?` : 'Remove this blocked time?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove block',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(block.id),
        },
      ],
    );
  }

  // ── helpers for rendering blocked bands ─────────────────────────────────────
  function getBlockedBandsForCell(day: Date, hour: number): BlockedTime[] {
    return blockedTimes.filter((b) => {
      const start = parseISO(b.start_at);
      const end = parseISO(b.end_at);
      const cellStart = new Date(day);
      cellStart.setHours(hour, 0, 0, 0);
      const cellEnd = new Date(day);
      cellEnd.setHours(hour, 59, 59, 999);
      return start <= cellEnd && end >= cellStart;
    });
  }

  function isBlockedDay(day: Date): boolean {
    return blockedTimes.some((b) => {
      const start = parseISO(b.start_at);
      const end = parseISO(b.end_at);
      return isSameDay(day, start) || isWithinInterval(day, { start, end });
    });
  }

  // ── sub-components ───────────────────────────────────────────────────────────

  const Header = (
    <View style={{ gap: 6 }}>
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
        {format(today, 'MMMM yyyy').toLowerCase()}
      </Text>
      <Text
        style={{
          fontFamily: fonts.editorial,
          fontSize: isDesktop ? 36 : 30,
          fontWeight: '700',
          lineHeight: isDesktop ? 42 : 36,
          letterSpacing: -1,
          color: colors.textPrimary,
        } as TextStyle}
      >
        Schedule
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          fontStyle: 'italic',
          color: colors.textSecondary,
          lineHeight: 19,
        } as TextStyle}
      >
        Tap an empty slot to block time. Tap a job to manage it.
      </Text>
    </View>
  );

  const ViewSwitcher = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View
        style={{
          padding: 4,
          backgroundColor: colors.divider,
          borderRadius: 999,
          flexDirection: 'row',
        }}
      >
        {(['week', 'month'] as ScheduleView[]).map((v) => {
          const sel = view === v;
          return (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: sel ? colors.surface : 'transparent',
              }}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: sel ? fonts.bodySemibold : fonts.bodyMedium,
                  fontWeight: sel ? '600' : '500',
                  color: sel ? colors.textPrimary : colors.textSecondary,
                  textTransform: 'capitalize',
                }}
              >
                {v}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        hitSlop={6}
        onPress={() => sheetRef.current?.present()}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: colors.primary[50],
          borderRadius: 999,
        }}
      >
        <CalendarX size={12} color={colors.primary[700]} />
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 11,
            fontWeight: '600',
            color: colors.primary[700],
          } as TextStyle}
        >
          Block time
        </Text>
      </Pressable>
    </View>
  );

  const WeekGrid = (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Day headers */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ width: 52 }} />
        {days.map((d) => {
          const sel = isSameDay(d, today);
          const dayJobs = weekJobs.filter((j: { scheduledAt: string }) => isSameDay(new Date(j.scheduledAt), d));
          const blocked = isBlockedDay(d);
          return (
            <View
              key={d.toISOString()}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: blocked ? '#F9FAFB' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 10,
                  fontWeight: '700',
                  color: sel ? colors.primary[600] : colors.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                } as TextStyle}
              >
                {format(d, 'EEE')}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 17,
                  fontWeight: '700',
                  lineHeight: 22,
                  color: sel ? colors.primary[600] : colors.textPrimary,
                  marginTop: 2,
                  ...numericTabular,
                } as TextStyle}
              >
                {format(d, 'd')}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 9,
                  fontStyle: 'italic',
                  color: dayJobs.length > 0 ? colors.accent[600] : colors.textTertiary,
                  marginTop: 1,
                } as TextStyle}
              >
                {dayVisitCaption(dayJobs.length)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Hour rows */}
      {HOURS.map((hour) => (
        <View
          key={hour}
          style={{
            flexDirection: 'row',
            minHeight: isDesktop ? 54 : 42,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}
        >
          <View
            style={{
              width: 52,
              paddingRight: 8,
              alignItems: 'flex-end',
              paddingTop: 5,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 10,
                color: colors.textTertiary,
                ...numericTabular,
              } as TextStyle}
            >
              {hour > 12 ? hour - 12 : hour}
              {hour >= 12 ? 'p' : 'a'}
            </Text>
          </View>
          {days.map((d) => {
            const job = weekJobs.find((j: { scheduledAt: string }) => {
              const jd = new Date(j.scheduledAt);
              return isSameDay(jd, d) && jd.getHours() === hour;
            });
            const cellBlocks = getBlockedBandsForCell(d, hour);
            return (
              <View
                key={d.toISOString()}
                style={{
                  flex: 1,
                  padding: 3,
                  borderLeftWidth: 1,
                  borderLeftColor: colors.divider,
                }}
              >
                {job ? (
                  <View
                    style={{
                      backgroundColor: colors.primary[600],
                      borderRadius: 7,
                      paddingHorizontal: 5,
                      paddingVertical: 5,
                      flex: 1,
                      borderLeftWidth: 2.5,
                      borderLeftColor: colors.accent[400],
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 10,
                        fontWeight: '600',
                        color: colors.textInverse,
                      } as TextStyle}
                      numberOfLines={1}
                    >
                      {(job as unknown as Record<string, unknown>).homeownerFirstName as string
                        ?? (job as unknown as Record<string, unknown>).providerName as string
                        ?? 'Job'}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 9,
                        fontStyle: 'italic',
                        color: 'rgba(255,255,255,0.7)',
                        marginTop: 1,
                      } as TextStyle}
                      numberOfLines={1}
                    >
                      {(job as unknown as Record<string, unknown>).serviceType as string ?? ''}</Text>
                  </View>
                ) : cellBlocks.length > 0 ? (
                  <Pressable
                    onPress={() => handleDeleteBlock(cellBlocks[0])}
                    style={{
                      backgroundColor: colors.divider,
                      borderRadius: 7,
                      paddingHorizontal: 5,
                      paddingVertical: 5,
                      flex: 1,
                      borderLeftWidth: 2.5,
                      borderLeftColor: colors.borderStrong,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 9,
                        fontWeight: '600',
                        color: colors.textSecondary,
                        textDecorationLine: 'line-through',
                      } as TextStyle}
                      numberOfLines={1}
                    >
                      {cellBlocks[0].reason ? `Blocked: ${cellBlocks[0].reason}` : 'Blocked'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const MonthGrid = (
    <Card>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 16,
          fontWeight: '700',
          color: colors.textPrimary,
          marginBottom: 12,
        } as TextStyle}
      >
        {format(today, 'MMMM yyyy')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 35 }, (_, i) => {
          const d = addDays(weekStart, i - today.getDay());
          const hasJob = weekJobs.some((j: { scheduledAt: string }) => isSameDay(new Date(j.scheduledAt), d));
          const sel = isSameDay(d, today);
          const blocked = isBlockedDay(d);
          return (
            <View
              key={i}
              style={{
                width: '14.28%',
                aspectRatio: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: sel
                    ? colors.primary[600]
                    : blocked
                    ? colors.divider
                    : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: sel ? colors.textInverse : colors.textPrimary,
                    ...numericTabular,
                  } as TextStyle}
                >
                  {format(d, 'd')}
                </Text>
              </View>
              {hasJob && !sel ? (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.accent[500],
                    marginTop: 2,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );

  // ── block-time sheet content ─────────────────────────────────────────────────
  const BlockTimeSheet = (
    <BottomSheetWrapper ref={sheetRef} snapPoints={['60%', '85%']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
      >
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: 4,
          } as TextStyle}
        >
          Block time
        </Text>

        {/* Date */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textPrimary } as TextStyle}>
            Date
          </Text>
          {isNative ? (
            <>
              <Pressable
                onPress={() => setActivePicker(activePicker === 'date' ? null : 'date')}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                  {format(blockDate, 'EEEE, MMMM d, yyyy')}
                </Text>
              </Pressable>
              {activePicker === 'date' && (
                <DateTimePicker
                  value={blockDate}
                  mode="date"
                  display="spinner"
                  minimumDate={today}
                  onChange={(_e, d) => { if (d) setBlockDate(d); }}
                />
              )}
            </>
          ) : (
            <TextInput
              value={dateText}
              onChangeText={setDateText}
              placeholder="YYYY-MM-DD"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
              }}
            />
          )}
        </View>

        {/* Start time */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textPrimary } as TextStyle}>
            Start time
          </Text>
          {isNative ? (
            <>
              <Pressable
                onPress={() => setActivePicker(activePicker === 'startTime' ? null : 'startTime')}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                  {format(startTime, 'h:mm a')}
                </Text>
              </Pressable>
              {activePicker === 'startTime' && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display="spinner"
                  minuteInterval={15}
                  onChange={(_e, d) => { if (d) setStartTime(d); }}
                />
              )}
            </>
          ) : (
            <TextInput
              value={startText}
              onChangeText={setStartText}
              placeholder="HH:MM"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
              }}
            />
          )}
        </View>

        {/* End time */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textPrimary } as TextStyle}>
            End time
          </Text>
          {isNative ? (
            <>
              <Pressable
                onPress={() => setActivePicker(activePicker === 'endTime' ? null : 'endTime')}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                  {format(endTime, 'h:mm a')}
                </Text>
              </Pressable>
              {activePicker === 'endTime' && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display="spinner"
                  minuteInterval={15}
                  onChange={(_e, d) => { if (d) setEndTime(d); }}
                />
              )}
            </>
          ) : (
            <TextInput
              value={endText}
              onChangeText={setEndText}
              placeholder="HH:MM"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
              }}
            />
          )}
        </View>

        {/* Reason */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textPrimary } as TextStyle}>
            Reason{' '}
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary } as TextStyle}>
              (optional)
            </Text>
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Vacation, Doctor appointment…"
            placeholderTextColor={colors.textTertiary}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
            }}
          />
        </View>

        {formError ? (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: '#DC2626',
            } as TextStyle}
          >
            {formError}
          </Text>
        ) : null}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.primary[700] : colors.primary[600],
            borderRadius: 12,
            paddingVertical: 15,
            alignItems: 'center',
            opacity: createMutation.isPending ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fonts.bodySemibold,
              fontSize: 15,
              fontWeight: '600',
              color: colors.textInverse,
            } as TextStyle}
          >
            {createMutation.isPending ? 'Saving…' : 'Block this time'}
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheetWrapper>
  );

  const scheduleError = weekJobsError || blockedTimesError;
  const scheduleRefetch = () => {
    if (weekJobsError) refetchWeekJobs();
    if (blockedTimesError) refetchBlockedTimes();
  };

  if (isDesktop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ScrollView>
          <Section tight>{Header}</Section>
          <Section tight>
            <View style={{ gap: 20 }}>
              {ViewSwitcher}
              {scheduleError ? (
                <QueryErrorState onRetry={scheduleRefetch} />
              ) : view === 'week' ? WeekGrid : MonthGrid}
            </View>
          </Section>
        </ScrollView>
        {BlockTimeSheet}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>{Header}</View>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>{ViewSwitcher}</View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {scheduleError ? (
          <QueryErrorState onRetry={scheduleRefetch} />
        ) : view === 'week' ? WeekGrid : MonthGrid}
      </ScrollView>
      {BlockTimeSheet}
    </SafeAreaView>
  );
}

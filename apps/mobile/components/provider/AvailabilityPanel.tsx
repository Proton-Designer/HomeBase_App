import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { EmptyState } from '../shared/EmptyState';
import { listAvailability, type AvailabilityRow } from '../../lib/api/providers';
import { colors, fonts, textStyles } from '../../tokens';
import type { TextStyle } from 'react-native';

// 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function parseTimeLabel(hms: string): string {
  const [h, m] = hms.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m ?? 0, 0, 0);
  return format(date, 'h:mm a');
}

function buildTimeSummary(rows: AvailabilityRow[]): string {
  if (rows.length === 0) return '';
  const starts = [...new Set(rows.map((r) => r.start_time))];
  const ends = [...new Set(rows.map((r) => r.end_time))];
  if (starts.length === 1 && ends.length === 1) {
    return `${parseTimeLabel(starts[0])} – ${parseTimeLabel(ends[0])}`;
  }
  // Different windows per day — show compact summary
  return rows
    .map((r) => `${DAY_LABELS[r.day_of_week]}: ${parseTimeLabel(r.start_time)}–${parseTimeLabel(r.end_time)}`)
    .join(' · ');
}

export interface AvailabilityPanelProps {
  providerId: string;
  onEdit: () => void;
}

export function AvailabilityPanel({ providerId, onEdit }: AvailabilityPanelProps) {
  const {
    data: rows,
    isLoading,
    isError,
    refetch,
  } = useQuery<AvailabilityRow[]>({
    queryKey: ['availability', providerId],
    queryFn: () => listAvailability(providerId),
    enabled: !!providerId,
    staleTime: 5 * 60_000,
  });

  const activeDays = new Set((rows ?? []).map((r) => r.day_of_week));
  const timeSummary = buildTimeSummary(rows ?? []);

  return (
    <Card
      variant="outlined"
      style={{ marginHorizontal: 16, marginBottom: 12 }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text
          style={{
            ...textStyles['label'],
            color: colors.textTertiary,
            flex: 1,
          }}
        >
          Working hours
        </Text>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityLabel="Edit working hours"
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
            Edit
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ gap: 10 }}>
          <SkeletonLoader width="90%" height={32} />
          <SkeletonLoader width="60%" height={18} />
        </View>
      ) : isError ? (
        <View>
          <Text style={{ ...textStyles['body-sm'], color: colors.error, marginBottom: 6 }}>
            Could not load working hours.
          </Text>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.primary[600] } as TextStyle}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : rows && rows.length === 0 ? (
        <EmptyState
          heading="No working hours set"
          body="Set your regular hours so homeowners know when to book you."
          ctaLabel="Set hours"
          onCta={onEdit}
          style={{ paddingVertical: 16, paddingHorizontal: 0 }}
        />
      ) : (
        <>
          {/* Day pills */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            {ALL_DAYS.map((dow) => {
              const active = activeDays.has(dow);
              return (
                <View
                  key={dow}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.primary[600] : colors.divider,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 10,
                      fontWeight: '600',
                      color: active ? colors.textInverse : colors.textTertiary,
                    } as TextStyle}
                  >
                    {DAY_LABELS[dow]}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Time summary */}
          {timeSummary ? (
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              {timeSummary}
            </Text>
          ) : null}

          {/* Booking info banner */}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 11,
              color: colors.textTertiary,
              fontStyle: 'italic',
              marginTop: 8,
              lineHeight: 16,
            } as TextStyle}
          >
            We route new job requests to you on your active days, within these hours. Blocked times are skipped — you confirm the exact time when you accept each job.
          </Text>
        </>
      )}
    </Card>
  );
}

import React from 'react';
import { Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ChevronRight } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import type { PillTone } from '../ui/Pill';
import { colors, fonts, numericTabular, textStyles } from '../../tokens';
import type { TextStyle } from 'react-native';
import type { Job, JobStatus, ServiceType } from '../../lib/types';

const SERVICE_LABELS: Record<ServiceType, string> = {
  lawn: 'Lawn Service',
  cleaning: 'Cleaning',
  pool: 'Pool Service',
  pest: 'Pest Control',
  pressure: 'Pressure Washing',
  window: 'Window Cleaning',
  gutter: 'Gutter Service',
  detailing: 'Auto Detailing',
  tree: 'Tree Service',
  solar: 'Solar Cleaning',
};

const STATUS_TONES: Record<JobStatus, PillTone> = {
  booked: 'info',
  confirmed: 'success',
  en_route: 'warning',
  in_progress: 'primary',
  completed: 'neutral',
  cancelled: 'error',
};

const STATUS_LABELS: Record<JobStatus, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export interface JobAgendaCardProps {
  job: Job;
  onPress: () => void;
}

export function JobAgendaCard({ job, onPress }: JobAgendaCardProps) {
  const firstName = job.homeownerName?.split(' ')[0] ?? 'Client';
  const timeStr = format(parseISO(job.scheduledAt), 'h:mm a');
  const serviceLabel = SERVICE_LABELS[job.serviceType] ?? job.serviceType;
  const tone = STATUS_TONES[job.status] ?? 'neutral';
  const statusLabel = STATUS_LABELS[job.status] ?? job.status;

  const metaParts = [
    firstName,
    job.addressFormatted ?? job.homeownerNeighborhood ?? null,
    formatCents(job.amountCents),
  ].filter(Boolean);

  return (
    <Card
      variant="pressable"
      onPress={onPress}
      style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row' }}>
        {/* Left accent bar */}
        <View
          style={{
            width: 3,
            borderTopLeftRadius: 14,
            borderBottomLeftRadius: 14,
            backgroundColor: colors.primary[600],
          }}
        />
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 4 }}>
          {/* Time + service row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 13,
                fontWeight: '600',
                ...numericTabular,
                color: colors.textPrimary,
              } as TextStyle}
            >
              {timeStr}
            </Text>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 13,
                fontWeight: '600',
                color: colors.textPrimary,
                flex: 1,
              } as TextStyle}
              numberOfLines={1}
            >
              {serviceLabel}
            </Text>
            <ChevronRight size={16} color={colors.textTertiary} />
          </View>

          {/* Homeowner + address + amount */}
          <Text
            style={{ ...textStyles['body-sm'], color: colors.textSecondary }}
            numberOfLines={1}
          >
            {metaParts.join(' · ')}
          </Text>

          {/* Status pill */}
          <Pill
            label={statusLabel}
            tone={tone}
            style={{ marginTop: 2 }}
          />
        </View>
      </View>
    </Card>
  );
}

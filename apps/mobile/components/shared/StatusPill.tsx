import React from 'react';
import { View, Text } from 'react-native';
import type { JobStatus } from '../../lib/types';
import { colors, fonts } from '../../tokens';

const STATUS_PILL_CONFIG: Record<JobStatus, { label: string; bg: string; text: string }> = {
  booked:      { label: 'Upcoming',    bg: colors.infoLight,    text: colors.info },
  confirmed:   { label: 'Confirmed',   bg: colors.infoLight,    text: colors.info },
  en_route:    { label: 'En route',    bg: colors.warningLight, text: colors.warning },
  in_progress: { label: 'In progress', bg: colors.accent[100],  text: colors.accent[700] },
  completed:   { label: 'Done',        bg: colors.successLight, text: colors.success },
  cancelled:   { label: 'Cancelled',   bg: colors.divider,      text: colors.textTertiary },
};

export interface StatusPillProps {
  status: JobStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  const cfg = STATUS_PILL_CONFIG[status] ?? STATUS_PILL_CONFIG.booked;
  return (
    <View
      accessibilityLabel={cfg.label}
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: cfg.bg,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: 10,
          fontWeight: '600',
          color: cfg.text,
          letterSpacing: 0.3,
        }}
      >
        {cfg.label}
      </Text>
    </View>
  );
}

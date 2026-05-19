import React from 'react';
import { Platform, Text, View } from 'react-native';
import { Check, Truck, Sparkles, Calendar, ClipboardCheck } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import { colors, textStyles } from '../../tokens';
import type { JobStatus } from '../../lib/types';
import { useBreakpoint } from '../../lib/useBreakpoint';

const ORDER: Exclude<JobStatus, 'cancelled'>[] = [
  'booked',
  'confirmed',
  'en_route',
  'in_progress',
  'completed',
];

const LABEL: Record<Exclude<JobStatus, 'cancelled'>, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  en_route: 'En route',
  in_progress: 'In progress',
  completed: 'Completed',
};

const ICON: Record<Exclude<JobStatus, 'cancelled'>, React.ComponentType<{ size?: number; color?: string }>> = {
  booked: Calendar,
  confirmed: ClipboardCheck,
  en_route: Truck,
  in_progress: Sparkles,
  completed: Check,
};

export interface JobStatusTimelineProps {
  currentStatus: JobStatus;
  timestamps: Partial<Record<JobStatus, string>>;
  providerName?: string;
}

export function JobStatusTimeline({ currentStatus, timestamps }: JobStatusTimelineProps) {
  const currentIdx = ORDER.indexOf(currentStatus as Exclude<JobStatus, 'cancelled'>);
  const bp = useBreakpoint();
  const horizontal = Platform.OS === 'web' && (bp === 'tablet' || bp === 'desktop');

  if (horizontal) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 }}>
        {ORDER.map((step, idx) => {
          const reached = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          const ts = timestamps[step];
          return (
            <HorizontalStep
              key={step}
              label={LABEL[step]}
              timestamp={ts ? format(new Date(ts), "MMM d 'at' h:mm a") : null}
              Icon={ICON[step]}
              reached={reached}
              isCurrent={isCurrent}
              isFuture={isFuture}
              isLast={idx === ORDER.length - 1}
            />
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 8 }}>
      {ORDER.map((step, idx) => {
        const reached = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;
        const ts = timestamps[step];
        return (
          <Step
            key={step}
            label={LABEL[step]}
            timestamp={ts ? format(new Date(ts), "MMM d 'at' h:mm a") : null}
            Icon={ICON[step]}
            reached={reached}
            isCurrent={isCurrent}
            isFuture={isFuture}
            isLast={idx === ORDER.length - 1}
          />
        );
      })}
    </View>
  );
}

interface StepProps {
  label: string;
  timestamp: string | null;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  reached: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  isLast: boolean;
}

function HorizontalStep({ label, timestamp, Icon, reached, isCurrent, isFuture, isLast }: StepProps) {
  const pulse = useSharedValue(1);
  React.useEffect(() => {
    if (isCurrent) {
      pulse.value = withRepeat(withTiming(1.25, { duration: 900 }), -1, true);
    }
  }, [isCurrent, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const circleColor = reached ? colors.primary[600] : colors.divider;
  const iconColor = reached ? colors.textInverse : colors.textTertiary;

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
        {/* Left connector line */}
        {!isLast ? null : null}
        <View
          style={{
            flex: 1,
            height: 2,
            backgroundColor: reached && !isCurrent ? colors.primary[600] : colors.divider,
            opacity: 0,
          }}
        />
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: circleColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={16} color={iconColor} />
          </View>
          {isCurrent ? (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: colors.primary[500],
                  opacity: 0.5,
                },
                pulseStyle,
              ]}
            />
          ) : null}
        </View>
        <View
          style={{
            flex: 1,
            height: 2,
            backgroundColor: reached ? colors.primary[600] : colors.divider,
            opacity: isLast ? 0 : 1,
          }}
        />
      </View>
      <View style={{ alignItems: 'center', marginTop: 8, paddingHorizontal: 4 }}>
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: isCurrent ? 'PlusJakartaSans_700Bold' : 'Inter_600SemiBold',
            color: isFuture ? colors.textTertiary : colors.textPrimary,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
        {timestamp ? (
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 10,
              color: colors.textTertiary,
              marginTop: 2,
              textAlign: 'center',
            }}
          >
            {timestamp}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Step({ label, timestamp, Icon, reached, isCurrent, isFuture, isLast }: StepProps) {
  const pulse = useSharedValue(1);
  React.useEffect(() => {
    if (isCurrent) {
      pulse.value = withRepeat(withTiming(1.25, { duration: 900 }), -1, true);
    }
  }, [isCurrent, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const circleColor = reached ? colors.primary[600] : colors.divider;
  const iconColor = reached ? colors.textInverse : colors.textTertiary;

  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      <View style={{ alignItems: 'center', width: 32 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: circleColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={iconColor} />
        </View>
        {isCurrent ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: colors.primary[500],
                opacity: 0.5,
              },
              pulseStyle,
            ]}
          />
        ) : null}
        {!isLast ? (
          <View
            style={{
              flex: 1,
              width: 2,
              backgroundColor: reached && !isCurrent ? colors.primary[600] : colors.divider,
              marginVertical: 4,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: 24 }}>
        <Text
          style={{
            ...textStyles['title-md'],
            fontFamily: isCurrent ? 'PlusJakartaSans_700Bold' : 'Inter_600SemiBold',
            color: isFuture ? colors.textTertiary : colors.textPrimary,
          }}
        >
          {label}
        </Text>
        {timestamp ? (
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.textTertiary,
              marginTop: 2,
            }}
          >
            {timestamp}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

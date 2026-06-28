import React, { useEffect } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, ChevronRight, Clock, ShieldCheck, Leaf } from 'lucide-react-native';
import { JobStatusTimeline } from '../shared';
import { Button } from '../ui/Button';
import { colors, fonts, shadows, textStyles } from '../../tokens';
import { usePress } from '../../lib/motion';
import { serviceLabel } from '../../lib/home/serviceMeta';
import type { Reminder, ReminderStatus } from '../../lib/home/reminders';
import type { Job, JobStatus, ServiceType } from '../../lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const IS_WEB = Platform.OS === 'web';
const WEB_CURSOR = IS_WEB ? ({ cursor: 'pointer' } as object) : null;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdaptiveHeroProps {
  /** The primary active job, pre-selected by the parent. Null triggers the nudge. */
  job: Job | null;
  /** True when job.status is en_route or in_progress. */
  isLive: boolean;
  onPressJob: (jobId: string) => void;
  nudge: { title: string; body: string; ctaLabel: string; onCta: () => void };
  /** Top maintenance need — shown only when there's no active job. */
  topReminder?: Reminder | null;
  onBookReminder?: (service: ServiceType) => void;
  onHandledReminder?: (service: ServiceType) => void;
  onOpenReminders?: () => void;
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const month   = d.toLocaleDateString(undefined, { month: 'short' });
  const day     = d.toLocaleDateString(undefined, { day: 'numeric' });
  const time    = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday}, ${month} ${day} · ${time}`;
}

function getLiveStatusLabel(status: JobStatus): string {
  if (status === 'in_progress') return 'In progress';
  if (status === 'en_route')    return 'On the way';
  return '';
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function trustColor(score: number): string {
  if (score >= 4.5) return colors.success;
  if (score >= 3.5) return colors.accent[600];
  return colors.textSecondary;
}

// Compact trust signal — trust must be visible wherever a provider is shown.
function TrustChip({ score }: { score?: number | null }) {
  if (score == null) return null;
  const c = trustColor(score);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <ShieldCheck size={12} color={c} />
      <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 12, lineHeight: 16, color: c }}>
        {score.toFixed(1)}
      </Text>
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ProviderAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl?: string | null;
  name: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: 40, height: 40, borderRadius: 20 }}
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: 14,
          lineHeight: 18,
          color: colors.primary[700],
        }}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}

// Bidirectional scale+opacity pulse using withRepeat — pure Reanimated, no core Animated.
function PulsingDot({ color }: { color: string }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value   = withRepeat(withTiming(1.5, { duration: 800 }), -1, true);
    opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      {/* Animated halo */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: color,
          },
          ringStyle,
        ]}
      />
      {/* Solid core — always visible */}
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }}
      />
    </View>
  );
}

// ─── Branch 1: LIVE HERO ──────────────────────────────────────────────────────
// Shown when job && isLive (en_route or in_progress).
// Most prominent card: accent border, shadows.lg, full timeline embedded.

function LiveHeroCard({
  job,
  onPressJob,
}: {
  job: Job;
  onPressJob: (id: string) => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();

  // in_progress → success green; en_route → accent amber.
  const dotColor    = job.status === 'in_progress' ? colors.success : colors.accent[500];
  const statusLabel = getLiveStatusLabel(job.status);

  return (
    <AnimatedPressable
      onPress={() => onPressJob(job.id)}
      onPressIn={!IS_WEB ? onPressIn : undefined}
      onPressOut={!IS_WEB ? onPressOut : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${serviceLabel(job.serviceType)} — ${statusLabel}`}
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.accent[200],
          borderRadius: 16,
          padding: 16,
        },
        shadows.lg,
        WEB_CURSOR,
        !IS_WEB ? animatedStyle : null,
      ]}
    >
      {/* Live status pill row */}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}
      >
        <PulsingDot color={dotColor} />
        <Text
          style={{
            ...textStyles.label,
            color: dotColor,
          }}
        >
          {statusLabel}
        </Text>
      </View>

      {/* Provider identity + service title */}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}
      >
        <ProviderAvatar avatarUrl={job.providerAvatarUrl} name={job.providerName} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
            {serviceLabel(job.serviceType)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              {job.providerName}
            </Text>
            <TrustChip score={job.providerScore} />
          </View>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} />
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 4 }} />

      {/* Full job status timeline */}
      <JobStatusTimeline
        currentStatus={job.status}
        timestamps={job.timestamps}
        providerName={job.providerName}
      />
    </AnimatedPressable>
  );
}

// ─── Branch 2: NEXT BOOKING CARD ─────────────────────────────────────────────
// Shown when job && !isLive (booked or confirmed).
// Quieter: plain border, shadows.md, no timeline, formatted date + ChevronRight row.

function NextBookingCard({
  job,
  onPressJob,
}: {
  job: Job;
  onPressJob: (id: string) => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();

  return (
    <AnimatedPressable
      onPress={() => onPressJob(job.id)}
      onPressIn={!IS_WEB ? onPressIn : undefined}
      onPressOut={!IS_WEB ? onPressOut : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Next booking: ${serviceLabel(job.serviceType)}`}
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          padding: 16,
        },
        shadows.md,
        WEB_CURSOR,
        !IS_WEB ? animatedStyle : null,
      ]}
    >
      {/* Eyebrow: CalendarDays icon + "Next booking" label */}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}
      >
        <CalendarDays size={14} color={colors.textSecondary} />
        <Text style={{ ...textStyles.label, color: colors.textSecondary }}>
          Next booking
        </Text>
      </View>

      {/* Service title */}
      <Text
        style={{ ...textStyles['title-lg'], color: colors.textPrimary, marginBottom: 6 }}
      >
        {serviceLabel(job.serviceType)}
      </Text>

      {/* Scheduled date */}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}
      >
        <Clock size={13} color={colors.textTertiary} />
        <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
          {formatScheduledAt(job.scheduledAt)}
        </Text>
      </View>

      {/* Provider name + trust */}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}
      >
        <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
          {job.providerName}
        </Text>
        <TrustChip score={job.providerScore} />
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12 }} />

      {/* "View details" affordance row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 13,
            lineHeight: 19,
            color: colors.primary[600],
          }}
        >
          View details
        </Text>
        <ChevronRight size={16} color={colors.primary[600]} />
      </View>
    </AnimatedPressable>
  );
}

// ─── Branch 3: NUDGE CARD ─────────────────────────────────────────────────────
// Shown when !job.
// Warm LinearGradient (accent[50] → surface), verbatim title/body from parent,
// primary Button CTA.

function NudgeCard({ nudge }: { nudge: AdaptiveHeroProps['nudge'] }) {
  return (
    <LinearGradient
      colors={[colors.accent[50], colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { borderRadius: 16, padding: 18 },
        shadows.sm,
      ]}
    >
      <Text
        style={{ ...textStyles['title-lg'], color: colors.textPrimary, marginBottom: 8 }}
      >
        {nudge.title}
      </Text>
      <Text
        style={{
          ...textStyles['body-md'],
          color: colors.textSecondary,
          marginBottom: 18,
        }}
      >
        {nudge.body}
      </Text>
      <Button label={nudge.ctaLabel} size="md" onPress={nudge.onCta} />
    </LinearGradient>
  );
}

// ─── Branch 4: MAINTENANCE CARD ───────────────────────────────────────────────
// Shown when there's no active job but the home has a due/overdue/suggested item.
// Carries the confirm-loop: Book it (primary) + "Already handled" (resets cadence).

const REMINDER_META: Record<ReminderStatus, { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: colors.error },
  due_soon: { label: 'Due soon', color: colors.accent[600] },
  recommended: { label: 'Suggested', color: colors.textSecondary },
};

function MaintenanceCard({
  reminder,
  onBook,
  onHandled,
  onOpen,
}: {
  reminder: Reminder;
  onBook: (s: ServiceType) => void;
  onHandled: (s: ServiceType) => void;
  onOpen: () => void;
}) {
  const meta = REMINDER_META[reminder.status];
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          padding: 16,
        },
        shadows.md,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Leaf size={14} color={meta.color} />
        <Text style={{ ...textStyles.label, color: meta.color }}>{meta.label} · home upkeep</Text>
      </View>
      <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary, marginBottom: 4 }}>
        {reminder.title}
      </Text>
      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginBottom: 14 }}>
        {reminder.reason}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Button label="Book it" size="md" fullWidth onPress={() => onBook(reminder.serviceType)} />
        </View>
        <Pressable
          onPress={() => onHandled(reminder.serviceType)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Already handled"
          style={WEB_CURSOR}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textSecondary }}>
            Already handled
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={onOpen}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="See all reminders"
        style={[{ marginTop: 12, alignSelf: 'flex-start' }, WEB_CURSOR]}
      >
        <Text style={{ ...textStyles['body-sm'], color: colors.primary[600] }}>See all reminders ›</Text>
      </Pressable>
    </View>
  );
}

// ─── AdaptiveHero ─────────────────────────────────────────────────────────────

export function AdaptiveHero({
  job,
  isLive,
  onPressJob,
  nudge,
  topReminder,
  onBookReminder,
  onHandledReminder,
  onOpenReminders,
}: AdaptiveHeroProps): React.JSX.Element {
  if (job && isLive) {
    return <LiveHeroCard job={job} onPressJob={onPressJob} />;
  }
  // Overdue / due-soon maintenance outranks a non-live upcoming booking; a
  // 'recommended' (not-yet-due) reminder yields to the booking.
  const reminderOutranksBooking =
    !!topReminder &&
    topReminder.status !== 'recommended' &&
    !!onBookReminder &&
    !!onHandledReminder;
  if (job && !reminderOutranksBooking) {
    return <NextBookingCard job={job} onPressJob={onPressJob} />;
  }
  if (topReminder && onBookReminder && onHandledReminder) {
    return (
      <MaintenanceCard
        reminder={topReminder}
        onBook={onBookReminder}
        onHandled={onHandledReminder}
        onOpen={onOpenReminders ?? (() => {})}
      />
    );
  }
  if (job) {
    return <NextBookingCard job={job} onPressJob={onPressJob} />;
  }
  return <NudgeCard nudge={nudge} />;
}

export default AdaptiveHero;

import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { MapPin, TrendingUp, Navigation, ChevronRight, Bell } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Section } from '../../../components/ui/Section';
import {
  TrustSummary,
  EmptyState,
  QueryErrorState,
  SkeletonLoader,
} from '../../../components/shared';
import { StatusPill } from '../../../components/shared/StatusPill';
import { ProviderCheckIn } from '../../../components/checkin/ProviderCheckIn';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enterStaggered } from '../../../lib/motion';
import { useAuthStore } from '../../../stores/authStore';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';
import * as jobsApi from '../../../lib/api/jobs';
import * as providersApi from '../../../lib/api/providers';
import * as completionsApi from '../../../lib/api/completions';
import * as notificationsApi from '../../../lib/api/notifications';
import type { TextStyle } from 'react-native';
import type { Job, JobStatus, ServiceType } from '../../../lib/types';
import { SERVICE_LABELS as SERVICE_LABEL } from '../../../lib/constants';
import { colors, textStyles, numericTabular, fonts } from '../../../tokens';

// ─── Utilities ────────────────────────────────────────────────────────────────

function jobCountWord(n: number): string {
  if (n === 0) return 'No jobs';
  if (n === 1) return 'One job';
  if (n === 2) return 'Two jobs';
  if (n === 3) return 'Three jobs';
  if (n === 4) return 'Four jobs';
  if (n === 5) return 'Five jobs';
  return `${n} jobs`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TodayJob = {
  id: string;
  serviceType: ServiceType;
  scheduledAt: string;
  street?: string;
  driveTimeMinutes?: number;
  /** Net payout: Math.round(amountCents * 0.9) */
  payoutCents: number;
  status: JobStatus;
};

// ─── UpcomingDayRow ───────────────────────────────────────────────────────────

function UpcomingDayRow({
  dateKey,
  jobs,
  isLast,
}: {
  dateKey: string;
  jobs: Job[];
  isLast: boolean;
}) {
  const router = useRouter();
  const date = parseISO(dateKey);
  const totalNetCents = Math.round(
    jobs.reduce((s, j) => s + j.amountCents, 0) * 0.9
  );
  return (
    <Pressable
      onPress={() => router.push('/(provider)/(tabs)/schedule')}
      accessibilityLabel={`${format(date, 'EEEE MMMM d')}, ${jobs.length === 1 ? '1 job' : `${jobs.length} jobs`}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.divider,
        gap: 12,
      }}
    >
      <View style={{ width: 44 }}>
        <Text
          style={{
            fontFamily: fonts.displaySemibold,
            fontSize: 22,
            fontWeight: '600',
            color: colors.textPrimary,
            ...numericTabular,
            lineHeight: 26,
          } as TextStyle}
        >
          {format(date, 'd')}
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 10,
            color: colors.textTertiary,
            textTransform: 'lowercase',
          } as TextStyle}
        >
          {format(date, 'EEE').toLowerCase()}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
          {jobs.length === 1 ? '1 job' : `${jobs.length} jobs`}
        </Text>
        <Text
          style={{ ...textStyles['body-sm'], color: colors.textSecondary }}
          numberOfLines={1}
        >
          {[...new Set(jobs.map((j) => SERVICE_LABEL[j.serviceType]))].join(' · ')}
        </Text>
      </View>

      <Text
        style={{
          fontFamily: fonts.displaySemibold,
          fontSize: 14,
          fontWeight: '600',
          color: colors.success,
          ...numericTabular,
        } as TextStyle}
      >
        ${(totalNetCents / 100).toFixed(0)}
      </Text>
      <ChevronRight size={14} color={colors.textTertiary} />
    </Pressable>
  );
}

// ─── PressableJobRow ──────────────────────────────────────────────────────────

function PressableJobRow({
  job,
  onPress,
  index,
}: {
  job: TodayJob;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = () => {
    if (Platform.OS !== 'web') {
      scale.value = withTiming(0.985, { duration: 100 });
      opacity.value = withTiming(0.93, { duration: 100 });
    }
  };
  const onPressOut = () => {
    if (Platform.OS !== 'web') {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 150 });
    }
  };

  return (
    <Animated.View entering={enterStaggered(index)} style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityLabel={`${SERVICE_LABEL[job.serviceType]}, ${format(new Date(job.scheduledAt), 'h:mm a')}, ${job.status}`}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          {/* Time + status pill row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text
              style={{
                fontFamily: fonts.displaySemibold,
                fontSize: 15,
                fontStyle: 'italic',
                color: colors.accent[600],
                lineHeight: 20,
                ...numericTabular,
              } as TextStyle}
            >
              {format(new Date(job.scheduledAt), 'h:mm a')}
            </Text>
            <StatusPill status={job.status} />
          </View>

          <Text
            style={{
              ...textStyles['title-md'],
              color: colors.textPrimary,
              lineHeight: 22,
            }}
          >
            {SERVICE_LABEL[job.serviceType]}
          </Text>

          {job.street ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} color={colors.textTertiary} />
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: colors.textTertiary,
                  lineHeight: 18,
                } as TextStyle}
              >
                {job.street}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 17,
              fontWeight: '700',
              color: colors.success,
              ...numericTabular,
            } as TextStyle}
          >
            +${(job.payoutCents / 100).toFixed(2)}
          </Text>
          {job.driveTimeMinutes != null ? (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 11,
                color: colors.textTertiary,
                ...numericTabular,
              } as TextStyle}
            >
              {job.driveTimeMinutes}m drive
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProviderTodayScreen() {
  const router = useRouter();
  const { user, providerId, onboardingComplete } = useAuthStore();
  // Resume onboarding at the step the provider last left off (persisted), not step 1.
  const onboardingStep = useProviderOnboardingStore((s) => s.lastStep);
  const [checkInJobId, setCheckInJobId] = useState<string | null>(null);
  const [checkInPayoutCents, setCheckInPayoutCents] = useState(0);
  const isDesktop = useBreakpoint() === 'desktop';
  const queryClient = useQueryClient();

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const todayDateStr = format(today, 'yyyy-MM-dd');

  // ── Queries ────────────────────────────────────────────────────────────────

  const {
    data: allJobs = [],
    isLoading: jobsLoading,
    isError: jobsError,
    refetch: refetchJobs,
  } = useQuery<Job[]>({
    queryKey: ['provider', 'jobs', providerId],
    queryFn: () => jobsApi.listForProvider(providerId ?? ''),
    enabled: !!providerId,
  });

  // Completion ledger — source of truth for today's net earnings and jobs done.
  const {
    data: todayLedger,
    isLoading: ledgerLoading,
  } = useQuery({
    queryKey: ['provider', 'today-ledger', providerId, todayDateStr],
    queryFn: () =>
      completionsApi.fetchProviderTodayCompletions(providerId!, todayStart, todayEnd),
    enabled: !!providerId,
  });

  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['notifications', 'unread', user?.id],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: providerProfile } = useQuery({
    queryKey: ['provider', 'detail', providerId],
    queryFn: () => {
      if (!providerId) return null;
      return providersApi.detail(providerId);
    },
    enabled: !!providerId,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const todayJobs: TodayJob[] = allJobs
    .filter((j) => {
      const d = new Date(j.scheduledAt);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    })
    .map((j) => ({
      id: j.id,
      serviceType: j.serviceType,
      scheduledAt: j.scheduledAt,
      // homeownerNeighborhood is the best location identifier available on Job
      street: j.homeownerNeighborhood ?? undefined,
      driveTimeMinutes: undefined,
      // Net 90% — provider's payout after platform fee
      payoutCents: Math.round(j.amountCents * 0.9),
      status: j.status,
    }));

  const jobCount = todayJobs.length;

  // First job today that is not completed or cancelled
  const firstIncompleteJob = todayJobs.find(
    (j) => j.status !== 'completed' && j.status !== 'cancelled'
  );

  // Upcoming = everything after end of today
  const upcomingJobs = allJobs.filter(
    (j) => new Date(j.scheduledAt) > endOfDay(today)
  );

  const upcomingByDate = upcomingJobs.reduce<Record<string, Job[]>>((acc, j) => {
    const key = format(new Date(j.scheduledAt), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(j);
    return acc;
  }, {});

  const upcomingDates = Object.keys(upcomingByDate).sort().slice(0, 5);

  // Use compositeScore.overall from the DB directly; do not recompute client-side
  const compositeScore = providerProfile?.compositeScore ?? null;

  // KPI items — sources per spec §5.3
  const kpiItems: { value: string; label: string }[] = [
    {
      value: todayLedger ? `$${(todayLedger.netCents / 100).toFixed(0)}` : '—',
      label: "today's net",
    },
    {
      value: todayLedger ? `${todayLedger.jobsDone}` : '—',
      label: 'done',
    },
    {
      value: compositeScore?.overall ? compositeScore.overall.toFixed(1) : '—',
      label: 'trust score',
    },
  ];

  // ── Mutation ───────────────────────────────────────────────────────────────

  const { mutate: markEnRoute, isPending: enRoutePending } = useMutation({
    mutationFn: () => jobsApi.setStatus(firstIncompleteJob!.id, 'en_route'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'jobs', providerId] });
    },
    onError: () => Alert.alert('Status update failed', 'Please try again.'),
  });

  // After a check-in completes (writes completion_ledger), refresh the KPI strip,
  // jobs, and trust score — otherwise today's net/jobs-done stay stale until remount.
  const handleCheckInClose = () => {
    setCheckInJobId(null);
    queryClient.invalidateQueries({ queryKey: ['provider', 'today-ledger', providerId, todayDateStr] });
    queryClient.invalidateQueries({ queryKey: ['provider', 'jobs', providerId] });
    queryClient.invalidateQueries({ queryKey: ['provider', 'detail', providerId] });
  };

  // ── Section renders ────────────────────────────────────────────────────────

  const HeroSection = (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
          {'today · ' + format(today, 'EEEE, MMMM d').toLowerCase()}
        </Text>
        <Pressable
          onPress={() => router.push('/(provider)/notifications')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'
          }
          style={[{ padding: 4 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <Bell size={22} color={colors.textPrimary} />
          {unreadNotifications > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 3,
                borderRadius: 8,
                backgroundColor: colors.error,
                borderWidth: 1.5,
                borderColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 9, color: colors.textInverse }}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <Text
        style={{
          fontFamily: fonts.editorial,
          fontSize: isDesktop ? 40 : 32,
          fontWeight: '700',
          lineHeight: isDesktop ? 46 : 38,
          letterSpacing: -1,
          color: colors.textPrimary,
        } as TextStyle}
      >
        {jobCount === 0
          ? 'Quiet morning.'
          : jobCount === 1
          ? 'One job today.'
          : `${jobCountWord(jobCount)} on the block.`}
      </Text>
      <View
        style={{
          height: 1.5,
          backgroundColor: colors.accent[400],
          width: 48,
          marginTop: 2,
        }}
      />
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          fontStyle: 'italic',
          color: colors.textSecondary,
          lineHeight: 18,
        } as TextStyle}
      >
        {jobCount === 0
          ? 'No jobs scheduled — your next one shows up here when it routes.'
          : firstIncompleteJob
          ? `first up at ${format(new Date(firstIncompleteJob.scheduledAt), 'h:mm a').toLowerCase()}.`
          : 'all done for today.'}
      </Text>
    </View>
  );

  // KPI strip — horizontal for mobile. Only shown when jobs exist and no ledger error.
  // Show the strip on job-days even if the ledger query errored — the KPI values
  // fall back to '—' rather than the whole strip vanishing.
  const showKpiStrip = onboardingComplete && todayJobs.length > 0;

  const KPIStrip = showKpiStrip ? (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {kpiItems.map((kpi, i) => (
        <View
          key={kpi.label}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 8,
            borderLeftWidth: i === 0 ? 0 : 1,
            borderLeftColor: colors.divider,
          }}
        >
          {/* Skeleton while ledger loads for the two ledger-backed stats */}
          {ledgerLoading && i < 2 ? (
            <SkeletonLoader width={44} height={26} borderRadius={4} />
          ) : (
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                fontWeight: '700',
                lineHeight: 32,
                color: colors.textPrimary,
                ...numericTabular,
              } as TextStyle}
            >
              {kpi.value}
            </Text>
          )}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 10,
              fontStyle: 'italic',
              color: colors.textTertiary,
              marginTop: 3,
              textAlign: 'center',
            } as TextStyle}
          >
            {kpi.label}
          </Text>
        </View>
      ))}
    </View>
  ) : null;

  // KPI — desktop stacked vertical layout (right sidebar is narrower)
  const KPIDesktopStack =
    onboardingComplete && todayJobs.length > 0 ? (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {kpiItems.map((kpi, i) => (
          <View
            key={kpi.label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.divider,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 10,
                fontStyle: 'italic',
                color: colors.textTertiary,
              } as TextStyle}
            >
              {kpi.label}
            </Text>
            {ledgerLoading && i < 2 ? (
              <SkeletonLoader width={44} height={18} borderRadius={4} />
            ) : (
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  ...numericTabular,
                } as TextStyle}
              >
                {kpi.value}
              </Text>
            )}
          </View>
        ))}
      </View>
    ) : null;

  // Next Job Context Bar — slim 1-row card; taps navigate to jobs tab
  const NextJobContextBar = firstIncompleteJob ? (
    <Pressable
      onPress={() => router.push('/(provider)/(tabs)/jobs')}
      accessibilityLabel={`Next job: ${SERVICE_LABEL[firstIncompleteJob.serviceType]} at ${format(new Date(firstIncompleteJob.scheduledAt), 'h:mm a')}`}
      hitSlop={4}
    >
      <Card
        variant="outlined"
        style={{ paddingVertical: 12, paddingHorizontal: 14 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <StatusPill status={firstIncompleteJob.status} />
          <Text
            style={{ ...textStyles['body-sm'], flex: 1, color: colors.textPrimary }}
            numberOfLines={1}
          >
            {format(new Date(firstIncompleteJob.scheduledAt), 'h:mm a')}
            {' · '}
            {SERVICE_LABEL[firstIncompleteJob.serviceType]}
            {firstIncompleteJob.street ? ' · ' + firstIncompleteJob.street : ''}
          </Text>
          {firstIncompleteJob.driveTimeMinutes != null && (
            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.textTertiary,
                ...numericTabular,
              }}
            >
              {firstIncompleteJob.driveTimeMinutes}m
            </Text>
          )}
          <Navigation size={14} color={colors.primary[600]} />
        </View>
      </Card>
    </Pressable>
  ) : null;

  // Smart Action Button — context-aware CTA replacing the old no-op "Start day" button
  let SmartActionButton: React.ReactNode = null;
  if (firstIncompleteJob?.status === 'booked' || firstIncompleteJob?.status === 'confirmed') {
    SmartActionButton = (
      <Button
        label="I'm heading out →"
        fullWidth
        size="lg"
        loading={enRoutePending}
        onPress={() => markEnRoute()}
        accessibilityLabel="Mark as heading out to first job"
      />
    );
  } else if (firstIncompleteJob?.status === 'en_route') {
    SmartActionButton = (
      <Button
        label="I've arrived — check in"
        fullWidth
        size="lg"
        onPress={() => {
          setCheckInJobId(firstIncompleteJob.id);
          setCheckInPayoutCents(firstIncompleteJob.payoutCents);
        }}
        accessibilityLabel="Open check-in for arrived job"
      />
    );
  } else if (firstIncompleteJob?.status === 'in_progress') {
    SmartActionButton = (
      <Button
        label="Submit check-in"
        fullWidth
        size="lg"
        onPress={() => {
          setCheckInJobId(firstIncompleteJob.id);
          setCheckInPayoutCents(firstIncompleteJob.payoutCents);
        }}
        accessibilityLabel="Submit check-in for in-progress job"
      />
    );
  }

  // Today's Jobs Section
  const TodayJobsSection = (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
          {"Today's jobs"}
        </Text>
        {todayJobs.length > 0 ? (
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.textSecondary,
              ...numericTabular,
            }}
          >
            {`$${(todayJobs.reduce((s, j) => s + j.payoutCents, 0) / 100).toFixed(0)} potential`}
          </Text>
        ) : null}
      </View>

      {jobsError ? (
        <QueryErrorState onRetry={() => refetchJobs()} />
      ) : jobsLoading ? (
        <Card>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            Loading…
          </Text>
        </Card>
      ) : todayJobs.length === 0 ? (
        <EmptyState
          heading="Quiet morning"
          body="No jobs today — your next one will appear here when it routes."
          ctaLabel="Browse schedule"
          onCta={() => router.push('/(provider)/(tabs)/schedule')}
        />
      ) : (
        todayJobs.map((job, i) => (
          <PressableJobRow
            key={job.id}
            job={job}
            onPress={() => {
              // Only open check-in modal for actionable statuses
              if (job.status === 'in_progress' || job.status === 'en_route') {
                setCheckInJobId(job.id);
                setCheckInPayoutCents(job.payoutCents);
              }
            }}
            index={i}
          />
        ))
      )}
    </View>
  );

  // Upcoming Section — FIXED to actually render rows (was previously broken)
  const UpcomingSection = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
          Upcoming
        </Text>
        <Pressable
          onPress={() => router.push('/(provider)/(tabs)/schedule')}
          hitSlop={6}
          accessibilityLabel="View full schedule"
        >
          <Text
            style={{
              ...textStyles['body-sm'],
              fontFamily: fonts.bodySemibold,
              fontWeight: '600',
              color: colors.primary[600],
            }}
          >
            Full schedule
          </Text>
        </Pressable>
      </View>

      {upcomingDates.length === 0 ? (
        <Card>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            Nothing scheduled yet — open schedule to set availability.
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {upcomingDates.map((dateKey, i) => (
            <UpcomingDayRow
              key={dateKey}
              dateKey={dateKey}
              jobs={upcomingByDate[dateKey]}
              isLast={i === upcomingDates.length - 1}
            />
          ))}
        </Card>
      )}
    </View>
  );

  // Trust Card — uses compositeScore.overall from DB directly, not client-side recompute
  const TrustCard = compositeScore ? (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
          Your trust score
        </Text>
        <TrendingUp size={14} color={colors.success} />
      </View>
      <View style={{ paddingVertical: 4 }}>
        <TrustSummary
          variant="detail"
          overall={compositeScore.overall}
          checkInCount={providerProfile?.checkInCount ?? 0}
        />
      </View>
    </Card>
  ) : (
    <Card>
      <Text
        style={{
          ...textStyles['body-md'],
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        Complete your first job to build your trust score.
      </Text>
    </Card>
  );

  // Onboarding Banner
  const OnboardingBanner = (
    <View
      style={{
        backgroundColor: colors.primary[50],
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.primary[200],
        padding: 24,
        gap: 12,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.displaySemibold,
          fontSize: 18,
          fontWeight: '600',
          color: colors.primary[900],
          lineHeight: 24,
        } as TextStyle}
      >
        Finish setting up your profile
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          fontStyle: 'italic',
          color: colors.textSecondary,
          lineHeight: 20,
        } as TextStyle}
      >
        {"You won't receive job requests or appear to homeowners until your setup is complete."}
      </Text>
      <Pressable
        onPress={() => router.push(`/(provider)/onboarding/${onboardingStep}` as never)}
        style={{
          backgroundColor: colors.primary[700],
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.displaySemibold,
            fontSize: 15,
            fontWeight: '600',
            color: colors.textInverse,
            letterSpacing: 0.2,
          } as TextStyle}
        >
          Continue setup
        </Text>
      </Pressable>
    </View>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  // Left col: TodayJobs + Upcoming + SmartAction
  // Right col: KPI (stacked) + NextJobBar + TrustCard
  if (isDesktop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ScrollView>
          <Section tight>
            {HeroSection}
          </Section>
          <Section tight>
            <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
              <View style={{ flex: 2, gap: 24 }}>
                {onboardingComplete ? (
                  <>
                    {TodayJobsSection}
                    {UpcomingSection}
                    {SmartActionButton}
                  </>
                ) : (
                  OnboardingBanner
                )}
              </View>
              <View style={{ flex: 1, gap: 16 }}>
                {onboardingComplete ? (
                  <>
                    {KPIDesktopStack}
                    {firstIncompleteJob ? NextJobContextBar : null}
                    {TrustCard}
                  </>
                ) : null}
              </View>
            </View>
          </Section>
        </ScrollView>
        {checkInJobId ? (
          <ProviderCheckIn
            visible={!!checkInJobId}
            onClose={handleCheckInClose}
            jobId={checkInJobId}
            payoutCents={checkInPayoutCents}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  // paddingTop: 28 (up from 20) for breathing room below safe area on Dynamic Island
  // gap: 20 on inner View — not on ScrollView contentContainerStyle
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 28,
          paddingBottom: 36,
        }}
      >
        <View style={{ gap: 20 }}>
          {HeroSection}
          {onboardingComplete ? (
            <>
              {KPIStrip}
              {firstIncompleteJob ? NextJobContextBar : null}
              {SmartActionButton}
              {TodayJobsSection}
              {UpcomingSection}
              {TrustCard}
            </>
          ) : (
            OnboardingBanner
          )}
        </View>
      </ScrollView>

      {checkInJobId ? (
        <ProviderCheckIn
          visible={!!checkInJobId}
          onClose={handleCheckInClose}
          jobId={checkInJobId}
          payoutCents={checkInPayoutCents}
        />
      ) : null}
    </SafeAreaView>
  );
}

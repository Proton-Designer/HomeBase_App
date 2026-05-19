import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { MapPin, ChevronRight, TrendingUp } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Section } from '../../../components/ui/Section';
import { Pill } from '../../../components/ui/Pill';
import { TrustScoreDisplay } from '../../../components/shared';
import { EmptyState } from '../../../components/shared';
import { ProviderCheckIn } from '../../../components/checkin/ProviderCheckIn';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enterStaggered } from '../../../lib/motion';
import { useAuthStore } from '../../../stores/authStore';
import * as jobsApi from '../../../lib/api/jobs';
import * as providersApi from '../../../lib/api/providers';
import type { TextStyle } from 'react-native';
import type { Job } from '../../../lib/types';
import { colors, textStyles, numericTabular, fonts } from '../../../tokens';

const SERVICE_LABEL: Record<string, string> = {
  lawn: 'Lawn Care',
  cleaning: 'Cleaning',
  pool: 'Pool Cleaning',
  pest: 'Pest Control',
  pressure: 'Pressure Washing',
  window: 'Window Cleaning',
};

function jobCountWord(n: number): string {
  if (n === 0) return 'No jobs';
  if (n === 1) return 'One job';
  if (n === 2) return 'Two jobs';
  if (n === 3) return 'Three jobs';
  if (n === 4) return 'Four jobs';
  if (n === 5) return 'Five jobs';
  return `${n} jobs`;
}

type TodayJob = {
  id: string;
  serviceType: string;
  scheduledAt: string;
  street?: string;
  neighborhood?: string;
  driveTimeMinutes?: number;
  payoutCents: number;
  status: string;
};

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
          <Text
            style={{
              ...textStyles['title-md'],
              color: colors.textPrimary,
              lineHeight: 22,
            }}
          >
            {SERVICE_LABEL[job.serviceType] ?? job.serviceType}
          </Text>
          {(job.street || job.neighborhood) ? (
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
                {[job.street, job.neighborhood].filter(Boolean).join(' · ')}
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

export default function ProviderTodayScreen() {
  const router = useRouter();
  const { providerId } = useAuthStore();
  const [checkInJobId, setCheckInJobId] = useState<string | null>(null);
  const [checkInPayoutCents, setCheckInPayoutCents] = useState(0);
  const isDesktop = useBreakpoint() === 'desktop';

  const today = new Date();

  // Fetch today's jobs
  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['provider', 'jobs', providerId],
    queryFn: () => jobsApi.listForProvider(providerId ?? ''),
    enabled: !!providerId,
  });

  // Map API Job → TodayJob shape
  const todayJobs: TodayJob[] = (allJobs as unknown as Array<Record<string, unknown>>)
    .filter((j) => {
      const d = new Date(j.scheduledAt as string);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    })
    .map((j) => ({
      id: j.id as string,
      serviceType: (j.serviceType as string) ?? '',
      scheduledAt: j.scheduledAt as string,
      street: (j.street as string | undefined),
      neighborhood: (j.neighborhood as string | undefined),
      driveTimeMinutes: (j.driveTimeMinutes as number | undefined),
      payoutCents: ((j.payoutCents ?? j.amountCents) as number) ?? 0,
      status: (j.status as string) ?? '',
    }));

  // Fetch provider profile for trust scores
  const { data: providerProfile } = useQuery({
    queryKey: ['provider', 'detail', providerId],
    queryFn: () => {
      if (!providerId) return null;
      return providersApi.detail(providerId);
    },
    enabled: !!providerId,
  });

  const trustScores = providerProfile?.compositeScore
    ? {
        reliability: providerProfile.compositeScore.reliability,
        quality: providerProfile.compositeScore.quality,
        communication: providerProfile.compositeScore.communication,
        professionalism: providerProfile.compositeScore.professionalism,
      }
    : null;

  const overallTrust = trustScores
    ? trustScores.reliability * 0.35 +
      trustScores.quality * 0.35 +
      trustScores.communication * 0.2 +
      trustScores.professionalism * 0.1
    : null;

  // Earnings today: sum payouts from completed jobs today
  const todayEarningsCents = todayJobs
    .filter((j) => j.status === 'completed')
    .reduce((sum, j) => sum + j.payoutCents, 0);

  const jobCount = todayJobs.length;

  const KPIStrip = (
    <View
      style={{
        flexDirection: 'row',
        gap: 0,
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {[
        { value: `$${(todayEarningsCents / 100).toFixed(0)}`, label: "today's earnings" },
        { value: `${todayJobs.filter((j) => j.status === 'completed').length}`, label: 'jobs done' },
        { value: overallTrust != null ? overallTrust.toFixed(1) : '—', label: 'avg trust score' },
      ].map((kpi, i) => (
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
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 36,
              fontWeight: '700',
              lineHeight: 40,
              color: colors.textPrimary,
              ...numericTabular,
            } as TextStyle}
          >
            {kpi.value}
          </Text>
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
  );

  const HeroSection = (
    <View style={{ gap: 10 }}>
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
        {jobCount === 0 ? 'Your next job will appear here when it routes.' : 'your route is set.'}
      </Text>
    </View>
  );

  const TodayJobsSection = (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          ...textStyles['title-lg'],
          color: colors.textPrimary,
        }}
      >
        Today's jobs
      </Text>
      {jobsLoading ? (
        <Card>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
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
              setCheckInJobId(job.id);
              setCheckInPayoutCents(job.payoutCents);
            }}
            index={i}
          />
        ))
      )}
    </View>
  );

  const UpcomingSection = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
          Upcoming
        </Text>
        <Pressable onPress={() => router.push('/(provider)/(tabs)/schedule')} hitSlop={6}>
          <Text
            style={{
              ...textStyles['body-sm'],
              fontFamily: fonts.bodySemibold,
              fontWeight: '600',
              color: colors.primary[600],
            }}
          >
            See schedule
          </Text>
        </Pressable>
      </View>
      {/* Upcoming rows come from the schedule — no hardcoded data */}
      {(allJobs as unknown as Array<Record<string, unknown>>).filter((j) => {
        const d = new Date(j.scheduledAt as string);
        return d > today;
      }).length === 0 ? (
        <Card>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
            No upcoming jobs — open schedule to add availability.
          </Text>
        </Card>
      ) : null}
    </View>
  );

  const TrustCard = trustScores ? (
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
          Your HomeBase score
        </Text>
        <TrendingUp size={14} color={colors.success} />
      </View>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <Text
          style={{
            fontFamily: fonts.editorial,
            fontSize: 44,
            fontWeight: '700',
            lineHeight: 48,
            color: colors.textPrimary,
            ...numericTabular,
          } as TextStyle}
        >
          {overallTrust?.toFixed(1)}
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            fontStyle: 'italic',
            color: colors.textSecondary,
            marginTop: 2,
          } as TextStyle}
        >
          composite
        </Text>
      </View>
      <TrustScoreDisplay scores={trustScores} size="sm" showOverall={false} />
    </Card>
  ) : (
    <Card>
      <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
        Complete your first job to build your trust score.
      </Text>
    </Card>
  );

  const StartDayButton = todayJobs.length > 0 ? (
    <Pressable
      onPress={() => {}}
      style={{
        backgroundColor: colors.primary[700],
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.displaySemibold,
          fontSize: 16,
          fontWeight: '600',
          color: colors.textInverse,
          letterSpacing: 0.2,
        } as TextStyle}
      >
        Start day
      </Text>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 18,
          fontWeight: '700',
          color: colors.accent[300],
        } as TextStyle}
      >
        →
      </Text>
    </Pressable>
  ) : null;

  if (isDesktop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ScrollView>
          <Section tight>
            {HeroSection}
          </Section>
          <Section tight>
            {KPIStrip}
          </Section>
          <Section tight>
            <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
              <View style={{ flex: 2, gap: 24 }}>
                {TodayJobsSection}
                {UpcomingSection}
                {StartDayButton}
              </View>
              <View style={{ flex: 1, gap: 16 }}>
                {TrustCard}
              </View>
            </View>
          </Section>
        </ScrollView>
        {checkInJobId ? (
          <ProviderCheckIn
            visible={!!checkInJobId}
            onClose={() => setCheckInJobId(null)}
            jobId={checkInJobId}
            payoutCents={checkInPayoutCents}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 36 }}>
        {HeroSection}
        {KPIStrip}
        {TodayJobsSection}
        {UpcomingSection}
        {TrustCard}
        {StartDayButton}
      </ScrollView>

      {checkInJobId ? (
        <ProviderCheckIn
          visible={!!checkInJobId}
          onClose={() => setCheckInJobId(null)}
          jobId={checkInJobId}
          payoutCents={checkInPayoutCents}
        />
      ) : null}
    </SafeAreaView>
  );
}

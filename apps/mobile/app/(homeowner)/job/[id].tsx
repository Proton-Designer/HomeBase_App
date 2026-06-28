import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '../../../lib/useSafeBack';
import { ChevronLeft, MessageCircle, AlertOctagon } from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';
import Animated from 'react-native-reanimated';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill, type PillTone } from '../../../components/ui/Pill';
import { JobStatusTimeline, ProviderCard, SkeletonLoader, EmptyState, QueryErrorState } from '../../../components/shared';
import { HomeownerCheckIn } from '../../../components/checkin/HomeownerCheckIn';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeToJobStatus } from '../../../lib/api/realtime';
import { submitHomeownerCheckIn } from '../../../lib/api/bookings';
import * as api from '../../../lib/api';
import { enter } from '../../../lib/motion';
import { SERVICE_LABELS as SERVICE_LABEL } from '../../../lib/constants';
import { colors, textStyles, numericTabular } from '../../../tokens';
import type { JobStatus } from '../../../lib/types';

const STATUS_TONE: Record<JobStatus, { tone: PillTone; label: string }> = {
  booked: { tone: 'neutral', label: 'Booked' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  en_route: { tone: 'accent', label: 'En route' },
  in_progress: { tone: 'info', label: 'In progress' },
  completed: { tone: 'neutral', label: 'Completed' },
  cancelled: { tone: 'error', label: 'Cancelled' },
};

export default function JobDetailScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { data: job, isLoading: jobLoading, isError: jobError, refetch: refetchJob } = useQuery({
    queryKey: ['jobs', id],
    queryFn: () => api.jobs.detail(id as string),
    enabled: !!id,
  });

  const { data: provider, isLoading: providerLoading, isError: providerError, refetch: refetchProvider } = useQuery({
    queryKey: ['providers', 'detail', job?.providerId],
    queryFn: () => api.providers.detail(job!.providerId),
    enabled: !!job?.providerId,
  });

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToJobStatus(id, () => {
      qc.invalidateQueries({ queryKey: ['jobs', id] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    });
    return unsubscribe;
  }, [id, qc]);

  const isLoading = jobLoading || providerLoading;
  const isError = jobError || providerError;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: 24, gap: 18 }}>
          <SkeletonLoader width="60%" height={14} borderRadius={6} />
          <SkeletonLoader width="80%" height={30} borderRadius={8} />
          <SkeletonLoader width="100%" height={120} borderRadius={14} />
          <SkeletonLoader width="100%" height={80} borderRadius={14} />
          <SkeletonLoader width="100%" height={100} borderRadius={14} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <QueryErrorState
          onRetry={() => {
            if (jobError) void refetchJob();
            if (providerError) void refetchProvider();
          }}
        />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState
          heading="Job not found"
          body="This job may no longer be available."
          ctaLabel="Back to jobs"
          onCta={() => router.replace('/(homeowner)/(tabs)/jobs')}
        />
      </SafeAreaView>
    );
  }

  const completedAt = job.timestamps.completed ? new Date(job.timestamps.completed) : null;
  const within48h = completedAt && Date.now() - completedAt.getTime() < 48 * 60 * 60 * 1000;
  const checkInEligible = job.status === 'completed' && within48h && !reviewSubmitted;
  const m = STATUS_TONE[job.status];
  const serviceLabel = SERVICE_LABEL[job.serviceType] ?? 'Service';

  const lastEventTime = (
    job.timestamps.completed ??
    job.timestamps.in_progress ??
    job.timestamps.en_route ??
    job.timestamps.confirmed ??
    job.timestamps.booked
  );
  const updatedAgo = lastEventTime
    ? formatDistanceToNow(new Date(lastEventTime), { addSuffix: true })
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingTop: 6,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 18,
          maxWidth: 720,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        {/* Hero eyebrow + title */}
        <Animated.View
          entering={enter}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 10 }}>
            <Text
              style={{
                fontFamily: 'Fraunces_400Regular',
                fontSize: 12,
                fontStyle: 'italic',
                color: colors.accent[600],
                letterSpacing: 0.4,
              }}
            >
              JOB · #{job.id.toUpperCase()}
            </Text>
            <Text
              style={{
                ...textStyles['editorial-title'],
                color: colors.textPrimary,
              }}
            >
              {serviceLabel}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Pill label={m.label} tone={m.tone} />
            {updatedAgo ? (
              <Text
                style={{
                  fontFamily: 'Fraunces_400Regular',
                  fontSize: 11,
                  fontStyle: 'italic',
                  color: colors.textTertiary,
                }}
              >
                as of {updatedAgo}
              </Text>
            ) : null}
          </View>
        </Animated.View>

        <Card>
          <Text
            style={{
              ...textStyles.label,
              color: colors.textSecondary,
              marginBottom: 6,
            }}
          >
            Status
          </Text>
          <JobStatusTimeline currentStatus={job.status} timestamps={job.timestamps} />
        </Card>

        {provider ? <ProviderCard provider={provider} variant="standard" /> : null}

        <Card>
          <Text
            style={{
              ...textStyles.label,
              color: colors.textSecondary,
              marginBottom: 8,
            }}
          >
            Service details
          </Text>
          <DetailRow label="When" value={format(new Date(job.scheduledAt), "EEE, MMM d 'at' h:mm a")} />
          <DetailRow label="Address" value={job.addressFormatted ?? '—'} />
          <DetailRow
            label="Total"
            value={`$${(job.amountCents / 100).toFixed(2)}`}
            valueNumeric
          />
        </Card>

        <View style={{ gap: 10 }}>
          {provider ? (
            <Button
              label={`Message ${provider.name.split(' ')[0]}`}
              variant="outline"
              fullWidth
              leftIcon={<MessageCircle size={16} color={colors.primary[600]} />}
              onPress={() => router.push(`/(homeowner)/thread/${job.id}`)}
            />
          ) : null}
          {checkInEligible ? (
            <Button label="Submit check-in" size="lg" fullWidth onPress={() => setCheckInOpen(true)} />
          ) : null}
          {job.status === 'completed' ? (
            <Pressable
              hitSlop={6}
              onPress={() =>
                router.push({
                  pathname: '/(homeowner)/claims/incident',
                  params: { jobId: job.id, providerId: job.providerId },
                })
              }
              style={[
                {
                  paddingVertical: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <AlertOctagon size={14} color={colors.error} />
              <Text style={{ ...textStyles['body-sm'], fontFamily: 'Inter_500Medium', color: colors.error }}>
                Report an issue with this job
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {provider ? (
        <HomeownerCheckIn
          visible={checkInOpen}
          onClose={() => setCheckInOpen(false)}
          jobId={job.id}
          providerName={provider.name}
          providerAvatarUrl={provider.avatarUrl ?? undefined}
          serviceLabel={serviceLabel}
          onSubmit={async (s) => {
            if (!s.reliability || !s.communication || !s.professionalism) return;
            await submitHomeownerCheckIn({
              jobId: job.id,
              reliability: s.reliability,
              quality: s.quality,
              communication: s.communication,
              professionalism: s.professionalism,
              photoPath: s.photoPath ?? null,
            });
            setReviewSubmitted(true);
            qc.invalidateQueries({ queryKey: ['jobs', job.id] });
            qc.invalidateQueries({ queryKey: ['jobs'] });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  valueNumeric,
}: {
  label: string;
  value: string;
  valueNumeric?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        gap: 16,
      }}
    >
      <Text
        style={{
          fontFamily: 'Fraunces_400Regular',
          fontSize: 13,
          fontStyle: 'italic',
          color: colors.textTertiary,
          flexShrink: 0,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 15,
          ...(valueNumeric ? numericTabular : ({} as TextStyle)),
          color: colors.textPrimary,
          flexShrink: 1,
          textAlign: 'right',
          lineHeight: 22,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, Image, Platform, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Section } from '../../../components/ui/Section';
import { Pill, type PillTone } from '../../../components/ui/Pill';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { EmptyState, SkeletonLoader } from '../../../components/shared';
import * as jobsApi from '../../../lib/api/jobs';
import * as subscriptionsApi from '../../../lib/api/subscriptions';
import { useAuthStore } from '../../../stores/authStore';
import { colors, textStyles, numericTabular } from '../../../tokens';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enterStaggered, usePress } from '../../../lib/motion';
import type { Job, JobStatus, ServiceType } from '../../../lib/types';

type Segment = 'active' | 'subscriptions' | 'history';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SERVICE_LABEL: Record<ServiceType, string> = {
  lawn: 'Lawn Care',
  cleaning: 'Home Cleaning',
  pool: 'Pool Cleaning',
  pest: 'Pest Control',
  pressure: 'Pressure Washing',
  window: 'Window Cleaning',
  gutter: 'Gutter Cleaning',
  detailing: 'Car Detailing',
  tree: 'Tree & Plant Trimming',
  solar: 'Solar Panel Cleaning',
};

const STATUS_TONE: Record<JobStatus, { tone: PillTone; label: string }> = {
  booked: { tone: 'neutral', label: 'Booked' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  en_route: { tone: 'accent', label: 'En route' },
  in_progress: { tone: 'info', label: 'In progress' },
  completed: { tone: 'neutral', label: 'Completed' },
  cancelled: { tone: 'error', label: 'Cancelled' },
};

function JobListSkeleton() {
  return (
    <View style={{ gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonLoader width="60%" height={14} borderRadius={6} />
            <SkeletonLoader width="80%" height={12} borderRadius={6} />
          </View>
          <SkeletonLoader width={64} height={24} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

export default function JobsScreen() {
  const router = useRouter();
  const homeownerId = useAuthStore((s) => s.user?.id ?? null);
  const [segment, setSegment] = useState<Segment>('active');
  const isDesktop = useBreakpoint() === 'desktop';

  const { data: allJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', 'homeowner', homeownerId],
    queryFn: async (): Promise<Job[]> => {
      const { supabase } = await import('../../../lib/supabase');
      const { data, error } = await supabase
        .from('jobs')
        .select(
          'id, booking_id, provider_id, homeowner_id, status, service_type, ' +
          'scheduled_at, amount_cents, timestamps, ' +
          'providers(display_name, avatar_url), ' +
          'bookings(addresses(street, unit, city, state, zip, neighborhood))'
        )
        .eq('homeowner_id', homeownerId ?? '')
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
        const prov = (row.providers as { display_name?: string | null; avatar_url?: string | null } | null) ?? null;
        const booking = (row.bookings as { addresses?: { street?: string | null; unit?: string | null; city?: string | null; state?: string | null; zip?: string | null; neighborhood?: string | null } | null } | null) ?? null;
        const addr = booking?.addresses ?? null;
        const unit = addr?.unit ? ` Unit ${addr.unit}` : '';
        const addressFormatted = addr?.street
          ? `${addr.street}${unit}, ${addr.city ?? ''}, ${addr.state ?? ''} ${addr.zip ?? ''}`.trim()
          : null;
        return {
          id: row.id as string,
          bookingId: row.booking_id as string,
          providerId: row.provider_id as string,
          providerName: prov?.display_name ?? 'Provider',
          providerAvatarUrl: prov?.avatar_url ?? null,
          homeownerId: row.homeowner_id as string,
          addressFormatted,
          addressZip: addr?.zip ?? null,
          status: row.status as JobStatus,
          serviceType: row.service_type as ServiceType,
          scheduledAt: row.scheduled_at as string,
          amountCents: row.amount_cents as number,
          timestamps: (row.timestamps as Job['timestamps']) ?? {},
        };
      });
    },
    enabled: !!homeownerId,
    staleTime: 60_000,
  });

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['subscriptions', homeownerId],
    queryFn: () => subscriptionsApi.listForHomeowner(homeownerId ?? ''),
    enabled: !!homeownerId,
  });

  const active = allJobs.filter((j) => ['booked', 'confirmed', 'en_route', 'in_progress'].includes(j.status));
  const history = allJobs.filter((j) => ['completed', 'cancelled'].includes(j.status));

  const renderJobList = (jobs: Job[], isHistory: boolean) =>
    isDesktop ? (
      <JobsTable
        rows={jobs.map((job) => ({
          id: job.id,
          provider: job.providerName,
          providerAvatarUrl: null,
          service: SERVICE_LABEL[job.serviceType] ?? 'Service',
          when: isHistory
            ? `Completed ${format(new Date(job.timestamps.completed ?? job.scheduledAt), 'MMM d')}`
            : format(new Date(job.scheduledAt), "EEE, MMM d 'at' h:mm a"),
          status: job.status,
        }))}
        onView={(id) => router.push(`/(homeowner)/job/${id}`)}
      />
    ) : (
      jobs.map((job, i) => (
        <Animated.View key={job.id} entering={enterStaggered(i)}>
          <JobRow
            onPress={() => router.push(`/(homeowner)/job/${job.id}`)}
            providerName={job.providerName}
            providerAvatarUrl={null}
            serviceLabel={SERVICE_LABEL[job.serviceType] ?? 'Service'}
            whenLabel={
              isHistory
                ? `Completed ${format(new Date(job.timestamps.completed ?? job.scheduledAt), 'MMM d')}`
                : format(new Date(job.scheduledAt), "EEE, MMM d 'at' h:mm a")
            }
            status={job.status}
          />
        </Animated.View>
      ))
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Section tight>
        <Eyebrow>My jobs</Eyebrow>
        <Text
          style={{
            ...textStyles['editorial-title'],
            color: colors.textPrimary,
            marginTop: 6,
          }}
        >
          Bookings, plans & history
        </Text>

        <View
          style={{
            marginTop: 16,
            padding: 4,
            backgroundColor: colors.divider,
            borderRadius: 999,
            flexDirection: 'row',
            alignSelf: 'flex-start',
          }}
        >
          {(['active', 'subscriptions', 'history'] as Segment[]).map((seg) => {
            const sel = segment === seg;
            return (
              <Pressable
                key={seg}
                onPress={() => setSegment(seg)}
                style={[
                  {
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    backgroundColor: sel ? colors.surface : 'transparent',
                  },
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                ]}
              >
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    fontFamily: sel ? 'Inter_600SemiBold' : 'Inter_500Medium',
                    color: sel ? colors.textPrimary : colors.textSecondary,
                    textTransform: 'capitalize',
                  }}
                >
                  {seg}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 20, gap: 12 }}>
          {segment === 'active' ? (
            jobsLoading ? (
              <JobListSkeleton />
            ) : active.length === 0 ? (
              <EmptyState
                heading="No jobs yet"
                body="Browse providers near you and book your first service."
                ctaLabel="Browse providers"
                onCta={() => router.push('/(homeowner)/(tabs)/book')}
              />
            ) : (
              renderJobList(active, false)
            )
          ) : null}

          {segment === 'subscriptions' ? (
            subsLoading ? (
              <JobListSkeleton />
            ) : subscriptions.length === 0 ? (
              <EmptyState
                heading="No subscriptions"
                body="Set it and forget it — book a recurring service to save 10%."
                ctaLabel="Browse providers"
                onCta={() => router.push('/(homeowner)/(tabs)/book')}
              />
            ) : (
              subscriptions.map((sub, i) => (
                <Animated.View key={sub.id} entering={enterStaggered(i)}>
                  <Card
                    variant="pressable"
                    onPress={() => router.push(`/(homeowner)/subscriptions/${sub.id}`)}
                  >
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      {sub.providerAvatarUrl ? (
                        <Image
                          source={{ uri: sub.providerAvatarUrl }}
                          style={{ width: 48, height: 48, borderRadius: 24 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: colors.primary[100],
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'PlusJakartaSans_700Bold',
                              fontSize: 18,
                              color: colors.primary[700],
                            }}
                          >
                            {sub.providerName[0]}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                          {SERVICE_LABEL[sub.serviceType] ?? 'Service'} · {sub.frequency}
                        </Text>
                        <Text
                          style={{
                            ...textStyles['body-sm'],
                            color: colors.textSecondary,
                            marginTop: 2,
                          }}
                        >
                          {sub.providerName}
                          {sub.nextDate ? ` · next: ${format(new Date(sub.nextDate), 'MMM d')}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={{
                          ...textStyles['title-md'],
                          ...numericTabular,
                          fontFamily: 'PlusJakartaSans_700Bold',
                          color: colors.textPrimary,
                        }}
                      >
                        ~${(sub.monthlyEstimateCents / 100).toFixed(0)}/mo
                      </Text>
                    </View>
                  </Card>
                </Animated.View>
              ))
            )
          ) : null}

          {segment === 'history' ? (
            jobsLoading ? (
              <JobListSkeleton />
            ) : history.length === 0 ? (
              <EmptyState
                heading="No completed jobs"
                body="Your completed jobs and reviews will appear here."
                ctaLabel="Book a service"
                onCta={() => router.push('/(homeowner)/(tabs)/book')}
              />
            ) : (
              renderJobList(history, true)
            )
          ) : null}
        </View>
      </Section>
    </SafeAreaView>
  );
}

interface TableRow {
  id: string;
  provider: string;
  providerAvatarUrl: string | null;
  service: string;
  when: string;
  status: JobStatus;
}

function JobsTable({ rows, onView }: { rows: TableRow[]; onView: (id: string) => void }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 18,
          paddingVertical: 14,
          backgroundColor: colors.divider,
          gap: 12,
        }}
      >
        {['Provider', 'Service', 'When', 'Status', ''].map((h, idx) => (
          <Text
            key={h + idx}
            style={{
              ...textStyles.label,
              color: colors.textSecondary,
              flex: idx === 0 ? 2 : idx === 1 ? 1.5 : idx === 2 ? 2 : idx === 3 ? 1 : undefined,
              width: idx === 4 ? 80 : undefined,
              textAlign: idx === 4 ? 'right' : 'left',
            }}
          >
            {h || 'Action'}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => {
        const m = STATUS_TONE[row.status];
        return (
          <View
            key={row.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingVertical: 14,
              gap: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.divider,
            }}
          >
            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {row.providerAvatarUrl ? (
                <Image source={{ uri: row.providerAvatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />
              ) : (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[100] }} />
              )}
              <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }} numberOfLines={1}>
                {row.provider}
              </Text>
            </View>
            <Text style={{ ...textStyles['body-sm'], color: colors.textPrimary, flex: 1.5 }} numberOfLines={1}>
              {row.service}
            </Text>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, flex: 2 }} numberOfLines={1}>
              {row.when}
            </Text>
            <View style={{ flex: 1 }}>
              <Pill label={m.label} tone={m.tone} />
            </View>
            <Pressable
              onPress={() => onView(row.id)}
              style={[
                { width: 80, alignItems: 'flex-end' },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: 'Inter_600SemiBold',
                  color: colors.primary[600],
                }}
              >
                View
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function JobRow({
  providerName,
  providerAvatarUrl,
  serviceLabel,
  whenLabel,
  status,
  onPress,
}: {
  providerName: string;
  providerAvatarUrl?: string | null;
  serviceLabel: string;
  whenLabel: string;
  status: JobStatus;
  onPress: () => void;
}) {
  const m = STATUS_TONE[status];
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        animatedStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {providerAvatarUrl ? (
          <Image source={{ uri: providerAvatarUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
        ) : (
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[100] }} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            {providerName}
          </Text>
          <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
            {serviceLabel} · {whenLabel}
          </Text>
        </View>
        <Pill label={m.label} tone={m.tone} />
      </View>
    </AnimatedPressable>
  );
}

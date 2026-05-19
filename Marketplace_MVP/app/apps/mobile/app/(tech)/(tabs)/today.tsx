import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { MapPin, Clock } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { EmptyState } from '../../../components/shared';
import { ProviderCheckIn } from '../../../components/checkin/ProviderCheckIn';
import { useAuthStore } from '../../../stores/authStore';
import * as jobsApi from '../../../lib/api/jobs';
import { enterStaggered } from '../../../lib/motion';
import { colors, textStyles, numericTabular } from '../../../tokens';
import type { Job } from '../../../lib/types';

const SERVICE_LABEL: Record<string, string> = {
  lawn: 'Lawn Care',
  cleaning: 'Cleaning',
  pool: 'Pool Cleaning',
  pest: 'Pest Control',
  pressure: 'Pressure Washing',
  window: 'Window Cleaning',
};

export default function TechTodayScreen() {
  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : 'Good afternoon';
  const { signOut } = useAuthStore();
  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const [checkInJob, setCheckInJob] = useState<Job | null>(null);

  const { data: allJobs = [], isLoading } = useQuery({
    queryKey: ['jobs', 'tech', userId],
    queryFn: () => jobsApi.listForTech(userId!),
    enabled: !!userId,
  });

  const assignedJobs = allJobs.filter(
    (j) => j.status !== 'completed' && j.status !== 'cancelled'
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>{format(today, 'EEEE, MMMM d')}</Eyebrow>
          <Text
            style={{
              ...textStyles['display-md'],
              fontSize: 28,
              lineHeight: 34,
              color: colors.textPrimary,
            }}
          >
            {greeting}, Tech
          </Text>
        </View>

        <View>
          <Text
            style={{
              ...textStyles['title-lg'],
              color: colors.textPrimary,
              marginBottom: 12,
            }}
          >
            Your assigned jobs
          </Text>
          {isLoading ? (
            <Card>
              <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
                Loading…
              </Text>
            </Card>
          ) : assignedJobs.length === 0 ? (
            <EmptyState
              heading="No jobs assigned"
              body="Jobs your crew owner assigns to you will show up here."
            />
          ) : (
            <View style={{ gap: 12 }}>
              {assignedJobs.map((job, i) => (
                <Animated.View key={job.id} entering={enterStaggered(i)}>
                  <Card>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Clock size={14} color={colors.textSecondary} />
                          <Text
                            style={{
                              ...textStyles['display-md'],
                              ...numericTabular,
                              fontSize: 18,
                              lineHeight: 22,
                              color: colors.textPrimary,
                            }}
                          >
                            {format(new Date(job.scheduledAt), 'h:mm a')}
                          </Text>
                        </View>
                        <Text
                          style={{
                            ...textStyles['body-md'],
                            fontFamily: 'Inter_500Medium',
                            color: colors.textPrimary,
                            marginTop: 4,
                          }}
                        >
                          {job.homeownerName ?? 'Customer'} ·{' '}
                          {SERVICE_LABEL[job.serviceType] ?? job.serviceType}
                        </Text>
                        {job.addressFormatted ?? job.homeownerNeighborhood ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <MapPin size={12} color={colors.textTertiary} />
                            <Text
                              style={{
                                ...textStyles['body-sm'],
                                color: colors.textTertiary,
                              }}
                            >
                              {job.addressFormatted ?? job.homeownerNeighborhood}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ marginTop: 14 }}>
                      <Button label="Start check-in" size="sm" onPress={() => setCheckInJob(job)} fullWidth />
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={signOut}
          style={{ paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
        >
          <Text
            style={{
              ...textStyles['body-md'],
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '600',
              color: colors.error,
            }}
          >
            Sign out
          </Text>
        </Pressable>
      </ScrollView>

      {checkInJob ? (
        <ProviderCheckIn
          visible={!!checkInJob}
          onClose={() => setCheckInJob(null)}
          jobId={checkInJob.id}
          payoutCents={checkInJob.amountCents}
        />
      ) : null}
    </SafeAreaView>
  );
}

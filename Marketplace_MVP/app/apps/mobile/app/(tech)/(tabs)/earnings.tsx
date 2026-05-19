import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { EmptyState } from '../../../components/shared';
import { useAuthStore } from '../../../stores/authStore';
import * as jobsApi from '../../../lib/api/jobs';
import { colors, textStyles, numericTabular } from '../../../tokens';

const SERVICE_LABEL: Record<string, string> = {
  lawn: 'Lawn',
  cleaning: 'Cleaning',
  pool: 'Pool',
  pest: 'Pest',
  pressure: 'Pressure',
  window: 'Window',
};

export default function TechEarningsScreen() {
  const userId = useAuthStore((s) => s.user)?.id ?? null;

  const { data: allJobs = [], isLoading } = useQuery({
    queryKey: ['jobs', 'tech', userId],
    queryFn: () => jobsApi.listForTech(userId!),
    enabled: !!userId,
  });

  const completed = allJobs
    .filter((j) => j.status === 'completed')
    .sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayCents = completed
    .filter((j) => new Date(j.scheduledAt) >= startOfToday)
    .reduce((acc, j) => acc + j.amountCents, 0);
  const weekCents = completed
    .filter((j) => new Date(j.scheduledAt) >= weekAgo)
    .reduce((acc, j) => acc + j.amountCents, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Tech account</Eyebrow>
          <Text
            style={{
              ...textStyles['display-md'],
              fontSize: 28,
              lineHeight: 34,
              color: colors.textPrimary,
            }}
          >
            Earnings
          </Text>
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.textSecondary,
            }}
          >
            Tech accounts see their own summary only. Owner controls payouts.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Eyebrow>Today</Eyebrow>
            <Text
              style={{
                ...textStyles['editorial-title'],
                ...numericTabular,
                fontSize: 28,
                lineHeight: 34,
                color: colors.textPrimary,
                marginTop: 6,
              }}
            >
              ${(todayCents / 100).toFixed(2)}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Eyebrow>This week</Eyebrow>
            <Text
              style={{
                ...textStyles['editorial-title'],
                ...numericTabular,
                fontSize: 28,
                lineHeight: 34,
                color: colors.textPrimary,
                marginTop: 6,
              }}
            >
              ${(weekCents / 100).toFixed(2)}
            </Text>
          </Card>
        </View>

        <Text
          style={{
            ...textStyles['title-lg'],
            color: colors.textPrimary,
            marginTop: 4,
          }}
        >
          Recent jobs
        </Text>

        {isLoading ? (
          <Card>
            <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
              Loading…
            </Text>
          </Card>
        ) : completed.length === 0 ? (
          <EmptyState
            heading="No completed jobs yet"
            body="Once you finish a job and submit a check-in, it shows up here."
          />
        ) : (
          <Card style={{ padding: 0 }}>
            {completed.slice(0, 4).map((job, i, arr) => (
              <View
                key={job.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                  borderBottomColor: colors.divider,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text
                    style={{
                      ...textStyles['title-md'],
                      color: colors.textPrimary,
                    }}
                  >
                    {job.homeownerName ?? 'Customer'} ·{' '}
                    {SERVICE_LABEL[job.serviceType] ?? job.serviceType}
                  </Text>
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      ...numericTabular,
                      color: colors.textTertiary,
                      marginTop: 2,
                    }}
                  >
                    {format(new Date(job.scheduledAt), 'MMM d')}
                  </Text>
                </View>
                <Text
                  style={{
                    ...textStyles['title-md'],
                    ...numericTabular,
                    color: colors.success,
                  }}
                >
                  +${(job.amountCents / 100).toFixed(2)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

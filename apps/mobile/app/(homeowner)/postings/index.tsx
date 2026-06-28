import React from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, ChevronRight } from 'lucide-react-native';
import { useSafeBack } from '../../../lib/useSafeBack';
import { formatDistanceToNowStrict } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { EmptyState, QueryErrorState } from '../../../components/shared';
import { useAuthStore } from '../../../stores/authStore';
import * as postingsApi from '../../../lib/api/postings';
import { SERVICE_LABELS } from '../../../lib/constants';
import { colors, textStyles, numericTabular } from '../../../tokens';
import type { PostingStatus } from '../../../lib/types';

const STATUS_TONE: Record<PostingStatus, 'primary' | 'success' | 'neutral' | 'warning'> = {
  open: 'primary',
  matched: 'success',
  completed: 'neutral',
  expired: 'warning',
};
const STATUS_LABEL: Record<PostingStatus, string> = {
  open: 'Open · awaiting quotes',
  matched: 'Matched',
  completed: 'Completed',
  expired: 'Expired',
};

export default function PostingsListScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const pendingSetup = useAuthStore((s) => s.pendingHomeownerSetup);
  const areaLabel = pendingSetup?.city ? `${pendingSetup.city}-area` : 'local';

  const { data: postings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['postings', 'all', userId],
    queryFn: () => postingsApi.listForHomeowner(userId!),
    enabled: !!userId,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={[
            { padding: 8 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Custom job posts</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
            }}
          >
            My postings
          </Text>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary }}>
            Posts you&apos;ve sent out to {areaLabel} pros for custom quotes.
          </Text>
        </View>

        <Button
          label="Post a new job"
          size="lg"
          fullWidth
          leftIcon={<Plus size={18} color={colors.textInverse} />}
          onPress={() => router.push('/(homeowner)/post-job/service')}
        />

        {isLoading ? (
          <Card>
            <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
              Loading…
            </Text>
          </Card>
        ) : isError ? (
          <QueryErrorState onRetry={() => refetch()} />
        ) : postings.length === 0 ? (
          <EmptyState
            heading="No postings yet"
            body="When you post a custom job, it'll show up here with quotes from local pros."
            ctaLabel="Post a job"
            onCta={() => router.push('/(homeowner)/post-job/service')}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {postings.map((p) => (
              <Card
                key={p.id}
                variant="pressable"
                onPress={() => router.push(`/(homeowner)/postings/${p.id}`)}
              >
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {p.photos[0] ? (
                    <Image
                      source={{ uri: p.photos[0] }}
                      style={{ width: 64, height: 64, borderRadius: 12 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        backgroundColor: colors.primary[50],
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          ...textStyles.label,
                          color: colors.primary[600],
                          textTransform: 'uppercase',
                        }}
                      >
                        {SERVICE_LABELS[p.serviceType].slice(0, 4)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Pill label={SERVICE_LABELS[p.serviceType]} tone="primary" />
                      <Pill label={STATUS_LABEL[p.status]} tone={STATUS_TONE[p.status]} />
                    </View>
                    <Text
                      style={{
                        ...textStyles['title-md'],
                        color: colors.textPrimary,
                      }}
                      numberOfLines={2}
                    >
                      {p.headline}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Text
                        style={{
                          ...textStyles['body-sm'],
                          ...numericTabular,
                          color: colors.textSecondary,
                        }}
                      >
                        {p.matchCount} {p.matchCount === 1 ? 'quote' : 'quotes'}
                      </Text>
                      <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
                        · posted{' '}
                        {formatDistanceToNowStrict(new Date(p.postedAt), { addSuffix: false })} ago
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.textTertiary} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

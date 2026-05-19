import React from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { colors, textStyles, numericTabular } from '../../../tokens';
import type { ServiceType } from '../../../lib/types';

const SERVICE_LABELS: Record<ServiceType, string> = {
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

export default function PostingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pendingSetup = useAuthStore((s) => s.pendingHomeownerSetup);

  const { data: posting, isLoading } = useQuery({
    queryKey: ['postings', 'detail', id],
    queryFn: () => api.postings.get(id ?? ''),
    enabled: !!id,
  });

  const { data: matchedProvider = null } = useQuery({
    queryKey: ['providers', 'detail', posting?.matchedProviderId],
    queryFn: () => api.providers.detail(posting!.matchedProviderId!),
    enabled: !!posting?.matchedProviderId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary }}>
            Loading…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!posting) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
            Posting not found
          </Text>
          <Button
            label="Back to my postings"
            variant="outline"
            onPress={() => router.replace('/(homeowner)/postings')}
            style={{ marginTop: 12 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={[
            { padding: 8 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pill label={SERVICE_LABELS[posting.serviceType]} tone="primary" />
            <Pill
              label={
                posting.status === 'open'
                  ? `Open · ${posting.matchCount} ${posting.matchCount === 1 ? 'quote' : 'quotes'}`
                  : posting.status === 'matched'
                    ? 'Matched'
                    : posting.status === 'completed'
                      ? 'Completed'
                      : 'Expired'
              }
              tone={
                posting.status === 'open'
                  ? 'primary'
                  : posting.status === 'matched'
                    ? 'success'
                    : posting.status === 'completed'
                      ? 'neutral'
                      : 'warning'
              }
            />
          </View>
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
            {posting.headline}
          </Text>
          <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
            Posted{' '}
            {formatDistanceToNowStrict(new Date(posting.postedAt), { addSuffix: false })} ago ·{' '}
            {format(new Date(posting.postedAt), "MMM d 'at' h:mm a")}
          </Text>
        </View>

        <Card>
          <Text style={{ ...textStyles.label, color: colors.textTertiary }}>Description</Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textPrimary,
              lineHeight: 22,
              marginTop: 8,
            }}
          >
            {posting.description}
          </Text>
        </Card>

        {posting.photos.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...textStyles.label, color: colors.textTertiary }}>
              Photos ({posting.photos.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {posting.photos.map((url, i) => (
                <Image
                  key={i}
                  source={{ uri: url }}
                  style={{ width: 200, height: 200, borderRadius: 12 }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {posting.status === 'open' ? (
          <Card tone="tinted" tintColor={colors.primary[50]}>
            <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
              Awaiting quotes
            </Text>
            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.textSecondary,
                marginTop: 6,
                lineHeight: 20,
              }}
            >
              {posting.matchCount === 0
                ? "We're routing your post to vetted pros nearby. First quotes typically arrive within an hour."
                : `${posting.matchCount} ${posting.matchCount === 1 ? 'pro has' : 'pros have'} responded so far. Check back soon to compare quotes.`}
            </Text>
            {posting.matchCount > 0 ? (
              <Button
                label={`Review ${posting.matchCount} ${posting.matchCount === 1 ? 'quote' : 'quotes'}`}
                variant="outline"
                style={{ marginTop: 12 }}
              />
            ) : null}
          </Card>
        ) : null}

        {posting.status === 'matched' && matchedProvider ? (
          <Card>
            <Text style={{ ...textStyles.label, color: colors.textTertiary }}>Matched with</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 }}>
              {matchedProvider.avatarUrl ? (
                <Image
                  source={{ uri: matchedProvider.avatarUrl }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                  {matchedProvider.businessName}
                </Text>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    ...numericTabular,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Trust score {matchedProvider.compositeScore.overall.toFixed(1)} ·{' '}
                  {matchedProvider.checkInCount} verified jobs
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button
                label="Message"
                variant="outline"
                leftIcon={<MessageCircle size={16} color={colors.primary[600]} />}
                style={{ flex: 1 }}
              />
              <Button label="Schedule" style={{ flex: 1 }} />
            </View>
          </Card>
        ) : null}

        <Card variant="outlined">
          <Text style={{ ...textStyles.label, color: colors.textTertiary }}>What pros see</Text>
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.textSecondary,
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            Your home address is hidden until you confirm a pro. We share the neighborhood and
            zip{pendingSetup?.zip ? ` — ${pendingSetup.city ?? ''} ${pendingSetup.zip}`.trim() : ''} — so they can quote accurately.
          </Text>
        </Card>
      </ScrollView>

      {posting.status === 'open' ? (
        <View
          style={{
            padding: 16,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Button label="Close this posting" variant="ghost" fullWidth />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

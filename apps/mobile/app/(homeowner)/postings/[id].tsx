import React from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { useSafeBack } from '../../../lib/useSafeBack';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { QueryErrorState } from '../../../components/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { SERVICE_LABELS } from '../../../lib/constants';
import { colors, fonts, textStyles, numericTabular } from '../../../tokens';

export default function PostingDetailScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pendingSetup = useAuthStore((s) => s.pendingHomeownerSetup);

  const { data: posting, isLoading, isError, refetch } = useQuery({
    queryKey: ['postings', 'detail', id],
    queryFn: () => api.postings.get(id ?? ''),
    enabled: !!id,
  });

  const { data: matchedProvider = null, isError: matchedProviderError, refetch: refetchMatchedProvider } = useQuery({
    queryKey: ['providers', 'detail', posting?.matchedProviderId],
    queryFn: () => api.providers.detail(posting!.matchedProviderId!),
    enabled: !!posting?.matchedProviderId,
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();
  const resetBooking = useBookingStore((s) => s.reset);
  const setServiceType = useBookingStore((s) => s.setServiceType);
  const setMatchedProvider = useBookingStore((s) => s.setMatchedProvider);
  const setQuoteAmount = useBookingStore((s) => s.setQuoteAmount);

  const { data: quotes = [] } = useQuery({
    queryKey: ['posting-quotes', id],
    queryFn: () => api.postings.listQuotes(id ?? ''),
    enabled: !!id,
  });
  const activeQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'accepted');

  const refreshPosting = () => {
    queryClient.invalidateQueries({ queryKey: ['posting-quotes', id] });
    queryClient.invalidateQueries({ queryKey: ['postings', 'detail', id] });
  };

  const onAccept = async (quoteId: string, providerId: string) => {
    try {
      await api.postings.acceptQuote({ quoteId, postingId: id ?? '', providerId });
      refreshPosting();
    } catch {
      Alert.alert('Could not accept', 'Please try again.');
    }
  };
  const onDecline = async (quoteId: string) => {
    try {
      await api.postings.declineQuote(quoteId);
      refreshPosting();
    } catch {
      Alert.alert('Could not decline', 'Please try again.');
    }
  };
  const onClose = () => {
    Alert.alert('Close this posting?', 'Pros will no longer be able to send quotes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close posting',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.postings.close(id ?? '');
            refreshPosting();
            router.back();
          } catch {
            Alert.alert('Could not close', 'Please try again.');
          }
        },
      },
    ]);
  };
  const onSchedule = async () => {
    if (!posting) return;
    resetBooking();
    setServiceType(posting.serviceType);
    // Carry the provider the homeowner just chose into the booking flow so the
    // match step doesn't re-run a generic search and lose them.
    if (posting.matchedProviderId) setMatchedProvider(posting.matchedProviderId);
    // Carry the accepted quote's price so payment charges what the homeowner agreed
    // to, not the provider's generic range midpoint.
    const acceptedQuote = quotes.find((q) => q.status === 'accepted');
    setQuoteAmount(acceptedQuote?.amountCents ?? null);
    // Mark the posting completed so the CTA cannot trigger a second booking.
    try {
      await api.postings.complete(id ?? '');
      queryClient.invalidateQueries({ queryKey: ['postings', 'detail', id] });
    } catch {
      // Non-fatal: proceed to booking even if the status update fails
    }
    router.push({ pathname: '/(homeowner)/booking/service-select', params: { service: posting.serviceType } });
  };

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

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <QueryErrorState onRetry={() => refetch()} />
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

        {posting.status === 'open' && activeQuotes.length === 0 ? (
          <Card tone="tinted" tintColor={colors.primary[50]}>
            <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>Awaiting quotes</Text>
            <Text
              style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginTop: 6, lineHeight: 20 }}
            >
              We&apos;re routing your post to vetted pros nearby. First quotes typically arrive within an hour.
            </Text>
          </Card>
        ) : null}

        {posting.status === 'open' && activeQuotes.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
              {activeQuotes.length} {activeQuotes.length === 1 ? 'quote' : 'quotes'} · choose your pro
            </Text>
            {activeQuotes.map((q) => (
              <Card key={q.id}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {q.provider?.avatarUrl ? (
                    <Image source={{ uri: q.provider.avatarUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
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
                      <Text style={{ fontFamily: fonts.editorial, fontSize: 20, color: colors.primary[700] }}>
                        {(q.provider?.name ?? 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }} numberOfLines={1}>
                        {q.provider?.name ?? 'Provider'}
                      </Text>
                      {(q.provider?.verificationTier ?? 0) >= 1 ? (
                        <ShieldCheck size={14} color={colors.success} />
                      ) : null}
                    </View>
                    <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginTop: 2 }}>
                      {(q.provider?.checkInCount ?? 0) > 0
                        ? `Trust ${(q.provider?.overall ?? 0).toFixed(1)} · ${q.provider?.checkInCount} verified`
                        : 'New to MyHomebase'}
                    </Text>
                  </View>
                  {q.amountCents != null ? (
                    <Text
                      style={{ fontFamily: fonts.editorial, fontSize: 22, color: colors.textPrimary, ...numericTabular }}
                    >
                      ${(q.amountCents / 100).toFixed(0)}
                    </Text>
                  ) : null}
                </View>
                {q.message ? (
                  <Text style={{ ...textStyles['body-sm'], color: colors.textPrimary, marginTop: 10, lineHeight: 20 }}>
                    {q.message}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Button label="Decline" variant="outline" style={{ flex: 1 }} onPress={() => onDecline(q.id)} />
                  <Button label="Accept" style={{ flex: 1 }} onPress={() => onAccept(q.id, q.providerId)} />
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {posting.status === 'matched' && matchedProviderError ? (
          <QueryErrorState onRetry={() => refetchMatchedProvider()} />
        ) : posting.status === 'matched' && matchedProvider ? (
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
                  {matchedProvider.checkInCount > 0
                    ? `${matchedProvider.checkInCount} verified ${matchedProvider.checkInCount === 1 ? 'job' : 'jobs'}`
                    : 'New to MyHomebase'}
                </Text>
              </View>
            </View>
            <Button label="Schedule this job" fullWidth style={{ marginTop: 12 }} onPress={onSchedule} />
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
          <Button label="Close this posting" variant="ghost" fullWidth onPress={onClose} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

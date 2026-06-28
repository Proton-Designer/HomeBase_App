import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { invokeFn } from '../../../lib/api/functions';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Pill } from '../../../components/ui/Pill';
import { ProviderCard } from '../../../components/shared/ProviderCard';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useBookingStore } from '../../../stores/bookingStore';
import { useAuthStore } from '../../../stores/authStore';
import { fetchPrimaryAddress } from '../../../lib/api/addresses';
import { search as searchProviders } from '../../../lib/api/providers';
import type { Provider } from '../../../lib/types';
import { track } from '../../../lib/api/events';
import { enter, enterStaggered, onlyNative } from '../../../lib/motion';
import { colors, shadows, textStyles } from '../../../tokens';

// Module-scope stable entering instances — avoids Reanimated re-fire on re-render.
// Stable empty default so `data: shortlist = []` isn't a fresh array each render (which
// would re-run the pre-select effect every render while the providers query loads).
const EMPTY_SHORTLIST: Provider[] = [];

const ENTER_HEADER = onlyNative(FadeIn.duration(220));
const ENTER_RATIONALE = onlyNative(FadeInDown.delay(100).duration(300));
const ENTER_TIMEOUT = onlyNative(FadeIn.duration(300));
const ENTER_NOTIFY_CONFIRM = onlyNative(FadeIn.duration(200));

export default function MatchStep() {
  const router = useRouter();
  const { serviceType, bookingType, matchedProviderId, fromQuoteFlow, setMatchedProvider } =
    useBookingStore();
  const userId = useAuthStore((s) => s.user)?.id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [notifyRequested, setNotifyRequested] = useState(false);

  // Resolve homeowner ZIP from primary address.
  const { data: primaryAddress, isLoading: addressIsLoading, refetch: refetchAddress } = useQuery({
    queryKey: ['addresses', 'primary', userId],
    queryFn: () => fetchPrimaryAddress(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
  const zip = primaryAddress?.zip ?? null;

  // Shortlist: top 5 ranked providers for this ZIP + service type.
  const {
    data: shortlist = EMPTY_SHORTLIST,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['providers', 'shortlist', zip, serviceType],
    queryFn: () => searchProviders(zip!, serviceType ?? undefined),
    enabled: !!zip,
    staleTime: 5 * 60 * 1000,
    select: (rows) => rows.slice(0, 5),
  });

  // 8-second timeout guard: if providers are still loading after 8s, show retry state.
  const showLoading = (!!userId && addressIsLoading) || (!!zip && isLoading);

  useEffect(() => {
    if (!showLoading) return;
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [showLoading]);

  // Reset timeout flag as soon as the query resolves.
  useEffect(() => {
    if (!showLoading) setTimedOut(false);
  }, [showLoading]);

  // Trust rationale fires only for the selected provider.
  const { data: rationale, isLoading: rationaleLoading } = useQuery({
    queryKey: ['trust-rationale', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      try {
        const data = await invokeFn<{ rationale?: string }>('generate-trust-rationale', {
          providerId: selectedId,
        });
        return data?.rationale ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!selectedId,
    staleTime: Infinity,
  });

  // Spring animation for the rationale card appearing after selection.
  const rationaleScale = useSharedValue(0.95);
  const rationaleOpacity = useSharedValue(0);
  const rationaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rationaleScale.value }],
    opacity: rationaleOpacity.value,
  }));

  const handleSelect = (id: string) => {
    setSelectedId(id);
    rationaleScale.value = withSpring(1, { damping: 13, stiffness: 140 });
    rationaleOpacity.value = withSpring(1, { damping: 16, stiffness: 130 });
  };

  // A booking from an accepted custom-job quote already has its provider chosen. Skip
  // the re-match step entirely — it only searches the local ZIP shortlist and would drop
  // a quoted pro who isn't in it. Keyed on fromQuoteFlow (not the quote price, which is
  // null for price-free quotes) so a price-free accepted quote isn't lost here.
  useEffect(() => {
    if (matchedProviderId && fromQuoteFlow) {
      router.replace('/(homeowner)/booking/details');
    }
  }, [matchedProviderId, fromQuoteFlow, router]);

  // One-tap rehire: if the homeowner arrived with a pro pre-chosen, pre-select it.
  useEffect(() => {
    if (matchedProviderId && !selectedId && shortlist.some((p) => p.id === matchedProviderId)) {
      handleSelect(matchedProviderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedProviderId, shortlist, selectedId]);

  const onConfirm = () => {
    if (!selectedId) return;
    setMatchedProvider(selectedId);
    router.push('/(homeowner)/booking/details');
  };

  // Demand capture: write a demand event so the Operator Graph can prioritise
  // coverage expansion for this zip + service combination.
  const handleNotifyMe = async () => {
    try {
      await track({
        event: 'search', // closest valid event type; metadata carries the reason
        serviceType: serviceType ?? undefined,
        zip: zip ?? undefined,
        metadata: { reason: 'no_providers_available', bookingType },
      });
    } catch {
      // silent — demand event is best-effort
    } finally {
      setNotifyRequested(true);
    }
  };

  const proCount = shortlist.length;
  const headerTitle =
    proCount === 0
      ? 'Compare your top pros'
      : proCount === 1
        ? '1 pro serves your area'
        : proCount === 2
          ? '2 pros serve your area'
          : `Compare ${proCount} vetted pros near you`;
  const headerSub =
    proCount > 0 ? 'We surface vetted pros near you — you choose who to hire.' : '';

  // Single-provider CTA label makes the choice feel explicit, not automatic.
  const ctaLabel =
    selectedId && proCount === 1
      ? `Book with ${shortlist[0]?.name ?? 'this pro'}`
      : 'Continue with this pro';

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (showLoading && !timedOut) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <SkeletonLoader width="55%" height={24} borderRadius={6} />
          <SkeletonLoader width="80%" height={16} borderRadius={4} />
        </View>
        <Text
          style={{
            ...textStyles['body-sm'],
            color: colors.textTertiary,
            marginBottom: 4,
          }}
        >
          Finding vetted pros near you…
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonLoader key={i} width={168} height={260} borderRadius={14} />
          ))}
        </ScrollView>
      </View>
    );
  }

  // ─── Timeout state ─────────────────────────────────────────────────────────

  if (showLoading && timedOut) {
    return (
      <Animated.View
        entering={ENTER_TIMEOUT}
        style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 20 }}
      >
        <EmptyState
          heading="Taking a bit longer than usual"
          body="Check your connection, then tap retry."
          ctaLabel="Retry"
          onCta={() => {
            setTimedOut(false);
            void refetchAddress();
            void refetch();
          }}
        />
      </Animated.View>
    );
  }

  // ─── Network error state ───────────────────────────────────────────────────

  if (isError) {
    return (
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          heading="Could not load pros"
          body="Check your connection and try again."
          ctaLabel="Retry"
          onCta={() => void refetch()}
        />
      </View>
    );
  }

  // ─── No providers in area ──────────────────────────────────────────────────

  if (!zip || proCount === 0) {
    return (
      <View style={{ flex: 1, padding: 24 }}>
        {notifyRequested ? (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}
          >
            <Animated.View entering={ENTER_NOTIFY_CONFIRM}>
              <Pill
                label="We'll let you know when a pro is available"
                tone="success"
              />
            </Animated.View>
            <Pressable
              testID="booking-match-try-different"
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityLabel="Try a different service"
              style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: 'Inter_600SemiBold',
                  color: colors.primary[600],
                }}
              >
                Try a different service →
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flex: 1, gap: 16 }}>
            <EmptyState
              heading="No pros in your area yet"
              body="We're growing fast. We'll notify you the moment a vetted pro becomes available."
              ctaLabel="Notify me"
              onCta={handleNotifyMe}
            />
            <Pressable
              testID="booking-match-try-different"
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityLabel="Try a different service"
              style={[
                { alignSelf: 'center' },
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
                Try a different service →
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // ─── Shortlist ─────────────────────────────────────────────────────────────

  return (
    <View testID="booking-step-match" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Animated.View entering={ENTER_HEADER} style={{ gap: 4 }}>
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary, fontSize: 26 }}>
            {headerTitle}
          </Text>
          {headerSub ? (
            <Text style={{ ...textStyles['body-md'], color: colors.textSecondary }}>
              {headerSub}
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={enter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
            decelerationRate="fast"
            snapToInterval={180}
            snapToAlignment="start"
          >
            {shortlist.map((provider, index) => (
              <Animated.View
                key={provider.id}
                entering={enterStaggered(index)}
                style={[shadows.md, { borderRadius: 14 }]}
              >
                <ProviderCard
                  provider={provider}
                  variant="shortlist"
                  selected={provider.id === selectedId}
                  onPress={() => handleSelect(provider.id)}
                  testID={`booking-match-provider-card-${provider.id}`}
                />
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        {selectedId ? (
          <Animated.View style={rationaleStyle} entering={ENTER_RATIONALE}>
            <Card variant="outlined">
              <Text
                style={{
                  ...textStyles.label,
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                Why this provider
              </Text>
              {rationaleLoading ? (
                <SkeletonLoader width="100%" height={40} borderRadius={4} />
              ) : (
                <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>
                  {rationale ?? 'Verified through completed homeowner check-ins.'}
                </Text>
              )}
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 10,
        }}
      >
        <Button
          testID="booking-match-next"
          label={ctaLabel}
          size="lg"
          fullWidth
          disabled={!selectedId}
          onPress={onConfirm}
        />
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: 'Inter_500Medium',
            color: colors.textTertiary,
            textAlign: 'center',
          }}
        >
          We surface vetted pros near you — you choose who to hire.
        </Text>
      </View>
    </View>
  );
}

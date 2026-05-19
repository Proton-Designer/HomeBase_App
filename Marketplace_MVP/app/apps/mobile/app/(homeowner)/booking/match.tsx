import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ProviderCard, SkeletonLoader } from '../../../components/shared';
import { useBookingStore } from '../../../stores/bookingStore';
import { onlyNative } from '../../../lib/motion';
import { colors, shadows, textStyles } from '../../../tokens';
import { supabase } from '../../../lib/supabase';
import type { Provider } from '../../../lib/types';

export default function MatchStep() {
  const router = useRouter();
  const { serviceType, setMatchedProvider } = useBookingStore();
  const [matched, setMatched] = useState<Provider | null>(null);
  const [staticReason, setStaticReason] = useState<string>('');
  const pulse = useSharedValue(1);
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);

  const providerId = matched?.id ?? null;

  const { data: rationaleData, isLoading: rationaleLoading } = useQuery({
    queryKey: ['trust-rationale', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      const { data, error } = await supabase.functions.invoke('generate-trust-rationale', {
        body: { providerId },
      });
      if (error || !data || data.error) return null;
      return (data as { rationale: string }).rationale ?? null;
    },
    enabled: !!providerId,
    staleTime: Infinity,
  });

  const displayReason = rationaleData ?? staticReason;

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.3, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  useEffect(() => {
    if (matched) {
      cardScale.value = withSpring(1, { damping: 11, stiffness: 110 });
      cardOpacity.value = withSpring(1, { damping: 16, stiffness: 130 });
    } else {
      cardScale.value = 0.92;
      cardOpacity.value = 0;
    }
  }, [matched, cardScale, cardOpacity]);

  const runMatch = useCallback(() => {
    setMatched(null);
    // Call the route-booking edge function via bookings API

    let cancelled = false;
    const run = async () => {
      const { bookings: bookingsApi } = await import('../../../lib/api');
      const match = await bookingsApi.route({
        serviceType: serviceType ?? 'lawn',
        bookingType: 'one_off',
      });
      if (cancelled || !match) return;
      const { providers: providersApi } = await import('../../../lib/api');
      const prov = await providersApi.detail(match.providerId);
      if (cancelled || !prov) return;
      setMatched(prov);
      setStaticReason(match.reason ?? '');
    };
    const t = setTimeout(() => { void run(); }, 2200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [serviceType]);

  useEffect(() => {
    const cleanup = runMatch();
    return cleanup;
  }, [runMatch]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const cardSpringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const onConfirm = () => {
    if (matched) setMatchedProvider(matched.id);
    router.push('/(homeowner)/booking/details');
  };

  if (!matched) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Animated.View
          style={[
            {
              width: 112,
              height: 112,
              borderRadius: 56,
              backgroundColor: colors.primary[100],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            },
            pulseStyle,
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </Animated.View>
        <Text
          style={{
            ...textStyles['display-md'],
            color: colors.textPrimary,
            textAlign: 'center',
          }}
        >
          Finding your perfect match…
        </Text>
        <Text
          style={{
            ...textStyles['body-md'],
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: 10,
            paddingHorizontal: 20,
            maxWidth: 360,
          }}
        >
          Checking availability, trust scores, and proximity in your neighborhood.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Animated.View
          entering={onlyNative(FadeIn.duration(280))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <CheckCircle2 size={22} color={colors.success} />
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary, fontSize: 26 }}>
            We found your pro
          </Text>
        </Animated.View>

        <Animated.View style={[cardSpringStyle, shadows.xl, { borderRadius: 16 }]}>
          <ProviderCard provider={matched} variant="expanded" />
        </Animated.View>

        <Animated.View entering={onlyNative(FadeInDown.delay(160).duration(360))}>
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
            {rationaleLoading && !displayReason ? (
              <SkeletonLoader width="100%" height={20} borderRadius={4} />
            ) : (
              <Text
                style={{
                  ...textStyles['body-md'],
                  color: colors.textPrimary,
                }}
              >
                {displayReason}
              </Text>
            )}
          </Card>
        </Animated.View>
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
        <Button label="Confirm this pro" size="lg" fullWidth onPress={onConfirm} />
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: 'Inter_500Medium',
            color: colors.textTertiary,
            textAlign: 'center',
          }}
        >
          We route to one verified pro per inquiry. Cancel up top to start over.
        </Text>
      </View>
    </View>
  );
}

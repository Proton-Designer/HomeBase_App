import React, { useEffect } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Check, MapPin, CalendarDays } from 'lucide-react-native';
import { format } from 'date-fns';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { TrustScoreDisplay } from '../../../components/shared/TrustScoreDisplay';
import { useBookingStore } from '../../../stores/bookingStore';
import { celebrate, onlyNative } from '../../../lib/motion';
import { track } from '../../../lib/api/events';
import * as api from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { colors, shadows, textStyles } from '../../../tokens';
import type { ServiceType } from '../../../lib/types';

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

const CONFETTI_COUNT = 14;

interface ConfettiSpec {
  color: string;
  startX: number;
  endX: number;
  endY: number;
  size: number;
  delay: number;
}

function makeConfetti(): ConfettiSpec[] {
  const palette = [colors.accent[400], colors.primary[400], colors.accent[300], colors.primary[300], colors.accent[500]];
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle = (i / CONFETTI_COUNT) * Math.PI * 2;
    const radius = 90 + ((i * 11) % 80);
    return {
      color: palette[i % palette.length],
      startX: 0,
      endX: Math.cos(angle) * radius,
      endY: Math.sin(angle) * radius,
      size: 6 + ((i * 3) % 6),
      delay: 200 + (i * 18),
    };
  });
}

export default function ConfirmationStep() {
  const router = useRouter();
  const {
    serviceType,
    bookingType,
    frequency,
    scheduledAt,
    matchedProviderId,
    addressLabel,
    reset,
  } = useBookingStore();
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const confettiSpecs = React.useMemo(makeConfetti, []);

  const { data: provider } = useQuery({
    queryKey: ['providers', 'detail', matchedProviderId],
    queryFn: () => api.providers.detail(matchedProviderId!),
    enabled: !!matchedProviderId,
    staleTime: Infinity,
  });

  const serviceAddress = addressLabel ?? null;

  useEffect(() => {
    const t = setTimeout(() => celebrate(checkScale, checkOpacity), 120);
    glow.value = withDelay(
      400,
      withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
        -1,
        true,
      ),
    );
    void track({
      event: 'booking_completed',
      serviceType: serviceType ?? undefined,
      metadata: { bookingType, frequency, providerId: matchedProviderId },
    });
    return () => clearTimeout(t);
  }, [checkOpacity, checkScale, glow, serviceType, bookingType, frequency, matchedProviderId]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + glow.value * 0.25,
    transform: [{ scale: 1 + glow.value * 0.15 }],
  }));

  const serviceLabel = SERVICE_LABEL[(serviceType ?? 'lawn') as ServiceType] ?? 'Service';

  const onDone = () => {
    reset();
    router.replace('/(homeowner)/(tabs)/jobs');
  };

  const onHome = () => {
    reset();
    router.replace('/(homeowner)/(tabs)/');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 18 }}>
        {/* Celebration check */}
        <View
          style={{
            width: 200,
            height: 200,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
          }}
        >
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: colors.success,
              },
              glowStyle,
            ]}
          />
          {confettiSpecs.map((c, i) => (
            <ConfettiParticle key={i} spec={c} />
          ))}
          <Animated.View
            style={[
              {
                width: 104,
                height: 104,
                borderRadius: 52,
                backgroundColor: colors.success,
                alignItems: 'center',
                justifyContent: 'center',
              },
              shadows.xl,
              checkStyle,
            ]}
          >
            <Check size={56} color={colors.textInverse} strokeWidth={3} />
          </Animated.View>
        </View>

        {/* Editorial eyebrow above headline */}
        <Animated.Text
          entering={onlyNative(FadeIn.delay(300).duration(300))}
          style={{
            fontFamily: 'Fraunces_400Regular',
            fontSize: 12,
            fontStyle: 'italic',
            color: colors.textTertiary,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          issue 042 · your block
        </Animated.Text>

        <Animated.Text
          entering={onlyNative(FadeInDown.delay(380).duration(360))}
          style={{
            ...textStyles['editorial-title'],
            color: colors.textPrimary,
            textAlign: 'center',
          }}
        >
          You&apos;re all set!
        </Animated.Text>

        {/* Amber rule centered */}
        <Animated.View
          entering={onlyNative(FadeIn.delay(460).duration(320))}
          style={{
            width: 64,
            height: 1,
            backgroundColor: colors.accent[500],
            borderRadius: 1,
          }}
        />

        <Animated.Text
          entering={onlyNative(FadeIn.delay(500).duration(360))}
          style={{
            ...textStyles['body-md'],
            color: colors.textSecondary,
            textAlign: 'center',
          }}
        >
          We&apos;ve sent confirmation details to your email.
        </Animated.Text>

        {/* Provider card with caption */}
        <Animated.View
          entering={onlyNative(FadeInDown.delay(640).duration(380))}
          style={{ width: '100%', maxWidth: 480 }}
        >
          <Text
            style={{
              fontFamily: 'Fraunces_400Regular',
              fontSize: 12,
              fontStyle: 'italic',
              color: colors.textTertiary,
              marginBottom: 8,
            }}
          >
            your matched pro
          </Text>
          {provider ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {provider.avatarUrl ? (
                  <Image
                    source={{ uri: provider.avatarUrl }}
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
                      {provider.name[0]}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                    {provider.name}
                  </Text>
                  <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                    {serviceLabel}
                    {bookingType === 'subscription' && frequency ? ` · ${frequency}` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 14 }}>
                <TrustScoreDisplay
                  scores={provider.compositeScore}
                  size="sm"
                  showOverall
                  animated={false}
                />
              </View>
              <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 14 }} />
              <View style={{ gap: 10 }}>
                <Row Icon={CalendarDays} text={scheduledAt ? format(scheduledAt, "EEE, MMM d 'at' h:mm a") : 'TBD'} />
                {serviceAddress ? <Row Icon={MapPin} text={serviceAddress} /> : null}
              </View>
            </Card>
          ) : null}
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
        <Text
          style={{
            fontFamily: 'Fraunces_400Regular',
            fontSize: 12,
            fontStyle: 'italic',
            color: colors.textTertiary,
            textAlign: 'center',
            marginBottom: 2,
          }}
        >
          we&apos;ll text you when they&apos;re en route
        </Text>
        <Button label="View job" size="lg" fullWidth onPress={onDone} />
        <Button label="Back to home" variant="ghost" fullWidth onPress={onHome} />
      </View>
    </View>
  );
}

function ConfettiParticle({ spec }: { spec: ConfettiSpec }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      tx.value = withSpring(spec.endX, { damping: 11, stiffness: 90 });
      ty.value = withSpring(spec.endY, { damping: 11, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 220 });
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 600 });
      }, 600);
    }, spec.delay);
  }, [spec, tx, ty, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

function Row({
  Icon,
  text,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  text: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon size={16} color={colors.textSecondary} />
      <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>{text}</Text>
    </View>
  );
}

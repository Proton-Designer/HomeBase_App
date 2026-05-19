import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, Dimensions } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, Circle } from 'lucide-react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useBookingStore } from '../../../stores/bookingStore';
import { useAuthStore } from '../../../stores/authStore';
import { fetchPrimaryAddress } from '../../../lib/api/addresses';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { STEP_TRANSITION_DURATION } from '../../../lib/motion';
import { colors, textStyles } from '../../../tokens';

const DISMISS_DURATION = 320;

const STEP_ROUTES = [
  'service-select',
  'schedule',
  'match',
  'details',
  'payment',
  'confirmation',
] as const;

const STEP_LABELS: Record<(typeof STEP_ROUTES)[number], string> = {
  'service-select': 'Service',
  schedule: 'Schedule',
  match: 'Match',
  details: 'Details',
  payment: 'Payment',
  confirmation: 'Confirmed',
};

const DESKTOP_STACK_OPTIONS = {
  headerShown: false,
  animation: 'fade' as const,
  animationDuration: STEP_TRANSITION_DURATION,
  contentStyle: { backgroundColor: colors.background },
};
const MOBILE_STACK_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: STEP_TRANSITION_DURATION,
  contentStyle: { backgroundColor: colors.background },
};

export default function BookingLayout() {
  const router = useRouter();
  const segments = useSegments();
  const reset = useBookingStore((s) => s.reset);
  const setHomeownerId = useBookingStore((s) => s.setHomeownerId);
  const setAddressId = useBookingStore((s) => s.setAddressId);
  const setAddressLabel = useBookingStore((s) => s.setAddressLabel);
  const isDesktop = useBreakpoint() === 'desktop';
  const [dismissing, setDismissing] = useState(false);

  const userId = useAuthStore((s) => s.user)?.id ?? null;

  const { data: primaryAddress } = useQuery({
    queryKey: ['homeowner-primary-address', userId],
    queryFn: () => fetchPrimaryAddress(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (primaryAddress) {
      setHomeownerId(primaryAddress.homeownerId);
      setAddressId(primaryAddress.addressId);
      setAddressLabel(
        [primaryAddress.street, primaryAddress.city, `${primaryAddress.state} ${primaryAddress.zip}`]
          .filter(Boolean)
          .join(', ')
      );
    }
  }, [primaryAddress, setHomeownerId, setAddressId, setAddressLabel]);

  const lastSegment = segments[segments.length - 1] as (typeof STEP_ROUTES)[number] | undefined;
  const currentIdx = lastSegment ? STEP_ROUTES.indexOf(lastSegment) : 0;
  const isFinal = lastSegment === 'confirmation';

  const dismissT = useSharedValue(0);
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  const dismissStyle = useAnimatedStyle(() => {
    const p = dismissT.value;
    return {
      opacity: 1 - p * 0.95,
      transform: [
        { translateX: -p * SCREEN_W * 0.42 },
        { translateY: p * SCREEN_H * 0.48 },
        { scale: 1 - p * 0.78 },
      ],
    };
  });

  const finishCancel = () => {
    reset();
    router.replace('/(homeowner)/(tabs)/');
  };

  const onCancel = () => {
    if (dismissing) return;
    setDismissing(true);
    dismissT.value = withTiming(
      1,
      { duration: DISMISS_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishCancel)();
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Animated.View
        pointerEvents={dismissing ? 'none' : 'auto'}
        style={[{ flex: 1 }, dismissStyle]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          {!isFinal && currentIdx > 0 ? (
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
          ) : (
            <View style={{ width: 40 }} />
          )}

          {/* Editorial progress dots */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {STEP_ROUTES.map((step, idx) => {
              const isCurrent = idx === currentIdx;
              const isComplete = idx < currentIdx;
              const isUpcoming = idx > currentIdx;

              if (isCurrent) {
                return (
                  <React.Fragment key={step}>
                    {idx > 0 ? (
                      <View
                        style={{
                          width: 12,
                          height: 1,
                          backgroundColor: colors.accent[300],
                          opacity: 0.5,
                        }}
                      />
                    ) : null}
                    <View
                      style={{
                        width: 40,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.primary[700],
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'PlusJakartaSans_700Bold',
                          fontSize: 14,
                          color: colors.textInverse,
                          lineHeight: 17,
                        }}
                      >
                        {idx + 1}
                      </Text>
                    </View>
                    {idx < STEP_ROUTES.length - 1 ? (
                      <View
                        style={{
                          width: 12,
                          height: 1,
                          backgroundColor: colors.border,
                        }}
                      />
                    ) : null}
                  </React.Fragment>
                );
              }

              if (isComplete) {
                return (
                  <React.Fragment key={step}>
                    {idx > 0 ? (
                      <View
                        style={{
                          width: 12,
                          height: 1,
                          backgroundColor: colors.accent[400],
                          opacity: 0.6,
                        }}
                      />
                    ) : null}
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.accent[400],
                      }}
                    />
                    {idx < STEP_ROUTES.length - 1 ? (
                      <View
                        style={{
                          width: 12,
                          height: 1,
                          backgroundColor: colors.accent[400],
                          opacity: 0.6,
                        }}
                      />
                    ) : null}
                  </React.Fragment>
                );
              }

              // upcoming
              return (
                <React.Fragment key={step}>
                  {idx > 0 ? (
                    <View
                      style={{
                        width: 12,
                        height: 1,
                        backgroundColor: colors.border,
                      }}
                    />
                  ) : null}
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: isUpcoming ? colors.borderStrong : colors.border,
                    }}
                  />
                  {idx < STEP_ROUTES.length - 1 ? (
                    <View
                      style={{
                        width: 12,
                        height: 1,
                        backgroundColor: colors.border,
                      }}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>

          {!isFinal ? (
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              style={[
                { padding: 8 },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <Text style={{ ...textStyles['body-sm'], fontFamily: 'Inter_500Medium', color: colors.textSecondary }}>
                Cancel
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          {isDesktop && !isFinal ? (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                gap: 28,
                paddingHorizontal: 32,
                paddingTop: 8,
                alignSelf: 'center',
                width: '100%',
                maxWidth: 1100,
              }}
            >
              <View style={{ flex: 1, maxWidth: 720 }}>
                <Stack screenOptions={DESKTOP_STACK_OPTIONS} />
              </View>
              <View
                style={{
                  width: 320,
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 24,
                  gap: 14,
                  alignSelf: 'flex-start',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    ...textStyles.label,
                    color: colors.textSecondary,
                  }}
                >
                  What happens next
                </Text>
                {STEP_ROUTES.map((step, idx) => {
                  const isComplete = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <View
                      key={step}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                      {isComplete ? (
                        <CheckCircle2 size={20} color={colors.success} />
                      ) : (
                        <Circle
                          size={20}
                          color={isCurrent ? colors.primary[600] : colors.borderStrong}
                        />
                      )}
                      <Text
                        style={{
                          ...textStyles['body-md'],
                          fontFamily: isCurrent ? 'Inter_600SemiBold' : 'Inter_500Medium',
                          color: isCurrent
                            ? colors.textPrimary
                            : isComplete
                              ? colors.textSecondary
                              : colors.textTertiary,
                        }}
                      >
                        {STEP_LABELS[step]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Stack screenOptions={MOBILE_STACK_OPTIONS} />
          )}
        </View>

        {/* Italic step counter footer */}
        {!isFinal ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Fraunces_400Regular',
                fontSize: 13,
                fontStyle: 'italic',
                color: colors.textTertiary,
              }}
            >
              Step {currentIdx + 1} of {STEP_ROUTES.length} · {STEP_LABELS[STEP_ROUTES[currentIdx] ?? 'service-select']}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

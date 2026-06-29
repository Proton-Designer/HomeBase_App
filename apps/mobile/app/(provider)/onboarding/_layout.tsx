import React, { useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { useSafeBack } from '../../../lib/useSafeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { TextStyle } from 'react-native';
import { colors, textStyles, numericTabular } from '../../../tokens';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';

const STEPS = [
  'business',
  'verify-phone',
  'services',
  'service-area',
  'profile',
] as const;

const STEP_LABELS: Record<string, string> = {
  business: 'Business info',
  'verify-phone': 'Verify phone',
  services: 'Services',
  'service-area': 'Service area',
  profile: 'Public profile',
};

export default function ProviderOnboardingLayout() {
  const goBack = useSafeBack();
  const router = useRouter();
  const segments = useSegments();
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && bp === 'desktop';
  const last = segments[segments.length - 1] as (typeof STEPS)[number] | undefined;
  const idx = last ? STEPS.indexOf(last) : 0;
  const fillRatio = (idx + 1) / STEPS.length;

  // Back should go to the PREVIOUS STEP, not pop the navigation stack. On resume the wizard
  // is entered with a single screen on the stack (router.push to the saved step), so a plain
  // goBack() would exit onboarding entirely instead of stepping back. Navigate by index so
  // Back is correct whether the user arrived via the normal flow or a Save & exit → resume.
  const goToPrevStep = () => {
    if (idx > 0) {
      router.replace(`/(provider)/onboarding/${STEPS[idx - 1]}` as never);
    } else {
      goBack();
    }
  };

  // Remember the current step (persisted) so Save & exit → reopen resumes here instead of
  // restarting at step 1. Only track the 5 main wizard steps (not banking/verification).
  const setLastStep = useProviderOnboardingStore((s) => s.setLastStep);
  useEffect(() => {
    if (last && (STEPS as readonly string[]).includes(last)) setLastStep(last);
  }, [last, setLastStep]);

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(fillRatio, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [fillRatio, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  if (isWebDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
        {/* Left sidebar: step list */}
        <View
          style={{
            width: 220,
            backgroundColor: colors.primary[50],
            borderRightWidth: 1,
            borderRightColor: colors.border,
            paddingHorizontal: 20,
            paddingVertical: 32,
            gap: 4,
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 11,
              fontStyle: 'italic',
              letterSpacing: 0.5,
              color: colors.primary[600],
              textTransform: 'uppercase',
              marginBottom: 16,
            } as TextStyle}
          >
            Provider setup
          </Text>
          {STEPS.map((step, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <View
                key={step}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: active ? colors.primary[100] : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: done
                      ? colors.success
                      : active
                      ? colors.primary[600]
                      : colors.divider,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {done ? (
                    <Check size={12} color={colors.textInverse} />
                  ) : (
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 10,
                        color: active ? colors.textInverse : colors.textTertiary,
                        ...numericTabular,
                      } as TextStyle}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    fontSize: 13,
                    color: active
                      ? colors.primary[700]
                      : done
                      ? colors.textSecondary
                      : colors.textTertiary,
                  } as TextStyle}
                >
                  {STEP_LABELS[step] ?? step}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Right: centered wizard card */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
          <View style={{ width: '100%', maxWidth: 720, flex: 1 }}>
            {/* Minimal top bar with back/save */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 24,
                paddingTop: 20,
                paddingBottom: 8,
              }}
            >
              {idx > 0 ? (
                <Pressable
                  onPress={goToPrevStep}
                  hitSlop={8}
                  style={[
                    { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                  ]}
                >
                  <ChevronLeft size={20} color={colors.textPrimary} />
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 14,
                      color: colors.textPrimary,
                    } as TextStyle}
                  >
                    Back
                  </Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable
                hitSlop={8}
                onPress={() => router.replace('/(provider)/(tabs)/today')}
                style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined}
              >
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    fontFamily: 'Inter_600SemiBold',
                    fontWeight: '600',
                    color: colors.primary[600],
                  }}
                >
                  Save & exit
                </Text>
              </Pressable>
            </View>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 220,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  // Native + web mobile/tablet: existing progress-bar layout
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        {idx > 0 ? (
          <Pressable onPress={goToPrevStep} hitSlop={8} style={{ padding: 8 }}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text
            style={{
              ...textStyles.label,
              color: colors.textTertiary,
              fontSize: 10,
            }}
          >
            Provider setup
          </Text>
          <Text
            style={{
              ...textStyles['editorial-title'],
              ...numericTabular,
              fontSize: 18,
              lineHeight: 22,
              color: colors.textPrimary,
              marginTop: 2,
            }}
          >
            {idx + 1}
            <Text style={{ color: colors.textTertiary }}> / {STEPS.length}</Text>
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => router.replace('/(provider)/(tabs)/today')}
          style={{ padding: 8 }}
        >
          <Text
            style={{
              ...textStyles['body-sm'],
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '600',
              color: colors.primary[600],
            }}
          >
            Save & exit
          </Text>
        </Pressable>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: colors.divider,
          marginHorizontal: 20,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: 8,
              backgroundColor: colors.primary[600],
              borderRadius: 999,
            },
            fillStyle,
          ]}
        />
      </View>
      <Stack
        screenOptions={{
          headerShown: false,
          // Disable swipe-back so the in-wizard Back arrow (which steps by index) is the only
          // back affordance — otherwise a swipe pops the single-screen resumed stack and exits.
          gestureEnabled: false,
          animation: 'slide_from_right',
          animationDuration: 220,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </SafeAreaView>
  );
}

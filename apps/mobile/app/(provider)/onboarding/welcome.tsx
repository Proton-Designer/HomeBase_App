import React from 'react';
import { View, Text, ScrollView, Platform , Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../stores/authStore';
import type { TextStyle } from 'react-native';
import { colors, textStyles, fonts } from '../../../tokens';
import { enterStaggered } from '../../../lib/motion';
import { useBreakpoint } from '../../../lib/useBreakpoint';

const VALUE_PROPS = [
  {
    title: 'No lead fees',
    body: 'Pay only when a job completes — 10–17.5%, never up-front.',
    num: '01',
  },
  {
    title: 'Instant payouts',
    body: 'Same-day payouts via Stripe. No 7-30 day waits.',
    num: '02',
  },
  {
    title: 'Flexible schedule',
    body: 'You set your service area, then pick when to take each job. We route only fitting work.',
    num: '03',
  },
  {
    title: 'Real protection',
    body: 'Background-checked + insured providers stand out and earn more.',
    num: '04',
  },
];

function StartCTA({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = () => {
    if (Platform.OS !== 'web') {
      scale.value = withTiming(0.982, { duration: 100 });
      opacity.value = withTiming(0.92, { duration: 100 });
    }
  };
  const onPressOut = () => {
    if (Platform.OS !== 'web') {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 150 });
    }
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          backgroundColor: colors.primary[700],
          borderRadius: 14,
          paddingVertical: 16,
          paddingHorizontal: 20,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: fonts.displaySemibold,
            fontSize: 16,
            fontWeight: '600',
            color: colors.accent[300],
            letterSpacing: 0.2,
          } as TextStyle}
        >
          Get started
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            fontStyle: 'italic',
            color: colors.accent[500],
            marginTop: 3,
          } as TextStyle}
        >
          {'→'} takes about 4 minutes
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ProviderWelcomeStep() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const isDesktop = useBreakpoint() === 'desktop';

  const onGetStarted = () => {
    if (status !== 'authenticated' || role !== 'provider_owner') {
      router.replace({ pathname: '/(auth)/sign-up', params: { role: 'provider' } });
      return;
    }
    router.push('/(provider)/onboarding/business');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 24, gap: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 720,
            alignSelf: 'center',
            gap: 24,
          }}
        >
          {/* Hero */}
          <View style={{ marginTop: 16, gap: 10 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 11,
                fontStyle: 'italic',
                letterSpacing: 0.6,
                color: colors.accent[500],
                textTransform: 'lowercase',
              } as TextStyle}
            >
              for providers
            </Text>
            <Text
              style={{
                fontFamily: fonts.editorial,
                fontSize: isDesktop ? 40 : 32,
                fontWeight: '700',
                lineHeight: isDesktop ? 46 : 38,
                letterSpacing: -1,
                color: colors.textPrimary,
              } as TextStyle}
            >
              Start earning with MyHomebase
            </Text>
            <Text
              style={{
                ...textStyles['body-lg'],
                color: colors.textSecondary,
                lineHeight: 26,
              }}
            >
              Replace your Angi/Thumbtack lead spend with completion-based jobs from real homeowners in your area.
            </Text>
          </View>

          {/* Value prop cards — italic numbered eyebrow instead of icon circles */}
          <View style={{ gap: 12 }}>
            {VALUE_PROPS.map((vp, i) => (
              <Animated.View key={vp.title} entering={enterStaggered(i)}>
                <Card>
                  <View style={{ gap: 6 }}>
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 10,
                        fontStyle: 'italic',
                        color: colors.accent[500],
                        letterSpacing: 0.5,
                      } as TextStyle}
                    >
                      {vp.num} / 04
                    </Text>
                    <Text
                      style={{
                        ...textStyles['title-md'],
                        color: colors.textPrimary,
                      }}
                    >
                      {vp.title}
                    </Text>
                    <Text
                      style={{
                        ...textStyles['body-sm'],
                        color: colors.textSecondary,
                      }}
                    >
                      {vp.body}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <StartCTA onPress={onGetStarted} />
        </View>
      </View>
    </View>
  );
}

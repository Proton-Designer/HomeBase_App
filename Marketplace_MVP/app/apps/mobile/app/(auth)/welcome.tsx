import React from 'react';
import { View, Text, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { useHeroLoad, usePress } from '../../lib/motion';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { colors, textStyles, fonts } from '../../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATS: { numeral: string; label: string }[] = [
  { numeral: 'Vetted', label: 'pros only' },
  { numeral: 'One pro', label: 'per booking' },
  { numeral: 'Same day', label: 'pay for pros' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const choreo = useHeroLoad();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';

  const goToSignUp = () => router.push('/(auth)/sign-up');
  const goToProviderSignUp = () =>
    router.push({ pathname: '/(auth)/sign-up', params: { role: 'provider' } });

  const headlineSize = isMobile ? 44 : bp === 'tablet' ? 56 : 68;
  const headlineLineHeight = isMobile ? 48 : bp === 'tablet' ? 60 : 72;
  const headlineLetterSpacing = isMobile ? -1 : -1.5;

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary[700] }}>
      <LinearGradient
        colors={[colors.primary[800], colors.primary[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.35, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Atmospheric floating circles */}
      <View
        style={{
          position: 'absolute',
          top: -160,
          right: -120,
          width: 460,
          height: 460,
          borderRadius: 230,
          backgroundColor: colors.accent[400],
          opacity: 0.13,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 80,
          right: 40,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: colors.accent[300],
          opacity: 0.08,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -200,
          left: -160,
          width: 520,
          height: 520,
          borderRadius: 260,
          backgroundColor: colors.primary[500],
          opacity: 0.38,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 120,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: colors.accent[500],
          opacity: 0.06,
        }}
      />

      {/* Web-only warm amber tint overlay */}
      {Platform.OS === 'web' && (
        <LinearGradient
          colors={['transparent', 'rgba(232,160,32,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
      )}

      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: isMobile ? 24 : 48,
            paddingTop: isMobile ? 32 : 64,
            justifyContent: 'space-between',
            maxWidth: 880,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <View style={{ flex: 1, justifyContent: 'center', gap: 0 }}>
            {/* Headline */}
            <Animated.Text
              entering={choreo.headline}
              style={{
                fontFamily: fonts.editorial,
                fontSize: headlineSize,
                lineHeight: headlineLineHeight,
                color: colors.textInverse,
                letterSpacing: headlineLetterSpacing,
                marginBottom: 20,
              }}
            >
              Find trusted home services, curated for your block.
            </Animated.Text>

            {/* Body */}
            <Animated.Text
              entering={choreo.body}
              style={{
                ...textStyles['body-lg'],
                color: 'rgba(255,255,255,0.86)',
                maxWidth: 560,
                marginBottom: 16,
              }}
            >
              One vetted pro per booking. Transparent pricing. Same-day pay for the people who do the work.
            </Animated.Text>

            {/* Decorative rule beneath body */}
            <Animated.View entering={choreo.body} style={{ marginBottom: 20 }}>
              <View
                style={{
                  height: 1,
                  width: 64,
                  backgroundColor: colors.accent[400],
                  opacity: 0.4,
                }}
              />
            </Animated.View>

            {/* Pull-quote: "No spam. No bidding wars." */}
            <Animated.View
              entering={choreo.body}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}
            >
              <View
                style={{
                  width: 2,
                  height: 32,
                  backgroundColor: colors.accent[400],
                  borderRadius: 1,
                  opacity: 0.7,
                }}
              />
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontStyle: 'italic',
                  fontSize: 13,
                  lineHeight: 19,
                  color: 'rgba(255,255,255,0.65)',
                  letterSpacing: 0.1,
                }}
              >
                No spam. No bidding wars.
              </Text>
            </Animated.View>
          </View>

          {/* CTAs */}
          <Animated.View
            entering={choreo.cta}
            style={{
              gap: 12,
              paddingBottom: 8,
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
            }}
          >
            <Button
              label="Get started"
              variant="secondary"
              size="lg"
              fullWidth={isMobile}
              onPress={goToSignUp}
            />
            <SignInGhost onPress={() => router.push('/(auth)/sign-in')} fullWidth={isMobile} />
          </Animated.View>

          {/* Provider entry — quieter, under the main CTAs */}
          <Animated.View
            entering={choreo.cta}
            style={{
              paddingBottom: 16,
              alignItems: isMobile ? 'center' : 'flex-start',
            }}
          >
            <Pressable
              onPress={goToProviderSignUp}
              hitSlop={8}
              style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontStyle: 'italic',
                  fontSize: 13,
                  lineHeight: 19,
                  color: colors.accent[300],
                  letterSpacing: 0.1,
                }}
              >
                I run a service business{'  '}
                <Text style={{ fontFamily: fonts.displaySemibold, fontStyle: 'normal' }}>→</Text>
              </Text>
            </Pressable>
          </Animated.View>

          {/* Stat brags */}
          <Animated.View
            entering={choreo.stats}
            style={{
              flexDirection: 'row',
              gap: isMobile ? 24 : 40,
              paddingBottom: 32,
              alignItems: 'flex-start',
            }}
          >
            {STATS.map((s) => (
              <StatBrag key={s.numeral} numeral={s.numeral} label={s.label} />
            ))}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatBrag({ numeral, label }: { numeral: string; label: string }) {
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 28,
          lineHeight: 32,
          fontWeight: '700',
          color: colors.textInverse,
          letterSpacing: -0.5,
        }}
      >
        {numeral}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontStyle: 'italic',
          fontSize: 12,
          lineHeight: 17,
          color: 'rgba(255,255,255,0.55)',
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SignInGhost({ onPress, fullWidth }: { onPress: () => void; fullWidth: boolean }) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={Platform.OS !== 'web' ? onPressIn : undefined}
      onPressOut={Platform.OS !== 'web' ? onPressOut : undefined}
      style={[
        {
          height: 56,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 22,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        Platform.OS !== 'web' ? animatedStyle : null,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.displaySemibold,
          fontSize: 17,
          lineHeight: 22,
          color: colors.textInverse,
        }}
      >
        Sign in
      </Text>
    </AnimatedPressable>
  );
}

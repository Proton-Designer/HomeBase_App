import React from 'react';
import { View, Text, Platform, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { useHeroLoad, usePress } from '../../lib/motion';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { colors, textStyles, fonts } from '../../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={['#FFFFFF', colors.background]}
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
          backgroundColor: colors.primary[200],
          opacity: 0.12,
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
          backgroundColor: colors.primary[300],
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
          backgroundColor: colors.primary[200],
          opacity: 0.10,
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
          backgroundColor: colors.primary[300],
          opacity: 0.08,
        }}
      />

      {/* Web-only faint blue tint overlay */}
      {Platform.OS === 'web' && (
        <LinearGradient
          colors={['transparent', 'rgba(37,99,235,0.04)']}
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
          <Animated.View
            entering={choreo.headline}
            style={{ alignSelf: 'flex-start' }}
          >
            <Image
              source={require('../../assets/wordmark.png')}
              style={{ width: isMobile ? 178 : 216, height: isMobile ? 37 : 44 }}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="MyHomeBase"
            />
          </Animated.View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Animated.Text
              entering={choreo.headline}
              style={{
                fontFamily: fonts.editorial,
                fontSize: headlineSize,
                lineHeight: headlineLineHeight,
                color: colors.textPrimary,
                letterSpacing: headlineLetterSpacing,
                marginBottom: 20,
              }}
            >
              The simpler way to book trusted home services
            </Animated.Text>

            {/* Body */}
            <Animated.Text
              entering={choreo.body}
              style={{
                ...textStyles['body-lg'],
                color: colors.textSecondary,
                maxWidth: 560,
                marginBottom: 16,
              }}
            >
              Book vetted professionals with transparent trust scores, recurring plans, and real
              accountability — all through one seamless experience.
            </Animated.Text>

            {/* Decorative rule beneath body */}
            <Animated.View entering={choreo.body} style={{ marginBottom: 20 }}>
              <View
                style={{
                  height: 1,
                  width: 64,
                  backgroundColor: colors.primary[400],
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
                  backgroundColor: colors.primary[500],
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
                  color: colors.textSecondary,
                  letterSpacing: 0.1,
                }}
              >
                Home care on autopilot.
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
              variant="primary"
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
                  color: colors.primary[600],
                  letterSpacing: 0.1,
                }}
              >
                I run a service business{'  '}
                <Text style={{ fontFamily: fonts.displaySemibold, fontStyle: 'normal' }}>→</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
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
          borderColor: colors.primary[600],
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
          color: colors.primary[700],
        }}
      >
        Sign in
      </Text>
    </AnimatedPressable>
  );
}

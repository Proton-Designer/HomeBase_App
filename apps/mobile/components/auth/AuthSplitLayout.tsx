import React from 'react';
import { View, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { colors, fonts } from '../../tokens';

const BRAND_STATS: { numeral: string; label: string }[] = [
  { numeral: '12', label: 'vetted pros' },
  { numeral: '4 min', label: 'avg match' },
  { numeral: 'Same day', label: 'pay for pros' },
];

function BrandPanel() {
  return (
    <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <LinearGradient
        colors={[colors.primary[800], colors.primary[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Atmospheric circles */}
      <View
        style={{
          position: 'absolute',
          top: -120,
          right: -100,
          width: 380,
          height: 380,
          borderRadius: 190,
          backgroundColor: colors.accent[400],
          opacity: 0.12,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -160,
          left: -120,
          width: 420,
          height: 420,
          borderRadius: 210,
          backgroundColor: colors.primary[500],
          opacity: 0.35,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 100,
          right: -30,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: colors.accent[500],
          opacity: 0.07,
        }}
      />

      {/* Content */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 48,
          paddingVertical: 56,
          justifyContent: 'space-between',
        }}
      >
        {/* Top: wordmark */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              backgroundColor: colors.accent[400],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 17,
                color: colors.primary[800],
                fontWeight: '700',
              }}
            >
              HB
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 20,
              color: colors.textInverse,
              fontWeight: '700',
            }}
          >
            MyHomebase
          </Text>
        </View>

        {/* Middle: headline + tagline */}
        <View style={{ gap: 20 }}>
          <Text
            style={{
              fontFamily: fonts.editorial,
              fontSize: 48,
              lineHeight: 52,
              color: colors.textInverse,
              letterSpacing: -1,
            }}
          >
            Home services, done right.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <View
              style={{
                width: 2,
                height: 36,
                backgroundColor: colors.accent[400],
                borderRadius: 1,
                opacity: 0.75,
              }}
            />
            <Text
              style={{
                fontFamily: fonts.body,
                fontStyle: 'italic',
                fontSize: 15,
                lineHeight: 22,
                color: 'rgba(255,255,255,0.72)',
                flex: 1,
              }}
            >
              Compare vetted pros, you choose who to hire. No lead auctions. Same-day pay for the people who do the work.
            </Text>
          </View>
        </View>

        {/* Bottom: stats */}
        <View style={{ flexDirection: 'row', gap: 36 }}>
          {BRAND_STATS.map((s) => (
            <View key={s.numeral} style={{ gap: 2 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 26,
                  lineHeight: 30,
                  color: colors.textInverse,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                }}
              >
                {s.numeral}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontStyle: 'italic',
                  fontSize: 12,
                  lineHeight: 17,
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

interface AuthSplitLayoutProps {
  children: React.ReactNode;
}

/**
 * On web tablet/desktop: renders a two-column split — brand panel left, form right.
 * On native and mobile-web: renders children directly (full-screen, existing native layout).
 */
export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';

  if (!isWebSplit) {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
      <BrandPanel />
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

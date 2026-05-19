import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, textStyles } from '../../tokens';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { useHeroLoad } from '../../lib/motion';
import { Eyebrow } from './Eyebrow';

type Tone = 'cream' | 'feature';

export interface HeroProps {
  eyebrow?: string;
  headline: string;
  body?: string;
  ctas?: React.ReactNode;
  tone?: Tone;
  style?: ViewStyle;
}

const PADDING_Y = { mobile: 56, tablet: 96, desktop: 128 };

export function Hero({
  eyebrow,
  headline,
  body,
  ctas,
  tone = 'cream',
  style,
}: HeroProps) {
  const bp = useBreakpoint();
  const choreo = useHeroLoad();
  const inverse = tone === 'feature';
  const py = PADDING_Y[bp];
  const px = bp === 'desktop' ? 32 : bp === 'tablet' ? 24 : 20;
  const maxBody = bp === 'desktop' ? 640 : '100%';

  const headlineSize = bp === 'mobile' ? 36 : 48;
  const headlineLineHeight = bp === 'mobile' ? 40 : 52;

  const inner = (
    <View
      style={{
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
        paddingHorizontal: px,
        gap: 16,
      }}
    >
      {eyebrow ? (
        <Animated.View entering={choreo.logo}>
          <Eyebrow tone={inverse ? 'inverse' : 'default'}>{eyebrow}</Eyebrow>
        </Animated.View>
      ) : null}
      <Animated.Text
        entering={choreo.headline}
        style={[
          textStyles['editorial-hero'],
          {
            fontSize: headlineSize,
            lineHeight: headlineLineHeight,
            color: inverse ? colors.textInverse : colors.textPrimary,
            maxWidth: bp === 'desktop' ? 880 : '100%',
          },
        ]}
      >
        {headline}
      </Animated.Text>
      {body ? (
        <Animated.Text
          entering={choreo.body}
          style={[
            textStyles['body-lg'],
            {
              color: inverse ? 'rgba(255,255,255,0.86)' : colors.textSecondary,
              maxWidth: maxBody,
            },
          ]}
        >
          {body}
        </Animated.Text>
      ) : null}
      {ctas ? (
        <Animated.View entering={choreo.cta} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          {ctas}
        </Animated.View>
      ) : null}
    </View>
  );

  if (tone === 'feature') {
    return (
      <LinearGradient
        colors={[colors.primary[700], colors.primary[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[{ width: '100%', paddingVertical: py }, style]}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        { width: '100%', paddingVertical: py, backgroundColor: colors.background },
        style,
      ]}
    >
      {inner}
    </View>
  );
}

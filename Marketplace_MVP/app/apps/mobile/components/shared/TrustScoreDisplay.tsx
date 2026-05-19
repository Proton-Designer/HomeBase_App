import React from 'react';
import { Platform, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, numericTabular, textStyles } from '../../tokens';
import type { CompositeScore } from '../../lib/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface TrustScoreDisplayProps {
  scores: Pick<CompositeScore, 'reliability' | 'quality' | 'communication' | 'professionalism'>;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  showOverall?: boolean;
  animated?: boolean;
  style?: ViewStyle;
}

const ringSizes: Record<'sm' | 'md' | 'lg', { d: number; stroke: number; font: number; gap: number }> = {
  sm: { d: 36, stroke: 4, font: 11, gap: 8 },
  md: { d: 56, stroke: 5, font: 14, gap: 12 },
  lg: { d: 84, stroke: 7, font: 18, gap: 16 },
};

function colorForScore(score: number): string {
  if (score >= 4.5) return colors.success;
  if (score >= 3.5) return colors.accent[500];
  if (score >= 2.5) return colors.warning;
  return colors.error;
}

interface RingProps {
  score: number;
  label: string;
  size: 'sm' | 'md' | 'lg';
  showLabel: boolean;
  animated: boolean;
  delayMs: number;
}

function Ring({ score, label, size, showLabel, animated, delayMs }: RingProps) {
  const dims = ringSizes[size];
  const radius = (dims.d - dims.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(1, score / 5));
  const progress = useSharedValue(animated ? 0 : target);

  React.useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        delayMs,
        withTiming(target, { duration: 800, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [animated, delayMs, progress, target]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const stroke = colorForScore(score);

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: dims.d,
          height: dims.d,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={dims.d} height={dims.d}>
          <Circle
            cx={dims.d / 2}
            cy={dims.d / 2}
            r={radius}
            stroke={colors.divider}
            strokeWidth={dims.stroke}
            fill="transparent"
          />
          <AnimatedCircle
            cx={dims.d / 2}
            cy={dims.d / 2}
            r={radius}
            stroke={stroke}
            strokeWidth={dims.stroke}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animProps}
            transform={`rotate(-90 ${dims.d / 2} ${dims.d / 2})`}
          />
        </Svg>
        <View
          style={{
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: dims.font,
              color: colors.textPrimary,
              ...numericTabular,
            }}
          >
            {score.toFixed(1)}
          </Text>
        </View>
      </View>
      {showLabel ? (
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: 'Inter_500Medium',
            fontSize: 11,
            color: colors.textSecondary,
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function TrustScoreDisplay({
  scores,
  size = 'md',
  showLabels = true,
  showOverall = true,
  animated = true,
  style,
}: TrustScoreDisplayProps) {
  const overall =
    scores.reliability * 0.35 +
    scores.quality * 0.35 +
    scores.communication * 0.2 +
    scores.professionalism * 0.1;

  const dims = ringSizes[size];

  return (
    <View
      style={[
        style,
        Platform.OS === 'web' ? ({ cursor: 'default' } as object) : null,
      ]}
    >
      {showOverall ? (
        <View style={{ alignItems: 'center', marginBottom: dims.gap }}>
          <Text
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: size === 'lg' ? 44 : size === 'md' ? 32 : 24,
              lineHeight: size === 'lg' ? 48 : size === 'md' ? 36 : 28,
              color: colors.textPrimary,
              letterSpacing: -0.5,
              ...numericTabular,
            }}
          >
            {overall.toFixed(1)}
          </Text>
          <Text
            style={{
              ...textStyles.label,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            Trust score
          </Text>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: dims.gap,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ width: '48%', alignItems: 'center' }}>
          <Ring
            score={scores.reliability}
            label="Reliability"
            size={size}
            showLabel={showLabels}
            animated={animated}
            delayMs={0}
          />
        </View>
        <View style={{ width: '48%', alignItems: 'center' }}>
          <Ring
            score={scores.quality}
            label="Quality"
            size={size}
            showLabel={showLabels}
            animated={animated}
            delayMs={100}
          />
        </View>
        <View style={{ width: '48%', alignItems: 'center' }}>
          <Ring
            score={scores.communication}
            label="Communication"
            size={size}
            showLabel={showLabels}
            animated={animated}
            delayMs={200}
          />
        </View>
        <View style={{ width: '48%', alignItems: 'center' }}>
          <Ring
            score={scores.professionalism}
            label="Professionalism"
            size={size}
            showLabel={showLabels}
            animated={animated}
            delayMs={300}
          />
        </View>
      </View>
    </View>
  );
}

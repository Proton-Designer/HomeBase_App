import React from 'react';
import { View, Text } from 'react-native';
import { Star, ShieldCheck, Sparkles } from 'lucide-react-native';
import { colors, fonts, numericTabular, textStyles } from '../../tokens';

/**
 * Honest, early-stage trust display. We do NOT show a 4-component breakdown or a
 * fabricated score. The verified-job count is the concrete signal that grows; a
 * star rating only appears once there are enough real reviews to be meaningful.
 */
export interface TrustSummaryProps {
  /** providers.composite_score_overall (computed from real homeowner check-ins). */
  overall?: number | null;
  /** Number of verified homeowner reviews (providers.check_in_count). */
  checkInCount: number;
  variant?: 'detail' | 'inline';
}

/** Below this many verified reviews, a single average is too noisy to show as a rating. */
export const RATING_MIN_REVIEWS = 3;

function jobsLabel(n: number): string {
  return `${n} verified ${n === 1 ? 'job' : 'jobs'}`;
}

export function TrustSummary({ overall, checkInCount, variant = 'inline' }: TrustSummaryProps) {
  const hasRating = checkInCount >= RATING_MIN_REVIEWS && (overall ?? 0) > 0;
  const isNew = checkInCount === 0;

  if (variant === 'inline') {
    if (hasRating) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Star size={13} color={colors.accent[500]} fill={colors.accent[500]} />
          <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, ...numericTabular }}>
            {(overall as number).toFixed(1)} · {jobsLabel(checkInCount)}
          </Text>
        </View>
      );
    }
    return (
      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
        {isNew ? 'New to MyHomebase' : `${jobsLabel(checkInCount)} · early reviews`}
      </Text>
    );
  }

  // detail
  if (hasRating) {
    return (
      <View style={{ alignItems: 'center', gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Star size={26} color={colors.accent[500]} fill={colors.accent[500]} />
          <Text
            style={{ fontFamily: fonts.editorial, fontSize: 40, lineHeight: 44, color: colors.textPrimary, ...numericTabular }}
          >
            {(overall as number).toFixed(1)}
          </Text>
        </View>
        <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
          Based on {jobsLabel(checkInCount)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {isNew ? (
          <Sparkles size={18} color={colors.primary[600]} />
        ) : (
          <ShieldCheck size={18} color={colors.success} />
        )}
        <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
          {isNew ? 'New to MyHomebase' : jobsLabel(checkInCount)}
        </Text>
      </View>
      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, textAlign: 'center' }}>
        {isNew
          ? 'Verified reviews appear here as jobs complete.'
          : 'Early reviews — a star rating appears once a few more jobs are done.'}
      </Text>
    </View>
  );
}

export default TrustSummary;

import React from 'react';
import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { Eyebrow } from '../ui/Eyebrow';
import { enter } from '../../lib/motion';
import { colors, textStyles, fonts } from '../../tokens';

interface AuthHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  /** Web split hides the magazine masthead line and removes the top margin. */
  isWebSplit: boolean;
  /**
   * Fire the mount entrance. Set false when a parent owns the transition (e.g.
   * the sign-up role cross-fade) to avoid stacking two entering animations.
   */
  animateOnMount?: boolean;
}

export function AuthHeader({
  eyebrow,
  title,
  subtitle,
  isWebSplit,
  animateOnMount = true,
}: AuthHeaderProps) {
  return (
    <Animated.View
      entering={animateOnMount ? enter : undefined}
      style={{ gap: 4, marginTop: isWebSplit ? 0 : 8 }}
    >
      {!isWebSplit && (
        <Text
          style={{
            fontFamily: fonts.body,
            fontStyle: 'italic',
            fontSize: 12,
            lineHeight: 17,
            color: colors.textTertiary,
            letterSpacing: 0.2,
          }}
        >
          MyHomebase · Issue 01
        </Text>
      )}
      {eyebrow ? (
        <>
          <View style={{ height: 6 }} />
          <Eyebrow>{eyebrow}</Eyebrow>
          <View style={{ height: 6 }} />
        </>
      ) : (
        <View style={{ height: 6 }} />
      )}
      <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>{title}</Text>
      <Text style={{ ...textStyles['body-lg'], color: colors.textSecondary, marginTop: 8 }}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}

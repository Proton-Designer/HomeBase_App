import React from 'react';
import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { enter } from '../../lib/motion';
import { colors, fonts } from '../../tokens';

export const HOMEOWNER_BULLETS: string[] = [
  'Compare vetted pros — you choose who to hire',
  'Same-day pay for the people who do the work',
  'Real protection, not fine print',
];

interface WhyHomeBaseCalloutProps {
  title: string;
  bullets: string[];
}

export function WhyHomeBaseCallout({ title, bullets }: WhyHomeBaseCalloutProps) {
  return (
    <Animated.View
      entering={enter}
      style={{
        marginTop: 28,
        backgroundColor: colors.primary[50],
        borderRadius: 12,
        padding: 16,
        gap: 10,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.displaySemibold,
          fontSize: 13,
          lineHeight: 18,
          color: colors.primary[700],
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {bullets.map((bullet) => (
        <View key={bullet} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.accent[500],
              marginTop: 6,
              flexShrink: 0,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              lineHeight: 20,
              color: colors.textSecondary,
              flex: 1,
            }}
          >
            {bullet}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
}

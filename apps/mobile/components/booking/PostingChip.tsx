import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import type { PillTone } from '../ui/Pill';
import { colors, textStyles } from '../../tokens';
import { usePress } from '../../lib/motion';
import type { Posting } from '../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const IS_WEB = Platform.OS === 'web';

const STATUS_CONFIG: Record<string, { label: string; tone: PillTone }> = {
  open: { label: 'Awaiting', tone: 'info' },
  matched: { label: 'Quoted', tone: 'success' },
  completed: { label: 'Done', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'error' },
};

export interface PostingChipProps {
  posting: Posting;
  serviceIcon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
}

export function PostingChip({ posting, serviceIcon: ServiceIcon, onPress }: PostingChipProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  const cfg = STATUS_CONFIG[posting.status] ?? STATUS_CONFIG['open']!;

  const quoteText =
    posting.matchCount > 0
      ? `${posting.matchCount} quote${posting.matchCount !== 1 ? 's' : ''}`
      : 'Awaiting quotes';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={`${posting.headline}, ${cfg.label}`}
      accessibilityRole="button"
      hitSlop={4}
      style={[
        IS_WEB ? ({ cursor: 'pointer' } as object) : null,
        IS_WEB ? null : animatedStyle,
      ]}
    >
      <Card
        variant="outlined"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minWidth: 200,
          maxWidth: 280,
          borderRadius: 12,
        }}
      >
        <ServiceIcon size={18} color={colors.primary[600]} />
        <View style={{ flex: 1 }}>
          <Text
            style={{ ...textStyles['title-md'], color: colors.textPrimary }}
            numberOfLines={1}
          >
            {posting.headline}
          </Text>
          <Text
            style={{ ...textStyles['body-sm'], color: colors.textSecondary }}
            numberOfLines={1}
          >
            {quoteText}
          </Text>
        </View>
        <Pill label={cfg.label} tone={cfg.tone} style={{ alignSelf: 'center' }} />
      </Card>
    </AnimatedPressable>
  );
}

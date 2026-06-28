import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { colors } from '../../tokens';

const IS_WEB = Platform.OS === 'web';

export interface VerificationBadgeProps {
  tier: 1 | 2;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  onLongPress?: () => void;
}

const tooltipText: Record<1 | 2, string> = {
  1: 'This provider has passed a national criminal background check',
  2: 'This provider carries general liability insurance (verified by MyHomebase)',
};

export function VerificationBadge({
  tier,
  size = 'sm',
  showLabel = true,
  onLongPress,
}: VerificationBadgeProps) {
  const Icon = tier === 2 ? ShieldAlert : ShieldCheck;
  const color = tier === 2 ? colors.accent[600] : colors.success;
  const bg = tier === 2 ? colors.accent[100] : colors.successLight;
  const label = tier === 2 ? 'Insured' : 'Background Checked';
  const iconSize = size === 'md' ? 16 : 12;
  const padH = size === 'md' ? 10 : 7;
  const padV = size === 'md' ? 5 : 3;
  const fontSize = size === 'md' ? 12 : 11;

  const onPress = () => {
    onLongPress?.();
    console.log(`[VerificationBadge] ${tooltipText[tier]}`);
  };

  return (
    <Pressable
      onLongPress={onPress}
      hitSlop={6}
      style={IS_WEB ? ({ cursor: 'help' } as object) : undefined}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: bg,
          paddingHorizontal: padH,
          paddingVertical: padV,
          borderRadius: 999,
        }}
      >
        <Icon size={iconSize} color={color} />
        {showLabel ? (
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize,
              color,
            }}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

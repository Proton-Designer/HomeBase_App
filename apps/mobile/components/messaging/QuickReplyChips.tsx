import React from 'react';
import { Platform, Pressable, ScrollView, Text } from 'react-native';
import { colors } from '../../tokens';

interface QuickReplyChipsProps {
  role: 'homeowner' | 'provider';
  onSelect: (text: string) => void;
}

const HOMEOWNER_CHIPS = [
  'What time will you arrive?',
  'Can you send an estimate?',
  'Looks great, thank you!',
  'I have a question about the quote',
];

const PROVIDER_CHIPS = [
  "I'll be there at 8 AM",
  'On my way now',
  'Job is complete',
  'I need to reschedule',
];

export function QuickReplyChips({ role, onSelect }: QuickReplyChipsProps) {
  const chips = role === 'homeowner' ? HOMEOWNER_CHIPS : PROVIDER_CHIPS;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        flexDirection: 'row',
      }}
      style={{
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
      }}
    >
      {chips.map((chip) => (
        <Pressable
          key={chip}
          onPress={() => onSelect(chip)}
          accessibilityLabel={chip}
          accessibilityRole="button"
          style={[
            {
              height: 34,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.primary[600],
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: colors.primary[600],
            }}
          >
            {chip}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

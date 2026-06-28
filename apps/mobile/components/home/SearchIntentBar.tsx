import React, { useState } from 'react';
import { Platform, Pressable, TextInput, View, type ViewStyle } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors, shadows, textStyles } from '../../tokens';

export interface SearchIntentBarProps {
  onSubmit: (query: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchIntentBar({
  onSubmit,
  placeholder = 'What needs doing around the house?',
  style,
}: SearchIntentBarProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <View
      style={[
        {
          borderRadius: 14,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        shadows.sm,
        style,
      ]}
    >
      <Pressable
        onPress={handleSubmit}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Search"
        style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined}
      >
        <Search size={20} color={colors.textTertiary} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        style={[
          textStyles['body-md'],
          {
            flex: 1,
            color: colors.textPrimary,
            paddingVertical: 0,
          },
        ]}
      />
    </View>
  );
}

export default SearchIntentBar;

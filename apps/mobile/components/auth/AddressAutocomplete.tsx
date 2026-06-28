import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Input } from '../ui/Input';
import { colors, textStyles } from '../../tokens';
import { searchAddresses, type AddressSuggestion } from '../../lib/geo';

interface AddressAutocompleteProps {
  label?: string;
  placeholder?: string;
  errorMessage?: string;
  onSelect: (suggestion: AddressSuggestion) => void;
}

const DEBOUNCE_MS = 300;

export function AddressAutocomplete({
  label = 'Street address',
  placeholder = 'Start typing your address…',
  errorMessage,
  onSelect,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // Set right after a selection so the debounce effect doesn't re-search the label.
  const suppressRef = useRef(false);

  useEffect(() => {
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      // Keep the same [] reference when already empty to avoid a needless render per keystroke.
      setSuggestions((prev) => (prev.length === 0 ? prev : []));
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      const results = await searchAddresses(q, controller.signal);
      if (controller.signal.aborted) return;
      setSuggestions(results);
      setOpen(true);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [query]);

  const handlePick = (s: AddressSuggestion) => {
    suppressRef.current = true;
    setQuery(s.label);
    setSuggestions([]);
    setOpen(false);
    setLoading(false);
    onSelect(s);
  };

  return (
    <View>
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="words"
        autoCorrect={false}
        leftIcon={<MapPin size={18} color={colors.textSecondary} />}
        rightIcon={loading ? <ActivityIndicator size="small" color={colors.primary[600]} /> : undefined}
        errorMessage={errorMessage}
      />
      {open && suggestions.length > 0 ? (
        <View
          style={{
            marginTop: 6,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => handlePick(s)}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.divider,
                },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <MapPin size={16} color={colors.primary[600]} />
              <Text style={{ ...textStyles['body-md'], color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default AddressAutocomplete;

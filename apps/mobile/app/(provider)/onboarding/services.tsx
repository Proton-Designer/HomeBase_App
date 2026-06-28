import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Check,
  Search,
  Leaf,
  TreeDeciduous,
  Waves,
  Droplets,
  CloudRain,
  SquareDashedBottom as SquareDashed,
  Sun,
  Sparkles,
  Bug,
  Car,
} from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { colors, textStyles, serviceTints } from '../../../tokens';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';

interface ServiceOption {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
}

// Ordered so related verticals sit together: greenery → exterior surfaces → interior → other.
const SERVICES: ServiceOption[] = [
  { id: 'lawn', label: 'Lawn Care', Icon: Leaf, tint: serviceTints.lawn },
  { id: 'tree', label: 'Tree & Plant Trimming', Icon: TreeDeciduous, tint: serviceTints.tree },
  { id: 'pool', label: 'Pool Cleaning', Icon: Waves, tint: serviceTints.pool },
  { id: 'pressure', label: 'Pressure Washing', Icon: Droplets, tint: serviceTints.pressure },
  { id: 'gutter', label: 'Gutter Cleaning', Icon: CloudRain, tint: serviceTints.gutter },
  { id: 'window', label: 'Window Cleaning', Icon: SquareDashed, tint: serviceTints.window },
  { id: 'solar', label: 'Solar Panel Cleaning', Icon: Sun, tint: serviceTints.solar },
  { id: 'cleaning', label: 'Home Cleaning', Icon: Sparkles, tint: serviceTints.cleaning },
  { id: 'pest', label: 'Pest Control', Icon: Bug, tint: serviceTints.pest },
  { id: 'detailing', label: 'Car Detailing', Icon: Car, tint: serviceTints.detailing },
];

export default function ServicesStep() {
  const router = useRouter();
  const business = useProviderOnboardingStore((s) => s.business);
  const setBusiness = useProviderOnboardingStore((s) => s.setBusiness);
  const [services, setServices] = useState<string[]>(business.serviceTypes);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SERVICES;
    return SERVICES.filter((s) => s.label.toLowerCase().includes(q));
  }, [query]);

  const toggle = (id: string) =>
    setServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onContinue = () => {
    setBusiness({ serviceTypes: services });
    router.push('/(provider)/onboarding/service-area');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text
            style={{
              ...textStyles['editorial-title'],
              fontSize: 28,
              lineHeight: 34,
              color: colors.textPrimary,
            }}
          >
            Services offered
          </Text>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, marginTop: 6 }}>
            Pick everything you actively service.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            height: 48,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.border,
          }}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search services"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              ...textStyles['body-md'],
              color: colors.textPrimary,
              paddingVertical: 0,
            }}
          />
        </View>

        <View style={{ gap: 10 }}>
          {filtered.map((s) => {
            const sel = services.includes(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle(s.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: s.tint,
                  borderWidth: sel ? 2 : 1,
                  borderColor: sel ? colors.primary[600] : 'rgba(37, 99, 235, 0.08)',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <s.Icon size={18} color={colors.primary[700]} />
                </View>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary, flex: 1 }}>
                  {s.label}
                </Text>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    backgroundColor: sel ? colors.primary[600] : colors.surface,
                    borderWidth: 1.5,
                    borderColor: sel ? colors.primary[600] : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {sel ? <Check size={14} color={colors.textInverse} /> : null}
                </View>
              </Pressable>
            );
          })}
          {filtered.length === 0 ? (
            <Text
              style={{
                ...textStyles['body-md'],
                color: colors.textTertiary,
                textAlign: 'center',
                paddingVertical: 24,
              }}
            >
              No services match “{query}”.
            </Text>
          ) : null}
        </View>
      </ScrollView>
      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button
          label="Continue"
          fullWidth
          disabled={services.length === 0}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

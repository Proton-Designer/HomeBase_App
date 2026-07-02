import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Search } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { colors, textStyles, serviceTints } from '../../../tokens';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';
import { SERVICE_LABELS, SERVICE_ICONS } from '../../../lib/constants';
import type { ServiceType } from '../../../lib/types';

interface ServiceOption {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
}

// Ordered so related verticals sit together: greenery → exterior surfaces → interior → other.
const SERVICE_ORDER: ServiceType[] = [
  'lawn', 'tree', 'pool', 'pressure', 'gutter', 'window', 'solar', 'cleaning', 'pest', 'detailing',
];
const SERVICES: ServiceOption[] = SERVICE_ORDER.map((id) => ({
  id,
  label: SERVICE_LABELS[id],
  Icon: SERVICE_ICONS[id],
  tint: serviceTints[id],
}));

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

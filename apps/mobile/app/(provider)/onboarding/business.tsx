import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors, textStyles } from '../../../tokens';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';

const YEARS = ['<1 yr', '1–3 yrs', '3–5 yrs', '5+ yrs'];
const EMPLOYEES = ['Just me', '2–5', '6–10', '10+'];

export default function BusinessStep() {
  const router = useRouter();
  const business = useProviderOnboardingStore((s) => s.business);
  const setBusiness = useProviderOnboardingStore((s) => s.setBusiness);
  const [name, setName] = useState(business.businessName);
  const [years, setYears] = useState<string | null>(business.yearsInBusiness);
  const [employees, setEmployees] = useState<string | null>(business.employees);
  const [phone, setPhone] = useState(business.phone);

  const phoneDigits = phone.replace(/\D/g, '');
  const canContinue = name.trim().length > 1 && phoneDigits.length >= 10;

  const onContinue = () => {
    setBusiness({
      businessName: name.trim(),
      yearsInBusiness: years,
      employees,
      phone: phone.trim(),
    });
    router.push('/(provider)/onboarding/verify-phone');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View>
          <Text
            style={{
              ...textStyles['editorial-title'],
              fontSize: 28,
              lineHeight: 34,
              color: colors.textPrimary,
            }}
          >
            Tell us about your business
          </Text>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, marginTop: 6 }}>
            Homeowners see this on every match. You can edit it anytime.
          </Text>
        </View>

        <Input
          label="Business name *"
          placeholder="e.g. Johnson Premium Lawn Care"
          value={name}
          onChangeText={setName}
        />

        <PillSelect label="Years in business" options={YEARS} selected={years} onSelect={setYears} />
        <PillSelect
          label="Number of employees"
          options={EMPLOYEES}
          selected={employees}
          onSelect={setEmployees}
        />

        <Input
          label="Business phone *"
          placeholder="+1 555 123 4567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </ScrollView>
      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button label="Continue" fullWidth disabled={!canContinue} onPress={onContinue} />
      </View>
    </View>
  );
}

function PillSelect({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const sel = selected === o;
          return (
            <Pressable
              key={o}
              onPress={() => onSelect(o)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: sel ? colors.primary[600] : colors.surface,
                borderWidth: 1.5,
                borderColor: sel ? colors.primary[600] : colors.border,
              }}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: 'Inter_600SemiBold',
                  fontWeight: '600',
                  color: sel ? colors.textInverse : colors.textPrimary,
                }}
              >
                {o}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

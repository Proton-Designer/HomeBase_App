import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Check,
  Leaf,
  Sparkles,
  Waves,
  Bug,
  Droplets,
  SquareDashedBottom as SquareDashed,
  CloudRain,
  Car,
  TreeDeciduous,
  Sun,
} from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Pill } from '../../../components/ui/Pill';
import { colors, textStyles, serviceTints } from '../../../tokens';

type Phase = 'mvp1' | 'phase2' | 'phase3' | 'phase4';

interface ServiceOption {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
  phase: Phase;
}

const SERVICES: ServiceOption[] = [
  { id: 'lawn',      label: 'Lawn Care',             Icon: Leaf,         tint: serviceTints.lawn,      phase: 'mvp1' },
  { id: 'cleaning',  label: 'Home Cleaning',         Icon: Sparkles,     tint: serviceTints.cleaning,  phase: 'mvp1' },
  { id: 'pool',      label: 'Pool Cleaning',         Icon: Waves,        tint: serviceTints.pool,      phase: 'mvp1' },
  { id: 'pest',      label: 'Pest Control',          Icon: Bug,          tint: serviceTints.pest,      phase: 'mvp1' },
  { id: 'pressure',  label: 'Pressure Washing',      Icon: Droplets,     tint: serviceTints.pressure,  phase: 'mvp1' },
  { id: 'window',    label: 'Window Cleaning',       Icon: SquareDashed, tint: serviceTints.window,    phase: 'mvp1' },
  { id: 'gutter',    label: 'Gutter Cleaning',       Icon: CloudRain,    tint: serviceTints.gutter,    phase: 'phase2' },
  { id: 'detailing', label: 'Car Detailing',         Icon: Car,          tint: serviceTints.detailing, phase: 'phase2' },
  { id: 'tree',      label: 'Tree & Plant Trimming', Icon: TreeDeciduous, tint: serviceTints.tree,     phase: 'phase3' },
  { id: 'solar',     label: 'Solar Panel Cleaning',  Icon: Sun,          tint: serviceTints.solar,     phase: 'phase4' },
];

const PHASE_LABEL: Record<Phase, string> = {
  mvp1: '',
  phase2: 'Phase 2',
  phase3: 'Phase 3',
  phase4: 'Phase 4',
};

const YEARS = ['<1 yr', '1–3 yrs', '3–5 yrs', '5+ yrs'];
const EMPLOYEES = ['Just me', '2–5', '6–10', '10+'];

export default function BusinessStep() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [services, setServices] = useState<string[]>(['lawn']);
  const [years, setYears] = useState<string | null>(null);
  const [employees, setEmployees] = useState<string | null>(null);
  const [phone, setPhone] = useState('');

  const canContinue = name.trim().length > 1 && services.length > 0 && years && employees;

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
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Homeowners see this on every match. You can edit it anytime.
          </Text>
        </View>

        <Input
          label="Business name"
          placeholder="e.g. Johnson Premium Lawn Care"
          value={name}
          onChangeText={setName}
        />

        <View style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
              Services offered
            </Text>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              Pick everything you actively service. Phase 2+ verticals unlock as we expand.
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {SERVICES.map((s) => {
              const enabled = s.phase === 'mvp1';
              const sel = services.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  disabled={!enabled}
                  onPress={() =>
                    setServices((prev) => (sel ? prev.filter((x) => x !== s.id) : [...prev, s.id]))
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: s.tint,
                    borderWidth: sel ? 2 : 1,
                    borderColor: sel ? colors.primary[600] : 'rgba(26, 61, 43, 0.08)',
                    opacity: enabled ? 1 : 0.65,
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
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                      {s.label}
                    </Text>
                    {!enabled ? (
                      <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                        <Pill label={PHASE_LABEL[s.phase]} tone="neutral" />
                      </View>
                    ) : null}
                  </View>
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
          </View>
        </View>

        <PillSelect label="Years in business" options={YEARS} selected={years} onSelect={setYears} />
        <PillSelect
          label="Number of employees"
          options={EMPLOYEES}
          selected={employees}
          onSelect={setEmployees}
        />

        <Input
          label="Business phone"
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
        <Button
          label="Continue"
          fullWidth
          disabled={!canContinue}
          onPress={() => router.push('/(provider)/onboarding/service-area')}
        />
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

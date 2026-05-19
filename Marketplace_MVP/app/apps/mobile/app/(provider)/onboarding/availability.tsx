import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors, textStyles, numericTabular } from '../../../tokens';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const PRESETS = [
  { id: 'mf85', label: 'Mon–Fri 8am–5pm', days: [0, 1, 2, 3, 4], start: '08:00', end: '17:00' },
  { id: 'ms76', label: 'Mon–Sat 7am–6pm', days: [0, 1, 2, 3, 4, 5], start: '07:00', end: '18:00' },
  { id: 'custom', label: 'Custom', days: [], start: '', end: '' },
];
const NOTICE = ['Same day', '24 hours', '48 hours'];

export default function AvailabilityStep() {
  const router = useRouter();
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');
  const [notice, setNotice] = useState('24 hours');
  const [maxJobs, setMaxJobs] = useState('6');

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    if (p.id === 'custom') return;
    setActiveDays(p.days);
    setStart(p.start);
    setEnd(p.end);
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
            Set your weekly schedule
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Pick a preset or build a custom rhythm. Job requests honor it automatically.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => applyPreset(p)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: colors.divider,
              }}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: 'Inter_600SemiBold',
                  fontWeight: '600',
                  color: colors.textPrimary,
                }}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card>
          <Text
            style={{
              ...textStyles.label,
              fontSize: 11,
              color: colors.textSecondary,
              marginBottom: 12,
            }}
          >
            Active days
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {DAYS.map((d, i) => {
              const sel = activeDays.includes(i);
              return (
                <Pressable
                  key={d}
                  onPress={() =>
                    setActiveDays((prev) => (sel ? prev.filter((x) => x !== i) : [...prev, i]))
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderRadius: 10,
                    backgroundColor: sel ? colors.primary[600] : colors.divider,
                  }}
                >
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      fontFamily: 'Inter_600SemiBold',
                      fontWeight: '600',
                      color: sel ? colors.textInverse : colors.textSecondary,
                    }}
                  >
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...textStyles.label,
                  fontSize: 11,
                  color: colors.textSecondary,
                  marginBottom: 6,
                }}
              >
                Start
              </Text>
              <View
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    ...textStyles['title-md'],
                    ...numericTabular,
                    color: colors.textPrimary,
                  }}
                >
                  {start}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...textStyles.label,
                  fontSize: 11,
                  color: colors.textSecondary,
                  marginBottom: 6,
                }}
              >
                End
              </Text>
              <View
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    ...textStyles['title-md'],
                    ...numericTabular,
                    color: colors.textPrimary,
                  }}
                >
                  {end}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <View style={{ gap: 10 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            Minimum advance notice
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {NOTICE.map((n) => {
              const sel = notice === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setNotice(n)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: 'center',
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
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            Maximum jobs per day
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['3', '6', '8', '10+'].map((n) => {
              const sel = maxJobs === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setMaxJobs(n)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    alignItems: 'center',
                    borderRadius: 14,
                    backgroundColor: sel ? colors.primary[600] : colors.surface,
                    borderWidth: 1.5,
                    borderColor: sel ? colors.primary[600] : colors.border,
                  }}
                >
                  <Text
                    style={{
                      ...textStyles['display-md'],
                      ...numericTabular,
                      fontSize: 18,
                      lineHeight: 22,
                      color: sel ? colors.textInverse : colors.textPrimary,
                    }}
                  >
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
          onPress={() => router.push('/(provider)/onboarding/verification-tier1')}
        />
      </View>
    </View>
  );
}

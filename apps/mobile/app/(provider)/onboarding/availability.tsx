import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors, textStyles, numericTabular } from '../../../tokens';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';
import { onboard, saveServiceArea, saveAvailability } from '../../../lib/api/providers';

// ─── helpers ────────────────────────────────────────────────────────────────

/** '08:00' → '8:00 AM', '17:00' → '5:00 PM' */
function formatTime(hhmm: string): string {
  if (!hhmm) return '—';
  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m.toString().padStart(2, '0')} ${period}`;
}

/** Date object picked by DateTimePicker → '08:00' */
function dateToHHMM(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** '08:00' → Date with that local time today (needed to seed the picker) */
function hhmmToDate(hhmm: string): Date {
  const d = new Date();
  if (!hhmm) return d;
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

// ─── constants ───────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type PresetId = 'mf85' | 'ms76' | 'custom';

interface Preset {
  id: PresetId;
  label: string;
  sublabel: string;
  days: number[];
  start: string;
  end: string;
}

const PRESETS: Preset[] = [
  {
    id: 'mf85',
    label: 'Mon–Fri',
    sublabel: '8:00 AM–5:00 PM',
    days: [0, 1, 2, 3, 4],
    start: '08:00',
    end: '17:00',
  },
  {
    id: 'ms76',
    label: 'Mon–Sat',
    sublabel: '7:00 AM–6:00 PM',
    days: [0, 1, 2, 3, 4, 5],
    start: '07:00',
    end: '18:00',
  },
  {
    id: 'custom',
    label: 'Custom',
    sublabel: 'Choose days & hours',
    days: [],
    start: '',
    end: '',
  },
];

function matchPreset(days: number[], start: string, end: string): PresetId {
  for (const p of PRESETS) {
    if (p.id === 'custom') continue;
    if (
      p.start === start &&
      p.end === end &&
      p.days.length === days.length &&
      p.days.every((d) => days.includes(d))
    ) {
      return p.id;
    }
  }
  // If custom has actual data, show custom; otherwise default to mf85
  if (days.length > 0 || start || end) return 'custom';
  return 'mf85';
}

// ─── time picker state ────────────────────────────────────────────────────────

type PickerTarget = 'start' | 'end';

// ─── component ───────────────────────────────────────────────────────────────

export default function AvailabilityStep() {
  const router = useRouter();
  const business = useProviderOnboardingStore((s) => s.business);
  const serviceArea = useProviderOnboardingStore((s) => s.serviceArea);
  const availability = useProviderOnboardingStore((s) => s.availability);
  const setAvailability = useProviderOnboardingStore((s) => s.setAvailability);
  const setProviderId = useProviderOnboardingStore((s) => s.setProviderId);

  const [selectedPreset, setSelectedPreset] = useState<PresetId>(() =>
    matchPreset(availability.activeDays, availability.start, availability.end),
  );
  const [activeDays, setActiveDays] = useState<number[]>(availability.activeDays);
  const [start, setStart] = useState(availability.start || '08:00');
  const [end, setEnd] = useState(availability.end || '17:00');

  // Picker visibility — Android shows a modal dialog natively, iOS needs us to
  // manage a modal ourselves so the picker doesn't float over the whole screen.
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());

  const [submitting, setSubmitting] = useState(false);

  // ── preset selection ──────────────────────────────────────────────────────

  const handleSelectPreset = useCallback(
    (p: Preset) => {
      setSelectedPreset(p.id);
      if (p.id !== 'custom') {
        setActiveDays(p.days);
        setStart(p.start);
        setEnd(p.end);
      }
    },
    [],
  );

  // ── day toggle (custom only) ──────────────────────────────────────────────

  const toggleDay = useCallback((idx: number) => {
    setActiveDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx],
    );
  }, []);

  // ── time picker ──────────────────────────────────────────────────────────

  const openPicker = useCallback((target: PickerTarget) => {
    setPickerTarget(target);
    setPickerDate(hhmmToDate(target === 'start' ? start : end));
  }, [start, end]);

  const handlePickerChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      // Android: always fires once and closes; iOS: fires continuously while scrolling.
      if (Platform.OS === 'android') {
        setPickerTarget(null);
        if (event.type === 'set' && date && pickerTarget) {
          if (pickerTarget === 'start') setStart(dateToHHMM(date));
          else setEnd(dateToHHMM(date));
        }
      } else {
        // iOS — keep picker open; commit on Done (handled by modal close button).
        if (date) setPickerDate(date);
      }
    },
    [pickerTarget],
  );

  const commitIOSPicker = useCallback(() => {
    if (pickerTarget === 'start') setStart(dateToHHMM(pickerDate));
    else setEnd(dateToHHMM(pickerDate));
    setPickerTarget(null);
  }, [pickerTarget, pickerDate]);

  // ── derived ───────────────────────────────────────────────────────────────

  const effectiveDays = selectedPreset === 'custom' ? activeDays : (PRESETS.find((p) => p.id === selectedPreset)?.days ?? []);
  const canContinue = effectiveDays.length > 0 && start !== '' && end !== '';

  // ── submit ───────────────────────────────────────────────────────────────

  const onContinue = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      setAvailability({ activeDays: effectiveDays, start, end });
      const { providerId } = await onboard({
        businessDetails: {
          businessName: business.businessName || 'My Business',
          serviceTypes: business.serviceTypes,
        },
        serviceArea: { radiusMiles: serviceArea.radiusMiles },
        availability: {},
      });
      setProviderId(providerId);
      await saveServiceArea(providerId, serviceArea.zip, serviceArea.radiusMiles);
      await saveAvailability(providerId, effectiveDays, start, end);
      router.push('/(provider)/onboarding/banking');
    } catch (err: unknown) {
      Alert.alert(
        "Couldn't save your setup",
        err instanceof Error ? err.message : 'Please check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {/* Header */}
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

        {/* 3-option selector */}
        <View style={{ gap: 10 }}>
          {PRESETS.map((p) => {
            const sel = selectedPreset === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => handleSelectPreset(p)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderRadius: 14,
                  backgroundColor: sel ? colors.primary[50] : colors.surface,
                  borderWidth: sel ? 2 : 1.5,
                  borderColor: sel ? colors.primary[600] : colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      ...textStyles['title-md'],
                      color: colors.textPrimary,
                    }}
                  >
                    {p.label}
                  </Text>
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {p.sublabel}
                  </Text>
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

        {/* Custom editor — only visible when Custom is selected */}
        {selectedPreset === 'custom' ? (
          <Card>
            {/* Day toggles */}
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
                const daySel = activeDays.includes(i);
                return (
                  <Pressable
                    key={d}
                    onPress={() => toggleDay(i)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderRadius: 10,
                      backgroundColor: daySel ? colors.primary[600] : colors.divider,
                    }}
                  >
                    <Text
                      style={{
                        ...textStyles['body-sm'],
                        fontFamily: 'Inter_600SemiBold',
                        fontWeight: '600',
                        color: daySel ? colors.textInverse : colors.textSecondary,
                      }}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Start / End time pickers */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TimeField
                label="Start"
                value={start}
                onPress={() => openPicker('start')}
              />
              <TimeField
                label="End"
                value={end}
                onPress={() => openPicker('end')}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>

      {/* Continue button */}
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
          loading={submitting}
          disabled={submitting || !canContinue}
          onPress={onContinue}
        />
      </View>

      {/* iOS time picker modal */}
      {Platform.OS === 'ios' && pickerTarget !== null ? (
        <Modal transparent animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: colors.overlay,
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: 32,
              }}
            >
              {/* Done row */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Pressable onPress={commitIOSPicker} hitSlop={12}>
                  <Text
                    style={{
                      ...textStyles['body-md'],
                      fontFamily: 'Inter_600SemiBold',
                      fontWeight: '600',
                      color: colors.primary[600],
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display="spinner"
                is24Hour={false}
                onChange={handlePickerChange}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Android time picker — renders inline when target is set; dismisses itself */}
      {Platform.OS === 'android' && pickerTarget !== null ? (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          is24Hour={false}
          onChange={handlePickerChange}
        />
      ) : null}
    </View>
  );
}

// ─── TimeField ────────────────────────────────────────────────────────────────

function TimeField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          ...textStyles.label,
          fontSize: 11,
          color: colors.textSecondary,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderWidth: 1.5,
          borderColor: pressed ? colors.primary[400] : colors.border,
          borderRadius: 10,
          backgroundColor: colors.surface,
        })}
      >
        <Text
          style={{
            ...textStyles['title-md'],
            ...numericTabular,
            color: colors.textPrimary,
          }}
        >
          {formatTime(value)}
        </Text>
      </Pressable>
    </View>
  );
}

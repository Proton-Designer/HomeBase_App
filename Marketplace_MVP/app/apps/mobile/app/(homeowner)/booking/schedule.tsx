import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { Sparkles } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { useBookingStore } from '../../../stores/bookingStore';
import { enterStaggered, usePress, onlyNative } from '../../../lib/motion';
import { colors, textStyles, numericTabular } from '../../../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIME_SLOTS = [
  { id: '8', label: '8:00 AM', hour: 8 },
  { id: '10', label: '10:00 AM', hour: 10 },
  { id: '12', label: '12:00 PM', hour: 12 },
  { id: '14', label: '2:00 PM', hour: 14 },
  { id: '16', label: '4:00 PM', hour: 16 },
];

export default function ScheduleStep() {
  const router = useRouter();
  const { setScheduledAt, bookingType, frequency } = useBookingStore();
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => addDays(today, 1));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(today, i));
  }, [today]);

  const smartSlot = useMemo(() => {
    const next = addDays(today, 2);
    next.setHours(10, 0, 0, 0);
    return next;
  }, [today]);

  const onContinue = () => {
    if (!selectedSlot) return;
    const slot = TIME_SLOTS.find((s) => s.id === selectedSlot)!;
    const at = new Date(selectedDate);
    at.setHours(slot.hour, 0, 0, 0);
    setScheduledAt(at);
    router.push('/(homeowner)/booking/match');
  };

  const onSmartTap = () => {
    setSelectedDate(startOfDay(smartSlot));
    setSelectedSlot('10');
    setScheduledAt(smartSlot);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 28 }}>
        <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
          When works for you?
        </Text>

        <Card
          tone="tinted"
          tintColor={colors.primary[50]}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary[600],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} color={colors.textInverse} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...textStyles.label, color: colors.textSecondary }}>
              Smart suggestion
            </Text>
            <Text
              style={{
                ...textStyles['title-md'],
                color: colors.textPrimary,
                marginTop: 4,
              }}
            >
              Next available: {format(smartSlot, 'EEE, MMM d')} at 10:00 AM
            </Text>
          </View>
          <Pressable
            onPress={onSmartTap}
            hitSlop={6}
            style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
          >
            <Text
              style={{
                ...textStyles['body-sm'],
                fontFamily: 'Inter_600SemiBold',
                color: colors.primary[600],
              }}
            >
              Use this
            </Text>
          </Pressable>
        </Card>

        <View>
          <Text
            style={{
              ...textStyles['title-lg'],
              color: colors.textPrimary,
              marginBottom: 12,
            }}
          >
            Pick a date
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((d, i) => {
              const selected = isSameDay(d, selectedDate);
              return (
                <DayCell
                  key={d.toISOString()}
                  date={d}
                  selected={selected}
                  index={i}
                  onPress={() => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                />
              );
            })}
          </ScrollView>
        </View>

        <View>
          <Text
            style={{
              ...textStyles['title-lg'],
              color: colors.textPrimary,
              marginBottom: 12,
            }}
          >
            Available times for {format(selectedDate, 'EEE, MMM d')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIME_SLOTS.map((slot, i) => {
              const selected = selectedSlot === slot.id;
              return (
                <Animated.View key={slot.id} entering={enterStaggered(i)}>
                  <Pressable
                    onPress={() => setSelectedSlot(slot.id)}
                    style={[
                      {
                        paddingHorizontal: 18,
                        paddingVertical: 12,
                        borderRadius: 999,
                        backgroundColor: selected ? colors.primary[600] : colors.surface,
                        borderWidth: 1.5,
                        borderColor: selected ? colors.primary[600] : colors.border,
                      },
                      Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                    ]}
                  >
                    <Text
                      style={{
                        ...textStyles['title-md'],
                        ...numericTabular,
                        color: selected ? colors.textInverse : colors.textPrimary,
                      }}
                    >
                      {slot.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {bookingType === 'subscription' && frequency ? (
          <Animated.View entering={onlyNative(FadeIn.duration(220))}>
            <Pill
              label={`Recurs ${frequency} · pause anytime`}
              tone="primary"
            />
          </Animated.View>
        ) : null}
      </ScrollView>
      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button label="Continue" size="lg" fullWidth disabled={!selectedSlot} onPress={onContinue} />
      </View>
    </View>
  );
}

function DayCell({
  date,
  selected,
  index,
  onPress,
}: {
  date: Date;
  selected: boolean;
  index: number;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      entering={enterStaggered(index)}
      style={[
        {
          width: 64,
          paddingVertical: 14,
          borderRadius: 14,
          backgroundColor: selected ? colors.primary[600] : colors.surface,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary[600] : colors.border,
          alignItems: 'center',
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        animatedStyle,
      ]}
    >
      <Text
        style={{
          ...textStyles.label,
          color: selected ? colors.textInverse : colors.textSecondary,
          fontSize: 11,
        }}
      >
        {format(date, 'EEE').toUpperCase()}
      </Text>
      <Text
        style={{
          ...textStyles['display-md'],
          ...numericTabular,
          color: selected ? colors.textInverse : colors.textPrimary,
          marginTop: 4,
        }}
      >
        {format(date, 'd')}
      </Text>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.success,
          marginTop: 4,
          opacity: selected ? 0 : 1,
        }}
      />
    </AnimatedPressable>
  );
}

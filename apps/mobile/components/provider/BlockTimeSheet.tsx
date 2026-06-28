import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  BottomSheetWrapper,
  type BottomSheetWrapperHandle,
} from '../shared/BottomSheetWrapper';
import { createBlockedTime } from '../../lib/api/providers';
import { colors, fonts, textStyles } from '../../tokens';
import type { TextStyle } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
type PickerField = 'date' | 'startTime' | 'endTime';

function makeStartDefault(base: Date): Date {
  const d = new Date(base);
  d.setHours(9, 0, 0, 0);
  return d;
}
function makeEndDefault(base: Date): Date {
  const d = new Date(base);
  d.setHours(10, 0, 0, 0);
  return d;
}

function buildISO(date: Date, time: Date): string {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d.toISOString();
}

export interface BlockTimeSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export interface BlockTimeSheetProps {
  providerId: string;
  prefilledDate: Date;
  onSuccess: () => void;
}

export const BlockTimeSheet = forwardRef<BlockTimeSheetHandle, BlockTimeSheetProps>(
  function BlockTimeSheet({ providerId, prefilledDate, onSuccess }, ref) {
    const sheetRef = useRef<BottomSheetWrapperHandle>(null);
    const queryClient = useQueryClient();

    const [blockDate, setBlockDate] = useState(prefilledDate);
    const [startTime, setStartTime] = useState(() => makeStartDefault(prefilledDate));
    const [endTime, setEndTime] = useState(() => makeEndDefault(prefilledDate));
    const [allDay, setAllDay] = useState(false);
    const [reason, setReason] = useState('');
    const [activePicker, setActivePicker] = useState<PickerField | null>(null);
    const [formError, setFormError] = useState('');

    // Web text fallbacks
    const [dateText, setDateText] = useState(() => format(prefilledDate, 'yyyy-MM-dd'));
    const [startText, setStartText] = useState('09:00');
    const [endText, setEndText] = useState('10:00');

    // Reanimated shared value: 1 = time pickers visible, 0 = collapsed
    const timesVisible = useSharedValue(1);
    const timePickersStyle = useAnimatedStyle(() => ({
      maxHeight: withTiming(timesVisible.value * 200, { duration: 250 }),
      opacity: withTiming(timesVisible.value, { duration: 200 }),
      overflow: 'hidden',
    }));

    function toggleAllDay(val: boolean) {
      setAllDay(val);
      timesVisible.value = val ? 0 : 1;
    }

    useImperativeHandle(ref, () => ({
      present: () => {
        // Sync pre-filled date
        const base = prefilledDate;
        setBlockDate(base);
        setStartTime(makeStartDefault(base));
        setEndTime(makeEndDefault(base));
        setAllDay(false);
        timesVisible.value = 1;
        setReason('');
        setFormError('');
        setActivePicker(null);
        setDateText(format(base, 'yyyy-MM-dd'));
        setStartText('09:00');
        setEndText('10:00');
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const createMutation = useMutation({
      mutationFn: createBlockedTime,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['blocked-times', providerId] });
        sheetRef.current?.dismiss();
        onSuccess();
      },
      onError: (err: Error) => setFormError(err.message),
    });

    function handleSubmit() {
      setFormError('');

      let startAt: string;
      let endAt: string;

      if (allDay) {
        const d = new Date(blockDate);
        d.setHours(0, 0, 0, 0);
        startAt = d.toISOString();
        const e = new Date(blockDate);
        e.setHours(23, 59, 59, 0);
        endAt = e.toISOString();
      } else if (isNative) {
        startAt = buildISO(blockDate, startTime);
        endAt = buildISO(blockDate, endTime);
      } else {
        const dateParts = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const startParts = startText.match(/^(\d{1,2}):(\d{2})$/);
        const endParts = endText.match(/^(\d{1,2}):(\d{2})$/);
        if (!dateParts || !startParts || !endParts) {
          setFormError('Use formats: date YYYY-MM-DD, time HH:MM');
          return;
        }
        const base = new Date(`${dateText}T00:00:00`);
        const s = new Date(base);
        s.setHours(parseInt(startParts[1], 10), parseInt(startParts[2], 10), 0, 0);
        const e = new Date(base);
        e.setHours(parseInt(endParts[1], 10), parseInt(endParts[2], 10), 0, 0);
        startAt = s.toISOString();
        endAt = e.toISOString();
      }

      if (!allDay && endAt <= startAt) {
        setFormError('End time must be after start time');
        return;
      }

      if (!providerId) {
        setFormError('No provider account found');
        return;
      }

      createMutation.mutate({
        providerId,
        startAt,
        endAt,
        reason: reason.trim() || undefined,
      });
    }

    return (
      <BottomSheetWrapper ref={sheetRef} snapPoints={['65%', '88%']}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        >
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 18,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: 4,
            } as TextStyle}
          >
            Block time
          </Text>

          {/* Date */}
          <View style={{ gap: 6 }}>
            <Text style={{ ...textStyles['body-sm'], fontFamily: fonts.bodySemibold, color: colors.textPrimary } as TextStyle}>
              Date
            </Text>
            {isNative ? (
              <>
                <Pressable
                  onPress={() => setActivePicker(activePicker === 'date' ? null : 'date')}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                    {format(blockDate, 'EEEE, MMMM d, yyyy')}
                  </Text>
                </Pressable>
                {activePicker === 'date' && (
                  <DateTimePicker
                    value={blockDate}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={(_e, d) => { if (d) setBlockDate(d); }}
                  />
                )}
              </>
            ) : (
              <TextInput
                value={dateText}
                onChangeText={setDateText}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.textPrimary,
                  backgroundColor: colors.surface,
                }}
              />
            )}
          </View>

          {/* All day toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...textStyles['body-sm'], fontFamily: fonts.bodySemibold, color: colors.textPrimary } as TextStyle}>
              All day
            </Text>
            <Switch
              value={allDay}
              onValueChange={toggleAllDay}
              trackColor={{ false: colors.border, true: colors.primary[400] }}
              thumbColor={allDay ? colors.primary[600] : colors.surface}
              accessibilityLabel="All day block"
            />
          </View>

          {/* Time pickers — animated collapse when all-day is on */}
          <Animated.View style={timePickersStyle}>
            <View style={{ gap: 16 }}>
              {/* Start time */}
              <View style={{ gap: 6 }}>
                <Text style={{ ...textStyles['body-sm'], fontFamily: fonts.bodySemibold, color: colors.textPrimary } as TextStyle}>
                  Start time
                </Text>
                {isNative ? (
                  <>
                    <Pressable
                      onPress={() => setActivePicker(activePicker === 'startTime' ? null : 'startTime')}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                        {format(startTime, 'h:mm a')}
                      </Text>
                    </Pressable>
                    {activePicker === 'startTime' && (
                      <DateTimePicker
                        value={startTime}
                        mode="time"
                        display="spinner"
                        minuteInterval={15}
                        onChange={(_e, d) => { if (d) setStartTime(d); }}
                      />
                    )}
                  </>
                ) : (
                  <TextInput
                    value={startText}
                    onChangeText={setStartText}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textTertiary}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: colors.textPrimary,
                      backgroundColor: colors.surface,
                    }}
                  />
                )}
              </View>

              {/* End time */}
              <View style={{ gap: 6 }}>
                <Text style={{ ...textStyles['body-sm'], fontFamily: fonts.bodySemibold, color: colors.textPrimary } as TextStyle}>
                  End time
                </Text>
                {isNative ? (
                  <>
                    <Pressable
                      onPress={() => setActivePicker(activePicker === 'endTime' ? null : 'endTime')}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                        {format(endTime, 'h:mm a')}
                      </Text>
                    </Pressable>
                    {activePicker === 'endTime' && (
                      <DateTimePicker
                        value={endTime}
                        mode="time"
                        display="spinner"
                        minuteInterval={15}
                        onChange={(_e, d) => { if (d) setEndTime(d); }}
                      />
                    )}
                  </>
                ) : (
                  <TextInput
                    value={endText}
                    onChangeText={setEndText}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textTertiary}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: colors.textPrimary,
                      backgroundColor: colors.surface,
                    }}
                  />
                )}
              </View>
            </View>
          </Animated.View>

          {/* Reason */}
          <View style={{ gap: 6 }}>
            <Text style={{ ...textStyles['body-sm'], fontFamily: fonts.bodySemibold, color: colors.textPrimary } as TextStyle}>
              Reason{' '}
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary } as TextStyle}>
                (optional)
              </Text>
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Vacation, Doctor appointment…"
              placeholderTextColor={colors.textTertiary}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
              }}
            />
          </View>

          {formError ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.error } as TextStyle}>
              {formError}
            </Text>
          ) : null}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.primary[700] : colors.primary[600],
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              opacity: createMutation.isPending ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 15,
                fontWeight: '600',
                color: colors.textInverse,
              } as TextStyle}
            >
              {createMutation.isPending ? 'Saving…' : 'Block this time'}
            </Text>
          </Pressable>
        </ScrollView>
      </BottomSheetWrapper>
    );
  },
);

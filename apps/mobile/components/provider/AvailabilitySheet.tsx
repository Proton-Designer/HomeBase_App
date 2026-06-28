import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BottomSheetWrapper,
  type BottomSheetWrapperHandle,
} from '../shared/BottomSheetWrapper';
import {
  listAvailability,
  saveAvailability,
  type AvailabilityRow,
} from '../../lib/api/providers';
import { colors, fonts, textStyles } from '../../tokens';
import type { TextStyle } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function defaultTime(h: number, m = 0): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function hmsToDate(hms: string): Date {
  const [h, m] = hms.split(':').map(Number);
  return defaultTime(h, m);
}

function dateToHMS(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
}

export interface AvailabilitySheetHandle {
  present: () => void;
  dismiss: () => void;
}

export interface AvailabilitySheetProps {
  providerId: string;
  onSuccess: () => void;
}

export const AvailabilitySheet = forwardRef<AvailabilitySheetHandle, AvailabilitySheetProps>(
  function AvailabilitySheet({ providerId, onSuccess }, ref) {
    const sheetRef = useRef<BottomSheetWrapperHandle>(null);
    const queryClient = useQueryClient();

    const { data: existingRows } = useQuery<AvailabilityRow[]>({
      queryKey: ['availability', providerId],
      queryFn: () => listAvailability(providerId),
      enabled: !!providerId,
      staleTime: 5 * 60_000,
    });

    // Local form state — synced from query data on mount/open
    const [activeDays, setActiveDays] = useState<Set<number>>(() => {
      const s = new Set<number>();
      (existingRows ?? []).forEach((r) => s.add(r.day_of_week));
      return s;
    });
    const [startTime, setStartTime] = useState<Date>(() =>
      existingRows?.[0]?.start_time ? hmsToDate(existingRows[0].start_time) : defaultTime(9),
    );
    const [endTime, setEndTime] = useState<Date>(() =>
      existingRows?.[0]?.end_time ? hmsToDate(existingRows[0].end_time) : defaultTime(17),
    );
    const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
    const [formError, setFormError] = useState('');

    useImperativeHandle(ref, () => ({
      present: () => {
        // Sync current saved data into form state
        const rows = existingRows ?? [];
        const days = new Set<number>();
        rows.forEach((r) => days.add(r.day_of_week));
        setActiveDays(days.size > 0 ? days : new Set([1, 2, 3, 4, 5]));
        setStartTime(rows[0]?.start_time ? hmsToDate(rows[0].start_time) : defaultTime(9));
        setEndTime(rows[0]?.end_time ? hmsToDate(rows[0].end_time) : defaultTime(17));
        setFormError('');
        setActivePicker(null);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const saveMutation = useMutation({
      mutationFn: () =>
        saveAvailability(
          providerId,
          Array.from(activeDays),
          dateToHMS(startTime),
          dateToHMS(endTime),
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['availability', providerId] });
        sheetRef.current?.dismiss();
        onSuccess();
        Alert.alert('Saved', 'Working hours saved.');
      },
      onError: (err: Error) => setFormError(err.message),
    });

    function toggleDay(dow: number) {
      setActiveDays((prev) => {
        const next = new Set(prev);
        if (next.has(dow)) {
          next.delete(dow);
        } else {
          next.add(dow);
        }
        return next;
      });
    }

    const noDaysSelected = activeDays.size === 0;

    return (
      <BottomSheetWrapper ref={sheetRef} snapPoints={['70%', '92%']}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 20, paddingBottom: 32 }}
        >
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 18,
              fontWeight: '700',
              color: colors.textPrimary,
            } as TextStyle}
          >
            Working hours
          </Text>

          {/* Active days */}
          <View style={{ gap: 8 }}>
            <Text style={{ ...textStyles['label'], color: colors.textTertiary }}>
              Active days
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {ALL_DAYS.map((dow) => {
                const active = activeDays.has(dow);
                return (
                  <Pressable
                    key={dow}
                    onPress={() => toggleDay(dow)}
                    hitSlop={4}
                    accessibilityLabel={`${active ? 'Deactivate' : 'Activate'} ${DAY_FULL[dow]}`}
                    accessibilityRole="checkbox"
                    style={[
                      {
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? colors.primary[600] : colors.divider,
                      },
                      Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 12,
                        fontWeight: '600',
                        color: active ? colors.textInverse : colors.textTertiary,
                      } as TextStyle}
                    >
                      {DAY_LABELS[dow]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {noDaysSelected ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.error } as TextStyle}>
                Select at least one day.
              </Text>
            ) : null}
          </View>

          {/* Hours */}
          <View style={{ gap: 8 }}>
            <Text style={{ ...textStyles['label'], color: colors.textTertiary }}>
              Hours (applies to all active days)
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Start */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                  Start
                </Text>
                {isNative ? (
                  <>
                    <Pressable
                      onPress={() => setActivePicker(activePicker === 'start' ? null : 'start')}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                        {format(startTime, 'h:mm a')}
                      </Text>
                    </Pressable>
                    {activePicker === 'start' && (
                      <DateTimePicker
                        value={startTime}
                        mode="time"
                        display="spinner"
                        minuteInterval={30}
                        onChange={(_e, d) => { if (d) setStartTime(d); }}
                      />
                    )}
                  </>
                ) : (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                      {format(startTime, 'HH:mm')}
                    </Text>
                  </View>
                )}
              </View>

              {/* End */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                  End
                </Text>
                {isNative ? (
                  <>
                    <Pressable
                      onPress={() => setActivePicker(activePicker === 'end' ? null : 'end')}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                        {format(endTime, 'h:mm a')}
                      </Text>
                    </Pressable>
                    {activePicker === 'end' && (
                      <DateTimePicker
                        value={endTime}
                        mode="time"
                        display="spinner"
                        minuteInterval={30}
                        onChange={(_e, d) => { if (d) setEndTime(d); }}
                      />
                    )}
                  </>
                ) : (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary } as TextStyle}>
                      {format(endTime, 'HH:mm')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {formError ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.error } as TextStyle}>
              {formError}
            </Text>
          ) : null}

          {/* Save button */}
          <Pressable
            onPress={() => {
              setFormError('');
              if (noDaysSelected) {
                setFormError('Select at least one day.');
                return;
              }
              if (dateToHMS(endTime) <= dateToHMS(startTime)) {
                setFormError('End must be after start');
                return;
              }
              saveMutation.mutate();
            }}
            disabled={noDaysSelected || saveMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.primary[700] : colors.primary[600],
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              opacity: noDaysSelected || saveMutation.isPending ? 0.5 : 1,
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
              {saveMutation.isPending ? 'Saving…' : 'Save working hours'}
            </Text>
          </Pressable>
        </ScrollView>
      </BottomSheetWrapper>
    );
  },
);

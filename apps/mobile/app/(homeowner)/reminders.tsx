import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Leaf, Check, Clock, Ban } from 'lucide-react-native';
import { useSafeBack } from '../../lib/useSafeBack';
import { useAuthStore } from '../../stores/authStore';
import { useBookingStore } from '../../stores/bookingStore';
import { fetchPrimaryAddress } from '../../lib/api/addresses';
import * as api from '../../lib/api';
import { computeReminders, type Reminder, type ReminderStatus } from '../../lib/home';
import type { HomeServiceStatus } from '../../lib/api/homeServiceStatus';
import { colors, fonts, textStyles } from '../../tokens';
import type { ServiceType } from '../../lib/types';

const STATUS_META: Record<ReminderStatus, { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: colors.error },
  due_soon: { label: 'Due soon', color: colors.accent[600] },
  recommended: { label: 'Suggested', color: colors.textSecondary },
};

export default function RemindersScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const reset = useBookingStore((s) => s.reset);
  const setServiceType = useBookingStore((s) => s.setServiceType);

  const { data: address } = useQuery({
    queryKey: ['addresses', 'primary', userId],
    queryFn: () => fetchPrimaryAddress(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
  const { data: completions = [] } = useQuery({
    queryKey: ['completions', 'homeowner', userId],
    queryFn: () => api.completions.fetchHomeownerCompletions(userId!),
    enabled: !!userId,
  });
  const { data: statuses = [] } = useQuery({
    queryKey: ['home-service-status', userId],
    queryFn: () => api.homeServiceStatus.fetchStatuses(userId!),
    enabled: !!userId,
  });

  const reminders = computeReminders({
    serviceInterests: address?.serviceInterests ?? [],
    completions,
    statuses,
    now: new Date(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['home-service-status', userId] });

  // Optimistically patch the cached status so the row updates on the first tap
  // (the network round-trip then confirms via refresh()).
  const patchStatus = (svc: ServiceType, patch: Partial<HomeServiceStatus>) => {
    queryClient.setQueryData<HomeServiceStatus[]>(['home-service-status', userId], (old) => {
      const list = old ?? [];
      const existing = list.find((s) => s.serviceType === svc);
      const rest = list.filter((s) => s.serviceType !== svc);
      const base: HomeServiceStatus = existing ?? {
        serviceType: svc,
        lastServicedAt: null,
        lastSource: null,
        cadenceDaysOverride: null,
        state: 'active',
        snoozedUntil: null,
        dismissCount: 0,
      };
      return [...rest, { ...base, ...patch }];
    });
  };

  const onBook = (svc: ServiceType) => {
    reset();
    setServiceType(svc);
    void api.events.track({ event: 'booking_started', serviceType: svc, metadata: { entry: 'reminder' } });
    router.push({ pathname: '/(homeowner)/booking/service-select', params: { service: svc } });
  };
  const onHandled = (svc: ServiceType) => {
    void api.events.track({ event: 'reminder_handled', serviceType: svc, metadata: { source: 'self' } });
    patchStatus(svc, { lastServicedAt: new Date().toISOString(), lastSource: 'self' });
    void api.homeServiceStatus.markHandled(svc, 'self').then(refresh).catch(refresh);
  };
  const onSnooze = (svc: ServiceType) => {
    const st = statuses.find((s) => s.serviceType === svc);
    const until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    patchStatus(svc, { snoozedUntil: until });
    void api.homeServiceStatus.snooze(svc, 14, st?.dismissCount ?? 0).then(refresh).catch(refresh);
  };
  const onMute = (svc: ServiceType) => {
    patchStatus(svc, { state: 'self_managed' });
    void api.homeServiceStatus.mute(svc, 'self_managed').then(refresh).catch(refresh);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Home reminders</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }}>
        <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
          Based on typical care schedules and what you&apos;ve told us. Tap &quot;Already handled&quot;
          if you took care of it yourself or with another pro — we&apos;ll stop reminding.
        </Text>

        {reminders.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
            <Check size={28} color={colors.success} />
            <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>All caught up</Text>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, textAlign: 'center' }}>
              Nothing needs attention right now.
            </Text>
          </View>
        ) : (
          reminders.map((r: Reminder) => {
            const meta = STATUS_META[r.status];
            return (
              <View
                key={r.id}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                  padding: 16,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Leaf size={14} color={meta.color} />
                  <Text style={{ ...textStyles.label, color: meta.color }}>{meta.label}</Text>
                </View>
                <View>
                  <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>{r.title}</Text>
                  <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginTop: 2 }}>
                    {r.reason}
                  </Text>
                </View>

                <Pressable
                  onPress={() => onBook(r.serviceType)}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.primary[600],
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    },
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                  ]}
                >
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.textInverse }}>
                    Book it
                  </Text>
                </Pressable>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <SecondaryAction icon={Check} label="Already handled" onPress={() => onHandled(r.serviceType)} />
                  <SecondaryAction icon={Clock} label="Remind later" onPress={() => onSnooze(r.serviceType)} />
                  <SecondaryAction icon={Ban} label="I do this myself" onPress={() => onMute(r.serviceType)} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SecondaryAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Check;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 5 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
    >
      <Icon size={14} color={colors.textTertiary} />
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary }}>{label}</Text>
    </Pressable>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeBack } from '../../lib/useSafeBack';
import { useAuthStore } from '../../stores/authStore';
import * as prefsApi from '../../lib/api/notificationPrefs';
import type { NotificationPrefs } from '../../lib/api/notificationPrefs';
import { colors, fonts, textStyles } from '../../tokens';

interface Row {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
}

export function NotificationSettings({ showPayouts }: { showPayouts: boolean }) {
  const goBack = useSafeBack();
  const userId = useAuthStore((s) => s.user)?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['notification-prefs', userId],
    queryFn: () => prefsApi.get(userId ?? ''),
    enabled: !!userId,
  });

  const [prefs, setPrefs] = useState<NotificationPrefs>(prefsApi.DEFAULT_PREFS);
  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  const rows: Row[] = [
    { key: 'jobUpdates', label: 'Job updates', description: 'Status changes — confirmed, en route, completed.' },
    { key: 'messages', label: 'New messages', description: 'When someone messages you about a job.' },
    showPayouts
      ? { key: 'payouts', label: 'Payouts', description: 'When a payout is sent or cash-out is ready.' }
      : { key: 'reminders', label: 'Maintenance reminders', description: 'Gentle nudges when home upkeep is due.' },
    { key: 'marketing', label: 'Tips & offers', description: 'Occasional product news. Off by default.' },
  ];

  const toggle = (key: keyof NotificationPrefs, value: boolean) => {
    if (!userId) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next); // optimistic
    void prefsApi.update(userId, next).catch(() => setPrefs(prefs));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
        <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginBottom: 8 }}>
          Choose what MyHomebase notifies you about. You can change these anytime.
        </Text>

        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary[600]} />
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            {rows.map((r, i) => (
              <View
                key={r.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                  borderBottomColor: colors.divider,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary }}>
                    {r.label}
                  </Text>
                  <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary, marginTop: 2 }}>
                    {r.description}
                  </Text>
                </View>
                <Switch
                  value={prefs[r.key]}
                  onValueChange={(v) => toggle(r.key, v)}
                  trackColor={{ false: colors.border, true: colors.primary[600] }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default NotificationSettings;

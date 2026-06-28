import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Home, CircleCheck, Bell, MapPin } from 'lucide-react-native';
import { useSafeBack } from '../../lib/useSafeBack';
import { useAuthStore } from '../../stores/authStore';
import { fetchPrimaryAddress } from '../../lib/api/addresses';
import * as api from '../../lib/api';
import { esriSatelliteUrl } from '../../lib/geo';
import { serviceLabel } from '../../lib/home/serviceMeta';
import { colors, fonts, textStyles, numericTabular } from '../../tokens';
import type { ServiceType } from '../../lib/types';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function HomeDetailScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const userId = useAuthStore((s) => s.user)?.id ?? null;

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

  const totalSpend = completions.reduce((sum, c) => sum + c.amountCents, 0);
  const interests = (address?.serviceInterests ?? []) as ServiceType[];
  const imageUrl =
    address?.lat != null && address?.lng != null
      ? esriSatelliteUrl({ lat: address.lat, lng: address.lng, width: 800, height: 400 })
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
          paddingBottom: 8,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>My Home</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 48 }}>
        <View style={{ borderRadius: 18, overflow: 'hidden', height: 180, backgroundColor: colors.primary[700] }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Home size={40} color="rgba(255,255,255,0.5)" />
            </View>
          )}
        </View>

        {address ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <MapPin size={18} color={colors.primary[600]} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>{address.street}</Text>
              <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                {address.city}, {address.state} {address.zip}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard icon={CircleCheck} value={String(completions.length)} label="Services done" />
          <StatCard icon={Bell} value={`$${(totalSpend / 100).toFixed(0)}`} label="Total invested" />
        </View>

        {interests.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...textStyles.label, color: colors.textSecondary }}>Services you care about</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {interests.map((s) => (
                <View
                  key={s}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: colors.primary[50],
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ ...textStyles['body-sm'], color: colors.primary[700] }}>{serviceLabel(s)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push('/(homeowner)/reminders')}
          style={({ pressed }) => [
            {
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.8 : 1,
            },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Bell size={18} color={colors.primary[600]} />
            <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>Home reminders</Text>
          </View>
          <ChevronLeft size={20} color={colors.textTertiary} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>

        <View style={{ gap: 10 }}>
          <Text style={{ ...textStyles.label, color: colors.textSecondary }}>Recent activity</Text>
          {completions.length === 0 ? (
            <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
              No completed services yet.
            </Text>
          ) : (
            completions.slice(0, 8).map((c) => (
              <View
                key={c.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.divider,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <CircleCheck size={18} color={colors.success} />
                  <View>
                    <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>
                      {serviceLabel(c.serviceType)}
                    </Text>
                    <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
                      {fmtDate(c.completedAt)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.textPrimary, ...numericTabular }}
                >
                  ${(c.amountCents / 100).toFixed(0)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof CircleCheck;
  value: string;
  label: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        gap: 6,
      }}
    >
      <Icon size={18} color={colors.primary[600]} />
      <Text style={{ fontFamily: fonts.editorial, fontSize: 24, color: colors.textPrimary, ...numericTabular }}>
        {value}
      </Text>
      <Text style={{ ...textStyles.label, color: colors.textTertiary }}>{label}</Text>
    </View>
  );
}

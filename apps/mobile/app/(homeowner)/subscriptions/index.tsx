import React, { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSafeBack } from '../../../lib/useSafeBack';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

import { Card } from '../../../components/ui/Card';
import { Pill } from '../../../components/ui/Pill';
import { EmptyState } from '../../../components/shared/EmptyState';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { QueryErrorState } from '../../../components/shared/QueryErrorState';
import { enterStaggered, usePress } from '../../../lib/motion';
import { colors, textStyles, numericTabular, serviceTints } from '../../../tokens';
import * as api from '../../../lib/api/subscriptions';
import { useAuthStore } from '../../../stores/authStore';
import {
  SERVICE_LABELS,
  FREQUENCY_LABELS,
  SUBSCRIPTION_STATUS_LABELS as STATUS_LABELS,
} from '../../../lib/constants';
import type { Subscription, SubscriptionStatus } from '../../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATUS_TONE: Record<SubscriptionStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  cancelled: 'neutral',
};

function formatMonthly(cents: number) {
  return `$${Math.round(cents / 100)}/mo`;
}

function SubscriptionRow({ sub, index }: { sub: Subscription; index: number }) {
  const router = useRouter();
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  const tint = serviceTints[sub.serviceType] ?? colors.surface;

  return (
    <Animated.View entering={enterStaggered(index)}>
      <AnimatedPressable
        onPressIn={Platform.OS === 'web' ? undefined : onPressIn}
        onPressOut={Platform.OS === 'web' ? undefined : onPressOut}
        onPress={() => router.push(`/(homeowner)/subscriptions/${sub.id}`)}
        style={[
          Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          Platform.OS !== 'web' ? animatedStyle : null,
        ]}
      >
        <Card style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: tint,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {sub.providerAvatarUrl ? (
                <Image
                  source={{ uri: sub.providerAvatarUrl }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              ) : (
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 16,
                    color: colors.textPrimary,
                  }}
                >
                  {(sub.providerName.trim()[0] ?? '?').toUpperCase()}
                </Text>
              )}
            </View>

            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pill
                  label={SERVICE_LABELS[sub.serviceType] ?? sub.serviceType}
                  tone="neutral"
                  style={{ backgroundColor: tint }}
                />
              </View>
              <Text
                style={{ ...textStyles['title-md'], color: colors.textPrimary }}
                numberOfLines={1}
              >
                {sub.providerName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    color: colors.textSecondary,
                  }}
                >
                  {FREQUENCY_LABELS[sub.frequency]}
                </Text>
                <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>·</Text>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    ...numericTabular,
                    color: colors.textSecondary,
                  }}
                >
                  {formatMonthly(sub.monthlyEstimateCents)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {typeof sub.providerTrustScore === 'number' ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: colors.successLight,
                  }}
                >
                  <ShieldCheck size={12} color={colors.success} />
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      ...numericTabular,
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 12,
                      color: colors.success,
                    }}
                  >
                    {sub.providerTrustScore.toFixed(1)}
                  </Text>
                </View>
              ) : null}
              <Pill
                label={STATUS_LABELS[sub.status]}
                tone={STATUS_TONE[sub.status]}
              />
              <ChevronRight size={16} color={colors.textTertiary} />
            </View>
          </View>
        </Card>
      </AnimatedPressable>
    </Animated.View>
  );
}

function SkeletonRow({ index }: { index: number }) {
  return (
    <Animated.View entering={enterStaggered(index)}>
      <Card style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SkeletonLoader width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonLoader width={80} height={20} borderRadius={10} />
            <SkeletonLoader width={140} height={16} borderRadius={6} />
            <SkeletonLoader width={100} height={14} borderRadius={6} />
          </View>
          <SkeletonLoader width={56} height={24} borderRadius={12} />
        </View>
      </Card>
    </Animated.View>
  );
}

export default function SubscriptionsListScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const homeownerId = useAuthStore((s) => s.user?.id ?? null);
  const [cancelledExpanded, setCancelledExpanded] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subscriptions', homeownerId],
    queryFn: () => api.listForHomeowner(homeownerId ?? ''),
    enabled: !!homeownerId,
  });

  const active = (data ?? []).filter((s) => s.status === 'active');
  const paused = (data ?? []).filter((s) => s.status === 'paused');
  const cancelled = (data ?? []).filter((s) => s.status === 'cancelled');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={[
            { padding: 8 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={{
            ...textStyles['title-lg'],
            color: colors.textPrimary,
            marginLeft: 4,
          }}
        >
          Subscriptions
        </Text>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} index={i} />
          ))}
        </ScrollView>
      ) : isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : data && data.length === 0 ? (
        <EmptyState
          heading="No subscriptions yet"
          body="Set up a recurring service to get the same trusted pro back on schedule."
          ctaLabel="Browse pros"
          onCta={() => router.push('/(homeowner)/(tabs)/book')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            maxWidth: 720,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          {active.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  ...textStyles.label,
                  color: colors.textTertiary,
                  paddingHorizontal: 4,
                }}
              >
                Active
              </Text>
              {active.map((sub, i) => (
                <SubscriptionRow key={sub.id} sub={sub} index={i} />
              ))}
            </View>
          ) : null}

          {paused.length > 0 ? (
            <View style={{ gap: 8, marginTop: active.length > 0 ? 12 : 0 }}>
              <Text
                style={{
                  ...textStyles.label,
                  color: colors.textTertiary,
                  paddingHorizontal: 4,
                }}
              >
                Paused
              </Text>
              {paused.map((sub, i) => (
                <SubscriptionRow key={sub.id} sub={sub} index={active.length + i} />
              ))}
            </View>
          ) : null}

          {cancelled.length > 0 ? (
            <View style={{ gap: 8, marginTop: paused.length > 0 || active.length > 0 ? 12 : 0 }}>
              <Pressable
                onPress={() => setCancelledExpanded((v) => !v)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                    gap: 6,
                  },
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                ]}
              >
                <Text style={{ ...textStyles.label, color: colors.textTertiary }}>
                  Cancelled
                </Text>
                <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
                  {cancelledExpanded
                    ? ''
                    : `· Show ${cancelled.length} cancelled →`}
                </Text>
                <ChevronDown
                  size={14}
                  color={colors.textTertiary}
                  style={{
                    transform: [{ rotate: cancelledExpanded ? '180deg' : '0deg' }],
                  }}
                />
              </Pressable>
              {cancelledExpanded
                ? cancelled.map((sub, i) => (
                    <SubscriptionRow
                      key={sub.id}
                      sub={sub}
                      index={active.length + paused.length + i}
                    />
                  ))
                : null}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

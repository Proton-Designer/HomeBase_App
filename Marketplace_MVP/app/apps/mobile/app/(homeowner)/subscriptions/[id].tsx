import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCcw, ShieldCheck } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { format } from 'date-fns';

import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { Chip } from '../../../components/ui/Chip';
import { Input } from '../../../components/ui/Input';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import {
  BottomSheetWrapper,
  type BottomSheetWrapperHandle,
} from '../../../components/shared/BottomSheetWrapper';
import { enter } from '../../../lib/motion';
import { colors, textStyles, numericTabular, serviceTints } from '../../../tokens';
import * as api from '../../../lib/api/subscriptions';
import type { Frequency, ServiceType, SubscriptionStatus } from '../../../lib/types';

const SERVICE_LABELS: Record<ServiceType, string> = {
  lawn: 'Lawn Care',
  cleaning: 'Home Cleaning',
  pool: 'Pool Cleaning',
  pest: 'Pest Control',
  pressure: 'Pressure Washing',
  window: 'Window Cleaning',
  gutter: 'Gutter Cleaning',
  detailing: 'Car Detailing',
  tree: 'Tree & Plant Trimming',
  solar: 'Solar Panel Cleaning',
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Every 6 months',
};

const ALL_FREQUENCIES: Frequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'semi_annual',
];

const FREQUENCY_MULTIPLIER: Record<Frequency, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 0.33,
  semi_annual: 0.17,
};

const CANCEL_REASONS = [
  'Too expensive',
  'Service quality',
  'Moving',
  "Don't need it anymore",
  'Other',
];

const STATUS_TONE: Record<SubscriptionStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  cancelled: 'neutral',
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

function formatMonthly(cents: number) {
  return `$${Math.round(cents / 100)}/mo`;
}

function recalcMonthly(currentCents: number, from: Frequency, to: Frequency): number {
  const perVisit = currentCents / FREQUENCY_MULTIPLIER[from];
  return Math.round(perVisit * FREQUENCY_MULTIPLIER[to]);
}

function DetailRow({
  label,
  children,
  isLast = false,
}: {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.divider,
        gap: 12,
      }}
    >
      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>{label}</Text>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

function SkeletonDetail() {
  return (
    <View style={{ padding: 20, gap: 18 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <SkeletonLoader width={64} height={64} borderRadius={32} />
        <View style={{ gap: 8 }}>
          <SkeletonLoader width={160} height={20} />
          <SkeletonLoader width={100} height={24} borderRadius={12} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={120} />
      <SkeletonLoader width="100%" height={80} />
    </View>
  );
}

export default function SubscriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const pauseSheetRef = useRef<BottomSheetWrapperHandle>(null);
  const resumeSheetRef = useRef<BottomSheetWrapperHandle>(null);
  const cancelSheetRef = useRef<BottomSheetWrapperHandle>(null);
  const freqSheetRef = useRef<BottomSheetWrapperHandle>(null);

  const [pendingFreq, setPendingFreq] = useState<Frequency | null>(null);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelNotes, setCancelNotes] = useState('');
  const [isActing, setIsActing] = useState(false);

  const { data: sub, isLoading, isError } = useQuery({
    queryKey: ['subscription', id],
    queryFn: () => api.get(id ?? ''),
    enabled: !!id,
  });

  async function invalidate() {
    await qc.invalidateQueries({ queryKey: ['subscription', id] });
    await qc.invalidateQueries({ queryKey: ['subscriptions'] });
  }

  async function handlePause() {
    setIsActing(true);
    try {
      await api.pause(id ?? '');
      await invalidate();
      pauseSheetRef.current?.dismiss();
      Alert.alert('Subscription paused', 'Your visits are paused. Resume any time.');
    } catch {
      Alert.alert('Error', 'Could not pause subscription. Please try again.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleResume() {
    setIsActing(true);
    try {
      await api.resume(id ?? '');
      await invalidate();
      resumeSheetRef.current?.dismiss();
      Alert.alert('Subscription resumed', 'Your visits are back on schedule.');
    } catch {
      Alert.alert('Error', 'Could not resume subscription. Please try again.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason) return;
    setIsActing(true);
    try {
      const reason = cancelNotes.trim()
        ? `${cancelReason}: ${cancelNotes.trim()}`
        : cancelReason;
      await api.cancel(id ?? '', reason);
      await invalidate();
      cancelSheetRef.current?.dismiss();
      Alert.alert(
        'Subscription cancelled',
        'You can rebook this service any time from the Browse tab.'
      );
    } catch {
      Alert.alert('Error', 'Could not cancel subscription. Please try again.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleChangeFrequency() {
    if (!pendingFreq || !sub) return;
    setIsActing(true);
    try {
      await api.changeFrequency(id ?? '', pendingFreq);
      await invalidate();
      freqSheetRef.current?.dismiss();
      Alert.alert('Frequency updated', `Now set to ${FREQUENCY_LABELS[pendingFreq]}.`);
    } catch {
      Alert.alert('Error', 'Could not change frequency. Please try again.');
    } finally {
      setIsActing(false);
    }
  }

  if (isLoading) {
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
            onPress={() => router.back()}
            hitSlop={8}
            style={[
              { padding: 8 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <SkeletonDetail />
      </SafeAreaView>
    );
  }

  if (isError || !sub) {
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
            onPress={() => router.back()}
            hitSlop={8}
            style={[
              { padding: 8 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
            Subscription not found
          </Text>
          <Button
            label="Back to subscriptions"
            variant="outline"
            onPress={() => router.replace('/(homeowner)/subscriptions')}
            style={{ marginTop: 12 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const tint = serviceTints[sub.serviceType] ?? colors.surface;
  const serviceLabel = SERVICE_LABELS[sub.serviceType] ?? sub.serviceType;
  const previewMonthly = pendingFreq
    ? recalcMonthly(sub.monthlyEstimateCents, sub.frequency, pendingFreq)
    : null;

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
          onPress={() => router.back()}
          hitSlop={8}
          style={[
            { padding: 8 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: 60,
          maxWidth: 720,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <Animated.View
          entering={enter}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: tint,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {sub.providerAvatarUrl ? (
              <Image
                source={{ uri: sub.providerAvatarUrl }}
                style={{ width: 64, height: 64, borderRadius: 32 }}
              />
            ) : (
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontSize: 24,
                  color: colors.textPrimary,
                }}
              >
                {sub.providerName[0].toUpperCase()}
              </Text>
            )}
          </View>

          <View style={{ flex: 1, gap: 6 }}>
            <Text
              style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}
              numberOfLines={2}
            >
              {sub.providerName}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pill
                label={serviceLabel}
                tone="neutral"
                style={{ backgroundColor: tint }}
              />
              <Pill
                label={STATUS_LABELS[sub.status]}
                tone={STATUS_TONE[sub.status]}
              />
              {typeof sub.providerTrustScore === 'number' ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
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
                    Trust {sub.providerTrustScore.toFixed(1)}
                    {sub.providerVerificationTier && sub.providerVerificationTier > 0
                      ? ` · Tier ${sub.providerVerificationTier}`
                      : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>

        <Card>
          <Text
            style={{
              ...textStyles.label,
              color: colors.textTertiary,
              marginBottom: 4,
            }}
          >
            Schedule
          </Text>

          <DetailRow label="Frequency">
            <Pressable
              onPress={() => {
                setPendingFreq(sub.frequency);
                freqSheetRef.current?.present();
              }}
              hitSlop={6}
              style={[
                { flexDirection: 'row', alignItems: 'center', gap: 4 },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <Text
                style={{
                  ...textStyles['body-md'],
                  fontFamily: 'Inter_600SemiBold',
                  color: colors.textPrimary,
                }}
              >
                {FREQUENCY_LABELS[sub.frequency]}
              </Text>
              <Text
                style={{
                  ...textStyles['body-sm'],
                  color: colors.primary[600],
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                Change
              </Text>
            </Pressable>
          </DetailRow>

          <DetailRow label="Next visit">
            <Text
              style={{
                ...textStyles['body-md'],
                fontFamily: 'Inter_600SemiBold',
                color: colors.textPrimary,
              }}
            >
              {sub.status === 'paused'
                ? 'Paused'
                : sub.nextDate
                  ? format(new Date(sub.nextDate), 'EEE, MMM d')
                  : '—'}
            </Text>
          </DetailRow>

          <DetailRow label="Monthly estimate" isLast>
            <Text
              style={{
                ...textStyles['body-md'],
                ...numericTabular,
                fontFamily: 'Inter_600SemiBold',
                color: colors.textPrimary,
              }}
            >
              {formatMonthly(sub.monthlyEstimateCents)}
            </Text>
          </DetailRow>
        </Card>

        {sub.status === 'cancelled' ? (
          <Card>
            <Text
              style={{
                ...textStyles.label,
                color: colors.textTertiary,
                marginBottom: 8,
              }}
            >
              History
            </Text>
            {sub.cancelledAt ? (
              <Text style={{ ...textStyles['body-md'], color: colors.textSecondary }}>
                Cancelled on{' '}
                <Text
                  style={{ fontFamily: 'Inter_600SemiBold', color: colors.textPrimary }}
                >
                  {format(new Date(sub.cancelledAt), 'MMMM d, yyyy')}
                </Text>
              </Text>
            ) : null}
            {sub.cancellationReason ? (
              <Text
                style={{
                  ...textStyles['body-sm'],
                  color: colors.textSecondary,
                  marginTop: 6,
                }}
              >
                Reason: {sub.cancellationReason}
              </Text>
            ) : null}
          </Card>
        ) : (
          <Card>
            <Text
              style={{
                ...textStyles.label,
                color: colors.textTertiary,
                marginBottom: 12,
              }}
            >
              Manage
            </Text>
            <View style={{ gap: 10 }}>
              {sub.status === 'active' ? (
                <>
                  <Button
                    label="Pause subscription"
                    variant="outline"
                    fullWidth
                    onPress={() => pauseSheetRef.current?.present()}
                  />
                  <Pressable
                    onPress={() => {
                      setCancelReason(null);
                      setCancelNotes('');
                      cancelSheetRef.current?.present();
                    }}
                    style={[
                      { paddingVertical: 12, alignItems: 'center' },
                      Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                    ]}
                  >
                    <Text
                      style={{
                        ...textStyles['body-md'],
                        fontFamily: 'Inter_600SemiBold',
                        color: colors.error,
                      }}
                    >
                      Cancel subscription
                    </Text>
                  </Pressable>
                </>
              ) : sub.status === 'paused' ? (
                <>
                  <Button
                    label="Resume subscription"
                    variant="primary"
                    fullWidth
                    onPress={() => resumeSheetRef.current?.present()}
                  />
                  <Pressable
                    onPress={() => {
                      setCancelReason(null);
                      setCancelNotes('');
                      cancelSheetRef.current?.present();
                    }}
                    style={[
                      { paddingVertical: 12, alignItems: 'center' },
                      Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                    ]}
                  >
                    <Text
                      style={{
                        ...textStyles['body-md'],
                        fontFamily: 'Inter_600SemiBold',
                        color: colors.error,
                      }}
                    >
                      Cancel subscription
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </Card>
        )}

        <Pressable
          onPress={() => router.push(`/(homeowner)/providers/${sub.providerId}`)}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 4,
            },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.primary[600],
              fontFamily: 'Inter_600SemiBold',
            }}
          >
            View {sub.providerName}'s profile →
          </Text>
        </Pressable>
      </ScrollView>

      <BottomSheetWrapper ref={pauseSheetRef} snapPoints={['40%']}>
        <View style={{ gap: 16 }}>
          <Text style={{ ...textStyles['display-md'], color: colors.textPrimary }}>
            Pause your {serviceLabel} subscription?
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              lineHeight: 22,
            }}
          >
            We'll skip your next visits until you resume. You won't be charged.
          </Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button
              label="Yes, pause"
              variant="primary"
              fullWidth
              loading={isActing}
              onPress={handlePause}
            />
            <Button
              label="Never mind"
              variant="ghost"
              fullWidth
              onPress={() => pauseSheetRef.current?.dismiss()}
            />
          </View>
        </View>
      </BottomSheetWrapper>

      <BottomSheetWrapper ref={resumeSheetRef} snapPoints={['40%']}>
        <View style={{ gap: 16 }}>
          <Text style={{ ...textStyles['display-md'], color: colors.textPrimary }}>
            Resume your {serviceLabel} subscription?
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              lineHeight: 22,
            }}
          >
            We'll schedule your next visit based on your current frequency and resume charging as
            normal.
          </Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button
              label="Yes, resume"
              variant="primary"
              fullWidth
              loading={isActing}
              onPress={handleResume}
            />
            <Button
              label="Never mind"
              variant="ghost"
              fullWidth
              onPress={() => resumeSheetRef.current?.dismiss()}
            />
          </View>
        </View>
      </BottomSheetWrapper>

      <BottomSheetWrapper ref={cancelSheetRef} snapPoints={['70%', '90%']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 16, paddingBottom: 20 }}>
            <Text style={{ ...textStyles['display-md'], color: colors.textPrimary }}>
              Cancel your {serviceLabel} subscription?
            </Text>
            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.textSecondary,
                lineHeight: 20,
              }}
            >
              You can rebook this service any time from the Browse tab.
            </Text>

            <View style={{ gap: 8 }}>
              <Text style={{ ...textStyles.label, color: colors.textTertiary }}>
                Reason
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CANCEL_REASONS.map((reason) => (
                  <Chip
                    key={reason}
                    label={reason}
                    selected={cancelReason === reason}
                    onPress={() => setCancelReason(reason)}
                    size="sm"
                  />
                ))}
              </View>
            </View>

            <Input
              label="Additional notes (optional)"
              placeholder="Anything else you'd like to share?"
              value={cancelNotes}
              onChangeText={setCancelNotes}
              multiline
              numberOfLines={3}
              inputStyle={{ minHeight: 80, paddingTop: 12 }}
            />

            <View style={{ gap: 10, marginTop: 4 }}>
              <Button
                label="Confirm cancellation"
                variant="destructive"
                fullWidth
                loading={isActing}
                disabled={!cancelReason}
                onPress={handleCancel}
              />
              <Button
                label="Keep subscription"
                variant="ghost"
                fullWidth
                onPress={() => cancelSheetRef.current?.dismiss()}
              />
            </View>
          </View>
        </ScrollView>
      </BottomSheetWrapper>

      <BottomSheetWrapper ref={freqSheetRef} snapPoints={['55%']}>
        <View style={{ gap: 16 }}>
          <Text style={{ ...textStyles['display-md'], color: colors.textPrimary }}>
            Change frequency
          </Text>
          <View style={{ gap: 2 }}>
            {ALL_FREQUENCIES.map((freq) => {
              const isSelected = pendingFreq === freq;
              const estimatedMonthly = recalcMonthly(
                sub.monthlyEstimateCents,
                sub.frequency,
                freq
              );
              return (
                <Pressable
                  key={freq}
                  onPress={() => setPendingFreq(freq)}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: isSelected ? colors.primary[50] : 'transparent',
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary[600] : 'transparent',
                      marginBottom: 4,
                    },
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                  ]}
                >
                  <Text
                    style={{
                      ...textStyles['body-md'],
                      fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                      color: isSelected ? colors.primary[700] : colors.textPrimary,
                    }}
                  >
                    {FREQUENCY_LABELS[freq]}
                  </Text>
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      ...numericTabular,
                      color: isSelected ? colors.primary[600] : colors.textSecondary,
                      fontFamily: 'Inter_600SemiBold',
                    }}
                  >
                    {formatMonthly(estimatedMonthly)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {pendingFreq && pendingFreq !== sub.frequency ? (
            <Text
              style={{ ...textStyles['body-sm'], color: colors.textSecondary, textAlign: 'center' }}
            >
              New estimate:{' '}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textPrimary }}>
                {formatMonthly(previewMonthly ?? 0)}
              </Text>{' '}
              / month
            </Text>
          ) : null}

          <Button
            label="Confirm"
            variant="primary"
            fullWidth
            loading={isActing}
            disabled={!pendingFreq || pendingFreq === sub.frequency}
            onPress={handleChangeFrequency}
          />
        </View>
      </BottomSheetWrapper>
    </SafeAreaView>
  );
}

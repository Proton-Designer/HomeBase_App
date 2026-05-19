import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, formatDistanceToNow } from 'date-fns';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { ResponsiveContainer } from '../../../components/responsive/ResponsiveContainer';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState , QueryErrorState } from '../../../components/shared';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import type { TextStyle } from 'react-native';
import { colors, textStyles, numericTabular, shadows, fonts } from '../../../tokens';
import * as payments from '../../../lib/api/payments';
import { SERVICE_LABELS as SERVICE_LABEL } from '../../../lib/constants';
import type { ServiceType } from '../../../lib/types';

type PayoutStatus = 'paid' | 'in_transit' | 'pending';

interface EarningsRow {
  id: string;
  date: string;
  service: string;
  homeownerFirst: string;
  netCents: number;
  status: PayoutStatus;
}

interface BankAccount {
  brand: string | null;
  last4: string | null;
}

function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function BalanceDisplay({ balanceCents }: { balanceCents: number }) {
  const dollars = Math.floor(balanceCents / 100);
  const cents = balanceCents % 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 0 }}>
      <Text
        style={{
          fontFamily: fonts.editorial,
          fontSize: 13,
          fontWeight: '700',
          color: colors.textPrimary,
          lineHeight: 40,
          alignSelf: 'flex-end',
          marginBottom: 4,
        } as TextStyle}
      >
        $
      </Text>
      <Text
        style={{
          fontFamily: fonts.editorial,
          fontSize: 56,
          fontWeight: '700',
          lineHeight: 60,
          color: colors.textPrimary,
          ...numericTabular,
        } as TextStyle}
      >
        {dollars.toLocaleString()}
      </Text>
      <Text
        style={{
          fontFamily: fonts.editorial,
          fontSize: 24,
          fontWeight: '700',
          color: colors.textPrimary,
          lineHeight: 36,
          alignSelf: 'flex-end',
          marginBottom: 6,
          ...numericTabular,
        } as TextStyle}
      >
        .{String(cents).padStart(2, '0')}
      </Text>
    </View>
  );
}

export default function ProviderEarningsScreen() {
  const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');
  const [showSheet, setShowSheet] = useState(false);
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && bp === 'desktop';
  const { providerId } = useAuthStore();

  const queryClient = useQueryClient();

  const shimmer = useSharedValue(1);
  useEffect(() => {
    shimmer.value = withRepeat(withTiming(0.75, { duration: 1200 }), -1, true);
  }, [shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  const sheetOffset = useSharedValue(500);
  const overlayOpacity = useSharedValue(0);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetOffset.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  // Fetch earnings rows
  const { data: earningsData, isLoading: earningsLoading, isError: earningsError, refetch: refetchEarnings } = useQuery<EarningsRow[]>({
    queryKey: ['provider', 'earnings', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('completion_ledger')
        .select('id, created_at, service_type, amount_cents, fee_cents, net_cents, payout_status, jobs(profiles!jobs_homeowner_id_fkey(first_name))')
        .eq('provider_id', providerId ?? '')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => {
        const profile = (row.jobs as Record<string, unknown> | null)?.profiles as { first_name?: string } | null;
        return {
          id: row.id as string,
          date: row.created_at as string,
          service: row.service_type as string,
          homeownerFirst: profile?.first_name ?? 'Customer',
          netCents: (row.net_cents as number) ?? 0,
          status: (row.payout_status as PayoutStatus) ?? 'pending',
        };
      });
    },
    enabled: !!providerId,
  });

  // Fetch available balance
  const { data: balanceData } = useQuery<{ balanceCents: number }>({
    queryKey: ['provider', 'balance', providerId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ balanceCents: number }>('stripe-balance', {});
      if (error) throw error;
      return data ?? { balanceCents: 0 };
    },
    enabled: !!providerId,
  });

  // Fetch bank account details
  const { data: bankAccount } = useQuery<BankAccount | null>({
    queryKey: ['provider', 'bank-account', providerId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<BankAccount>('stripe-bank-account', {});
      if (error) return null;
      return data ?? null;
    },
    enabled: !!providerId,
  });

  const balanceCents = balanceData?.balanceCents ?? 0;
  const payoutFee = Math.max(50, Math.round(balanceCents * 0.01));
  const youReceive = balanceCents - payoutFee;

  const openSheet = () => {
    setShowSheet(true);
    sheetOffset.value = withTiming(0, { duration: 320 });
    overlayOpacity.value = withTiming(1, { duration: 320 });
  };

  const closeSheet = () => {
    sheetOffset.value = withTiming(500, { duration: 280 });
    overlayOpacity.value = withTiming(0, { duration: 280 });
    setTimeout(() => setShowSheet(false), 290);
  };

  const { mutate: triggerPayout, isPending: payoutPending, isSuccess: payoutDone } = useMutation({
    mutationFn: () => payments.instantPayout({ amountCents: balanceCents }),
    onSuccess: () => {
      closeSheet();
      queryClient.invalidateQueries({ queryKey: ['provider', 'earnings'] });
      queryClient.invalidateQueries({ queryKey: ['provider', 'balance'] });
      Toast.show({
        type: 'success',
        text1: 'Payout initiated',
        text2: `$${(youReceive / 100).toFixed(2)} is on its way to your bank.`,
        visibilityTime: 3500,
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Payout failed',
        text2: 'Please try again.',
        visibilityTime: 3000,
      });
    },
  });

  const balanceIsZero = balanceCents === 0;

  const earnings = earningsData ?? [];

  const filteredEarnings = earnings.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (filter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setDate(now.getDate() - 30);
      return d >= monthAgo;
    }
    return true;
  });

  const sectionLabel = (label: string) => (
    <Text
      style={{
        fontFamily: fonts.bodySemibold,
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.textTertiary,
        letterSpacing: 0.5,
        marginBottom: 10,
        paddingHorizontal: 2,
      } as TextStyle}
    >
      {label}
    </Text>
  );

  const HeroHeading = (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: 11,
          fontStyle: 'italic',
          letterSpacing: 0.4,
          color: colors.accent[600],
          textTransform: 'lowercase',
        } as TextStyle}
      >
        the ledger
      </Text>
      <Text
        style={{
          fontFamily: fonts.editorial,
          fontSize: isWebDesktop ? 40 : 30,
          fontWeight: '700',
          lineHeight: isWebDesktop ? 46 : 36,
          letterSpacing: -0.5,
          color: colors.textPrimary,
        } as TextStyle}
      >
        Earnings
      </Text>
    </View>
  );

  const BalanceCard = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 18,
          padding: 24,
          gap: 0,
        },
        shadows.xl,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: 10,
          fontStyle: 'italic',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colors.textTertiary,
          marginBottom: 6,
        } as TextStyle}
      >
        available balance
      </Text>

      <Animated.View style={shimmerStyle}>
        <BalanceDisplay balanceCents={balanceCents} />
      </Animated.View>

      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          fontStyle: 'italic',
          color: colors.textTertiary,
          marginTop: 6,
          marginBottom: 18,
        } as TextStyle}
      >
        available now · settles same day
      </Text>

      <Pressable
        onPress={openSheet}
        disabled={payoutDone || balanceIsZero}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.primary[800] : colors.primary[700],
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 20,
          opacity: payoutDone || balanceIsZero ? 0.5 : 1,
          transform: [{ scale: pressed && Platform.OS !== 'web' ? 0.985 : 1 }],
          ...(Platform.OS === 'web' ? { cursor: 'pointer' } as object : {}),
        })}
      >
        <Text
          style={{
            fontFamily: fonts.displaySemibold,
            fontSize: 16,
            fontWeight: '600',
            color: colors.accent[300],
            textAlign: 'center',
            letterSpacing: 0.2,
          } as TextStyle}
        >
          {payoutDone ? 'Payout initiated' : 'Cash out · Instant payout'}
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            fontStyle: 'italic',
            color: colors.accent[500],
            textAlign: 'center',
            marginTop: 3,
          } as TextStyle}
        >
          {'→'} in your bank in minutes
        </Text>
      </Pressable>

      <Pressable hitSlop={6} style={{ marginTop: 10, alignItems: 'center' }}>
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: fonts.bodyMedium,
            color: colors.textSecondary,
          }}
        >
          Standard payout (2 business days, free)
        </Text>
      </Pressable>
    </View>
  );

  const BankCard = (
    <Card>
      <Text
        style={{
          fontFamily: fonts.bodySemibold,
          fontSize: 10,
          fontStyle: 'italic',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colors.textTertiary,
          marginBottom: 6,
        } as TextStyle}
      >
        bank account
      </Text>
      {bankAccount?.last4 ? (
        <Text
          style={{
            ...textStyles['title-md'],
            ...numericTabular,
            color: colors.textPrimary,
          }}
        >
          {bankAccount.brand ?? 'Bank'} •••• {bankAccount.last4}
        </Text>
      ) : (
        <Text
          style={{
            ...textStyles['body-sm'],
            color: colors.textSecondary,
            fontStyle: 'italic',
          }}
        >
          No bank account connected
        </Text>
      )}
      <Pressable hitSlop={6} style={{ marginTop: 8 }}>
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: fonts.bodySemibold,
            fontWeight: '600',
            color: colors.primary[600],
          }}
        >
          {bankAccount?.last4 ? 'Update bank account' : 'Connect bank account'}
        </Text>
      </Pressable>
    </Card>
  );

  const EarningsHistory = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
          Recent earnings
        </Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 4,
            padding: 2,
            backgroundColor: colors.divider,
            borderRadius: 999,
          }}
        >
          {(['week', 'month', 'all'] as const).map((f) => {
            const sel = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: sel ? colors.surface : 'transparent',
                  ...(Platform.OS === 'web' ? { cursor: 'pointer' } as object : {}),
                }}
              >
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    fontFamily: sel ? fonts.bodySemibold : fonts.bodyMedium,
                    fontWeight: sel ? '600' : '500',
                    fontSize: 11,
                    color: sel ? colors.textPrimary : colors.textSecondary,
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {filter === 'week' && sectionLabel('this week')}
      {filter === 'month' && sectionLabel('this month')}
      {filter === 'all' && sectionLabel('all time')}

      {earningsError ? (
        <QueryErrorState onRetry={() => refetchEarnings()} />
      ) : earningsLoading ? (
        <Card>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
            Loading earnings…
          </Text>
        </Card>
      ) : filteredEarnings.length === 0 ? (
        <EmptyState
          heading="Earnings start with your first job"
          body="Complete a job and HomeBase pays out automatically after the 7-day escrow."
        />
      ) : (
        <Card style={{ padding: 0 }}>
          {filteredEarnings.map((e, i) => (
            <View
              key={e.id}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: i === filteredEarnings.length - 1 ? 0 : 1,
                borderBottomColor: colors.divider,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 0,
              }}
            >
              <View style={{ width: 16, alignItems: 'center', marginRight: 10 }}>
                {e.status === 'paid' ? (
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: colors.success,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 2,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: colors.accent[400],
                    }}
                  />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                  {e.homeownerFirst} · {SERVICE_LABEL[e.service as ServiceType] ?? e.service}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      ...numericTabular,
                      color: colors.textTertiary,
                    }}
                  >
                    {format(new Date(e.date), 'MMM d')} · net ${(e.netCents / 100).toFixed(2)}
                  </Text>
                  {e.status !== 'paid' && (
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 11,
                        fontStyle: 'italic',
                        color: colors.accent[600],
                      } as TextStyle}
                    >
                      {e.status === 'in_transit' ? 'in transit' : 'pending'}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 10,
                    fontStyle: 'italic',
                    color: colors.textTertiary,
                    marginTop: 1,
                  } as TextStyle}
                >
                  {'as of ' + timeAgo(e.date)}
                </Text>
              </View>
              <Text
                style={{
                  ...textStyles['title-md'],
                  ...numericTabular,
                  color: colors.success,
                }}
              >
                +${(e.netCents / 100).toFixed(2)}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        <ResponsiveContainer>
          <View style={{ paddingTop: 20, gap: 20 }}>
            {HeroHeading}

            {isWebDesktop ? (
              <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
                <View style={{ flex: 2, gap: 20 }}>
                  {EarningsHistory}
                </View>
                <View style={{ flex: 1, gap: 16 }}>
                  {BalanceCard}
                  {BankCard}
                </View>
              </View>
            ) : (
              <View style={{ gap: 20 }}>
                {BalanceCard}
                {EarningsHistory}
                {BankCard}
              </View>
            )}
          </View>
        </ResponsiveContainer>
      </ScrollView>

      {showSheet ? (
        <>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.overlay,
              },
              overlayStyle,
            ]}
            onTouchEnd={closeSheet}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.surface,
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                padding: 24,
                paddingBottom: Platform.OS === 'ios' ? 40 : 28,
                gap: 12,
              },
              sheetStyle,
            ]}
          >
            <Text
              style={{
                fontFamily: fonts.editorial,
                fontSize: 24,
                fontWeight: '700',
                lineHeight: 30,
                letterSpacing: -0.3,
                color: colors.textPrimary,
              } as TextStyle}
            >
              Instant payout
            </Text>
            <Text style={{ ...textStyles['body-md'], color: colors.textSecondary }}>
              Confirm instant payout of ${(balanceCents / 100).toFixed(2)} to your bank?
            </Text>
            <Row label="Amount" value={`$${(balanceCents / 100).toFixed(2)}`} />
            <Row label="Instant fee ($0.50 min, 1%)" value={`-$${(payoutFee / 100).toFixed(2)}`} />
            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 4 }} />
            <Row label="You receive" value={`$${(youReceive / 100).toFixed(2)}`} bold />
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontStyle: 'italic',
                color: colors.textTertiary,
                marginTop: 4,
              } as TextStyle}
            >
              {'→'} in your bank account within minutes.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="outline" fullWidth onPress={closeSheet} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Confirm"
                  fullWidth
                  loading={payoutPending}
                  onPress={() => triggerPayout()}
                />
              </View>
            </View>
          </Animated.View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text
        style={{
          ...textStyles['body-md'],
          fontFamily: fonts.bodyMedium,
          color: colors.textPrimary,
        }}
      >
        {label}
      </Text>
      <Text
        style={
          bold
            ? {
                fontFamily: fonts.display,
                fontSize: 20,
                fontWeight: '700',
                lineHeight: 24,
                color: colors.textPrimary,
                ...numericTabular,
              } as TextStyle
            : {
                ...textStyles['body-md'],
                ...numericTabular,
                fontFamily: fonts.bodySemibold,
                fontWeight: '600',
                color: colors.textPrimary,
              }
        }
      >
        {value}
      </Text>
    </View>
  );
}

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, CreditCard, CheckCircle2, Plus } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { Input } from '../../../components/ui/Input';
import { QueryErrorState } from '../../../components/shared/QueryErrorState';
import { useBookingStore } from '../../../stores/bookingStore';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../../lib/api';
import { enter } from '../../../lib/motion';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { colors, textStyles, numericTabular } from '../../../tokens';
import * as payments from '../../../lib/api/payments';
import * as bookings from '../../../lib/api/bookings';
import { SERVICE_LABELS as SERVICE_LABEL } from '../../../lib/constants';
import type { ServiceType } from '../../../lib/types';

export default function PaymentStep() {
  const router = useRouter();
  const {
    serviceType,
    bookingType,
    frequency,
    matchedProviderId,
    quoteAmountCents,
    scheduledAt,
    addressId,
    specialInstructions,
    photoUrl,
  } = useBookingStore();

  // Guard: addressId must be set before the user reaches this step.
  // If somehow they arrive without one (e.g. deep-link), send them back to step 1.
  React.useEffect(() => {
    if (!addressId) {
      router.replace('/(homeowner)/booking/service-select');
    }
  }, [addressId, router]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && bp === 'desktop';

  // Card-on-file state
  const [cardLast4, setCardLast4] = useState<string | null>(null);
  const [showCardSheet, setShowCardSheet] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Stub form values — no real validation at this stage
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const sheetOffset = useSharedValue(400);
  const overlayOpacity = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetOffset.value }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const openCardSheet = () => {
    setCardError(null);
    setShowCardSheet(true);
    sheetOffset.value = withTiming(0, { duration: 320 });
    overlayOpacity.value = withTiming(1, { duration: 320 });
  };

  const closeCardSheet = () => {
    sheetOffset.value = withTiming(400, { duration: 280 });
    overlayOpacity.value = withTiming(0, { duration: 280 });
    setTimeout(() => setShowCardSheet(false), 290);
  };

  const handleAddCard = async () => {
    setAddingCard(true);
    setCardError(null);
    try {
      // DEFERRED: real Stripe PaymentSheet integration. This still posts the
      // 'pm_card_visa' test token — replace with a PaymentMethod id from
      // @stripe/stripe-react-native before the booking payment step is
      // production-ready for real card capture. Tracked as a known gap.
      const result = await payments.attachPaymentMethod({ paymentMethodId: 'pm_card_visa' });
      setCardLast4(result.last4 ?? '4242');
      closeCardSheet();
    } catch {
      setCardError('Could not save card. Please try again.');
    } finally {
      setAddingCard(false);
    }
  };

  const { data: provider, isError: providerError, refetch: refetchProvider } = useQuery({
    queryKey: ['providers', 'detail', matchedProviderId],
    queryFn: () => api.providers.detail(matchedProviderId!),
    enabled: !!matchedProviderId,
    staleTime: Infinity,
  });

  const baseCents = useMemo(() => {
    // A booking from an accepted custom-job quote charges the agreed quote price, not
    // the provider's generic range midpoint.
    if (quoteAmountCents != null) return quoteAmountCents;
    if (!provider) return 0;
    return Math.round((provider.priceRangeMinCents + provider.priceRangeMaxCents) / 2);
  }, [provider, quoteAmountCents]);

  const subscriptionDiscount = bookingType === 'subscription' ? Math.round(baseCents * 0.1) : 0;
  const totalCents = baseCents - subscriptionDiscount;

  const onConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const booking = await bookings.create({
        serviceType: (serviceType ?? 'lawn') as ServiceType,
        bookingType: bookingType ?? 'one_off',
        frequency: frequency ?? null,
        scheduledAt: scheduledAt?.toISOString() ?? new Date().toISOString(),
        addressId: addressId!,
        specialInstructions: specialInstructions || undefined,
        photoUrl: photoUrl ?? undefined,
        matchedProviderId: provider?.id ?? matchedProviderId ?? '',
        amountCents: totalCents,
      });
      await payments.createIntent({ bookingId: booking.id });
      router.replace('/(homeowner)/booking/confirmation');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (providerError) {
    return (
      <View style={{ flex: 1 }}>
        <QueryErrorState onRetry={() => refetchProvider()} />
      </View>
    );
  }

  const isNewProvider = (provider?.checkInCount ?? 0) < 5;
  const serviceLabel = SERVICE_LABEL[(serviceType ?? 'lawn') as ServiceType] ?? 'Service';
  const hasCard = cardLast4 !== null;

  return (
    <View testID="booking-step-payment" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Animated.View entering={enter}>
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
            Review and pay
          </Text>
        </Animated.View>

        <Card>
          <Text style={{ ...textStyles.label, color: colors.textSecondary, marginBottom: 10 }}>
            Payment method
          </Text>
          {hasCard ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreditCard size={20} color={colors.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                  Visa •••• {cardLast4}
                </Text>
              </View>
              <CheckCircle2 size={20} color={colors.success} />
            </View>
          ) : (
            <Button
              testID="booking-payment-add-card"
              label="Add a card"
              variant="outline"
              fullWidth
              leftIcon={<Plus size={16} color={colors.primary[600]} />}
              onPress={openCardSheet}
            />
          )}
        </Card>

        <Card>
          <Text style={{ ...textStyles.label, color: colors.textSecondary, marginBottom: 12 }}>
            Price breakdown
          </Text>
          <PriceRow label={serviceLabel} cents={baseCents} />
          <PriceRow label="Platform fee" value="Included" />
          {subscriptionDiscount > 0 ? (
            <PriceRow
              label="Subscription savings"
              cents={-subscriptionDiscount}
              valueColor={colors.accent[600]}
            />
          ) : null}
          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 12 }} />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Total</Text>
            <Text
              style={{
                ...textStyles['display-md'],
                ...numericTabular,
                fontFamily: 'Fraunces_700Bold',
                color: colors.textPrimary,
              }}
            >
              ${(totalCents / 100).toFixed(2)}
            </Text>
          </View>
          {bookingType === 'subscription' ? (
            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.textTertiary,
                marginTop: 8,
              }}
            >
              Billed after each {frequency} service. Pause or cancel anytime.
            </Text>
          ) : null}
        </Card>

        {isNewProvider ? (
          <Card tone="tinted" tintColor={colors.infoLight}>
            <Text
              style={{
                ...textStyles['body-sm'],
                fontFamily: 'Inter_500Medium',
                color: colors.info,
              }}
            >
              Your payment is held in escrow for 24 hours after service completion — released automatically if no issues are reported.
            </Text>
          </Card>
        ) : null}

        {error ? (
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.error,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        ) : null}

        <Pill
          label="Protected by MyHomebase"
          tone="success"
          leftIcon={<ShieldCheck size={14} color={colors.success} />}
        />
      </ScrollView>

      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button
          testID="booking-payment-confirm"
          label={`Confirm & book · $${(totalCents / 100).toFixed(2)}`}
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!hasCard || submitting}
          onPress={onConfirm}
        />
        {!hasCard ? (
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.textTertiary,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Add a card above to continue.
          </Text>
        ) : null}
      </View>

      {showCardSheet ? (
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
              Platform.OS !== 'web' ? overlayStyle : null,
            ]}
            onTouchEnd={closeCardSheet}
          />
          {isWebDesktop ? (
            <Pressable
              onPress={closeCardSheet}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{
                  width: 480,
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  padding: 28,
                  gap: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.18,
                  shadowRadius: 24,
                }}
              >
                <Text
                  style={{
                    ...textStyles['editorial-title'],
                    fontSize: 22,
                    lineHeight: 28,
                    color: colors.textPrimary,
                  }}
                >
                  Add a card
                </Text>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    color: colors.textTertiary,
                    marginTop: -8,
                  }}
                >
                  Demo mode: card details are stubs. Tap Save to register a test card.
                </Text>
                <Input
                  testID="booking-payment-card-number"
                  label="Card number"
                  placeholder="4242 4242 4242 4242"
                  keyboardType="number-pad"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  maxLength={19}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      testID="booking-payment-card-expiry"
                      label="Expiry"
                      placeholder="MM / YY"
                      keyboardType="number-pad"
                      value={cardExp}
                      onChangeText={setCardExp}
                      maxLength={7}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      testID="booking-payment-card-cvc"
                      label="CVC"
                      placeholder="123"
                      keyboardType="number-pad"
                      secureTextEntry
                      value={cardCvc}
                      onChangeText={setCardCvc}
                      maxLength={4}
                    />
                  </View>
                </View>
                {cardError ? (
                  <Text style={{ ...textStyles['body-sm'], color: colors.error }}>{cardError}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button testID="booking-payment-card-cancel" label="Cancel" variant="outline" fullWidth onPress={closeCardSheet} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      testID="booking-payment-card-save"
                      label="Save card"
                      fullWidth
                      loading={addingCard}
                      onPress={handleAddCard}
                    />
                  </View>
                </View>
              </Pressable>
            </Pressable>
          ) : null}
          {!isWebDesktop ? (
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
                gap: 16,
              },
              Platform.OS !== 'web' ? sheetStyle : null,
            ]}
          >
            <Text
              style={{
                ...textStyles['editorial-title'],
                fontSize: 22,
                lineHeight: 28,
                color: colors.textPrimary,
              }}
            >
              Add a card
            </Text>
            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.textTertiary,
                marginTop: -8,
              }}
            >
              Demo mode: card details are stubs. Tap Save to register a test card.
            </Text>
            <Input
              testID="booking-payment-card-number"
              label="Card number"
              placeholder="4242 4242 4242 4242"
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={setCardNumber}
              maxLength={19}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  testID="booking-payment-card-expiry"
                  label="Expiry"
                  placeholder="MM / YY"
                  keyboardType="number-pad"
                  value={cardExp}
                  onChangeText={setCardExp}
                  maxLength={7}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  testID="booking-payment-card-cvc"
                  label="CVC"
                  placeholder="123"
                  keyboardType="number-pad"
                  secureTextEntry
                  value={cardCvc}
                  onChangeText={setCardCvc}
                  maxLength={4}
                />
              </View>
            </View>
            {cardError ? (
              <Text style={{ ...textStyles['body-sm'], color: colors.error }}>{cardError}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button testID="booking-payment-card-cancel" label="Cancel" variant="outline" fullWidth onPress={closeCardSheet} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  testID="booking-payment-card-save"
                  label="Save card"
                  fullWidth
                  loading={addingCard}
                  onPress={handleAddCard}
                />
              </View>
            </View>
          </Animated.View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function PriceRow({
  label,
  cents,
  value,
  valueColor,
}: {
  label: string;
  cents?: number;
  value?: string;
  valueColor?: string;
}) {
  const display =
    value ??
    (cents !== undefined ? `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}` : '');
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
      }}
    >
      <Text style={{ ...textStyles['body-md'], fontFamily: 'Inter_500Medium', color: colors.textPrimary }}>
        {label}
      </Text>
      <Text
        style={{
          ...textStyles['body-md'],
          ...numericTabular,
          fontFamily: 'Inter_600SemiBold',
          color: valueColor ?? colors.textPrimary,
        }}
      >
        {display}
      </Text>
    </View>
  );
}

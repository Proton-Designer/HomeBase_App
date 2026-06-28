import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, MapPin, CheckCircle2 } from 'lucide-react-native';
import { addDays, endOfMonth, endOfWeek } from 'date-fns';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { useBookingStore } from '../../../stores/bookingStore';
import { enterStaggered, usePress, onlyNative } from '../../../lib/motion';
import { colors, textStyles, numericTabular } from '../../../tokens';
import type { ServiceType, Frequency, PreferredWindow } from '../../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SERVICES: { id: ServiceType; label: string; minPrice: number; maxPrice: number }[] = [
  { id: 'lawn',      label: 'Lawn Care',             minPrice: 45,  maxPrice: 95 },
  { id: 'cleaning',  label: 'Home Cleaning',         minPrice: 95,  maxPrice: 220 },
  { id: 'pool',      label: 'Pool Cleaning',         minPrice: 35,  maxPrice: 65 },
  { id: 'pest',      label: 'Pest Control',          minPrice: 85,  maxPrice: 160 },
  { id: 'pressure',  label: 'Pressure Washing',      minPrice: 220, maxPrice: 450 },
  { id: 'window',    label: 'Window Cleaning',       minPrice: 150, maxPrice: 320 },
  { id: 'gutter',    label: 'Gutter Cleaning',       minPrice: 150, maxPrice: 280 },
  { id: 'detailing', label: 'Car Detailing',         minPrice: 150, maxPrice: 400 },
  { id: 'tree',      label: 'Tree & Plant Trimming', minPrice: 250, maxPrice: 1200 },
  { id: 'solar',     label: 'Solar Panel Cleaning',  minPrice: 150, maxPrice: 500 },
];

const FREQS_BY_SERVICE: Record<ServiceType, { id: Frequency; label: string }[]> = {
  lawn:      [{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Biweekly' }, { id: 'monthly', label: 'Monthly' }],
  cleaning:  [{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Biweekly' }, { id: 'monthly', label: 'Monthly' }],
  pool:      [{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Biweekly' }],
  pest:      [{ id: 'monthly', label: 'Monthly' }, { id: 'quarterly', label: 'Quarterly' }],
  pressure:  [{ id: 'semi_annual', label: 'Twice a year' }],
  window:    [{ id: 'quarterly', label: 'Quarterly' }, { id: 'semi_annual', label: 'Twice a year' }],
  gutter:    [{ id: 'semi_annual', label: 'Spring + fall' }],
  detailing: [{ id: 'monthly', label: 'Monthly' }, { id: 'biweekly', label: 'Biweekly' }],
  tree:      [],
  solar:     [{ id: 'semi_annual', label: 'Twice a year' }],
};

const WINDOWS: { id: PreferredWindow; label: string }[] = [
  { id: 'this_week',      label: 'This week' },
  { id: 'next_1_2_weeks', label: 'Next 1–2 weeks' },
  { id: 'this_month',     label: 'This month' },
  { id: 'flexible',       label: "I'm flexible" },
];

function windowToDate(window: PreferredWindow): Date {
  const now = new Date();
  switch (window) {
    case 'this_week':
      return endOfWeek(now, { weekStartsOn: 1 });
    case 'next_1_2_weeks':
      return addDays(now, 14);
    case 'this_month':
      return endOfMonth(now);
    case 'flexible':
      return addDays(now, 30);
  }
}

export default function ServiceSelectStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: ServiceType }>();
  const {
    serviceType,
    bookingType,
    frequency,
    preferredWindow,
    addressId,
    setServiceType,
    setBookingType,
    setFrequency,
    setPreferredWindow,
    setScheduledAt,
  } = useBookingStore();

  const missingAddress = !addressId;

  const scrollViewRef = useRef<ScrollView>(null);
  const [subscriptionSectionY, setSubscriptionSectionY] = useState(0);

  // Pre-fill service from catalog deep-link param (runs once on mount).
  useEffect(() => {
    if (params.service && !serviceType) setServiceType(params.service);
  }, [params.service, serviceType, setServiceType]);

  const availableFreqs = serviceType ? FREQS_BY_SERVICE[serviceType] : [];
  const supportsSubscription = availableFreqs.length > 0;

  // Auto-default bookingType when service is first selected.
  useEffect(() => {
    if (!serviceType) return;
    if (!supportsSubscription && bookingType !== 'one_off') {
      setBookingType('one_off');
      setFrequency(null);
      return;
    }
    if (supportsSubscription && !bookingType) {
      setBookingType('one_off');
    }
  }, [serviceType, supportsSubscription, bookingType, setBookingType, setFrequency]);

  const canContinue =
    !missingAddress &&
    !!serviceType &&
    !!bookingType &&
    (bookingType !== 'subscription' || !!frequency) &&
    !!preferredWindow;

  const selectedSvc = SERVICES.find((s) => s.id === serviceType);

  // Mode B: service was pre-selected via URL param AND store has it populated.
  // Showing the grid would be redundant — switch to compact locked row.
  const isModeB = !!params.service && !!serviceType;

  const handleServiceSelect = (id: ServiceType) => {
    setServiceType(id);
    // After selection, auto-scroll to the booking-type sub-section (slight delay
    // so the layout flush happens before scrollTo fires).
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: subscriptionSectionY, animated: true });
    }, 80);
  };

  // "Change" resets service + dependent fields and reveals the full grid.
  const handleChangeService = () => {
    setServiceType(null);
    setBookingType(null);
    setFrequency(null);
    setPreferredWindow(null);
  };

  const onContinue = () => {
    setScheduledAt(windowToDate(preferredWindow!));
    router.push('/(homeowner)/booking/match');
  };

  return (
    <View testID="booking-step-service-select" style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: 24, gap: 28 }}
      >
        {/* Address warning — blocks Continue if no address on file */}
        {missingAddress ? (
          <Card tone="tinted" tintColor={colors.warningLight}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <MapPin size={20} color={colors.warning} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 10 }}>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                  Add your home address first
                </Text>
                <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                  We need your address to show you local vetted pros.
                </Text>
                <Button
                  label="Set your address"
                  size="sm"
                  onPress={() => router.push('/(auth)/address-setup' as never)}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {/* Sub-section A: full service grid — only in Mode A */}
        {!isModeB ? (
          <View>
            <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
              What service do you need?
            </Text>
            <Text
              style={{
                ...textStyles['body-md'],
                color: colors.textSecondary,
                marginTop: 6,
              }}
            >
              Pick a service and compare vetted pros near you.
            </Text>
            <View style={{ gap: 12, marginTop: 16 }}>
              {SERVICES.map((svc, i) => {
                const selected = serviceType === svc.id;
                return (
                  <Animated.View key={svc.id} entering={enterStaggered(i)}>
                    <Pressable
                      testID={`booking-service-card-${svc.id}`}
                      onPress={() => handleServiceSelect(svc.id)}
                      accessibilityLabel={svc.label}
                      style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
                    >
                      <Card
                        variant={selected ? 'outlined' : 'default'}
                        style={{
                          borderWidth: 2,
                          borderColor: selected ? colors.primary[600] : 'transparent',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
                              {svc.label}
                            </Text>
                            <Text
                              style={{
                                ...textStyles['body-sm'],
                                ...numericTabular,
                                color: colors.textSecondary,
                              }}
                            >
                              ${svc.minPrice}–${svc.maxPrice}/visit
                            </Text>
                          </View>
                          {selected ? (
                            <View
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                backgroundColor: colors.primary[600],
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={14} color={colors.textInverse} />
                            </View>
                          ) : (
                            <View
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                borderWidth: 2,
                                borderColor: colors.border,
                              }}
                            />
                          )}
                        </View>
                      </Card>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Compact selected service — Mode B always, or Mode A after selection */}
        {serviceType && selectedSvc ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.primary[50],
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.primary[200],
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                {selectedSvc.label}
              </Text>
              <Text
                style={{
                  ...textStyles['body-sm'],
                  ...numericTabular,
                  color: colors.textSecondary,
                }}
              >
                ${selectedSvc.minPrice}–${selectedSvc.maxPrice}/visit
              </Text>
            </View>
            <Pressable
              testID="booking-service-select-change-service"
              onPress={handleChangeService}
              hitSlop={8}
              accessibilityLabel="Change service"
              style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: 'Inter_600SemiBold',
                  color: colors.primary[600],
                }}
              >
                Change
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Sub-section B: booking type — appears after service is selected */}
        {serviceType ? (
          <Animated.View
            entering={onlyNative(FadeIn.duration(220))}
            style={{ gap: 14 }}
            onLayout={(e) => setSubscriptionSectionY(e.nativeEvent.layout.y)}
          >
            <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
              How would you like to book?
            </Text>

            {supportsSubscription ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <BookingTypeCard
                  testID="booking-service-select-type-subscription"
                  label="Subscription"
                  subtitle="Billed per visit · pause anytime"
                  badge="Save 10%"
                  selected={bookingType === 'subscription'}
                  onPress={() => setBookingType('subscription')}
                />
                <BookingTypeCard
                  testID="booking-service-select-type-one-off"
                  label="One-time"
                  subtitle="Pay per visit, no commitment"
                  selected={bookingType === 'one_off'}
                  onPress={() => {
                    setBookingType('one_off');
                    setFrequency(null);
                  }}
                />
              </View>
            ) : (
              <Pill label="One-time only for this service" tone="info" />
            )}

            {/* Frequency chips — only for subscription bookings */}
            {supportsSubscription && bookingType === 'subscription' ? (
              <Animated.View
                entering={onlyNative(FadeIn.duration(220))}
                style={{ marginTop: 4, gap: 12 }}
              >
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {availableFreqs.map((f) => {
                    const selected = frequency === f.id;
                    return (
                      <Pressable
                        key={f.id}
                        testID={`booking-service-select-freq-${f.id}`}
                        onPress={() => setFrequency(f.id)}
                        style={[
                          {
                            flex: 1,
                            minWidth: 110,
                            paddingVertical: 14,
                            alignItems: 'center',
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
                            color: selected ? colors.textInverse : colors.textPrimary,
                          }}
                        >
                          {f.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {frequency && selectedSvc ? (
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      ...numericTabular,
                      color: colors.textSecondary,
                    }}
                  >
                    ~${Math.round(((selectedSvc.minPrice + selectedSvc.maxPrice) / 2) * 0.9)} per visit · billed after each service · pause anytime
                  </Text>
                ) : null}
              </Animated.View>
            ) : null}

            {/* One-off price estimate */}
            {bookingType === 'one_off' && selectedSvc ? (
              <Animated.View entering={onlyNative(FadeIn.duration(220))}>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    ...numericTabular,
                    color: colors.textSecondary,
                  }}
                >
                  Estimated ${selectedSvc.minPrice}–${selectedSvc.maxPrice} for a single visit.
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Sub-section C: preferred window — appears after bookingType is set */}
        {bookingType ? (
          <Animated.View entering={onlyNative(FadeIn.duration(220))} style={{ gap: 12 }}>
            <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
              When do you need this?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WINDOWS.map((w) => {
                const selected = preferredWindow === w.id;
                return (
                  <Pressable
                    key={w.id}
                    testID={`booking-service-select-window-${w.id}`}
                    onPress={() => setPreferredWindow(w.id)}
                    accessibilityLabel={w.label}
                    style={[
                      {
                        flex: 1,
                        minWidth: '45%',
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: selected ? colors.primary[600] : colors.border,
                        backgroundColor: selected ? colors.primary[600] : colors.surface,
                      },
                      Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                    ]}
                  >
                    <Text
                      style={{
                        ...textStyles['title-md'],
                        color: selected ? colors.textInverse : colors.textPrimary,
                      }}
                    >
                      {w.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              Your provider will confirm a specific day once matched.
            </Text>
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
        <Button
          testID="booking-service-select-next"
          label="Continue"
          size="lg"
          fullWidth
          disabled={!canContinue}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

// BookingTypeCard — replaces BookingTypePill. Left-aligned layout with
// subtitle and optional badge makes the subscription vs one-time choice
// feel like a real decision rather than a toggle.
function BookingTypeCard({
  label,
  subtitle,
  badge,
  selected,
  onPress,
  testID,
}: {
  label: string;
  subtitle: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={label}
      style={[
        {
          flex: 1,
          paddingVertical: 20,
          paddingHorizontal: 16,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: selected ? colors.primary[600] : colors.border,
          backgroundColor: selected ? colors.primary[50] : colors.surface,
          gap: 6,
          alignItems: 'flex-start',
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        Platform.OS === 'web' ? null : animatedStyle,
      ]}
    >
      {/* Label row with check circle when selected */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Text
          style={{
            ...textStyles['title-md'],
            color: selected ? colors.primary[700] : colors.textPrimary,
          }}
        >
          {label}
        </Text>
        {selected ? (
          <CheckCircle2 size={26} color={colors.primary[600]} />
        ) : null}
      </View>

      {/* Subtitle */}
      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
        {subtitle}
      </Text>

      {/* Optional badge */}
      {badge ? <Pill label={badge} tone="accent" /> : null}
    </AnimatedPressable>
  );
}

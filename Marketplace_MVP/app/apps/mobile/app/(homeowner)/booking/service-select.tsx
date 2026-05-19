import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, MapPin } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { useBookingStore } from '../../../stores/bookingStore';
import { enterStaggered, usePress, onlyNative } from '../../../lib/motion';
import { colors, textStyles, numericTabular } from '../../../tokens';
import type { ServiceType, Frequency } from '../../../lib/types';

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

export default function ServiceSelectStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: ServiceType }>();
  const {
    serviceType,
    bookingType,
    frequency,
    addressId,
    setServiceType,
    setBookingType,
    setFrequency,
  } = useBookingStore();

  // If the layout hasn't resolved a primary address yet, block the wizard.
  const missingAddress = !addressId;

  useEffect(() => {
    if (params.service && !serviceType) setServiceType(params.service);
  }, [params.service, serviceType, setServiceType]);

  const availableFreqs = serviceType ? FREQS_BY_SERVICE[serviceType] : [];
  const supportsSubscription = availableFreqs.length > 0;

  // Whenever a service is selected and bookingType isn't yet set, default to
  // 'one_off' so the Continue button becomes actionable immediately. The user
  // can still upgrade to Subscription on the same screen. For verticals that
  // don't support subscription (tree), we also force 'one_off'.
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
    (bookingType !== 'subscription' || !!frequency);
  const selectedSvc = SERVICES.find((s) => s.id === serviceType);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 28 }}>
        {missingAddress ? (
          <Card tone="tinted" tintColor={colors.warningLight}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <MapPin size={20} color={colors.warning} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 10 }}>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                  Add your home address first
                </Text>
                <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                  We need your address to match you with a local pro.
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
            Pick a service and we&apos;ll match you with one verified pro.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {SERVICES.map((svc, i) => {
            const selected = serviceType === svc.id;
            return (
              <Animated.View key={svc.id} entering={enterStaggered(i)}>
                <Pressable onPress={() => setServiceType(svc.id)} style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}>
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

        {serviceType ? (
          <Animated.View entering={onlyNative(FadeIn.duration(220))} style={{ gap: 14 }}>
            <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
              How often?
            </Text>
            {supportsSubscription ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <BookingTypePill
                  label="Subscription"
                  selected={bookingType === 'subscription'}
                  badge="Save 10%"
                  onPress={() => setBookingType('subscription')}
                />
                <BookingTypePill
                  label="One-time"
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

            {supportsSubscription && bookingType === 'subscription' ? (
              <Animated.View entering={onlyNative(FadeIn.duration(220))} style={{ marginTop: 8, gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {availableFreqs.map((f) => {
                    const selected = frequency === f.id;
                    return (
                      <Pressable
                        key={f.id}
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
                    ~${Math.round((selectedSvc.minPrice + selectedSvc.maxPrice) / 2 * 0.9)} per visit · billed after each service · pause anytime
                  </Text>
                ) : null}
              </Animated.View>
            ) : null}

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
          label="Continue"
          size="lg"
          fullWidth
          disabled={!canContinue}
          onPress={() => router.push('/(homeowner)/booking/schedule')}
        />
      </View>
    </View>
  );
}

function BookingTypePill({
  label,
  selected,
  badge,
  onPress,
}: {
  label: string;
  selected: boolean;
  badge?: string;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        {
          flex: 1,
          paddingVertical: 18,
          paddingHorizontal: 12,
          alignItems: 'center',
          borderRadius: 14,
          backgroundColor: selected ? colors.primary[600] : colors.surface,
          borderWidth: 2,
          borderColor: selected ? colors.primary[600] : colors.border,
          gap: 6,
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        Platform.OS === 'web' ? null : animatedStyle,
      ]}
    >
      <Text
        style={{
          ...textStyles['title-md'],
          color: selected ? colors.textInverse : colors.textPrimary,
        }}
      >
        {label}
      </Text>
      {badge ? (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 2,
            backgroundColor: selected ? colors.accent[500] : colors.accent[100],
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              ...textStyles['body-sm'],
              fontFamily: 'Inter_600SemiBold',
              fontSize: 11,
              color: selected ? colors.textInverse : colors.accent[700],
            }}
          >
            {badge}
          </Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

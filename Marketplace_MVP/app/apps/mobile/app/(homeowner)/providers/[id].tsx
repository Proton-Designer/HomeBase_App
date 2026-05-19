import React, { useEffect } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  MapPin,
  MessageCircle,
  Leaf,
  Sparkles,
  Waves,
  Bug,
  Droplets,
  SquareDashedBottom as SquareDashed,
  CloudRain,
  Car,
  TreeDeciduous,
  Sun,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { TrustScoreDisplay } from '../../../components/shared/TrustScoreDisplay';
import { VerificationBadge } from '../../../components/shared/VerificationBadge';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { QueryErrorState } from '../../../components/shared';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import * as api from '../../../lib/api';
import { track } from '../../../lib/api/events';
import { useBookingStore } from '../../../stores/bookingStore';
import { colors, numericTabular, shadows, textStyles } from '../../../tokens';
import { enter } from '../../../lib/motion';
import { SERVICE_LABELS as SERVICE_LABEL } from '../../../lib/constants';
import type { ServiceType } from '../../../lib/types';

const SERVICE_ICON: Record<
  ServiceType,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  lawn: Leaf,
  cleaning: Sparkles,
  pool: Waves,
  pest: Bug,
  pressure: Droplets,
  window: SquareDashed,
  gutter: CloudRain,
  detailing: Car,
  tree: TreeDeciduous,
  solar: Sun,
};

function buildTagline(provider: {
  serviceTypes: ServiceType[];
  distanceMiles?: number | null;
  verificationTier: number;
}): string {
  const primary = SERVICE_LABEL[provider.serviceTypes[0]] ?? 'home services';
  const specialist = primary.toLowerCase() + ' specialist';
  const distance =
    provider.distanceMiles != null
      ? `${provider.distanceMiles.toFixed(0)} mi from your block`
      : 'your local pro';
  const tier =
    provider.verificationTier >= 2
      ? 'verified tier 2'
      : provider.verificationTier >= 1
        ? 'verified tier 1'
        : 'pending verification';
  return `${specialist} · ${distance} · ${tier}`;
}

function DetailSkeleton() {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
        <SkeletonLoader width={96} height={96} borderRadius={48} />
        <View style={{ flex: 1, gap: 10, paddingTop: 4 }}>
          <SkeletonLoader width="80%" height={26} borderRadius={8} />
          <SkeletonLoader width="100%" height={14} borderRadius={6} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <SkeletonLoader width={110} height={24} borderRadius={12} />
            <SkeletonLoader width={80} height={24} borderRadius={12} />
          </View>
        </View>
      </View>
      <View
        style={[
          { backgroundColor: colors.surface, borderRadius: 14, padding: 20 },
          shadows.sm,
        ]}
      >
        <SkeletonLoader width={120} height={14} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: '46%', alignItems: 'center', gap: 8 }}>
              <SkeletonLoader width={56} height={56} borderRadius={28} />
              <SkeletonLoader width={60} height={11} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <SkeletonLoader width="100%" height={14} borderRadius={6} />
        <SkeletonLoader width="85%" height={14} borderRadius={6} />
        <SkeletonLoader width="70%" height={14} borderRadius={6} />
      </View>
    </ScrollView>
  );
}

function DropCapBio({ text }: { text: string }) {
  if (!text) return null;
  const firstChar = text.charAt(0);
  const rest = text.slice(1);

  return (
    <View style={{ flexDirection: 'row', marginTop: 10 }}>
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 36,
          lineHeight: 36,
          color: colors.primary[700],
          marginRight: 2,
          marginTop: 2,
        }}
      >
        {firstChar}
      </Text>
      <Text
        style={{
          ...textStyles['body-md'],
          color: colors.textSecondary,
          lineHeight: 24,
          flex: 1,
        }}
      >
        {rest}
      </Text>
    </View>
  );
}

export default function ProviderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reset = useBookingStore((s) => s.reset);
  const setServiceType = useBookingStore((s) => s.setServiceType);

  const { data: provider, isLoading, isError, refetch } = useQuery({
    queryKey: ['providers', 'detail', id],
    queryFn: () => api.providers.detail(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (provider) {
      void track({
        event: 'view_provider',
        serviceType: provider.serviceTypes[0],
        metadata: { providerId: provider.id },
      });
    }
  }, [provider]);

  const handleBook = () => {
    if (!provider) return;
    reset();
    setServiceType(provider.serviceTypes[0]);
    router.push('/(homeowner)/booking/service-select');
  };

  const handleMessage = () => {
    router.push('/(homeowner)/(tabs)/inbox');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingTop: 4,
          paddingBottom: 2,
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

      {isLoading ? (
        <DetailSkeleton />
      ) : isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : !provider ? (
        <EmptyState
          heading="Provider not found"
          body="This pro may no longer be available. Browse other pros in your area."
          ctaLabel="Browse pros"
          onCta={() => router.push('/(homeowner)/providers')}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 120,
              maxWidth: 720,
              width: '100%',
              alignSelf: 'center',
            }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={enter}>
              {/* Hero: avatar left, name+meta right */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  gap: 16,
                }}
              >
                {provider.avatarUrl ? (
                  <Image
                    source={{ uri: provider.avatarUrl }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      borderWidth: 2,
                      borderColor: colors.primary[100],
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      borderWidth: 2,
                      borderColor: colors.primary[100],
                      backgroundColor: colors.primary[100],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        ...textStyles['editorial-title'],
                        fontSize: 38,
                        color: colors.primary[700],
                      }}
                    >
                      {(provider.name.trim()[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, paddingTop: 4, gap: 6 }}>
                  <Text
                    style={{
                      ...textStyles['editorial-title'],
                      color: colors.textPrimary,
                    }}
                  >
                    {provider.businessName}
                  </Text>
                  {provider.name !== provider.businessName ? (
                    <Text
                      style={{
                        ...textStyles['body-sm'],
                        color: colors.textSecondary,
                      }}
                    >
                      {provider.name}
                    </Text>
                  ) : null}

                  <Text
                    style={{
                      fontFamily: 'Fraunces_400Regular',
                      fontSize: 12,
                      fontStyle: 'italic',
                      color: colors.textTertiary,
                      lineHeight: 18,
                      marginTop: 2,
                    }}
                  >
                    {buildTagline(provider)}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    {provider.distanceMiles != null ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <MapPin size={11} color={colors.textTertiary} />
                        <Text
                          style={{
                            ...textStyles['body-sm'],
                            ...numericTabular,
                            color: colors.textTertiary,
                            fontSize: 12,
                          }}
                        >
                          {provider.distanceMiles.toFixed(1)} mi
                        </Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 3.5,
                          backgroundColor: provider.isAvailableToday
                            ? colors.success
                            : colors.textTertiary,
                        }}
                      />
                      <Text
                        style={{
                          ...textStyles['body-sm'],
                          fontSize: 12,
                          fontFamily: 'Inter_500Medium',
                          color: provider.isAvailableToday ? colors.success : colors.textSecondary,
                        }}
                      >
                        {provider.isAvailableToday ? 'Available today' : 'Not available today'}
                      </Text>
                    </View>
                  </View>

                  {provider.verificationTier >= 1 ? (
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <VerificationBadge tier={1} size="sm" />
                      {provider.verificationTier >= 2 ? (
                        <VerificationBadge tier={2} size="sm" />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Amber rule under hero */}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.accent[400],
                  marginHorizontal: 24,
                  marginTop: 20,
                  opacity: 0.6,
                }}
              />
            </Animated.View>

            <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 16 }}>
              {/* Trust score card with editorial framing */}
              <Card>
                <Text
                  style={{
                    fontFamily: 'Fraunces_400Regular',
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: colors.textTertiary,
                    marginBottom: 14,
                  }}
                >
                  what your neighbors say
                </Text>
                <TrustScoreDisplay
                  scores={provider.compositeScore}
                  size="md"
                  showOverall
                  showLabels
                  animated
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 16,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: colors.divider,
                  }}
                >
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      ...numericTabular,
                      fontFamily: 'Inter_600SemiBold',
                      color: colors.textPrimary,
                    }}
                  >
                    {provider.checkInCount}
                  </Text>
                  <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                    verified check-ins
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'Fraunces_400Regular',
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: colors.textTertiary,
                    marginTop: 6,
                  }}
                >
                  since {new Date().getFullYear() - Math.floor(provider.checkInCount / 18)} on HomeBase
                </Text>
              </Card>

              {/* Bio with drop-cap */}
              {provider.bio ? (
                <Card>
                  <Text
                    style={{
                      ...textStyles.label,
                      color: colors.textTertiary,
                      marginBottom: 2,
                    }}
                  >
                    About
                  </Text>
                  <DropCapBio text={provider.bio} />
                </Card>
              ) : null}

              {/* Services — border-only pills, no fill */}
              <Card>
                <Text
                  style={{
                    ...textStyles.label,
                    color: colors.textTertiary,
                    marginBottom: 12,
                  }}
                >
                  Services offered
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {provider.serviceTypes.map((svc) => {
                    const Icon = SERVICE_ICON[svc];
                    return (
                      <View
                        key={svc}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          borderWidth: 1,
                          borderColor: colors.border,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          backgroundColor: 'transparent',
                        }}
                      >
                        {Icon ? <Icon size={13} color={colors.primary[600]} /> : null}
                        <Text
                          style={{
                            ...textStyles['body-sm'],
                            fontFamily: 'Inter_500Medium',
                            color: colors.textPrimary,
                          }}
                        >
                          {SERVICE_LABEL[svc]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* Price */}
              <Card>
                <Text
                  style={{
                    ...textStyles.label,
                    color: colors.textTertiary,
                    marginBottom: 8,
                  }}
                >
                  Price range
                </Text>
                <Text
                  style={{
                    ...textStyles['display-md'],
                    ...numericTabular,
                    color: colors.textPrimary,
                  }}
                >
                  ${(provider.priceRangeMinCents / 100).toFixed(0)}–${(provider.priceRangeMaxCents / 100).toFixed(0)}
                  <Text
                    style={{
                      ...textStyles['body-md'],
                      color: colors.textSecondary,
                    }}
                  >
                    {' '}/ visit
                  </Text>
                </Text>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    color: colors.textTertiary,
                    marginTop: 4,
                  }}
                >
                  Final price confirmed after service details
                </Text>
              </Card>

              {/* Portfolio */}
              {provider.portfolioPhotos && provider.portfolioPhotos.length > 0 ? (
                <View>
                  <Text
                    style={{
                      fontFamily: 'Fraunces_400Regular',
                      fontSize: 12,
                      fontStyle: 'italic',
                      color: colors.textTertiary,
                      marginBottom: 10,
                    }}
                  >
                    portfolio
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {provider.portfolioPhotos.map((url, i) => (
                      <Image
                        key={i}
                        source={{ uri: url }}
                        style={{
                          width: 180,
                          height: 180,
                          borderRadius: 12,
                        }}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Sticky CTA */}
          <View
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingHorizontal: 20,
                paddingTop: 10,
                paddingBottom: Platform.OS === 'ios' ? 28 : 14,
                gap: 8,
              },
              shadows.lg,
            ]}
          >
            <Text
              style={{
                fontFamily: 'Fraunces_400Regular',
                fontSize: 12,
                fontStyle: 'italic',
                color: colors.textTertiary,
                textAlign: 'center',
              }}
            >
              confirm in 4 minutes
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={handleBook}
                  style={[
                    {
                      backgroundColor: colors.primary[700],
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_700Bold',
                      fontSize: 16,
                      color: colors.accent[300],
                      letterSpacing: 0.1,
                    }}
                  >
                    Book this pro
                  </Text>
                </Pressable>
              </View>
              <Button
                label="Message"
                variant="outline"
                size="lg"
                leftIcon={<MessageCircle size={16} color={colors.primary[600]} />}
                onPress={handleMessage}
              />
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

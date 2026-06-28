import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Eye, BadgeCheck, Star } from 'lucide-react-native';
import { useSafeBack } from '../../lib/useSafeBack';
import { useAuthStore } from '../../stores/authStore';
import * as providersApi from '../../lib/api/providers';
import { TrustSummary, VerificationBadge } from '../../components/shared';
import { colors, fonts, textStyles } from '../../tokens';

export default function PreviewProfileScreen() {
  const goBack = useSafeBack();
  const providerId = useAuthStore((s) => s.providerId);

  const { data: provider } = useQuery({
    queryKey: ['provider', 'detail', providerId],
    queryFn: () => (providerId ? providersApi.detail(providerId) : null),
    enabled: !!providerId,
  });

  const initial = (provider?.businessName ?? 'P').charAt(0).toUpperCase();
  const photos = provider?.portfolioPhotos ?? [];

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
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Preview</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 48 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.primary[50],
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Eye size={16} color={colors.primary[600]} />
          <Text style={{ ...textStyles['body-sm'], color: colors.primary[700], flex: 1 }}>
            This is how homeowners see your profile.
          </Text>
        </View>

        {/* Identity */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.primary[100],
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {provider?.avatarUrl ? (
              <Image
                source={{ uri: provider.avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <Text style={{ fontFamily: fonts.editorial, fontSize: 36, color: colors.primary[700] }}>
                {initial}
              </Text>
            )}
          </View>
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary, textAlign: 'center' }}>
            {provider?.businessName ?? 'Your business'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(provider?.verificationTier ?? 0) >= 1 ? <VerificationBadge tier={1} /> : null}
            {(provider?.verificationTier ?? 0) >= 2 ? <VerificationBadge tier={2} /> : null}
          </View>
          {provider?.externalRating ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Star size={13} color={colors.accent[500]} fill={colors.accent[500]} />
              <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                Established{provider.externalYears ? ` · ${provider.externalYears} yrs` : ''} ·{' '}
                {provider.externalRating.toFixed(1)}★{provider.externalSource ? ` on ${provider.externalSource}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Trust — honest summary (rating only once enough verified reviews) */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
          }}
        >
          <TrustSummary
            variant="detail"
            overall={provider?.compositeScore.overall}
            checkInCount={provider?.checkInCount ?? 0}
          />
        </View>

        {/* Bio */}
        {provider?.bio ? (
          <View style={{ gap: 6 }}>
            <Text style={{ ...textStyles.label, color: colors.textSecondary }}>About</Text>
            <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>{provider.bio}</Text>
          </View>
        ) : null}

        {/* Pricing */}
        {provider && provider.priceRangeMinCents > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BadgeCheck size={16} color={colors.success} />
            <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>
              From ${(provider.priceRangeMinCents / 100).toFixed(0)}
              {provider.priceRangeMaxCents > provider.priceRangeMinCents
                ? `–$${(provider.priceRangeMaxCents / 100).toFixed(0)}`
                : ''}{' '}
              / visit
            </Text>
          </View>
        ) : null}

        {/* Portfolio */}
        {photos.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...textStyles.label, color: colors.textSecondary }}>Recent work</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {photos.slice(0, 6).map((uri, i) => (
                <Image
                  key={`${uri}-${i}`}
                  source={{ uri }}
                  style={{ width: '31%', aspectRatio: 1, borderRadius: 10 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

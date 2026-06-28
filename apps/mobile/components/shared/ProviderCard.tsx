import React, { useState } from 'react';
import { Image, Platform, Pressable, Text, View, ScrollView } from 'react-native';
import { MapPin } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrustSummary } from './TrustSummary';
import { VerificationBadge } from './VerificationBadge';
import { colors, numericTabular, shadows, textStyles } from '../../tokens';
import type { Provider } from '../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const IS_WEB = Platform.OS === 'web';

/** Provider avatar — real image when available, neutral initials circle otherwise. */
function Avatar({ uri, name, size }: { uri: string | null; name: string; size: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ ...textStyles['title-md'], color: colors.primary[700], fontSize: size * 0.4 }}>
        {(name.trim()[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

export interface ProviderCardProps {
  provider: Provider;
  variant?: 'compact' | 'standard' | 'expanded' | 'shortlist';
  selected?: boolean;
  onPress?: () => void;
  onBookPress?: () => void;
  testID?: string;
}

export function ProviderCard({
  provider,
  variant = 'standard',
  selected,
  onPress,
  onBookPress,
  testID,
}: ProviderCardProps) {
  if (variant === 'compact') return <CompactCard provider={provider} onPress={onPress} testID={testID} />;
  if (variant === 'expanded')
    return <ExpandedCard provider={provider} onPress={onPress} onBookPress={onBookPress} testID={testID} />;
  if (variant === 'shortlist')
    return <ShortlistCard provider={provider} selected={selected ?? false} onPress={onPress} testID={testID} />;
  return <StandardCard provider={provider} onPress={onPress} onBookPress={onBookPress} testID={testID} />;
}

function CompactCard({ provider, onPress, testID }: { provider: Provider; onPress?: () => void; testID?: string }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const [hovered, setHovered] = useState(false);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const webHover = IS_WEB
    ? ({
        onMouseEnter: () => {
          setHovered(true);
          translateY.value = withTiming(-2, { duration: 150 });
        },
        onMouseLeave: () => {
          setHovered(false);
          translateY.value = withTiming(0, { duration: 150 });
        },
      } as object)
    : {};

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      {...webHover}
      onPressIn={() => {
        if (!IS_WEB) scale.value = withTiming(0.98, { duration: 120 });
      }}
      onPressOut={() => {
        if (!IS_WEB) scale.value = withTiming(1, { duration: 160 });
      }}
      style={[
        {
          width: 200,
          height: 240,
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 14,
          alignItems: 'center',
        },
        IS_WEB && hovered ? shadows.lg : shadows.md,
        IS_WEB && onPress ? ({ cursor: 'pointer' } as object) : null,
        animStyle,
      ]}
    >
      <Avatar uri={provider.avatarUrl} name={provider.name} size={64} />
      <Text
        numberOfLines={1}
        style={{
          ...textStyles['title-md'],
          color: colors.textPrimary,
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        {provider.name}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          ...textStyles['body-sm'],
          color: colors.textSecondary,
          marginTop: 2,
          textAlign: 'center',
        }}
      >
        {provider.businessName}
      </Text>
      <View style={{ marginTop: 6, alignItems: 'center' }}>
        <TrustSummary
          variant="inline"
          overall={provider.compositeScore.overall}
          checkInCount={provider.checkInCount}
        />
      </View>
      <Text
        style={{
          ...textStyles['body-sm'],
          ...numericTabular,
          fontSize: 11,
          color: colors.textTertiary,
          marginTop: 4,
        }}
      >
        ${(provider.priceRangeMinCents / 100).toFixed(0)}–${(provider.priceRangeMaxCents / 100).toFixed(0)}/visit
      </Text>
      <View
        style={{
          marginTop: 'auto',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: provider.isAvailableToday ? colors.success : colors.textTertiary,
          }}
        />
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: 'Inter_500Medium',
            fontSize: 11,
            color: colors.textSecondary,
          }}
        >
          {provider.isAvailableToday ? 'Available today' : 'Next available soon'}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function StandardCard({
  provider,
  onPress,
  onBookPress,
  testID,
}: {
  provider: Provider;
  onPress?: () => void;
  onBookPress?: () => void;
  testID?: string;
}) {
  return (
    <Card variant="pressable" onPress={onPress} testID={testID}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View>
          <Avatar uri={provider.avatarUrl} name={provider.name} size={48} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            {provider.name}
          </Text>
          <Text
            style={{ ...textStyles['body-sm'], color: colors.textSecondary }}
            numberOfLines={1}
          >
            {provider.businessName}
          </Text>
          <View style={{ marginTop: 6 }}>
            <TrustSummary
              variant="inline"
              overall={provider.compositeScore.overall}
              checkInCount={provider.checkInCount}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {provider.verificationTier >= 1 ? <VerificationBadge tier={1} size="sm" /> : null}
            {provider.verificationTier >= 2 ? <VerificationBadge tier={2} size="sm" /> : null}
          </View>
        </View>
        {onBookPress ? <Button label="Book" size="sm" variant="primary" onPress={onBookPress} /> : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
        }}
      >
        <Text
          style={{
            ...textStyles['body-sm'],
            ...numericTabular,
            fontFamily: 'Inter_500Medium',
            color: colors.textSecondary,
          }}
        >
          ${(provider.priceRangeMinCents / 100).toFixed(0)}–${(provider.priceRangeMaxCents / 100).toFixed(0)}/visit
        </Text>
        {provider.distanceMiles != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color={colors.textTertiary} />
            <Text
              style={{
                ...textStyles['body-sm'],
                ...numericTabular,
                color: colors.textTertiary,
              }}
            >
              {provider.distanceMiles.toFixed(1)} mi
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function ExpandedCard({
  provider,
  onPress,
  onBookPress,
  testID,
}: {
  provider: Provider;
  onPress?: () => void;
  onBookPress?: () => void;
  testID?: string;
}) {
  return (
    <Card variant="pressable" onPress={onPress} testID={testID}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Avatar uri={provider.avatarUrl} name={provider.name} size={96} />
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: 26,
              lineHeight: 30,
              color: colors.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            {provider.name}
          </Text>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary }}>
            {provider.businessName}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {provider.verificationTier >= 1 ? <VerificationBadge tier={1} size="md" /> : null}
          {provider.verificationTier >= 2 ? <VerificationBadge tier={2} size="md" /> : null}
        </View>
      </View>
      <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
        <TrustSummary
          variant="inline"
          overall={provider.compositeScore.overall}
          checkInCount={provider.checkInCount}
        />
      </View>
      {provider.bio ? (
        <Text
          style={{
            ...textStyles['body-md'],
            color: colors.textSecondary,
            marginTop: 16,
          }}
          numberOfLines={3}
        >
          {provider.bio}
        </Text>
      ) : null}
      {provider.portfolioPhotos && provider.portfolioPhotos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 16 }}
        >
          {provider.portfolioPhotos.map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              style={{ width: 100, height: 100, borderRadius: 10 }}
            />
          ))}
        </ScrollView>
      ) : null}
      <View style={{ marginTop: 20 }}>
        <Button
          label={`Book — $${(provider.priceRangeMinCents / 100).toFixed(0)}–$${(provider.priceRangeMaxCents / 100).toFixed(0)}/visit`}
          fullWidth
          onPress={onBookPress}
        />
      </View>
    </Card>
  );
}

// §6.1 — shortlist variant: horizontally-stackable, all four comparable signals, selectable.
// Designed for a 3–5 card horizontal scroll in the "pick a pro" booking step.
function ShortlistCard({
  provider,
  selected,
  onPress,
  testID,
}: {
  provider: Provider;
  selected: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));


  const portfolioSlice = provider.portfolioPhotos?.slice(0, 3) ?? [];

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={() => {
        if (!IS_WEB) scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        if (!IS_WEB) scale.value = withTiming(1, { duration: 140 });
      }}
      style={[
        {
          width: 168,
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 14,
          // Selection border: 2px brand blue when selected, 1px border otherwise.
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary[600] : colors.border,
        },
        shadows.md,
        IS_WEB && onPress ? ({ cursor: 'pointer' } as object) : null,
        animStyle,
      ]}
    >
      {/* Selection check indicator — top-right corner */}
      <View
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: selected ? colors.primary[600] : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          // Filled checkmark via unicode — lightweight, no extra icon dependency.
          <Text
            style={{
              color: colors.textInverse,
              fontSize: 11,
              lineHeight: 14,
              fontFamily: 'Inter_700Bold',
            }}
          >
            ✓
          </Text>
        ) : null}
      </View>

      {/* SIGNAL 1 — Trust: avatar + identity + score + badge(s) */}
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Avatar uri={provider.avatarUrl} name={provider.name} size={52} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{
              ...textStyles['title-md'],
              color: colors.textPrimary,
              textAlign: 'center',
            }}
          >
            {provider.name}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              ...textStyles['body-sm'],
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            {provider.businessName}
          </Text>
        </View>
        {/* Trust summary (honest — rating only once enough verified reviews) */}
        <TrustSummary
          variant="inline"
          overall={provider.compositeScore.overall}
          checkInCount={provider.checkInCount}
        />
        {/* Verification badges */}
        {provider.verificationTier >= 1 ? (
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            <VerificationBadge tier={1} size="sm" />
            {provider.verificationTier >= 2 ? <VerificationBadge tier={2} size="sm" /> : null}
          </View>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          gap: 8,
        }}
      >
        {/* SIGNAL 2 — Price */}
        <Text
          style={{
            ...textStyles['body-sm'],
            ...numericTabular,
            fontFamily: 'Inter_500Medium',
            color: colors.textSecondary,
          }}
        >
          ${(provider.priceRangeMinCents / 100).toFixed(0)}–${(provider.priceRangeMaxCents / 100).toFixed(0)}/visit
        </Text>

        {/* SIGNAL 3 — Availability + distance */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 20,
              backgroundColor: provider.isAvailableToday ? colors.successLight : colors.divider,
            }}
          >
            <Text
              style={{
                ...textStyles['body-sm'],
                fontFamily: 'Inter_500Medium',
                fontSize: 10,
                color: provider.isAvailableToday ? colors.success : colors.textSecondary,
              }}
            >
              {provider.isAvailableToday ? 'Available today' : 'Available this week'}
            </Text>
          </View>
          {provider.distanceMiles != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <MapPin size={10} color={colors.textTertiary} />
              <Text
                style={{
                  ...textStyles['body-sm'],
                  ...numericTabular,
                  fontSize: 10,
                  color: colors.textTertiary,
                }}
              >
                {provider.distanceMiles.toFixed(1)} mi
              </Text>
            </View>
          ) : null}
        </View>

        {/* SIGNAL 4 — Work samples: up to 3 thumbnails, omitted gracefully when empty */}
        {portfolioSlice.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 5, marginTop: 2 }}>
            {portfolioSlice.map((url, i) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={{ width: 60, height: 60, borderRadius: 8 }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

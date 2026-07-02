import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PenLine, ChevronRight, Search, X, SearchX } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Section } from '../../../components/ui/Section';
import { Pill } from '../../../components/ui/Pill';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { PostingChip } from '../../../components/booking/PostingChip';
import { useQuery } from '@tanstack/react-query';
import { useBookingStore } from '../../../stores/bookingStore';
import { useAuthStore } from '../../../stores/authStore';
import * as postingsApi from '../../../lib/api/postings';
import { getPriceFloors } from '../../../lib/api/providers';
import { track } from '../../../lib/api/events';
import { colors, serviceTints, shadows, textStyles, numericTabular } from '../../../tokens';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enter, enterStaggered, usePress } from '../../../lib/motion';
import {
  SERVICE_LABELS,
  SERVICE_IDS,
  SERVICE_ICONS,
  SERVICE_CATALOG,
  serviceFromPriceLabel,
} from '../../../lib/constants';
import type { ServiceType } from '../../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const IS_WEB = Platform.OS === 'web';
const platformCursorPointer = IS_WEB ? ({ cursor: 'pointer' } as object) : null;

const tintFor = (id: ServiceType): string => serviceTints[id] ?? colors.primary[50];

type ServiceDef = {
  id: ServiceType;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

const SERVICES: ServiceDef[] = SERVICE_IDS.map((id) => ({
  id,
  title: SERVICE_LABELS[id],
  subtitle: SERVICE_CATALOG[id].subtitle,
  Icon: SERVICE_ICONS[id],
}));

function priceLabel(
  id: ServiceType,
  floors: Partial<Record<ServiceType, number>>,
  loading: boolean,
): string | null {
  if (loading) return null; // null = render skeleton shimmer in ServiceCard
  const cents = floors[id];
  if (!cents || cents <= 0) return serviceFromPriceLabel(id); // fallback when no local floor
  return `From $${Math.round(cents / 100)}${SERVICE_CATALOG[id].unit}`;
}

export default function BookEntryScreen() {
  const router = useRouter();
  const setServiceType = useBookingStore((s) => s.setServiceType);
  const reset = useBookingStore((s) => s.reset);
  const userId = useAuthStore((s) => s.user)?.id ?? null;

  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: postings = [], isLoading: postingsLoading } = useQuery({
    queryKey: ['postings', 'all', userId],
    queryFn: () => postingsApi.listForHomeowner(userId!),
    enabled: !!userId,
  });

  const { data: priceFloors = {}, isLoading: pricesLoading } = useQuery({
    queryKey: ['price-floors'],
    queryFn: getPriceFloors,
    staleTime: 5 * 60 * 1000, // 5 min — floor prices change infrequently
  });

  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const isTablet = bp === 'tablet';

  const openPostings = postings.filter((p) => p.status === 'open' || p.status === 'matched');

  const filtered = SERVICES.filter(
    (s) =>
      query.trim() === '' ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.subtitle.toLowerCase().includes(query.toLowerCase()),
  );

  // True only when the user has typed something AND there are no matching services
  const showEmptySearch = query.trim().length > 0 && filtered.length === 0;

  const onQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = text.trim();
      if (trimmed.length >= 2) {
        const count = SERVICES.filter(
          (s) =>
            s.title.toLowerCase().includes(trimmed.toLowerCase()) ||
            s.subtitle.toLowerCase().includes(trimmed.toLowerCase()),
        ).length;
        // demand_events row — query with zero results signals an uncovered category
        void track({ event: 'search', metadata: { query: trimmed, resultCount: count } });
      }
    }, 300);
  };

  const onPick = (id: ServiceType) => {
    reset();
    setServiceType(id);
    void track({ event: 'booking_started', serviceType: id, metadata: { entry: 'book_tab' } });
    router.push({ pathname: '/(homeowner)/booking/service-select', params: { service: id } });
  };

  const cardWidth = isDesktop ? '32%' : isTablet ? '48%' : '100%';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Section tight>

          {/* [A] Page header — unchanged */}
          <Eyebrow>Book a service</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            What do you need?
          </Text>
          <Text
            style={{
              ...textStyles['body-lg'],
              color: colors.textSecondary,
              marginTop: 6,
              maxWidth: 540,
            }}
          >
            Pick a service to compare vetted pros — no bidding wars.
          </Text>

          {/* [B] Search bar */}
          <View style={{ marginTop: 20 }}>
            <Input
              variant="filled"
              placeholder="Search services…"
              leftIcon={<Search size={18} color={colors.textTertiary} />}
              rightIcon={
                query.length > 0 ? (
                  <Pressable
                    onPress={() => setQuery('')}
                    hitSlop={8}
                    accessibilityLabel="Clear search"
                  >
                    <X size={16} color={colors.textTertiary} />
                  </Pressable>
                ) : undefined
              }
              value={query}
              onChangeText={onQueryChange}
              returnKeyType="search"
              clearButtonMode="never"
              autoCorrect={false}
              autoCapitalize="none"
              secureTextEntry={false}
              accessibilityLabel="Search services"
            />
          </View>

          {/* [C] Post custom job CTA card */}
          <Pressable
            onPress={() => router.push('/(homeowner)/post-job/service')}
            style={[{ marginTop: 16 }, platformCursorPointer]}
            accessibilityLabel="Post a custom job"
            accessibilityRole="button"
          >
            <Card
              tone="tinted"
              tintColor={colors.accent[100]}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.accent[500],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PenLine size={22} color={colors.textInverse} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                  Post a custom job
                </Text>
                <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                  Describe the work, attach photos, get quotes from local pros.
                </Text>
              </View>
              <ChevronRight size={20} color={colors.accent[700]} />
            </Card>
          </Pressable>

          {/* [D] Active postings strip — hidden during empty search state */}
          {!showEmptySearch && (
            <>
              {postingsLoading && !!userId ? (
                // Skeleton loading state: two chip-shaped rects
                <View style={{ marginTop: 20 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[0, 1].map((i) => (
                      <View
                        key={i}
                        style={{
                          width: 220,
                          height: 56,
                          borderRadius: 12,
                          backgroundColor: colors.divider,
                          opacity: 0.6,
                        }}
                      />
                    ))}
                  </View>
                </View>
              ) : openPostings.length > 0 ? (
                <Animated.View entering={enter} style={{ marginTop: 20 }}>
                  {/* Strip header: eyebrow label + open-count pill */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Eyebrow style={{ flex: 1 }}>Your open requests</Eyebrow>
                    <Pill label={`${openPostings.length}`} tone="info" />
                  </View>

                  {/* Horizontal chip scroll */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8 }}
                    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  >
                    {openPostings.map((posting) => (
                      <PostingChip
                        key={posting.id}
                        posting={posting}
                        serviceIcon={SERVICE_ICONS[posting.serviceType] ?? SERVICE_ICONS.lawn}
                        onPress={() => router.push('/(homeowner)/postings')}
                      />
                    ))}
                  </ScrollView>

                  {/* See all link */}
                  <Pressable
                    onPress={() => router.push('/(homeowner)/postings')}
                    style={[{ marginTop: 8, alignSelf: 'flex-end' }, platformCursorPointer]}
                    accessibilityLabel="See all postings"
                    accessibilityRole="link"
                  >
                    <Text
                      style={{
                        ...textStyles['body-sm'],
                        fontFamily: 'Inter_600SemiBold',
                        color: colors.primary[600],
                      }}
                    >
                      See all postings →
                    </Text>
                  </Pressable>
                </Animated.View>
              ) : null}
            </>
          )}

          {/* [E] Services section divider — only when grid is visible */}
          {!showEmptySearch && (
            <Eyebrow style={{ marginTop: 24, marginBottom: 12 }}>Services</Eyebrow>
          )}

          {/* [F] Service cards grid OR empty search state */}
          {showEmptySearch ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <SearchX size={32} color={colors.textTertiary} />
              <Text
                style={{
                  ...textStyles['title-md'],
                  color: colors.textPrimary,
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                {`No match for "${query}"`}
              </Text>
              <Text
                style={{
                  ...textStyles['body-sm'],
                  color: colors.textSecondary,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                Describe the job yourself and get quotes from local pros.
              </Text>
              <Button
                label="Post a custom job"
                variant="primary"
                style={{ marginTop: 16 }}
                onPress={() => router.push('/(homeowner)/post-job/service')}
              />
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
                alignSelf: 'center',
                width: '100%',
                maxWidth: isDesktop ? 1024 : undefined,
              }}
            >
              {filtered.map((s, i) => (
                <ServiceCard
                  key={s.id}
                  index={i}
                  title={s.title}
                  subtitle={s.subtitle}
                  price={priceLabel(s.id, priceFloors, pricesLoading)}
                  Icon={s.Icon}
                  tint={tintFor(s.id)}
                  width={cardWidth}
                  onPress={() => onPick(s.id)}
                />
              ))}
            </View>
          )}

        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServiceCard({
  index,
  title,
  subtitle,
  price,
  Icon,
  tint,
  width,
  onPress,
}: {
  index: number;
  title: string;
  subtitle: string;
  price: string | null;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
  width: string | number;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      entering={enterStaggered(index)}
      accessibilityLabel={title}
      accessibilityRole="button"
      style={[
        {
          width: width as never,
          height: 96,
          backgroundColor: tint,
          borderRadius: 14,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        },
        shadows.sm,
        IS_WEB ? ({ cursor: 'pointer' } as object) : null,
        IS_WEB ? null : animatedStyle,
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>{title}</Text>
        <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>{subtitle}</Text>
        {price === null ? (
          // Price loading skeleton
          <View
            style={{
              width: 60,
              height: 12,
              backgroundColor: colors.divider,
              borderRadius: 6,
            }}
          />
        ) : (
          <Text
            style={{
              ...textStyles['body-sm'],
              ...numericTabular,
              fontFamily: 'Inter_600SemiBold',
              color: colors.primary[600],
            }}
          >
            {price}
          </Text>
        )}
      </View>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={colors.primary[600]} />
      </View>
    </AnimatedPressable>
  );
}

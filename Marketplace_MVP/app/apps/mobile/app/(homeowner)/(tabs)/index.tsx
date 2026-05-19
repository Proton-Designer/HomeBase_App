import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Leaf,
  Sparkles,
  Search,
  UserCheck,
  Star,
  Waves,
  Bug,
  Droplets,
  SquareDashedBottom as SquareDashed,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ProviderCard, EmptyState } from '../../../components/shared';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Section } from '../../../components/ui/Section';
import { Chip } from '../../../components/ui/Chip';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { useBookingStore } from '../../../stores/bookingStore';
import { useAuthStore } from '../../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../../lib/api';
import { colors, serviceTints, shadows, textStyles, fonts } from '../../../tokens';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enterStaggered, usePress } from '../../../lib/motion';
import type { ServiceType } from '../../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FILTER_PILLS: { id: ServiceType | 'all'; label: string; enabled: boolean }[] = [
  { id: 'all',       label: 'All',       enabled: true },
  { id: 'lawn',      label: 'Lawn',      enabled: true },
  { id: 'cleaning',  label: 'Cleaning',  enabled: true },
  { id: 'pool',      label: 'Pool',      enabled: true },
  { id: 'pest',      label: 'Pest',      enabled: true },
  { id: 'pressure',  label: 'Pressure',  enabled: true },
  { id: 'window',    label: 'Window',    enabled: true },
  { id: 'gutter',    label: 'Gutter',    enabled: false },
  { id: 'detailing', label: 'Detailing', enabled: false },
  { id: 'tree',      label: 'Tree',      enabled: false },
  { id: 'solar',     label: 'Solar',     enabled: false },
];

const QUICK_BOOK: {
  id: ServiceType;
  title: string;
  priceLabel: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { id: 'lawn',     title: 'Lawn Care',      priceLabel: 'Weekly or one-time',    Icon: Leaf },
  { id: 'cleaning', title: 'Home Cleaning',  priceLabel: 'Recurring or one-time', Icon: Sparkles },
  { id: 'pool',     title: 'Pool Cleaning',  priceLabel: 'Weekly upkeep',         Icon: Waves },
  { id: 'pest',     title: 'Pest Control',   priceLabel: 'Monthly or quarterly',  Icon: Bug },
  { id: 'pressure', title: 'Pressure Wash',  priceLabel: 'One-time service',      Icon: Droplets },
  { id: 'window',   title: 'Window Clean',   priceLabel: 'Seasonal service',      Icon: SquareDashed },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  return 'good evening';
}

export default function HomeBrowseScreen() {
  const router = useRouter();
  const reset = useBookingStore((s) => s.reset);
  const setServiceType = useBookingStore((s) => s.setServiceType);
  const profile = useAuthStore((s) => s.profile);
  const pendingSetup = useAuthStore((s) => s.pendingHomeownerSetup);
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const isMobile = bp === 'mobile';
  const [activeFilter, setActiveFilter] = useState<ServiceType | 'all'>('all');

  const firstName = profile?.firstName ?? null;
  const homeZip = pendingSetup?.zip ?? null;
  const homeCity = pendingSetup?.city ?? null;

  const { data: allProviders = [] } = useQuery({
    queryKey: ['providers', 'search', homeZip, activeFilter === 'all' ? undefined : activeFilter],
    queryFn: () =>
      api.providers.search(homeZip ?? '00000', activeFilter === 'all' ? undefined : activeFilter),
    staleTime: 5 * 60 * 1000,
  });

  const visibleProviders = allProviders;

  const startBooking = (svc?: ServiceType) => {
    reset();
    if (svc) setServiceType(svc);
    router.push({
      pathname: '/(homeowner)/booking/service-select',
      params: svc ? { service: svc } : undefined,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Editorial hero — replaces the generic Hero component for the home tab */}
        <LinearGradient
          colors={[colors.primary[800], colors.primary[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={{ width: '100%', paddingTop: isMobile ? 40 : 64, paddingBottom: isMobile ? 40 : 56 }}
        >
          {/* Floating ambient circle */}
          <View
            style={{
              position: 'absolute',
              top: -80,
              right: -60,
              width: 280,
              height: 280,
              borderRadius: 140,
              backgroundColor: colors.accent[400],
              opacity: 0.1,
            }}
            pointerEvents="none"
          />

          <View
            style={{
              paddingHorizontal: isMobile ? 20 : 32,
              maxWidth: 1200,
              width: '100%',
              alignSelf: 'center',
              gap: 6,
            }}
          >
            {/* Italic greeting eyebrow */}
            {firstName ? (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontStyle: 'italic',
                  fontSize: 14,
                  lineHeight: 20,
                  color: 'rgba(247,207,104,0.75)', // accent[300] at 75%
                  letterSpacing: 0.1,
                  marginBottom: 4,
                }}
              >
                {getGreeting()}, {firstName}
              </Text>
            ) : null}

            {/* Editorial title */}
            <Text
              style={{
                fontFamily: fonts.editorial,
                fontSize: isMobile ? 34 : 44,
                lineHeight: isMobile ? 38 : 48,
                color: colors.textInverse,
                letterSpacing: isMobile ? -0.8 : -1.2,
                maxWidth: 600,
              }}
            >
              Your block&apos;s trusted pros.
            </Text>

            <Text
              style={{
                ...textStyles['body-md'],
                color: 'rgba(255,255,255,0.72)',
                maxWidth: 480,
                marginTop: 6,
              }}
            >
              One vetted pro per booking. Transparent pricing. Same-day pay for the people who do the work.
            </Text>

            <View style={{ marginTop: 16 }}>
              <Button
                label="Book now"
                variant="secondary"
                size="lg"
                onPress={() => startBooking()}
              />
            </View>
          </View>
        </LinearGradient>

        {/* Quick book section */}
        <Section tight>
          <Eyebrow>Quick book</Eyebrow>
          <Text
            style={{
              ...textStyles['display-md'],
              color: colors.textPrimary,
              marginTop: 6,
              marginBottom: 16,
            }}
          >
            Tap a service to get matched
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {QUICK_BOOK.map((s, i) => (
              <QuickBookCard
                key={s.id}
                title={s.title}
                priceLabel={s.priceLabel}
                Icon={s.Icon}
                tint={serviceTints[s.id] ?? colors.primary[50]}
                index={i}
                onPress={() => startBooking(s.id)}
                isDesktop={isDesktop}
              />
            ))}
          </View>
        </Section>

        {/* Neighborhood pros section */}
        <Section tight tone="surface">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 12,
            }}
          >
            <View>
              {/* Left-aligned amber rule above section title */}
              <View
                style={{
                  height: 1,
                  width: 24,
                  backgroundColor: colors.accent[500],
                  marginBottom: 8,
                  borderRadius: 1,
                }}
              />
              <Eyebrow>Neighborhood pros</Eyebrow>
              <Text
                style={{
                  ...textStyles['display-md'],
                  color: colors.textPrimary,
                  marginTop: 6,
                }}
              >
                {homeZip ? `Verified pros near ${homeZip}` : 'Verified pros near you'}
              </Text>
            </View>
            <Pressable
              hitSlop={6}
              onPress={() => router.push('/(homeowner)/providers')}
              style={[
                { flexDirection: 'row', alignItems: 'center', gap: 2 },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  lineHeight: 19,
                  color: colors.primary[600],
                }}
              >
                see all
              </Text>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 14,
                  lineHeight: 19,
                  color: colors.primary[600],
                }}
              >
                {' →'}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            style={{ marginBottom: 16 }}
          >
            {FILTER_PILLS.map((pill) => (
              <Chip
                key={pill.id}
                label={pill.label}
                selected={activeFilter === pill.id}
                disabled={!pill.enabled}
                size="sm"
                onPress={() => pill.enabled && setActiveFilter(pill.id)}
              />
            ))}
          </ScrollView>

          {visibleProviders.length === 0 ? (
            <View style={{ paddingVertical: 16 }}>
              <EmptyState
                heading={
                  activeFilter === 'all'
                    ? 'No verified pros on your block yet'
                    : 'No pros in this category'
                }
                body={
                  activeFilter === 'all'
                    ? 'HomeBase is growing in your neighborhood — we\'ll notify you when a vetted provider joins.'
                    : 'Try another filter or check back soon — we\'re growing on your block.'
                }
                ctaLabel={activeFilter === 'all' ? undefined : 'Show all'}
                onCta={activeFilter === 'all' ? undefined : () => setActiveFilter('all')}
              />
            </View>
          ) : isDesktop ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {visibleProviders.map((p, i) => (
                <Animated.View
                  key={p.id}
                  entering={enterStaggered(i)}
                  style={{ flexBasis: '32%', flexGrow: 1, minWidth: 240 }}
                >
                  <ProviderCard
                    provider={p}
                    variant="compact"
                    onPress={() => router.push(`/(homeowner)/providers/${p.id}`)}
                  />
                </Animated.View>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 8 }}
            >
              {visibleProviders.map((p, i) => (
                <Animated.View key={p.id} entering={enterStaggered(i)}>
                  <ProviderCard
                    provider={p}
                    variant="compact"
                    onPress={() => router.push(`/(homeowner)/providers/${p.id}`)}
                  />
                </Animated.View>
              ))}
            </ScrollView>
          )}

          {/* Edition footer */}
          <View
            style={{
              marginTop: 24,
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <View
              style={{
                height: 1,
                width: 80,
                backgroundColor: colors.accent[400],
                opacity: 0.5,
                borderRadius: 1,
              }}
            />
            <Text
              style={{
                fontFamily: fonts.body,
                fontStyle: 'italic',
                fontSize: 11,
                lineHeight: 16,
                color: colors.textTertiary,
                letterSpacing: 0.1,
              }}
            >
              {homeCity ? `HomeBase · ${homeCity} edition` : 'HomeBase'}
            </Text>
          </View>
        </Section>

        {/* How it works */}
        <Section tight>
          <Eyebrow>How it works</Eyebrow>
          <Text
            style={{
              ...textStyles['display-md'],
              color: colors.textPrimary,
              marginTop: 6,
              marginBottom: 16,
            }}
          >
            Three taps to a trusted pro
          </Text>
          <View style={{ gap: 12 }}>
            <Step n={1} Icon={Search} title="Tell us what you need" body="Pick a service and a time that works for you." />
            <Step n={2} Icon={UserCheck} title="We match you with one trusted pro" body="No spam. No bidding wars. One verified provider per booking." />
            <Step n={3} Icon={Star} title="They arrive, you review" body="A 15-second check-in keeps your future neighbors safe." />
          </View>
        </Section>

        {/* Why HomeBase */}
        <Section tight tone="surface">
          <Eyebrow>Why HomeBase</Eyebrow>
          <Text
            style={{
              ...textStyles['display-md'],
              color: colors.textPrimary,
              marginTop: 6,
              marginBottom: 16,
            }}
          >
            Built different on purpose
          </Text>
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {[
              { h: 'No lead spam', s: 'You get one match — never 5 contractors bidding for you.', tint: serviceTints.lawn },
              { h: 'Verified & insured', s: 'Tier 1 background check + Tier 2 insurance, every pro.', tint: serviceTints.cleaning },
              { h: 'Same-day pay for pros', s: 'Better providers choose HomeBase because we pay them same-day.', tint: serviceTints.pool },
              { h: 'Real damage protection', s: 'A binding SLA — not fine print disclaimers.', tint: serviceTints.pest },
            ].map((f, i) => (
              <View
                key={f.h}
                style={
                  isDesktop
                    ? { flexBasis: '23%', flexGrow: 1, minWidth: 220 }
                    : { width: '100%' }
                }
              >
                <Animated.View entering={enterStaggered(i)}>
                  <Card tone="tinted" tintColor={f.tint}>
                    <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
                      {f.h}
                    </Text>
                    <Text
                      style={{
                        ...textStyles['body-sm'],
                        color: colors.textSecondary,
                        marginTop: 6,
                      }}
                    >
                      {f.s}
                    </Text>
                  </Card>
                </Animated.View>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickBookCard({
  title,
  priceLabel,
  Icon,
  tint,
  index,
  onPress,
  isDesktop,
}: {
  title: string;
  priceLabel: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
  index: number;
  onPress: () => void;
  isDesktop: boolean;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={Platform.OS !== 'web' ? onPressIn : undefined}
      onPressOut={Platform.OS !== 'web' ? onPressOut : undefined}
      entering={enterStaggered(index)}
      style={[
        {
          flexBasis: isDesktop ? '15%' : '47%',
          flexGrow: 1,
          minWidth: isDesktop ? 160 : 150,
          minHeight: 144,
          backgroundColor: tint,
          borderRadius: 14,
          padding: 16,
          paddingVertical: 18,
          gap: 8,
        },
        shadows.sm,
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        Platform.OS !== 'web' ? animatedStyle : null,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={colors.primary[600]} />
      </View>
      <Text
        style={{
          ...textStyles['title-md'],
          color: colors.textPrimary,
          marginTop: 8,
        }}
      >
        {title}
      </Text>
      {/* Italic price label */}
      <Text
        style={{
          fontFamily: fonts.body,
          fontStyle: 'italic',
          fontSize: 12,
          lineHeight: 17,
          color: colors.textSecondary,
        }}
      >
        {priceLabel}
      </Text>
    </AnimatedPressable>
  );
}

function Step({
  n,
  Icon,
  title,
  body,
}: {
  n: number;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        {/* Oversized step numeral */}
        <View style={{ alignItems: 'center', width: 40 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              lineHeight: 32,
              fontWeight: '700',
              color: colors.accent[400],
              letterSpacing: -0.5,
            }}
          >
            {n}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon size={16} color={colors.primary[400]} />
            <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
              {title}
            </Text>
          </View>
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            {body}
          </Text>
        </View>
      </View>
    </Card>
  );
}

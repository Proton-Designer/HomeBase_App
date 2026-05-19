import React from 'react';
import { View, Text, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
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
  PenLine,
  ChevronRight,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Section } from '../../../components/ui/Section';
import { Pill } from '../../../components/ui/Pill';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Card } from '../../../components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { useBookingStore } from '../../../stores/bookingStore';
import { useAuthStore } from '../../../stores/authStore';
import * as postingsApi from '../../../lib/api/postings';
import { track } from '../../../lib/api/events';
import { colors, serviceTints, shadows, textStyles, numericTabular } from '../../../tokens';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enterStaggered, usePress } from '../../../lib/motion';
import type { ServiceType } from '../../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Phase = 'mvp1' | 'phase2' | 'phase3' | 'phase4';

const tintFor = (id: ServiceType): string => serviceTints[id] ?? colors.primary[50];

const SERVICES: {
  id: ServiceType;
  title: string;
  subtitle: string;
  price: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  phase: Phase;
}[] = [
  { id: 'lawn',      title: 'Lawn Care',             subtitle: 'Mowing, edging, trimming',           price: 'From $45/visit',  Icon: Leaf,         phase: 'mvp1' },
  { id: 'cleaning',  title: 'Home Cleaning',         subtitle: 'Standard, deep clean, move-in/out',  price: 'From $80/visit',  Icon: Sparkles,     phase: 'mvp1' },
  { id: 'pool',      title: 'Pool Cleaning',         subtitle: 'Weekly skim, chem-balance, filter',  price: 'From $35/visit',  Icon: Waves,        phase: 'mvp1' },
  { id: 'pest',      title: 'Pest Control',          subtitle: 'Quarterly perimeter & interior',     price: 'From $85/visit',  Icon: Bug,          phase: 'mvp1' },
  { id: 'pressure',  title: 'Pressure Washing',      subtitle: 'Siding, drives, fences, decks',      price: 'From $220/job',   Icon: Droplets,     phase: 'mvp1' },
  { id: 'window',    title: 'Window Cleaning',       subtitle: 'Interior + exterior, screens incl.', price: 'From $150/visit', Icon: SquareDashed, phase: 'mvp1' },
  { id: 'gutter',    title: 'Gutter Cleaning',       subtitle: 'Spring + fall clear-outs',           price: 'From $150/visit', Icon: CloudRain,    phase: 'phase2' },
  { id: 'detailing', title: 'Car Detailing',         subtitle: 'Mobile interior + exterior',         price: 'From $150/visit', Icon: Car,          phase: 'phase2' },
  { id: 'tree',      title: 'Tree & Plant Trimming', subtitle: 'Trim, shape, hazard removal',        price: 'From $250/job',   Icon: TreeDeciduous, phase: 'phase3' },
  { id: 'solar',     title: 'Solar Panel Cleaning',  subtitle: 'Soft-bristle, DI-water rinse',       price: 'From $150/visit', Icon: Sun,          phase: 'phase4' },
];

const ENABLED_PHASES: Set<Phase> = new Set(['mvp1']);

const PHASE_LABEL: Record<Phase, string> = {
  mvp1: '',
  phase2: 'Phase 2',
  phase3: 'Phase 3',
  phase4: 'Phase 4',
};

export default function BookEntryScreen() {
  const router = useRouter();
  const setServiceType = useBookingStore((s) => s.setServiceType);
  const reset = useBookingStore((s) => s.reset);
  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const { data: postings = [] } = useQuery({
    queryKey: ['postings', 'all', userId],
    queryFn: () => postingsApi.listForHomeowner(userId!),
    enabled: !!userId,
  });
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const isTablet = bp === 'tablet';

  const onPick = (id: ServiceType, phase: Phase) => {
    if (!ENABLED_PHASES.has(phase)) {
      Alert.alert('Coming soon', `This service is launching in ${PHASE_LABEL[phase]}.`);
      return;
    }
    reset();
    setServiceType(id);
    void track({ event: 'booking_started', serviceType: id, metadata: { entry: 'book_tab' } });
    router.push({ pathname: '/(homeowner)/booking/service-select', params: { service: id } });
  };

  const cardWidth = isDesktop ? '32%' : isTablet ? '48%' : '100%';
  const cardMinHeight = isDesktop ? 196 : 160;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Section tight>
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
            Pick a service to get matched with one verified pro — no bidding wars.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 14,
              marginTop: 24,
              alignSelf: 'center',
              width: '100%',
              maxWidth: isDesktop ? 1024 : undefined,
            }}
          >
            {SERVICES.map((s, i) => {
              const enabled = ENABLED_PHASES.has(s.phase);
              return (
                <ServiceCard
                  key={s.id}
                  index={i}
                  enabled={enabled}
                  title={s.title}
                  subtitle={s.subtitle}
                  price={s.price}
                  Icon={s.Icon}
                  tint={tintFor(s.id)}
                  phaseLabel={PHASE_LABEL[s.phase]}
                  width={cardWidth}
                  minHeight={cardMinHeight}
                  onPress={() => onPick(s.id, s.phase)}
                />
              );
            })}
          </View>
        </Section>

        <Section tight>
          <Eyebrow tone="accent">Custom request</Eyebrow>
          <Text
            style={{
              ...textStyles['display-md'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            Don&apos;t see exactly what you need?
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
              maxWidth: 540,
            }}
          >
            Post a custom job. Vetted local pros respond with quotes — you pick the one that fits.
          </Text>

          <Pressable
            onPress={() => router.push('/(homeowner)/post-job/service')}
            style={[
              { marginTop: 16 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Card
              tone="tinted"
              tintColor={colors.accent[100]}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 20,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.accent[500],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PenLine size={26} color={colors.textInverse} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
                  Post a custom job
                </Text>
                <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                  Describe the work, attach photos, get quotes from local pros.
                </Text>
              </View>
              <ChevronRight size={22} color={colors.accent[700]} />
            </Card>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(homeowner)/postings')}
            style={[
              { marginTop: 12 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Card
              variant="outlined"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 18,
                paddingVertical: 16,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                  My postings
                </Text>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    ...numericTabular,
                    color: colors.textSecondary,
                  }}
                >
                  {postings.length} {postings.length === 1 ? 'posting' : 'postings'} ·{' '}
                  {postings.filter((p) => p.status === 'open').length} awaiting quotes
                </Text>
              </View>
              <Pill
                label={`${postings.length}`}
                tone={postings.length > 0 ? 'primary' : 'neutral'}
              />
              <ChevronRight size={20} color={colors.textTertiary} />
            </Card>
          </Pressable>
        </Section>

        <Section tight>
          <View
            style={{
              padding: 18,
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                ...textStyles['body-md'],
                color: colors.textSecondary,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textPrimary }}>
                Coming soon —{' '}
              </Text>
              tree care, car detailing, gutter cleaning, and solar panel care. Save an interest in your profile and we&apos;ll notify you.
            </Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServiceCard({
  index,
  enabled,
  title,
  subtitle,
  price,
  Icon,
  tint,
  phaseLabel,
  width,
  minHeight,
  onPress,
}: {
  index: number;
  enabled: boolean;
  title: string;
  subtitle: string;
  price: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
  phaseLabel: string;
  width: string | number;
  minHeight: number;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      entering={enterStaggered(index)}
      style={[
        {
          width: width as any,
          minHeight,
          backgroundColor: tint,
          borderRadius: 14,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          opacity: enabled ? 1 : 0.78,
          position: 'relative',
        },
        shadows.sm,
        Platform.OS === 'web' ? ({ cursor: enabled ? 'pointer' : 'default' } as object) : null,
        Platform.OS === 'web' ? null : animatedStyle,
      ]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>{title}</Text>
        <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
          {subtitle}
        </Text>
        <Text
          style={{
            ...textStyles['body-sm'],
            ...numericTabular,
            fontFamily: 'Inter_600SemiBold',
            color: colors.primary[600],
            marginTop: 4,
          }}
        >
          {price}
        </Text>
      </View>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={30} color={colors.primary[600]} />
      </View>
      {!enabled && phaseLabel ? (
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <Pill label={phaseLabel} tone="warning" />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import Animated from 'react-native-reanimated';
import { Pill, type PillTone } from '../../../components/ui/Pill';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { SkeletonLoader, EmptyState } from '../../../components/shared';
import * as claimsApi from '../../../lib/api/claims';
import { useAuthStore } from '../../../stores/authStore';
import { colors, textStyles } from '../../../tokens';
import { enterStaggered, usePress } from '../../../lib/motion';
import type { Claim, ClaimStatus, IncidentType, ResolutionKind } from '../../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATUS_TONE: Record<ClaimStatus, { tone: PillTone; label: string }> = {
  submitted: { tone: 'info', label: 'Submitted' },
  under_review: { tone: 'warning', label: 'Under review' },
  approved: { tone: 'success', label: 'Approved' },
  denied: { tone: 'error', label: 'Denied' },
  resolved: { tone: 'neutral', label: 'Resolved' },
};

const INCIDENT_LABEL: Record<IncidentType, string> = {
  property_damage: 'Property damage',
  theft: 'Theft',
  poor_quality: 'Poor quality',
  no_show: 'No-show',
  injury: 'Injury',
  other: 'Other',
};

const RESOLUTION_LABEL: Record<ResolutionKind, string> = {
  refund: 'Full refund',
  redo: 'Redo the job',
  partial_credit: 'Partial credit',
  none: 'Flag only',
};

function ClaimRowSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonLoader width={120} height={14} borderRadius={4} />
        <SkeletonLoader width={72} height={26} borderRadius={999} />
      </View>
      <SkeletonLoader width="80%" height={12} borderRadius={4} />
      <SkeletonLoader width="50%" height={12} borderRadius={4} />
    </View>
  );
}

function ClaimRow({ claim, onPress }: { claim: Claim; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  const m = STATUS_TONE[claim.status];
  const postedAgo = formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={Platform.OS === 'web' ? undefined : onPressIn}
      onPressOut={Platform.OS === 'web' ? undefined : onPressOut}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.07,
          shadowRadius: 6,
          elevation: 2,
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        Platform.OS !== 'web' ? animatedStyle : null,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            {INCIDENT_LABEL[claim.incidentType]}
          </Text>
          <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
            {claim.providerName} · {postedAgo}
          </Text>
          <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
            {RESOLUTION_LABEL[claim.requestedResolution]}
            {claim.requestedAmountCents !== null
              ? ` · $${(claim.requestedAmountCents / 100).toFixed(2)}`
              : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Pill label={m.label} tone={m.tone} />
          <ChevronRight size={16} color={colors.textTertiary} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function ClaimsIndexScreen() {
  const router = useRouter();
  const homeownerId = useAuthStore((s) => s.user?.id ?? null);

  const { data: claims, isLoading } = useQuery({
    queryKey: ['claims', 'homeowner', homeownerId],
    queryFn: () => claimsApi.listForHomeowner(homeownerId ?? ''),
    enabled: !!homeownerId,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingTop: 6,
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

      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>My claims</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 6,
            }}
          >
            Filed claims
          </Text>
        </View>

        {isLoading ? (
          <View style={{ gap: 12 }}>
            <ClaimRowSkeleton />
            <ClaimRowSkeleton />
          </View>
        ) : !claims || claims.length === 0 ? (
          <EmptyState
            illustration={<Shield size={48} color={colors.textTertiary} />}
            heading="No claims yet"
            body="If something goes wrong with a completed job, you can file a claim from that job's detail screen."
            ctaLabel="Open a completed job to file a claim"
            onCta={() => router.push('/(homeowner)/(tabs)/jobs')}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {claims.map((claim, i) => (
              <Animated.View key={claim.id} entering={enterStaggered(i)}>
                <ClaimRow
                  claim={claim}
                  onPress={() => router.push(`/(homeowner)/claims/${claim.id}`)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

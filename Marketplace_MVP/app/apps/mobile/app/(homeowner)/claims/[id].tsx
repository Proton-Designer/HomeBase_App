import React from 'react';
import { View, Text, ScrollView, Pressable, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  AlertTriangle,
  ShieldX,
  Frown,
  Clock,
  HeartPulse,
  MoreHorizontal,
  Shield,
  CheckCircle,
} from 'lucide-react-native';
import { format } from 'date-fns';
import Animated from 'react-native-reanimated';
import { Card } from '../../../components/ui/Card';
import { Pill, type PillTone } from '../../../components/ui/Pill';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { SkeletonLoader } from '../../../components/shared';
import * as claimsApi from '../../../lib/api/claims';
import { colors, textStyles, numericTabular } from '../../../tokens';
import { enter } from '../../../lib/motion';
import type { ClaimStatus, IncidentType, ResolutionKind } from '../../../lib/types';

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

const INCIDENT_ICON: Record<IncidentType, React.ReactNode> = {
  property_damage: <AlertTriangle size={20} color={colors.error} />,
  theft: <ShieldX size={20} color={colors.error} />,
  poor_quality: <Frown size={20} color={colors.warning} />,
  no_show: <Clock size={20} color={colors.warning} />,
  injury: <HeartPulse size={20} color={colors.error} />,
  other: <MoreHorizontal size={20} color={colors.textSecondary} />,
};

const RESOLUTION_LABEL: Record<ResolutionKind, string> = {
  refund: 'Full refund',
  redo: 'Redo the job',
  partial_credit: 'Partial credit',
  none: 'Flag only — no remedy requested',
};

const NEXT_STEPS: Record<ClaimStatus, string[]> = {
  submitted: [
    'Your claim is queued for review.',
    "The provider's payout remains in escrow.",
    'A HomeBase team member will review within 24 hours.',
    'You will be notified of any status changes.',
  ],
  under_review: [
    'A HomeBase team member is reviewing the details.',
    "The provider's payout remains in escrow.",
    'We may reach out for additional information.',
    'Most reviews are completed within 2–3 business days.',
  ],
  approved: [
    'Your claim has been approved.',
    'The agreed resolution is being applied.',
    'You will receive a confirmation once complete.',
  ],
  denied: [
    'Your claim was reviewed and denied.',
    "The provider's payout has been released.",
    'If you believe this is an error, contact HomeBase support.',
  ],
  resolved: [
    'This claim has been fully resolved.',
    'No further action is needed.',
  ],
};

function DetailRow({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>{label}</Text>
      <Text
        style={{
          ...textStyles['body-md'],
          ...(numeric ? numericTabular : null),
          fontFamily: 'Inter_600SemiBold',
          color: colors.textPrimary,
          flexShrink: 1,
          textAlign: 'right',
          maxWidth: '60%',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonLoader width={180} height={30} borderRadius={6} />
        <SkeletonLoader width={80} height={28} borderRadius={999} />
      </View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          gap: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {[100, 140, 120].map((w, i) => (
          <SkeletonLoader key={i} width={w} height={12} borderRadius={4} />
        ))}
      </View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          gap: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <SkeletonLoader width="100%" height={12} borderRadius={4} />
        <SkeletonLoader width="90%" height={12} borderRadius={4} />
        <SkeletonLoader width="75%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export default function ClaimDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: claim, isLoading } = useQuery({
    queryKey: ['claims', id],
    queryFn: () => claimsApi.get(id ?? ''),
    enabled: !!id,
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

      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 18,
          maxWidth: 720,
          width: '100%',
          alignSelf: 'center',
          paddingBottom: 40,
        }}
      >
        {isLoading || !claim ? (
          <DetailSkeleton />
        ) : (
          <>
            <Animated.View entering={enter}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Eyebrow>CLAIM · #{claim.id.toUpperCase()}</Eyebrow>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {INCIDENT_ICON[claim.incidentType]}
                    <Text
                      style={{
                        ...textStyles['editorial-title'],
                        color: colors.textPrimary,
                        flex: 1,
                      }}
                    >
                      {INCIDENT_LABEL[claim.incidentType]}
                    </Text>
                  </View>
                </View>
                <Pill
                  label={STATUS_TONE[claim.status].label}
                  tone={STATUS_TONE[claim.status].tone}
                />
              </View>
            </Animated.View>

            <Card>
              <Text
                style={{ ...textStyles.label, color: colors.textSecondary, marginBottom: 8 }}
              >
                Claim details
              </Text>
              <DetailRow label="Provider" value={claim.providerName} />
              <DetailRow
                label="Filed"
                value={format(new Date(claim.createdAt), "MMM d, yyyy 'at' h:mm a")}
              />
              <DetailRow
                label="Resolution requested"
                value={RESOLUTION_LABEL[claim.requestedResolution]}
              />
              {claim.requestedAmountCents !== null ? (
                <DetailRow
                  label="Amount requested"
                  value={`$${(claim.requestedAmountCents / 100).toFixed(2)}`}
                  numeric
                />
              ) : null}
              {claim.resolvedAt ? (
                <DetailRow
                  label="Resolved"
                  value={format(new Date(claim.resolvedAt), "MMM d, yyyy 'at' h:mm a")}
                />
              ) : null}
            </Card>

            <Card>
              <Text
                style={{ ...textStyles.label, color: colors.textSecondary, marginBottom: 8 }}
              >
                Description
              </Text>
              <Text
                style={{
                  ...textStyles['body-md'],
                  color: colors.textPrimary,
                  lineHeight: 22,
                }}
              >
                {claim.description}
              </Text>
            </Card>

            {claim.photoUrls.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ ...textStyles.label, color: colors.textTertiary }}>
                  Attached photos
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {claim.photoUrls.map((url, i) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={{ width: 140, height: 140, borderRadius: 12 }}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {claim.resolutionNotes ? (
              <Card tone="tinted" tintColor={colors.successLight}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <CheckCircle size={18} color={colors.success} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ ...textStyles['title-md'], color: colors.success }}>
                      Resolution notes
                    </Text>
                    <Text
                      style={{
                        ...textStyles['body-sm'],
                        color: colors.textSecondary,
                        lineHeight: 20,
                      }}
                    >
                      {claim.resolutionNotes}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            <Card tone="tinted" tintColor={colors.primary[50]}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Shield size={18} color={colors.primary[600]} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ ...textStyles['title-md'], color: colors.primary[700] }}>
                    What happens next
                  </Text>
                  {NEXT_STEPS[claim.status].map((line, i) => (
                    <Text
                      key={i}
                      style={{ ...textStyles['body-sm'], color: colors.textSecondary }}
                    >
                      {i + 1}. {line}
                    </Text>
                  ))}
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

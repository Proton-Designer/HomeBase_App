import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ShieldX,
  Frown,
  Clock,
  HeartPulse,
  MoreHorizontal,
  Shield,
} from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { useClaimStore } from '../../../stores/claimStore';
import { colors, textStyles } from '../../../tokens';
import type { IncidentType, ResolutionKind } from '../../../lib/types';

const INCIDENT_LABEL: Record<IncidentType, string> = {
  property_damage: 'Property damage',
  theft: 'Theft',
  poor_quality: 'Poor quality',
  no_show: 'No-show',
  injury: 'Injury',
  other: 'Other',
};

const INCIDENT_ICON: Record<IncidentType, React.ReactNode> = {
  property_damage: <AlertTriangle size={16} color={colors.error} />,
  theft: <ShieldX size={16} color={colors.error} />,
  poor_quality: <Frown size={16} color={colors.warning} />,
  no_show: <Clock size={16} color={colors.warning} />,
  injury: <HeartPulse size={16} color={colors.error} />,
  other: <MoreHorizontal size={16} color={colors.textSecondary} />,
};

const RESOLUTION_LABEL: Record<ResolutionKind, string> = {
  refund: 'Full refund',
  redo: 'Redo the job',
  partial_credit: 'Partial credit',
  none: 'Flag only — no remedy requested',
};

function ReviewRow({ label, value }: { label: string; value: string }) {
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

export default function ClaimReviewStep() {
  const router = useRouter();
  const draft = useClaimStore((s) => s.draft);
  const submitDraft = useClaimStore((s) => s.submitDraft);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await new Promise((res) => setTimeout(res, 700));
      const id = await submitDraft();
      router.replace({
        pathname: '/(homeowner)/claims/submitted',
        params: { id },
      });
    } catch {
      Alert.alert('Could not submit claim', 'Something went wrong saving your claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const incidentType = draft.incidentType ?? 'other';
  const resolution = draft.requestedResolution ?? 'none';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>Step 5 of 5</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            Review your claim
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Double-check the details before submitting. You can still go back to make changes.
          </Text>
        </View>

        <Card>
          <View style={{ gap: 0 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {INCIDENT_ICON[incidentType]}
              <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                {INCIDENT_LABEL[incidentType]}
              </Text>
            </View>

            <ReviewRow label="Resolution requested" value={RESOLUTION_LABEL[resolution]} />

            {draft.requestedAmountCents !== null ? (
              <ReviewRow
                label="Amount requested"
                value={`$${(draft.requestedAmountCents / 100).toFixed(2)}`}
              />
            ) : null}

            <ReviewRow
              label="Photos attached"
              value={
                draft.photoUrls.length === 0
                  ? 'None'
                  : `${draft.photoUrls.length} photo${draft.photoUrls.length === 1 ? '' : 's'}`
              }
            />
          </View>
        </Card>

        <Card>
          <Text style={{ ...textStyles.label, color: colors.textSecondary, marginBottom: 8 }}>
            Description
          </Text>
          <Text
            style={{ ...textStyles['body-md'], color: colors.textPrimary, lineHeight: 22 }}
          >
            {draft.description}
          </Text>
        </Card>

        {draft.photoLocalUris.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...textStyles.label, color: colors.textTertiary }}>
              Attached photos
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {draft.photoLocalUris.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: 80, height: 80, borderRadius: 10 }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <Card tone="tinted" tintColor={colors.primary[50]}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Shield size={18} color={colors.primary[600]} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...textStyles['title-md'], color: colors.primary[700] }}>
                What happens next
              </Text>
              {[
                "The provider's payout is held in escrow until this claim is resolved.",
                'A MyHomebase team member will review your claim within 24 hours.',
                'You and the provider will be notified of any updates.',
                'We may contact you for additional information.',
              ].map((line, i) => (
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
          label={submitting ? 'Submitting…' : 'Submit claim'}
          size="lg"
          fullWidth
          loading={submitting}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}

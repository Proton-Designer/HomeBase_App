import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Pill } from '../../../components/ui/Pill';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { usePostingStore } from '../../../stores/postingStore';
import { useAuthStore } from '../../../stores/authStore';
import * as postingsApi from '../../../lib/api/postings';
import { SERVICE_LABELS } from '../../../lib/constants';
import { colors, textStyles } from '../../../tokens';

export default function PostJobReviewStep() {
  const router = useRouter();
  const draft = usePostingStore((s) => s.draft);
  const resetDraft = usePostingStore((s) => s.resetDraft);
  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!draft.serviceType) return;
    setSubmitting(true);
    try {
      const { id } = await postingsApi.create({
        serviceType: draft.serviceType,
        headline: draft.headline,
        description: draft.description,
        photos: draft.photos,
      });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['postings', 'all', userId] });
      }
      resetDraft();
      router.replace({
        pathname: '/(homeowner)/post-job/submitted',
        params: { id },
      });
    } catch {
      setSubmitting(false);
      Alert.alert('Could not post your job', 'Please try again in a moment.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>Almost done</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            Review your post
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            We&apos;ll route this to vetted local pros and notify you the moment one responds.
          </Text>
        </View>

        <Card>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pill
                label={draft.serviceType ? SERVICE_LABELS[draft.serviceType] : 'No service'}
                tone="primary"
              />
              <Pill label={`${draft.photos.length} photo${draft.photos.length === 1 ? '' : 's'}`} />
            </View>
            <Text style={{ ...textStyles['display-md'], color: colors.textPrimary }}>
              {draft.headline}
            </Text>
            <Text
              style={{
                ...textStyles['body-md'],
                color: colors.textSecondary,
                lineHeight: 22,
              }}
            >
              {draft.description}
            </Text>
          </View>
        </Card>

        {draft.photos.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...textStyles.label, color: colors.textTertiary }}>
              Attached photos
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {draft.photos.map((url, i) => (
                <Image
                  key={i}
                  source={{ uri: url }}
                  style={{ width: 80, height: 80, borderRadius: 10 }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <Card tone="tinted" tintColor={colors.primary[50]}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            What happens next
          </Text>
          <View style={{ marginTop: 8, gap: 4 }}>
            {[
              'Your post is routed to vetted pros within 25 miles.',
              'Pros respond with a quote and earliest availability.',
              'Pick the best quote — we hold payment in escrow until check-in.',
              'Provider arrives, completes the job, you submit a 15-second check-in.',
            ].map((line, i) => (
              <Text
                key={i}
                style={{ ...textStyles['body-sm'], color: colors.textSecondary }}
              >
                {i + 1}. {line}
              </Text>
            ))}
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
          label={submitting ? 'Posting…' : 'Post job'}
          size="lg"
          fullWidth
          loading={submitting}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeBack } from '../../../lib/useSafeBack';
import { useAuthStore } from '../../../stores/authStore';
import * as postingsApi from '../../../lib/api/postings';
import { Button } from '../../../components/ui/Button';
import { SERVICE_LABELS as SERVICE_LABEL } from '../../../lib/constants';
import { colors, fonts, textStyles } from '../../../tokens';
import type { ServiceType } from '../../../lib/types';

export default function ProviderPostingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useSafeBack();
  const queryClient = useQueryClient();
  const providerId = useAuthStore((s) => s.providerId);

  const { data: posting } = useQuery({
    queryKey: ['posting', id],
    queryFn: () => postingsApi.get(id),
    enabled: !!id,
  });
  const { data: myQuotes = [] } = useQuery({
    queryKey: ['provider', 'my-quotes', providerId],
    queryFn: () => postingsApi.listMyQuotes(providerId ?? ''),
    enabled: !!providerId,
  });
  const existing = myQuotes.find((q) => q.postingId === id);

  const [amount, setAmount] = useState(existing?.amountCents ? String(existing.amountCents / 100) : '');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!providerId || !id || submitting) return;
    setSubmitting(true);
    try {
      const cents = amount.trim() ? Math.round(parseFloat(amount) * 100) : null;
      await postingsApi.submitQuote({ postingId: id, providerId, amountCents: cents, message: message.trim() || null });
      queryClient.invalidateQueries({ queryKey: ['provider', 'my-quotes', providerId] });
      queryClient.invalidateQueries({ queryKey: ['provider', 'open-postings', providerId] });
      Alert.alert('Quote sent', 'The homeowner can now review your quote.');
      goBack();
    } catch {
      Alert.alert('Could not send quote', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Job request</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        {posting ? (
          <>
            <View style={{ gap: 6 }}>
              <Text style={{ ...textStyles.label, color: colors.primary[600] }}>
                {SERVICE_LABEL[posting.serviceType as ServiceType] ?? posting.serviceType}
              </Text>
              <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>{posting.headline}</Text>
              <Text style={{ ...textStyles['body-md'], color: colors.textSecondary }}>{posting.description}</Text>
            </View>

            {posting.photos.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {posting.photos.map((uri, i) => (
                  <Image
                    key={`${uri}-${i}`}
                    source={{ uri }}
                    style={{ width: '31%', aspectRatio: 1, borderRadius: 10 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ))}
              </View>
            ) : null}

            <View style={{ height: 1, backgroundColor: colors.divider }} />

            <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
              {existing ? 'Update your quote' : 'Send a quote'}
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ ...textStyles.label, color: colors.textSecondary }}>Your price (optional)</Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ ...textStyles['title-md'], color: colors.textSecondary }}>$</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  style={{ flex: 1, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary }}
                />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ ...textStyles.label, color: colors.textSecondary }}>Message to the homeowner</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                placeholder="Introduce yourself and how you'd approach this job…"
                placeholderTextColor={colors.textTertiary}
                style={{
                  minHeight: 100,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 14,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.textPrimary,
                  textAlignVertical: 'top',
                  backgroundColor: colors.surface,
                }}
              />
            </View>

            <Button
              label={existing ? 'Update quote' : 'Send quote'}
              size="lg"
              fullWidth
              loading={submitting}
              onPress={onSubmit}
            />
          </>
        ) : (
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary }}>Loading…</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FileUp, Check, X, Plus } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../stores/authStore';
import { invokeFn } from '../../../lib/api/functions';
import { pickImageFromLibrary, uploadAsset } from '../../../lib/api/storage';
import { colors, textStyles } from '../../../tokens';

interface InsuranceDoc {
  localUri: string;
  path: string | null;
  uploading: boolean;
}

export default function VerificationTier2Step() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const [docs, setDocs] = useState<InsuranceDoc[]>([]);
  const [expiry, setExpiry] = useState('');
  const [coverage, setCoverage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const anyUploading = docs.some((d) => d.uploading);
  const hasUploadedDocs = docs.some((d) => !!d.path);

  const handleAddDoc = async () => {
    const asset = await pickImageFromLibrary({ allowsEditing: false });
    if (!asset) {
      Alert.alert(
        'Photo access required',
        'Please enable photo access in Settings to upload your insurance document.',
      );
      return;
    }
    const idx = docs.length;
    const storagePath = `${userId}/insurance-${Date.now()}.jpg`;
    const newDoc: InsuranceDoc = { localUri: asset.uri, path: null, uploading: true };
    setDocs((d) => [...d, newDoc]);
    try {
      const result = await uploadAsset('verification-docs', storagePath, asset);
      setDocs((d) =>
        d.map((item, i) =>
          i === idx ? { ...item, path: result.path, uploading: false } : item,
        ),
      );
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload document.');
      setDocs((d) => d.filter((_, i) => i !== idx));
    }
  };

  const handleRemoveDoc = (i: number) => {
    setDocs((d) => d.filter((_, idx) => idx !== i));
  };

  const handleContinue = async () => {
    if (anyUploading) return;
    setSubmitting(true);
    try {
      const paths = docs.map((d) => d.path).filter((p): p is string => !!p);
      if (paths.length > 0) {
        await invokeFn('verification-tier2-submit', {
          userId,
          insurancePaths: paths,
          policyExpiry: expiry || null,
          coverageAmountCents: coverage ? parseInt(coverage, 10) * 100 : null,
        });
      }
      router.push('/(provider)/onboarding/banking');
    } catch (err: unknown) {
      Alert.alert('Submission failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View>
          <Text
            style={{
              ...textStyles['editorial-title'],
              fontSize: 28,
              lineHeight: 34,
              color: colors.textPrimary,
            }}
          >
            Verification — Tier 2
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Tier 2 means insured. It earns you a gold shield badge and 3x more bookings.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            Certificate of Insurance
          </Text>

          {docs.map((doc, i) => (
            <View
              key={i}
              style={{
                padding: 14,
                backgroundColor: doc.path ? colors.successLight : colors.surface,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: doc.path ? colors.success : colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {doc.uploading ? (
                <ActivityIndicator color={colors.primary[600]} />
              ) : (
                <Check size={18} color={colors.success} />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...textStyles['body-md'],
                    color: doc.path ? colors.success : colors.textPrimary,
                    fontFamily: 'Inter_500Medium',
                  }}
                >
                  {doc.uploading
                    ? 'Uploading…'
                    : `Document ${i + 1} · uploaded`}
                </Text>
                {doc.path ? (
                  <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginTop: 2 }}>
                    Tap × to remove
                  </Text>
                ) : null}
              </View>
              {!doc.uploading ? (
                <Pressable onPress={() => handleRemoveDoc(i)} hitSlop={8}>
                  <X size={18} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          ))}

          <Pressable
            onPress={handleAddDoc}
            disabled={anyUploading}
          >
            <View
              style={{
                padding: 16,
                backgroundColor: colors.surface,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderStyle: 'dashed',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                opacity: anyUploading ? 0.5 : 1,
              }}
            >
              {hasUploadedDocs ? (
                <Plus size={22} color={colors.textSecondary} />
              ) : (
                <FileUp size={22} color={colors.textSecondary} />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...textStyles['title-md'],
                    color: colors.textPrimary,
                  }}
                >
                  {hasUploadedDocs
                    ? 'Add another document'
                    : 'Upload Certificate of Insurance'}
                </Text>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  PDF or image
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Input
          label="Policy expiry"
          placeholder="MM/DD/YYYY"
          value={expiry}
          onChangeText={setExpiry}
        />
        <Input
          label="Coverage amount (USD)"
          placeholder="300000"
          keyboardType="numeric"
          value={coverage}
          onChangeText={setCoverage}
          helperText="Minimum $300,000 general liability"
        />

        <Card tone="tinted" tintColor={colors.infoLight}>
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.info,
              fontFamily: 'Inter_500Medium',
            }}
          >
            Manual review: our team verifies insurance certificates within 1 business day.
          </Text>
        </Card>
      </ScrollView>
      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 8,
        }}
      >
        <Button
          label="Continue"
          fullWidth
          disabled={anyUploading}
          loading={submitting}
          onPress={handleContinue}
        />
        <Pressable
          onPress={() => router.push('/(provider)/onboarding/banking')}
          hitSlop={6}
          disabled={submitting}
        >
          <Text
            style={{
              ...textStyles['body-sm'],
              fontFamily: 'Inter_500Medium',
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            Skip — finish Tier 1 only (no insured badge)
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

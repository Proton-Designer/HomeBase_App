import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, Camera, Check, RefreshCw } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { pickImageFromLibrary, uploadAsset } from '../../../lib/api/storage';
import { colors, textStyles } from '../../../tokens';

interface DocState {
  localUri: string | null;
  path: string | null;
  uploading: boolean;
}

const emptyDoc: DocState = { localUri: null, path: null, uploading: false };

export default function VerificationTier1Step() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const [front, setFront] = useState<DocState>(emptyDoc);
  const [back, setBack] = useState<DocState>(emptyDoc);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const anyUploading = front.uploading || back.uploading;
  const canSubmit = !!front.path && !!back.path && consent && !anyUploading;

  const handlePickDoc = async (side: 'front' | 'back') => {
    const setter = side === 'front' ? setFront : setBack;
    const storagePath = side === 'front'
      ? `${userId}/id-front.jpg`
      : `${userId}/id-back.jpg`;

    const asset = await pickImageFromLibrary({ allowsEditing: false });
    if (!asset) {
      Alert.alert(
        'Photo access required',
        'Please enable photo access in Settings to upload your ID.',
      );
      return;
    }
    setter({ localUri: asset.uri, path: null, uploading: true });
    try {
      const result = await uploadAsset('verification-docs', storagePath, asset);
      setter({ localUri: asset.uri, path: result.path, uploading: false });
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload document.');
      setter(emptyDoc);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('verification-tier1-submit', {
        body: {
          userId,
          idFrontPath: front.path,
          idBackPath: back.path,
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: unknown) {
      Alert.alert('Submission failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.successLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldCheck size={44} color={colors.success} />
        </View>
        <Text
          style={{
            ...textStyles['editorial-title'],
            fontSize: 26,
            lineHeight: 32,
            color: colors.textPrimary,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          Background check started
        </Text>
        <Text
          style={{
            ...textStyles['body-md'],
            color: colors.textSecondary,
            textAlign: 'center',
            paddingHorizontal: 16,
          }}
        >
          We&apos;ll email you within 3–5 business days with your Tier 1 verification status.
        </Text>
        <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
          <Button
            label="Continue to Tier 2"
            fullWidth
            onPress={() => router.push('/(provider)/onboarding/verification-tier2')}
          />
        </View>
      </View>
    );
  }

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
            Verification — Tier 1
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Verified providers earn more trust and unlock higher-value jobs. Upload your ID to start the background check — takes 3–5 business days.
          </Text>
        </View>

        <Card variant="outlined">
          <Text
            style={{
              ...textStyles['title-md'],
              color: colors.textPrimary,
              marginBottom: 8,
            }}
          >
            What we check
          </Text>
          {[
            'National criminal record',
            'Sex offender registry',
            'Identity verification',
          ].map((item) => (
            <View
              key={item}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
            >
              <Check size={14} color={colors.success} />
              <Text
                style={{
                  ...textStyles['body-sm'],
                  color: colors.textPrimary,
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </Card>

        <View style={{ gap: 10 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            Government-issued ID
          </Text>
          <UploadCard
            label="Front of ID"
            state={front}
            onPress={() => handlePickDoc('front')}
          />
          <UploadCard
            label="Back of ID"
            state={back}
            onPress={() => handlePickDoc('back')}
          />
        </View>

        <Pressable
          onPress={() => setConsent((c) => !c)}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: consent ? colors.primary[600] : colors.surface,
              borderWidth: 1.5,
              borderColor: consent ? colors.primary[600] : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            {consent ? <Check size={14} color={colors.textInverse} /> : null}
          </View>
          <Text
            style={{
              flex: 1,
              ...textStyles['body-sm'],
              color: colors.textPrimary,
            }}
          >
            I consent to a background check conducted by MyHomebase&apos;s verification partner (Checkr).
          </Text>
        </Pressable>
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
          label="Submit for background check"
          fullWidth
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleSubmit}
        />
      </View>
    </View>
  );
}

function UploadCard({
  label,
  state,
  onPress,
}: {
  label: string;
  state: DocState;
  onPress: () => void;
}) {
  const done = !!state.path;
  const uploading = state.uploading;

  return (
    <Pressable onPress={onPress} disabled={uploading}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          backgroundColor: done ? colors.successLight : colors.surface,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: done ? colors.success : colors.border,
          borderStyle: done ? 'solid' : 'dashed',
          gap: 12,
        }}
      >
        {uploading ? (
          <ActivityIndicator color={colors.primary[600]} />
        ) : done ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={18} color={colors.textInverse} />
          </View>
        ) : (
          <Camera size={22} color={colors.textSecondary} />
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...textStyles['body-md'],
              color: done ? colors.success : colors.textPrimary,
              fontFamily: 'Inter_500Medium',
            }}
          >
            {uploading
              ? `Uploading ${label.toLowerCase()}…`
              : done
              ? `${label} · uploaded`
              : `Tap to capture ${label.toLowerCase()}`}
          </Text>
          {done ? (
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginTop: 2 }}>
              Tap to retake
            </Text>
          ) : null}
        </View>
        {done && !uploading ? (
          <RefreshCw size={16} color={colors.textTertiary} />
        ) : null}
      </View>
    </Pressable>
  );
}

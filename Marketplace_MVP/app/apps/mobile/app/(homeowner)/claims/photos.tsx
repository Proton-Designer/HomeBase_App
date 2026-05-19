import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Plus, X } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { useClaimStore } from '../../../stores/claimStore';
import { pickImageFromLibrary, uploadAsset } from '../../../lib/api/storage';
import { colors, textStyles } from '../../../tokens';

const MAX_PHOTOS = 6;

interface PhotoSlot {
  localUri: string;
  path: string | null;
  uploading: boolean;
}

export default function ClaimPhotosStep() {
  const router = useRouter();
  const addPhoto = useClaimStore((s) => s.addPhoto);
  const removePhoto = useClaimStore((s) => s.removePhoto);

  const claimTempId = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ).current;

  const [slots, setSlots] = useState<PhotoSlot[]>([]);

  const anyUploading = slots.some((s) => s.uploading);
  const hasPhotos = slots.length > 0;
  const recommended = slots.filter((s) => !!s.path).length >= 2;

  const handleAdd = async () => {
    if (slots.length >= MAX_PHOTOS) return;
    const asset = await pickImageFromLibrary({ allowsEditing: true });
    if (!asset) {
      Alert.alert(
        'Photo access required',
        'Please enable photo access in Settings to attach claim photos.',
      );
      return;
    }
    const idx = slots.length;
    const storagePath = `${claimTempId}/${Date.now()}-${idx}.jpg`;
    const newSlot: PhotoSlot = { localUri: asset.uri, path: null, uploading: true };
    setSlots((prev) => [...prev, newSlot]);
    try {
      const result = await uploadAsset('claim-photos', storagePath, asset);
      setSlots((prev) =>
        prev.map((s, i) =>
          i === idx ? { ...s, path: result.path, uploading: false } : s,
        ),
      );
      addPhoto(result.path);
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload photo.');
      setSlots((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleRemove = (i: number) => {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
    removePhoto(i);
  };

  const displaySlots = Array.from({ length: MAX_PHOTOS }, (_, i) => slots[i] ?? null);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>Step 3 of 5 · Optional</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            Attach photos
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Up to 6 photos. Claims with 2 or more photos are resolved{' '}
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textPrimary }}>
              40% faster
            </Text>
            . Tap a slot to attach a photo from your library.
          </Text>
        </View>

        {!recommended && hasPhotos ? (
          <View
            style={{
              backgroundColor: colors.warningLight,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ ...textStyles['body-sm'], color: colors.warning }}>
              We recommend at least 2 photos to support your claim.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {displaySlots.map((slot, i) => (
            <View key={i} style={{ width: '30%', aspectRatio: 1 }}>
              {slot ? (
                <View style={{ flex: 1 }}>
                  <Image
                    source={{ uri: slot.localUri }}
                    style={{ width: '100%', height: '100%', borderRadius: 12 }}
                  />
                  {slot.uploading ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: 12,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ActivityIndicator color={colors.textInverse} />
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleRemove(i)}
                      hitSlop={6}
                      style={[
                        {
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: 'rgba(0,0,0,0.55)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                      ]}
                    >
                      <X size={16} color={colors.textInverse} />
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable
                  onPress={handleAdd}
                  disabled={slots.length >= MAX_PHOTOS || anyUploading}
                  style={[
                    {
                      flex: 1,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: colors.border,
                      borderStyle: 'dashed',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: colors.surface,
                      opacity: slots.length >= MAX_PHOTOS || anyUploading ? 0.4 : 1,
                    },
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                  ]}
                >
                  {i === slots.length ? (
                    <>
                      <Plus size={20} color={colors.textSecondary} />
                      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                        Add photo
                      </Text>
                    </>
                  ) : (
                    <Camera size={18} color={colors.textTertiary} />
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </View>
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
          label={!hasPhotos ? 'Skip & continue' : 'Continue'}
          size="lg"
          fullWidth
          disabled={anyUploading}
          onPress={() => router.push('/(homeowner)/claims/resolution')}
        />
      </View>
    </View>
  );
}

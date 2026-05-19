import React from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Plus, X } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { usePostingStore } from '../../../stores/postingStore';
import { serviceTints, colors, textStyles } from '../../../tokens';
import type { ServiceType } from '../../../lib/types';

// A small per-vertical pool of plausible photos that the mock "upload" pulls from.
// Avoids reusing the same image twice in a single posting.
const STOCK_PHOTOS: Record<ServiceType, string[]> = {
  lawn: [
    'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600',
    'https://images.unsplash.com/photo-1690068023694-053da714f95f?w=600',
  ],
  cleaning: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600',
    'https://images.unsplash.com/photo-1647381518264-97ff1835026f?w=600',
  ],
  pool: [
    'https://images.unsplash.com/photo-1564166489058-31f37cccaaf4?w=600',
    'https://images.unsplash.com/photo-1726644082642-bdec54d81526?w=600',
    'https://images.unsplash.com/photo-1733088234555-1a3a0a4e80e3?w=600',
    'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?w=600',
  ],
  pest: [
    'https://images.unsplash.com/photo-1581578017093-cd30fce4eeb7?w=600',
    'https://images.unsplash.com/photo-1638820842410-dbe10a8a61f0?w=600',
    'https://images.unsplash.com/photo-1572731561221-96d988d74dc9?w=600',
    'https://images.unsplash.com/photo-1591735115730-4bf3a351cfe8?w=600',
  ],
  pressure: [
    'https://images.unsplash.com/photo-1581883579507-019c44b711cb?w=600',
    'https://images.unsplash.com/photo-1593260654732-df52bea15d63?w=600',
    'https://images.unsplash.com/photo-1607113364993-4f639eb54ebb?w=600',
    'https://images.unsplash.com/photo-1592365559101-19adfefdf294?w=600',
  ],
  window: [
    'https://images.unsplash.com/photo-1761689502577-0013be84f1bf?w=600',
    'https://images.unsplash.com/photo-1773104136612-c9fb27115d23?w=600',
    'https://images.unsplash.com/photo-1763026227930-ec2c91d4e7f2?w=600',
    'https://images.unsplash.com/photo-1769788161278-8dc624a2d537?w=600',
  ],
  gutter: [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    'https://images.unsplash.com/photo-1634853982486-c06f0e17940f?w=600',
    'https://images.unsplash.com/photo-1665442348932-6e16d72fe163?w=600',
    'https://images.unsplash.com/photo-1601651545102-82b9d8a27ef0?w=600',
  ],
  detailing: [
    'https://images.unsplash.com/photo-1567808291548-fc3ee04dbcf0?w=600',
    'https://images.unsplash.com/photo-1605437241278-c1806d14a4d9?w=600',
    'https://images.unsplash.com/photo-1620584898989-d39f7f9ed1b7?w=600',
    'https://images.unsplash.com/photo-1632823469850-2f77dd9c7f93?w=600',
  ],
  tree: [
    'https://images.unsplash.com/photo-1519567770579-c2fc5436bcf9?w=600',
    'https://images.unsplash.com/photo-1588878309774-4b3f42a19a8f?w=600',
    'https://images.unsplash.com/photo-1657730391002-bf55ff069a80?w=600',
    'https://images.unsplash.com/photo-1692229079936-f992ff4d4ac6?w=600',
  ],
  solar: [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600',
    'https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=600',
    'https://images.unsplash.com/photo-1745187946672-2c1d8cf26a2b?w=600',
  ],
};

export default function PostJobPhotosStep() {
  const router = useRouter();
  const draft = usePostingStore((s) => s.draft);
  const addPhoto = usePostingStore((s) => s.addPhoto);
  const removePhoto = usePostingStore((s) => s.removePhoto);

  const onAdd = () => {
    if (!draft.serviceType) return;
    if (draft.photos.length >= 4) return;
    const pool = STOCK_PHOTOS[draft.serviceType] ?? [];
    const next = pool.find((p) => !draft.photos.includes(p)) ?? pool[draft.photos.length % pool.length];
    if (next) addPhoto(next);
  };

  const slots = Array.from({ length: 4 }, (_, i) => draft.photos[i] ?? null);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>Optional</Eyebrow>
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
            Up to 4 photos. Posts with photos get 3× more accurate quotes. Tap a slot to add a
            mock photo for the demo.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {slots.map((url, i) => (
            <View key={i} style={{ width: '47%', aspectRatio: 1 }}>
              {url ? (
                <View style={{ flex: 1 }}>
                  <Image
                    source={{ uri: url }}
                    style={{ width: '100%', height: '100%', borderRadius: 12 }}
                  />
                  <Pressable
                    onPress={() => removePhoto(i)}
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
                </View>
              ) : (
                <Pressable
                  onPress={onAdd}
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
                    },
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                  ]}
                >
                  {i === draft.photos.length ? (
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
          label={draft.photos.length === 0 ? 'Skip & continue' : 'Continue'}
          size="lg"
          fullWidth
          onPress={() => router.push('/(homeowner)/post-job/review')}
        />
      </View>
    </View>
  );
}

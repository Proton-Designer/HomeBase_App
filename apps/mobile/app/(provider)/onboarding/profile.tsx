import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Plus, X, Check } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { useAuthStore } from '../../../stores/authStore';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';
import { supabase } from '../../../lib/supabase';
import { pickImageFromLibrary, uploadAsset } from '../../../lib/api/storage';
import { colors, textStyles, numericTabular } from '../../../tokens';

const MAX_BIO = 300;

interface PortfolioItem {
  uri: string;
  uploading: boolean;
  publicUrl: string | null;
}

export default function ProviderProfileStep() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const userId = user?.id ?? '';

  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bio, setBio] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // This screen doubles as "Edit profile" (the provider profile tab routes here).
  // Without hydrating the existing providers row first, the form renders blank and
  // onFinish's unconditional update would wipe the saved bio/prices/avatar/portfolio.
  // Pre-fill from the DB so Finish writes back real values; a first-run provider with
  // no saved data simply stays blank.
  useEffect(() => {
    if (!userId || hydrated) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('providers')
        .select('avatar_url, bio, price_range_min_cents, price_range_max_cents, portfolio_photos')
        .eq('owner_user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        if (data.avatar_url) setAvatar(data.avatar_url);
        if (data.bio) setBio(data.bio);
        if (data.price_range_min_cents)
          setPriceMin(String(Math.round(data.price_range_min_cents / 100)));
        if (data.price_range_max_cents)
          setPriceMax(String(Math.round(data.price_range_max_cents / 100)));
        if (Array.isArray(data.portfolio_photos) && data.portfolio_photos.length > 0) {
          setPortfolio(
            (data.portfolio_photos as string[]).map((url) => ({
              uri: url,
              uploading: false,
              publicUrl: url,
            })),
          );
        }
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, hydrated]);

  const anyUploading = avatarUploading || portfolio.some((p) => p.uploading);

  const handleAvatarPress = async () => {
    setAvatarUploading(true);
    try {
      const asset = await pickImageFromLibrary({ aspect: [1, 1], allowsEditing: true });
      if (!asset) {
        if (!avatarUploading) {
          Alert.alert(
            'Photo access required',
            'Please enable photo access in Settings to add a profile photo.',
          );
        }
        return;
      }
      setAvatar(asset.uri);
      const result = await uploadAsset('avatars', `${userId}/avatar.jpg`, asset);
      setAvatar(result.publicUrl ?? asset.uri);
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload photo.');
      setAvatar(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAddPortfolio = async () => {
    if (portfolio.length >= 6) return;
    const asset = await pickImageFromLibrary({ allowsEditing: true });
    if (!asset) {
      Alert.alert(
        'Photo access required',
        'Please enable photo access in Settings to add portfolio photos.',
      );
      return;
    }
    const idx = portfolio.length;
    const tempItem: PortfolioItem = { uri: asset.uri, uploading: true, publicUrl: null };
    setPortfolio((p) => [...p, tempItem]);
    try {
      const result = await uploadAsset(
        'portfolio-photos',
        `${userId}/${Date.now()}-${idx}.jpg`,
        asset,
      );
      setPortfolio((p) =>
        p.map((item, i) =>
          i === idx ? { ...item, uploading: false, publicUrl: result.publicUrl } : item,
        ),
      );
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload photo.');
      setPortfolio((p) => p.filter((_, i) => i !== idx));
    }
  };

  const handleRemovePortfolio = (i: number) => {
    setPortfolio((p) => p.filter((_, idx) => idx !== i));
  };

  const onFinish = async () => {
    setSubmitting(true);
    try {
      if (!userId) throw new Error('Not authenticated');
      const portfolioUrls = portfolio
        .map((p) => p.publicUrl ?? p.uri)
        .filter(Boolean);

      const minDollars = parseFloat(priceMin);
      const maxDollars = parseFloat(priceMax);

      // Prices are collected in dollars/visit; the column stores cents.
      // `onboarding_completed_at` is the authoritative completion signal routing reads.
      const { data: updated, error: providerErr } = await supabase
        .from('providers')
        .update({
          avatar_url: avatar,
          bio,
          price_range_min_cents: Number.isFinite(minDollars) ? Math.round(minDollars * 100) : 0,
          price_range_max_cents: Number.isFinite(maxDollars) ? Math.round(maxDollars * 100) : 0,
          portfolio_photos: portfolioUrls,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('owner_user_id', userId)
        .select('id')
        .maybeSingle();
      if (providerErr) throw providerErr;
      if (!updated) throw new Error('Provider profile not found. Please restart onboarding.');

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ avatar_url: avatar })
        .eq('id', userId);
      if (profileErr) throw profileErr;

      setOnboardingComplete(true);
      useProviderOnboardingStore.getState().reset();
      router.replace('/(provider)/(tabs)/today');
    } catch (err: unknown) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Could not save profile.');
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
            Build your public profile
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Homeowners see this on every match.
          </Text>
        </View>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <Pressable onPress={handleAvatarPress} disabled={avatarUploading}>
            {avatarUploading ? (
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: colors.divider,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator color={colors.primary[600]} />
              </View>
            ) : avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 96, height: 96, borderRadius: 48 }} />
            ) : (
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: colors.divider,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                }}
              >
                <Camera size={28} color={colors.textSecondary} />
              </View>
            )}
          </Pressable>
          <Text
            style={{
              ...textStyles['body-sm'],
              fontFamily: 'Inter_500Medium',
              color: colors.textSecondary,
            }}
          >
            {avatar ? 'Tap to retake' : 'Tap to add a profile photo'}
          </Text>
        </View>

        <View>
          <Input
            label="Bio"
            placeholder="Tell homeowners about your experience, approach, what makes you stand out…"
            multiline
            value={bio}
            onChangeText={(t) => (t.length <= MAX_BIO ? setBio(t) : null)}
            helperText={`${bio.length}/${MAX_BIO}`}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Min price/visit"
              placeholder="45"
              keyboardType="numeric"
              value={priceMin}
              onChangeText={setPriceMin}
              leftIcon={
                <Text
                  style={{
                    ...textStyles['body-md'],
                    fontFamily: 'Inter_500Medium',
                    color: colors.textSecondary,
                  }}
                >
                  $
                </Text>
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Max price/visit"
              placeholder="95"
              keyboardType="numeric"
              value={priceMax}
              onChangeText={setPriceMax}
              leftIcon={
                <Text
                  style={{
                    ...textStyles['body-md'],
                    fontFamily: 'Inter_500Medium',
                    color: colors.textSecondary,
                  }}
                >
                  $
                </Text>
              }
            />
          </View>
        </View>

        <Card tone="tinted" tintColor={colors.primary[50]}>
          <Eyebrow tone="accent">Portfolio · 3x more bookings</Eyebrow>
          <Text
            style={{
              ...textStyles['title-md'],
              color: colors.textPrimary,
              marginTop: 6,
            }}
          >
            Portfolio photos (up to 6)
          </Text>
          <Text
            style={{
              ...textStyles['body-sm'],
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            Providers with portfolio photos receive 3x more bookings.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {portfolio.map((item, i) => (
              <View key={i} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: item.publicUrl ?? item.uri }}
                  style={{ width: 84, height: 84, borderRadius: 12 }}
                />
                {item.uploading ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: 84,
                      height: 84,
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
                    onPress={() => handleRemovePortfolio(i)}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.error,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    hitSlop={6}
                  >
                    <X size={12} color={colors.textInverse} />
                  </Pressable>
                )}
              </View>
            ))}
            {portfolio.length < 6 ? (
              <Pressable
                onPress={handleAddPortfolio}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: colors.primary[300],
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surface,
                }}
              >
                <Plus size={20} color={colors.primary[600]} />
              </Pressable>
            ) : null}
          </View>
          <Text
            style={{
              ...textStyles['body-sm'],
              ...numericTabular,
              color: colors.textTertiary,
              marginTop: 10,
            }}
          >
            {portfolio.length} / 6 added
          </Text>
        </Card>

        <Card variant="outlined" style={{ backgroundColor: colors.successLight, borderColor: colors.success }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Check size={18} color={colors.success} />
            <Text
              style={{
                ...textStyles['body-sm'],
                fontFamily: 'Inter_600SemiBold',
                fontWeight: '600',
                color: colors.success,
              }}
            >
              You&apos;re all set! Submit to start receiving jobs.
            </Text>
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
          label="Finish setup"
          fullWidth
          loading={submitting}
          disabled={anyUploading}
          onPress={onFinish}
        />
      </View>
    </View>
  );
}

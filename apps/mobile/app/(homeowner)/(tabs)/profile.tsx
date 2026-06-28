import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Repeat,
  ShieldAlert,
  ClipboardList,
  FileText,
  ChevronRight,
  Camera,
  Bell,
  UserCog,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Section } from '../../../components/ui/Section';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Chip } from '../../../components/ui/Chip';
import { useAuthStore } from '../../../stores/authStore';
import { format } from 'date-fns';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enterStaggered, usePress } from '../../../lib/motion';
import { colors, textStyles } from '../../../tokens';
import * as subscriptionsApi from '../../../lib/api/subscriptions';
import { supabase } from '../../../lib/supabase';
import { pickImageFromLibrary, uploadAsset } from '../../../lib/api/storage';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SettingRow {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress?: () => void;
  trailingLabel?: string;
}

interface SettingGroup {
  title: string;
  rows: SettingRow[];
}

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuthStore();
  const router = useRouter();
  const isDesktop = useBreakpoint() === 'desktop';
  const [activeGroup, setActiveGroup] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), 'MMMM yyyy')
    : null;

  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || 'Homeowner';
  const avatarInitial = (profile?.firstName?.trim()?.[0] ?? fullName[0] ?? 'H').toUpperCase();

  const onChangeAvatar = async () => {
    if (!user || uploadingAvatar) return;
    const asset = await pickImageFromLibrary({ aspect: [1, 1] });
    if (!asset) return;
    setUploadingAvatar(true);
    try {
      const subtype = asset.mimeType?.split('/')[1] ?? 'jpeg';
      const ext = subtype === 'jpeg' ? 'jpg' : subtype;
      // Path must start with the user's id — the `avatars` bucket RLS keys writes to it.
      const { publicUrl } = await uploadAsset('avatars', `${user.id}/${Date.now()}.${ext}`, asset);
      if (!publicUrl) throw new Error('No public URL returned');
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'We could not update your photo. Please try again.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const homeownerId = user?.id ?? null;
  const { data: subscriptions } = useQuery({
    queryKey: ['subscriptions', homeownerId],
    queryFn: () => subscriptionsApi.listForHomeowner(homeownerId ?? ''),
    enabled: !!homeownerId,
  });
  const activeSubCount = (subscriptions ?? []).filter((s) => s.status === 'active').length;

  const openExternal = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Cannot open link', 'Please try again later.');
    });
  };

  const groups: SettingGroup[] = [
    {
      title: 'Bookings & history',
      rows: [
        {
          label: 'Subscriptions',
          Icon: Repeat,
          onPress: () => router.push('/(homeowner)/subscriptions'),
          trailingLabel: activeSubCount > 0 ? `${activeSubCount} active` : undefined,
        },
        {
          label: 'Job history',
          Icon: ClipboardList,
          onPress: () => router.push('/(homeowner)/(tabs)/jobs'),
        },
      ],
    },
    {
      title: 'Trust & safety',
      rows: [
        {
          label: 'Damage claims',
          Icon: ShieldAlert,
          onPress: () => router.push('/(homeowner)/claims'),
        },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        {
          label: 'Account',
          Icon: UserCog,
          onPress: () => router.push('/(homeowner)/account-settings'),
        },
        {
          label: 'Notifications',
          Icon: Bell,
          onPress: () => router.push('/(homeowner)/notification-settings'),
        },
      ],
    },
    {
      title: 'Legal',
      rows: [
        {
          label: 'Terms of service',
          Icon: FileText,
          onPress: () => openExternal('https://homebase.app/terms'),
        },
        {
          label: 'Privacy policy',
          Icon: FileText,
          onPress: () => openExternal('https://homebase.app/privacy'),
        },
      ],
    },
  ];

  if (isDesktop) {
    const g = groups[activeGroup];
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ paddingHorizontal: 32, paddingTop: 24, paddingBottom: 12 }}>
          <Eyebrow>Profile</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 6,
            }}
          >
            Account & settings
          </Text>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', gap: 24, paddingHorizontal: 32, paddingBottom: 32 }}>
          <View style={{ width: 260, gap: 8 }}>
            <View
              style={{
                alignItems: 'center',
                gap: 10,
                marginBottom: 20,
                paddingVertical: 16,
                backgroundColor: colors.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <EditableAvatar
                size={72}
                avatarUrl={profile?.avatarUrl ?? null}
                initial={avatarInitial}
                uploading={uploadingAvatar}
                onPress={onChangeAvatar}
              />
              <View style={{ alignItems: 'center', gap: 2, paddingHorizontal: 12 }}>
                <Text
                  style={{ ...textStyles['title-md'], color: colors.textPrimary }}
                  numberOfLines={1}
                >
                  {fullName}
                </Text>
                <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                  {memberSince ? `Member since ${memberSince}` : 'MyHomebase member'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {groups.map((grp, i) => (
                <Chip
                  key={grp.title}
                  label={grp.title}
                  selected={i === activeGroup}
                  size="sm"
                  onPress={() => setActiveGroup(i)}
                />
              ))}
            </View>
            <Pressable
              onPress={signOut}
              style={[
                { paddingVertical: 12, paddingHorizontal: 12, marginTop: 12 },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: 'Inter_600SemiBold',
                  color: colors.error,
                }}
              >
                Sign out
              </Text>
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                ...textStyles['display-md'],
                color: colors.textPrimary,
                marginBottom: 16,
              }}
            >
              {g.title}
            </Text>
            <Card style={{ padding: 0 }}>
              {g.rows.map((r, i) => (
                <SettingPressable
                  key={r.label}
                  label={r.label}
                  Icon={r.Icon}
                  onPress={r.onPress}
                  trailingLabel={r.trailingLabel}
                  isLast={i === g.rows.length - 1}
                />
              ))}
            </Card>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Section tight>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <EditableAvatar
              size={92}
              avatarUrl={profile?.avatarUrl ?? null}
              initial={avatarInitial}
              uploading={uploadingAvatar}
              onPress={onChangeAvatar}
            />
            <Text style={{ ...textStyles['display-md'], color: colors.textPrimary, marginTop: 6 }}>
              {fullName}
            </Text>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              {memberSince ? `Member since ${memberSince}` : 'MyHomebase member'}
            </Text>
          </View>

          <View style={{ marginTop: 24, gap: 20 }}>
            {groups.map((g, gi) => (
              <Animated.View key={g.title} entering={enterStaggered(gi)}>
                <Text
                  style={{
                    ...textStyles.label,
                    color: colors.textTertiary,
                    marginBottom: 8,
                    paddingHorizontal: 4,
                  }}
                >
                  {g.title}
                </Text>
                <Card style={{ padding: 0 }}>
                  {g.rows.map((r, i) => (
                    <SettingPressable
                      key={r.label}
                      label={r.label}
                      Icon={r.Icon}
                      onPress={r.onPress}
                      trailingLabel={r.trailingLabel}
                      isLast={i === g.rows.length - 1}
                    />
                  ))}
                </Card>
              </Animated.View>
            ))}
          </View>

          <Pressable
            onPress={signOut}
            style={[
              { paddingVertical: 18, alignItems: 'center', marginTop: 12 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Text
              style={{
                ...textStyles['body-md'],
                fontFamily: 'Inter_600SemiBold',
                color: colors.error,
              }}
            >
              Sign out
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function EditableAvatar({
  size,
  avatarUrl,
  initial,
  uploading,
  onPress,
}: {
  size: number;
  avatarUrl: string | null;
  initial: string;
  uploading: boolean;
  onPress: () => void;
}) {
  const badge = Math.round(size * 0.3);
  return (
    <Pressable
      onPress={onPress}
      disabled={uploading}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      style={[
        { width: size, height: size },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary[600],
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {uploading ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size }}
            contentFit="cover"
          />
        ) : (
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: Math.round(size * 0.4),
              color: colors.textInverse,
            }}
          >
            {initial}
          </Text>
        )}
      </View>
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: badge,
          height: badge,
          borderRadius: badge / 2,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.background,
        }}
      >
        <Camera size={Math.round(badge * 0.52)} color={colors.primary[600]} />
      </View>
    </Pressable>
  );
}

function SettingPressable({
  label,
  Icon,
  onPress,
  trailingLabel,
  isLast,
}: {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress?: () => void;
  trailingLabel?: string;
  isLast: boolean;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={Platform.OS === 'web' ? undefined : onPressIn}
      onPressOut={Platform.OS === 'web' ? undefined : onPressOut}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 18,
          paddingVertical: 16,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.divider,
          gap: 12,
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        Platform.OS !== 'web' ? animatedStyle : null,
      ]}
    >
      <Icon size={18} color={colors.textSecondary} />
      <Text style={{ flex: 1, ...textStyles['body-md'], color: colors.textPrimary }}>
        {label}
      </Text>
      {trailingLabel ? (
        <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
          {trailingLabel}
        </Text>
      ) : null}
      <ChevronRight size={18} color={colors.textTertiary} />
    </AnimatedPressable>
  );
}

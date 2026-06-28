import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { ResponsiveContainer } from '../../../components/responsive/ResponsiveContainer';
import {
  ChevronRight,
  Briefcase,
  Users,
  Calendar,
  ShieldCheck,
  Bell,
  ExternalLink,
  CalendarClock,
  MessageSquare,
  Camera,
  ClipboardList,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Section } from '../../../components/ui/Section';
import { TrustSummary, VerificationBadge, QueryErrorState } from '../../../components/shared';
import { useAuthStore } from '../../../stores/authStore';
import type { TextStyle } from 'react-native';
import { colors, textStyles, numericTabular, fonts } from '../../../tokens';
import * as crewApi from '../../../lib/api/crew';
import * as calendarApi from '../../../lib/api/calendar';
import * as providersApi from '../../../lib/api/providers';
import { supabase } from '../../../lib/supabase';

function SectionGroupHeading({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.bodySemibold,
        fontSize: 11,
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: colors.primary[600],
        marginBottom: 8,
        paddingHorizontal: 4,
      } as TextStyle}
    >
      {children}
    </Text>
  );
}

function SettingsRow({
  label,
  trailingLabel,
  Icon,
  onPress,
  last = false,
}: {
  label: string;
  trailingLabel?: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
        gap: 12,
      }}
      accessibilityLabel={label}
    >
      <Icon size={17} color={colors.textSecondary} />
      <Text
        style={{
          flex: 1,
          ...textStyles['body-md'],
          fontFamily: fonts.bodyMedium,
          color: colors.textPrimary,
        }}
      >
        {label}
      </Text>
      {trailingLabel ? (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 13,
            fontStyle: 'italic',
            color: colors.textTertiary,
          } as TextStyle}
        >
          {trailingLabel}
        </Text>
      ) : null}
      <ChevronRight size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function YourNumbersCard({
  overallTrust,
  jobsThisMonth,
}: {
  overallTrust: number | null;
  jobsThisMonth: number;
}) {
  const stats = [
    { value: String(jobsThisMonth), label: jobsThisMonth === 1 ? 'job this month' : 'jobs this month' },
    { value: overallTrust != null ? overallTrust.toFixed(1) : '—', label: 'trust score' },
  ];
  return (
    <Card style={{ gap: 0, padding: 0 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 10,
            fontStyle: 'italic',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: colors.primary[600],
          } as TextStyle}
        >
          your numbers
        </Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {stats.map((s, i) => (
          <View
            key={s.label}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 4,
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: colors.divider,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                fontWeight: '700',
                lineHeight: 26,
                color: colors.textPrimary,
                ...numericTabular,
              } as TextStyle}
            >
              {s.value}
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 9,
                fontStyle: 'italic',
                color: colors.textTertiary,
                textAlign: 'center',
                marginTop: 3,
                lineHeight: 12,
              } as TextStyle}
            >
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function ProviderProfileScreen() {
  const router = useRouter();
  const { user, role, providerId, profile, signOut } = useAuthStore();
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && bp === 'desktop';

  // Fetch provider profile data (business name, trust scores, verification tier)
  const { data: providerData, isError: providerDataError, refetch: refetchProviderData } = useQuery({
    queryKey: ['provider', 'detail', providerId],
    queryFn: () => {
      if (!providerId) return null;
      return providersApi.detail(providerId);
    },
    enabled: !!providerId,
  });

  const { data: crewMembers } = useQuery({
    queryKey: ['crew', 'list', providerId],
    queryFn: () => crewApi.listForProvider(providerId ?? ''),
    enabled: !!providerId && role !== 'provider_tech',
  });
  const activeCount = crewMembers?.filter((m) => m.status === 'active').length ?? 0;

  const { data: calendarToken } = useQuery({
    queryKey: ['calendar', 'token', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('calendar_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!user?.id,
  });
  const calendarConnected = !!calendarToken;

  // Fetch jobs this month count
  const { data: jobsThisMonth = 0 } = useQuery<number>({
    queryKey: ['provider', 'jobs-this-month', providerId],
    queryFn: async () => {
      if (!providerId) return 0;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .gte('scheduled_at', startOfMonth.toISOString());
      return count ?? 0;
    },
    enabled: !!providerId,
  });

  const handleCalendarPress = async () => {
    try {
      const { authorizeUrl } = await calendarApi.connect();
      await Linking.openURL(authorizeUrl);
    } catch {
      Alert.alert('Error', 'Could not start calendar connection. Please try again.');
    }
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const handleAvatarUpload = async () => {
    if (uploadingAvatar || !providerId || !user?.id) return;
    const { pickImageFromLibrary, uploadAsset } = await import('../../../lib/api/storage');
    const asset = await pickImageFromLibrary({ aspect: [1, 1] });
    if (!asset) return;
    setUploadingAvatar(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { publicUrl } = await uploadAsset('avatars', path, asset);
      if (publicUrl) {
        await supabase.from('providers').update({ avatar_url: publicUrl }).eq('id', providerId);
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        await refetchProviderData();
      }
    } catch {
      Alert.alert('Upload failed', 'Could not update your photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const trustScores = providerData?.compositeScore
    ? {
        reliability: providerData.compositeScore.reliability,
        quality: providerData.compositeScore.quality,
        communication: providerData.compositeScore.communication,
        professionalism: providerData.compositeScore.professionalism,
      }
    : null;

  const overallTrust = trustScores
    ? trustScores.reliability * 0.35 +
      trustScores.quality * 0.35 +
      trustScores.communication * 0.2 +
      trustScores.professionalism * 0.1
    : null;

  const businessName = providerData?.businessName ?? providerData?.name ?? profile?.firstName ?? 'Your business';
  const displayInitial = businessName.charAt(0).toUpperCase();
  const verificationTier = providerData?.verificationTier ?? 0;

  // Derive verification row statuses from real tier
  const tier1Status = verificationTier >= 1 ? { label: 'Verified', color: colors.success } : { label: 'Not started', color: colors.textTertiary };
  const tier2Status = verificationTier >= 2 ? { label: 'Verified', color: colors.success } : verificationTier === 1 ? { label: 'Pending', color: colors.accent[600] } : { label: 'Not started', color: colors.textTertiary };

  const StatsCards = (
    <>
      <YourNumbersCard overallTrust={overallTrust} jobsThisMonth={jobsThisMonth} />
      <Card>
        <TrustSummary
          variant="detail"
          overall={providerData?.compositeScore.overall}
          checkInCount={providerData?.checkInCount ?? 0}
        />
      </Card>
    </>
  );

  const SettingsSections = (
    <View style={{ gap: 20 }}>
      {/* Team — owner-only */}
      {role !== 'provider_tech' && (
        <View>
          <SectionGroupHeading>team</SectionGroupHeading>
          <Card style={{ padding: 0 }}>
            <Pressable
              onPress={() => router.push('/(provider)/crew')}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 12,
                },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
              accessibilityLabel="Manage crew and team"
            >
              <Users size={17} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...textStyles['body-md'],
                    fontFamily: fonts.bodyMedium,
                    color: colors.textPrimary,
                  }}
                >
                  Crew & team
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: colors.textTertiary,
                    marginTop: 1,
                  } as TextStyle}
                >
                  {activeCount} active {activeCount === 1 ? 'member' : 'members'}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textTertiary} />
            </Pressable>
          </Card>
        </View>
      )}

      {/* Business */}
      <View>
        <SectionGroupHeading>business</SectionGroupHeading>
        <Card style={{ padding: 0 }}>
          <SettingsRow
            label="Job requests"
            Icon={ClipboardList}
            onPress={() => router.push('/(provider)/requests')}
          />
          <SettingsRow
            label="Edit profile (bio, photos, pricing)"
            Icon={Briefcase}
            onPress={() => router.push('/(provider)/onboarding/profile')}
          />
          <SettingsRow
            label="Service area"
            Icon={Briefcase}
            onPress={() => router.push('/(provider)/onboarding/service-area')}
          />
          <SettingsRow
            label="Availability"
            Icon={Calendar}
            last
            onPress={() => router.push('/(provider)/(tabs)/schedule')}
          />
        </Card>
      </View>

      {/* Integrations */}
      <View>
        <SectionGroupHeading>integrations</SectionGroupHeading>
        <Card style={{ padding: 0 }}>
          <Pressable
            onPress={handleCalendarPress}
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 13,
                gap: 12,
              },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
            accessibilityLabel={
              calendarConnected ? 'Google Calendar connected' : 'Connect Google Calendar'
            }
          >
            <CalendarClock size={17} color={colors.textSecondary} />
            <Text
              style={{
                flex: 1,
                ...textStyles['body-md'],
                fontFamily: fonts.bodyMedium,
                color: colors.textPrimary,
              }}
            >
              {calendarConnected ? 'Calendar connected' : 'Connect Google Calendar'}
            </Text>
            {calendarConnected ? (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: colors.success,
                  marginRight: 4,
                }}
              />
            ) : (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: colors.textTertiary,
                } as TextStyle}
              >
                Disconnected
              </Text>
            )}
            <ChevronRight size={16} color={colors.textTertiary} />
          </Pressable>
        </Card>
      </View>

      {/* Verification */}
      <View>
        <SectionGroupHeading>verification</SectionGroupHeading>
        <Card style={{ padding: 0 }}>
          {[
            { label: 'Tier 1 — Background check', statusLabel: tier1Status.label, color: tier1Status.color, href: '/(provider)/onboarding/verification-tier1' },
            { label: 'Tier 2 — Insurance', statusLabel: tier2Status.label, color: tier2Status.color, href: '/(provider)/onboarding/verification-tier2' },
          ].map((r, i, arr) => (
            <Pressable
              key={r.label}
              onPress={() => router.push(r.href as never)}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                  borderBottomColor: colors.divider,
                  gap: 12,
                },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <ShieldCheck size={17} color={colors.textSecondary} />
              <Text
                style={{
                  flex: 1,
                  ...textStyles['body-md'],
                  fontFamily: fonts.bodyMedium,
                  color: colors.textPrimary,
                }}
              >
                {r.label}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: r.color,
                } as TextStyle}
              >
                {r.statusLabel}
              </Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </Card>
      </View>

      {/* Account */}
      <View>
        <SectionGroupHeading>account</SectionGroupHeading>
        <Card style={{ padding: 0 }}>
          <SettingsRow
            label="Messages"
            Icon={MessageSquare}
            onPress={() => router.push('/(provider)/inbox')}
          />
          <SettingsRow
            label="Notification preferences"
            Icon={Bell}
            last
            onPress={() => router.push('/(provider)/notification-settings')}
          />
        </Card>
      </View>

      <Pressable onPress={signOut} style={{ paddingVertical: 16, alignItems: 'center' }}>
        <Text
          style={{
            ...textStyles['body-md'],
            fontFamily: fonts.bodySemibold,
            fontWeight: '600',
            color: colors.error,
          }}
        >
          Sign out · {user?.email ?? ''}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Section tone="feature" tight>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={handleAvatarUpload}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              style={[{ width: 88, height: 88 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
            >
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {providerData?.avatarUrl ? (
                  <Image
                    source={{ uri: providerData.avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text
                    style={{
                      fontFamily: fonts.editorial,
                      fontSize: 32,
                      fontWeight: '700',
                      lineHeight: 36,
                      color: colors.textInverse,
                    } as TextStyle}
                  >
                    {displayInitial}
                  </Text>
                )}
                {uploadingAvatar ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
              </View>
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.primary[600],
                }}
              >
                <Camera size={14} color={colors.primary[600]} />
              </View>
            </Pressable>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 10,
                fontStyle: 'italic',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.7)',
              } as TextStyle}
            >
              provider profile
            </Text>
            <Text
              style={{
                fontFamily: fonts.editorial,
                fontSize: 26,
                fontWeight: '700',
                lineHeight: 32,
                letterSpacing: -0.5,
                color: colors.textInverse,
                textAlign: 'center',
              } as TextStyle}
            >
              {businessName}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {verificationTier >= 1 ? <VerificationBadge tier={1} /> : null}
              {verificationTier >= 2 ? <VerificationBadge tier={2} /> : null}
            </View>
            {overallTrust != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <Text
                  style={{
                    fontFamily: fonts.editorial,
                    fontSize: 48,
                    fontWeight: '700',
                    lineHeight: 52,
                    color: colors.textInverse,
                    ...numericTabular,
                  } as TextStyle}
                >
                  {overallTrust.toFixed(1)}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: 'rgba(255,255,255,0.75)',
                  } as TextStyle}
                >
                  composite trust
                </Text>
              </View>
            ) : null}
            <Pressable
              hitSlop={6}
              onPress={() => router.push('/(provider)/preview-profile')}
              accessibilityRole="button"
              accessibilityLabel="Preview public profile"
              style={[
                {
                  marginTop: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: 999,
                },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <ExternalLink size={14} color={colors.textInverse} />
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: fonts.bodySemibold,
                  fontWeight: '600',
                  color: colors.textInverse,
                }}
              >
                Preview public profile
              </Text>
            </Pressable>
          </View>
        </Section>

        <ResponsiveContainer>
          <View style={{ paddingVertical: 20 }}>
            {providerDataError ? (
              <QueryErrorState onRetry={() => refetchProviderData()} />
            ) : isWebDesktop ? (
              <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
                <View style={{ width: 260, gap: 16 }}>
                  {StatsCards}
                </View>
                <View style={{ flex: 1 }}>
                  {SettingsSections}
                </View>
              </View>
            ) : (
              <View style={{ gap: 20 }}>
                {StatsCards}
                {SettingsSections}
              </View>
            )}
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSafeBack } from '../../../lib/useSafeBack';
import { ChevronLeft, UserPlus, ChevronRight } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';

import { Card } from '../../../components/ui/Card';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Pill } from '../../../components/ui/Pill';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { useAuthStore } from '../../../stores/authStore';
import { enterStaggered } from '../../../lib/motion';
import { colors, textStyles } from '../../../tokens';
import * as crewApi from '../../../lib/api/crew';
import type { CrewMember, TeamRole, TeamStatus } from '../../../lib/types';
import type { PillTone } from '../../../components/ui/Pill';

const STATUS_PILL: Record<TeamStatus, { label: string; tone: PillTone }> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Pending invite', tone: 'warning' },
  removed: { label: 'Removed', tone: 'error' },
};

const ROLE_PILL: Record<TeamRole, { label: string; tone: PillTone }> = {
  owner: { label: 'Owner', tone: 'primary' },
  tech: { label: 'Tech', tone: 'neutral' },
};

const STATUS_ORDER: TeamStatus[] = ['active', 'invited', 'removed'];

function AvatarCircle({
  uri,
  name,
  size,
}: {
  uri: string | null | undefined;
  name: string;
  size: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          ...textStyles['title-md'],
          color: colors.primary[700],
          fontSize: size * 0.38,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function TodayRosterSkeleton() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ alignItems: 'center', gap: 6 }}>
          <SkeletonLoader width={56} height={56} borderRadius={28} />
          <SkeletonLoader width={44} height={12} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

function MemberListSkeleton() {
  return (
    <View style={{ gap: 0 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 12,
            borderBottomWidth: i < 2 ? 1 : 0,
            borderBottomColor: colors.divider,
          }}
        >
          <SkeletonLoader width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonLoader width={120} height={14} borderRadius={6} />
            <SkeletonLoader width={80} height={12} borderRadius={6} />
          </View>
          <SkeletonLoader width={60} height={24} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

export default function CrewListScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { role, providerId } = useAuthStore();

  const { data: members, isLoading } = useQuery({
    queryKey: ['crew', 'list', providerId],
    queryFn: () => crewApi.listForProvider(providerId!),
    enabled: !!providerId,
  });

  if (role === 'provider_tech') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <EmptyState
          heading="Crew is owner-only"
          body="Only the business owner can manage crew members."
        />
      </SafeAreaView>
    );
  }

  const activeTechs = members?.filter(
    (m) => m.status === 'active' && m.role === 'tech',
  ) ?? [];

  const grouped = STATUS_ORDER.reduce<Record<TeamStatus, CrewMember[]>>(
    (acc, status) => {
      acc[status] = members?.filter((m) => m.status === status) ?? [];
      return acc;
    },
    { active: [], invited: [], removed: [] },
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={{ padding: 4 }}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            ...textStyles['title-lg'],
            color: colors.textPrimary,
          }}
        >
          Crew
        </Text>
        <Pressable
          onPress={() => router.push('/(provider)/crew/invite')}
          hitSlop={12}
          style={{ padding: 4 }}
          accessibilityLabel="Invite a tech"
        >
          <UserPlus size={22} color={colors.primary[600]} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Section A: Today's roster */}
        <View style={{ paddingTop: 24, gap: 12 }}>
          <Eyebrow style={{ paddingHorizontal: 20 }}>Today&apos;s roster</Eyebrow>
          {isLoading ? (
            <TodayRosterSkeleton />
          ) : activeTechs.length === 0 ? (
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                No techs assigned today
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {activeTechs.map((tech, i) => (
                <Animated.View key={tech.id} entering={enterStaggered(i)}>
                  <Pressable
                    onPress={() => router.push(`/(provider)/crew/${tech.id}`)}
                    style={{ alignItems: 'center', gap: 6 }}
                    accessibilityLabel={`View ${tech.firstName}'s profile`}
                  >
                    <View style={{ position: 'relative' }}>
                      <AvatarCircle
                        uri={tech.avatarUrl}
                        name={tech.firstName}
                        size={56}
                      />
                      {(tech.todayJobCount ?? 0) > 0 && (
                        <View
                          style={{
                            position: 'absolute',
                            top: -2,
                            right: -2,
                            backgroundColor: colors.primary[600],
                            borderRadius: 10,
                            minWidth: 18,
                            height: 18,
                            paddingHorizontal: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              ...textStyles['body-sm'],
                              fontFamily: 'Inter_700Bold',
                              fontSize: 10,
                              color: colors.textInverse,
                            }}
                          >
                            {tech.todayJobCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        ...textStyles['body-sm'],
                        fontFamily: 'Inter_500Medium',
                        color: colors.textPrimary,
                      }}
                    >
                      {tech.firstName}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Section B: All members */}
        <View style={{ paddingTop: 28, paddingHorizontal: 20, gap: 8 }}>
          <Eyebrow>All members</Eyebrow>
          {isLoading ? (
            <Card style={{ padding: 0 }}>
              <MemberListSkeleton />
            </Card>
          ) : !members || members.length === 0 ? (
            <EmptyState
              heading="No crew yet"
              body="Invite your first tech to get started."
              ctaLabel="Invite a tech"
              onCta={() => router.push('/(provider)/crew/invite')}
            />
          ) : (
            STATUS_ORDER.filter((status) => grouped[status].length > 0).map(
              (status) => (
                <View key={status} style={{ gap: 6 }}>
                  <Eyebrow style={{ marginBottom: 2, marginTop: 8 }}>
                    {status === 'active' ? 'Active' : status === 'invited' ? 'Invited' : 'Removed'}
                  </Eyebrow>
                  <Card style={{ padding: 0 }}>
                    {grouped[status].map((member, i) => {
                      const isLast = i === grouped[status].length - 1;
                      const rolePill = ROLE_PILL[member.role];
                      const statusPill = STATUS_PILL[member.status];
                      return (
                        <Animated.View key={member.id} entering={enterStaggered(i)}>
                          <Pressable
                            onPress={() =>
                              router.push(`/(provider)/crew/${member.id}`)
                            }
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 16,
                              paddingVertical: 14,
                              gap: 12,
                              borderBottomWidth: isLast ? 0 : 1,
                              borderBottomColor: colors.divider,
                            }}
                            accessibilityLabel={`View ${member.firstName} ${member.lastName}`}
                          >
                            <AvatarCircle
                              uri={member.avatarUrl}
                              name={member.firstName}
                              size={40}
                            />
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text
                                style={{
                                  ...textStyles['title-md'],
                                  color: colors.textPrimary,
                                }}
                              >
                                {member.firstName} {member.lastName}
                              </Text>
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Pill
                                  label={rolePill.label}
                                  tone={rolePill.tone}
                                />
                                <Pill
                                  label={statusPill.label}
                                  tone={statusPill.tone}
                                />
                              </View>
                            </View>
                            <ChevronRight size={18} color={colors.textTertiary} />
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </Card>
                </View>
              ),
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

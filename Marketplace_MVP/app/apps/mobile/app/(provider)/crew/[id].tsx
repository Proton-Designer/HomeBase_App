import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Mail, Phone, Briefcase } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '../../../components/ui/Card';
import { Pill } from '../../../components/ui/Pill';
import { Button } from '../../../components/ui/Button';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { BottomSheetWrapper } from '../../../components/shared/BottomSheetWrapper';
import type { BottomSheetWrapperHandle } from '../../../components/shared/BottomSheetWrapper';
import { colors, textStyles, numericTabular } from '../../../tokens';
import * as crewApi from '../../../lib/api/crew';
import * as jobsApi from '../../../lib/api/jobs';
import { useAuthStore } from '../../../stores/authStore';
import type { TeamRole, TeamStatus } from '../../../lib/types';
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

function MemberDetailSkeleton() {
  return (
    <View style={{ padding: 20, gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 16 }}>
        <SkeletonLoader width={96} height={96} borderRadius={48} />
        <SkeletonLoader width={160} height={22} borderRadius={8} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonLoader width={60} height={26} borderRadius={13} />
          <SkeletonLoader width={80} height={26} borderRadius={13} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={80} borderRadius={14} />
      <SkeletonLoader width="100%" height={100} borderRadius={14} />
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
      }}
    >
      <View style={{ width: 20, alignItems: 'center' }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...textStyles.label,
            color: colors.textSecondary,
            marginBottom: 2,
          }}
        >
          {label}
        </Text>
        <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function CrewMemberDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const removeSheetRef = useRef<BottomSheetWrapperHandle>(null);
  const [removing, setRemoving] = useState(false);
  const [resending, setResending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const providerId = useAuthStore((s) => s.providerId);

  const { data: members, isLoading } = useQuery({
    queryKey: ['crew', 'list', providerId],
    queryFn: () => crewApi.listForProvider(providerId!),
    enabled: !!providerId,
  });

  const member = members?.find((m) => m.id === id);

  const { data: memberJobs = [] } = useQuery({
    queryKey: ['jobs', 'tech', member?.userId],
    queryFn: () => jobsApi.listForTech(member!.userId),
    enabled: !!member?.userId,
  });

  async function handleRemove() {
    if (!member) return;
    setRemoving(true);
    try {
      await crewApi.remove(member.id);
      await queryClient.invalidateQueries({ queryKey: ['crew', 'list'] });
      removeSheetRef.current?.dismiss();
      router.back();
    } catch {
      Alert.alert('Error', 'Could not remove crew member. Please try again.');
    } finally {
      setRemoving(false);
    }
  }

  async function handleResendInvite() {
    if (!member) return;
    setResending(true);
    try {
      await crewApi.invite({
        providerId: member.providerId,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone ?? undefined,
      });
      Alert.alert('Invite sent', `A new invite was sent to ${member.email}.`);
    } catch {
      Alert.alert('Error', 'Could not resend invite. Please try again.');
    } finally {
      setResending(false);
    }
  }

  async function handleCancelInvite() {
    if (!member) return;
    setCancelling(true);
    try {
      await crewApi.remove(member.id);
      await queryClient.invalidateQueries({ queryKey: ['crew', 'list'] });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not cancel invite. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const assignedJobs = memberJobs.filter((j) => {
    const d = new Date(j.scheduledAt);
    return d >= startOfToday && d < endOfToday && j.status !== 'cancelled';
  });

  return (
    <>
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
            onPress={() => router.back()}
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
            Team member
          </Text>
          <View style={{ width: 30 }} />
        </View>

        {isLoading ? (
          <MemberDetailSkeleton />
        ) : !member ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
              Member not found.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 20 }}>
            {/* Hero: avatar + name + pills */}
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
              {member.avatarUrl ? (
                <Image
                  source={{ uri: member.avatarUrl }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  accessibilityLabel={`${member.firstName} ${member.lastName}`}
                />
              ) : (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: colors.primary[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      ...textStyles['editorial-title'],
                      fontSize: 36,
                      color: colors.primary[700],
                    }}
                  >
                    {member.firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={{
                  ...textStyles['editorial-title'],
                  fontSize: 22,
                  lineHeight: 28,
                  color: colors.textPrimary,
                  textAlign: 'center',
                }}
              >
                {member.firstName} {member.lastName}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill
                  label={ROLE_PILL[member.role].label}
                  tone={ROLE_PILL[member.role].tone}
                />
                <Pill
                  label={STATUS_PILL[member.status].label}
                  tone={STATUS_PILL[member.status].tone}
                />
              </View>
              {member.role === 'owner' && (
                <Pill label="Owner — full access" tone="primary" />
              )}
            </View>

            {/* Contact card */}
            <Card>
              <Eyebrow style={{ marginBottom: 4 }}>Contact</Eyebrow>
              <ContactRow
                icon={<Mail size={16} color={colors.textSecondary} />}
                label="Email"
                value={member.email}
              />
              {member.phone ? (
                <>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.divider,
                      marginVertical: 2,
                    }}
                  />
                  <ContactRow
                    icon={<Phone size={16} color={colors.textSecondary} />}
                    label="Phone"
                    value={member.phone}
                  />
                </>
              ) : null}
            </Card>

            {/* Today's jobs */}
            <Card>
              <Eyebrow style={{ marginBottom: 8 }}>Today</Eyebrow>
              <Text
                style={{
                  ...textStyles['title-md'],
                  color: colors.textPrimary,
                  marginBottom: 8,
                }}
              >
                <Text style={{ ...numericTabular, color: colors.primary[600] }}>
                  {assignedJobs.length}
                </Text>{' '}
                {assignedJobs.length === 1 ? 'job' : 'jobs'} assigned today
              </Text>
              {assignedJobs.length > 0 ? (
                assignedJobs.map((job, i) => (
                  <View
                    key={job.id}
                    style={{
                      paddingVertical: 10,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: colors.divider,
                      gap: 2,
                    }}
                  >
                    <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>
                      {job.homeownerName ?? 'Customer'}
                    </Text>
                    <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
                      {job.homeownerNeighborhood ?? job.addressFormatted ?? ''}
                    </Text>
                  </View>
                ))
              ) : (
                <View
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                    backgroundColor: colors.divider,
                    borderRadius: 8,
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Briefcase size={18} color={colors.textTertiary} />
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      color: colors.textSecondary,
                      textAlign: 'center',
                    }}
                  >
                    No jobs assigned today
                  </Text>
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      color: colors.textTertiary,
                      textAlign: 'center',
                    }}
                  >
                    Tap a job in the Jobs tab to assign
                  </Text>
                </View>
              )}
            </Card>

            {/* Footer actions */}
            {member.role === 'tech' && member.status === 'active' && (
              <Button
                label="Remove from crew"
                variant="outline"
                fullWidth
                style={{ borderColor: colors.error }}
                onPress={() => removeSheetRef.current?.present()}
              />
            )}
            {member.role === 'tech' && member.status === 'invited' && (
              <View style={{ gap: 10 }}>
                <Button
                  label="Resend invite"
                  variant="outline"
                  fullWidth
                  loading={resending}
                  onPress={handleResendInvite}
                />
                <Button
                  label="Cancel invite"
                  variant="outline"
                  fullWidth
                  style={{ borderColor: colors.error }}
                  loading={cancelling}
                  onPress={handleCancelInvite}
                />
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Remove confirmation bottom sheet */}
      <BottomSheetWrapper ref={removeSheetRef} snapPoints={['38%']}>
        <View style={{ gap: 16 }}>
          <Text
            style={{
              ...textStyles['title-lg'],
              color: colors.textPrimary,
              textAlign: 'center',
            }}
          >
            Remove {member?.firstName} from your crew?
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            They'll lose access to upcoming jobs immediately.
          </Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button
              label="Remove from crew"
              variant="destructive"
              fullWidth
              loading={removing}
              onPress={handleRemove}
            />
            <Button
              label="Cancel"
              variant="ghost"
              fullWidth
              onPress={() => removeSheetRef.current?.dismiss()}
            />
          </View>
        </View>
      </BottomSheetWrapper>
    </>
  );
}

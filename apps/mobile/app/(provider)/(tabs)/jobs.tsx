import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { ResponsiveContainer } from '../../../components/responsive/ResponsiveContainer';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock, MapPin, UserCog, Check, MessageSquare } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState , QueryErrorState } from '../../../components/shared';
import { BottomSheetWrapper } from '../../../components/shared/BottomSheetWrapper';
import type { BottomSheetWrapperHandle } from '../../../components/shared/BottomSheetWrapper';
import { ProviderCheckIn } from '../../../components/checkin/ProviderCheckIn';
import { enterStaggered } from '../../../lib/motion';
import { useAuthStore } from '../../../stores/authStore';
import type { TextStyle } from 'react-native';
import { colors, textStyles, numericTabular, fonts } from '../../../tokens';
import * as crewApi from '../../../lib/api/crew';
import * as jobsApi from '../../../lib/api/jobs';
import { supabase } from '../../../lib/supabase';
import { invokeFn } from '../../../lib/api/functions';
import { SERVICE_LABELS as SERVICE_LABEL } from '../../../lib/constants';
import type { Job, ProviderJobRequest, ServiceType } from '../../../lib/types';

type Segment = 'requests' | 'active' | 'completed';

function JobStatusPill({ status, scheduledAt }: { status: string; scheduledAt: string }) {
  const timeAgo = formatDistanceToNow(new Date(scheduledAt), { addSuffix: true });
  const toneMap: Record<string, { bg: string; text: string }> = {
    confirmed: { bg: colors.successLight, text: colors.success },
    en_route: { bg: colors.warningLight, text: colors.warning },
    in_progress: { bg: colors.infoLight, text: colors.info },
    completed: { bg: colors.successLight, text: colors.success },
  };
  const tone = toneMap[status] ?? { bg: colors.divider, text: colors.textSecondary };
  const label =
    status === 'confirmed' ? 'Confirmed'
    : status === 'en_route' ? 'En route'
    : status === 'in_progress' ? 'In progress'
    : status === 'completed' ? 'Completed'
    : status;

  return (
    <View style={{ alignItems: 'flex-start' }}>
      <View
        style={{
          backgroundColor: tone.bg,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 11,
            fontWeight: '600',
            color: tone.text,
          } as TextStyle}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 10,
          fontStyle: 'italic',
          color: colors.textTertiary,
          marginTop: 2,
        } as TextStyle}
      >
        {'as of ' + timeAgo}
      </Text>
    </View>
  );
}

export default function ProviderJobsScreen() {
  const router = useRouter();
  const { role, providerId, user } = useAuthStore();
  const isOwner = role !== 'provider_tech';
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && bp === 'desktop';

  const { data: calendarToken } = useQuery({
    // calendar_tokens is keyed by the owner's user_id, not provider_id.
    queryKey: ['calendar-connected', user?.id],
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
    staleTime: Infinity,
  });
  const calendarConnected = !!calendarToken;

  async function syncCalendar(jobId: string, action: 'create' | 'delete') {
    if (!calendarConnected) return;
    try {
      await invokeFn('calendar-sync', { jobId, action });
    } catch (err) {
      console.log('[calendar-sync] best-effort failed:', err);
    }
  }

  const [segment, setSegment] = useState<Segment>('requests');

  // Job requests (pending matches offered to this provider)
  const [requests, setRequests] = useState<ProviderJobRequest[]>([]);

  // Active/confirmed jobs from real API
  const { data: allJobs = [], isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ['provider', 'jobs', providerId],
    queryFn: () => jobsApi.listForProvider(providerId ?? ''),
    enabled: !!providerId,
  });

  // Fetch pending requests from the real API
  useQuery({
    queryKey: ['provider', 'job-requests', providerId],
    queryFn: async () => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from('jobs')
        // `jobs` has no `expires_at`; `pending` isn't a valid job_status. New bookings
        // arrive as `booked` (awaiting the provider's confirmation) — those are "requests".
        .select('id, service_type, scheduled_at, amount_cents, bookings(addresses(neighborhood))')
        .eq('provider_id', providerId)
        .eq('status', 'booked')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []).map((row: Record<string, unknown>) => {
        const booking = row.bookings as Record<string, unknown> | null;
        const address = (booking?.addresses as Record<string, unknown> | null) ?? null;
        return {
          id: row.id as string,
          serviceType: row.service_type as string,
          scheduledAt: row.scheduled_at as string,
          neighborhood: (address?.neighborhood as string) ?? '',
          payoutCents: (row.amount_cents as number) ?? 0,
        } as ProviderJobRequest;
      });
      setRequests(rows);
      return rows;
    },
    enabled: !!providerId,
  });

  const activeJobs = (allJobs as unknown as Record<string, unknown>[]).filter(
    // exclude 'booked' too — those are unaccepted requests, shown in the Requests tab.
    (j) => j.status !== 'completed' && j.status !== 'cancelled' && j.status !== 'booked'
  );
  const completedJobs = (allJobs as unknown as Record<string, unknown>[]).filter(
    (j) => j.status === 'completed'
  );

  const [checkInJobId, setCheckInJobId] = useState<string | null>(null);
  const [checkInPayoutCents, setCheckInPayoutCents] = useState(0);

  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
  const assignSheetRef = useRef<BottomSheetWrapperHandle>(null);

  // Per-job availability: the provider sets WHEN they'll do the job at acceptance
  // (availability is no longer a global onboarding step).
  const [acceptReq, setAcceptReq] = useState<ProviderJobRequest | null>(null);
  const [acceptDate, setAcceptDate] = useState<Date>(() => new Date());
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  const openAcceptPicker = (req: ProviderJobRequest) => {
    // Default to now (rounded up to the next hour) so same-day jobs are accept-able;
    // the provider adjusts to the actual arrival time.
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    setAcceptDate(d);
    setAcceptReq(req);
  };

  const confirmAccept = async () => {
    if (!acceptReq || acceptSubmitting) return;
    setAcceptSubmitting(true);
    const reqId = acceptReq.id;
    try {
      await jobsApi.accept(reqId, acceptDate.toISOString());
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
      syncCalendar(reqId, 'create');
      refetchJobs();
      setAcceptReq(null);
    } catch {
      Alert.alert('Could not accept', 'Please try again.');
    } finally {
      setAcceptSubmitting(false);
    }
  };

  // Crew list for assign sheet
  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crew', 'list', providerId],
    queryFn: () => crewApi.listForProvider(providerId ?? ''),
    enabled: isOwner && !!providerId,
  });
  const activeTechs = crewMembers.filter(
    (m) => m.providerId === providerId && m.status === 'active' && m.role === 'tech'
  );

  function openAssignSheet(jobId: string) {
    setAssigningJobId(jobId);
    assignSheetRef.current?.present();
  }

  async function handleAssign(jobId: string, techUserId: string | null) {
    const previousTechUserId = assignments[jobId] ?? undefined;
    setAssignments((prev) => ({ ...prev, [jobId]: techUserId }));
    assignSheetRef.current?.dismiss();
    crewApi
      .assignToJob(jobId, techUserId)
      .then(() => refetchJobs())
      .catch(() => {
        setAssignments((prev) => ({ ...prev, [jobId]: previousTechUserId ?? null }));
        Alert.alert('Could not assign', 'The job assignment did not save. Please try again.');
      });
  }

  // Hydrate crew assignments from the DB (assigned_tech_id) so they survive reload.
  useEffect(() => {
    const fromDb: Record<string, string | null> = {};
    for (const j of allJobs as Job[]) if (j.assignedTechId) fromDb[j.id] = j.assignedTechId;
    setAssignments(fromDb);
  }, [allJobs]);

  function assignedTechName(jobId: string): string | null {
    const techUserId = assignments[jobId];
    if (!techUserId) return null;
    const tech = activeTechs.find((t) => t.userId === techUserId);
    return tech ? `${tech.firstName} ${tech.lastName}` : null;
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ResponsiveContainer>
          {/* Hero header */}
          <View style={{ paddingTop: 8, gap: 4 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 11,
                fontStyle: 'italic',
                letterSpacing: 0.4,
                color: colors.accent[600],
                textTransform: 'lowercase',
              } as TextStyle}
            >
              the queue
            </Text>
            <Text
              style={{
                fontFamily: fonts.editorial,
                fontSize: isWebDesktop ? 40 : 30,
                fontWeight: '700',
                lineHeight: isWebDesktop ? 46 : 36,
                letterSpacing: -1,
                color: colors.textPrimary,
              } as TextStyle}
            >
              Jobs
            </Text>
          </View>

          {/* Segment switcher */}
          <View
            style={{
              marginTop: 14,
              padding: 4,
              backgroundColor: colors.divider,
              borderRadius: 999,
              flexDirection: 'row',
            }}
          >
          {([
            { id: 'requests', label: `New (${requests.length})` },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
          ] as { id: Segment; label: string }[]).map((s) => {
            const sel = segment === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSegment(s.id)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 999,
                  backgroundColor: sel ? colors.surface : 'transparent',
                }}
              >
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    fontFamily: sel ? fonts.bodySemibold : fonts.bodyMedium,
                    fontWeight: sel ? '600' : '500',
                    color: sel ? colors.textPrimary : colors.textSecondary,
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
          </View>
        </ResponsiveContainer>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}>
          {segment === 'requests' ? (
            requests.length === 0 ? (
              <EmptyState
                heading="No new job requests"
                body="Complete your profile to start receiving job matches in your area"
                ctaLabel="Edit profile"
                onCta={() => router.push('/(provider)/(tabs)/profile')}
              />
            ) : (
              requests.map((req, i) => (
                <Animated.View key={req.id} entering={enterStaggered(i)}>
                  <RequestCard
                    req={req}
                    onAccept={() => openAcceptPicker(req)}
                    onDecline={() => {
                      setRequests((prev) => prev.filter((r) => r.id !== req.id));
                      jobsApi
                        .decline(req.id)
                        .then(() => refetchJobs())
                        .catch(() => {
                          Alert.alert('Could not decline', 'Please try again.');
                          // Restore the optimistically-removed request so a failed
                          // decline doesn't silently drop it from the list.
                          setRequests((prev) =>
                            prev.some((r) => r.id === req.id)
                              ? prev
                              : [...prev, req].sort(
                                  (a, b) =>
                                    new Date(a.scheduledAt).getTime() -
                                    new Date(b.scheduledAt).getTime(),
                                ),
                          );
                        });
                      // No calendar delete on decline — the event is only created on accept.
                    }}
                  />
                </Animated.View>
              ))
            )
          ) : null}

          {segment === 'active' ? (
            jobsError ? (
              <QueryErrorState onRetry={() => refetchJobs()} />
            ) : jobsLoading ? (
              <Card>
                <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, textAlign: 'center' }}>
                  Loading…
                </Text>
              </Card>
            ) : activeJobs.length === 0 ? (
              <EmptyState
                heading="No active jobs"
                body="Accepted jobs will show up here."
              />
            ) : (
              activeJobs.map((job, i) => {
                const homeownerName = (job.homeownerName as string | undefined) ?? 'Homeowner';
                const homeownerLastInitial = (job.homeownerLastInitial as string | undefined) ?? '';
                const payoutCents = Math.round(((job.amountCents as number) ?? 0) * 0.9);
                return (
                  <Animated.View key={job.id as string} entering={enterStaggered(i)}>
                    <Card style={{ gap: 10 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                            {homeownerName}{homeownerLastInitial ? ` ${homeownerLastInitial}.` : ''}
                          </Text>
                          <Text
                            style={{
                              fontFamily: fonts.body,
                              fontSize: 13,
                              fontStyle: 'italic',
                              color: colors.textSecondary,
                            } as TextStyle}
                          >
                            {format(new Date(job.scheduledAt as string), "EEE, h:mm a")} ·{' '}
                            {SERVICE_LABEL[job.serviceType as ServiceType] ?? job.serviceType}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text
                            style={{
                              ...textStyles['title-md'],
                              ...numericTabular,
                              color: colors.success,
                            }}
                          >
                            +${(payoutCents / 100).toFixed(2)}
                          </Text>
                          <JobStatusPill
                            status={job.status as string}
                            scheduledAt={job.scheduledAt as string}
                          />
                        </View>
                      </View>

                      {isOwner && (
                        <Pressable
                          onPress={() => openAssignSheet(job.id as string)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            alignSelf: 'flex-start',
                          }}
                          accessibilityLabel="Assign tech to this job"
                        >
                          <UserCog size={13} color={colors.textSecondary} />
                          <Text
                            style={{
                              ...textStyles['body-sm'],
                              fontFamily: fonts.bodyMedium,
                              color: assignedTechName(job.id as string)
                                ? colors.primary[600]
                                : colors.textSecondary,
                            }}
                          >
                            {assignedTechName(job.id as string)
                              ? `Assigned: ${assignedTechName(job.id as string)}`
                              : 'Assign tech'}
                          </Text>
                        </Pressable>
                      )}

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            label="Mark en route"
                            variant="outline"
                            size="sm"
                            fullWidth
                            onPress={() => {
                              jobsApi
                                .setStatus(job.id as string, 'en_route')
                                .then(() => refetchJobs())
                                .catch(() => Alert.alert('Could not update', 'Please try again.'));
                            }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label="Check-in"
                            size="sm"
                            fullWidth
                            onPress={() => {
                              setCheckInJobId(job.id as string);
                              setCheckInPayoutCents(payoutCents);
                            }}
                          />
                        </View>
                      </View>
                      <Pressable
                        onPress={() => router.push(`/(provider)/thread/${job.id}`)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          alignSelf: 'flex-start',
                          marginTop: 4,
                        }}
                        accessibilityLabel="Message homeowner"
                      >
                        <MessageSquare size={13} color={colors.primary[600]} />
                        <Text
                          style={{
                            ...textStyles['body-sm'],
                            fontFamily: fonts.bodyMedium,
                            color: colors.primary[600],
                          }}
                        >
                          Message homeowner
                        </Text>
                      </Pressable>
                    </Card>
                  </Animated.View>
                );
              })
            )
          ) : null}

          {segment === 'completed' ? (
            completedJobs.length === 0 ? (
              <EmptyState
                heading="No completed jobs yet"
                body="Your completed jobs and payouts will show here."
              />
            ) : (
              completedJobs.map((job, i) => {
                const homeownerName = (job.homeownerName as string | undefined) ?? 'Homeowner';
                const payoutCents = Math.round(((job.amountCents as number) ?? 0) * 0.9);
                return (
                  <Animated.View key={job.id as string} entering={enterStaggered(i)}>
                    <Card>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                            {homeownerName}
                          </Text>
                          <Text
                            style={{
                              fontFamily: fonts.body,
                              fontSize: 13,
                              fontStyle: 'italic',
                              color: colors.textSecondary,
                            } as TextStyle}
                          >
                            {format(new Date(job.scheduledAt as string), "EEE, MMM d")} ·{' '}
                            {SERVICE_LABEL[job.serviceType as ServiceType] ?? job.serviceType}
                          </Text>
                        </View>
                        <Text
                          style={{
                            ...textStyles['title-md'],
                            ...numericTabular,
                            color: colors.success,
                          }}
                        >
                          +${(payoutCents / 100).toFixed(2)}
                        </Text>
                      </View>
                    </Card>
                  </Animated.View>
                );
              })
            )
          ) : null}
        </ScrollView>

        {checkInJobId ? (
          <ProviderCheckIn
            visible={!!checkInJobId}
            onClose={() => setCheckInJobId(null)}
            jobId={checkInJobId}
            payoutCents={checkInPayoutCents}
          />
        ) : null}
      </SafeAreaView>


      <BottomSheetWrapper ref={assignSheetRef} snapPoints={['45%']}>
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontFamily: fonts.editorial,
              fontSize: 22,
              fontWeight: '700',
              lineHeight: 28,
              letterSpacing: -0.3,
              color: colors.textPrimary,
              marginBottom: 8,
            } as TextStyle}
          >
            Assign tech
          </Text>

          <Pressable
            onPress={() =>
              assigningJobId && handleAssign(assigningJobId, null)
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 4,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.divider,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCog size={18} color={colors.textSecondary} />
            </View>
            <Text
              style={{
                flex: 1,
                ...textStyles['body-md'],
                fontFamily: fonts.bodyMedium,
                color: colors.textSecondary,
              }}
            >
              Unassigned
            </Text>
            {assigningJobId && assignments[assigningJobId] === null && (
              <Check size={18} color={colors.primary[600]} />
            )}
          </Pressable>

          {activeTechs.map((tech, i) => {
            const isSelected =
              assigningJobId != null &&
              assignments[assigningJobId] === tech.userId;
            return (
              <Pressable
                key={tech.id}
                onPress={() =>
                  assigningJobId && handleAssign(assigningJobId, tech.userId)
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                  gap: 12,
                  borderBottomWidth: i < activeTechs.length - 1 ? 1 : 0,
                  borderBottomColor: colors.divider,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.primary[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ ...textStyles['title-md'], color: colors.primary[700] }}>
                    {tech.firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      ...textStyles['body-md'],
                      fontFamily: fonts.bodyMedium,
                      color: colors.textPrimary,
                    }}
                  >
                    {tech.firstName} {tech.lastName}
                  </Text>
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      color: colors.textSecondary,
                      marginTop: 1,
                    }}
                  >
                    {tech.todayJobCount ?? 0} jobs today
                  </Text>
                </View>
                {isSelected && (
                  <Check size={18} color={colors.primary[600]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </BottomSheetWrapper>

      {/* Per-job availability — provider picks when they'll do the job on accept */}
      <Modal
        visible={!!acceptReq}
        transparent
        animationType="fade"
        onRequestClose={() => setAcceptReq(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setAcceptReq(null)} />
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: 24,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
              gap: 12,
            }}
          >
            <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
              When can you do this job?
            </Text>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              Pick the time you&apos;ll arrive — the homeowner sees this once you accept.
            </Text>
            {Platform.OS !== 'web' ? (
              <DateTimePicker
                value={acceptDate}
                mode="datetime"
                display="inline"
                minimumDate={new Date()}
                onChange={(_e, d) => {
                  if (d) setAcceptDate(d);
                }}
                style={{ alignSelf: 'stretch' }}
              />
            ) : (
              <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>
                {acceptDate.toLocaleString()}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="outline" fullWidth onPress={() => setAcceptReq(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Confirm & accept"
                  fullWidth
                  loading={acceptSubmitting}
                  onPress={confirmAccept}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function RequestCard({
  req,
  onAccept,
  onDecline,
}: {
  req: ProviderJobRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              fontFamily: fonts.editorial,
              fontSize: 18,
              fontWeight: '700',
              lineHeight: 22,
              letterSpacing: -0.3,
              color: colors.textPrimary,
            } as TextStyle}
          >
            {SERVICE_LABEL[req.serviceType as ServiceType] ?? req.serviceType}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color={colors.textSecondary} />
            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.textSecondary,
              }}
            >
              {format(new Date(req.scheduledAt), "EEE, MMM d 'at' h:mm a")}
            </Text>
          </View>
          {req.neighborhood ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} color={colors.textTertiary} />
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: colors.textTertiary,
                } as TextStyle}
              >
                {req.neighborhood}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 20,
              fontWeight: '700',
              lineHeight: 24,
              color: colors.success,
              ...numericTabular,
            } as TextStyle}
          >
            +${(req.payoutCents / 100).toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Button label="Decline" variant="outline" size="sm" fullWidth onPress={onDecline} />
        </View>
        <View style={{ flex: 2 }}>
          <Button label="Accept" size="sm" fullWidth onPress={onAccept} />
        </View>
      </View>
    </Card>
  );
}

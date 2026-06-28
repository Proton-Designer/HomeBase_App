import React, { useEffect, useMemo } from 'react';
import { ScrollView, Text, View, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Home } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { fetchPrimaryAddress } from '../../../lib/api/addresses';
import { subscribeToHomeownerJobs } from '../../../lib/api/realtime';
import { geocodeAddress, resolveStreetViewUrl } from '../../../lib/geo';
import * as api from '../../../lib/api';
import type { HomeServiceStatus } from '../../../lib/api/homeServiceStatus';
import {
  computeReminders,
  deriveYourPros,
  pickPrimaryActiveJob,
  isLiveJob,
  type ProviderSummary,
} from '../../../lib/home';
import { MyHomeCard } from '../../../components/home/MyHomeCard';
import { SearchIntentBar } from '../../../components/home/SearchIntentBar';
import { AdaptiveHero } from '../../../components/home/AdaptiveHero';
import { YourProsRow } from '../../../components/home/YourProsRow';
import { SkeletonLoader } from '../../../components/shared';
import { Button } from '../../../components/ui/Button';
import { colors, fonts, textStyles } from '../../../tokens';
import { enter } from '../../../lib/motion';
import type { ServiceType, JobStatus } from '../../../lib/types';

const ACTIVE_STATUSES: JobStatus[] = ['booked', 'confirmed', 'en_route', 'in_progress'];

// Free-text intent → known service. Keeps search from dead-ending on our ~10 services.
const SERVICE_SYNONYMS: Record<ServiceType, string[]> = {
  lawn: ['lawn', 'grass', 'mow', 'yard', 'mowing', 'edging'],
  cleaning: ['clean', 'maid', 'housekeep', 'tidy'],
  pool: ['pool', 'spa', 'hot tub'],
  pest: ['pest', 'bug', 'extermin', 'termite', 'roach', 'ant', 'mosquito'],
  pressure: ['pressure', 'power wash', 'driveway', 'patio'],
  window: ['window', 'glass'],
  gutter: ['gutter', 'downspout'],
  detailing: ['detail', 'car wash', 'auto'],
  tree: ['tree', 'trim', 'prune', 'stump', 'branch'],
  solar: ['solar', 'panel'],
};

function matchServiceType(query: string): ServiceType | null {
  const q = query.toLowerCase();
  for (const [service, words] of Object.entries(SERVICE_SYNONYMS) as [ServiceType, string[]][]) {
    if (words.some((w) => q.includes(w))) return service;
  }
  return null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reset = useBookingStore((s) => s.reset);
  const setServiceType = useBookingStore((s) => s.setServiceType);
  const setMatchedProvider = useBookingStore((s) => s.setMatchedProvider);
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const firstName = profile?.firstName ?? null;

  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: () => api.notifications.unreadCount(),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: address, isLoading: addressLoading } = useQuery({
    queryKey: ['addresses', 'primary', userId],
    queryFn: () => fetchPrimaryAddress(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
  const homeZip = address?.zip ?? null;

  // Legacy homes saved before autocomplete have no coords — geocode the line once.
  const formatted = address
    ? `${address.street}, ${address.city}, ${address.state} ${address.zip}`
    : null;
  const needsGeocode = !!address && address.lat == null && address.lng == null && !!formatted;
  const { data: geocoded } = useQuery({
    queryKey: ['geocode', formatted],
    queryFn: () => geocodeAddress(formatted!),
    enabled: needsGeocode,
    staleTime: Infinity,
  });
  const lat = address?.lat ?? geocoded?.lat ?? null;
  const lng = address?.lng ?? geocoded?.lng ?? null;

  // Front-of-house Street View (null when no key / no imagery → card falls back to satellite).
  const { data: frontViewUrl } = useQuery({
    queryKey: ['streetview', lat, lng],
    queryFn: () => resolveStreetViewUrl({ lat: lat!, lng: lng! }),
    enabled: lat != null && lng != null,
    staleTime: Infinity,
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', 'homeowner', userId],
    queryFn: () => api.jobs.listForHomeowner(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'homeowner', userId],
    queryFn: () => api.bookings.listForHomeowner(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['completions', 'homeowner', userId],
    queryFn: () => api.completions.fetchHomeownerCompletions(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: serviceStatuses = [] } = useQuery({
    queryKey: ['home-service-status', userId],
    queryFn: () => api.homeServiceStatus.fetchStatuses(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // A live/in-progress job changes state without a refetch — subscribe so the hero
  // tracks it. The subscription invalidates the jobs list (same pattern as job detail).
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToHomeownerJobs(userId, () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'homeowner', userId] });
    });
    return unsub;
  }, [userId, queryClient]);

  const primaryJob = useMemo(() => pickPrimaryActiveJob(jobs), [jobs]);
  const live = primaryJob ? isLiveJob(primaryJob) : false;
  const yourPros = useMemo(() => deriveYourPros(bookings), [bookings]);
  const reminders = useMemo(
    () =>
      computeReminders({
        serviceInterests: address?.serviceInterests ?? [],
        completions,
        statuses: serviceStatuses,
        now: new Date(),
      }),
    [address?.serviceInterests, completions, serviceStatuses],
  );

  const stats = {
    completed: completions.length,
    upcoming: jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length,
    reminders: reminders.length,
  };

  const startBooking = (svc?: ServiceType, entry = 'home') => {
    reset();
    if (svc) setServiceType(svc);
    void api.events.track({
      event: 'booking_started',
      serviceType: svc,
      zip: homeZip ?? undefined,
      metadata: { entry },
    });
    router.push({
      pathname: '/(homeowner)/booking/service-select',
      params: svc ? { service: svc } : undefined,
    });
  };

  const handleSearch = (query: string) => {
    const matched = matchServiceType(query);
    void api.events.track({
      event: 'search',
      serviceType: matched ?? undefined,
      zip: homeZip ?? undefined,
      metadata: { query, matched: !!matched },
    });
    if (matched) {
      startBooking(matched, 'search');
    } else {
      // No catalog match — route to a custom job posting so intent never dead-ends.
      router.push('/(homeowner)/post-job/service');
    }
  };

  const handleRehire = (pro: ProviderSummary) => {
    reset();
    setServiceType(pro.lastServiceType);
    setMatchedProvider(pro.providerId);
    void api.events.track({
      event: 'booking_started',
      serviceType: pro.lastServiceType,
      zip: homeZip ?? undefined,
      metadata: { entry: 'rehire', providerId: pro.providerId },
    });
    router.push({
      pathname: '/(homeowner)/booking/service-select',
      params: { service: pro.lastServiceType },
    });
  };

  const markReminderHandled = (svc: ServiceType) => {
    void api.events.track({
      event: 'reminder_handled',
      serviceType: svc,
      zip: homeZip ?? undefined,
      metadata: { source: 'self' },
    });
    // Optimistic: reflect "handled today" immediately so the reminder drops on the
    // first tap (previously it appeared to do nothing until the round-trip finished).
    queryClient.setQueryData<HomeServiceStatus[]>(['home-service-status', userId], (old) => {
      const rest = (old ?? []).filter((s) => s.serviceType !== svc);
      return [
        ...rest,
        {
          serviceType: svc,
          lastServicedAt: new Date().toISOString(),
          lastSource: 'self',
          cadenceDaysOverride: null,
          state: 'active',
          snoozedUntil: null,
          dismissCount: 0,
        },
      ];
    });
    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: ['home-service-status', userId] });
    void api.homeServiceStatus.markHandled(svc, 'self').then(refresh).catch(refresh);
  };

  const nudge =
    completions.length === 0 && bookings.length === 0
      ? {
          title: 'Let’s get your home set up',
          body: 'Book your first service and we’ll start tracking your home’s care here.',
          ctaLabel: 'Browse services',
          onCta: () => startBooking(undefined, 'nudge'),
        }
      : {
          title: 'Nothing scheduled right now',
          body: 'Your home’s all caught up. Book your next service whenever you’re ready.',
          ctaLabel: 'Book a service',
          onCta: () => startBooking(undefined, 'nudge'),
        };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header: greeting + notifications */}
        <Animated.View
          entering={enter}
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.body,
                fontStyle: 'italic',
                fontSize: 14,
                lineHeight: 20,
                color: colors.textSecondary,
              }}
            >
              {getGreeting()}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            <Text
              style={{
                ...textStyles['editorial-title'],
                color: colors.textPrimary,
                marginTop: 2,
              }}
            >
              Here’s what’s happening at home
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(homeowner)/notifications')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'
            }
            style={[
              {
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Bell size={20} color={colors.textPrimary} />
            {unreadNotifications > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 3,
                  borderRadius: 8,
                  backgroundColor: colors.error,
                  borderWidth: 1.5,
                  borderColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 9, color: colors.textInverse }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>

        {/* Intent capture — every search feeds demand_events */}
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <SearchIntentBar onSubmit={handleSearch} />
        </View>

        {/* My Home — pinned directly beneath the search bar */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          {address ? (
            <MyHomeCard
              addressLine={address.street}
              cityStateZip={`${address.city}, ${address.state} ${address.zip}`}
              frontViewUrl={frontViewUrl ?? null}
              lat={lat}
              lng={lng}
              stats={stats}
              onPress={() => router.push('/(homeowner)/home-detail')}
              onPressReminders={() => router.push('/(homeowner)/reminders')}
            />
          ) : addressLoading || !userId ? (
            <SkeletonLoader width="100%" height={170} borderRadius={16} />
          ) : (
            <AddressPrompt onPress={() => router.push('/(auth)/address-setup')} />
          )}
        </View>

        {/* Adaptive hero: live job → next booking → nudge */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          {(jobsLoading || bookingsLoading || !userId) && !primaryJob ? (
            <SkeletonLoader width="100%" height={150} borderRadius={16} />
          ) : (
            <AdaptiveHero
              job={primaryJob}
              isLive={live}
              onPressJob={(jobId) => router.push(`/(homeowner)/job/${jobId}`)}
              nudge={nudge}
              topReminder={reminders[0] ?? null}
              onBookReminder={(svc) => startBooking(svc, 'reminder')}
              onHandledReminder={markReminderHandled}
              onOpenReminders={() => router.push('/(homeowner)/reminders')}
            />
          )}
        </View>

        {/* Your pros — one-tap rehire */}
        {yourPros.length > 0 ? (
          <View style={{ marginTop: 28 }}>
            <SectionHeader title="Your pros" />
            <View style={{ paddingLeft: 20, marginTop: 12 }}>
              <YourProsRow
                pros={yourPros}
                onRehire={handleRehire}
                onOpen={(providerId) => router.push(`/(homeowner)/providers/${providerId}`)}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AddressPrompt({ onPress }: { onPress: () => void }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Home size={28} color={colors.primary[600]} />
      <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Add your home</Text>
      <Text
        style={{
          ...textStyles['body-sm'],
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        Save your address to map your home and match pros on your block.
      </Text>
      <Button label="Add address" size="md" onPress={onPress} />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View
        style={{
          height: 1,
          width: 24,
          backgroundColor: colors.accent[500],
          marginBottom: 8,
          borderRadius: 1,
        }}
      />
      <Text style={{ ...textStyles['display-md'], color: colors.textPrimary }}>{title}</Text>
    </View>
  );
}

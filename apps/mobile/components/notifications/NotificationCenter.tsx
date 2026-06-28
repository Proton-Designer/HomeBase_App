import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Bell,
  CheckCircle2,
  MessageCircle,
  DollarSign,
  AlertCircle,
  CalendarCheck,
  ShieldCheck,
  Leaf,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeBack } from '../../lib/useSafeBack';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import * as notificationsApi from '../../lib/api/notifications';
import type { AppNotification } from '../../lib/api/notifications';
import { EmptyState } from '../shared/EmptyState';
import { colors, fonts, textStyles } from '../../tokens';

const ICON_BY_TYPE: Record<string, LucideIcon> = {
  booking_matched: CalendarCheck,
  booking_confirmed: CalendarCheck,
  booking_declined: AlertCircle,
  booking_cancelled: AlertCircle,
  job_completed_checkin: CheckCircle2,
  checkin_reminder: CheckCircle2,
  payout_sent: DollarSign,
  instant_payout_ready: DollarSign,
  claim_update: AlertCircle,
  verification_approved: ShieldCheck,
  new_message: MessageCircle,
  quote_received: MessageCircle,
  reminder_due: Leaf,
};

function iconFor(type: string): LucideIcon {
  return ICON_BY_TYPE[type] ?? Bell;
}

function timeAgo(iso: string): string {
  const secs = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export interface NotificationCenterProps {
  /** Map a notification to an in-app href, or null to just mark-read with no nav. */
  resolveHref?: (n: AppNotification) => string | null;
}

export function NotificationCenter({ resolveHref }: NotificationCenterProps) {
  const goBack = useSafeBack();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user)?.id ?? null;

  const {
    data: notifications = [],
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationsApi.list(),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', userId] });
  }, [queryClient, userId]);

  // Live updates: new/updated notifications for this user.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => invalidate(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, invalidate]);

  const hasUnread = notifications.some((n) => !n.readAt);

  const onPressRow = useCallback(
    async (n: AppNotification) => {
      if (!n.readAt) {
        try {
          await notificationsApi.markRead(n.id);
        } catch {
          /* non-blocking */
        }
        invalidate();
      }
      const href = resolveHref?.(n);
      if (href) {
        const { router } = await import('expo-router');
        router.push(href as never);
      }
    },
    [invalidate, resolveHref],
  );

  const onMarkAll = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* non-blocking */
    }
    invalidate();
  }, [invalidate]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Notifications</Text>
        {hasUnread ? (
          <Pressable
            onPress={onMarkAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mark all read"
            style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.primary[600] }}>
              Mark all read
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={
          notifications.length === 0
            ? { flexGrow: 1, justifyContent: 'center' }
            : { paddingVertical: 8 }
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />
        }
        ListEmptyComponent={
          <EmptyState
            illustration={<Bell size={40} color={colors.textTertiary} />}
            heading="All caught up"
            body="New updates about your home and jobs will show up here."
          />
        }
        renderItem={({ item }) => {
          const Icon = iconFor(item.type);
          const unread = !item.readAt;
          return (
            <Pressable
              onPress={() => onPressRow(item)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: unread ? colors.primary[50] : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
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
                <Icon size={20} color={colors.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontFamily: unread ? fonts.bodySemibold : fonts.body,
                      fontSize: 15,
                      color: colors.textPrimary,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary, marginLeft: 8 }}>
                    {timeAgo(item.sentAt)}
                  </Text>
                </View>
                <Text
                  numberOfLines={2}
                  style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginTop: 2 }}
                >
                  {item.body}
                </Text>
              </View>
              {unread ? (
                <View
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[600] }}
                />
              ) : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

export default NotificationCenter;

import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Send, Camera } from 'lucide-react-native';
import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import Animated from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { Section } from '../../../components/ui/Section';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { EmptyState, QueryErrorState, SkeletonLoader } from '../../../components/shared';
import {
  listThreadsForHomeowner,
  listForJob,
  send as sendMessage,
  markRead,
  type Thread,
  type Message,
} from '../../../lib/api/messages';
import { genClientId } from '../../../lib/messaging/useThreadMessages';
import { subscribeToMessages } from '../../../lib/api/realtime';
import { useAuthStore } from '../../../stores/authStore';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enterStaggered, usePress } from '../../../lib/motion';
import { colors, textStyles } from '../../../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Stable empty default so a `data: threads = []` fallback isn't a fresh array every render
// (which would make any effect depending on `threads` re-run forever while the query loads).
const EMPTY_THREADS: Thread[] = [];

// ─── Time formatting for thread rows ─────────────────────────────────────────

function formatThreadTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  if (differenceInCalendarDays(now, date) < 7) return format(date, 'EEE');
  if (date.getFullYear() === now.getFullYear()) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function Avatar({ uri, name, size }: { uri: string | null; name: string; size: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }
  const initial = (name?.[0] ?? '?').toUpperCase();
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
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: Math.round(size * 0.42),
          color: colors.primary[700],
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        alignItems: 'center',
      }}
    >
      <SkeletonLoader width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonLoader width="70%" height={14} borderRadius={4} />
        <SkeletonLoader width="50%" height={12} borderRadius={4} />
        <SkeletonLoader width="90%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

// ─── Thread row ───────────────────────────────────────────────────────────────

function ThreadRow({
  thread,
  index,
  currentUserId,
  onPress,
}: {
  thread: Thread;
  index: number;
  currentUserId: string | null;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  const hasUnread = thread.unreadCount > 0;
  const badgeLabel = thread.unreadCount > 9 ? '9+' : String(thread.unreadCount);
  const isLastFromMe = currentUserId
    ? thread.lastSentByMe
    : false;

  const accessLabel = [
    thread.otherPartyName,
    thread.jobServiceType ? `${thread.jobServiceType}${thread.jobStatus ? ` · ${thread.jobStatus}` : ''}` : null,
    isLastFromMe ? `You: ${thread.lastPreview}` : thread.lastPreview,
    formatThreadTime(thread.lastSentAt),
    hasUnread ? `${thread.unreadCount} unread messages` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      entering={enterStaggered(index)}
      accessibilityLabel={accessLabel}
      accessibilityRole="button"
      style={[
        {
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        animatedStyle,
      ]}
    >
      <Avatar uri={thread.otherPartyAvatarUrl} name={thread.otherPartyName} size={48} />

      {/* Content block */}
      <View style={{ flex: 1, gap: 2 }}>
        {/* Row 1: Name */}
        <Text
          style={{
            ...textStyles['title-md'],
            fontFamily: hasUnread ? 'Inter_700Bold' : textStyles['title-md'].fontFamily,
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {thread.otherPartyName}
        </Text>

        {/* Row 2: Job context line */}
        {thread.jobServiceType ? (
          <Text
            style={{ ...textStyles['body-sm'], color: colors.textTertiary }}
            numberOfLines={1}
          >
            {thread.jobServiceType}
            {thread.jobStatus ? ` · ${thread.jobStatus}` : ''}
          </Text>
        ) : null}

        {/* Row 3: Preview */}
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: hasUnread ? 'Inter_600SemiBold' : 'Inter_400Regular',
            color: hasUnread ? colors.textPrimary : colors.textSecondary,
          }}
          numberOfLines={1}
        >
          {isLastFromMe ? (
            <>
              <Text style={{ color: colors.textTertiary }}>You: </Text>
              {thread.lastPreview}
            </>
          ) : (
            thread.lastPreview
          )}
        </Text>
      </View>

      {/* Right column: time + unread badge */}
      <View style={{ gap: 4, alignItems: 'flex-end' }}>
        <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
          {formatThreadTime(thread.lastSentAt)}
        </Text>
        {hasUnread ? (
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.primary[600],
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 5,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 11,
                color: colors.textInverse,
              }}
            >
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

// ─── Desktop thread detail (unchanged from current — inline Bubble) ───────────

function Bubble({ message, currentUserId }: { message: Message; currentUserId: string | null }) {
  const time = format(new Date(message.sentAt), 'h:mm a');
  const isMe = currentUserId ? message.fromUserId === currentUserId : message.fromRole === 'homeowner';
  return (
    <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '78%',
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: isMe ? colors.primary[600] : colors.surface,
          borderRadius: 18,
          borderBottomRightRadius: isMe ? 4 : 18,
          borderBottomLeftRadius: isMe ? 18 : 4,
          borderWidth: isMe ? 0 : 1,
          borderColor: colors.border,
          gap: 4,
        }}
      >
        <Text style={{ ...textStyles['body-md'], color: isMe ? colors.textInverse : colors.textPrimary }}>
          {message.body}
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 10,
            color: isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary,
            alignSelf: 'flex-end',
          }}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

function ThreadDetail({ jobId, otherPartyName }: { jobId: string; otherPartyName: string }) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', jobId],
    queryFn: () => listForJob(jobId),
  });

  useEffect(() => {
    void markRead(jobId);
    const unsub = subscribeToMessages(jobId, () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', jobId] });
      void queryClient.invalidateQueries({ queryKey: ['threads', 'homeowner'] });
    });
    return unsub;
  }, [jobId, queryClient]);

  const sendM = useMutation({
    mutationFn: (body: string) =>
      sendMessage({ jobId, body, fromRole: 'homeowner', clientId: genClientId() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', jobId] });
      void queryClient.invalidateQueries({ queryKey: ['threads', 'homeowner'] });
    },
  });

  const [input, setInput] = useState('');
  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    sendM.mutate(trimmed);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
          {otherPartyName}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 8 }}>
        {messages.map((m) => (
          <Bubble key={m.id} message={m} currentUserId={userId} />
        ))}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 8,
        }}
      >
        <Pressable
          hitSlop={12}
          onPress={() => Alert.alert('Coming soon', 'Photo attachments are coming in a future update.')}
          accessibilityLabel="Attach photo"
        >
          <Camera size={22} color={colors.textSecondary} />
        </Pressable>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`Message ${otherPartyName.split(' ')[0] || 'them'}…`}
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={onSend}
          style={{
            flex: 1,
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            backgroundColor: colors.divider,
            borderRadius: 999,
            paddingVertical: 10,
            paddingHorizontal: 16,
            color: colors.textPrimary,
          }}
        />
        <Pressable
          onPress={onSend}
          disabled={!input.trim() || sendM.isPending}
          accessibilityLabel="Send message"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor:
              input.trim() && !sendM.isPending ? colors.primary[600] : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send
            size={18}
            color={input.trim() && !sendM.isPending ? colors.textInverse : colors.textTertiary}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const isDesktop = useBreakpoint() === 'desktop';
  const homeownerId = useAuthStore((s) => s.user?.id ?? null);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const { data: threads = EMPTY_THREADS, isLoading, isError, refetch } = useQuery({
    queryKey: ['threads', 'homeowner', homeownerId],
    queryFn: () => listThreadsForHomeowner(homeownerId ?? ''),
    enabled: !!homeownerId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Tab badge: total unread across all threads (§3.6).
  const totalUnread = threads.reduce((acc, t) => acc + t.unreadCount, 0);
  useEffect(() => {
    navigation.setOptions({
      tabBarBadge: totalUnread > 0 ? String(totalUnread) : undefined,
    });
  }, [navigation, totalUnread]);

  useEffect(() => {
    if (isDesktop && !selectedJobId && threads.length > 0) {
      setSelectedJobId(threads[0].jobId);
    }
  }, [isDesktop, selectedJobId, threads]);

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <QueryErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  // While the first load is in flight (or before the user id resolves) show a
  // spinner — otherwise the screen falls through to a blank view.
  if (!homeownerId || (isLoading && threads.length === 0)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Section tight>
          <Eyebrow>Inbox</Eyebrow>
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary, marginTop: 6 }}>
            Messages
          </Text>
        </Section>
        {[0, 1, 2].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </SafeAreaView>
    );
  }

  if (!isLoading && threads.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState
          heading="No messages yet"
          body="Messages with your service providers appear here after you book a job."
          ctaLabel="Browse providers"
          onCta={() => router.push('/(homeowner)/(tabs)/book')}
        />
      </SafeAreaView>
    );
  }

  if (isDesktop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ paddingHorizontal: 32, paddingTop: 24, paddingBottom: 12 }}>
          <Eyebrow>Inbox</Eyebrow>
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary, marginTop: 6 }}>
            Messages
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            gap: 16,
            paddingHorizontal: 32,
            paddingBottom: 24,
          }}
        >
          <View
            style={{
              width: 340,
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <ScrollView>
              {threads.map((t, i) => {
                const sel = t.jobId === selectedJobId;
                return (
                  <Animated.View key={t.jobId} entering={enterStaggered(i)}>
                    <Pressable
                      onPress={() => setSelectedJobId(t.jobId)}
                      style={[
                        {
                          paddingHorizontal: 18,
                          paddingVertical: 14,
                          flexDirection: 'row',
                          gap: 12,
                          alignItems: 'center',
                          backgroundColor: sel ? colors.primary[50] : 'transparent',
                          borderBottomWidth: 1,
                          borderBottomColor: colors.divider,
                        },
                        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                      ]}
                    >
                      <Avatar uri={t.otherPartyAvatarUrl} name={t.otherPartyName} size={40} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{ ...textStyles['title-md'], color: colors.textPrimary }}
                          numberOfLines={1}
                        >
                          {t.otherPartyName}
                        </Text>
                        {t.jobServiceType ? (
                          <Text
                            style={{ ...textStyles['body-sm'], color: colors.textTertiary }}
                            numberOfLines={1}
                          >
                            {t.jobServiceType}
                            {t.jobStatus ? ` · ${t.jobStatus}` : ''}
                          </Text>
                        ) : null}
                        <Text
                          style={{
                            ...textStyles['body-sm'],
                            color:
                              t.unreadCount > 0 ? colors.textPrimary : colors.textSecondary,
                            fontFamily:
                              t.unreadCount > 0 ? 'Inter_600SemiBold' : 'Inter_400Regular',
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {t.lastSentByMe ? (
                            <>
                              <Text style={{ color: colors.textTertiary }}>You: </Text>
                              {t.lastPreview}
                            </>
                          ) : (
                            t.lastPreview
                          )}
                        </Text>
                      </View>
                      {t.unreadCount > 0 ? (
                        <View
                          style={{
                            minWidth: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: colors.primary[600],
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 5,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'Inter_700Bold',
                              fontSize: 11,
                              color: colors.textInverse,
                            }}
                          >
                            {t.unreadCount > 9 ? '9+' : String(t.unreadCount)}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
          {selectedJobId ? (
            <ThreadDetail
              jobId={selectedJobId}
              otherPartyName={
                threads.find((t) => t.jobId === selectedJobId)?.otherPartyName ?? 'Conversation'
              }
            />
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Section tight>
        <Eyebrow>Inbox</Eyebrow>
        <Text
          style={{ ...textStyles['editorial-title'], color: colors.textPrimary, marginTop: 6 }}
        >
          Messages
        </Text>
      </Section>
      <FlatList
        data={threads}
        keyExtractor={(t) => t.jobId}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
        renderItem={({ item: t, index }) => (
          <ThreadRow
            thread={t}
            index={index}
            currentUserId={userId}
            onPress={() =>
              router.push({
                pathname: '/(homeowner)/thread/[id]',
                params: {
                  id: t.jobId,
                  name: t.otherPartyName,
                  avatarUrl: t.otherPartyAvatarUrl ?? '',
                  serviceType: t.jobServiceType ?? '',
                  jobStatus: t.jobStatus ?? '',
                },
              } as Parameters<typeof router.push>[0])
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

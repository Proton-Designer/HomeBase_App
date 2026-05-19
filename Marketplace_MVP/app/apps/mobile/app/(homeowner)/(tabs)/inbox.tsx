import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable, Image, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Send, Paperclip } from 'lucide-react-native';
import { format, formatDistanceToNowStrict } from 'date-fns';
import Animated from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Section } from '../../../components/ui/Section';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Pill } from '../../../components/ui/Pill';
import { EmptyState } from '../../../components/shared';
import {
  listThreadsForHomeowner,
  listForJob,
  send as sendMessage,
  markRead,
  type Thread,
  type Message,
} from '../../../lib/api/messages';
import { subscribeToMessages } from '../../../lib/api/realtime';
import { useAuthStore } from '../../../stores/authStore';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { enterStaggered, usePress } from '../../../lib/motion';
import { colors, textStyles } from '../../../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function InboxScreen() {
  const router = useRouter();
  const isDesktop = useBreakpoint() === 'desktop';
  const homeownerId = useAuthStore((s) => s.user?.id ?? null);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['threads', 'homeowner', homeownerId],
    queryFn: () => listThreadsForHomeowner(homeownerId ?? ''),
    enabled: !!homeownerId,
  });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (isDesktop && !selectedJobId && threads.length > 0) {
      setSelectedJobId(threads[0].jobId);
    }
  }, [isDesktop, selectedJobId, threads]);

  if (!isLoading && threads.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState
          heading="No messages yet"
          body="Messages with your providers will appear here after you book your first job."
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
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 6,
            }}
          >
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
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ ...textStyles['title-md'], color: colors.textPrimary }}
                          numberOfLines={1}
                        >
                          {t.otherPartyName}
                        </Text>
                        <Text
                          style={{
                            ...textStyles['body-sm'],
                            color: t.unreadCount > 0 ? colors.textPrimary : colors.textSecondary,
                            fontFamily: t.unreadCount > 0 ? 'Inter_600SemiBold' : 'Inter_400Regular',
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {t.lastPreview}
                        </Text>
                      </View>
                      {t.unreadCount > 0 ? <Pill label={String(t.unreadCount)} tone="primary" /> : null}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
          {selectedJobId ? <ThreadDetail jobId={selectedJobId} /> : <View style={{ flex: 1 }} />}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Section tight>
        <Eyebrow>Inbox</Eyebrow>
        <Text
          style={{
            ...textStyles['editorial-title'],
            color: colors.textPrimary,
            marginTop: 6,
          }}
        >
          Messages
        </Text>
      </Section>
      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}>
        {threads.map((t, i) => (
          <ThreadRow
            key={t.jobId}
            thread={t}
            index={i}
            onPress={() => router.push(`/(homeowner)/thread/${t.jobId}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Avatar({ uri, name, size }: { uri: string | null; name: string; size: number }) {
  if (uri) {
    return (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
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

function ThreadRow({
  thread,
  index,
  onPress,
}: {
  thread: Thread;
  index: number;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      entering={enterStaggered(index)}
      style={[
        {
          paddingHorizontal: 20,
          paddingVertical: 16,
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
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            {thread.otherPartyName}
          </Text>
          <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
            {formatDistanceToNowStrict(new Date(thread.lastSentAt), { addSuffix: false })}
          </Text>
        </View>
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: thread.unreadCount > 0 ? 'Inter_600SemiBold' : 'Inter_400Regular',
            color: thread.unreadCount > 0 ? colors.textPrimary : colors.textSecondary,
            marginTop: 4,
          }}
          numberOfLines={1}
        >
          {thread.lastPreview}
        </Text>
      </View>
      {thread.unreadCount > 0 ? (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.primary[600],
          }}
        />
      ) : null}
    </AnimatedPressable>
  );
}

function ThreadDetail({ jobId }: { jobId: string }) {
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
    mutationFn: (body: string) => sendMessage({ jobId, body, fromRole: 'homeowner' }),
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

  const otherPartyName = useMemo(
    () => messages.find((m) => m.fromUserId !== userId)?.fromRole === 'homeowner' ? 'You' : 'Provider',
    [messages, userId]
  );

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
        <Pressable hitSlop={8}>
          <Paperclip size={20} color={colors.textSecondary} />
        </Pressable>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
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
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: input.trim() && !sendM.isPending ? colors.primary[600] : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send size={18} color={colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

function Bubble({ message, currentUserId }: { message: Message; currentUserId: string | null }) {
  const time = format(new Date(message.sentAt), 'h:mm a');
  const isMe = currentUserId ? message.fromUserId === currentUserId : message.fromRole === 'homeowner';
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
      }}
    >
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
        <Text
          style={{
            ...textStyles['body-md'],
            color: isMe ? colors.textInverse : colors.textPrimary,
          }}
        >
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send, Paperclip } from 'lucide-react-native';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listForJob,
  send as sendMessage,
  markRead,
  type Message,
} from '../../../lib/api/messages';
import { subscribeToMessages } from '../../../lib/api/realtime';
import { useAuthStore } from '../../../stores/authStore';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { colors, textStyles } from '../../../tokens';

export default function ThreadScreen() {
  const router = useRouter();
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && bp === 'desktop';

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', jobId],
    queryFn: () => listForJob(jobId!),
    enabled: !!jobId,
  });

  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!jobId) return;
    void markRead(jobId);
    const unsub = subscribeToMessages(jobId, () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', jobId] });
      void queryClient.invalidateQueries({ queryKey: ['threads', 'homeowner'] });
    });
    return unsub;
  }, [jobId, queryClient]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const sendM = useMutation({
    mutationFn: (body: string) => sendMessage({ jobId: jobId!, body, fromRole: 'homeowner' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', jobId] });
      void queryClient.invalidateQueries({ queryKey: ['threads', 'homeowner'] });
    },
  });

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    sendM.mutate(trimmed);
  };

  const headerName = useMemo(() => {
    const other = messages.find((m) => m.fromUserId !== userId);
    return other?.fromRole === 'provider_owner' || other?.fromRole === 'provider_tech'
      ? 'Your provider'
      : 'Thread';
  }, [messages, userId]);

  const chatContent = (
    <>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 18, gap: 8 }}>
        {messages.map((m) => (
          <Bubble key={m.id} message={m} currentUserId={userId} />
        ))}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
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
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
          {headerName}
        </Text>
      </View>
      {isWebDesktop ? (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View
            style={{
              flex: 1,
              width: '100%',
              maxWidth: 720,
              backgroundColor: colors.surface,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.border,
            }}
          >
            {chatContent}
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          {chatContent}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
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

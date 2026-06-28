import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeBack } from '../../../lib/useSafeBack';
import { ChevronLeft, ChevronRight, Send, Camera } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { format, isSameDay } from 'date-fns';
import { useThreadMessages, type ThreadMessage } from '../../../lib/messaging/useThreadMessages';
import { useTypingPresence } from '../../../lib/messaging/useTypingPresence';
import { useAuthStore } from '../../../stores/authStore';
import { onlyNative } from '../../../lib/motion';
import { colors, textStyles } from '../../../tokens';
import { MessageBubble, type GroupPosition } from '../../../components/messaging/MessageBubble';
import { DaySeparator } from '../../../components/messaging/DaySeparator';
import { UnreadDivider } from '../../../components/messaging/UnreadDivider';
import { TypingIndicator } from '../../../components/messaging/TypingIndicator';
import { QuickReplyChips } from '../../../components/messaging/QuickReplyChips';
import { NewMessagePill } from '../../../components/messaging/NewMessagePill';
import { ThreadEmptyPanel } from '../../../components/messaging/ThreadEmptyPanel';
import { BottomSheetWrapper, type BottomSheetWrapperHandle } from '../../../components/shared/BottomSheetWrapper';
import type { UserRole } from '../../../lib/types';

// ─── List item types (same as homeowner thread) ───────────────────────────────

type MessageItem = {
  type: 'message';
  message: ThreadMessage;
  groupPosition: GroupPosition;
  isLastRead: boolean;
};
type DaySeparatorItem = { type: 'day-separator'; date: Date; key: string };
type UnreadDividerItem = { type: 'unread-divider'; key: string };
type ListItem = MessageItem | DaySeparatorItem | UnreadDividerItem;

function diffMinutes(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

function buildListItems(
  messages: ThreadMessage[],
  currentUserId: string | null,
  isProviderRole: boolean,
  unreadDividerId: string | null,
  lastReadMessageId: string | null,
): ListItem[] {
  const items: ListItem[] = [];
  let unreadDividerInserted = false;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    if (!prev || !isSameDay(new Date(msg.sentAt), new Date(prev.sentAt))) {
      items.push({ type: 'day-separator', date: new Date(msg.sentAt), key: `sep-${msg.sentAt}` });
    }

    if (!unreadDividerInserted && unreadDividerId && msg.id === unreadDividerId) {
      unreadDividerInserted = true;
      items.push({ type: 'unread-divider', key: 'unread-divider' });
    }

    const sameSenderAsPrev =
      !!prev && prev.fromUserId === msg.fromUserId && diffMinutes(msg.sentAt, prev.sentAt) < 5;
    const sameSenderAsNext =
      !!next && next.fromUserId === msg.fromUserId && diffMinutes(next.sentAt, msg.sentAt) < 5;

    const groupPosition: GroupPosition =
      !sameSenderAsPrev && !sameSenderAsNext
        ? 'solo'
        : !sameSenderAsPrev && sameSenderAsNext
        ? 'first'
        : sameSenderAsPrev && sameSenderAsNext
        ? 'middle'
        : 'last';

    const isMe = currentUserId
      ? msg.fromUserId === currentUserId
      : msg.fromRole === 'provider_owner' || msg.fromRole === 'provider_tech';

    items.push({
      type: 'message',
      message: msg,
      groupPosition,
      isLastRead: isMe && msg.id === lastReadMessageId,
    });
  }

  return items;
}

// ─── Header avatar ────────────────────────────────────────────────────────────

function HeaderAvatar({ name }: { name: string }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={`${name}'s avatar`}
    >
      <Text
        style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: colors.primary[700] }}
      >
        {initial}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProviderThreadScreen() {
  const goBack = useSafeBack();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { id: jobId, name, avatarUrl, serviceType, jobStatus } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatarUrl?: string;
    serviceType?: string;
    jobStatus?: string;
  }>();

  const userId = useAuthStore((s) => s.user?.id ?? null);
  const role = useAuthStore((s) => s.role);
  const fromRole: UserRole = role === 'provider_tech' ? 'provider_tech' : 'provider_owner';
  const isProviderRole = fromRole === 'provider_owner' || fromRole === 'provider_tech';

  const otherPartyName = name || 'Homeowner';
  const otherPartyAvatarUrl = avatarUrl || '';
  const otherPartyFirstName = otherPartyName.split(' ')[0] || 'them';

  const { messages, send, retry, loadOlder, isLoadingOlder, unreadDividerId, lastReadMessageId } =
    useThreadMessages({ jobId: jobId!, fromRole });

  const { isOtherTyping, broadcastTyping } = useTypingPresence(jobId ?? '', userId);

  const flatListRef = useRef<FlatList<ListItem>>(null);
  const [input, setInput] = useState('');
  const [showNewMsgPill, setShowNewMsgPill] = useState(false);

  const scrollOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const prevMsgCountRef = useRef(messages.length);

  const isAtBottom = useCallback(() => {
    return (
      contentHeightRef.current - layoutHeightRef.current - scrollOffsetRef.current < 200
    );
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    if (prevMsgCountRef.current === 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    } else if (messages.length > prevMsgCountRef.current) {
      if (isAtBottom()) {
        flatListRef.current?.scrollToEnd({ animated: true });
      } else {
        setShowNewMsgPill(true);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, isAtBottom]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
    contentHeightRef.current = e.nativeEvent.contentSize.height;
    layoutHeightRef.current = e.nativeEvent.layoutMeasurement.height;
    const bottomGap =
      contentHeightRef.current - layoutHeightRef.current - scrollOffsetRef.current;
    if (bottomGap < 200) setShowNewMsgPill(false);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowNewMsgPill(false);
  }, []);

  const onSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    broadcastTyping(false);
    send(trimmed);
  }, [input, send, broadcastTyping]);

  const onInputChange = useCallback(
    (text: string) => {
      setInput(text);
      broadcastTyping(text.length > 0);
    },
    [broadcastTyping],
  );

  const showQuickReplies = useMemo(() => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return false;
    if (lastMsg.fromUserId === userId) return false;
    if (messages.length < 3) return true;
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    return new Date(lastMsg.sentAt).getTime() < thirtyMinAgo;
  }, [messages, userId]);

  const sheetRef = useRef<BottomSheetWrapperHandle>(null);
  const [selectedMsg, setSelectedMsg] = useState<ThreadMessage | null>(null);

  const handleBubbleLongPress = useCallback((msg: ThreadMessage) => {
    setSelectedMsg(msg);
    sheetRef.current?.present();
  }, []);

  const listItems = useMemo(
    () => buildListItems(messages, userId, isProviderRole, unreadDividerId, lastReadMessageId),
    [messages, userId, isProviderRole, unreadDividerId, lastReadMessageId],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'day-separator') return <DaySeparator date={item.date} />;
      if (item.type === 'unread-divider') return <UnreadDivider />;

      const { message, groupPosition, isLastRead } = item;
      const isMe = userId
        ? message.fromUserId === userId
        : message.fromRole === 'provider_owner' || message.fromRole === 'provider_tech';
      const showAvatar = !isMe && (groupPosition === 'solo' || groupPosition === 'last');
      const showTimestamp = groupPosition === 'solo' || groupPosition === 'last';
      const marginTop = groupPosition === 'first' || groupPosition === 'solo' ? 12 : 6;

      return (
        <Animated.View
          entering={onlyNative(FadeInDown.duration(150))}
          style={{ marginTop }}
        >
          <MessageBubble
            message={message}
            groupPosition={groupPosition}
            isMe={isMe}
            showAvatar={showAvatar}
            showTimestamp={showTimestamp}
            isLastRead={isLastRead}
            otherPartyAvatarUrl={otherPartyAvatarUrl || null}
            otherPartyName={otherPartyName}
            onRetry={retry}
            onLongPress={handleBubbleLongPress}
          />
        </Animated.View>
      );
    },
    [userId, otherPartyAvatarUrl, otherPartyName, retry, handleBubbleLongPress],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'day-separator') return item.key;
    if (item.type === 'unread-divider') return item.key;
    return item.message.clientId ?? item.message.id;
  }, []);

  const keyboardOffset = 56 + insets.top;

  const chatContent = (
    <>
      <View style={{ flex: 1, position: 'relative' }}>
        {messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: 24 }}>
            <ThreadEmptyPanel
              otherPartyName={otherPartyName}
              otherPartyAvatarUrl={otherPartyAvatarUrl || null}
              serviceType={serviceType || null}
              isProvider={false}
            />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingOlder}
                onRefresh={loadOlder}
                tintColor={colors.primary[600]}
              />
            }
          />
        )}

        {isOtherTyping ? (
          <TypingIndicator avatarUrl={otherPartyAvatarUrl || null} name={otherPartyName} />
        ) : null}

        {showNewMsgPill ? <NewMessagePill onPress={handleScrollToBottom} /> : null}
      </View>

      {messages.length === 0 ? (
        <QuickReplyChips role="provider" onSelect={(text) => setInput(text)} />
      ) : showQuickReplies ? (
        <QuickReplyChips role="provider" onSelect={(text) => setInput(text)} />
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 8,
        }}
      >
        <Pressable
          hitSlop={12}
          onPress={() =>
            Alert.alert('Coming soon', 'Photo attachments are coming in a future update.')
          }
          accessibilityLabel="Attach photo"
        >
          <Camera size={22} color={colors.textSecondary} />
        </Pressable>
        <TextInput
          value={input}
          onChangeText={onInputChange}
          onBlur={() => broadcastTyping(false)}
          placeholder={`Message ${otherPartyFirstName}…`}
          placeholderTextColor={colors.textTertiary}
          multiline
          style={{
            flex: 1,
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            backgroundColor: colors.divider,
            borderRadius: 22,
            paddingVertical: 10,
            paddingHorizontal: 16,
            color: colors.textPrimary,
            maxHeight: 110,
          }}
        />
        <Pressable
          onPress={onSend}
          disabled={!input.trim()}
          accessibilityLabel="Send message"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: input.trim() ? colors.primary[600] : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send
            size={18}
            color={input.trim() ? colors.textInverse : colors.textTertiary}
          />
        </Pressable>
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          height: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Pressable
            onPress={goBack}
            hitSlop={8}
            accessibilityLabel="Go back"
            style={[
              { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>

          <HeaderAvatar name={otherPartyName} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text
                style={{ ...textStyles['title-md'], color: colors.textPrimary }}
                numberOfLines={1}
              >
                {otherPartyName}
              </Text>
              <View
                style={{
                  height: 22,
                  paddingHorizontal: 8,
                  borderRadius: 999,
                  backgroundColor: colors.primary[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 10,
                    color: colors.primary[700],
                  }}
                >
                  Homeowner
                </Text>
              </View>
            </View>

            {serviceType ? (
              <Pressable
                onPress={() => router.push(`/(provider)/jobs/${jobId}` as never)}
                accessibilityLabel={`${serviceType}${jobStatus ? ` · ${jobStatus}` : ''}. Tap to view job.`}
                hitSlop={4}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
              >
                <Text
                  style={{ ...textStyles['body-sm'], color: colors.textTertiary }}
                  numberOfLines={1}
                >
                  {serviceType}
                  {jobStatus ? ` · ${jobStatus}` : ''}
                </Text>
                <ChevronRight size={12} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => router.push(`/(provider)/jobs/${jobId}` as never)}
          hitSlop={8}
          accessibilityLabel="View job"
          style={[
            { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <ChevronRight size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={keyboardOffset}
      >
        {chatContent}
      </KeyboardAvoidingView>

      <BottomSheetWrapper ref={sheetRef} snapPoints={['30%']}>
        {selectedMsg ? (
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 11,
                color: colors.textTertiary,
                marginBottom: 8,
              }}
            >
              Sent {format(new Date(selectedMsg.sentAt), "EEE MMM d 'at' h:mm a")}
            </Text>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(selectedMsg.body);
                sheetRef.current?.dismiss();
              }}
              accessibilityRole="button"
              style={{ paddingVertical: 12 }}
            >
              <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>
                Copy text
              </Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <Pressable
              onPress={() => {
                sheetRef.current?.dismiss();
                Alert.alert('Report message', 'Thank you — our team will review this message.');
              }}
              accessibilityRole="button"
              style={{ paddingVertical: 12 }}
            >
              <Text style={{ ...textStyles['body-md'], color: colors.error }}>
                Report message
              </Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheetWrapper>
    </SafeAreaView>
  );
}

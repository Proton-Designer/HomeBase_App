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
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeBack } from '../../../lib/useSafeBack';
import { ChevronLeft, ChevronRight, Send, Camera } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { format } from 'date-fns';
import { isSameDay } from 'date-fns';
import { useThreadMessages, type ThreadMessage } from '../../../lib/messaging/useThreadMessages';
import { useTypingPresence } from '../../../lib/messaging/useTypingPresence';
import { useAuthStore } from '../../../stores/authStore';
import { useBreakpoint } from '../../../lib/useBreakpoint';
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

// ─── List item types ──────────────────────────────────────────────────────────

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
  unreadDividerId: string | null,
  lastReadMessageId: string | null,
): ListItem[] {
  const items: ListItem[] = [];
  let unreadDividerInserted = false;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    // Day separator
    if (!prev || !isSameDay(new Date(msg.sentAt), new Date(prev.sentAt))) {
      items.push({
        type: 'day-separator',
        date: new Date(msg.sentAt),
        key: `sep-${msg.sentAt}`,
      });
    }

    // Unread divider (before first unread message from other party)
    if (!unreadDividerInserted && unreadDividerId && msg.id === unreadDividerId) {
      unreadDividerInserted = true;
      items.push({ type: 'unread-divider', key: 'unread-divider' });
    }

    // Grouping
    const sameSenderAsPrev =
      !!prev &&
      prev.fromUserId === msg.fromUserId &&
      diffMinutes(msg.sentAt, prev.sentAt) < 5;
    const sameSenderAsNext =
      !!next &&
      next.fromUserId === msg.fromUserId &&
      diffMinutes(next.sentAt, msg.sentAt) < 5;

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
      : msg.fromRole === 'homeowner';

    items.push({
      type: 'message',
      message: msg,
      groupPosition,
      isLastRead: isMe && msg.id === lastReadMessageId,
    });
  }

  return items;
}

// ─── Inline avatar (32px for header) ─────────────────────────────────────────

function HeaderAvatar({ uri, name }: { uri: string; name: string }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: 32, height: 32, borderRadius: 16 }}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }
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

export default function ThreadScreen() {
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
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && bp === 'desktop';

  const otherPartyName = name || 'Provider';
  const otherPartyAvatarUrl = avatarUrl || '';
  const otherPartyFirstName = otherPartyName.split(' ')[0] || 'them';

  const { messages, send, retry, loadOlder, isLoadingOlder, unreadDividerId, lastReadMessageId } =
    useThreadMessages({ jobId: jobId!, fromRole: 'homeowner' });

  const { isOtherTyping, broadcastTyping } = useTypingPresence(jobId ?? '', userId);

  const flatListRef = useRef<FlatList<ListItem>>(null);
  const [input, setInput] = useState('');
  const [showNewMsgPill, setShowNewMsgPill] = useState(false);

  // Track scroll position for "new message" pill logic.
  const scrollOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const prevMsgCountRef = useRef(messages.length);
  const didInitialScrollRef = useRef(false);

  const isAtBottom = useCallback(() => {
    return (
      contentHeightRef.current - layoutHeightRef.current - scrollOffsetRef.current < 200
    );
  }, []);

  // Initial scroll fires via onContentSizeChange so it works whether the list
  // starts from cache (non-zero count at mount) or from a fresh fetch.
  const handleContentSizeChange = useCallback(() => {
    if (didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  // Handle new messages arriving while the thread is open.
  useEffect(() => {
    if (messages.length === 0) return;
    if (!didInitialScrollRef.current) {
      prevMsgCountRef.current = messages.length;
      return;
    }
    if (messages.length > prevMsgCountRef.current) {
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
    if (bottomGap < 200) {
      setShowNewMsgPill(false);
    }
  }, []);

  const handleScrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowNewMsgPill(false);
  }, []);

  // ─── Composer ──────────────────────────────────────────────────────────────

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

  // ─── Quick replies ─────────────────────────────────────────────────────────

  const showQuickReplies = useMemo(() => {
    if (messages.length === 0) return false; // ThreadEmptyPanel handles the empty state
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return false;
    const isLastFromMe = lastMsg.fromUserId === userId;
    if (isLastFromMe) return false;
    if (messages.length < 3) return true;
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    return new Date(lastMsg.sentAt).getTime() < thirtyMinAgo;
  }, [messages, userId]);

  // ─── Long-press action sheet ───────────────────────────────────────────────

  const sheetRef = useRef<BottomSheetWrapperHandle>(null);
  const [selectedMsg, setSelectedMsg] = useState<ThreadMessage | null>(null);

  const handleBubbleLongPress = useCallback((msg: ThreadMessage) => {
    setSelectedMsg(msg);
    sheetRef.current?.present();
  }, []);

  // ─── FlatList items ────────────────────────────────────────────────────────

  const listItems = useMemo(
    () => buildListItems(messages, userId, unreadDividerId, lastReadMessageId),
    [messages, userId, unreadDividerId, lastReadMessageId],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'day-separator') {
        return <DaySeparator date={item.date} />;
      }
      if (item.type === 'unread-divider') {
        return <UnreadDivider />;
      }

      const { message, groupPosition, isLastRead } = item;
      const isMe = userId
        ? message.fromUserId === userId
        : message.fromRole === 'homeowner';
      const showAvatar = !isMe && (groupPosition === 'solo' || groupPosition === 'last');
      const showTimestamp = groupPosition === 'solo' || groupPosition === 'last';
      const marginTop =
        groupPosition === 'first' || groupPosition === 'solo' ? 12 : 6;

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
            otherPartyAvatarUrl={otherPartyAvatarUrl}
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

  // ─── Chat content (shared between mobile + web desktop) ────────────────────

  const chatContent = (
    <>
      <View style={{ flex: 1, position: 'relative' }}>
        {messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: 24 }}>
            <ThreadEmptyPanel
              otherPartyName={otherPartyName}
              otherPartyAvatarUrl={otherPartyAvatarUrl || null}
              serviceType={serviceType || null}
              isProvider={true}
            />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 0,
              paddingBottom: 24,
              paddingTop: 12,
            }}
            onContentSizeChange={handleContentSizeChange}
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

        {/* Typing indicator (below FlatList, above chips/composer) */}
        {isOtherTyping ? (
          <TypingIndicator
            avatarUrl={otherPartyAvatarUrl || null}
            name={otherPartyName}
          />
        ) : null}

        {/* New message pill */}
        {showNewMsgPill ? (
          <NewMessagePill onPress={handleScrollToBottom} />
        ) : null}
      </View>

      {/* Quick replies */}
      {messages.length === 0 ? (
        <QuickReplyChips role="homeowner" onSelect={(text) => setInput(text)} />
      ) : showQuickReplies ? (
        <QuickReplyChips role="homeowner" onSelect={(text) => setInput(text)} />
      ) : null}

      {/* Composer */}
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

  const keyboardOffset = 56 + insets.top;

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
        {/* Left: back + avatar + name/role/job context */}
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

          <HeaderAvatar uri={otherPartyAvatarUrl} name={otherPartyName} />

          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Name + role badge */}
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
                  Provider
                </Text>
              </View>
            </View>

            {/* Job context line */}
            {serviceType ? (
              <Pressable
                onPress={() => router.push(`/(homeowner)/jobs/${jobId}` as never)}
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

        {/* Right: view job */}
        <Pressable
          onPress={() => router.push(`/(homeowner)/jobs/${jobId}` as never)}
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

      {/* Chat area */}
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
          keyboardVerticalOffset={keyboardOffset}
        >
          {chatContent}
        </KeyboardAvoidingView>
      )}

      {/* Long-press action sheet */}
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
              <Text
                style={{ ...textStyles['body-md'], color: colors.textPrimary }}
              >
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
              <Text
                style={{ ...textStyles['body-md'], color: colors.error }}
              >
                Report message
              </Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheetWrapper>
    </SafeAreaView>
  );
}

import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { Check } from 'lucide-react-native';
import { colors, textStyles } from '../../tokens';
import type { ThreadMessage } from '../../lib/messaging/useThreadMessages';

export type GroupPosition = 'solo' | 'first' | 'middle' | 'last';

interface MessageBubbleProps {
  message: ThreadMessage;
  groupPosition: GroupPosition;
  isMe: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  isLastRead: boolean;
  otherPartyAvatarUrl: string | null;
  otherPartyName: string;
  onRetry: (clientId: string) => void;
  onLongPress: (message: ThreadMessage) => void;
}

function getBubbleRadii(pos: GroupPosition, isMe: boolean) {
  // Values: topRight, topLeft, bottomRight, bottomLeft
  const map: Record<GroupPosition, [number, number, number, number]> = isMe
    ? { solo: [18, 18, 4, 18], first: [18, 18, 8, 18], middle: [8, 18, 8, 18], last: [8, 18, 4, 18] }
    : { solo: [18, 18, 18, 4], first: [18, 18, 18, 8], middle: [18, 8, 18, 8], last: [18, 8, 18, 4] };

  const [tr, tl, br, bl] = map[pos];
  return {
    borderTopRightRadius: tr,
    borderTopLeftRadius: tl,
    borderBottomRightRadius: br,
    borderBottomLeftRadius: bl,
  };
}

function SmallAvatar({ uri, name }: { uri: string | null; name: string }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: 28, height: 28, borderRadius: 14 }}
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: colors.primary[700] }}
      >
        {initial}
      </Text>
    </View>
  );
}

export function MessageBubble({
  message,
  groupPosition,
  isMe,
  showAvatar,
  showTimestamp,
  isLastRead,
  otherPartyAvatarUrl,
  otherPartyName,
  onRetry,
  onLongPress,
}: MessageBubbleProps) {
  const sending = message.status === 'sending';
  const failed = message.status === 'failed';
  const time = format(new Date(message.sentAt), 'h:mm a');

  return (
    <Pressable
      onLongPress={() => onLongPress(message)}
      delayLongPress={400}
      accessibilityHint="Long press for message options"
      style={[
        Platform.OS === 'web' ? ({ cursor: 'default' } as object) : null,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          paddingHorizontal: 16,
          gap: 8,
        }}
      >
        {/* Avatar / spacer (their side only) */}
        {!isMe && (
          showAvatar ? (
            <SmallAvatar uri={otherPartyAvatarUrl} name={otherPartyName} />
          ) : (
            <View style={{ width: 28 }} />
          )
        )}

        {/* Bubble content */}
        <View style={{ maxWidth: '78%', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
          <View
            style={[
              {
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: isMe ? colors.primary[600] : colors.surface,
                borderWidth: isMe ? 0 : 1,
                borderColor: colors.border,
                gap: 4,
              },
              getBubbleRadii(groupPosition, isMe),
              failed ? { borderWidth: 2, borderColor: colors.error } : null,
            ]}
          >
            <Text
              style={{
                ...textStyles['body-md'],
                color: isMe ? colors.textInverse : colors.textPrimary,
              }}
            >
              {message.body}
            </Text>

            {showTimestamp && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-end',
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 10,
                    color: isMe ? 'rgba(255,255,255,0.65)' : colors.textTertiary,
                  }}
                >
                  {time}
                </Text>

                {isMe && (
                  isLastRead ? (
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.65)',
                      }}
                    >
                      Seen
                    </Text>
                  ) : sending ? (
                    <ActivityIndicator size={10} color="rgba(255,255,255,0.7)" />
                  ) : (
                    <Check size={12} color="rgba(255,255,255,0.7)" />
                  )
                )}
              </View>
            )}
          </View>

          {failed && (
            <Pressable
              onPress={() => message.clientId && onRetry(message.clientId)}
              hitSlop={6}
              accessibilityLabel="Tap to retry sending this message"
            >
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 11,
                  color: colors.error,
                }}
              >
                Not delivered · Tap to retry
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

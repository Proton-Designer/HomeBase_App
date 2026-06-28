import React from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSafeBack } from '../../lib/useSafeBack';
import { ChevronLeft } from 'lucide-react-native';
import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Section } from '../../components/ui/Section';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { EmptyState } from '../../components/shared';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { listThreadsForProvider, type Thread } from '../../lib/api/messages';
import { useAuthStore } from '../../stores/authStore';
import { enterStaggered, usePress } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Time formatting ──────────────────────────────────────────────────────────

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
  providerId,
  onPress,
}: {
  thread: Thread;
  index: number;
  providerId: string | null;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  const hasUnread = thread.unreadCount > 0;
  const badgeLabel = thread.unreadCount > 9 ? '9+' : String(thread.unreadCount);
  const isLastFromMe = thread.lastSentByMe;

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
              style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.textInverse }}
            >
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

// ─── Back header (kept for provider screens that don't have a tab bar) ────────

function BackHeader({ onBack }: { onBack: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityLabel="Go back"
        style={[
          { padding: 8 },
          Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        ]}
      >
        <ChevronLeft size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProviderInboxScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const providerId = useAuthStore((s) => s.providerId);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['threads', 'provider', providerId],
    queryFn: () => listThreadsForProvider(providerId ?? ''),
    enabled: !!providerId,
  });

  // Before providerId resolves (or during first load) show skeleton rows —
  // otherwise the empty state flashes before any data is fetched.
  if (!providerId || (isLoading && threads.length === 0)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <BackHeader onBack={goBack} />
        <Section tight>
          <Eyebrow>Inbox</Eyebrow>
          <Text
            style={{ ...textStyles['editorial-title'], color: colors.textPrimary, marginTop: 6 }}
          >
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
        <BackHeader onBack={goBack} />
        <EmptyState
          heading="No messages yet"
          body="Messages from homeowners appear here once they book a job with you."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <BackHeader onBack={goBack} />
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
            providerId={providerId}
            onPress={() =>
              router.push({
                pathname: '/(provider)/thread/[id]',
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

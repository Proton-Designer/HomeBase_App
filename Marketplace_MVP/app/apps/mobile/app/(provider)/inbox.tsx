import React from 'react';
import { ScrollView, Text, View, Pressable, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Section } from '../../components/ui/Section';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { EmptyState } from '../../components/shared';
import { listThreadsForProvider, type Thread } from '../../lib/api/messages';
import { useAuthStore } from '../../stores/authStore';
import { enterStaggered, usePress } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProviderInboxScreen() {
  const router = useRouter();
  const providerId = useAuthStore((s) => s.providerId);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['threads', 'provider', providerId],
    queryFn: () => listThreadsForProvider(providerId ?? ''),
    enabled: !!providerId,
  });

  if (!isLoading && threads.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header onBack={() => router.back()} />
        <EmptyState
          heading="No messages yet"
          body="Homeowners will appear here once they message you about a booked job."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Header onBack={() => router.back()} />
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
            onPress={() => router.push(`/(provider)/thread/${t.jobId}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
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

function Avatar({ uri, name, size }: { uri: string | null; name: string; size: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
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

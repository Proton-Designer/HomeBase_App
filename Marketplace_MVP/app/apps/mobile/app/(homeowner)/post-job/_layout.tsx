import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { usePostingStore } from '../../../stores/postingStore';
import { colors, textStyles } from '../../../tokens';
import { STEP_TRANSITION_DURATION } from '../../../lib/motion';

const STEP_ROUTES = ['service', 'headline', 'description', 'photos', 'review', 'submitted'] as const;

const STEP_LABELS: Record<(typeof STEP_ROUTES)[number], string> = {
  service: 'Service',
  headline: 'Headline',
  description: 'Description',
  photos: 'Photos',
  review: 'Review',
  submitted: 'Posted',
};

const STACK_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: STEP_TRANSITION_DURATION,
  contentStyle: { backgroundColor: colors.background },
};

export default function PostJobLayout() {
  const router = useRouter();
  const segments = useSegments();
  const reset = usePostingStore((s) => s.resetDraft);

  const lastSegment = segments[segments.length - 1] as (typeof STEP_ROUTES)[number] | undefined;
  const currentIdx = lastSegment ? STEP_ROUTES.indexOf(lastSegment) : 0;
  const isFinal = lastSegment === 'submitted';

  const onCancel = () => {
    reset();
    router.replace('/(homeowner)/(tabs)/book');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        {!isFinal && currentIdx > 0 ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={[
              { padding: 8 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {STEP_ROUTES.slice(0, 5).map((step, i) => {
            const isCurrent = i === currentIdx;
            const isComplete = i < currentIdx;
            return (
              <View
                key={step}
                style={{
                  width: isCurrent ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isCurrent
                    ? colors.primary[600]
                    : isComplete
                      ? colors.accent[500]
                      : colors.border,
                }}
              />
            );
          })}
        </View>

        {!isFinal ? (
          <Pressable
            onPress={onCancel}
            hitSlop={8}
            style={[
              { padding: 8 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Text
              style={{
                ...textStyles['body-sm'],
                fontFamily: 'Inter_500Medium',
                color: colors.textSecondary,
              }}
            >
              Cancel
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <Stack screenOptions={STACK_OPTIONS} />

      {!isFinal ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              ...textStyles['body-sm'],
              fontFamily: 'Inter_500Medium',
              color: colors.textTertiary,
            }}
          >
            Step {currentIdx + 1} of 5 ·{' '}
            {STEP_LABELS[STEP_ROUTES[currentIdx] ?? 'service']}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

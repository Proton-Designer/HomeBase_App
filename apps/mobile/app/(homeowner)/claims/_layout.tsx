import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useSafeBack } from '../../../lib/useSafeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useClaimStore } from '../../../stores/claimStore';
import { colors, textStyles } from '../../../tokens';
import { STEP_TRANSITION_DURATION } from '../../../lib/motion';

const WIZARD_ROUTES = ['incident', 'description', 'photos', 'resolution', 'review'] as const;

const STEP_LABELS: Record<(typeof WIZARD_ROUTES)[number], string> = {
  incident: 'Incident',
  description: 'Description',
  photos: 'Photos',
  resolution: 'Resolution',
  review: 'Review',
};

const STACK_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: STEP_TRANSITION_DURATION,
  contentStyle: { backgroundColor: colors.background },
};

const NON_WIZARD = new Set(['submitted', '[id]', 'index']);

export default function ClaimsLayout() {
  const router = useRouter();
  const goBack = useSafeBack();
  const segments = useSegments();
  const resetDraft = useClaimStore((s) => s.resetDraft);

  const lastSegment = segments[segments.length - 1] as string | undefined;
  const isWizard = lastSegment !== undefined && !NON_WIZARD.has(lastSegment);

  const currentIdx = isWizard
    ? (WIZARD_ROUTES as readonly string[]).indexOf(lastSegment ?? '')
    : -1;

  const onCancel = () => {
    resetDraft();
    router.replace('/(homeowner)/(tabs)/jobs');
  };

  if (!isWizard) {
    return <Stack screenOptions={STACK_OPTIONS} />;
  }

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
        {currentIdx > 0 ? (
          <Pressable
            onPress={goBack}
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
          {WIZARD_ROUTES.map((route, i) => {
            const isCurrent = i === currentIdx;
            const isComplete = i < currentIdx;
            return (
              <View
                key={route}
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
      </View>

      <Stack screenOptions={STACK_OPTIONS} />

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
          {STEP_LABELS[WIZARD_ROUTES[currentIdx] ?? 'incident']}
        </Text>
      </View>
    </SafeAreaView>
  );
}

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from './ui/Card';
import { colors } from '../tokens';

export interface PhasePlaceholderProps {
  title: string;
  guideRef: string;
  description?: string;
  buildsInPhase?: 1 | 2 | 3;
}

export function PhasePlaceholder({
  title,
  guideRef,
  description,
  buildsInPhase = 2,
}: PhasePlaceholderProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 28,
            color: colors.textPrimary,
          }}
        >
          {title}
        </Text>
        <Card variant="outlined">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: colors.accent[100],
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 11,
                  color: colors.accent[700],
                }}
              >
                Phase {buildsInPhase}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 12,
                color: colors.textSecondary,
              }}
            >
              FRONTEND_GUIDE {guideRef}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: colors.textSecondary,
              lineHeight: 21,
            }}
          >
            {description ??
              'This screen is scaffolded in Phase 1 and gets its full implementation in the phase shown above. Navigation, design system, mocks, and shared components are already wired so this screen can drop in cleanly.'}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

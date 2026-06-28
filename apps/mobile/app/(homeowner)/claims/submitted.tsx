import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { celebrate } from '../../../lib/motion';
import { colors, textStyles } from '../../../tokens';

export default function ClaimSubmittedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    celebrate(scale, opacity);
  }, [scale, opacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          alignItems: 'center',
          gap: 16,
          flexGrow: 1,
          justifyContent: 'center',
          maxWidth: 600,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <Animated.View
          style={[
            {
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: colors.primary[600],
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 8,
            },
            iconStyle,
          ]}
        >
          <ShieldCheck size={56} color={colors.textInverse} strokeWidth={1.75} />
        </Animated.View>

        <Text
          style={{
            ...textStyles['editorial-title'],
            color: colors.textPrimary,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Claim filed
        </Text>

        <Text
          style={{
            ...textStyles['body-md'],
            color: colors.textSecondary,
            textAlign: 'center',
            paddingHorizontal: 12,
            lineHeight: 22,
          }}
        >
          We&apos;ve notified the provider and the MyHomebase team. We&apos;ll update you within 24 hours.
        </Text>

        <Card style={{ width: '100%', marginTop: 8 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary, marginBottom: 8 }}>
            While you wait
          </Text>
          {[
            "The provider's payout is held in escrow until resolved.",
            "You'll receive a push notification when your claim status changes.",
            'A MyHomebase team member may reach out for more information.',
          ].map((line, i) => (
            <Text
              key={i}
              style={{
                ...textStyles['body-sm'],
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              · {line}
            </Text>
          ))}
        </Card>
      </ScrollView>

      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 8,
        }}
      >
        <Button
          label="View claim details"
          size="lg"
          fullWidth
          onPress={() => {
            if (id) {
              router.replace(`/(homeowner)/claims/${id}`);
            } else {
              router.replace('/(homeowner)/claims/index');
            }
          }}
        />
        <Button
          label="Back to jobs"
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/(homeowner)/(tabs)/jobs')}
        />
      </View>
    </SafeAreaView>
  );
}

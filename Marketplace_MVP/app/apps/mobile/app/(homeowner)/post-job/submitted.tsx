import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { celebrate } from '../../../lib/motion';
import { track } from '../../../lib/api/events';
import { fetchPrimaryAddress } from '../../../lib/api/addresses';
import { useAuthStore } from '../../../stores/authStore';
import { colors, textStyles } from '../../../tokens';

export default function PostJobSubmittedStep() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const { data: primaryAddress } = useQuery({
    queryKey: ['homeowner-primary-address', userId],
    queryFn: () => fetchPrimaryAddress(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
  const postedToLabel = primaryAddress?.city
    ? `Posted to ${primaryAddress.city} pros`
    : 'Posted to pros near you';

  useEffect(() => {
    celebrate(scale, opacity);
    void track({ event: 'posting_created', metadata: { postingId: id } });
  }, [scale, opacity, id]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 16, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
        <Animated.View
          style={[
            {
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 24,
            },
            checkStyle,
          ]}
        >
          <Check size={56} color={colors.textInverse} strokeWidth={3} />
        </Animated.View>

        <Text
          style={{
            ...textStyles['editorial-title'],
            color: colors.textPrimary,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {postedToLabel}
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
          We&apos;ll notify you the moment a vetted pro responds. Most posts get their first
          quote within an hour.
        </Text>

        <Card style={{ width: '100%', marginTop: 16 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            While you wait
          </Text>
          <View style={{ marginTop: 8, gap: 4 }}>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              · You&apos;ll get a push when a quote arrives.
            </Text>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              · Edit or close your posting anytime from My Postings.
            </Text>
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              · Posts auto-close after 14 days if no quotes are accepted.
            </Text>
          </View>
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
          label="View my posting"
          size="lg"
          fullWidth
          onPress={() => {
            if (id) router.replace(`/(homeowner)/postings/${id}`);
            else router.replace('/(homeowner)/postings');
          }}
        />
        <Button
          label="Back to home"
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/(homeowner)/(tabs)/')}
        />
      </View>
    </View>
  );
}

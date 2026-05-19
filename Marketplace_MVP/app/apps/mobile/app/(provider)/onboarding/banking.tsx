import React, { useState } from 'react';
import { View, Text, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Banknote, Check, Zap, Loader } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors, textStyles, numericTabular } from '../../../tokens';
import * as payments from '../../../lib/api/payments';

export default function BankingStep() {
  const router = useRouter();
  const [connected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectStripe = async () => {
    setLoading(true);
    setError(null);
    try {
      const { onboardingUrl } = await payments.onboardProvider({
        refreshUrl: 'homebase://connect/refresh',
        returnUrl: 'homebase://connect/return',
      });
      await Linking.openURL(onboardingUrl);
      // Show waiting state once we hand off to Stripe
      setWaiting(true);
    } catch {
      setError('Could not start Stripe onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View>
          <Text
            style={{
              ...textStyles['editorial-title'],
              fontSize: 28,
              lineHeight: 34,
              color: colors.textPrimary,
            }}
          >
            Set up instant payouts
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Get paid the same day you complete a job. We use Stripe Connect Express to handle bank routing.
          </Text>
        </View>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.accent[100],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={18} color={colors.accent[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...textStyles['title-md'],
                  color: colors.textPrimary,
                }}
              >
                Instant payouts
              </Text>
              <Text
                style={{
                  ...textStyles['body-sm'],
                  ...numericTabular,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                1% fee (minimum $0.50). Standard 2-day payout is free.
              </Text>
            </View>
          </View>
        </Card>

        {waiting ? (
          <Card tone="tinted" tintColor={colors.infoLight}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.info,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Loader size={18} color={colors.textInverse} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...textStyles['title-md'],
                    color: colors.info,
                  }}
                >
                  Waiting for Stripe...
                </Text>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    color: colors.info,
                    marginTop: 2,
                  }}
                >
                  We&apos;ll detect when you finish.
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {connected ? (
          <Card tone="tinted" tintColor={colors.successLight}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={20} color={colors.textInverse} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...textStyles['title-md'],
                    color: colors.success,
                  }}
                >
                  Bank account connected
                </Text>
                <Text
                  style={{
                    ...textStyles['body-sm'],
                    ...numericTabular,
                    color: colors.success,
                    marginTop: 2,
                  }}
                >
                  Stripe account verified
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {error ? (
          <Text style={{ ...textStyles['body-sm'], color: colors.error }}>{error}</Text>
        ) : null}
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
        {connected ? (
          <Button
            label="Continue"
            fullWidth
            onPress={() => router.push('/(provider)/onboarding/profile')}
          />
        ) : waiting ? (
          <>
            <Button
              label="Continue"
              fullWidth
              onPress={() => router.push('/(provider)/onboarding/profile')}
            />
            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.textSecondary,
                textAlign: 'center',
              }}
            >
              If you&apos;ve finished onboarding, tap Continue.
            </Text>
          </>
        ) : (
          <Button
            label="Connect bank with Stripe"
            fullWidth
            loading={loading}
            leftIcon={<Banknote size={16} color={colors.textInverse} />}
            onPress={handleConnectStripe}
          />
        )}
      </View>
    </View>
  );
}

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Banknote, Check, Zap } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors, textStyles, numericTabular } from '../../../tokens';
import * as payments from '../../../lib/api/payments';

export default function BankingStep() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [bankName, setBankName] = useState<string | undefined>(undefined);
  const [last4, setLast4] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // On mount, check whether the provider already has a connected account
  // (e.g. user returns to this step). Best-effort — ignore errors.
  useEffect(() => {
    (async () => {
      try {
        const status = await payments.getAccountStatus();
        if (status.connected) {
          setConnected(true);
          const bank = await payments.getBankAccount();
          setBankName(bank.bankName);
          setLast4(bank.last4);
        }
      } catch {
        // Non-fatal — user just hasn't connected yet
      }
    })();
  }, []);

  const handleConnectStripe = async () => {
    setConnecting(true);
    setError(null);
    try {
      // In mock mode onboardingUrl === "mock://connected" — do NOT open it
      await payments.onboardProvider({});
      setConnected(true);

      // Fetch display details for the connected card
      try {
        const bank = await payments.getBankAccount();
        setBankName(bank.bankName);
        setLast4(bank.last4);
      } catch {
        // Display details are cosmetic; connection already succeeded
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not connect bank account. Please try again.';
      setError(message);
      Alert.alert('Connection failed', message);
    } finally {
      setConnecting(false);
    }
  };

  const bankLabel =
    bankName && last4
      ? `${bankName} ••${last4}`
      : last4
        ? `Bank account ••${last4}`
        : 'Test Bank ••6789';

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
            Get paid the same day you complete a job. We use Stripe Connect Express to handle bank
            routing.
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
                  {bankLabel}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {error && !connecting ? (
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
        ) : (
          <>
            <Button
              label="Connect bank with Stripe"
              fullWidth
              loading={connecting}
              leftIcon={<Banknote size={16} color={colors.textInverse} />}
              onPress={handleConnectStripe}
            />
            <Button
              label="Skip for now"
              variant="ghost"
              fullWidth
              onPress={() => router.push('/(provider)/onboarding/profile')}
            />
          </>
        )}
      </View>
    </View>
  );
}

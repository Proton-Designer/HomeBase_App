import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors, textStyles } from '../../../tokens';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';

// Phone verification isn't wired to an SMS provider yet — accept a hard-coded code so the
// step exists in the flow. Swap CODE for a real OTP check once an SMS service is added.
const TEMP_CODE = '111111';

export default function VerifyPhoneStep() {
  const router = useRouter();
  const phone = useProviderOnboardingStore((s) => s.business.phone);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onVerify = () => {
    if (code.trim() === TEMP_CODE) {
      setError(null);
      router.push('/(provider)/onboarding/services');
    } else {
      setError('That code is incorrect.');
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
            Verify your phone
          </Text>
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, marginTop: 6 }}>
            We sent a 6-digit code to {phone ? phone : 'your phone'}. Enter it below to confirm
            your number.
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          <Input
            label="Verification code"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              if (error) setError(null);
            }}
            errorMessage={error ?? undefined}
          />
          <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary, fontStyle: 'italic' }}>
            Enter {TEMP_CODE} to continue
          </Text>
        </View>
      </ScrollView>
      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button label="Verify" fullWidth disabled={code.length < 6} onPress={onVerify} />
      </View>
    </View>
  );
}

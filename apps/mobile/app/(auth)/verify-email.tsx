import React, { useState, useEffect } from 'react';
import { Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { enter } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';

const OTP_LENGTH = 6;

const schema = z.object({
  code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
});

type FormValues = z.infer<typeof schema>;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email, role } = useLocalSearchParams<{ email: string; role: string }>();
  const verifyEmailOtp = useAuthStore((s) => s.verifyEmailOtp);
  const resendEmailOtp = useAuthStore((s) => s.resendEmailOtp);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Tick down the resend cooldown so users can't spam (and trip Supabase rate limits).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';

  const { control, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
    mode: 'onChange',
  });

  const onPaste = async () => {
    let text: string;
    try {
      text = await Clipboard.getStringAsync();
    } catch {
      return;
    }
    const digits = (text ?? '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;
    setValue('code', digits, { shouldValidate: true });
    if (digits.length === OTP_LENGTH && !formState.isSubmitting) handleSubmit(onSubmit)();
  };

  const onSubmit = async (values: FormValues) => {
    if (formState.isSubmitting) return;
    setSubmitError(null);
    if (!email) {
      setSubmitError('Missing email. Go back and sign up again.');
      return;
    }
    const { error } = await verifyEmailOtp(email, values.code);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    // With a role (came from sign-up) route straight into the right onboarding. Without
    // one (came from sign-in's "email not confirmed" hop) defer to index, which routes
    // by the now-resolved role + onboarding state instead of assuming homeowner.
    if (role === 'provider_owner') {
      router.replace('/(provider)/onboarding/business');
    } else if (role === 'homeowner') {
      router.replace('/(auth)/address-setup');
    } else {
      router.replace('/');
    }
  };

  const onResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setSubmitError(null);
    setResendNote(null);
    try {
      const { error } = await resendEmailOtp(email);
      if (error) {
        setResendNote(error.message);
      } else {
        setResendNote('New code sent — check your email (and spam).');
        setCooldown(45);
      }
    } catch {
      setResendNote('Could not resend the code. Check your connection and try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreenShell keyboardAvoiding amberRule>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          { paddingBottom: 48, width: '100%' },
          isWebSplit
            ? { paddingHorizontal: 40, maxWidth: 420 }
            : { paddingHorizontal: 24, maxWidth: 520, alignSelf: 'center' },
        ]}
      >
        <AuthHeader
          eyebrow="Almost there"
          title="Enter your code"
          subtitle={`We sent a ${OTP_LENGTH}-digit code to ${email ?? 'your email'}. Enter it to verify your email.`}
          isWebSplit={isWebSplit}
        />

        <Animated.View entering={enter} style={{ marginTop: 28, gap: 18 }}>
          <Controller
            control={control}
            name="code"
            render={({ field, fieldState }) => (
              <Input
                label={`${OTP_LENGTH}-digit code`}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={handleSubmit(onSubmit)}
                returnKeyType="go"
                errorMessage={fieldState.error?.message}
              />
            )}
          />

          <Pressable
            onPress={onPaste}
            style={[
              { alignSelf: 'flex-start', paddingVertical: 4 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
            hitSlop={8}
          >
            <Text style={{ ...textStyles['body-sm'], color: colors.primary[600] }}>
              Paste from clipboard
            </Text>
          </Pressable>

          {submitError ? (
            <Text style={{ ...textStyles['body-sm'], color: colors.error }}>{submitError}</Text>
          ) : null}
          {resendNote ? (
            <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
              {resendNote}
            </Text>
          ) : null}

          <Button
            label="Verify email"
            fullWidth
            loading={formState.isSubmitting}
            disabled={!formState.isValid}
            onPress={handleSubmit(onSubmit)}
          />

          <Pressable
            onPress={onResend}
            disabled={resending || cooldown > 0}
            style={[
              { alignSelf: 'center', padding: 8 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
            hitSlop={8}
          >
            <Text
              style={{
                ...textStyles['body-sm'],
                color: cooldown > 0 ? colors.textTertiary : colors.primary[600],
              }}
            >
              {resending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : "Didn't get it? Resend code"}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </AuthScreenShell>
  );
}

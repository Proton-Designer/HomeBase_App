import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { WhyHomeBaseCallout, HOMEOWNER_BULLETS } from '../../components/auth/WhyHomeBaseCallout';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { enter } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const email = values.email.toLowerCase();
    const { error } = await signIn(email, values.password);
    if (error) {
      // An unconfirmed account can't sign in — don't dead-end on the error, send the
      // user to verify their email (where they can enter or resend the code).
      if (/email not confirmed|not confirmed/i.test(error.message)) {
        router.push({ pathname: '/(auth)/verify-email', params: { email } });
        return;
      }
      setSubmitError(error.message);
      return;
    }
    router.replace('/');
  };

  return (
    <AuthScreenShell keyboardAvoiding amberRule>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          {
            paddingBottom: 48,
            width: '100%',
          },
          isWebSplit
            ? { paddingHorizontal: 40, maxWidth: 420 }
            : { paddingHorizontal: 24, maxWidth: 520, alignSelf: 'center' },
        ]}
      >
        <AuthHeader
          eyebrow="Welcome back"
          title="Sign in to your MyHomebase"
          subtitle="Manage bookings, message your pros, and review jobs."
          isWebSplit={isWebSplit}
        />

        <Animated.View entering={enter} style={{ marginTop: 28, gap: 18 }}>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                spellCheck={false}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                errorMessage={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                textContentType="password"
                autoComplete="current-password"
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
            hitSlop={6}
            style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
          >
            <Text
              style={{
                ...textStyles['body-sm'],
                fontFamily: 'Inter_600SemiBold',
                color: colors.primary[600],
                textAlign: 'right',
              }}
            >
              Forgot password?
            </Text>
          </Pressable>
        </Animated.View>

        {submitError ? (
          <View
            style={{
              marginTop: 16,
              backgroundColor: colors.errorLight,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ ...textStyles['body-sm'], color: colors.error }}>{submitError}</Text>
          </View>
        ) : null}

        <Animated.View entering={enter} style={{ marginTop: 24, gap: 12 }}>
          <Button
            label="Sign in"
            fullWidth
            size="lg"
            loading={formState.isSubmitting}
            disabled={!formState.isValid}
            onPress={handleSubmit(onSubmit)}
          />
        </Animated.View>

        {!isWebSplit ? (
          <WhyHomeBaseCallout title="Why MyHomebase" bullets={HOMEOWNER_BULLETS} />
        ) : null}

        <Pressable
          onPress={() => router.replace('/(auth)/sign-up')}
          style={[
            { marginTop: 24 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            New to MyHomebase?{' '}
            <Text
              style={{
                color: colors.primary[600],
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Create account
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </AuthScreenShell>
  );
}

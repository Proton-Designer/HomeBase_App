import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { enter } from '../../lib/motion';
import { colors, textStyles, fonts } from '../../tokens';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^\+?[1-9]\d{7,14}$/.test(v), 'Use a valid phone number'),
});

type FormValues = z.infer<typeof schema>;

const HOMEOWNER_BULLETS: string[] = [
  'One vetted pro per booking',
  'Same-day pay for the people who do the work',
  'Real protection, not fine print',
];

const PROVIDER_BULLETS: string[] = [
  'No lead fees — paid only when a job completes',
  'Instant payouts via Stripe, not 7–30 day waits',
  'You set your service area and availability',
];

type SignUpMode = 'homeowner' | 'provider';

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const initialMode: SignUpMode = params.role === 'provider' ? 'provider' : 'homeowner';
  const [mode, setMode] = useState<SignUpMode>(initialMode);
  const isProvider = mode === 'provider';

  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';
  const signUp = useAuthStore((s) => s.signUp);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', phone: '' },
  });

  const copy = useMemo(
    () =>
      isProvider
        ? {
            eyebrow: 'For service businesses',
            title: 'Grow your business with HomeBase',
            subtitle: 'Replace lead fees with completion-based jobs from real homeowners.',
            cta: 'Create business account',
            calloutTitle: 'Why providers choose HomeBase',
            bullets: PROVIDER_BULLETS,
            nameLabel1: 'Owner first name',
            nameLabel2: 'Owner last name',
          }
        : {
            eyebrow: 'Step 1 of 3',
            title: 'Welcome to HomeBase',
            subtitle: 'Find verified pros in your neighborhood — no spam, ever.',
            cta: 'Create account',
            calloutTitle: 'Why HomeBase',
            bullets: HOMEOWNER_BULLETS,
            nameLabel1: 'First name',
            nameLabel2: 'Last name',
          },
    [isProvider]
  );

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const { error, needsEmailConfirmation } = await signUp({
      email: values.email,
      password: values.password,
      role: isProvider ? 'provider_owner' : 'homeowner',
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
    });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    if (needsEmailConfirmation) {
      setConfirmEmail(values.email);
      setNeedsConfirmation(true);
      return;
    }
    router.replace(isProvider ? '/(provider)/onboarding/business' : '/(auth)/address-setup');
  };

  if (needsConfirmation && confirmEmail) {
    const confirmContent = (
      <View
        style={[
          { gap: 12 },
          isWebSplit
            ? { width: '100%', maxWidth: 420, paddingHorizontal: 40 }
            : { flex: 1, paddingHorizontal: 24, paddingTop: 64 },
        ]}
      >
        <Eyebrow tone="accent">Almost there</Eyebrow>
        <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
          Check your email
        </Text>
        <Text style={{ ...textStyles['body-lg'], color: colors.textSecondary }}>
          We sent a confirmation link to{' '}
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.textPrimary }}>
            {confirmEmail}
          </Text>
          . Open it on this device to finish setting up your HomeBase.
        </Text>
        <Button
          label="Back to sign in"
          variant="outline"
          fullWidth
          onPress={() => router.replace('/(auth)/sign-in')}
          style={{ marginTop: 16 }}
        />
      </View>
    );

    if (isWebSplit) {
      return (
        <AuthSplitLayout>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {confirmContent}
          </View>
        </AuthSplitLayout>
      );
    }
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {confirmContent}
      </SafeAreaView>
    );
  }

  const formContent = (
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
      {/* Header */}
      <Animated.View entering={enter} style={{ gap: 4, marginTop: isWebSplit ? 0 : 8 }}>
        {!isWebSplit && (
          <Text
            style={{
              fontFamily: fonts.body,
              fontStyle: 'italic',
              fontSize: 12,
              lineHeight: 17,
              color: colors.textTertiary,
              letterSpacing: 0.2,
            }}
          >
            HomeBase · Issue 01
          </Text>
        )}
        <View style={{ height: 6 }} />
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <View style={{ height: 6 }} />
        <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
          {copy.title}
        </Text>
        <Text
          style={{
            ...textStyles['body-lg'],
            color: colors.textSecondary,
            marginTop: 8,
          }}
        >
          {copy.subtitle}
        </Text>
      </Animated.View>

      {/* Role toggle */}
      <Animated.View
        entering={enter}
        style={{
          marginTop: 20,
          flexDirection: 'row',
          backgroundColor: colors.primary[50],
          borderRadius: 12,
          padding: 4,
          gap: 4,
        }}
      >
        <RoleToggleButton
          label="I'm a homeowner"
          selected={!isProvider}
          onPress={() => setMode('homeowner')}
        />
        <RoleToggleButton
          label="I run a service business"
          selected={isProvider}
          onPress={() => setMode('provider')}
        />
      </Animated.View>

      {/* Form fields */}
      <Animated.View entering={enter} style={{ marginTop: 28, gap: 18 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Input
                  label={copy.nameLabel1}
                  placeholder="Alex"
                  autoCapitalize="words"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="lastName"
              render={({ field, fieldState }) => (
                <Input
                  label={copy.nameLabel2}
                  placeholder="Reyes"
                  autoCapitalize="words"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />
          </View>
        </View>
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
              placeholder="At least 8 characters"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              helperText={fieldState.error ? undefined : 'Min 8 chars, 1 uppercase, 1 number'}
              errorMessage={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Input
              label="Phone (optional)"
              placeholder="+1 555 123 4567"
              keyboardType="phone-pad"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              helperText="For SMS job updates"
              errorMessage={fieldState.error?.message}
            />
          )}
        />
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

      <Animated.View entering={enter} style={{ marginTop: 24 }}>
        <Button
          label={copy.cta}
          size="lg"
          fullWidth
          loading={formState.isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      </Animated.View>

      <Text
        style={{
          ...textStyles['body-sm'],
          color: colors.textTertiary,
          textAlign: 'center',
          marginTop: 16,
        }}
      >
        By continuing you agree to HomeBase&apos;s{' '}
        <Text style={{ color: colors.primary[600], fontFamily: 'Inter_600SemiBold' }}>
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text style={{ color: colors.primary[600], fontFamily: 'Inter_600SemiBold' }}>
          Privacy Policy
        </Text>
        .
      </Text>

      {/* "Why HomeBase" callout — only on native/mobile-web */}
      {!isWebSplit ? (
        <Animated.View
          entering={enter}
          style={{
            marginTop: 28,
            backgroundColor: colors.primary[50],
            borderRadius: 12,
            padding: 16,
            gap: 10,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.displaySemibold,
              fontSize: 13,
              lineHeight: 18,
              color: colors.primary[700],
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {copy.calloutTitle}
          </Text>
          {copy.bullets.map((bullet) => (
            <View key={bullet} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.accent[500],
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.textSecondary,
                  flex: 1,
                }}
              >
                {bullet}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}

      <Pressable
        onPress={() => router.replace('/(auth)/sign-in')}
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
          Already have an account?{' '}
          <Text style={{ color: colors.primary[600], fontFamily: 'Inter_600SemiBold' }}>
            Sign in
          </Text>
        </Text>
      </Pressable>
    </ScrollView>
  );

  if (isWebSplit) {
    return (
      <AuthSplitLayout>
        <View style={{ width: '100%', maxWidth: 420, flex: 1, justifyContent: 'center' }}>
          {formContent}
        </View>
      </AuthSplitLayout>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Amber top rule */}
        <View
          style={{
            height: 2,
            width: 80,
            backgroundColor: colors.accent[500],
            marginLeft: 24,
            marginTop: 8,
            borderRadius: 1,
          }}
        />
        <Pressable
          onPress={() => router.back()}
          style={[
            { padding: 12, marginLeft: 8, marginTop: 4 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
          hitSlop={8}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        {formContent}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleToggleButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 9,
          backgroundColor: selected ? colors.surface : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
      ]}
    >
      <Text
        style={{
          fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_500Medium',
          fontSize: 13,
          color: selected ? colors.primary[700] : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { enter, smoothLayout } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
});

type FormValues = z.infer<typeof schema>;

type SignUpMode = 'homeowner' | 'provider';

interface ModeCopy {
  eyebrow?: string;
  title: string;
  subtitle: string;
  cta: string;
  nameLabel1: string;
  nameLabel2: string;
}

const HEADER_COPY: Record<SignUpMode, ModeCopy> = {
  provider: {
    eyebrow: 'For service businesses',
    title: 'Grow your business with MyHomebase',
    subtitle: 'Replace lead fees with completion-based jobs from real homeowners.',
    cta: 'Create business account',
    nameLabel1: 'Owner first name',
    nameLabel2: 'Owner last name',
  },
  homeowner: {
    eyebrow: undefined,
    title: 'Welcome to MyHomebase',
    subtitle: 'Find verified pros in your neighborhood — no spam, ever.',
    cta: 'Create account',
    nameLabel1: 'First name',
    nameLabel2: 'Last name',
  },
};

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const initialMode: SignUpMode = params.role === 'provider' ? 'provider' : 'homeowner';
  const [mode, setMode] = useState<SignUpMode>(initialMode);
  const isProvider = mode === 'provider';

  // Two persistent header layers (homeowner + provider) are stacked and cross-faded
  // by a single progress value — the text in each layer never changes, so there's no
  // JS-thread re-render mid-animation and no blank trough. progress: 0 = homeowner, 1 = provider.
  const headerProgress = useSharedValue(initialMode === 'provider' ? 1 : 0);
  const homeownerHeaderStyle = useAnimatedStyle(() => ({ opacity: 1 - headerProgress.value }));
  const providerHeaderStyle = useAnimatedStyle(() => ({ opacity: headerProgress.value }));
  // Lock the header area to the tallest variant it has rendered so switching
  // roles (provider copy is taller) never reflows the form below it.
  const [headerMinH, setHeaderMinH] = useState(0);

  const selectMode = useCallback(
    (next: SignUpMode) => {
      setMode(next);
      headerProgress.value = withTiming(next === 'provider' ? 1 : 0, {
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
      });
    },
    [headerProgress],
  );

  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';
  const signUp = useAuthStore((s) => s.signUp);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  // Form labels + CTA track the toggle instantly (driven by `mode`); only the
  // header copy cross-fades via the two stacked layers below.
  const copy = HEADER_COPY[mode];

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const { error, needsEmailConfirmation } = await signUp({
      email: values.email,
      password: values.password,
      role: isProvider ? 'provider_owner' : 'homeowner',
      firstName: values.firstName,
      lastName: values.lastName,
    });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    if (needsEmailConfirmation) {
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: values.email, role: isProvider ? 'provider_owner' : 'homeowner' },
      });
      return;
    }
    router.replace(isProvider ? '/(provider)/onboarding/business' : '/(auth)/address-setup');
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
        <Animated.View
          entering={enter}
          style={{ position: 'relative', minHeight: headerMinH || undefined }}
        >
          {/* Invisible in-flow sizer holds the box open to the current copy's height
              (grow-only, so it locks to the taller provider variant once seen). The two
              real layers are absolute and overlap, so the cross-fade never reflows the
              form below. */}
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              setHeaderMinH((prev) => (h > prev ? h : prev));
            }}
            style={{ opacity: 0 }}
          >
            <AuthHeader
              eyebrow={copy.eyebrow}
              title={copy.title}
              subtitle={copy.subtitle}
              isWebSplit={isWebSplit}
              animateOnMount={false}
            />
          </View>
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, homeownerHeaderStyle]}
          >
            <AuthHeader
              eyebrow={HEADER_COPY.homeowner.eyebrow}
              title={HEADER_COPY.homeowner.title}
              subtitle={HEADER_COPY.homeowner.subtitle}
              isWebSplit={isWebSplit}
              animateOnMount={false}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, providerHeaderStyle]}
          >
            <AuthHeader
              eyebrow={HEADER_COPY.provider.eyebrow}
              title={HEADER_COPY.provider.title}
              subtitle={HEADER_COPY.provider.subtitle}
              isWebSplit={isWebSplit}
              animateOnMount={false}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={enter}
          layout={smoothLayout}
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
            label="Homeowner"
            selected={!isProvider}
            onPress={() => selectMode('homeowner')}
          />
          <RoleToggleButton
            label="Service business"
            selected={isProvider}
            onPress={() => selectMode('provider')}
          />
        </Animated.View>

        <Animated.View entering={enter} layout={smoothLayout} style={{ marginTop: 28, gap: 18 }}>
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
                placeholder="At least 8 characters"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                helperText={fieldState.error ? undefined : 'Min 8 chars, 1 uppercase, 1 number'}
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

        <Animated.View entering={enter} layout={smoothLayout} style={{ marginTop: 24 }}>
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
          By continuing you agree to MyHomebase&apos;s{' '}
          <Text style={{ color: colors.primary[600], fontFamily: 'Inter_600SemiBold' }}>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text style={{ color: colors.primary[600], fontFamily: 'Inter_600SemiBold' }}>
            Privacy Policy
          </Text>
          .
        </Text>

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
    </AuthScreenShell>
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
        numberOfLines={1}
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

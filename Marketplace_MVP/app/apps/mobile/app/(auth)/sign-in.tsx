import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { enter } from '../../lib/motion';
import { colors, textStyles, fonts } from '../../tokens';

const WHY_BULLETS: string[] = [
  'One vetted pro per booking',
  'Same-day pay for the people who do the work',
  'Real protection, not fine print',
];

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';

  const onSignIn = async () => {
    setLoading(true);
    setSubmitError(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    router.replace('/');
  };

  const formContent = (
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
        <Eyebrow>Welcome back</Eyebrow>
        <View style={{ height: 6 }} />
        <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
          Sign in to your HomeBase
        </Text>
        <Text
          style={{
            ...textStyles['body-lg'],
            color: colors.textSecondary,
            marginTop: 8,
          }}
        >
          Manage bookings, message your pros, and review jobs.
        </Text>
      </Animated.View>

      {/* Form fields */}
      <Animated.View entering={enter} style={{ marginTop: 28, gap: 18 }}>
        <Input
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSignIn}
          returnKeyType="go"
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
          loading={loading}
          disabled={!email || !password}
          onPress={onSignIn}
        />
      </Animated.View>

      {/* "Why HomeBase" editorial callout — only shown on native/mobile-web */}
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
            Why HomeBase
          </Text>
          {WHY_BULLETS.map((bullet) => (
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
          New to HomeBase?{' '}
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

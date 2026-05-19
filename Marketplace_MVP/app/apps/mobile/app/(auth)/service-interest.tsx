import React, { useState } from 'react';
import { Alert, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { enter } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';

interface ServicePill {
  id: string;
  label: string;
  available: boolean;
}

const services: ServicePill[] = [
  { id: 'lawn', label: 'Lawn Care', available: true },
  { id: 'cleaning', label: 'Home Cleaning', available: true },
  { id: 'pool', label: 'Pool Cleaning', available: true },
  { id: 'pest', label: 'Pest Control', available: true },
  { id: 'pressure', label: 'Pressure Washing', available: true },
  { id: 'window', label: 'Window Cleaning', available: true },
  { id: 'gutter', label: 'Gutter Cleaning', available: false },
  { id: 'detailing', label: 'Car Detailing', available: false },
  { id: 'tree', label: 'Tree & Plant Trimming', available: false },
  { id: 'solar', label: 'Solar Panel Cleaning', available: false },
];

export default function ServiceInterestScreen() {
  const router = useRouter();
  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';
  const status = useAuthStore((s) => s.status);
  const pending = useAuthStore((s) => s.pendingHomeownerSetup);
  const setPending = useAuthStore((s) => s.setPendingHomeownerSetup);
  const flush = useAuthStore((s) => s.flushPendingHomeownerSetup);
  const [selected, setSelected] = useState<string[]>(['lawn']);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    const svc = services.find((s) => s.id === id);
    if (!svc?.available) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const onContinue = async () => {
    setSubmitting(true);
    if (pending) {
      setPending({ ...pending, serviceInterests: selected });
    }

    if (status === 'authenticated') {
      await flush();
      const stillPending = useAuthStore.getState().pendingHomeownerSetup;
      if (stillPending) {
        setSubmitting(false);
        Alert.alert(
          "We couldn't save your address",
          'Please try again. If the problem continues, sign out and sign back in.',
        );
        return;
      }
      setSubmitting(false);
      router.replace('/(homeowner)/(tabs)/');
      return;
    }

    // Not yet authenticated — sign-up still needs email confirmation. The
    // address + service selections are saved as pending and flush automatically
    // on the first real session. Send the user to sign in afterwards.
    setSubmitting(false);
    Alert.alert(
      'Confirm your email',
      'We saved your preferences. Please confirm your email, then sign in to finish setup.',
    );
    router.replace('/(auth)/sign-in');
  };

  const formContent = (
    <ScrollView
      contentContainerStyle={[
        { paddingBottom: 48, width: '100%' },
        isWebSplit
          ? { paddingHorizontal: 40, maxWidth: 460 }
          : { paddingHorizontal: 24, maxWidth: 640, alignSelf: 'center' },
      ]}
    >
      <Animated.View entering={enter} style={{ gap: 8, marginTop: isWebSplit ? 0 : 8 }}>
        <Eyebrow>Step 3 of 3</Eyebrow>
        <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
          What services do you need?
        </Text>
        <Text style={{ ...textStyles['body-lg'], color: colors.textSecondary }}>
          Select all that apply. You can change this later.
        </Text>
      </Animated.View>

      <Animated.View
        entering={enter}
        style={{ marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
      >
        {services.map((svc) => {
          const isSelected = selected.includes(svc.id);
          return (
            <Chip
              key={svc.id}
              label={svc.available ? svc.label : `${svc.label} · soon`}
              selected={isSelected && svc.available}
              disabled={!svc.available}
              onPress={() => toggle(svc.id)}
            />
          );
        })}
      </Animated.View>

      <Animated.View entering={enter} style={{ marginTop: 36 }}>
        <Button
          label={`Continue with ${selected.length} ${selected.length === 1 ? 'service' : 'services'}`}
          size="lg"
          fullWidth
          disabled={selected.length === 0}
          loading={submitting}
          onPress={onContinue}
        />
      </Animated.View>
    </ScrollView>
  );

  if (isWebSplit) {
    return (
      <AuthSplitLayout>
        <View style={{ width: '100%', maxWidth: 460, flex: 1, justifyContent: 'center' }}>
          {formContent}
        </View>
      </AuthSplitLayout>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
    </SafeAreaView>
  );
}

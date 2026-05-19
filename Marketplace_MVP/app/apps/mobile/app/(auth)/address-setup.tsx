import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { enter } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';

export default function AddressSetupScreen() {
  const router = useRouter();
  const setPendingHomeownerSetup = useAuthStore((s) => s.setPendingHomeownerSetup);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [zip, setZip] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';

  const canContinue =
    street.trim().length > 0 &&
    city.trim().length > 0 &&
    region.trim().length > 0 &&
    zip.trim().length > 0;

  const onContinue = () => {
    if (!canContinue) return;
    setPendingHomeownerSetup({
      street: street.trim(),
      city: city.trim(),
      state: region.trim(),
      zip: zip.trim(),
      neighborhood: neighborhood.trim() || null,
    });
    router.push('/(auth)/service-interest');
  };

  const formContent = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        { paddingBottom: 48, width: '100%' },
        isWebSplit
          ? { paddingHorizontal: 40, maxWidth: 420 }
          : { paddingHorizontal: 24, maxWidth: 520, alignSelf: 'center' },
      ]}
    >
      <Animated.View entering={enter} style={{ gap: 8, marginTop: isWebSplit ? 0 : 8 }}>
        <Eyebrow>Step 2 of 3</Eyebrow>
        <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
          Where is your home?
        </Text>
        <Text style={{ ...textStyles['body-lg'], color: colors.textSecondary }}>
          We&apos;ll match you with verified pros serving your block.
        </Text>
      </Animated.View>

      <Animated.View entering={enter} style={{ marginTop: 24, gap: 16 }}>
        <Input
          label="Street address"
          placeholder="123 Main St"
          value={street}
          onChangeText={setStreet}
          autoCapitalize="words"
          leftIcon={<MapPin size={18} color={colors.textSecondary} />}
        />
        <Input
          label="City"
          placeholder="City"
          value={city}
          onChangeText={setCity}
          autoCapitalize="words"
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="State"
              placeholder="TX"
              value={region}
              onChangeText={setRegion}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="ZIP code"
              placeholder="78704"
              value={zip}
              onChangeText={setZip}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>
        <Input
          label="Neighborhood (optional)"
          placeholder="e.g. Stonebridge Ranch"
          value={neighborhood}
          onChangeText={setNeighborhood}
          autoCapitalize="words"
        />
      </Animated.View>

      <Animated.View entering={enter} style={{ marginTop: 32 }}>
        <Button
          label="Continue"
          size="lg"
          fullWidth
          disabled={!canContinue}
          onPress={onContinue}
        />
      </Animated.View>
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

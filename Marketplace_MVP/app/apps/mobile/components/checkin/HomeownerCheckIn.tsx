import React, { useEffect, useState } from 'react';
import { Alert, Platform, View, Text, Pressable, Image, Modal, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInRight,
  SlideOutDown,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Star, Camera, X, TrendingUp, Check } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { celebrate, onlyNative } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';
import { pickImageFromLibrary, uploadAsset } from '../../lib/api/storage';
import { captureOnCompletion } from '../../lib/api/payments';
import { useBreakpoint } from '../../lib/useBreakpoint';

type Reliability = 'on_time' | 'bit_late' | 'very_late';
type Communication = 'great' | 'fine' | 'poor';
type Professionalism = 'very' | 'mostly' | 'concerns';

interface HomeownerCheckInState {
  reliability: Reliability | null;
  quality: number;
  communication: Communication | null;
  professionalism: Professionalism | null;
  photoUri: string | null;
  photoPath: string | null;
  photoUploading: boolean;
}

const initial: HomeownerCheckInState = {
  reliability: null,
  quality: 0,
  communication: null,
  professionalism: null,
  photoUri: null,
  photoPath: null,
  photoUploading: false,
};

export interface HomeownerCheckInProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  providerName: string;
  providerAvatarUrl?: string;
  serviceLabel: string;
  onSubmit?: (state: Omit<HomeownerCheckInState, 'photoUri' | 'photoUploading'>) => void | Promise<void>;
}

export function HomeownerCheckIn({
  visible,
  onClose,
  jobId,
  providerName,
  providerAvatarUrl,
  serviceLabel,
  onSubmit,
}: HomeownerCheckInProps) {
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && (bp === 'tablet' || bp === 'desktop');
  const [step, setStep] = useState(0);
  const [state, setState] = useState<HomeownerCheckInState>(initial);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setState(initial);
    }
  }, [visible]);

  useEffect(() => {
    if (step === 0 && visible) {
      const t = setTimeout(() => advance(), 1700);
      return () => clearTimeout(t);
    }
  }, [step, visible]);

  const advance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setStep((s) => s + 1);
  };

  const submit = async () => {
    if (state.photoUploading) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const { photoUri: _photoUri, photoUploading: _photoUploading, ...submitState } = state;
    setStep(6);
    try {
      await Promise.resolve(onSubmit?.(submitState));
    } catch (e) {
      console.error('[HomeownerCheckIn] onSubmit failed:', e);
    }
    try {
      await captureOnCompletion({ jobId });
    } catch (e) {
      console.error('[HomeownerCheckIn] captureOnCompletion failed:', e);
      Alert.alert(
        'Payment capture failed',
        'Your review was saved. We were unable to process the payment — our team will retry shortly.',
      );
    }
  };

  const onPickPhoto = async () => {
    const asset = await pickImageFromLibrary();
    if (!asset) return;
    setState((s) => ({ ...s, photoUri: asset.uri, photoUploading: true }));
    try {
      const result = await uploadAsset(
        'booking-photos',
        `${jobId}/after-homeowner-${Date.now()}.jpg`,
        asset,
      );
      setState((s) => ({ ...s, photoPath: result.path, photoUploading: false }));
    } catch {
      setState((s) => ({ ...s, photoUploading: false, photoUri: null }));
      Alert.alert('Upload failed', 'Please try again.');
    }
  };

  const finish = () => {
    onClose();
  };

  if (!visible) return null;

  const header = (
    <View
      style={{
        paddingTop: isWebDesktop ? 8 : 60,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              width: i === Math.min(step, 4) ? 22 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                i < step ? colors.accent[500] : i === Math.min(step, 4) ? colors.primary[600] : colors.border,
            }}
          />
        ))}
      </View>
      {step < 6 ? (
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={isWebDesktop ? ({ cursor: 'pointer' } as object) : undefined}
        >
          <X size={22} color={colors.textSecondary} />
        </Pressable>
      ) : (
        <View style={{ width: 22 }} />
      )}
    </View>
  );

  const stepContent = (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      {step === 0 ? (
            <Animated.View entering={onlyNative(FadeIn.duration(280))} style={{ alignItems: 'center', gap: 12 }}>
              {providerAvatarUrl ? (
                <Image
                  source={{ uri: providerAvatarUrl }}
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                />
              ) : (
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: colors.primary[100],
                  }}
                />
              )}
              <Text
                style={{
                  ...textStyles['editorial-title'],
                  fontSize: 26,
                  lineHeight: 32,
                  color: colors.textPrimary,
                  textAlign: 'center',
                  marginTop: 12,
                }}
              >
                How was your {serviceLabel} with {providerName.split(' ')[0]}?
              </Text>
              <Text
                style={{
                  ...textStyles['body-md'],
                  color: colors.textSecondary,
                  textAlign: 'center',
                }}
              >
                15 seconds. Helps your neighbors find the best.
              </Text>
            </Animated.View>
          ) : null}

          {step === 1 ? (
            <Question
              key="reliability"
              title={`Did ${providerName.split(' ')[0]} show up on time?`}
              options={[
                { id: 'on_time', label: 'Early / On time' },
                { id: 'bit_late', label: 'A bit late' },
                { id: 'very_late', label: 'Very late / No-show' },
              ]}
              selected={state.reliability}
              onSelect={(v) => {
                setState((s) => ({ ...s, reliability: v as Reliability }));
                setTimeout(advance, 220);
              }}
            />
          ) : null}

          {step === 2 ? (
            <QualityStars
              value={state.quality}
              onChange={(v) => {
                setState((s) => ({ ...s, quality: v }));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              onContinue={() => state.quality > 0 && advance()}
            />
          ) : null}

          {step === 3 ? (
            <Question
              key="communication"
              title="How was communication before + during the job?"
              options={[
                { id: 'great', label: 'Great' },
                { id: 'fine', label: 'Fine' },
                { id: 'poor', label: 'Poor' },
              ]}
              selected={state.communication}
              onSelect={(v) => {
                setState((s) => ({ ...s, communication: v as Communication }));
                setTimeout(advance, 220);
              }}
            />
          ) : null}

          {step === 4 ? (
            <Question
              key="professionalism"
              title="Did the pro behave professionally?"
              options={[
                { id: 'very', label: 'Yes, very professional' },
                { id: 'mostly', label: 'Mostly' },
                { id: 'concerns', label: 'Had some concerns' },
              ]}
              selected={state.professionalism}
              onSelect={(v) => {
                setState((s) => ({ ...s, professionalism: v as Professionalism }));
                setTimeout(advance, 220);
              }}
            />
          ) : null}

          {step === 5 ? (
            <Animated.View key="photo" entering={onlyNative(SlideInRight.springify().damping(20))} exiting={onlyNative(SlideOutLeft)}>
              <Text
                style={{
                  ...textStyles['display-md'],
                  fontSize: 24,
                  lineHeight: 30,
                  color: colors.textPrimary,
                  marginBottom: 8,
                }}
              >
                Share a photo of the finished work
              </Text>
              <Text
                style={{
                  ...textStyles['body-md'],
                  color: colors.textSecondary,
                  marginBottom: 16,
                }}
              >
                Optional. Photos help future homeowners see real work quality.
              </Text>
              {state.photoUri ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Image
                    source={{ uri: state.photoUri }}
                    style={{ width: 120, height: 120, borderRadius: 12 }}
                  />
                  <Pressable
                    onPress={() => setState((s) => ({ ...s, photoUri: null, photoPath: null, photoUploading: false }))}
                    style={{ alignSelf: 'flex-start', padding: 6 }}
                    hitSlop={8}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={onPickPhoto}
                  style={{
                    height: 140,
                    borderRadius: 14,
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Camera size={26} color={colors.textSecondary} />
                  <Text
                    style={{
                      ...textStyles['body-md'],
                      fontFamily: 'Inter_500Medium',
                      color: colors.textSecondary,
                    }}
                  >
                    Tap to add photo
                  </Text>
                </Pressable>
              )}
              <View style={{ marginTop: 24, gap: 10 }}>
                <Button
                  label={state.photoUploading ? 'Uploading photo…' : 'Submit review'}
                  size="lg"
                  fullWidth
                  disabled={state.photoUploading}
                  onPress={submit}
                />
                <Pressable onPress={submit} hitSlop={6}>
                  <Text
                    style={{
                      ...textStyles['body-md'],
                      fontFamily: 'Inter_500Medium',
                      color: colors.textSecondary,
                      textAlign: 'center',
                    }}
                  >
                    Skip photo
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : null}

          {step === 6 ? <SuccessCard providerName={providerName} onDone={finish} /> : null}
        </View>
  );

  if (isWebDesktop) {
    return (
      <Modal visible={visible} transparent animationType="none">
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pressable
            style={{ position: 'absolute', inset: 0 } as object}
            onPress={step < 6 ? onClose : undefined}
          />
          <Animated.View
            entering={SlideInDown.springify().damping(24)}
            exiting={SlideOutDown.duration(200)}
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '90%' as unknown as number,
              backgroundColor: colors.background,
              borderRadius: 20,
              overflow: 'hidden',
            } as object}
          >
            {header}
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
              {stepContent}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        {stepContent}
      </View>
    </Modal>
  );
}

function Question<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: { id: T; label: string }[];
  selected: T | null;
  onSelect: (id: T) => void;
}) {
  return (
    <Animated.View entering={onlyNative(SlideInRight.springify().damping(20))} exiting={onlyNative(SlideOutLeft)}>
      <Text
        style={{
          ...textStyles['display-md'],
          fontSize: 24,
          lineHeight: 30,
          color: colors.textPrimary,
          marginBottom: 24,
        }}
      >
        {title}
      </Text>
      <View style={{ gap: 12 }}>
        {options.map((o) => {
          const sel = selected === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => onSelect(o.id)}
              style={{
                paddingVertical: 18,
                paddingHorizontal: 18,
                borderRadius: 14,
                backgroundColor: sel ? colors.primary[600] : colors.surface,
                borderWidth: 1.5,
                borderColor: sel ? colors.primary[600] : colors.border,
                minHeight: 56,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  ...textStyles['title-lg'],
                  color: sel ? colors.textInverse : colors.textPrimary,
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const QUALITY_LABELS = ['Tap a star', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

function QualityStars({
  value,
  onChange,
  onContinue,
}: {
  value: number;
  onChange: (v: number) => void;
  onContinue: () => void;
}) {
  return (
    <Animated.View entering={onlyNative(SlideInRight.springify().damping(20))} exiting={onlyNative(SlideOutLeft)}>
      <Text
        style={{
          ...textStyles['display-md'],
          fontSize: 24,
          lineHeight: 30,
          color: colors.textPrimary,
          marginBottom: 6,
        }}
      >
        How was the quality of work?
      </Text>
      <Text
        style={{
          ...textStyles['body-md'],
          color: colors.textSecondary,
          marginBottom: 24,
        }}
      >
        {QUALITY_LABELS[value]}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={10}>
            <Star
              size={48}
              color={n <= value ? colors.accent[500] : colors.border}
              fill={n <= value ? colors.accent[500] : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 36 }}>
        <Button label="Continue" size="lg" fullWidth disabled={value === 0} onPress={onContinue} />
      </View>
    </Animated.View>
  );
}

function SuccessCard({ providerName, onDone }: { providerName: string; onDone: () => void }) {
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const arrowY = useSharedValue(8);
  const arrowOpacity = useSharedValue(0);

  useEffect(() => {
    celebrate(checkScale, checkOpacity);
    arrowY.value = withDelay(420, withSpring(0));
    arrowOpacity.value = withDelay(420, withSpring(1));
  }, [arrowOpacity, arrowY, checkOpacity, checkScale]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: arrowY.value }],
    opacity: arrowOpacity.value,
  }));

  return (
    <Animated.View entering={onlyNative(FadeIn.duration(280))} style={{ alignItems: 'center', gap: 16 }}>
      <Animated.View
        style={[
          {
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',
          },
          checkStyle,
        ]}
      >
        <Check size={56} color={colors.textInverse} strokeWidth={3} />
      </Animated.View>
      <Text
        style={{
          ...textStyles['editorial-title'],
          fontSize: 28,
          lineHeight: 34,
          color: colors.textPrimary,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        Thank you!
      </Text>
      <Text
        style={{
          ...textStyles['body-md'],
          color: colors.textSecondary,
          textAlign: 'center',
          paddingHorizontal: 24,
        }}
      >
        Your review helps your neighbors choose the best providers.
      </Text>
      <Animated.View
        style={[
          {
            marginTop: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: colors.successLight,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          arrowStyle,
        ]}
      >
        <TrendingUp size={16} color={colors.success} />
        <Text
          style={{
            ...textStyles['body-sm'],
            fontFamily: 'Inter_600SemiBold',
            color: colors.success,
          }}
        >
          {providerName.split(' ')[0]}&apos;s reliability score just went up
        </Text>
      </Animated.View>
      <View style={{ marginTop: 32, alignSelf: 'stretch' }}>
        <Button label="Done" size="lg" fullWidth onPress={onDone} />
      </View>
    </Animated.View>
  );
}

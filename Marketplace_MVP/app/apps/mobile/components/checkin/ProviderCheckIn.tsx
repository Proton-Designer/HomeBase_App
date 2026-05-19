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
} from 'react-native-reanimated';
import { Camera, X, Check } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { TextStyle } from 'react-native';
import { colors, textStyles, numericTabular } from '../../tokens';
import { celebrate, onlyNative } from '../../lib/motion';
import { pickImageFromLibrary, uploadAsset } from '../../lib/api/storage';
import { useBreakpoint } from '../../lib/useBreakpoint';

interface PhotoSlot {
  uri: string | null;
  path: string | null;
  uploading: boolean;
}

const emptySlot: PhotoSlot = { uri: null, path: null, uploading: false };

interface ProviderCheckInState {
  beforePhoto: PhotoSlot;
  afterPhoto: PhotoSlot;
  notes: string;
  tags: string[];
}

const initial: ProviderCheckInState = {
  beforePhoto: emptySlot,
  afterPhoto: emptySlot,
  notes: '',
  tags: [],
};

const QUICK_TAGS = [
  'Gate was locked',
  'Dog present',
  'Area in poor condition',
  'Excellent access',
  'Customer not home',
  'Repeat customer',
];

export interface ProviderCheckInProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  payoutCents: number;
  onSubmit?: (payload: {
    beforePhotoPath: string | null;
    afterPhotoPath: string | null;
    notes: string;
    tags: string[];
  }) => void;
}

export function ProviderCheckIn({
  visible,
  onClose,
  jobId,
  payoutCents,
  onSubmit,
}: ProviderCheckInProps) {
  const bp = useBreakpoint();
  const isWebDesktop = Platform.OS === 'web' && (bp === 'tablet' || bp === 'desktop');
  const [step, setStep] = useState(0);
  const [state, setState] = useState<ProviderCheckInState>(initial);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setState(initial);
    }
  }, [visible]);

  const advance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setStep((s) => s + 1);
  };

  const makePickHandler = (slot: 'beforePhoto' | 'afterPhoto', pathPrefix: string) =>
    async () => {
      const asset = await pickImageFromLibrary();
      if (!asset) return;
      setState((s) => ({
        ...s,
        [slot]: { uri: asset.uri, path: null, uploading: true },
      }));
      const storagePath = `${pathPrefix}-${Date.now()}.jpg`;
      try {
        const result = await uploadAsset('booking-photos', storagePath, asset);
        setState((s) => ({
          ...s,
          [slot]: { ...s[slot], path: result.path, uploading: false },
        }));
      } catch {
        setState((s) => ({ ...s, [slot]: emptySlot }));
        Alert.alert('Upload failed', 'Please try again.');
      }
    };

  const submit = () => {
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => {
      setSubmitting(false);
      onSubmit?.({
        beforePhotoPath: state.beforePhoto.path,
        afterPhotoPath: state.afterPhoto.path,
        notes: state.notes,
        tags: state.tags,
      });
      setStep(4);
    }, 600);
  };

  const beforeUploading = state.beforePhoto.uploading;
  const afterUploading = state.afterPhoto.uploading;

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
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: i === Math.min(step, 3) ? 22 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                i < step ? colors.accent[500] : i === Math.min(step, 3) ? colors.primary[600] : colors.border,
            }}
          />
        ))}
      </View>
      {step < 4 ? (
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

  const scrollContent = (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
          {step === 0 ? (
            <PhotoStep
              key="before"
              title="Before you start"
              body="Take a photo of the area. Capture the full lawn / room so the homeowner can see the difference."
              photoUri={state.beforePhoto.uri}
              uploading={beforeUploading}
              onPickPhoto={makePickHandler('beforePhoto', `${jobId}/before`)}
              onClear={() => setState((s) => ({ ...s, beforePhoto: emptySlot }))}
              onContinue={advance}
              continueLabel="Got it"
            />
          ) : null}

          {step === 1 ? (
            <Animated.View key="notes" entering={onlyNative(SlideInRight.springify().damping(20))} exiting={onlyNative(SlideOutLeft)}>
              <Text
                style={{
                  ...textStyles['display-md'],
                  color: colors.textPrimary,
                  marginBottom: 8,
                }}
              >
                Any notes about this job?
              </Text>
              <Text
                style={{
                  ...textStyles['body-md'],
                  color: colors.textSecondary,
                  marginBottom: 16,
                }}
              >
                Optional. Tap quick-tags or write a note.
              </Text>
              <Input
                placeholder="Optional notes for HomeBase ops"
                multiline
                value={state.notes}
                onChangeText={(t) => setState((s) => ({ ...s, notes: t }))}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                {QUICK_TAGS.map((tag) => {
                  const sel = state.tags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() =>
                        setState((s) => ({
                          ...s,
                          tags: sel ? s.tags.filter((t) => t !== tag) : [...s.tags, tag],
                        }))
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: sel ? colors.primary[600] : colors.surface,
                        borderWidth: 1.5,
                        borderColor: sel ? colors.primary[600] : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          ...textStyles['body-sm'],
                          fontFamily: 'Inter_500Medium',
                          fontWeight: '600',
                          color: sel ? colors.textInverse : colors.textPrimary,
                        } as TextStyle}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ marginTop: 32 }}>
                <Button label="Continue" fullWidth onPress={advance} />
              </View>
            </Animated.View>
          ) : null}

          {step === 2 ? (
            <PhotoStep
              key="after"
              title="Finished — take an after photo"
              body="The before/after pair feeds the homeowner's review and your trust score."
              photoUri={state.afterPhoto.uri}
              uploading={afterUploading}
              onPickPhoto={makePickHandler('afterPhoto', `${jobId}/after-provider`)}
              onClear={() => setState((s) => ({ ...s, afterPhoto: emptySlot }))}
              onContinue={advance}
              continueLabel="Continue"
              beforePreviewUri={state.beforePhoto.uri}
            />
          ) : null}

          {step === 3 ? (
            <Animated.View key="submit" entering={onlyNative(SlideInRight.springify().damping(20))} exiting={onlyNative(SlideOutLeft)}>
              <Text
                style={{
                  ...textStyles['display-md'],
                  color: colors.textPrimary,
                  marginBottom: 16,
                }}
              >
                Ready to submit
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <PreviewTile label="Before" uri={state.beforePhoto.uri} />
                <PreviewTile label="After" uri={state.afterPhoto.uri} />
              </View>
              {state.notes ? (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.divider,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      fontFamily: 'Inter_500Medium',
                      color: colors.textPrimary,
                    }}
                  >
                    {state.notes}
                  </Text>
                </View>
              ) : null}
              {state.tags.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {state.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: colors.primary[50],
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          ...textStyles['body-sm'],
                          fontFamily: 'Inter_600SemiBold',
                          fontWeight: '600',
                          fontSize: 11,
                          color: colors.primary[600],
                        } as TextStyle}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={{ marginTop: 24 }}>
                <Button label="Submit check-in" fullWidth loading={submitting} onPress={submit} />
              </View>
            </Animated.View>
          ) : null}

          {step === 4 ? <PayoutSuccess payoutCents={payoutCents} onDone={onClose} /> : null}
        </ScrollView>
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
            onPress={step < 4 ? onClose : undefined}
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
            {scrollContent}
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        {scrollContent}
      </View>
    </Modal>
  );
}

function PhotoStep({
  title,
  body,
  photoUri,
  uploading,
  onPickPhoto,
  onClear,
  onContinue,
  continueLabel,
  beforePreviewUri,
}: {
  title: string;
  body: string;
  photoUri: string | null;
  uploading: boolean;
  onPickPhoto: () => void;
  onClear: () => void;
  onContinue: () => void;
  continueLabel: string;
  beforePreviewUri?: string | null;
}) {
  return (
    <Animated.View entering={onlyNative(SlideInRight.springify().damping(20))} exiting={onlyNative(SlideOutLeft)}>
      <Text
        style={{
          ...textStyles['display-md'],
          color: colors.textPrimary,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...textStyles['body-md'],
          color: colors.textSecondary,
          marginBottom: 20,
        }}
      >
        {body}
      </Text>
      {photoUri ? (
        <View>
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: 240, borderRadius: 14 }} />
          {uploading ? (
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: 'rgba(0,0,0,0.55)',
                borderRadius: 999,
              }}
            >
              <Text style={{ ...textStyles['body-sm'], color: '#fff' }}>Uploading…</Text>
            </View>
          ) : null}
          <Pressable onPress={onClear} hitSlop={8} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: 6 }}>
            <X size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onPickPhoto}
          style={{
            height: 240,
            borderRadius: 14,
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Camera size={36} color={colors.textSecondary} />
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
      {beforePreviewUri && !photoUri ? (
        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={{ uri: beforePreviewUri }} style={{ width: 48, height: 48, borderRadius: 8 }} />
          <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>Before photo on file</Text>
        </View>
      ) : null}
      <View style={{ marginTop: 24 }}>
        <Button
          label={uploading ? 'Uploading…' : continueLabel}
          fullWidth
          disabled={!photoUri || uploading}
          onPress={onContinue}
        />
      </View>
    </Animated.View>
  );
}

function PreviewTile({ label, uri }: { label: string; uri: string | null }) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          ...textStyles.label,
          color: colors.textSecondary,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: 120, borderRadius: 12 }} />
      ) : (
        <View
          style={{
            height: 120,
            borderRadius: 12,
            backgroundColor: colors.divider,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>—</Text>
        </View>
      )}
    </View>
  );
}

function PayoutSuccess({ payoutCents, onDone }: { payoutCents: number; onDone: () => void }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    celebrate(scale, opacity);
  }, [scale, opacity]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View entering={onlyNative(FadeIn.duration(280))} style={{ alignItems: 'center', gap: 16, paddingTop: 32 }}>
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
          style,
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
        }}
      >
        Check-in submitted
      </Text>
      <Text
        style={{
          ...textStyles['body-md'],
          ...numericTabular,
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        Your payout of ${(payoutCents / 100).toFixed(2)} will process today.
      </Text>
      <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
        <Button label="Done" fullWidth onPress={onDone} />
      </View>
    </Animated.View>
  );
}

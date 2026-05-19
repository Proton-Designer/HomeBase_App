import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { onlyNative } from '../../lib/motion';
import { colors } from '../../tokens';

export interface CheckInWidgetProps {
  visible: boolean;
  onClose: () => void;
  variant: 'homeowner' | 'provider';
  jobId: string;
  children?: React.ReactNode;
}

export function CheckInWidget({ visible, onClose, variant, children }: CheckInWidgetProps) {
  return (
    <Modal visible={visible} animationType="none" transparent>
      <Animated.View
        entering={onlyNative(FadeIn.duration(180))}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View
          entering={onlyNative(SlideInDown.springify().damping(18))}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 32,
            minHeight: '70%',
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.borderStrong,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 22,
                color: colors.textPrimary,
              }}
            >
              {variant === 'provider' ? 'Job check-in' : 'Quick check-in'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
            {children ?? (
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: colors.textSecondary,
                  marginTop: 12,
                }}
              >
                Check-in flow goes here. Phase 2 implements the question cards.
              </Text>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

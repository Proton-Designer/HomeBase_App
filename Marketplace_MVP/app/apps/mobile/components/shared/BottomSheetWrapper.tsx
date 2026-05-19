import React, { forwardRef, useImperativeHandle, useRef, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { colors } from '../../tokens';
import { useBreakpoint } from '../../lib/useBreakpoint';

export interface BottomSheetWrapperHandle {
  present: () => void;
  dismiss: () => void;
}

export interface BottomSheetWrapperProps {
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  onChange?: (index: number) => void;
}

export const BottomSheetWrapper = forwardRef<BottomSheetWrapperHandle, BottomSheetWrapperProps>(
  function BottomSheetWrapper({ snapPoints, children, onChange }, ref) {
    const bp = useBreakpoint();
    const useDialog = Platform.OS === 'web' && (bp === 'tablet' || bp === 'desktop');

    // Dialog state (web tablet+)
    const [dialogVisible, setDialogVisible] = useState(false);

    // Native bottom-sheet refs
    const sheetRef = useRef<BottomSheet>(null);
    const computedSnap = useMemo(() => snapPoints ?? ['40%', '80%'], [snapPoints]);

    useImperativeHandle(ref, () => ({
      present: () => {
        if (useDialog) {
          setDialogVisible(true);
        } else {
          sheetRef.current?.expand();
        }
      },
      dismiss: () => {
        if (useDialog) {
          setDialogVisible(false);
        } else {
          sheetRef.current?.close();
        }
      },
    }));

    if (useDialog) {
      return (
        <Modal
          visible={dialogVisible}
          transparent
          animationType="none"
          onRequestClose={() => setDialogVisible(false)}
        >
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(160)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              style={{ position: 'absolute', inset: 0 } as object}
              onPress={() => setDialogVisible(false)}
            />
            <Animated.View
              entering={SlideInDown.springify().damping(24)}
              exiting={SlideOutDown.duration(200)}
              style={{
                width: '100%',
                maxWidth: 480,
                maxHeight: '80%' as unknown as number,
                backgroundColor: colors.surface,
                borderRadius: 20,
                overflow: 'hidden',
              } as object}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 4,
                }}
              >
                <Pressable
                  onPress={() => setDialogVisible(false)}
                  hitSlop={8}
                  style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined}
                >
                  <X size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                {children}
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </Modal>
      );
    }

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    );

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={computedSnap}
        enablePanDownToClose
        onChange={onChange}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          backgroundColor: colors.borderStrong,
          width: 32,
          height: 4,
          borderRadius: 2,
        }}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <BottomSheetView style={{ flex: 1, padding: 20 }}>{children}</BottomSheetView>
      </BottomSheet>
    );
  }
);

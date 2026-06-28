import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useMemo,
  useState,
} from 'react';
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

// Stable builder refs for the web-dialog branch. A fresh entering/exiting object each render
// can make Reanimated re-fire the worklet while a parent (realtime-driven) re-renders the
// open modal — flashing or closing it early.
const MODAL_BACKDROP_IN = FadeIn.duration(180);
const MODAL_BACKDROP_OUT = FadeOut.duration(160);
const MODAL_SHEET_IN = SlideInDown.springify().damping(24);
const MODAL_SHEET_OUT = SlideOutDown.duration(200);

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
    // Callers almost always pass an inline array literal (e.g. snapPoints={['45%']}),
    // which is a NEW reference every parent render. gorhom requires snapPoints to be
    // referentially stable — an unstable array makes the sheet re-measure on every
    // render and perturb animatedIndex, which re-fires the backdrop's animated
    // reaction → setPointerEvents in a loop ("Maximum update depth exceeded"). Key the
    // memo on the array's CONTENT so identical snap points yield a stable reference.
    const snapKey = snapPoints ? snapPoints.join('|') : '';
    const computedSnap = useMemo(
      () => snapPoints ?? ['40%', '80%'],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [snapKey],
    );

    // Stable reference — an inline backdropComponent remounts the backdrop on every
    // parent render, which re-runs its animated reaction and compounds the loop above.
    // Defined before the early web-dialog return so the hook order stays constant.
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      [],
    );

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
            entering={MODAL_BACKDROP_IN}
            exiting={MODAL_BACKDROP_OUT}
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
              entering={MODAL_SHEET_IN}
              exiting={MODAL_SHEET_OUT}
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

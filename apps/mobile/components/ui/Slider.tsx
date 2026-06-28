import React, { useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { colors } from '../../tokens';

interface SliderProps {
  min: number;
  max: number;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}

const THUMB = 26;

/**
 * Lightweight gesture slider (no @react-native-community/slider dependency). Drives the
 * value on the JS thread via runOnJS so callers can react live (e.g. re-center a map).
 * React bails out of re-render when onChange receives the already-current snapped value.
 */
export function Slider({ min, max, value, step = 1, onChange }: SliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setTrackWidth(w);
  };

  const setFromX = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const r = Math.min(1, Math.max(0, x / w));
    const snapped = Math.min(max, Math.max(min, Math.round((min + r * (max - min)) / step) * step));
    onChange(snapped);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => runOnJS(setFromX)(e.x))
    .onUpdate((e) => runOnJS(setFromX)(e.x));

  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const thumbLeft = Math.max(0, Math.min(trackWidth - THUMB, ratio * trackWidth - THUMB / 2));

  return (
    <GestureDetector gesture={pan}>
      <View onLayout={onLayout} style={{ height: 40, justifyContent: 'center' }} hitSlop={14}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.divider }}>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.primary[600],
              width: `${ratio * 100}%`,
            }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            left: thumbLeft,
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: colors.primary[600],
            borderWidth: 3,
            borderColor: colors.surface,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
            elevation: 3,
          }}
        />
      </View>
    </GestureDetector>
  );
}

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface Props {
  children: React.ReactNode;
  /** Unique key — change it to trigger the animation */
  phaseKey: string;
  /** Animation style: 'fade' | 'slideUp' | 'scale' */
  type?: 'fade' | 'slideUp' | 'scale';
  /** Duration in ms */
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * PhaseTransition — wraps game phase content with smooth enter animation.
 * Changes to `phaseKey` trigger a re-animation.
 */
export function PhaseTransition({ children, phaseKey, type = 'fade', duration = 300, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(type === 'slideUp' ? 30 : 0)).current;
  const scale = useRef(new Animated.Value(type === 'scale' ? 0.92 : 1)).current;

  useEffect(() => {
    // Reset
    opacity.setValue(0);
    if (type === 'slideUp') translateY.setValue(30);
    if (type === 'scale') scale.setValue(0.92);

    // Animate in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      ...(type === 'slideUp' ? [
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
      ] : []),
      ...(type === 'scale' ? [
        Animated.spring(scale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ] : []),
    ]).start();
  }, [phaseKey]);

  return (
    <Animated.View style={[
      style,
      {
        opacity,
        transform: [
          ...(type === 'slideUp' ? [{ translateY }] : []),
          ...(type === 'scale' ? [{ scale }] : []),
        ],
      },
    ]}>
      {children}
    </Animated.View>
  );
}

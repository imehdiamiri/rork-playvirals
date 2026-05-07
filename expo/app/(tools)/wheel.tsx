import { Colors } from '@/src/theme/Colors';
import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Keyboard,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Path, G, Circle, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
  cancelAnimation,
  useAnimatedReaction,
  interpolateColor,
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AudioManager } from '@/src/services/AudioManager';

const SLICE_COLORS = [
  Colors.orange,
  Colors.cyan,
  '#FF2D55',
  Colors.green,
  '#AF52DE',
  Colors.yellow,
  Colors.blue,
  '#FF6B35',
  '#34C759',
  '#5AC8FA',
  '#FF9500',
  '#BF5AF2',
];

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 24;
const MAX_LABEL_LEN = 24;

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const arcPath = (cx: number, cy: number, r: number, startA: number, endA: number) => {
  const start = polarToCartesian(cx, cy, r, endA);
  const end = polarToCartesian(cx, cy, r, startA);
  const largeArc = endA - startA <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
};

const fitLabel = (label: string, sliceCount: number) => {
  const max = sliceCount > 16 ? 6 : sliceCount > 10 ? 9 : sliceCount > 6 ? 14 : MAX_LABEL_LEN;
  if (label.length <= max) return label;
  return label.slice(0, Math.max(1, max - 1)) + '…';
};

export default function WheelToolScreen() {
  const screenW = Dimensions.get('window').width;
  const wheelSize = Math.min(screenW - 40, 360);
  const radius = wheelSize / 2;

  const [options, setOptions] = useState<string[]>(['Truth', 'Dare']);
  const [draft, setDraft] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  const rotation = useSharedValue<number>(0);
  const pointerColorIndex = useSharedValue<number>(-1);
  const inputRef = useRef<TextInput>(null);
  const tensionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sliceAngle = options.length > 0 ? 360 / options.length : 360;

  const slices = useMemo(() => {
    return options.map((label, i) => {
      const startA = i * sliceAngle;
      const endA = (i + 1) * sliceAngle;
      const midA = (startA + endA) / 2;
      const color = SLICE_COLORS[i % SLICE_COLORS.length];
      return { label, startA, endA, midA, color, index: i };
    });
  }, [options, sliceAngle]);

  const addOption = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_LABEL_LEN) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Too long', `Keep entries under ${MAX_LABEL_LEN} characters.`);
      return;
    }
    if (options.length >= MAX_OPTIONS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Maximum reached', `You can have up to ${MAX_OPTIONS} options.`);
      return;
    }
    if (options.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Duplicate', `"${trimmed}" is already on the wheel.`);
      return;
    }
    setOptions([...options, trimmed]);
    setDraft('');
    setWinner(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Need at least 2', 'A wheel needs at least 2 options to spin.');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
    setWinner(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onSpinComplete = (finalRotation: number) => {
    setIsSpinning(false);
    const normalized = ((finalRotation % 360) + 360) % 360;
    // Pointer is at the top (12 o'clock = -90 deg from rotation 0).
    // Wheel rotates clockwise by `normalized`. The slice currently at the top
    // is the one whose midA (in original wheel coords) equals (360 - normalized) mod 360.
    const pointerAngle = (360 - normalized) % 360;
    const winnerIndex = Math.floor(pointerAngle / sliceAngle) % options.length;
    const result = options[winnerIndex] ?? options[0];
    setWinner(result);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AudioManager.play('match');
  };

  const onPointerTick = () => {
    Haptics.selectionAsync();
  };

  const spin = () => {
    if (isSpinning || options.length < MIN_OPTIONS) return;
    Keyboard.dismiss();
    setWinner(null);
    setIsSpinning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    AudioManager.play('bottleSpin');

    cancelAnimation(rotation);
    if (tensionTimerRef.current) {
      clearTimeout(tensionTimerRef.current);
      tensionTimerRef.current = null;
    }

    // Two-phase spin: a quick wind-up, then a long suspenseful slow-down.
    // Aggressive ease-out makes the final slice unpredictable and dramatic.
    const fastTurns = 6 + Math.floor(Math.random() * 3); // 6..8 fast turns
    const slowExtra = 1.5 * 360 + Math.random() * 360; // 1.5..2.5 final turns
    const fastDuration = 1500;
    const slowDuration = 5500 + Math.floor(Math.random() * 1500); // 5.5..7s slow phase
    const totalDuration = fastDuration + slowDuration;

    const fastTarget = rotation.value + fastTurns * 360;
    const finalTarget = fastTarget + slowExtra;

    // Schedule the tension cue ~1.4s before stop, when slices visibly crawl.
    tensionTimerRef.current = setTimeout(() => {
      AudioManager.play('countdownFinal');
    }, totalDuration - 1400);

    rotation.value = withSequence(
      withTiming(fastTarget, {
        duration: fastDuration,
        easing: Easing.in(Easing.cubic),
      }),
      withTiming(
        finalTarget,
        { duration: slowDuration, easing: Easing.out(Easing.exp) },
        (finished) => {
          if (finished) {
            runOnJS(onSpinComplete)(finalTarget);
          }
        },
      ),
    );
  };

  const wheelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Sample which slice is under the pointer on the UI thread; bridge only when it changes.
  useAnimatedReaction(
    () => {
      const normalized = ((rotation.value % 360) + 360) % 360;
      const pointerAngle = (360 - normalized) % 360;
      return Math.floor(pointerAngle / sliceAngle) % Math.max(1, options.length);
    },
    (idx, prev) => {
      if (idx !== prev) {
        pointerColorIndex.value = idx;
        runOnJS(onPointerTick)();
      }
    },
    [sliceAngle, options.length],
  );

  const pointerAnimatedStyle = useAnimatedStyle(() => {
    const i = pointerColorIndex.value;
    if (i < 0 || i >= slices.length) {
      return { borderTopColor: 'white' as const };
    }
    // interpolateColor with a 2-point [i, i] stop returns the color cleanly on UI thread.
    const color = interpolateColor(
      i,
      [i - 0.0001, i],
      [slices[i].color, slices[i].color],
    );
    return { borderTopColor: color };
  });

  const pointerBaseAnimatedStyle = useAnimatedStyle(() => {
    const i = pointerColorIndex.value;
    if (i < 0 || i >= slices.length) {
      return { backgroundColor: 'white' as const };
    }
    const color = interpolateColor(
      i,
      [i - 0.0001, i],
      [slices[i].color, slices[i].color],
    );
    return { backgroundColor: color };
  });

  const fontSize = options.length > 16 ? 9 : options.length > 10 ? 11 : options.length > 6 ? 12 : 14;
  const labelRadius = radius * 0.62;

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {/* Wheel */}
      <View style={styles.wheelArea}>
        <View style={[styles.wheelWrap, { width: wheelSize, height: wheelSize }]}>
          <Animated.View style={[{ width: wheelSize, height: wheelSize }, wheelAnimatedStyle]}>
            <Svg width={wheelSize} height={wheelSize} viewBox={`0 0 ${wheelSize} ${wheelSize}`}>
              <Defs>
                <RadialGradient id="sheen" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="white" stopOpacity={0.18} />
                  <Stop offset="60%" stopColor="white" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <G>
                {slices.map((s) => (
                  <Path
                    key={s.index}
                    d={arcPath(radius, radius, radius - 4, s.startA, s.endA)}
                    fill={s.color}
                    stroke="rgba(0,0,0,0.25)"
                    strokeWidth={1}
                  />
                ))}
                {/* sheen overlay */}
                <Circle cx={radius} cy={radius} r={radius - 4} fill="url(#sheen)" />
                {/* labels */}
                {slices.map((s) => {
                  const pos = polarToCartesian(radius, radius, labelRadius, s.midA);
                  return (
                    <SvgText
                      key={`l-${s.index}`}
                      x={pos.x}
                      y={pos.y}
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="900"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${s.midA} ${pos.x} ${pos.y})`}
                    >
                      {fitLabel(s.label, options.length)}
                    </SvgText>
                  );
                })}
                {/* outer ring */}
                <Circle
                  cx={radius}
                  cy={radius}
                  r={radius - 3}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={2}
                  fill="none"
                />
              </G>
            </Svg>
          </Animated.View>

          {/* Center hub */}
          <View style={[styles.hub, { left: radius - 22, top: radius - 22 }]}>
            <LinearGradient
              colors={['#FFFFFF', '#D0D0D8']}
              style={StyleSheet.absoluteFill}
            />
            <IconSymbol name="sparkles" size={18} color={Colors.blue} weight="black" />
          </View>

          {/* Pointer (top) — color tracks slice under pointer */}
          <View style={[styles.pointer, { left: radius - 14 }]} pointerEvents="none">
            <Animated.View style={[styles.pointerTriangle, pointerAnimatedStyle]} />
            <Animated.View style={[styles.pointerBase, pointerBaseAnimatedStyle]} />
          </View>
        </View>

        {/* Result */}
        <View style={styles.resultArea}>
          <Text style={styles.resultLabel}>{isSpinning ? 'SPINNING…' : winner ? 'WINNER' : 'TAP SPIN'}</Text>
          <Text style={[styles.resultValue, isSpinning && { opacity: 0.4 }]} numberOfLines={1}>
            {winner ?? '—'}
          </Text>
        </View>
      </View>

      {/* Spin button */}
      <Pressable
        onPress={spin}
        disabled={isSpinning || options.length < MIN_OPTIONS}
        style={({ pressed }) => [
          styles.spinBtnWrap,
          pressed && { opacity: 0.85 },
          (isSpinning || options.length < MIN_OPTIONS) && { opacity: 0.55 },
        ]}
      >
        <LinearGradient
          colors={[Colors.blue, Colors.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.spinBtn}
        >
          <IconSymbol name="arrow.triangle.2.circlepath" size={18} color="white" weight="heavy" />
          <Text style={styles.spinBtnText}>{isSpinning ? 'Spinning…' : 'Spin'}</Text>
        </LinearGradient>
      </Pressable>

      {/* Add option */}
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Add an option"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={addOption}
            blurOnSubmit={false}
            maxLength={MAX_LABEL_LEN}
            editable={!isSpinning}
          />
        </View>
        <Pressable
          onPress={addOption}
          disabled={!draft.trim() || isSpinning}
          style={({ pressed }) => [
            styles.addButton,
            pressed && { opacity: 0.8 },
            (!draft.trim() || isSpinning) && { opacity: 0.5 },
          ]}
        >
          <IconSymbol name="plus" size={16} color="white" weight="black" />
        </Pressable>
      </View>

      {/* Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {options.length} option{options.length === 1 ? '' : 's'}
        </Text>
        {options.length >= MAX_OPTIONS ? (
          <Text style={styles.counterMax}>Max</Text>
        ) : null}
      </View>

      {/* Chips */}
      <View style={styles.chipsWrap}>
        {options.map((opt, i) => {
          const color = SLICE_COLORS[i % SLICE_COLORS.length];
          return (
            <View
              key={`${opt}-${i}`}
              style={[styles.chip, { borderColor: `${color}66`, backgroundColor: `${color}1F` }]}
            >
              <View style={[styles.chipDot, { backgroundColor: color }]} />
              <Text style={styles.chipText} numberOfLines={1}>
                {opt}
              </Text>
              <Pressable
                onPress={() => removeOption(i)}
                disabled={isSpinning}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <IconSymbol name="xmark" size={10} color="white" weight="black" />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  container: {
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  wheelArea: {
    alignItems: 'center',
    width: '100%',
  },
  wheelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
      },
      android: { elevation: 14 },
      default: {},
    }),
  },
  hub: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  pointer: {
    position: 'absolute',
    top: -6,
    width: 28,
    alignItems: 'center',
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
  pointerBase: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'white',
    marginTop: -6,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  resultArea: {
    marginTop: 18,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.cyan,
    textShadowColor: 'rgba(90, 200, 250, 0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 16,
    maxWidth: 320,
    textAlign: 'center',
  },
  spinBtnWrap: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 18,
  },
  spinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  spinBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },
  input: {
    color: 'white',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.blue,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterRow: {
    width: '100%',
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  counterMax: {
    color: Colors.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    width: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    maxWidth: 160,
  },
});

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '@/src/theme/Colors';
import { GameSession } from '@/src/store/useGameStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ResultsScoreboard, RankEntry } from './ResultsScoreboard';
import * as Haptics from '@/src/utils/safeHaptics';

interface Props { session: GameSession; }

type Phase = 'ready' | 'countdown' | 'flash' | 'input' | 'correct' | 'wrong' | 'playerComplete' | 'results';

interface PlayerRecord {
  playerId: string;
  bestRound: number;
  bestDigits: number;
}

const ACCENT = '#5AC8FA';

/** Round difficulty: digits + display ms. Index = round number - 1. */
function roundConfig(round: number): { digits: number; ms: number } {
  const digits = Math.min(8, 3 + Math.floor((round - 1) / 2));
  const ms = Math.max(400, 1200 - (round - 1) * 80);
  return { digits, ms };
}

function generateNumber(digits: number): string {
  let s = '';
  // First digit: 1-9 (avoid leading zero)
  s += String(1 + Math.floor(Math.random() * 9));
  for (let i = 1; i < digits; i++) {
    s += String(Math.floor(Math.random() * 10));
  }
  return s;
}

export function EyeSightSession({ session }: Props) {
  const players = session.players;
  const [phase, setPhase] = useState<Phase>('ready');
  const [playerIdx, setPlayerIdx] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [target, setTarget] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);
  const [records, setRecords] = useState<PlayerRecord[]>(() =>
    players.map(p => ({ playerId: p.id, bestRound: 0, bestDigits: 0 }))
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const player = players[playerIdx];
  const config = roundConfig(round);

  const flashScale = useSharedValue<number>(0.9);
  const flashOpacity = useSharedValue<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updateBest = useCallback((idx: number, r: number, d: number) => {
    setRecords(prev => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur) return prev;
      if (r > cur.bestRound) {
        next[idx] = { ...cur, bestRound: r, bestDigits: d };
      }
      return next;
    });
  }, []);

  const startCountdown = useCallback(() => {
    setInput('');
    setPhase('countdown');
    setCountdown(3);
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        // Show flash
        const num = generateNumber(config.digits);
        setTarget(num);
        flashScale.value = 0.9;
        flashOpacity.value = 0;
        setPhase('flash');
        flashOpacity.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
        flashScale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        timerRef.current = setTimeout(() => {
          flashOpacity.value = withTiming(0, { duration: 100 });
          setPhase('input');
        }, config.ms);
        return;
      }
      setCountdown(n);
      Haptics.selectionAsync();
      timerRef.current = setTimeout(tick, 700);
    };
    Haptics.selectionAsync();
    timerRef.current = setTimeout(tick, 700);
  }, [config.digits, config.ms, flashOpacity, flashScale]);

  const submitAnswer = () => {
    if (input.trim().length === 0) return;
    if (input.trim() === target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateBest(playerIdx, round, config.digits);
      setPhase('correct');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPhase('wrong');
    }
  };

  const continueAfterCorrect = () => {
    setRound(round + 1);
    startCountdown();
  };

  const goToNextPlayer = () => {
    const isLast = playerIdx + 1 >= players.length;
    if (isLast) {
      setPhase('results');
    } else {
      setPlayerIdx(playerIdx + 1);
      setRound(1);
      setInput('');
      setTarget('');
      setPhase('ready');
    }
  };

  const playAgain = () => {
    setRecords(players.map(p => ({ playerId: p.id, bestRound: 0, bestDigits: 0 })));
    setPlayerIdx(0);
    setRound(1);
    setInput('');
    setTarget('');
    setPhase('ready');
  };

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: flashScale.value }],
  }));

  // ─── READY ───
  if (phase === 'ready') {
    const isFirstPlayer = playerIdx === 0;
    return (
      <View style={st.container}>
        <ScrollView contentContainerStyle={st.readyContent}>
          <View style={[st.iconBox, { backgroundColor: ACCENT + '26' }]}>
            <IconSymbol name="eye.fill" size={56} color={ACCENT} />
          </View>
          <Text style={st.eyebrow}>{isFirstPlayer ? 'EYE SIGHT' : `PLAYER ${playerIdx + 1} OF ${players.length}`}</Text>
          <Text style={st.nameTitle} numberOfLines={2}>{player?.displayName ?? 'Player'}</Text>
          <View style={[st.pill, { backgroundColor: ACCENT + '26', borderColor: ACCENT + '4D' }]}>
            <Text style={[st.pillTx, { color: ACCENT }]}>Are you ready?</Text>
          </View>

          {!isFirstPlayer && (
            <View style={st.handoffCard}>
              <IconSymbol name="hand.raised.fill" size={22} color={Colors.cyan} />
              <Text style={st.handoffTx}>Pass the phone to {player?.displayName}. Tap below to start.</Text>
            </View>
          )}

          <View style={st.rulesCard}>
            <RuleRow num={1} color={ACCENT} text="A countdown of 3, 2, 1 prepares you for the next number." />
            <RuleRow num={2} color={ACCENT} text="A number flashes for a brief moment — watch carefully!" />
            <RuleRow num={3} color={ACCENT} text="Type what you saw and submit. One wrong answer ends your turn." />
          </View>

          <Pressable style={[st.startBtn, { backgroundColor: ACCENT }]} onPress={startCountdown}>
            <IconSymbol name="play.fill" size={18} color="#fff" />
            <Text style={st.startBtnTx}>I&apos;m Ready</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─── COUNTDOWN ───
  if (phase === 'countdown') {
    return (
      <View style={[st.container, st.fullCenter]}>
        <Text style={st.eyebrow}>ROUND {round} · {config.digits} DIGITS</Text>
        <Text style={st.countdownTx}>{countdown}</Text>
        <Text style={st.bigSub}>Get ready…</Text>
      </View>
    );
  }

  // ─── FLASH ───
  if (phase === 'flash') {
    return (
      <View style={[st.container, st.fullCenter]}>
        <Text style={st.eyebrow}>ROUND {round}</Text>
        <Animated.Text style={[st.flashNumber, flashStyle]}>{target}</Animated.Text>
      </View>
    );
  }

  // ─── INPUT ───
  if (phase === 'input') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.container}>
        <ScrollView contentContainerStyle={st.readyContent} keyboardShouldPersistTaps="handled">
          <Text style={st.eyebrow}>ROUND {round} · {config.digits} DIGITS</Text>
          <Text style={st.title}>What did you see?</Text>
          <Text style={st.sub}>Type the number exactly.</Text>
          <TextInput
            style={st.input}
            value={input}
            onChangeText={setInput}
            keyboardType="number-pad"
            autoFocus
            maxLength={config.digits + 2}
            placeholder="•".repeat(config.digits)
            placeholderTextColor="rgba(255,255,255,0.25)"
            returnKeyType="done"
            onSubmitEditing={submitAnswer}
          />
          <Pressable
            style={[st.startBtn, { backgroundColor: input.trim().length > 0 ? ACCENT : 'rgba(255,255,255,0.12)' }]}
            disabled={input.trim().length === 0}
            onPress={submitAnswer}
          >
            <Text style={st.startBtnTx}>Submit</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── CORRECT ───
  if (phase === 'correct') {
    return (
      <View style={st.container}>
        <View style={st.center}>
          <View style={[st.iconBox, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
            <IconSymbol name="checkmark.circle.fill" size={56} color={Colors.green} />
          </View>
          <Text style={st.title}>Correct!</Text>
          <Text style={st.sub}>Round {round} cleared · {config.digits} digits</Text>
          <Text style={[st.title, { color: Colors.green, fontSize: 36, marginTop: 4 }]}>{target}</Text>
          <Pressable style={[st.startBtn, { backgroundColor: ACCENT }]} onPress={continueAfterCorrect}>
            <Text style={st.startBtnTx}>Next Round</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── WRONG ───
  if (phase === 'wrong') {
    const rec = records[playerIdx];
    return (
      <View style={st.container}>
        <View style={st.center}>
          <View style={[st.iconBox, { backgroundColor: 'rgba(255,59,48,0.18)' }]}>
            <IconSymbol name="xmark.octagon.fill" size={56} color={Colors.red} />
          </View>
          <Text style={st.title}>Not quite!</Text>
          <Text style={st.sub}>The number was</Text>
          <Text style={[st.title, { color: Colors.red, fontSize: 36, marginTop: 2 }]}>{target}</Text>
          <Text style={[st.sub, { marginTop: 6 }]}>You typed {input.trim() || '—'}</Text>

          <View style={st.attemptList}>
            <View style={st.attemptRow}>
              <Text style={st.attemptIdx}>Best round</Text>
              <Text style={st.attemptVal}>{rec?.bestRound ?? 0}</Text>
            </View>
            <View style={st.attemptRow}>
              <Text style={st.attemptIdx}>Top digits</Text>
              <Text style={st.attemptVal}>{rec?.bestDigits ?? 0}</Text>
            </View>
          </View>

          <Pressable style={[st.startBtn, { backgroundColor: ACCENT }]} onPress={() => setPhase('playerComplete')}>
            <Text style={st.startBtnTx}>Continue</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── PLAYER COMPLETE ───
  if (phase === 'playerComplete') {
    const rec = records[playerIdx];
    const isLast = playerIdx + 1 >= players.length;
    return (
      <View style={st.container}>
        <View style={st.center}>
          <View style={[st.iconBox, { backgroundColor: 'rgba(255,204,0,0.18)' }]}>
            <IconSymbol name="trophy.fill" size={48} color={Colors.yellow} />
          </View>
          <Text style={st.title}>{player?.displayName}</Text>
          <Text style={st.sub}>Best round</Text>
          <Text style={[st.title, { color: ACCENT, fontSize: 56, marginTop: 4 }]}>{rec?.bestRound ?? 0}</Text>
          <Text style={st.sub}>Top digit count: {rec?.bestDigits ?? 0}</Text>
          <Pressable style={[st.startBtn, { backgroundColor: Colors.green }]} onPress={goToNextPlayer}>
            <Text style={st.startBtnTx}>{isLast ? 'See Final Rankings' : 'Next Player'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── RESULTS ───
  const entries: RankEntry[] = [...records]
    .map(r => {
      const p = players.find(pp => pp.id === r.playerId);
      return { record: r, name: p?.displayName ?? 'Player' };
    })
    .sort((a, b) => {
      if (a.record.bestRound !== b.record.bestRound) return b.record.bestRound - a.record.bestRound;
      return b.record.bestDigits - a.record.bestDigits;
    })
    .map((row): RankEntry => ({
      id: row.record.playerId,
      name: row.name,
      primary: `Round ${row.record.bestRound}`,
      secondary: `${row.record.bestDigits} digits`,
    }));

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <ResultsScoreboard
          entries={entries}
          title={players.length > 1 ? 'Final Rankings' : 'Your Result'}
          subtitle="Highest round wins"
          onPlayAgain={playAgain}
          shareGameName="Eye Sight"
        />
      </ScrollView>
    </View>
  );
}

function RuleRow({ num, color, text }: { num: number; color: string; text: string }) {
  return (
    <View style={st.ruleRow}>
      <View style={[st.ruleNum, { backgroundColor: color + '33', borderColor: color + '66' }]}>
        <Text style={[st.ruleNumTx, { color }]}>{num}</Text>
      </View>
      <Text style={st.ruleTx}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  readyContent: { padding: 20, paddingBottom: 60, alignItems: 'center', gap: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  fullCenter: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  iconBox: {
    width: 100, height: 100, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  eyebrow: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.4,
    textAlign: 'center',
    marginTop: 4,
  },
  nameTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
    paddingHorizontal: 8,
  },
  handoffCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(90,200,250,0.10)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.25)',
    marginTop: 8,
  },
  handoffTx: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 19, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center' },
  bigSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillTx: { fontSize: 13, fontWeight: '700' },

  rulesCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: 12, marginTop: 8,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ruleNum: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  ruleNumTx: { fontSize: 14, fontWeight: 'bold' },
  ruleTx: { color: 'rgba(255,255,255,0.85)', fontSize: 14, flex: 1, lineHeight: 19 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    paddingVertical: 16, paddingHorizontal: 28,
    borderRadius: 16, width: '100%',
    marginTop: 18,
  },
  startBtnTx: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  countdownTx: {
    color: '#fff',
    fontSize: 140,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(90,200,250,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  flashNumber: {
    color: '#fff',
    fontSize: 96,
    fontWeight: '900',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(90,200,250,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 32,
  },

  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.35)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
    marginTop: 12,
  },

  attemptList: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 12, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 16,
  },
  attemptRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 6,
  },
  attemptIdx: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  attemptVal: { color: '#fff', fontSize: 16, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
});

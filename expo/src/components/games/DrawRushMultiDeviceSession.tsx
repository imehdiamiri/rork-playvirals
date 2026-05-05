import { Colors } from '@/src/theme/Colors';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { AppBackgroundView } from '@/src/components/AppBackgroundView';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * DrawRushMultiDeviceSession — matches iOS DrawRushMultiDeviceSessionView
 * Multi-device Draw Rush: drawer draws on their phone, guessers see
 * synced canvas and submit guesses. Drawer judges correctness.
 */

// ─── Types ───

interface DRPlayer {
  id: string;
  name: string;
  score: number;
}

interface DRSubmission {
  id: string;
  playerID: string;
  playerName: string;
  text: string;
  submittedAt: number;
  isCorrect: boolean | null;
}

type DrawRushPhase =
  | 'turnIntro'
  | 'drawing'
  | 'drawerJudging'
  | 'roundResults'
  | 'finalLeaderboard';

// ─── Props ───

interface DrawRushMultiDeviceProps {
  players: DRPlayer[];
  localPlayerID: string;
  isHost: boolean;
  concept: string;
  onExit: () => void;
}

const CONCEPTS = [
  'Sunflower', 'Dragon', 'Bicycle', 'Volcano', 'Penguin',
  'Pizza', 'Astronaut', 'Castle', 'Octopus', 'Rainbow',
  'Guitar', 'Dinosaur', 'Robot', 'Campfire', 'Mermaid',
  'Helicopter', 'Cactus', 'Snowman', 'Crown', 'Butterfly',
];

const DRAW_TIME = 60;

export default function DrawRushMultiDeviceSession({
  players: initialPlayers,
  localPlayerID,
  isHost,
  concept: propConcept,
  onExit,
}: DrawRushMultiDeviceProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');

  const [phase, setPhase] = useState<DrawRushPhase>('turnIntro');
  const [players, setPlayers] = useState<DRPlayer[]>(initialPlayers);
  const [currentDrawerIndex, setCurrentDrawerIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(DRAW_TIME);
  const [submissions, setSubmissions] = useState<DRSubmission[]>([]);
  const [guessText, setGuessText] = useState('');
  const [concept, setConcept] = useState(propConcept || CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentDrawer = players[currentDrawerIndex];
  const isLocalPlayerDrawer = currentDrawer?.id === localPlayerID;
  const hasSubmitted = submissions.some(s => s.playerID === localPlayerID);
  const allJudged = submissions.every(s => s.isCorrect !== null);
  const leaderboard = [...players].sort((a, b) => b.score - a.score);

  // ─── Timer ───

  useEffect(() => {
    if (phase === 'drawing') {
      setSecondsRemaining(DRAW_TIME);
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setPhase(isLocalPlayerDrawer ? 'drawerJudging' : 'drawerJudging');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // ─── Actions ───

  const startDrawing = () => setPhase('drawing');

  const submitGuess = () => {
    const trimmed = guessText.trim();
    if (!trimmed || hasSubmitted) return;

    const submission: DRSubmission = {
      id: Date.now().toString(),
      playerID: localPlayerID,
      playerName: players.find(p => p.id === localPlayerID)?.name || 'You',
      text: trimmed,
      submittedAt: Date.now(),
      isCorrect: null,
    };
    setSubmissions(prev => [...prev, submission]);
    setGuessText('');
    // In production: broadcast via GameSyncService
  };

  const judgeAnswer = (submissionId: string, isCorrect: boolean) => {
    setSubmissions(prev =>
      prev.map(s => s.id === submissionId ? { ...s, isCorrect } : s)
    );
  };

  const finalizeJudging = () => {
    // Award points
    const sorted = [...submissions]
      .filter(s => s.isCorrect === true)
      .sort((a, b) => a.submittedAt - b.submittedAt);

    setPlayers(prev => {
      const updated = [...prev];
      sorted.forEach((sub, i) => {
        const idx = updated.findIndex(p => p.id === sub.playerID);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], score: updated[idx].score + (3 - Math.min(i, 2)) };
        }
      });
      return updated;
    });

    setPhase('roundResults');
  };

  const nextTurn = () => {
    if (currentDrawerIndex + 1 >= players.length) {
      setPhase('finalLeaderboard');
    } else {
      setCurrentDrawerIndex(prev => prev + 1);
      setSubmissions([]);
      setConcept(CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)]);
      setPhase('turnIntro');
    }
  };

  const rankEmoji = (i: number) => ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;

  // ─── Render Phases ───

  if (phase === 'turnIntro') {
    return (
      <View style={styles.container}>
        <AppBackgroundView />
        <View style={styles.centered}>
          <IconSymbol name="paintbrush.pointed.fill" size={48} color="#5AC8FA" />
          <Text style={styles.turnLabel}>
            Turn {currentDrawerIndex + 1} of {players.length}
          </Text>
          <View style={styles.drawerPill}>
            <Text style={styles.drawerPillText}>Drawer: {currentDrawer.name}</Text>
          </View>
          <Text style={styles.subText}>
            {isLocalPlayerDrawer
              ? 'You are the drawer. Tap below to see your concept.'
              : 'Get ready to guess!'}
          </Text>
          {isLocalPlayerDrawer ? (
            <Pressable style={styles.actionBtn} onPress={startDrawing}>
              <LinearGradient colors={['#5AC8FA', '#34AADC']} style={styles.actionGradient}>
                <Text style={styles.actionText}>Reveal Concept & Start</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={styles.waitingRow}>
              <ActivityIndicator color="rgba(255,255,255,0.4)" size="small" />
              <Text style={styles.waitingText}>Waiting for {currentDrawer.name}…</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (phase === 'drawing') {
    return (
      <View style={styles.container}>
        <AppBackgroundView />
        <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.timerPill, secondsRemaining <= 10 && styles.timerPillDanger]}>
              <IconSymbol name="timer" size={14} color={secondsRemaining <= 10 ? Colors.red : '#fff'} />
              <Text style={[styles.timerText, secondsRemaining <= 10 && { color: Colors.red }]}>{secondsRemaining}s</Text>
            </View>
            <View style={styles.drawerInfo}>
              <Text style={styles.drawerInfoLabel}>Drawer</Text>
              <Text style={styles.drawerInfoName}>{currentDrawer.name}</Text>
            </View>
          </View>

          {isLocalPlayerDrawer && (
            <Text style={styles.conceptText}>Concept: {concept}</Text>
          )}

          {/* Canvas Placeholder */}
          <View style={[styles.canvas, { height: screenWidth - 24 }]}>
            <Text style={styles.canvasPlaceholder}>
              {isLocalPlayerDrawer ? '🎨 Draw here' : '👀 Watching canvas...'}
            </Text>
          </View>

          {/* Guess input (for non-drawers) */}
          {!isLocalPlayerDrawer && !hasSubmitted && (
            <View style={styles.guessRow}>
              <TextInput
                style={styles.guessInput}
                value={guessText}
                onChangeText={setGuessText}
                placeholder="Your guess"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <Pressable
                style={[styles.submitBtn, !guessText.trim() && styles.submitBtnDisabled]}
                onPress={submitGuess}
                disabled={!guessText.trim()}
              >
                <Text style={styles.submitText}>Submit</Text>
              </Pressable>
            </View>
          )}

          {!isLocalPlayerDrawer && hasSubmitted && (
            <View style={styles.lockedBanner}>
              <IconSymbol name="lock.fill" size={12} color="rgba(255,255,255,0.4)" />
              <Text style={styles.lockedText}>Answer locked — waiting for round to end…</Text>
            </View>
          )}

          {/* Submissions strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
            {players.filter(p => p.id !== currentDrawer.id).map(p => {
              const submitted = submissions.some(s => s.playerID === p.id);
              return (
                <View key={p.id} style={styles.stripPill}>
                  <IconSymbol
                    name={submitted ? 'checkmark.circle.fill' : 'circle' as any}
                    size={10}
                    color={submitted ? Colors.green : 'rgba(255,255,255,0.3)'}
                  />
                  <Text style={styles.stripName}>{p.name}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  }

  if (phase === 'drawerJudging') {
    return (
      <View style={styles.container}>
        <AppBackgroundView />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
          {isLocalPlayerDrawer ? (
            <>
              <IconSymbol name="hand.thumbsup.fill" size={40} color="#5AC8FA" />
              <Text style={styles.judgeTitle}>Judge the guesses</Text>
              <Text style={styles.conceptLabel}>Concept: {concept}</Text>
              <Text style={styles.judgeHint}>Tap ✓ for correct and ✗ for wrong.</Text>

              {submissions.length === 0 ? (
                <Text style={styles.emptyText}>No answers submitted.</Text>
              ) : (
                submissions
                  .sort((a, b) => a.submittedAt - b.submittedAt)
                  .map((sub, i) => (
                    <View key={sub.id} style={styles.judgeRow}>
                      <Text style={styles.judgeRank}>#{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.judgeName}>{sub.playerName}</Text>
                        <Text style={styles.judgeAnswer}>{sub.text}</Text>
                      </View>
                      <Pressable
                        style={[styles.judgeBtn, sub.isCorrect === true && styles.judgeBtnCorrect]}
                        onPress={() => judgeAnswer(sub.id, true)}
                      >
                        <Text style={styles.judgeBtnText}>✓</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.judgeBtn, sub.isCorrect === false && styles.judgeBtnWrong]}
                        onPress={() => judgeAnswer(sub.id, false)}
                      >
                        <Text style={styles.judgeBtnText}>✗</Text>
                      </Pressable>
                    </View>
                  ))
              )}

              <Pressable
                style={[styles.actionBtn, { marginTop: 20 }, (!allJudged && submissions.length > 0) && styles.actionBtnDisabled]}
                onPress={finalizeJudging}
                disabled={!allJudged && submissions.length > 0}
              >
                <LinearGradient colors={['#5AC8FA', '#34AADC']} style={styles.actionGradient}>
                  <Text style={styles.actionText}>
                    {submissions.length === 0 || allJudged ? 'Show Results' : 'Judge all answers to continue'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <View style={styles.centered}>
              <ActivityIndicator color="rgba(255,255,255,0.4)" size="large" />
              <Text style={styles.waitingText}>{currentDrawer.name} is judging the guesses…</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (phase === 'roundResults') {
    return (
      <View style={styles.container}>
        <AppBackgroundView />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.resultLabel}>The concept was</Text>
          <Text style={styles.resultConcept}>{concept}</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>ANSWERS</Text>
            {submissions.sort((a, b) => a.submittedAt - b.submittedAt).map((sub, i) => (
              <View key={sub.id} style={styles.answerRow}>
                <Text style={styles.answerRank}>#{i + 1}</Text>
                <Text style={styles.answerName}>{sub.playerName}</Text>
                <Text style={styles.answerText}>{sub.text}</Text>
                <IconSymbol
                  name={sub.isCorrect ? 'checkmark.circle.fill' : 'xmark.circle.fill' as any}
                  size={16}
                  color={sub.isCorrect ? Colors.green : Colors.red}
                />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>STANDINGS</Text>
            {leaderboard.map((p, i) => (
              <View key={p.id} style={styles.standingRow}>
                <Text style={styles.standingRank}>#{i + 1}</Text>
                <Text style={styles.standingName}>{p.name}</Text>
                <Text style={[styles.standingScore, i === 0 && { color: '#FFD93D' }]}>{p.score}</Text>
              </View>
            ))}
          </View>

          {isHost && (
            <Pressable style={styles.actionBtn} onPress={nextTurn}>
              <LinearGradient colors={['#5AC8FA', '#34AADC']} style={styles.actionGradient}>
                <Text style={styles.actionText}>
                  {currentDrawerIndex + 1 >= players.length ? 'Show Final Leaderboard' : 'Next Drawer'}
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  }

  // finalLeaderboard
  return (
    <View style={styles.container}>
      <AppBackgroundView />
      <View style={[styles.centered, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.finalTitle}>Final Leaderboard</Text>

        <View style={[styles.card, { width: '90%' }]}>
          {leaderboard.map((p, i) => (
            <View key={p.id} style={styles.finalRow}>
              <Text style={styles.finalEmoji}>{rankEmoji(i)}</Text>
              <Text style={styles.finalName}>{p.name}</Text>
              <Text style={[styles.finalScore, i === 0 && { color: '#FFD93D' }]}>{p.score}</Text>
            </View>
          ))}
        </View>

        <Pressable style={[styles.actionBtn, { marginTop: 20 }]} onPress={onExit}>
          <LinearGradient colors={[Colors.orange, '#FF6B00']} style={styles.actionGradient}>
            <Text style={styles.actionText}>Exit</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 12 },
  scroll: { paddingHorizontal: 16, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 24 },

  // Intro
  turnLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 12 },
  drawerPill: { backgroundColor: 'rgba(52,199,89,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  drawerPillText: { fontSize: 13, fontWeight: '700', color: Colors.green },
  subText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 280 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  timerPillDanger: { backgroundColor: 'rgba(255,59,48,0.15)' },
  timerText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  drawerInfo: { alignItems: 'flex-end' },
  drawerInfoLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  drawerInfoName: { fontSize: 13, fontWeight: '700', color: '#5AC8FA' },
  conceptText: { fontSize: 16, fontWeight: '700', color: '#5AC8FA', textAlign: 'center', marginBottom: 8 },

  // Canvas
  canvas: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  canvasPlaceholder: { fontSize: 22, color: 'rgba(255,255,255,0.2)' },

  // Guess
  guessRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  guessInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 13,
  },
  submitBtn: { backgroundColor: '#5AC8FA', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  submitBtnDisabled: { backgroundColor: '#555' },
  submitText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Locked
  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8,
  },
  lockedText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },

  // Strip
  strip: { flexGrow: 0, marginBottom: 8 },
  stripPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, marginRight: 6 },
  stripName: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },

  // Judge
  judgeTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 8 },
  conceptLabel: { fontSize: 13, fontWeight: '600', color: '#5AC8FA' },
  judgeHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  judgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, marginBottom: 8, width: '100%' },
  judgeRank: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', width: 28 },
  judgeName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  judgeAnswer: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  judgeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  judgeBtnCorrect: { backgroundColor: 'rgba(52,199,89,0.3)' },
  judgeBtnWrong: { backgroundColor: 'rgba(255,59,48,0.3)' },
  judgeBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Action Button
  actionBtn: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  actionBtnDisabled: { opacity: 0.5 },
  actionGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Waiting
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  waitingText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },

  // Results
  resultLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  resultConcept: { fontSize: 28, fontWeight: '800', color: '#5AC8FA', marginBottom: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14, width: '100%',
  },
  cardTitle: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, marginBottom: 12 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  answerRank: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', width: 28 },
  answerName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  answerText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  standingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  standingRank: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', width: 28 },
  standingName: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1 },
  standingScore: { fontSize: 13, fontWeight: '800', color: '#5AC8FA' },

  // Final
  trophy: { fontSize: 48, marginBottom: 4 },
  finalTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 16 },
  finalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  finalEmoji: { fontSize: 20, width: 36 },
  finalName: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  finalScore: { fontSize: 17, fontWeight: '800', color: '#5AC8FA' },
});

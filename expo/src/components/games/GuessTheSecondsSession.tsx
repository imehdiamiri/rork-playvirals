import { Colors } from '@/src/theme/Colors';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { GameSession } from '@/src/store/useGameStore';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Platform-safe haptics
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

interface Props {
  session: GameSession;
}

interface TurnResult {
  playerName: string;
  round: number;
  targetTime: number;
  actualTime: number;
  difference: number;
}

type TurnPhase = 'ready' | 'running' | 'reveal';

export function GuessTheSecondsSession({ session }: Props) {
  const players = session.players;
  const roundsPerPlayer = Math.max(1, session.maxRounds || 3);
  const totalTurns = players.length * roundsPerPlayer;

  // Build turn order: [P1-R1, P2-R1, P1-R2, P2-R2, ...]
  const turnOrder = useMemo(() => {
    const order: { playerIndex: number; round: number }[] = [];
    for (let r = 0; r < roundsPerPlayer; r++) {
      for (let p = 0; p < players.length; p++) {
        order.push({ playerIndex: p, round: r + 1 });
      }
    }
    return order;
  }, [players.length, roundsPerPlayer]);

  const [selectedTime, setSelectedTime] = useState(15.0);
  const [activeTurnIndex, setActiveTurnIndex] = useState(0);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('ready');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [results, setResults] = useState<TurnResult[]>([]);
  const [roundTargets, setRoundTargets] = useState<Record<number, number>>({});
  const [lastResult, setLastResult] = useState<TurnResult | null>(null);

  // Guard: if no players somehow, show nothing (prevents 0-turn instant finish)
  if (players.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 16 }}>No players found. Go back and add players.</Text>
      </View>
    );
  }

  const isFinished = activeTurnIndex >= totalTurns;
  const currentTurn = !isFinished ? turnOrder[activeTurnIndex] : null;
  const currentRoundNumber = currentTurn ? currentTurn.round : roundsPerPlayer;
  const currentPlayer = currentTurn ? players[currentTurn.playerIndex] : null;
  const isFirstPlayerOfCurrentRound = currentTurn ? currentTurn.playerIndex === 0 : false;
  const currentRoundTargetLocked = roundTargets[currentRoundNumber] !== undefined;
  const displayedTargetTime = roundTargets[currentRoundNumber] ?? selectedTime;

  const canEditTargetTime = turnPhase === 'ready' && !isFinished && isFirstPlayerOfCurrentRound && !currentRoundTargetLocked;

  // Render timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (turnPhase === 'running' && startedAt) {
      interval = setInterval(() => {
        setElapsedTime((Date.now() - startedAt) / 1000);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [turnPhase, startedAt]);

  const adjustTargetTime = (delta: number) => {
    if (!canEditTargetTime) return;
    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTime(prev => Math.min(Math.max(Math.round((prev + delta) * 100) / 100, 1), 60));
  };

  const startTurn = () => {
    if (turnPhase !== 'ready' || isFinished) return;

    if (roundTargets[currentRoundNumber] === undefined) {
      setRoundTargets(prev => ({
        ...prev,
        [currentRoundNumber]: Math.round(selectedTime * 100) / 100
      }));
    }

    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    setStartedAt(Date.now());
    setElapsedTime(0);
    setTurnPhase('running');
  };

  const stopTurn = () => {
    if (turnPhase !== 'running' || !startedAt || !currentPlayer) return;

    const actualTime = Math.round(((Date.now() - startedAt) / 1000) * 100) / 100;
    const targetTime = roundTargets[currentRoundNumber] ?? Math.round(selectedTime * 100) / 100;
    const difference = Math.round(Math.abs(targetTime - actualTime) * 100) / 100;

    const turn: TurnResult = {
      playerName: currentPlayer.username,
      round: currentRoundNumber,
      targetTime,
      actualTime,
      difference
    };

    // Haptic feedback based on accuracy
    if (difference === 0) {
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
    } else if (difference < 1) {
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
    } else if (difference <= 2) {
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Error);
    }

    setResults(prev => [...prev, turn]);
    setLastResult(turn);
    setElapsedTime(actualTime);
    setStartedAt(null);
    setTurnPhase('reveal'); // PAUSE on result — don't advance yet
  };

  const continueToNextTurn = () => {
    setActiveTurnIndex(prev => prev + 1);
    setTurnPhase('ready');
    setLastResult(null);
    setElapsedTime(0);

    // Check if game just finished
    if (activeTurnIndex + 1 >= totalTurns) {
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
    }
  };

  const playAgain = () => {
    setActiveTurnIndex(0);
    setTurnPhase('ready');
    setResults([]);
    setRoundTargets({});
    setLastResult(null);
    setElapsedTime(0);
    setStartedAt(null);
    setSelectedTime(15.0);
  };

  const getAccuracyBand = (diff: number) => {
    if (diff === 0) return { title: 'Perfect!', color: Colors.green, icon: 'target' as const };
    if (diff < 1) return { title: 'Close', color: Colors.blue, icon: 'scope' as const };
    if (diff <= 2) return { title: 'Okay', color: Colors.yellow, icon: 'scope' as const };
    return { title: 'Far', color: Colors.red, icon: 'scope' as const };
  };

  // Build per-player score summary
  const playerScores = useMemo(() => {
    return players.map(p => {
      const pResults = results.filter(r => r.playerName === p.username);
      const total = pResults.reduce((sum, r) => sum + r.difference, 0);
      const avg = pResults.length > 0 ? total / pResults.length : 0;
      return { player: p.username, total, avg, turns: pResults.length };
    }).sort((a, b) => a.total - b.total);
  }, [results, players]);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Header Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.roundText}>
            {isFinished ? 'All rounds complete' : `Round ${currentRoundNumber} / ${roundsPerPlayer}`}
          </Text>
          {currentPlayer && !isFinished && (
            <View style={styles.nowPlayingBadge}>
              <Text style={styles.nowPlayingText}>Now: {currentPlayer.username}</Text>
            </View>
          )}
          <View style={{flex: 1}}/>
          <Text style={[styles.statusLabel, {
            color: turnPhase === 'running' ? Colors.blue
              : turnPhase === 'reveal' ? Colors.yellow
              : isFinished ? Colors.green
              : 'rgba(255,255,255,0.5)'
          }]}>
            {isFinished ? 'Finished' : turnPhase === 'running' ? 'Running' : turnPhase === 'reveal' ? 'Result' : 'Ready'}
          </Text>
        </View>
      </View>

      {/* Turn Result Banner (shown during reveal phase) */}
      {turnPhase === 'reveal' && lastResult && (
        <View style={[styles.card, { borderColor: getAccuracyBand(lastResult.difference).color + '55' }]}>
          <View style={styles.resultHeader}>
            <IconSymbol name="flag.checkered" size={16} color={getAccuracyBand(lastResult.difference).color} />
            <Text style={styles.resultTitle}>{lastResult.playerName} • Round {lastResult.round}</Text>
            <View style={{flex: 1}}/>
            <View style={[styles.badge, { backgroundColor: getAccuracyBand(lastResult.difference).color + '33' }]}>
              <Text style={[styles.badgeText, { color: getAccuracyBand(lastResult.difference).color }]}>
                {getAccuracyBand(lastResult.difference).title}
              </Text>
            </View>
          </View>
          <View style={styles.resultMetrics}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Target</Text>
              <Text style={[styles.metricValue, { color: 'rgba(255,255,255,0.7)' }]}>{lastResult.targetTime.toFixed(2)}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Stopped</Text>
              <Text style={styles.metricValue}>{lastResult.actualTime.toFixed(2)}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Diff</Text>
              <Text style={[styles.metricValue, { color: getAccuracyBand(lastResult.difference).color }]}>
                {lastResult.difference.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Continue button */}
          <Pressable
            style={[styles.primaryButton, { backgroundColor: Colors.blue, marginTop: 16 }]}
            onPress={continueToNextTurn}
          >
            <IconSymbol name="arrow.right" size={20} color="white" />
            <Text style={styles.primaryButtonText}>
              {activeTurnIndex + 1 >= totalTurns ? 'See Results' : 'Next Turn'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Control Card */}
      {!isFinished && turnPhase !== 'reveal' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Target Time</Text>
          <Text style={styles.sectionSubtitle}>
            {currentRoundTargetLocked ? "This round target is locked for all players." : "Choose the target for this round."}
          </Text>

          <View style={styles.selectorArea}>
            <Pressable
              style={[styles.stepperButton, !canEditTargetTime && styles.stepperDisabled]}
              onPress={() => adjustTargetTime(-1)}
              disabled={!canEditTargetTime}
            >
              <IconSymbol name="minus" size={24} color={canEditTargetTime ? "white" : "rgba(255,255,255,0.3)"} />
            </Pressable>

            <View style={styles.timeDisplayBox}>
              <Text style={[styles.timeDisplay, turnPhase === 'running' && styles.timeDisplayRunning]}>
                {turnPhase === 'running' ? '•••••' : displayedTargetTime.toFixed(2)}
              </Text>
            </View>

            <Pressable
              style={[styles.stepperButton, !canEditTargetTime && styles.stepperDisabled]}
              onPress={() => adjustTargetTime(1)}
              disabled={!canEditTargetTime}
            >
              <IconSymbol name="plus" size={24} color={canEditTargetTime ? "white" : "rgba(255,255,255,0.3)"} />
            </Pressable>
          </View>

          <View style={styles.controlButtons}>
            {turnPhase === 'ready' && (
              <Pressable style={[styles.primaryButton, { backgroundColor: Colors.blue }]} onPress={startTurn}>
                <IconSymbol name="play.fill" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Start</Text>
              </Pressable>
            )}
            {turnPhase === 'running' && (
              <Pressable style={[styles.primaryButton, { backgroundColor: Colors.red }]} onPress={stopTurn}>
                <IconSymbol name="stop.fill" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Stop</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Live Score Table (visible during gameplay when we have results) */}
      {results.length > 0 && !isFinished && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Scores</Text>
          <Text style={styles.sectionSubtitle}>Lower difference is better</Text>

          {/* Per-round results */}
          <View style={styles.scoreTable}>
            {/* Header row */}
            <View style={styles.scoreHeaderRow}>
              <Text style={[styles.scoreHeaderCell, { flex: 2 }]}>Player</Text>
              {Array.from({ length: currentRoundNumber }, (_, i) => (
                <Text key={i} style={styles.scoreHeaderCell}>R{i + 1}</Text>
              ))}
              <Text style={[styles.scoreHeaderCell, { fontWeight: 'bold' }]}>Total</Text>
            </View>

            {/* Player rows */}
            {players.map((p, idx) => {
              const pResults = results.filter(r => r.playerName === p.username);
              const total = pResults.reduce((sum, r) => sum + r.difference, 0);
              return (
                <View key={p.id} style={[styles.scoreRow, currentPlayer?.username === p.username && turnPhase !== 'reveal' && styles.scoreRowActive]}>
                  <Text style={[styles.scoreCell, { flex: 2 }]} numberOfLines={1}>{p.username}</Text>
                  {Array.from({ length: currentRoundNumber }, (_, roundIdx) => {
                    const roundResult = pResults.find(r => r.round === roundIdx + 1);
                    if (!roundResult) return <Text key={roundIdx} style={styles.scoreCell}>—</Text>;
                    const band = getAccuracyBand(roundResult.difference);
                    return (
                      <Text key={roundIdx} style={[styles.scoreCell, { color: band.color }]}>
                        {roundResult.difference.toFixed(1)}
                      </Text>
                    );
                  })}
                  <Text style={[styles.scoreCell, { fontWeight: 'bold' }]}>{total.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Final Ranking Card */}
      {isFinished && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Final Results</Text>
          <Text style={styles.sectionSubtitle}>Lowest total difference wins.</Text>

          <View style={styles.rankingList}>
            {playerScores.map((rank, idx) => (
              <View key={rank.player} style={[styles.rankRow, idx === 0 && styles.winnerRow]}>
                <View style={[styles.rankBadge, idx === 0 && styles.winnerBadge]}>
                  <Text style={[styles.rankBadgeText, idx === 0 && styles.winnerBadgeText]}>#{idx + 1}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.rankName}>{rank.player}</Text>
                  <Text style={styles.rankAvg}>Avg {rank.avg.toFixed(2)}</Text>
                </View>
                <Text style={[styles.rankTotal, idx === 0 && styles.winnerTotal]}>
                  {rank.total.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {/* Play Again */}
          <Pressable
            style={[styles.primaryButton, { backgroundColor: Colors.green, marginTop: 16 }]}
            onPress={playAgain}
          >
            <IconSymbol name="arrow.counterclockwise" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Play Again</Text>
          </Pressable>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  nowPlayingBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nowPlayingText: {
    color: Colors.green,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  resultTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  selectorArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  stepperButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(10, 132, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  timeDisplayBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  timeDisplay: {
    color: 'white',
    fontSize: 48,
    fontWeight: '900',
  },
  timeDisplayRunning: {
    color: 'rgba(255,255,255,0.5)',
  },
  controlButtons: {
    gap: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    borderRadius: 100,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Score table
  scoreTable: {
    gap: 2,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  scoreHeaderCell: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  scoreRowActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  scoreCell: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  // Ranking
  rankingList: {
    gap: 10,
    marginTop: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  winnerRow: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerBadge: {
    backgroundColor: 'rgba(255, 214, 10, 0.22)',
  },
  rankBadgeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  winnerBadgeText: {
    color: Colors.yellow,
  },
  rankName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankAvg: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  rankTotal: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  winnerTotal: {
    color: Colors.green,
  }
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/theme/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * Shared "final scoreboard" primitive used by Memory Grid, Guess the Seconds
 * and Pass & Guess. Renders a sorted ranking with a winner highlight.
 *
 * Pass `entries` already sorted (best → worst). The first row is gilded.
 */

export interface RankEntry {
  id: string;
  name: string;
  /** Primary metric shown big on the right (e.g. "12 pts" or "3.21s"). */
  primary: string;
  /** Optional secondary line under the player name. */
  secondary?: string;
  /** Optional tint override for the player name. */
  nameColor?: string;
}

interface Props {
  entries: RankEntry[];
  title?: string;
  subtitle?: string;
  trophyColor?: string;
}

export function ResultsScoreboard({
  entries,
  title = 'Final Results',
  subtitle,
  trophyColor = Colors.yellow,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <IconSymbol name="trophy.fill" size={36} color={trophyColor} />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.list}>
        {entries.map((entry, idx) => (
          <View key={entry.id} style={[styles.row, idx === 0 && styles.rowWinner]}>
            <View style={[styles.badge, idx === 0 && styles.badgeWinner]}>
              <Text style={[styles.badgeText, idx === 0 && styles.badgeTextWinner]}>
                #{idx + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, entry.nameColor ? { color: entry.nameColor } : null]}>
                {entry.name}
              </Text>
              {entry.secondary ? (
                <Text style={styles.secondary}>{entry.secondary}</Text>
              ) : null}
            </View>
            <Text style={[styles.primary, idx === 0 && styles.primaryWinner]}>
              {entry.primary}
            </Text>
            {idx === 0 && <IconSymbol name="crown.fill" size={18} color={trophyColor} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  header: { alignItems: 'center', gap: 6 },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  rowWinner: {
    backgroundColor: 'rgba(255,204,0,0.08)',
    borderColor: 'rgba(255,204,0,0.22)',
  },
  badge: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeWinner: { backgroundColor: 'rgba(255,214,10,0.22)' },
  badgeText: { color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' },
  badgeTextWinner: { color: Colors.yellow },
  name: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  secondary: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  primary: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  primaryWinner: { color: Colors.green },
});

/**
 * SharedResultBuilder — matches iOS SharedResultBuilder.swift
 * Builds sorted result rows for end-of-game scoreboard.
 */

export interface GameResultRow {
  name: string;
  score: number;
  rank: number;
  starsWon: number;
}

interface PlayerProfile {
  id: string;
  username: string;
}

interface RewardPolicy {
  starsForWin: number;
  starsForParticipation: number;
}

const DEFAULT_POLICY: RewardPolicy = {
  starsForWin: 5,
  starsForParticipation: 1,
};

export function buildResults(
  players: PlayerProfile[],
  scores: Record<string, number>,
  policy: RewardPolicy = DEFAULT_POLICY
): GameResultRow[] {
  const sorted = [...players].sort((a, b) => {
    const aScore = scores[a.id] ?? 0;
    const bScore = scores[b.id] ?? 0;
    return bScore - aScore;
  });

  return sorted.map((player, index) => {
    const rank = index + 1;
    const score = scores[player.id] ?? 0;
    const isWin = rank === 1;
    const starsWon = isWin ? policy.starsForWin : policy.starsForParticipation;

    return {
      name: player.username,
      score,
      rank,
      starsWon,
    };
  });
}

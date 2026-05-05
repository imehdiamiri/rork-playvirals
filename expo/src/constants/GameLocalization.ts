/**
 * GameLocalization — matches iOS GameLocalization.swift
 * Game-specific instructions (how-to-play) for each game.
 * Currently English-only but structured for i18n.
 */

export const GameInstructions: Record<string, string[]> = {
  reverse_singing: [
    "Player 1 records anything — a word, a sound, a melody.",
    "Player 2 listens to the reversed version.",
    "Player 2 records their best mimic of what they heard.",
    "Hit Result and hear how close they got!"
  ],
  guess_the_seconds: [
    "Pick players and rounds, then choose a target time.",
    "Press Start to hide the target and begin counting mentally.",
    "Press Stop when you think the exact time has passed.",
    "Lowest total difference across all rounds wins."
  ],
  ten_tangle: [
    "Each round, one player is the Guesser. Others get a secret number 1–10.",
    "A scenario is shown. Players act based on their number (1 = Disaster, 10 = Perfect).",
    "The Guesser watches and tries to guess each player's secret number.",
    "Exact match = +1 point. Most points after all rounds wins!"
  ],
  imposter: [
    "Each player secretly sees their role — one is the Imposter.",
    "A secret word is revealed to everyone except the Imposter.",
    "Discuss or give clues to figure out who the Imposter is.",
    "Vote on the suspect. Majority catches the Imposter!"
  ],
  memory_path: [
    "A hidden path exists from Start to End on the grid.",
    "Tap tiles to discover the path — wrong tile resets your progress!",
    "Memorize the path and complete it faster than everyone else.",
    "Use your one-time hint to reveal the full path for 5 seconds."
  ],
  pass_guess: [
    "A question is shown — each player writes their answer in turn.",
    "Pass the phone to the next player so they can write theirs.",
    "Once everyone has answered, all answers are revealed and players guess who wrote what.",
    "Correct guess = points! Most points wins."
  ],
  memory_grid: [
    "A grid of face-down tiles is shown.",
    "Tap two tiles to flip them — if they match, they stay open.",
    "If they don't match, they flip back — use your memory!",
    "Find all pairs as fast as possible to win."
  ],
  tap_in_order: [
    "Two memory modes: Number Memory and Pattern Memory.",
    "You get 5 seconds to memorize the board.",
    "Number Memory: tap the tiles in order (1 → N) from memory.",
    "Pattern Memory: tap every highlighted tile — order doesn't matter.",
    "Most correct taps with the fewest mistakes wins."
  ],
  spin_bottle: [
    "Add player names — they sit around in a circle on screen.",
    "Tap Spin to send the bottle spinning. It will randomly stop at one player.",
    "That player picks Truth or Dare. A full-screen card is revealed.",
    "Up to 2 rerolls if the prompt doesn't fit. Tap Done and spin again."
  ],
  color_trap: [
    "A forbidden color is shown before you start.",
    "Tap every colored tile EXCEPT the forbidden one.",
    "Three wrong taps and you're out.",
    "Survive longest and score the most hits to win."
  ],
  draw_rush: [
    "Each player takes turns as the drawer. Others guess.",
    "The drawer gets a secret word and 60 seconds to draw it.",
    "Each guesser types their answer one at a time.",
    "The drawer judges each guess. Correct guesses earn points!"
  ],
};

/** Get game instructions, with fallback */
export function getGameInstructions(gameId: string): string[] {
  return GameInstructions[gameId] || [
    "This game is ready to play!",
    "Set up players and tap Start.",
  ];
}

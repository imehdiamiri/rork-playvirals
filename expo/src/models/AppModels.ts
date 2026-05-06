import { Colors } from '@/src/theme/Colors';
export enum GameMode {
  singleDevice = 'singleDevice',
  multiDevice = 'multiDevice',
  teamMode = 'teamMode',
}

export const GameModeDetails: Record<
  GameMode,
  { title: string; subtitle: string; icon: string; accentColor: string; shortLabel: string }
> = {
  [GameMode.singleDevice]: {
    title: '1 Phone',
    subtitle: 'Everyone plays on 1 phone',
    icon: 'smartphone', // SF: iphone.gen3
    accentColor: '#007AFF', // blue
    shortLabel: '1-D',
  },
  [GameMode.multiDevice]: {
    title: 'Multi Phone',
    subtitle: 'Everyone plays on their own phone',
    icon: 'apps', // SF: apps.iphone
    accentColor: Colors.green, // green
    shortLabel: 'Multi-D',
  },
  [GameMode.teamMode]: {
    title: 'Team Mode',
    subtitle: 'Split into 2 teams and compete',
    icon: 'groups', // SF: person.line.dotted.person.fill
    accentColor: '#AF52DE', // purple
    shortLabel: 'Team',
  },
};

export interface GameType {
  id: string;
  name: string;
  shortDescription: string;
  minPlayers: number;
  maxPlayers: number;
  unlockCostStars: number;
  isFreeForever: boolean;
  hasFreeTrial: boolean;
  isPremium: boolean;
  symbolName: string; // React Native / Expo vector icon mapping
  supportedModes: GameMode[];
  roundDuration: number;
  heroImageURL: string | null;
}

export const Games: Record<string, GameType> = {
  reverseSinging: {
    id: 'reverse_singing',
    name: 'Reverse Singing',
    shortDescription: 'Pass the phone. Record anything. Hear it reversed. Mimic it. Compare the chaos.',
    minPlayers: 2,
    maxPlayers: 2,
    unlockCostStars: 0,
    isFreeForever: true,
    hasFreeTrial: false,
    isPremium: false,
    symbolName: 'backward.fill', // SF: backward.fill
    supportedModes: [GameMode.singleDevice],
    roundDuration: 75,
    heroImageURL: 'https://r2-pub.rork.com/generated-images/b17e5d76-7bf4-46aa-b32c-34db233473bd.png',
  },
  guessTheSeconds: {
    id: 'guess_the_seconds',
    name: 'Guess the Seconds',
    shortDescription: 'Choose a target time, hide it, count in your head, then stop as close as you can.',
    minPlayers: 2,
    maxPlayers: 30,
    unlockCostStars: 0,
    isFreeForever: true,
    hasFreeTrial: false,
    isPremium: false,
    symbolName: 'stopwatch.fill', // SF: stopwatch.fill
    supportedModes: [GameMode.singleDevice],
    roundDuration: 90,
    heroImageURL: 'https://r2-pub.rork.com/generated-images/d8092484-fefa-4921-9732-636c97a59a09.png',
  },
  tenTangle: {
    id: 'ten_tangle',
    name: 'Ten Tangle',
    shortDescription: 'Get a secret number 1–10, act it out for a scenario, and fool the guesser.',
    minPlayers: 3,
    maxPlayers: 11,
    unlockCostStars: 0,
    isFreeForever: false,
    hasFreeTrial: false,
    isPremium: true,
    symbolName: 'theatermasks.fill', // SF: theatermasks.fill
    supportedModes: [GameMode.singleDevice],
    roundDuration: 0,
    heroImageURL: 'https://r2-pub.rork.com/generated-images/e877a51b-281e-4b8c-bb95-823ae44216f1.png',
  },
  imposter: {
    id: 'imposter',
    name: 'Imposter',
    shortDescription: "One player is the Imposter — find them before it's too late, or bluff your way to victory.",
    minPlayers: 4,
    maxPlayers: 30,
    unlockCostStars: 0,
    isFreeForever: true,
    hasFreeTrial: false,
    isPremium: false,
    symbolName: 'eye.fill', // SF: eye.fill
    supportedModes: [GameMode.singleDevice],
    roundDuration: 0,
    heroImageURL: 'https://r2-pub.rork.com/generated-images/01a6d899-88d4-4d01-8758-7dd451fd48da.png',
  },
  memoryGrid: {
    id: 'memory_grid',
    name: 'Memory Grid',
    shortDescription: 'Flip tiles, find matching pairs, and race the clock — or your friends.',
    minPlayers: 1,
    maxPlayers: 30,
    unlockCostStars: 0,
    isFreeForever: true,
    hasFreeTrial: false,
    isPremium: false,
    symbolName: 'square.grid.3x3.fill', // SF: square.grid.3x3.fill
    supportedModes: [GameMode.singleDevice, GameMode.multiDevice, GameMode.teamMode],
    roundDuration: 0,
    heroImageURL: 'https://r2-pub.rork.com/generated-images/630d9ac5-1895-4593-9ea2-7cd581f42ce6.png',
  },
  memoryPath: {
    id: 'memory_path',
    name: 'Memory Path',
    shortDescription: 'Find the hidden path from start to end — one wrong step and you restart.',
    minPlayers: 2,
    maxPlayers: 30,
    unlockCostStars: 0,
    isFreeForever: false,
    hasFreeTrial: false,
    isPremium: true,
    symbolName: 'map.fill', // SF: map.fill
    supportedModes: [GameMode.singleDevice, GameMode.multiDevice, GameMode.teamMode],
    roundDuration: 0,
    heroImageURL: 'https://r2-pub.rork.com/generated-images/8f997aac-f4e2-46f7-92d6-aa55f8b197ff.png',
  },
  tapInOrder: {
    id: 'tap_in_order',
    name: 'Tap in Order',
    shortDescription: 'Race against the clock to tap numbered tiles in order. Same board for every player.',
    minPlayers: 1,
    maxPlayers: 30,
    unlockCostStars: 0,
    isFreeForever: false,
    hasFreeTrial: false,
    isPremium: true,
    symbolName: 'number.square.fill', // SF: number.square.fill -> roughly 123
    supportedModes: [GameMode.singleDevice, GameMode.multiDevice],
    roundDuration: 0,
    heroImageURL: null,
  },
  colorTrap: {
    id: 'color_trap',
    name: 'Color Trap',
    shortDescription: "Tap every color except the forbidden one. Three strikes and you're out.",
    minPlayers: 1,
    maxPlayers: 30,
    unlockCostStars: 0,
    isFreeForever: false,
    hasFreeTrial: false,
    isPremium: true,
    symbolName: 'paintpalette.fill', // SF: paintpalette.fill
    supportedModes: [GameMode.singleDevice, GameMode.multiDevice],
    roundDuration: 0,
    heroImageURL: null,
  },
  passGuess: {
    id: 'pass_guess',
    name: 'Pass & Guess',
    shortDescription: 'Pass one phone, write private answers, then guess who wrote each one before the final reveal.',
    minPlayers: 2,
    maxPlayers: 30,
    unlockCostStars: 0,
    isFreeForever: false,
    hasFreeTrial: false,
    isPremium: true,
    symbolName: 'text.bubble.fill', // SF: text.bubble.fill
    supportedModes: [GameMode.singleDevice],
    roundDuration: 0,
    heroImageURL: 'https://r2-pub.rork.com/generated-images/9501d164-3c05-4a45-9d4e-51ffe0fd7aca.png',
  },
  spinBottle: {
    id: 'spin_bottle',
    name: 'Truth & Dare',
    shortDescription: 'Spin the bottle, get picked, and pick Truth or Dare. Classic party energy.',
    minPlayers: 3,
    maxPlayers: 12,
    unlockCostStars: 0,
    isFreeForever: true,
    hasFreeTrial: false,
    isPremium: false,
    symbolName: 'arrow.triangle.2.circlepath', // SF: arrow.triangle.2.circlepath
    supportedModes: [GameMode.singleDevice],
    roundDuration: 0,
    heroImageURL: null,
  },
  drawRush: {
    id: 'draw_rush',
    name: 'Draw & Rush',
    shortDescription: 'One player draws a secret concept while everyone else rushes to guess what it is.',
    minPlayers: 2,
    maxPlayers: 12,
    unlockCostStars: 0,
    isFreeForever: false,
    hasFreeTrial: false,
    isPremium: true,
    symbolName: 'pencil.and.scribble', // SF: pencil.and.scribble
    supportedModes: [GameMode.singleDevice, GameMode.multiDevice],
    roundDuration: 100,
    heroImageURL: null,
  },
};

export const GameLibrary: GameType[] = [
  Games.reverseSinging,
  Games.guessTheSeconds,
  Games.imposter,
  Games.memoryGrid,
  Games.tenTangle,
  Games.memoryPath,
  Games.passGuess,
  Games.tapInOrder,
  Games.colorTrap,
  Games.drawRush,
  Games.spinBottle,
];

export interface GameDefinition {
  id: GameType;
  accentName: string;
}

export const GamesDefinitions: GameDefinition[] = [
  { id: Games.reverseSinging, accentName: 'pink' },
  { id: Games.guessTheSeconds, accentName: 'cyan' },
  { id: Games.imposter, accentName: 'red' },
  { id: Games.memoryGrid, accentName: 'blue' },
  { id: Games.tenTangle, accentName: 'purple' },
  { id: Games.memoryPath, accentName: 'orange' },
  { id: Games.passGuess, accentName: 'yellow' },
  { id: Games.tapInOrder, accentName: 'teal' },
  { id: Games.colorTrap, accentName: 'red' },
  { id: Games.drawRush, accentName: 'blue' },
  { id: Games.spinBottle, accentName: 'purple' },
];

export const getPlayerCountText = (min: number, max: number): string => `${min}–${max} players`;

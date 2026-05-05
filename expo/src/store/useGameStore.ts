import { create } from 'zustand';
import { GameType, GameMode } from '@/src/models/AppModels';

export interface PlayerProfile {
  id: string;
  username: string;
  isHost: boolean;
  avatarId?: string;
}

export enum MatchPhase {
  setup = 'setup',
  starting = 'starting',
  playing = 'playing',
  results = 'results',
  finished = 'finished'
}

export interface GameSession {
  id: string;
  game: GameType;
  mode: GameMode;
  roomCode?: string;
  players: PlayerProfile[];
  currentRoundIndex: number;
  phase: MatchPhase;
  rounds?: any[];
  maxRounds?: number;
  gameConfig?: Record<string, any>;
}

interface GameStoreState {
  activeSession: GameSession | null;
  startSingleDeviceSession: (game: GameType, playerNames: string[], rounds: number, gameConfig?: Record<string, any>) => void;
  exitActiveSession: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  activeSession: null,
  
  startSingleDeviceSession: (game, playerNames, rounds, gameConfig) => {
    const players: PlayerProfile[] = playerNames.map((name, index) => ({
      id: `player_${index}`,
      username: name,
      isHost: index === 0,
    }));
    
    set({
      activeSession: {
        id: Math.random().toString(36).substring(7),
        game,
        mode: GameMode.singleDevice,
        players,
        currentRoundIndex: 0,
        phase: MatchPhase.playing,
        maxRounds: rounds,
        gameConfig,
      }
    });
  },
  
  exitActiveSession: () => {
    set({ activeSession: null });
  }
}));

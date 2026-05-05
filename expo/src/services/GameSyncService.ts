import { rtdb as database } from '../lib/firebase';
import { ref, set, get, onValue, update, remove, push, onDisconnect, serverTimestamp } from 'firebase/database';

/**
 * GameSyncService — Real-time game state synchronization for multi-device play.
 * Broadcasts turn data, phase transitions, scores, and player actions via Firebase RTDB.
 * 
 * Data structure under /rooms/{roomCode}/gameState/:
 *   phase: string               — current game phase
 *   currentPlayerIdx: number    — whose turn it is
 *   round: number              — current round
 *   scores: Record<pid, number> — live scores
 *   turnData: any              — game-specific turn payload
 *   timestamp: number          — server timestamp for ordering
 *   actions: {                 — player-submitted actions
 *     [actionId]: { playerId, type, data, timestamp }
 *   }
 */

export interface GameStatePayload {
  phase: string;
  currentPlayerIdx: number;
  round: number;
  scores: Record<string, number>;
  turnData?: any;
  timestamp?: number;
}

export interface PlayerAction {
  playerId: string;
  type: string; // 'vote', 'guess', 'flip', 'tap', 'draw', 'answer', etc.
  data: any;
  timestamp: number;
}

class GameSyncService {
  private listeners: Map<string, () => void> = new Map();

  /** Initialize game state for a room (host only) */
  async initGameState(roomCode: string, initialState: GameStatePayload): Promise<void> {
    const stateRef = ref(database, `rooms/${roomCode}/gameState`);
    await set(stateRef, {
      ...initialState,
      timestamp: Date.now(),
    });
  }

  /** Update game phase / turn / scores (host broadcasts to all) */
  async broadcastState(roomCode: string, partialState: Partial<GameStatePayload>): Promise<void> {
    const stateRef = ref(database, `rooms/${roomCode}/gameState`);
    await update(stateRef, {
      ...partialState,
      timestamp: Date.now(),
    });
  }

  /** Push a player action (vote, guess, tap, etc.) */
  async pushAction(roomCode: string, action: Omit<PlayerAction, 'timestamp'>): Promise<void> {
    const actionsRef = ref(database, `rooms/${roomCode}/gameState/actions`);
    const newRef = push(actionsRef);
    await set(newRef, {
      ...action,
      timestamp: Date.now(),
    });
  }

  /** Listen to game state changes (all players) */
  listenToGameState(
    roomCode: string,
    callback: (state: GameStatePayload | null) => void
  ): () => void {
    const stateRef = ref(database, `rooms/${roomCode}/gameState`);
    const unsubscribe = onValue(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as GameStatePayload);
      } else {
        callback(null);
      }
    });
    this.listeners.set(`state_${roomCode}`, unsubscribe);
    return unsubscribe;
  }

  /** Listen to player actions (host collects) */
  listenToActions(
    roomCode: string,
    callback: (actions: Record<string, PlayerAction>) => void
  ): () => void {
    const actionsRef = ref(database, `rooms/${roomCode}/gameState/actions`);
    const unsubscribe = onValue(actionsRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : {});
    });
    this.listeners.set(`actions_${roomCode}`, unsubscribe);
    return unsubscribe;
  }

  /** Clear actions between rounds */
  async clearActions(roomCode: string): Promise<void> {
    const actionsRef = ref(database, `rooms/${roomCode}/gameState/actions`);
    await remove(actionsRef);
  }

  /** Set player presence (auto-cleanup on disconnect) */
  async setPresence(roomCode: string, playerId: string): Promise<void> {
    const presenceRef = ref(database, `rooms/${roomCode}/presence/${playerId}`);
    await set(presenceRef, { online: true, lastSeen: Date.now() });
    onDisconnect(presenceRef).set({ online: false, lastSeen: Date.now() });
  }

  /** Listen to player presence */
  listenToPresence(
    roomCode: string,
    callback: (presence: Record<string, { online: boolean; lastSeen: number }>) => void
  ): () => void {
    const presenceRef = ref(database, `rooms/${roomCode}/presence`);
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : {});
    });
    this.listeners.set(`presence_${roomCode}`, unsubscribe);
    return unsubscribe;
  }

  /** Clean up game state when room is closed */
  async cleanupGameState(roomCode: string): Promise<void> {
    const stateRef = ref(database, `rooms/${roomCode}/gameState`);
    const presenceRef = ref(database, `rooms/${roomCode}/presence`);
    await Promise.all([remove(stateRef), remove(presenceRef)]);
  }

  /** Remove all listeners for a room */
  removeAllListeners(roomCode: string): void {
    for (const [key, unsub] of this.listeners) {
      if (key.includes(roomCode)) {
        unsub();
        this.listeners.delete(key);
      }
    }
  }
}

export const gameSyncService = new GameSyncService();

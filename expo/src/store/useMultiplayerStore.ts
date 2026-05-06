import { create } from 'zustand';
import { multiplayerService, MultiplayerRoom } from '../services/MultiplayerService';
import { gameSyncService, GameStatePayload, PlayerAction } from '../services/GameSyncService';
import { auth } from '../lib/firebase';

/**
 * useMultiplayerStore — single source of truth for the active room session.
 *
 * Identity: `localPlayerId` is ALWAYS `auth.currentUser.uid`. RTDB rules
 * require this for player/presence/action writes. Anonymous users get a
 * persistent uid via Firebase anonymous sign-in (handled in _layout.tsx),
 * so even guest play works without random ids.
 *
 * Host migration: when the current host's player row disappears (left or
 * presence timed out) the store calls `multiplayerService.claimHost`. The
 * lowest joinedAt remaining player wins. Failure is silent (another peer
 * already won the race).
 */
interface MultiplayerState {
  currentRoom: MultiplayerRoom | null;
  roomCode: string | null;
  isHost: boolean;
  localPlayerId: string | null;
  error: string | null;
  isBusy: boolean;

  // Game sync state
  gameState: GameStatePayload | null;
  playerActions: Record<string, PlayerAction>;
  presence: Record<string, { online: boolean; lastSeen: number }>;

  createRoom: (gameId: string, hostName: string) => Promise<string>;
  joinRoom: (roomCode: string, playerName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  startGame: () => Promise<void>;
  clearError: () => void;

  // Game sync methods
  initGameSync: (initialState: GameStatePayload) => Promise<void>;
  broadcastState: (partialState: Partial<GameStatePayload>) => Promise<void>;
  pushAction: (type: string, data: any) => Promise<void>;
  clearActions: () => Promise<void>;
  subscribeToGameState: () => void;
  unsubscribeAll: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => {
  let unsubscribe: (() => void) | null = null;
  let gameStateUnsub: (() => void) | null = null;
  let actionsUnsub: (() => void) | null = null;
  let presenceUnsub: (() => void) | null = null;

  // Try once to promote ourselves to host when the previous host disappears.
  // RTDB rules + claimHost() guarantee at most one peer succeeds.
  function maybeClaimHost(room: MultiplayerRoom | null): void {
    if (!room) return;
    const myId = get().localPlayerId;
    if (!myId) return;
    const players = room.players || {};
    const hostStillPresent = !!(room.hostId && players[room.hostId]);
    if (hostStillPresent) return;
    if (!players[myId]) return;
    const candidates = Object.values(players).sort(
      (a: any, b: any) => (a.joinedAt || 0) - (b.joinedAt || 0)
    );
    if (candidates[0]?.id !== myId) return;
    multiplayerService.claimHost(room.roomCode).catch(() => {});
  }

  return {
    currentRoom: null,
    roomCode: null,
    isHost: false,
    localPlayerId: null,
    error: null,
    isBusy: false,
    gameState: null,
    playerActions: {},
    presence: {},

    createRoom: async (gameId: string, hostName: string) => {
      set({ isBusy: true, error: null });
      try {
        const { roomCode, hostId } = await multiplayerService.createRoom(gameId, hostName);

        set({
          roomCode,
          isHost: true,
          localPlayerId: hostId,
          isBusy: false,
        });

        unsubscribe = multiplayerService.listenToRoom(roomCode, (room) => {
          if (!room || room.status === 'closed') {
            if (get().currentRoom) {
              set({ currentRoom: null, roomCode: null, error: 'Room was closed' });
              if (unsubscribe) unsubscribe();
            }
            return;
          }
          // Reflect actual host on the room snapshot (in case migration happened).
          set({
            currentRoom: room,
            isHost: room.hostId === get().localPlayerId,
          });
          maybeClaimHost(room);
        });

        await gameSyncService.setPresence(roomCode, hostId);
        return roomCode;
      } catch (err: any) {
        set({ error: err.message, isBusy: false });
        throw err;
      }
    },

    joinRoom: async (code: string, playerName: string) => {
      set({ isBusy: true, error: null });
      try {
        const { playerId } = await multiplayerService.joinRoom(code, playerName);

        set({
          roomCode: code,
          isHost: false,
          localPlayerId: playerId,
          isBusy: false,
        });

        unsubscribe = multiplayerService.listenToRoom(code, (room) => {
          if (!room || room.status === 'closed') {
            if (get().currentRoom) {
              set({ currentRoom: null, roomCode: null, error: 'Room was closed' });
              if (unsubscribe) unsubscribe();
            }
            return;
          }
          set({
            currentRoom: room,
            isHost: room.hostId === get().localPlayerId,
          });
          maybeClaimHost(room);
        });

        await gameSyncService.setPresence(code, playerId);
      } catch (err: any) {
        set({ error: err.message, isBusy: false });
        throw err;
      }
    },

    leaveRoom: async () => {
      const { roomCode, localPlayerId, isHost } = get();
      if (!roomCode || !localPlayerId) return;

      try {
        gameSyncService.stopHeartbeat(roomCode, localPlayerId);
        if (isHost) {
          // Host explicitly closes — flag the room closed so peers exit cleanly.
          // The Cloud Function sweeper GCs the actual node based on TTL.
          await multiplayerService.closeRoom(roomCode);
          await gameSyncService.cleanupGameState(roomCode).catch(() => {});
        } else {
          await multiplayerService.leaveRoom(roomCode, localPlayerId);
        }
      } catch (e) {
        console.warn('Multiplayer: leaveRoom error', (e as Error)?.message);
      } finally {
        get().unsubscribeAll();
        if (unsubscribe) unsubscribe();
        set({
          currentRoom: null,
          roomCode: null,
          localPlayerId: null,
          isHost: false,
          gameState: null,
          playerActions: {},
          presence: {},
        });
      }
    },

    startGame: async () => {
      const { roomCode, isHost } = get();
      if (roomCode && isHost) {
        await multiplayerService.startGame(roomCode);
      }
    },

    clearError: () => set({ error: null }),

    // ═══ Game Sync Methods ═══

    initGameSync: async (initialState: GameStatePayload) => {
      const { roomCode, isHost } = get();
      if (!roomCode || !isHost) return;
      await gameSyncService.initGameState(roomCode, initialState);
    },

    broadcastState: async (partialState: Partial<GameStatePayload>) => {
      const { roomCode, isHost } = get();
      if (!roomCode || !isHost) return;
      await gameSyncService.broadcastState(roomCode, partialState);
    },

    pushAction: async (type: string, data: any) => {
      const { roomCode, localPlayerId } = get();
      if (!roomCode || !localPlayerId) return;
      await gameSyncService.pushAction(roomCode, {
        playerId: localPlayerId,
        type,
        data,
      });
    },

    clearActions: async () => {
      const { roomCode, isHost } = get();
      if (!roomCode || !isHost) return;
      await gameSyncService.clearActions(roomCode);
    },

    subscribeToGameState: () => {
      const { roomCode } = get();
      if (!roomCode) return;

      gameStateUnsub = gameSyncService.listenToGameState(roomCode, (state) => {
        set({ gameState: state });
      });

      actionsUnsub = gameSyncService.listenToActions(roomCode, (actions) => {
        set({ playerActions: actions });
      });

      presenceUnsub = gameSyncService.listenToPresence(roomCode, (presence) => {
        set({ presence });
        // Re-evaluate host migration whenever presence changes.
        maybeClaimHost(get().currentRoom);
      });
    },

    unsubscribeAll: () => {
      const { roomCode } = get();
      if (roomCode) gameSyncService.removeAllListeners(roomCode);
      if (gameStateUnsub) { gameStateUnsub(); gameStateUnsub = null; }
      if (actionsUnsub) { actionsUnsub(); actionsUnsub = null; }
      if (presenceUnsub) { presenceUnsub(); presenceUnsub = null; }
    },
  };
});

// Keep the auth import alive for tree-shakers; we use it indirectly via service.
void auth;

import { create } from 'zustand';
import { multiplayerService, MultiplayerRoom, MultiplayerPlayer } from '../services/MultiplayerService';
import { gameSyncService, GameStatePayload, PlayerAction } from '../services/GameSyncService';

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
        const localId = `user_${Math.random().toString(36).substr(2, 9)}`;
        const code = await multiplayerService.createRoom(gameId, hostName, localId);
        
        set({ 
          roomCode: code, 
          isHost: true, 
          localPlayerId: localId,
          isBusy: false 
        });

        unsubscribe = multiplayerService.listenToRoom(code, (room) => {
          if (!room && get().currentRoom) {
            set({ currentRoom: null, roomCode: null, error: 'Room was closed by host' });
            if (unsubscribe) unsubscribe();
          } else {
            set({ currentRoom: room });
          }
        });

        // Set presence
        await gameSyncService.setPresence(code, localId);

        return code;
      } catch (err: any) {
        set({ error: err.message, isBusy: false });
        throw err;
      }
    },

    joinRoom: async (code: string, playerName: string) => {
      set({ isBusy: true, error: null });
      try {
        const localId = `user_${Math.random().toString(36).substr(2, 9)}`;
        await multiplayerService.joinRoom(code, playerName, localId);
        
        set({ 
          roomCode: code, 
          isHost: false, 
          localPlayerId: localId,
          isBusy: false 
        });

        unsubscribe = multiplayerService.listenToRoom(code, (room) => {
          if (!room && get().currentRoom) {
            set({ currentRoom: null, roomCode: null, error: 'Room was closed by host' });
            if (unsubscribe) unsubscribe();
          } else {
            set({ currentRoom: room });
          }
        });

        // Set presence
        await gameSyncService.setPresence(code, localId);
      } catch (err: any) {
        set({ error: err.message, isBusy: false });
        throw err;
      }
    },

    leaveRoom: async () => {
      const { roomCode, localPlayerId, isHost } = get();
      if (!roomCode || !localPlayerId) return;

      try {
        if (isHost) {
          await gameSyncService.cleanupGameState(roomCode);
          await multiplayerService.closeRoom(roomCode);
        } else {
          await multiplayerService.leaveRoom(roomCode, localPlayerId);
        }
      } catch (e) {
        console.error("Error leaving room", e);
      } finally {
        get().unsubscribeAll();
        if (unsubscribe) unsubscribe();
        set({ currentRoom: null, roomCode: null, localPlayerId: null, isHost: false, gameState: null, playerActions: {}, presence: {} });
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
      const { roomCode } = get();
      if (!roomCode) return;
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
      const { roomCode } = get();
      if (!roomCode) return;
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


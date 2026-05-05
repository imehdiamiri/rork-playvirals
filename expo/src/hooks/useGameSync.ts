import { useEffect, useCallback, useRef } from 'react';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { GameMode } from '../models/AppModels';

/**
 * useGameSync: A hook to synchronize mini-game state across devices using Firebase.
 * 
 * In Single-device mode: Everything runs locally.
 * In Multi-device mode: 
 *  - The HOST computes the logic and calls `syncState(newState)` to broadcast it.
 *  - The CLIENTS receive the state automatically and just render it. 
 *  - When CLIENTS interact (e.g., tap a tile), they call `sendAction('tap', { index })`.
 *  - The HOST receives actions via `onActionReceived` and processes them.
 */
export function useGameSync<T>(
  mode: GameMode,
  localState: T,
  setLocalState: React.Dispatch<React.SetStateAction<T>>,
  onActionReceived?: (type: string, data: any, playerId: string) => void
) {
  const isMultiplayer = mode === GameMode.multiDevice || mode === GameMode.teamMode;
  const { gameState, broadcastState, pushAction, playerActions, isHost, clearActions } = useMultiplayerStore();
  
  // Keep track of processed action timestamps to avoid re-running them
  const lastProcessedTime = useRef<number>(0);

  // --- HOST: Listen to Client Actions ---
  useEffect(() => {
    if (isMultiplayer && isHost && onActionReceived) {
      const actions = Object.values(playerActions);
      if (actions.length === 0) return;

      // Filter out old actions
      const newActions = actions.filter(a => a.timestamp > lastProcessedTime.current);
      
      newActions.forEach(action => {
        onActionReceived(action.type, action.data, action.playerId);
        lastProcessedTime.current = Math.max(lastProcessedTime.current, action.timestamp);
      });

      // Clear them from Firebase so it doesn't pile up
      if (newActions.length > 0) {
        clearActions();
      }
    }
  }, [playerActions, isHost, isMultiplayer, onActionReceived, clearActions]);

  // --- CLIENT: Listen to Host State Updates ---
  useEffect(() => {
    if (isMultiplayer && !isHost && gameState?.turnData) {
      setLocalState(gameState.turnData as T);
    }
  }, [isMultiplayer, isHost, gameState?.turnData, setLocalState]);

  // --- HOST: Broadcast State Updates ---
  const syncState = useCallback((newState: T | ((prev: T) => T)) => {
    setLocalState(prev => {
      const resolvedState = typeof newState === 'function' ? (newState as any)(prev) : newState;
      
      if (isMultiplayer && isHost) {
        // Host broadcasts the finalized state to everyone
        broadcastState({ turnData: resolvedState });
      }
      return resolvedState;
    });
  }, [isMultiplayer, isHost, broadcastState, setLocalState]);

  // --- CLIENT: Send Interaction ---
  const sendAction = useCallback((type: string, data: any) => {
    if (isMultiplayer && !isHost) {
      pushAction(type, data);
    } else if (!isMultiplayer || isHost) {
      // If it's single device or the host itself tapped something, 
      // directly trigger the action handler.
      if (onActionReceived) {
        onActionReceived(type, data, 'host');
      }
    }
  }, [isMultiplayer, isHost, pushAction, onActionReceived]);

  return { 
    syncState, 
    sendAction, 
    isHost: isMultiplayer ? isHost : true,
    isMultiplayer
  };
}

import { rtdb as database } from '../lib/firebase';
import { ref, set, get, onValue, update, remove, push, onDisconnect } from 'firebase/database';
import { GameType } from '../models/AppModels';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isMe: boolean;
  isReady?: boolean;
}

export interface MultiplayerRoom {
  roomCode: string;
  gameId: string;
  hostId: string;
  players: Record<string, MultiplayerPlayer>;
  status: 'waiting' | 'playing' | 'closed';
  createdAt: number;
}

class MultiplayerService {
  private generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createRoom(gameId: string, hostName: string, hostId: string): Promise<string> {
    const roomCode = this.generateRoomCode();
    const roomRef = ref(database, `rooms/${roomCode}`);
    
    const initialPlayer: MultiplayerPlayer = {
      id: hostId,
      name: hostName,
      isHost: true,
      isMe: true,
      isReady: true
    };

    await set(roomRef, {
      roomCode,
      gameId,
      hostId,
      status: 'waiting',
      createdAt: Date.now(),
      players: {
        [hostId]: initialPlayer
      }
    });

    await onDisconnect(roomRef).remove();

    return roomCode;
  }

  async joinRoom(roomCode: string, playerName: string, playerId: string): Promise<boolean> {
    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error("Room not found");
    }

    const roomData = snapshot.val() as MultiplayerRoom;
    if (roomData.status !== 'waiting') {
      throw new Error("Game already started");
    }

    const newPlayer: MultiplayerPlayer = {
      id: playerId,
      name: playerName,
      isHost: false,
      isMe: true,
      isReady: false
    };

    await update(ref(database, `rooms/${roomCode}/players`), {
      [playerId]: newPlayer
    });

    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await onDisconnect(playerRef).remove();

    return true;
  }

  listenToRoom(roomCode: string, callback: (room: MultiplayerRoom | null) => void): () => void {
    const roomRef = ref(database, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as MultiplayerRoom);
      } else {
        callback(null);
      }
    });
    return unsubscribe;
  }

  async leaveRoom(roomCode: string, playerId: string): Promise<void> {
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await onDisconnect(playerRef).cancel();
    await remove(playerRef);
  }

  async startGame(roomCode: string): Promise<void> {
    const roomRef = ref(database, `rooms/${roomCode}`);
    await update(roomRef, { status: 'playing' });
  }

  async closeRoom(roomCode: string): Promise<void> {
    const roomRef = ref(database, `rooms/${roomCode}`);
    await onDisconnect(roomRef).cancel();
    await remove(roomRef);
  }
}

export const multiplayerService = new MultiplayerService();

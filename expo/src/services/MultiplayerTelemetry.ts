import { rtdb as database } from '../lib/firebase';
import { ref, push, set } from 'firebase/database';
import { DeviceIdentity } from '../utils/DeviceIdentity';

/**
 * MultiplayerTelemetry — matches iOS MultiplayerTelemetry.swift
 * Event logging for multiplayer sessions. Writes to Firebase RTDB for analytics.
 */

// ─── Types ───

type MPSessionOutcome =
  | 'completed_normally'
  | 'closed_by_host'
  | 'abandoned_by_players'
  | 'failed_to_start'
  | 'sync_failure'
  | 'reconnect_failure'
  | 'results_delivery_failure'
  | 'rematch_abandoned'
  | 'kicked_player_exit'
  | 'unknown_failure';

interface MPContext {
  session_id?: string;
  room_id?: string;
  match_id?: string;
  player_id?: string;
}

interface MPEventRecord {
  event: string;
  session_id?: string;
  room_id?: string;
  match_id?: string;
  player_id?: string;
  device_id?: string;
  user_role?: string;
  game_type?: string;
  app_version?: string;
  platform?: string;
  room_status?: string;
  session_phase?: string;
  state_version?: number;
  active_player_id?: string;
  active_turn_index?: number;
  player_count?: number;
  source?: string;
  network_state?: string;
  success?: boolean;
  failure_reason?: string;
  latency_ms?: number;
  session_duration_ms?: number;
  turn_duration_ms?: number;
  phase_at_exit?: string;
  session_outcome?: string;
  props?: Record<string, string>;
  created_at: string;
}

class _MultiplayerTelemetry {
  private context: MPContext = {};
  private enabled = true;

  /** Set the current session context */
  setContext(ctx: Partial<MPContext>): void {
    this.context = { ...this.context, ...ctx };
  }

  /** Clear context when session ends */
  clearContext(): void {
    this.context = {};
  }

  /** Enable/disable telemetry */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // ─── Event Loggers ───

  async logRoomCreated(gameType: string, playerCount: number): Promise<void> {
    await this.log('room_created', { game_type: gameType, player_count: playerCount, user_role: 'host' });
  }

  async logRoomJoined(gameType: string): Promise<void> {
    await this.log('room_joined', { game_type: gameType, user_role: 'guest' });
  }

  async logGameStarted(gameType: string, playerCount: number): Promise<void> {
    await this.log('game_started', { game_type: gameType, player_count: playerCount });
  }

  async logTurnCompleted(turnIndex: number, latencyMs?: number): Promise<void> {
    await this.log('turn_completed', { active_turn_index: turnIndex, latency_ms: latencyMs });
  }

  async logVoteSubmitted(): Promise<void> {
    await this.log('vote_submitted', {});
  }

  async logSessionEnded(outcome: MPSessionOutcome, durationMs: number): Promise<void> {
    await this.log('session_ended', { session_outcome: outcome, session_duration_ms: durationMs });
  }

  async logReconnectAttempt(success: boolean, failureReason?: string): Promise<void> {
    await this.log('reconnect_attempt', { success, failure_reason: failureReason });
  }

  async logSyncError(source: string, reason: string): Promise<void> {
    await this.log('sync_error', { source, failure_reason: reason });
  }

  async logPlayerKicked(kickedPlayerId: string): Promise<void> {
    await this.log('player_kicked', { props: { kicked_player_id: kickedPlayerId } });
  }

  // ─── Core ───

  private async log(event: string, extra: Partial<MPEventRecord>): Promise<void> {
    if (!this.enabled) return;

    const deviceId = DeviceIdentity.cachedDeviceID || 'unknown';

    const record: MPEventRecord = {
      event,
      session_id: this.context.session_id,
      room_id: this.context.room_id,
      match_id: this.context.match_id,
      player_id: this.context.player_id,
      device_id: deviceId,
      app_version: DeviceIdentity.appVersion,
      platform: DeviceIdentity.platform,
      created_at: new Date().toISOString(),
      ...extra,
    };

    try {
      const eventsRef = ref(database, 'telemetry/mp_events');
      const newRef = push(eventsRef);
      await set(newRef, record);
    } catch (e) {
      // Telemetry should never crash the app
      console.warn('Telemetry: Failed to log event', event, e);
    }
  }
}

export const MultiplayerTelemetry = new _MultiplayerTelemetry();
export type { MPSessionOutcome, MPContext, MPEventRecord };

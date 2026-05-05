import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * NotificationService — matches iOS NotificationService.swift
 * Push notification permission, local notifications for game events.
 */
class _NotificationService {
  isAuthorized = false;
  expoPushToken: string | null = null;

  /** Request notification permissions */
  async requestPermission(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    this.isAuthorized = finalStatus === 'granted';

    if (this.isAuthorized) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        this.expoPushToken = tokenData.data;
      } catch (e) {
        console.warn('NotificationService: Could not get push token', e);
      }
    }

    // Configure notification handling
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    return this.isAuthorized;
  }

  /** Check current permission status without prompting */
  async checkCurrentStatus(): Promise<void> {
    const { status } = await Notifications.getPermissionsAsync();
    this.isAuthorized = status === 'granted';
  }

  /** Schedule a local notification for room creation */
  async scheduleRoomCreatedNotification(hostName: string, gameName: string): Promise<void> {
    if (!this.isAuthorized) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Room!',
        body: `${hostName} created a ${gameName} room. Join now!`,
        sound: true,
      },
      trigger: null, // immediate
    });
  }

  /** Schedule a local notification for game invite */
  async scheduleGameInviteNotification(inviterName: string, gameName: string, roomCode: string): Promise<void> {
    if (!this.isAuthorized) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Game Invite! 🎮',
        body: `${inviterName} invited you to play ${gameName}. Code: ${roomCode}`,
        data: { type: 'invite', roomCode },
        sound: true,
      },
      trigger: null,
    });
  }

  /** Schedule a reminder notification */
  async scheduleReminderNotification(message: string, delaySeconds: number): Promise<void> {
    if (!this.isAuthorized) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Party Play',
        body: message,
        sound: true,
      },
      trigger: { seconds: delaySeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });
  }

  /** Cancel all pending notifications */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const NotificationService = new _NotificationService();

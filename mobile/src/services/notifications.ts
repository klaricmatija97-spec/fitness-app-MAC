/**
 * Notifications Service
 * =====================
 * Servis za upravljanje lokalnim notifikacijama
 * 
 * Podržava:
 * - Podsjetnici za trening
 * - PR obavijesti
 * - Adherence upozorenja
 * - Trenerske poruke
 * 
 * NAPOMENA: Koristi expo-notifications ako je dostupan,
 * inače koristi Alert kao fallback za razvoj.
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Pokušaj importirati expo-notifications, ali koristi fallback ako nije dostupan
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('[Notifications] expo-notifications not available, using fallback');
}

// ============================================
// TYPES
// ============================================

export type NotificationType = 
  | 'workout_reminder'
  | 'workout_completed'
  | 'personal_record'
  | 'streak_milestone'
  | 'adherence_warning'
  | 'trainer_message'
  | 'program_update'
  | 'rest_day';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ScheduledNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  scheduledTime: Date;
  repeatDaily?: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  workoutReminders: boolean;
  workoutReminderTime: string; // HH:MM format
  prNotifications: boolean;
  streakNotifications: boolean;
  trainerMessages: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM
  quietHoursEnd: string; // HH:MM
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  workoutReminders: true,
  workoutReminderTime: '09:00',
  prNotifications: true,
  streakNotifications: true,
  trainerMessages: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

const STORAGE_KEY = '@notification_preferences';

// ============================================
// CONFIGURATION
// ============================================

// Konfiguriraj kako se prikazuju notifikacije kada je app aktivan
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ============================================
// NOTIFICATION SERVICE
// ============================================

class NotificationService {
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private initialized = false;

  // -----------------------------------------
  // INITIALIZATION
  // -----------------------------------------

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Učitaj preferences
      await this.loadPreferences();

      // Zatraži dopuštenja
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.log('[Notifications] Permission denied');
        return false;
      }

      this.initialized = true;
      console.log('[Notifications] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Notifications] Initialization error:', error);
      return false;
    }
  }

  // -----------------------------------------
  // PERMISSIONS
  // -----------------------------------------

  async requestPermissions(): Promise<boolean> {
    // Fallback ako expo-notifications nije dostupan
    if (!Notifications) {
      console.log('[Notifications] Using fallback mode (Alert)');
      return true;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Za Android, potreban je notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('workout', {
          name: 'Workout Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
        });

        await Notifications.setNotificationChannelAsync('achievements', {
          name: 'Achievements',
          importance: Notifications.AndroidImportance.DEFAULT,
        });

        await Notifications.setNotificationChannelAsync('trainer', {
          name: 'Trainer Messages',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      return true;
    } catch (error) {
      console.error('[Notifications] Permission error:', error);
      return false;
    }
  }

  // -----------------------------------------
  // PREFERENCES
  // -----------------------------------------

  async loadPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
      return this.preferences;
    } catch (error) {
      console.error('[Notifications] Load preferences error:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  async savePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...prefs };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('[Notifications] Save preferences error:', error);
    }
  }

  getPreferences(): NotificationPreferences {
    return this.preferences;
  }

  // -----------------------------------------
  // SEND NOTIFICATIONS
  // -----------------------------------------

  async sendLocal(notification: NotificationPayload): Promise<string | null> {
    if (!this.preferences.enabled) {
      console.log('[Notifications] Disabled, skipping');
      return null;
    }

    // Provjeri quiet hours
    if (this.isQuietHours()) {
      console.log('[Notifications] Quiet hours, skipping');
      return null;
    }

    // Provjeri tip notifikacije
    if (!this.isTypeEnabled(notification.type)) {
      console.log(`[Notifications] Type ${notification.type} disabled, skipping`);
      return null;
    }

    // Fallback na Alert ako expo-notifications nije dostupan
    if (!Notifications) {
      console.log(`[Notifications] Fallback Alert: ${notification.title}`);
      Alert.alert(notification.title, notification.body);
      return 'fallback-' + Date.now();
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { type: notification.type, ...notification.data },
          sound: 'default',
        },
        trigger: null, // Immediately
      });

      console.log(`[Notifications] Sent: ${notification.title}`);
      return id;
    } catch (error) {
      console.error('[Notifications] Send error:', error);
      // Fallback na Alert ako scheduleNotificationAsync ne radi
      Alert.alert(notification.title, notification.body);
      return 'fallback-' + Date.now();
    }
  }

  // -----------------------------------------
  // SCHEDULE NOTIFICATIONS
  // -----------------------------------------

  async scheduleWorkoutReminder(
    workoutName: string,
    scheduledDate: Date
  ): Promise<string | null> {
    if (!this.preferences.workoutReminders) return null;
    if (!Notifications) {
      console.log('[Notifications] Scheduling not available in fallback mode');
      return null;
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💪 Vrijeme za trening!',
          body: `${workoutName} te čeka. Spremi se za akciju!`,
          data: { type: 'workout_reminder', workoutName },
          sound: 'default',
        },
        trigger: {
          date: scheduledDate,
        },
      });

      console.log(`[Notifications] Scheduled workout reminder for ${scheduledDate}`);
      return id;
    } catch (error) {
      console.error('[Notifications] Schedule error:', error);
      return null;
    }
  }

  async scheduleDailyReminder(time: string): Promise<string | null> {
    if (!this.preferences.workoutReminders) return null;
    if (!Notifications) {
      console.log('[Notifications] Scheduling not available in fallback mode');
      return null;
    }

    try {
      // Parsiraj vrijeme (HH:MM)
      const [hours, minutes] = time.split(':').map(Number);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏋️ Dnevni podsjetnik',
          body: 'Ne zaboravi na današnji trening! Konzistentnost je ključ uspjeha.',
          data: { type: 'workout_reminder' },
          sound: 'default',
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      console.log(`[Notifications] Scheduled daily reminder at ${time}`);
      return id;
    } catch (error) {
      console.error('[Notifications] Schedule daily error:', error);
      return null;
    }
  }

  // -----------------------------------------
  // PRESET NOTIFICATIONS
  // -----------------------------------------

  async notifyWorkoutCompleted(workoutName: string, duration: number): Promise<void> {
    await this.sendLocal({
      type: 'workout_completed',
      title: '✅ Trening završen!',
      body: `Odlično! ${workoutName} završen za ${duration} minuta.`,
      data: { workoutName, duration },
    });
  }

  async notifyPersonalRecord(exercise: string, weight: number, previousWeight?: number): Promise<void> {
    if (!this.preferences.prNotifications) return;

    const improvement = previousWeight ? ` (+${weight - previousWeight}kg)` : '';
    
    await this.sendLocal({
      type: 'personal_record',
      title: '🏆 NOVI PERSONAL RECORD!',
      body: `${exercise}: ${weight}kg${improvement}! Nastavi tako!`,
      data: { exercise, weight, previousWeight },
    });
  }

  async notifyStreakMilestone(days: number): Promise<void> {
    if (!this.preferences.streakNotifications) return;

    let message = '';
    let emoji = '🔥';
    
    if (days === 7) {
      message = 'Tjedan dana zaredom! Odlično!';
    } else if (days === 14) {
      message = 'Dva tjedna! Postajes navika!';
      emoji = '💪';
    } else if (days === 30) {
      message = 'Mjesec dana! Ti si legenda!';
      emoji = '🏆';
    } else if (days % 10 === 0) {
      message = `${days} dana! Nezaustavljiv/a si!`;
      emoji = '⚡';
    } else {
      message = `${days} dana zaredom! Nastavi!`;
    }

    await this.sendLocal({
      type: 'streak_milestone',
      title: `${emoji} Streak: ${days} dana!`,
      body: message,
      data: { days },
    });
  }

  async notifyAdherenceWarning(missedDays: number): Promise<void> {
    await this.sendLocal({
      type: 'adherence_warning',
      title: '⚠️ Propuštaš treninge',
      body: `Već ${missedDays} dana bez treninga. Vrati se na pravi put!`,
      data: { missedDays },
    });
  }

  async notifyTrainerMessage(trainerName: string, message: string): Promise<void> {
    if (!this.preferences.trainerMessages) return;

    await this.sendLocal({
      type: 'trainer_message',
      title: `💬 Poruka od ${trainerName}`,
      body: message,
      data: { trainerName, message },
    });
  }

  async notifyProgramUpdate(programName: string): Promise<void> {
    await this.sendLocal({
      type: 'program_update',
      title: '📋 Program ažuriran',
      body: `Tvoj trener je ažurirao program: ${programName}`,
      data: { programName },
    });
  }

  async notifyRestDay(): Promise<void> {
    await this.sendLocal({
      type: 'rest_day',
      title: '😴 Danas je dan odmora',
      body: 'Odmori se, hidratiziraj i pripremi se za sutra!',
    });
  }

  // -----------------------------------------
  // MANAGEMENT
  // -----------------------------------------

  async cancelAll(): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[Notifications] All scheduled notifications cancelled');
    } catch (error) {
      console.error('[Notifications] Cancel all error:', error);
    }
  }

  async cancelById(id: string): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.error('[Notifications] Cancel by ID error:', error);
    }
  }

  async getScheduled(): Promise<any[]> {
    if (!Notifications) return [];
    return Notifications.getAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    if (!Notifications) return 0;
    return Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(0);
  }

  // -----------------------------------------
  // HELPERS
  // -----------------------------------------

  private isQuietHours(): boolean {
    if (!this.preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.preferences.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Ako quiet hours prelazi ponoć
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }
    
    return currentTime >= startTime && currentTime < endTime;
  }

  private isTypeEnabled(type: NotificationType): boolean {
    switch (type) {
      case 'workout_reminder':
        return this.preferences.workoutReminders;
      case 'personal_record':
        return this.preferences.prNotifications;
      case 'streak_milestone':
        return this.preferences.streakNotifications;
      case 'trainer_message':
      case 'program_update':
        return this.preferences.trainerMessages;
      default:
        return true;
    }
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const notificationService = new NotificationService();

// ============================================
// NOTIFICATION LISTENER SETUP
// ============================================

export function setupNotificationListeners(
  onNotificationReceived?: (notification: any) => void,
  onNotificationResponse?: (response: any) => void
) {
  // Fallback ako expo-notifications nije dostupan
  if (!Notifications) {
    console.log('[Notifications] Listeners not available in fallback mode');
    return () => {}; // Prazan cleanup
  }

  // Kada se notifikacija primi dok je app aktivan
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification: any) => {
    console.log('[Notifications] Received:', notification.request.content.title);
    onNotificationReceived?.(notification);
  });

  // Kada korisnik klikne na notifikaciju
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
    console.log('[Notifications] Response:', response.notification.request.content.title);
    onNotificationResponse?.(response);
  });

  // Vrati funkciju za cleanup
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}


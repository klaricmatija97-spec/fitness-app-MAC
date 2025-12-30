/**
 * Notification Settings Screen
 * ============================
 * Postavke notifikacija za korisnika
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationService, NotificationPreferences } from '../services/notifications';

interface Props {
  onBack?: () => void;
}

export default function NotificationSettingsScreen({ onBack }: Props) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    workoutReminders: true,
    workoutReminderTime: '09:00',
    prNotifications: true,
    streakNotifications: true,
    trainerMessages: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const prefs = await notificationService.loadPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference<K extends keyof NotificationPreferences>(
    key: K, 
    value: NotificationPreferences[K]
  ) {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    await notificationService.savePreferences({ [key]: value });
  }

  async function handleTestNotification() {
    await notificationService.sendLocal({
      type: 'workout_reminder',
      title: '🧪 Test Notifikacija',
      body: 'Ako vidiš ovo, notifikacije rade ispravno!',
    });
    Alert.alert('Poslano!', 'Test notifikacija je poslana.');
  }

  async function handleClearAll() {
    Alert.alert(
      'Obriši zakazane notifikacije',
      'Jeste li sigurni da želite obrisati sve zakazane notifikacije?',
      [
        { text: 'Odustani', style: 'cancel' },
        { 
          text: 'Obriši', 
          style: 'destructive',
          onPress: async () => {
            await notificationService.cancelAll();
            Alert.alert('Obrisano', 'Sve zakazane notifikacije su obrisane.');
          }
        },
      ]
    );
  }

  const timeOptions = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  ];

  function SettingRow({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onValueChange 
  }: { 
    icon: string; 
    title: string; 
    subtitle?: string; 
    value: boolean; 
    onValueChange: (val: boolean) => void;
  }) {
    return (
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingIcon}>{icon}</Text>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#444', true: '#FFFFFF' }}
          thumbColor={value ? '#FFF' : '#71717A'}
        />
      </View>
    );
  }

  function TimeSelector({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string; 
    value: string; 
    onChange: (val: string) => void;
  }) {
    const [showOptions, setShowOptions] = useState(false);

    return (
      <View style={styles.timeSelector}>
        <Text style={styles.timeLabel}>{label}</Text>
        <TouchableOpacity 
          style={styles.timeButton}
          onPress={() => setShowOptions(!showOptions)}
        >
          <Text style={styles.timeValue}>{value}</Text>
          <Text style={styles.timeArrow}>{showOptions ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showOptions && (
          <ScrollView style={styles.timeOptions} nestedScrollEnabled>
            {timeOptions.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.timeOption, value === time && styles.timeOptionActive]}
                onPress={() => {
                  onChange(time);
                  setShowOptions(false);
                }}
              >
                <Text style={[styles.timeOptionText, value === time && styles.timeOptionTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.backText}>← Natrag</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}> Notifikacije</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Master Switch */}
          <View style={styles.section}>
            <SettingRow
              icon=""
              title="Omogući notifikacije"
              subtitle="Sve notifikacije iz aplikacije"
              value={preferences.enabled}
              onValueChange={(val) => updatePreference('enabled', val)}
            />
          </View>

          {/* Workout Reminders */}
          <View style={[styles.section, !preferences.enabled && styles.sectionDisabled]}>
            <Text style={styles.sectionTitle}> Treninzi</Text>
            
            <SettingRow
              icon=""
              title="Podsjetnici za trening"
              subtitle="Dnevni podsjetnik za trening"
              value={preferences.workoutReminders}
              onValueChange={(val) => updatePreference('workoutReminders', val)}
            />

            {preferences.workoutReminders && (
              <TimeSelector
                label="Vrijeme podsjetnika"
                value={preferences.workoutReminderTime}
                onChange={(val) => updatePreference('workoutReminderTime', val)}
              />
            )}
          </View>

          {/* Achievements */}
          <View style={[styles.section, !preferences.enabled && styles.sectionDisabled]}>
            <Text style={styles.sectionTitle}> Postignuća</Text>
            
            <SettingRow
              icon=""
              title="Personal Records"
              subtitle="Obavijesti o novim PR-ovima"
              value={preferences.prNotifications}
              onValueChange={(val) => updatePreference('prNotifications', val)}
            />

            <SettingRow
              icon=""
              title="Streak milestones"
              subtitle="Obavijesti o streak dostignućima"
              value={preferences.streakNotifications}
              onValueChange={(val) => updatePreference('streakNotifications', val)}
            />
          </View>

          {/* Trainer */}
          <View style={[styles.section, !preferences.enabled && styles.sectionDisabled]}>
            <Text style={styles.sectionTitle}>👨‍🏫 Trener</Text>
            
            <SettingRow
              icon="💬"
              title="Poruke od trenera"
              subtitle="Obavijesti kada trener pošalje poruku"
              value={preferences.trainerMessages}
              onValueChange={(val) => updatePreference('trainerMessages', val)}
            />
          </View>

          {/* Quiet Hours */}
          <View style={[styles.section, !preferences.enabled && styles.sectionDisabled]}>
            <Text style={styles.sectionTitle}>🌙 Tihi sati</Text>
            
            <SettingRow
              icon="🔇"
              title="Omogući tihe sate"
              subtitle="Bez notifikacija tijekom noći"
              value={preferences.quietHoursEnabled}
              onValueChange={(val) => updatePreference('quietHoursEnabled', val)}
            />

            {preferences.quietHoursEnabled && (
              <View style={styles.quietHoursRow}>
                <TimeSelector
                  label="Od"
                  value={preferences.quietHoursStart}
                  onChange={(val) => updatePreference('quietHoursStart', val)}
                />
                <TimeSelector
                  label="Do"
                  value={preferences.quietHoursEnd}
                  onChange={(val) => updatePreference('quietHoursEnd', val)}
                />
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
              <Text style={styles.testButtonText}>🧪 Pošalji test notifikaciju</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>🗑️ Obriši zakazane notifikacije</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  backText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  placeholder: { width: 60 },
  content: { flex: 1, paddingHorizontal: 20 },

  // Section
  section: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
  },

  // Time Selector
  timeSelector: {
    marginTop: 12,
    flex: 1,
  },
  timeLabel: {
    color: '#71717A',
    fontSize: 12,
    marginBottom: 6,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 12,
  },
  timeValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timeArrow: {
    color: '#71717A',
    fontSize: 10,
  },
  timeOptions: {
    maxHeight: 150,
    backgroundColor: '#333',
    borderRadius: 10,
    marginTop: 4,
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  timeOptionActive: {
    backgroundColor: '#27272A',
  },
  timeOptionText: {
    color: '#FFF',
    fontSize: 14,
  },
  timeOptionTextActive: {
    fontWeight: '600',
  },

  // Quiet Hours
  quietHoursRow: {
    flexDirection: 'row',
    gap: 16,
  },

  // Actions
  actionsSection: {
    gap: 12,
    marginTop: 10,
  },
  testButton: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#71717A',
    fontSize: 16,
    fontWeight: '600',
  },

  bottomPadding: { height: 40 },
});


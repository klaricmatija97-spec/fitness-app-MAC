/**
 * Client Dashboard Screen
 * =======================
 * Glavni ekran za klijenta - vidi svoj program, treninge, napredak
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

interface Props {
  authToken: string;
  trainerName?: string;
  onBack?: () => void;
  onDisconnect?: () => void;
  onStartWorkout?: (sessionId: string) => void;
  onViewProgress?: () => void;
  onSettings?: () => void;
}

interface TodayWorkout {
  id: string;
  name: string;
  sessionType: string;
  estimatedDuration: number;
  exerciseCount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

interface ClientProgram {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  currentWeek: number;
  totalWeeks: number;
  startDate: string;
  endDate: string;
}

interface ClientData {
  trainer: {
    id: string;
    name: string;
    email: string;
  } | null;
  program: ClientProgram | null;
  todayWorkout: TodayWorkout | null;
  stats: {
    completedWorkouts: number;
    totalWorkouts: number;
    adherence: number;
    streak: number;
  };
}

export default function ClientDashboardScreen({ 
  authToken, 
  trainerName, 
  onBack, 
  onDisconnect,
  onStartWorkout,
  onViewProgress,
  onSettings,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ClientData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Dohvati podatke o povezanosti
      const connectResponse = await fetch(`${API_BASE_URL}/api/client/connect`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const connectResult = await connectResponse.json();

      // Dohvati današnji trening
      const todayResponse = await fetch(`${API_BASE_URL}/api/client/today`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const todayResult = await todayResponse.json();

      // Dohvati napredak
      const progressResponse = await fetch(`${API_BASE_URL}/api/client/progress`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const progressResult = await progressResponse.json();

      setData({
        trainer: connectResult.success ? connectResult.data.trainer : null,
        program: todayResult.success ? todayResult.data.program : null,
        todayWorkout: todayResult.success ? todayResult.data.todaySession : null,
        stats: progressResult.success ? {
          completedWorkouts: progressResult.data.workouts?.completed || 0,
          totalWorkouts: progressResult.data.workouts?.total || 0,
          adherence: progressResult.data.adherence?.percentage || 0,
          streak: progressResult.data.streak?.current || 0,
        } : {
          completedWorkouts: 0,
          totalWorkouts: 0,
          adherence: 0,
          streak: 0,
        },
      });
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleDisconnect() {
    Alert.alert(
      'Prekini vezu',
      'Jeste li sigurni da želite prekinuti vezu s trenerom?',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Prekini',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE_URL}/api/client/connect`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
              });
              onDisconnect?.();
            } catch (error) {
              Alert.alert('Greška', 'Nije moguće prekinuti vezu.');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Učitavanje...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.backText}>← Natrag</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Moj Program</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Trainer Card */}
          {data?.trainer ? (
            <View style={styles.trainerCard}>
              <View style={styles.trainerInfo}>
                <View style={styles.trainerAvatar}>
                  <Text style={styles.trainerAvatarText}>
                    {data.trainer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.trainerLabel}>Tvoj trener</Text>
                  <Text style={styles.trainerName}>{data.trainer.name}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleDisconnect}>
                <Text style={styles.disconnectText}>Prekini</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noTrainerCard}>
              <Text style={styles.noTrainerIcon}>👤</Text>
              <Text style={styles.noTrainerText}>Nemaš povezanog trenera</Text>
            </View>
          )}

          {/* Today's Workout */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Današnji trening</Text>
            
            {data?.todayWorkout ? (
              <TouchableOpacity 
                style={styles.workoutCard}
                onPress={() => onStartWorkout?.(data.todayWorkout!.id)}
              >
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutName}>{data.todayWorkout.name}</Text>
                  <View style={[
                    styles.workoutStatus,
                    data.todayWorkout.status === 'completed' && styles.statusCompleted,
                    data.todayWorkout.status === 'in_progress' && styles.statusInProgress,
                  ]}>
                    <Text style={styles.workoutStatusText}>
                      {data.todayWorkout.status === 'completed' ? '✅ Završeno' :
                       data.todayWorkout.status === 'in_progress' ? '🏃 U tijeku' :
                       '⏳ Čeka'}
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutMeta}>
                  <Text style={styles.workoutMetaText}>
                    ⏱️ {data.todayWorkout.estimatedDuration} min
                  </Text>
                  <Text style={styles.workoutMetaText}>
                    💪 {data.todayWorkout.exerciseCount} vježbi
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.startButton}
                  onPress={() => onStartWorkout?.(data.todayWorkout!.id)}
                >
                  <Text style={styles.startButtonText}>
                    {data.todayWorkout.status === 'completed' ? 'Pogledaj' : 'Započni trening'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ) : (
              <View style={styles.noWorkoutCard}>
                <Text style={styles.noWorkoutIcon}>🎉</Text>
                <Text style={styles.noWorkoutText}>Nema treninga za danas!</Text>
                <Text style={styles.noWorkoutSubtext}>Uživaj u odmoru ili čekaj da trener kreira program.</Text>
              </View>
            )}
          </View>

          {/* Program Info */}
          {data?.program && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Aktivni program</Text>
              <View style={styles.programCard}>
                <Text style={styles.programName}>{data.program.name}</Text>
                <View style={styles.programProgress}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${(data.program.currentWeek / data.program.totalWeeks) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    Tjedan {data.program.currentWeek} / {data.program.totalWeeks}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Tvoj napredak</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{data?.stats.completedWorkouts || 0}</Text>
                <Text style={styles.statLabel}>Završenih treninga</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{data?.stats.adherence || 0}%</Text>
                <Text style={styles.statLabel}>Adherence</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{data?.stats.streak || 0}</Text>
                <Text style={styles.statLabel}>Dana u nizu 🔥</Text>
              </View>
            </View>
          </View>

          {/* Empty state if no program */}
          {!data?.program && data?.trainer && (
            <View style={styles.emptyProgramCard}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>Čekamo program</Text>
              <Text style={styles.emptyText}>
                Tvoj trener {data.trainer.name} još nije kreirao program za tebe. 
                Obavijestit ćemo te kada bude spreman!
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {onViewProgress && (
              <TouchableOpacity style={styles.actionButton} onPress={onViewProgress}>
                <Text style={styles.actionButtonIcon}>📊</Text>
                <Text style={styles.actionButtonText}>Moj napredak</Text>
              </TouchableOpacity>
            )}
            {onSettings && (
              <TouchableOpacity style={styles.actionButton} onPress={onSettings}>
                <Text style={styles.actionButtonIcon}>🔔</Text>
                <Text style={styles.actionButtonText}>Notifikacije</Text>
              </TouchableOpacity>
            )}
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
  backText: { color: '#8B5CF6', fontSize: 16, fontWeight: '600' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  placeholder: { width: 60 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 10, fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 20 },
  
  // Trainer Card
  trainerCard: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  trainerInfo: { flexDirection: 'row', alignItems: 'center' },
  trainerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trainerAvatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  trainerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  trainerName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  disconnectText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  
  noTrainerCard: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  noTrainerIcon: { fontSize: 40, marginBottom: 10 },
  noTrainerText: { color: '#AAA', fontSize: 16 },
  
  // Section
  section: { marginBottom: 25 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  
  // Workout Card
  workoutCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutName: { color: '#FFF', fontSize: 18, fontWeight: '600', flex: 1 },
  workoutStatus: {
    backgroundColor: '#444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusCompleted: { backgroundColor: '#22C55E' },
  statusInProgress: { backgroundColor: '#F59E0B' },
  workoutStatusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  workoutMeta: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  workoutMetaText: { color: '#AAA', fontSize: 14 },
  startButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  startButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  noWorkoutCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
  },
  noWorkoutIcon: { fontSize: 48, marginBottom: 12 },
  noWorkoutText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  noWorkoutSubtext: { color: '#888', fontSize: 14, textAlign: 'center' },
  
  // Program Card
  programCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
  },
  programName: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  programProgress: {},
  progressBar: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#8B5CF6' },
  progressText: { color: '#AAA', fontSize: 13 },
  
  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { color: '#8B5CF6', fontSize: 24, fontWeight: '700' },
  statLabel: { color: '#888', fontSize: 11, marginTop: 4, textAlign: 'center' },
  
  // Empty Program
  emptyProgramCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: '#AAA', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonIcon: { fontSize: 24, marginBottom: 8 },
  actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  bottomPadding: { height: 40 },
});

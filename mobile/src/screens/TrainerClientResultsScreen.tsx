/**
 * Trainer Client Results Screen
 * ==============================
 * Trener vidi detaljne rezultate klijenta - treninge, napredak, PR-ove
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  authToken: string;
  clientId: string;
  clientName: string;
  onBack?: () => void;
  onAdjustProgram?: (clientId: string) => void;
}

interface WorkoutLog {
  id: string;
  date: string;
  sessionName: string;
  duration: number;
  exercisesCompleted: number;
  totalExercises: number;
  totalVolume: number;
  averageRIR: number;
  notes?: string;
  flagged: boolean;
  flagReason?: string;
}

interface ClientResultsData {
  client: {
    id: string;
    name: string;
    email: string;
    connectedSince: string;
  };
  summary: {
    totalWorkouts: number;
    adherenceRate: number;
    avgSessionDuration: number;
    totalVolumeKg: number;
    personalBests: number;
    missedWorkouts: number;
    currentStreak: number;
  };
  recentWorkouts: WorkoutLog[];
  personalBests: {
    exercise: string;
    weight: number;
    date: string;
    previousBest?: number;
  }[];
  alerts: {
    type: 'warning' | 'info' | 'success';
    message: string;
    date: string;
  }[];
  weeklyProgress: {
    week: string;
    volume: number;
    adherence: number;
    avgRIR: number;
  }[];
}

export default function TrainerClientResultsScreen({ 
  authToken, 
  clientId, 
  clientName,
  onBack,
  onAdjustProgram,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ClientResultsData | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'workouts' | 'prs'>('overview');

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/client/${clientId}/results`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Error loading client results:', error);
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  }

  function generateMockData(): ClientResultsData {
    return {
      client: {
        id: clientId,
        name: clientName,
        email: 'klijent@email.com',
        connectedSince: '2024-01-01',
      },
      summary: {
        totalWorkouts: 28,
        adherenceRate: 87,
        avgSessionDuration: 62,
        totalVolumeKg: 168500,
        personalBests: 12,
        missedWorkouts: 4,
        currentStreak: 8,
      },
      recentWorkouts: [
        {
          id: '1',
          date: '2024-01-28',
          sessionName: 'Push Day A',
          duration: 65,
          exercisesCompleted: 6,
          totalExercises: 6,
          totalVolume: 8500,
          averageRIR: 1.5,
          flagged: false,
        },
        {
          id: '2',
          date: '2024-01-26',
          sessionName: 'Pull Day A',
          duration: 58,
          exercisesCompleted: 6,
          totalExercises: 6,
          totalVolume: 7800,
          averageRIR: 2.0,
          flagged: false,
        },
        {
          id: '3',
          date: '2024-01-24',
          sessionName: 'Leg Day A',
          duration: 72,
          exercisesCompleted: 5,
          totalExercises: 6,
          totalVolume: 12000,
          averageRIR: 1.0,
          flagged: true,
          flagReason: 'Preskočio Leg Curl - bol u koljenu',
        },
        {
          id: '4',
          date: '2024-01-22',
          sessionName: 'Push Day B',
          duration: 55,
          exercisesCompleted: 6,
          totalExercises: 6,
          totalVolume: 7200,
          averageRIR: 2.5,
          flagged: false,
        },
      ],
      personalBests: [
        { exercise: 'Bench Press', weight: 100, date: '2024-01-28', previousBest: 95 },
        { exercise: 'Squat', weight: 140, date: '2024-01-24', previousBest: 130 },
        { exercise: 'Deadlift', weight: 160, date: '2024-01-20', previousBest: 150 },
        { exercise: 'Overhead Press', weight: 65, date: '2024-01-15', previousBest: 60 },
      ],
      alerts: [
        { type: 'warning', message: 'Klijent je prijavio bol u koljenu na Leg Day', date: '2024-01-24' },
        { type: 'success', message: 'Novi PR na Bench Press! 100kg', date: '2024-01-28' },
        { type: 'info', message: 'Adherence iznad 85% već 3 tjedna', date: '2024-01-28' },
      ],
      weeklyProgress: [
        { week: 'T1', volume: 32000, adherence: 100, avgRIR: 2.5 },
        { week: 'T2', volume: 35000, adherence: 83, avgRIR: 2.0 },
        { week: 'T3', volume: 38000, adherence: 100, avgRIR: 1.8 },
        { week: 'T4', volume: 41000, adherence: 83, avgRIR: 1.5 },
      ],
    };
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function getAlertColor(type: 'warning' | 'info' | 'success') {
    switch (type) {
      case 'warning': return '#F59E0B';
      case 'success': return '#22C55E';
      case 'info': return '#3B82F6';
    }
  }

  function getAlertIcon(type: 'warning' | 'info' | 'success') {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '🎉';
      case 'info': return 'ℹ️';
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Učitavanje rezultata...</Text>
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
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{clientName}</Text>
            <Text style={styles.subtitle}>Rezultati klijenta</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Alerts */}
        {data?.alerts && data.alerts.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.alertsContainer}
            contentContainerStyle={styles.alertsContent}
          >
            {data.alerts.map((alert, index) => (
              <View 
                key={index} 
                style={[styles.alertCard, { borderLeftColor: getAlertColor(alert.type) }]}
              >
                <Text style={styles.alertIcon}>{getAlertIcon(alert.type)}</Text>
                <Text style={styles.alertMessage} numberOfLines={2}>{alert.message}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          {([
            { key: 'overview', label: '📊 Pregled' },
            { key: 'workouts', label: '🏋️ Treninzi' },
            { key: 'prs', label: '🏆 PR-ovi' },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, selectedTab === tab.key && styles.tabButtonActive]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Overview Tab */}
          {selectedTab === 'overview' && data && (
            <>
              {/* Summary Cards */}
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{data.summary.totalWorkouts}</Text>
                  <Text style={styles.summaryLabel}>Treninga</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={[styles.summaryValue, 
                    data.summary.adherenceRate >= 80 ? styles.valueGreen : 
                    data.summary.adherenceRate >= 60 ? styles.valueYellow : styles.valueRed
                  ]}>
                    {data.summary.adherenceRate}%
                  </Text>
                  <Text style={styles.summaryLabel}>Adherence</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{data.summary.currentStreak}🔥</Text>
                  <Text style={styles.summaryLabel}>Streak</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{data.summary.personalBests}</Text>
                  <Text style={styles.summaryLabel}>PR-ova</Text>
                </View>
              </View>

              {/* Weekly Progress Chart */}
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>📈 Tjedni napredak</Text>
                <View style={styles.weeklyChart}>
                  {data.weeklyProgress.map((week, index) => {
                    const maxVolume = Math.max(...data.weeklyProgress.map(w => w.volume));
                    const height = (week.volume / maxVolume) * 80;
                    return (
                      <View key={index} style={styles.weekColumn}>
                        <View style={[styles.weekBar, { height }]} />
                        <Text style={styles.weekLabel}>{week.week}</Text>
                        <Text style={styles.weekVolume}>{(week.volume / 1000).toFixed(0)}k</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Stats Details */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>📋 Detalji</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>⏱️ Prosječno trajanje</Text>
                  <Text style={styles.statValue}>{data.summary.avgSessionDuration} min</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>⚖️ Ukupni volumen</Text>
                  <Text style={styles.statValue}>{(data.summary.totalVolumeKg / 1000).toFixed(1)}t</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>❌ Propušteni treninzi</Text>
                  <Text style={[styles.statValue, styles.valueRed]}>{data.summary.missedWorkouts}</Text>
                </View>
              </View>

              {/* Adjust Program Button */}
              {onAdjustProgram && (
                <TouchableOpacity 
                  style={styles.adjustButton}
                  onPress={() => onAdjustProgram(clientId)}
                >
                  <Text style={styles.adjustButtonText}>🔧 Prilagodi program</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Workouts Tab */}
          {selectedTab === 'workouts' && data && (
            <>
              <Text style={styles.sectionTitle}>Nedavni treninzi</Text>
              {data.recentWorkouts.map((workout) => (
                <View 
                  key={workout.id} 
                  style={[
                    styles.workoutCard,
                    workout.flagged && styles.workoutCardFlagged,
                  ]}
                >
                  <View style={styles.workoutHeader}>
                    <View>
                      <Text style={styles.workoutName}>{workout.sessionName}</Text>
                      <Text style={styles.workoutDate}>{workout.date}</Text>
                    </View>
                    <View style={styles.workoutCompletion}>
                      <Text style={styles.completionText}>
                        {workout.exercisesCompleted}/{workout.totalExercises}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.workoutStats}>
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatLabel}>⏱️</Text>
                      <Text style={styles.workoutStatValue}>{workout.duration}min</Text>
                    </View>
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatLabel}>⚖️</Text>
                      <Text style={styles.workoutStatValue}>{(workout.totalVolume / 1000).toFixed(1)}t</Text>
                    </View>
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatLabel}>💪</Text>
                      <Text style={styles.workoutStatValue}>RIR {workout.averageRIR.toFixed(1)}</Text>
                    </View>
                  </View>

                  {workout.flagged && workout.flagReason && (
                    <View style={styles.flagContainer}>
                      <Text style={styles.flagText}>⚠️ {workout.flagReason}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* PRs Tab */}
          {selectedTab === 'prs' && data && (
            <>
              <Text style={styles.sectionTitle}>🏆 Personal Records</Text>
              {data.personalBests.map((pr, index) => (
                <View key={index} style={styles.prCard}>
                  <View style={styles.prMedal}>
                    <Text style={styles.prMedalText}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆'}
                    </Text>
                  </View>
                  <View style={styles.prInfo}>
                    <Text style={styles.prExercise}>{pr.exercise}</Text>
                    <Text style={styles.prDate}>{pr.date}</Text>
                  </View>
                  <View style={styles.prWeightContainer}>
                    <Text style={styles.prWeight}>{pr.weight} kg</Text>
                    {pr.previousBest && (
                      <Text style={styles.prImprovement}>
                        +{pr.weight - pr.previousBest} kg
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

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
  headerCenter: { alignItems: 'center' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#888', fontSize: 12, marginTop: 2 },
  placeholder: { width: 60 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 10, fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 20 },

  // Alerts
  alertsContainer: {
    maxHeight: 80,
    marginBottom: 15,
  },
  alertsContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginRight: 10,
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  alertIcon: { fontSize: 16, marginRight: 8 },
  alertMessage: { color: '#FFF', fontSize: 13, flex: 1 },

  // Tabs
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: { color: '#888', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#FFF', fontWeight: '600' },

  // Summary
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  summaryLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  valueGreen: { color: '#22C55E' },
  valueYellow: { color: '#F59E0B' },
  valueRed: { color: '#EF4444' },

  // Chart
  chartSection: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  weekColumn: {
    alignItems: 'center',
  },
  weekBar: {
    width: 40,
    backgroundColor: '#8B5CF6',
    borderRadius: 6,
    marginBottom: 8,
  },
  weekLabel: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  weekVolume: { color: '#888', fontSize: 10 },

  // Stats
  statsSection: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statLabel: { color: '#CCC', fontSize: 14 },
  statValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Adjust Button
  adjustButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  adjustButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Workout Card
  workoutCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  workoutCardFlagged: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  workoutDate: { color: '#888', fontSize: 12, marginTop: 2 },
  workoutCompletion: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completionText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  workoutStat: {
    alignItems: 'center',
  },
  workoutStatLabel: { fontSize: 14 },
  workoutStatValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  flagContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  flagText: { color: '#F59E0B', fontSize: 13 },

  // PR Card
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  prMedal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prMedalText: { fontSize: 20 },
  prInfo: { flex: 1 },
  prExercise: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  prDate: { color: '#888', fontSize: 12, marginTop: 2 },
  prWeightContainer: { alignItems: 'flex-end' },
  prWeight: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  prImprovement: { color: '#22C55E', fontSize: 12, fontWeight: '600' },

  bottomPadding: { height: 40 },
});


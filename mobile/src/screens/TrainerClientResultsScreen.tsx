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
  adherenceTrend?: {
    date: string;
    adherence: number;
    workoutsCompleted: number;
    workoutsPlanned: number;
  }[];
  volumeTrend?: {
    date: string;
    volume: number;
    workouts: number;
  }[];
  exerciseProgress?: {
    exerciseId: string;
    exerciseName: string;
    data: {
      date: string;
      weight: number;
      reps: number;
      volume: number;
    }[];
    personalBest: {
      weight: number;
      reps: number;
      volume: number;
      date: string;
    } | null;
    improvement: number;
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
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function loadData() {
    setLoading(true);
    try {
      // Dohvati progress podatke
      const progressResponse = await fetch(
        `${API_BASE_URL}/api/trainer/client/${clientId}/progress?period=12w`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );
      const progressResult = await progressResponse.json();

      // Dohvati client info
      const clientResponse = await fetch(
        `${API_BASE_URL}/api/trainer/client/${clientId}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );
      const clientResult = await clientResponse.json();

      // Dohvati recent workout logs
      const logsResponse = await fetch(
        `${API_BASE_URL}/api/trainer/client/${clientId}/workout-logs?limit=10`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );
      const logsResult = await logsResponse.json();

      if (progressResult.success && clientResult.success) {
        const progress = progressResult.data;
        const client = clientResult.data.client;
        const recentLogs = logsResult.success ? logsResult.data.logs || [] : [];

        // Transformiraj podatke u format koji screen očekuje
        const transformedData: ClientResultsData = {
          client: {
            id: client.id,
            name: client.name,
            email: client.email || '',
            connectedSince: client.createdAt || new Date().toISOString(),
          },
          summary: {
            totalWorkouts: progress.summary.totalWorkouts,
            adherenceRate: Math.round(progress.summary.avgAdherence),
            avgSessionDuration: progress.summary.avgSessionDuration,
            totalVolumeKg: progress.summary.totalVolume,
            personalBests: progress.summary.personalBests,
            missedWorkouts: progress.summary.missedWorkouts,
            currentStreak: progress.summary.currentStreak,
          },
          recentWorkouts: recentLogs.map((log: any) => ({
            id: log.id,
            date: log.started_at,
            sessionName: log.session?.split_name || 'Workout',
            duration: log.duration_minutes || 60,
            exercisesCompleted: log.completed_exercises || 0,
            totalExercises: log.total_exercises || 0,
            totalVolume: log.total_volume || 0,
            averageRIR: 2, // TODO: Calculate from sets
            flagged: log.status !== 'completed',
            flagReason: log.status === 'partial' ? 'Djelomično završeno' : 
                       log.status === 'skipped' ? 'Preskočeno' : undefined,
          })),
          personalBests: progress.exerciseProgress
            .filter((ex: any) => ex.personalBest)
            .map((ex: any) => ({
              exercise: ex.exerciseName,
              weight: ex.personalBest.weight,
              date: ex.personalBest.date,
            })),
          alerts: [], // TODO: Generate alerts from flagged exercises
          weeklyProgress: progress.weeklyData.map((week: any) => ({
            week: week.weekLabel,
            volume: week.volume,
            adherence: Math.round(week.adherence),
            avgRIR: 2, // TODO: Calculate from logs
          })),
          adherenceTrend: progress.adherenceTrend || [],
          volumeTrend: progress.volumeTrend || [],
          exerciseProgress: progress.exerciseProgress || [],
        };

        setData(transformedData);
        
        // Postavi prvu vježbu kao odabranu ako postoje podaci
        if (progress.exerciseProgress && progress.exerciseProgress.length > 0 && !selectedExercise) {
          setSelectedExercise(progress.exerciseProgress[0].exerciseId);
        }
      } else {
        // Prazni podaci ako API ne vrati uspješan odgovor
        setData(generateEmptyData());
      }
    } catch (error) {
      console.error('Error loading client results:', error);
      setData(generateEmptyData());
    } finally {
      setLoading(false);
    }
  }

  function generateEmptyData(): ClientResultsData {
    return {
      client: {
        id: clientId,
        name: clientName,
        email: '',
        connectedSince: new Date().toISOString(),
      },
      summary: {
        totalWorkouts: 0,
        adherenceRate: 0,
        avgSessionDuration: 0,
        totalVolumeKg: 0,
        personalBests: 0,
        missedWorkouts: 0,
        currentStreak: 0,
      },
      recentWorkouts: [],
      personalBests: [],
      alerts: [],
      weeklyProgress: [],
      adherenceTrend: [],
      volumeTrend: [],
      exerciseProgress: [],
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
      case 'success': return '#3F3F46';
      case 'info': return '#3B82F6';
    }
  }

  function getAlertIcon(type: 'warning' | 'info' | 'success') {
    switch (type) {
      case 'warning': return '';
      case 'success': return '';
      case 'info': return 'ℹ️';
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Učitavanje rezultata...</Text>
          </View>
        </LinearGradient>
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
            { key: 'overview', label: ' Pregled' },
            { key: 'workouts', label: ' Treninzi' },
            { key: 'prs', label: ' PR-ovi' },
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
          {/* Prazno stanje - nema evidentiranih treninga */}
          {data && data.summary.totalWorkouts === 0 && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text style={styles.emptyStateTitle}>Nema evidentiranih treninga</Text>
              <Text style={styles.emptyStateText}>
                Kada evidentirate treninge za ovog klijenta, ovdje će se prikazivati statistike, grafovi i napredak.
              </Text>
              <Text style={styles.emptyStateHint}>
                Idite na karton klijenta → Evidentiraj trening
              </Text>
            </View>
          )}

          {/* Overview Tab */}
          {selectedTab === 'overview' && data && data.summary.totalWorkouts > 0 && (
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
                  <Text style={styles.summaryValue}>{data.summary.currentStreak}</Text>
                  <Text style={styles.summaryLabel}>Streak</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{data.summary.personalBests}</Text>
                  <Text style={styles.summaryLabel}>PR-ova</Text>
                </View>
              </View>

              {/* Weekly Progress Chart */}
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>📊 Tjedni napredak</Text>
                <View style={styles.weeklyChart}>
                  {data.weeklyProgress.length > 0 ? (
                    data.weeklyProgress.map((week, index) => {
                      const maxVolume = Math.max(...data.weeklyProgress.map(w => w.volume), 1);
                      const height = maxVolume > 0 ? (week.volume / maxVolume) * 80 : 0;
                      return (
                        <View key={index} style={styles.weekColumn}>
                          <View style={[styles.weekBar, { height: Math.max(height, 4) }]} />
                          <Text style={styles.weekLabel}>{week.week}</Text>
                          <Text style={styles.weekVolume}>{(week.volume / 1000).toFixed(0)}k</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyChartText}>Nema podataka</Text>
                  )}
                </View>
              </View>

              {/* Adherence Trend Chart */}
              {data.adherenceTrend && data.adherenceTrend.length > 0 && (
                <View style={styles.chartSection}>
                  <Text style={styles.sectionTitle}>📈 Adherence trend</Text>
                  <View style={styles.trendChart}>
                    {data.adherenceTrend.slice(-14).map((point, index) => {
                      const maxAdherence = 100;
                      const height = (point.adherence / maxAdherence) * 100;
                      const date = new Date(point.date);
                      const dayLabel = date.getDate().toString();
                      return (
                        <View key={index} style={styles.trendColumn}>
                          <View style={[styles.trendBar, { 
                            height: Math.max(height, 2),
                            backgroundColor: point.adherence >= 80 ? '#22C55E' :
                                           point.adherence >= 60 ? '#F59E0B' : '#DC2626'
                          }]} />
                          <Text style={styles.trendLabel}>{dayLabel}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                      <Text style={styles.legendText}>≥80%</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.legendText}>60-79%</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                      <Text style={styles.legendText}>&lt;60%</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Volume Trend Chart */}
              {data.volumeTrend && data.volumeTrend.length > 0 && (
                <View style={styles.chartSection}>
                  <Text style={styles.sectionTitle}>💪 Volumen trend</Text>
                  <View style={styles.trendChart}>
                    {data.volumeTrend.slice(-14).map((point, index) => {
                      const maxVolume = Math.max(...data.volumeTrend!.map(p => p.volume), 1);
                      const height = maxVolume > 0 ? (point.volume / maxVolume) * 100 : 0;
                      const date = new Date(point.date);
                      const dayLabel = date.getDate().toString();
                      return (
                        <View key={index} style={styles.trendColumn}>
                          <View style={[styles.trendBar, { 
                            height: Math.max(height, 2),
                            backgroundColor: '#3B82F6'
                          }]} />
                          <Text style={styles.trendLabel}>{dayLabel}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Exercise Progress Chart - Graf napretka po vježbi */}
              {data.exerciseProgress && data.exerciseProgress.length > 0 && (
                <View style={styles.chartSection}>
                  <Text style={styles.sectionTitle}>🏋️ Napredak po vježbi</Text>
                  
                  {/* Exercise selector */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.exerciseSelectorContainer}
                    contentContainerStyle={styles.exerciseSelectorContent}
                  >
                    {data.exerciseProgress.slice(0, 5).map((ex) => (
                      <TouchableOpacity
                        key={ex.exerciseId}
                        style={[
                          styles.exerciseSelectorButton,
                          selectedExercise === ex.exerciseId && styles.exerciseSelectorButtonActive
                        ]}
                        onPress={() => setSelectedExercise(ex.exerciseId)}
                      >
                        <Text style={[
                          styles.exerciseSelectorText,
                          selectedExercise === ex.exerciseId && styles.exerciseSelectorTextActive
                        ]}>
                          {ex.exerciseName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Exercise progress chart */}
                  {(() => {
                    const selectedEx = data.exerciseProgress?.find(ex => ex.exerciseId === selectedExercise);
                    if (!selectedEx || selectedEx.data.length === 0) {
                      return <Text style={styles.emptyChartText}>Odaberi vježbu</Text>;
                    }

                    const chartData = selectedEx.data.slice(-10); // Zadnjih 10 unosa
                    const maxWeight = Math.max(...chartData.map(d => d.weight), 1);
                    const minWeight = Math.min(...chartData.map(d => d.weight));
                    const weightRange = maxWeight - minWeight || 1;
                    
                    const firstWeight = chartData[0]?.weight || 0;
                    const lastWeight = chartData[chartData.length - 1]?.weight || 0;
                    const improvement = firstWeight > 0 
                      ? Math.round(((lastWeight - firstWeight) / firstWeight) * 100) 
                      : 0;

                    return (
                      <>
                        {/* Y-axis labels */}
                        <View style={styles.exerciseChartContainer}>
                          <View style={styles.exerciseYAxis}>
                            <Text style={styles.exerciseYAxisLabel}>{maxWeight}kg</Text>
                            <Text style={styles.exerciseYAxisLabel}>{Math.round((maxWeight + minWeight) / 2)}kg</Text>
                            <Text style={styles.exerciseYAxisLabel}>{minWeight}kg</Text>
                          </View>
                          
                          {/* Chart area */}
                          <View style={styles.exerciseChartArea}>
                            {/* Line chart with dots */}
                            <View style={styles.exerciseLineChart}>
                              {chartData.map((point, index) => {
                                const heightPercent = ((point.weight - minWeight) / weightRange) * 100;
                                const date = new Date(point.date);
                                const label = `${date.getDate()}/${date.getMonth() + 1}`;
                                
                                return (
                                  <View key={index} style={styles.exerciseChartColumn}>
                                    <View style={styles.exerciseChartColumnInner}>
                                      <View 
                                        style={[
                                          styles.exerciseChartDot,
                                          { bottom: `${heightPercent}%` }
                                        ]} 
                                      />
                                      {/* Connecting line to next point */}
                                      {index < chartData.length - 1 && (
                                        <View 
                                          style={[
                                            styles.exerciseChartLine,
                                            { 
                                              bottom: `${heightPercent}%`,
                                              height: 2,
                                            }
                                          ]} 
                                        />
                                      )}
                                    </View>
                                    <Text style={styles.exerciseChartLabel}>{label}</Text>
                                    <Text style={styles.exerciseChartWeight}>{point.weight}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        </View>

                        {/* Stats row */}
                        <View style={styles.exerciseStatsRow}>
                          <View style={styles.exerciseStatItem}>
                            <Text style={styles.exerciseStatValue}>
                              {selectedEx.personalBest?.weight || 0}kg
                            </Text>
                            <Text style={styles.exerciseStatLabel}>🏆 PR</Text>
                          </View>
                          <View style={styles.exerciseStatItem}>
                            <Text style={[
                              styles.exerciseStatValue,
                              improvement >= 0 ? styles.exerciseStatPositive : styles.exerciseStatNegative
                            ]}>
                              {improvement >= 0 ? '+' : ''}{improvement}%
                            </Text>
                            <Text style={styles.exerciseStatLabel}>📈 Napredak</Text>
                          </View>
                          <View style={styles.exerciseStatItem}>
                            <Text style={styles.exerciseStatValue}>{chartData.length}</Text>
                            <Text style={styles.exerciseStatLabel}>📝 Unosa</Text>
                          </View>
                        </View>
                      </>
                    );
                  })()}
                </View>
              )}

              {/* Stats Details */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}> Detalji</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>⏱️ Prosječno trajanje</Text>
                  <Text style={styles.statValue}>{data.summary.avgSessionDuration} min</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>⚖️ Ukupni volumen</Text>
                  <Text style={styles.statValue}>{(data.summary.totalVolumeKg / 1000).toFixed(1)}t</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}> Propušteni treninzi</Text>
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
          {selectedTab === 'workouts' && data && data.summary.totalWorkouts > 0 && (
            <>
              <Text style={styles.sectionTitle}>Nedavni treninzi</Text>
              {data.recentWorkouts.length === 0 ? (
                <Text style={styles.emptyTabText}>Nema evidentiranih treninga</Text>
              ) : data.recentWorkouts.map((workout) => (
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
                      <Text style={styles.workoutStatLabel}></Text>
                      <Text style={styles.workoutStatValue}>RIR {workout.averageRIR.toFixed(1)}</Text>
                    </View>
                  </View>

                  {workout.flagged && workout.flagReason && (
                    <View style={styles.flagContainer}>
                      <Text style={styles.flagText}> {workout.flagReason}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* PRs Tab */}
          {selectedTab === 'prs' && data && data.summary.totalWorkouts > 0 && (
            <>
              <Text style={styles.sectionTitle}> Personal Records</Text>
              {data.personalBests.length === 0 ? (
                <Text style={styles.emptyTabText}>Nema zabilježenih PR-ova</Text>
              ) : data.personalBests.map((pr, index) => (
                <View key={index} style={styles.prCard}>
                  <View style={styles.prMedal}>
                    <Text style={styles.prMedalText}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
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
  backText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#71717A', fontSize: 12, marginTop: 2 },
  placeholder: { width: 60 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 10, fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 20 },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyStateHint: {
    color: '#3B82F6',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyTabText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },

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
    backgroundColor: '#18181B',
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
    backgroundColor: '#18181B',
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
    backgroundColor: '#27272A',
  },
  tabText: { color: '#71717A', fontSize: 13, fontWeight: '500' },
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
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  summaryLabel: { color: '#71717A', fontSize: 12, marginTop: 4 },
  valueGreen: { color: '#3F3F46' },
  valueYellow: { color: '#F59E0B' },
  valueRed: { color: '#71717A' },

  // Chart
  chartSection: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  emptyChartText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  trendColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  trendBar: {
    width: '100%',
    minHeight: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginBottom: 4,
  },
  trendLabel: {
    color: '#71717A',
    fontSize: 10,
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#71717A',
    fontSize: 11,
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
    backgroundColor: '#27272A',
    borderRadius: 6,
    marginBottom: 8,
  },
  weekLabel: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  weekVolume: { color: '#71717A', fontSize: 10 },

  // Exercise Progress Chart
  exerciseSelectorContainer: {
    marginBottom: 16,
    marginHorizontal: -4,
  },
  exerciseSelectorContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  exerciseSelectorButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#27272A',
    borderRadius: 20,
  },
  exerciseSelectorButtonActive: {
    backgroundColor: '#3B82F6',
  },
  exerciseSelectorText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '500',
  },
  exerciseSelectorTextActive: {
    color: '#FFFFFF',
  },
  exerciseChartContainer: {
    flexDirection: 'row',
    height: 140,
    marginBottom: 16,
  },
  exerciseYAxis: {
    width: 45,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingVertical: 10,
  },
  exerciseYAxisLabel: {
    color: '#71717A',
    fontSize: 10,
  },
  exerciseChartArea: {
    flex: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  exerciseLineChart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  exerciseChartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  exerciseChartColumnInner: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  exerciseChartDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    alignSelf: 'center',
    marginLeft: -5,
    left: '50%',
  },
  exerciseChartLine: {
    position: 'absolute',
    width: '100%',
    backgroundColor: '#22C55E',
    opacity: 0.4,
  },
  exerciseChartLabel: {
    color: '#71717A',
    fontSize: 9,
    marginTop: 4,
  },
  exerciseChartWeight: {
    color: '#22C55E',
    fontSize: 10,
    fontWeight: '600',
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  exerciseStatItem: {
    alignItems: 'center',
  },
  exerciseStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseStatPositive: {
    color: '#22C55E',
  },
  exerciseStatNegative: {
    color: '#DC2626',
  },
  exerciseStatLabel: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 4,
  },

  // Stats
  statsSection: {
    backgroundColor: '#18181B',
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
  statLabel: { color: '#D4D4D8', fontSize: 14 },
  statValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Adjust Button
  adjustButton: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  adjustButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Workout Card
  workoutCard: {
    backgroundColor: '#18181B',
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
  workoutDate: { color: '#71717A', fontSize: 12, marginTop: 2 },
  workoutCompletion: {
    backgroundColor: '#3F3F46',
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
    backgroundColor: '#18181B',
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
  prDate: { color: '#71717A', fontSize: 12, marginTop: 2 },
  prWeightContainer: { alignItems: 'flex-end' },
  prWeight: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  prImprovement: { color: '#3F3F46', fontSize: 12, fontWeight: '600' },

  bottomPadding: { height: 40 },
});


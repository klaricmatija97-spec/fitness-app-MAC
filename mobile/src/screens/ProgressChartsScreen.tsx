/**
 * Progress Charts Screen
 * ======================
 * Grafovi napretka za klijenta - volumen, adherence, snaga
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 60;
const CHART_HEIGHT = 180;

interface Props {
  authToken: string;
  onBack?: () => void;
}

interface WeeklyData {
  week: number;
  weekLabel: string;
  volume: number;
  adherence: number;
  avgWeight: number;
}

interface ExerciseProgress {
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
    date: string;
  };
  improvement: number; // postotak poboljšanja
}

interface ProgressData {
  summary: {
    totalWorkouts: number;
    totalVolume: number;
    avgAdherence: number;
    currentStreak: number;
    longestStreak: number;
    personalBests: number;
  };
  weeklyData: WeeklyData[];
  exerciseProgress: ExerciseProgress[];
  muscleGroupVolume: {
    group: string;
    volume: number;
    percentage: number;
  }[];
}

export default function ProgressChartsScreen({ authToken, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ProgressData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'4w' | '8w' | '12w'>('4w');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'exercises' | 'muscles'>('overview');

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/client/progress?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        // Mock podaci za testiranje
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  }

  function generateMockData(): ProgressData {
    const weeks = selectedPeriod === '4w' ? 4 : selectedPeriod === '8w' ? 8 : 12;
    
    return {
      summary: {
        totalWorkouts: 24,
        totalVolume: 156000,
        avgAdherence: 85,
        currentStreak: 5,
        longestStreak: 12,
        personalBests: 7,
      },
      weeklyData: Array.from({ length: weeks }, (_, i) => ({
        week: i + 1,
        weekLabel: `T${i + 1}`,
        volume: 10000 + Math.random() * 5000 + i * 500,
        adherence: 70 + Math.random() * 25,
        avgWeight: 60 + Math.random() * 10 + i * 0.5,
      })),
      exerciseProgress: [
        {
          exerciseId: '1',
          exerciseName: 'Bench Press',
          data: Array.from({ length: weeks }, (_, i) => ({
            date: `T${i + 1}`,
            weight: 80 + i * 2.5,
            reps: 8,
            volume: (80 + i * 2.5) * 8 * 4,
          })),
          personalBest: { weight: 100, date: '2024-01-15' },
          improvement: 12.5,
        },
        {
          exerciseId: '2',
          exerciseName: 'Squat',
          data: Array.from({ length: weeks }, (_, i) => ({
            date: `T${i + 1}`,
            weight: 100 + i * 5,
            reps: 6,
            volume: (100 + i * 5) * 6 * 4,
          })),
          personalBest: { weight: 140, date: '2024-01-20' },
          improvement: 15,
        },
        {
          exerciseId: '3',
          exerciseName: 'Deadlift',
          data: Array.from({ length: weeks }, (_, i) => ({
            date: `T${i + 1}`,
            weight: 120 + i * 5,
            reps: 5,
            volume: (120 + i * 5) * 5 * 3,
          })),
          personalBest: { weight: 160, date: '2024-01-25' },
          improvement: 10,
        },
      ],
      muscleGroupVolume: [
        { group: 'Prsa', volume: 32000, percentage: 22 },
        { group: 'Leđa', volume: 28000, percentage: 19 },
        { group: 'Noge', volume: 36000, percentage: 24 },
        { group: 'Ramena', volume: 18000, percentage: 12 },
        { group: 'Ruke', volume: 22000, percentage: 15 },
        { group: 'Core', volume: 12000, percentage: 8 },
      ],
    };
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // Simple Bar Chart Component
  function BarChart({ data, dataKey, color, maxValue }: { 
    data: WeeklyData[]; 
    dataKey: 'volume' | 'adherence' | 'avgWeight';
    color: string;
    maxValue?: number;
  }) {
    const max = maxValue || Math.max(...data.map(d => d[dataKey]));
    const barWidth = (CHART_WIDTH - 20) / data.length - 4;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {data.map((item, index) => {
            const height = (item[dataKey] / max) * (CHART_HEIGHT - 30);
            return (
              <View key={index} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height, 
                      width: barWidth,
                      backgroundColor: color,
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>{item.weekLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Line Chart Component (simplified)
  function LineChart({ data, color }: { data: { date: string; weight: number }[]; color: string }) {
    const max = Math.max(...data.map(d => d.weight));
    const min = Math.min(...data.map(d => d.weight));
    const range = max - min || 1;

    return (
      <View style={styles.lineChartContainer}>
        <View style={styles.lineChart}>
          {data.map((point, index) => {
            const y = ((point.weight - min) / range) * (CHART_HEIGHT - 40);
            const nextPoint = data[index + 1];
            
            return (
              <View key={index} style={styles.linePointContainer}>
                <View 
                  style={[
                    styles.linePoint,
                    { 
                      bottom: y,
                      backgroundColor: color,
                    }
                  ]}
                />
                {nextPoint && (
                  <View 
                    style={[
                      styles.lineSegment,
                      {
                        bottom: y,
                        width: (CHART_WIDTH - 40) / (data.length - 1),
                        backgroundColor: color,
                        transform: [
                          { 
                            rotate: `${Math.atan2(
                              ((nextPoint.weight - min) / range - (point.weight - min) / range) * (CHART_HEIGHT - 40),
                              (CHART_WIDTH - 40) / (data.length - 1)
                            )}rad` 
                          }
                        ],
                      }
                    ]}
                  />
                )}
                <Text style={styles.lineLabel}>{point.date}</Text>
                <Text style={styles.lineValue}>{point.weight}kg</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Progress Bar Component
  function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
    const percentage = (value / max) * 100;
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarHeader}>
          <Text style={styles.progressBarLabel}>{label}</Text>
          <Text style={styles.progressBarValue}>{Math.round(value).toLocaleString()}</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Učitavanje napretka...</Text>
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
          <Text style={styles.title}> Napredak</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['4w', '8w', '12w'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                {period === '4w' ? '4 tjedna' : period === '8w' ? '8 tjedana' : '12 tjedana'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          {([
            { key: 'overview', label: ' Pregled' },
            { key: 'exercises', label: ' Vježbe' },
            { key: 'muscles', label: ' Mišići' },
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
          {/* Summary Cards */}
          {selectedTab === 'overview' && data && (
            <>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{data.summary.totalWorkouts}</Text>
                  <Text style={styles.summaryLabel}>Treninga</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{data.summary.avgAdherence}%</Text>
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

              {/* Volume Chart */}
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}> Tjedni volumen (kg)</Text>
                <BarChart data={data.weeklyData} dataKey="volume" color="#FFFFFF" />
              </View>

              {/* Adherence Chart */}
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}> Adherence (%)</Text>
                <BarChart data={data.weeklyData} dataKey="adherence" color="#3F3F46" maxValue={100} />
              </View>
            </>
          )}

          {/* Exercise Progress */}
          {selectedTab === 'exercises' && data && (
            <>
              {data.exerciseProgress.map((exercise) => (
                <View key={exercise.exerciseId} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                    <View style={styles.improvementBadge}>
                      <Text style={styles.improvementText}>+{exercise.improvement}%</Text>
                    </View>
                  </View>
                  
                  <View style={styles.personalBest}>
                    <Text style={styles.pbLabel}> Personal Best</Text>
                    <Text style={styles.pbValue}>{exercise.personalBest.weight} kg</Text>
                  </View>

                  {/* Mini Progress Chart */}
                  <View style={styles.miniChart}>
                    {exercise.data.map((point, index) => {
                      const max = Math.max(...exercise.data.map(d => d.weight));
                      const min = Math.min(...exercise.data.map(d => d.weight));
                      const range = max - min || 1;
                      const height = ((point.weight - min) / range) * 50 + 10;
                      
                      return (
                        <View key={index} style={styles.miniBarContainer}>
                          <View 
                            style={[
                              styles.miniBar,
                              { height, backgroundColor: '#27272A' }
                            ]}
                          />
                          <Text style={styles.miniBarLabel}>{point.weight}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Muscle Group Volume */}
          {selectedTab === 'muscles' && data && (
            <View style={styles.muscleSection}>
              <Text style={styles.sectionTitle}>Distribucija volumena po mišićnoj grupi</Text>
              {data.muscleGroupVolume.map((muscle, index) => (
                <ProgressBar
                  key={index}
                  value={muscle.volume}
                  max={Math.max(...data.muscleGroupVolume.map(m => m.volume))}
                  color={['#FFFFFF', '#3F3F46', '#F59E0B', '#71717A', '#3B82F6', '#EC4899'][index % 6]}
                  label={`${muscle.group} (${muscle.percentage}%)`}
                />
              ))}
            </View>
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
  title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  placeholder: { width: 60 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 10, fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 20 },

  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  periodButtonActive: {
    backgroundColor: '#27272A',
  },
  periodText: { color: '#71717A', fontSize: 14 },
  periodTextActive: { color: '#FFF', fontWeight: '600' },

  // Tab Selector
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

  // Summary Grid
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

  // Charts
  chartSection: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  chartContainer: {
    height: CHART_HEIGHT,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT - 30,
    justifyContent: 'space-around',
  },
  barContainer: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: { color: '#71717A', fontSize: 10, marginTop: 4 },

  // Line Chart
  lineChartContainer: {
    height: CHART_HEIGHT,
  },
  lineChart: {
    flexDirection: 'row',
    height: CHART_HEIGHT - 40,
    alignItems: 'flex-end',
  },
  linePointContainer: {
    flex: 1,
    alignItems: 'center',
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  lineLabel: { color: '#71717A', fontSize: 10, marginTop: 4 },
  lineValue: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },

  // Exercise Progress
  exerciseCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  improvementBadge: {
    backgroundColor: '#3F3F46',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  improvementText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  personalBest: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pbLabel: { color: '#F59E0B', fontSize: 14, marginRight: 8 },
  pbValue: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    gap: 4,
  },
  miniBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  miniBar: {
    width: '80%',
    borderRadius: 3,
  },
  miniBarLabel: { color: '#71717A', fontSize: 9, marginTop: 2 },

  // Muscle Section
  muscleSection: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBarLabel: { color: '#D4D4D8', fontSize: 14 },
  progressBarValue: { color: '#71717A', fontSize: 12 },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  bottomPadding: { height: 40 },
});


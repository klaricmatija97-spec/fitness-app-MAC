/**
 * Progress Screen
 * ===============
 * 
 * Program overview (read-only)
 * Basic charts
 * Session history
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { API_BASE_URL } from '../services/api';

interface Props {
  authToken: string;
  onBack?: () => void;
}

export default function ProgressScreen({ authToken, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/client/progress`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!data || !data.program) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nema podataka</Text>
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
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Natrag</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Napredak</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Program Overview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Program</Text>
            <Text style={styles.cardValue}>{data.program.name}</Text>
            <Text style={styles.cardLabel}>
              Tjedan {data.program.currentWeek} / {data.program.totalWeeks}
            </Text>
            <View style={styles.weekProgress}>
              {Array.from({ length: data.program.totalWeeks }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.weekDot,
                    index < data.program.currentWeek && styles.weekDotCompleted,
                    index === data.program.currentWeek - 1 && styles.weekDotCurrent,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Adherence Chart */}
          {data.adherence && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Adherence</Text>
              <Text style={styles.adherenceValue}>{data.adherence.percentage}%</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${data.adherence.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.cardLabel}>
                {data.adherence.completedSessions} / {data.adherence.totalSessions} sesija
              </Text>

              {/* Weekly Adherence */}
              {data.adherence.byWeek && data.adherence.byWeek.length > 0 && (
                <View style={styles.chartContainer}>
                  <Text style={styles.chartTitle}>Adherence po tjednima</Text>
                  {data.adherence.byWeek.map((week: any) => (
                    <View key={week.weekNumber} style={styles.chartRow}>
                      <Text style={styles.chartLabel}>Tjedan {week.weekNumber}</Text>
                      <View style={styles.chartBarContainer}>
                        <View
                          style={[
                            styles.chartBar,
                            { width: `${week.percentage}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartValue}>{week.percentage}%</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Volume Chart */}
          {data.volume && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Volumen</Text>
              <Text style={styles.cardLabel}>
                Ukupno: {data.volume.totalSets} setova, {data.volume.totalReps} ponavljanja
              </Text>
            </View>
          )}

          {/* Recent Sessions */}
          {data.recentSessions && data.recentSessions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nedavne sesije</Text>
              {data.recentSessions.map((session: any, index: number) => (
                <View key={index} style={styles.sessionItem}>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.date).toLocaleDateString('hr-HR')}
                  </Text>
                  <View
                    style={[
                      styles.sessionStatusBadge,
                      session.status === 'completed' && styles.sessionStatusCompleted,
                    ]}
                  >
                    <Text style={styles.sessionStatusText}>{session.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
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
    paddingBottom: 20,
  },
  backText: { color: '#FFFFFF', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  placeholder: { width: 80 },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#71717A', fontSize: 16 },
  card: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, color: '#71717A', marginBottom: 8 },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  cardLabel: { fontSize: 14, color: '#D4D4D8', marginTop: 4 },
  weekProgress: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  weekDot: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  weekDotCompleted: { backgroundColor: '#3F3F46' },
  weekDotCurrent: { backgroundColor: '#27272A' },
  adherenceValue: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#27272A',
  },
  chartContainer: { marginTop: 20 },
  chartTitle: { fontSize: 14, color: '#71717A', marginBottom: 12 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  chartLabel: { fontSize: 12, color: '#D4D4D8', width: 80 },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: '#27272A',
  },
  chartValue: { fontSize: 12, color: '#FFF', width: 50, textAlign: 'right' },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sessionName: { fontSize: 16, fontWeight: '600', color: '#FFF', flex: 1 },
  sessionDate: { fontSize: 12, color: '#71717A', marginRight: 12 },
  sessionStatusBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionStatusCompleted: { backgroundColor: '#3F3F46' },
  sessionStatusText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
});


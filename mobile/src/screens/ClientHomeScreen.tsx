/**
 * Client Home Screen
 * ==================
 * 
 * Today's workout session
 * Program status
 * Quick progress overview
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
  onStartWorkout?: (sessionId: string) => void;
  onViewProgress?: () => void;
}

export default function ClientHomeScreen({ authToken, onStartWorkout, onViewProgress }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/client/today`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#FFA500';
      case 'skipped': return '#FF4444';
      default: return '#8B5CF6';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Završeno';
      case 'in_progress': return 'U tijeku';
      case 'skipped': return 'Preskočeno';
      default: return 'Započni';
    }
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
          <Text style={styles.title}>Danas</Text>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* No Program State */}
          {!data?.program && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Nema aktivnog programa</Text>
              <Text style={styles.emptyText}>Kontaktirajte trenera za aktivaciju programa</Text>
            </View>
          )}

          {/* Has Program */}
          {data?.program && (
            <>
              {/* Program Info Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Program</Text>
                <Text style={styles.cardValue}>{data.program.name}</Text>
                <Text style={styles.cardLabel}>
                  Tjedan {data.program.currentWeek} / {data.program.totalWeeks}
                </Text>
              </View>

              {/* Today Session Card */}
              {data.todaySession ? (
                <TouchableOpacity
                  style={styles.sessionCard}
                  onPress={() => onStartWorkout?.(data.todaySession.id)}
                >
                  <Text style={styles.sessionTitle}>Današnji trening</Text>
                  <Text style={styles.sessionName}>{data.todaySession.name}</Text>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionInfoText}>
                      {data.todaySession.exercisesCount} vježbi
                    </Text>
                    <Text style={styles.sessionInfoText}>
                      ~{data.todaySession.estimatedDuration} min
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(data.todaySession.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusLabel(data.todaySession.status)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Danas nema treninga</Text>
                  <Text style={styles.cardLabel}>Dan odmora ili nedjelja</Text>
                </View>
              )}

              {/* Progress Card */}
              {data.progress && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Napredak</Text>
                  <Text style={styles.adherenceValue}>{data.progress.adherence}%</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${data.progress.adherence}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.cardLabel}>
                    {data.progress.completedSessions} / {data.progress.totalSessions} sesija
                  </Text>
                  {data.progress.streak > 0 && (
                    <Text style={styles.cardLabel}>Streak: {data.progress.streak} dana</Text>
                  )}
                </View>
              )}

              {/* Quick Actions */}
              <TouchableOpacity
                style={styles.progressButton}
                onPress={onViewProgress}
              >
                <Text style={styles.progressButtonText}>Pregled napretka</Text>
              </TouchableOpacity>
            </>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#999', marginTop: 16, fontSize: 16 },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  card: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, color: '#999', marginBottom: 8 },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  cardLabel: { fontSize: 14, color: '#CCC', marginTop: 4 },
  sessionCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  sessionTitle: { fontSize: 14, color: '#999', marginBottom: 8 },
  sessionName: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  sessionInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  sessionInfoText: { fontSize: 14, color: '#CCC' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  adherenceValue: { fontSize: 36, fontWeight: 'bold', color: '#8B5CF6', marginBottom: 12 },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  progressButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 8,
  },
  progressButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});


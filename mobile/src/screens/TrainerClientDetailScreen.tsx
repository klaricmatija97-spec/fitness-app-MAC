/**
 * Trainer Client Detail Screen
 * ============================
 * 
 * Client program overview
 * Adherence tracking
 * Flagged exercises
 * Quick actions
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
  clientId: string;
  onBack?: () => void;
  onAnnualPlanPress?: (clientId: string, clientName: string) => void;
  onGenerateProgram?: (clientId: string) => void;
  onViewResults?: (clientId: string, clientName: string) => void;
}

export default function TrainerClientDetailScreen({ authToken, clientId, onBack, onAnnualPlanPress, onGenerateProgram, onViewResults }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/client/${clientId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading client detail:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleRegenerateWeek() {
    if (!data?.program?.id) {
      Alert.alert('Greška', 'Program nije pronađen');
      return;
    }

    Alert.alert(
      'Regeneriraj tjedan',
      'Želite li regenerirati sljedeći tjedan programa?',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Regeneriraj',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/trainer/program/${data.program.id}/regenerate-week`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({}),
                }
              );

              const result = await response.json();
              if (result.success) {
                Alert.alert('Uspjeh', 'Tjedan je uspješno regeneriran!');
                await loadData(); // Refresh podataka
              } else {
                Alert.alert('Greška', result.error || 'Nije moguće regenerirati tjedan');
              }
            } catch (error) {
              console.error('Error regenerating week:', error);
              Alert.alert('Greška', 'Nije moguće regenerirati tjedan');
            }
          },
        },
      ]
    );
  }

  async function handleCopyProgram(programId: string) {
    // TODO: Implementirati odabir target klijenta
    Alert.alert(
      'Kopiraj program',
      'Funkcionalnost za kopiranje programa između klijenata dolazi uskoro.',
      [{ text: 'OK' }]
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nema podataka</Text>
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
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Natrag</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{data.client.name}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Client Info Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Klijent</Text>
            <Text style={styles.cardValue}>{data.client.name}</Text>
            <Text style={styles.cardLabel}>{data.client.email}</Text>
            {data.client.phone && <Text style={styles.cardLabel}>{data.client.phone}</Text>}
          </View>

          {/* Program Info Card */}
          {data.program && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Program</Text>
              <Text style={styles.cardValue}>{data.program.name}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{data.program.status}</Text>
              </View>
              <Text style={styles.cardLabel}>
                Tjedan {data.program.currentWeek} / {data.program.totalWeeks}
              </Text>
            </View>
          )}

          {/* Adherence Card */}
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
              {data.adherence.streak > 0 && (
                <Text style={styles.cardLabel}>Streak: {data.adherence.streak} dana</Text>
              )}
            </View>
          )}

          {/* Flagged Exercises */}
          {data.flaggedExercises && data.flaggedExercises.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Vježbe za pažnju ({data.flaggedExercises.length})</Text>
              {data.flaggedExercises.map((exercise: any, index: number) => (
                <View key={index} style={styles.flaggedItem}>
                  <Text style={styles.flaggedName}>{exercise.exerciseName}</Text>
                  <Text style={styles.flaggedReason}>{exercise.reason}</Text>
                  {exercise.notes && <Text style={styles.flaggedNotes}>{exercise.notes}</Text>}
                </View>
              ))}
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

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => {
                if (onGenerateProgram) {
                  onGenerateProgram(clientId);
                } else {
                  Alert.alert('Info', 'Generiranje programa dolazi uskoro');
                }
              }}
            >
              <Text style={styles.actionButtonText}>💪 Generiraj novi program</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => {
                if (onAnnualPlanPress && data?.client?.name) {
                  onAnnualPlanPress(clientId, data.client.name);
                } else {
                  Alert.alert('Info', 'Godišnji plan builder dolazi uskoro');
                }
              }}
            >
              <Text style={styles.actionButtonText}>📅 Godišnji plan mezociklusa</Text>
            </TouchableOpacity>
            {data.program && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRegenerateWeek}
                >
                  <Text style={styles.actionButtonText}>🔄 Regeneriraj sljedeći tjedan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => handleCopyProgram(data.program.id)}
                >
                  <Text style={styles.actionButtonText}>📋 Kopiraj program</Text>
                </TouchableOpacity>
              </>
            )}
            {/* View Results Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonResults]}
              onPress={() => {
                if (onViewResults && data?.client?.name) {
                  onViewResults(clientId, data.client.name);
                } else {
                  Alert.alert('Info', 'Pregled rezultata dolazi uskoro');
                }
              }}
            >
              <Text style={styles.actionButtonText}>📊 Pogledaj rezultate</Text>
            </TouchableOpacity>
          </View>
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
  backText: { color: '#8B5CF6', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  placeholder: { width: 80 },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16 },
  card: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, color: '#999', marginBottom: 8 },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  cardLabel: { fontSize: 14, color: '#CCC', marginTop: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
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
  flaggedItem: {
    backgroundColor: '#3A2A2A',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  flaggedName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  flaggedReason: { fontSize: 12, color: '#FFA500', marginBottom: 4 },
  flaggedNotes: { fontSize: 12, color: '#CCC' },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sessionName: { fontSize: 16, fontWeight: '600', color: '#FFF', flex: 1 },
  sessionDate: { fontSize: 12, color: '#999', marginRight: 12 },
  sessionStatusBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionStatusCompleted: { backgroundColor: '#4CAF50' },
  sessionStatusText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  actionsContainer: { marginBottom: 40 },
  actionButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  actionButtonSecondary: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonResults: {
    backgroundColor: '#3B82F6',
    marginTop: 8,
  },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});


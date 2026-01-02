/**
 * Trainer Client Detail Screen
 * ============================
 * 
 * KOMPLETNI KARTON KLIJENTA:
 * - Osobni podaci (ime, dob, spol)
 * - Tjelesne mjere (težina, visina, BMI)
 * - Ciljevi i aktivnosti
 * - Trening preferencije
 * - Prehrana i kalkulator rezultati
 * - Program i adherence
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

// ============================================
// TIPOVI
// ============================================

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  gender: 'male' | 'female' | 'other';
  ageRange: string;
  weight: { value: number; unit: string } | null;
  height: { value: number; unit: string } | null;
  bmi: number | null;
  goals: { value: string; label: string }[];
  activities: { value: string; label: string }[];
  otherGoals: string | null;
  otherActivities: string | null;
  training: {
    frequency: string | null;
    frequencyLabel: string | null;
    duration: string | null;
    durationLabel: string | null;
    location: string | null;
    locationLabel: string | null;
    equipment: { value: string; label: string }[];
    experience: string | null;
    experienceLabel: string | null;
  };
  nutrition: {
    dietCleanliness: number | null;
    mealFrequency: string | null;
    allergies: string | null;
  };
  injuries: string | null;
  notes: string | null;
}

interface CalculationsData {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  bmr: number;
  tdee: number;
  calculatedAt: string;
}

interface Props {
  authToken: string;
  clientId: string;
  onBack?: () => void;
  onAnnualPlanPress?: (clientId: string, clientName: string) => void;
  onGenerateProgram?: (clientId: string) => void;
  onViewResults?: (clientId: string, clientName: string) => void;
  onViewProgram?: (programId: string, clientName: string) => void;
}

export default function TrainerClientDetailScreen({ authToken, clientId, onBack, onAnnualPlanPress, onGenerateProgram, onViewResults, onViewProgram }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([]);
  const [workoutLogsLoading, setWorkoutLogsLoading] = useState(false);
  const [showWorkoutLogs, setShowWorkoutLogs] = useState(false);

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
        // Učitaj workout logs ako postoji program
        if (result.data.program?.id) {
          loadWorkoutLogs(result.data.program.id);
        }
      }
    } catch (error) {
      console.error('Error loading client detail:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkoutLogs(programId?: string) {
    setWorkoutLogsLoading(true);
    try {
      const url = programId
        ? `${API_BASE_URL}/api/trainer/client/${clientId}/workout-logs?programId=${programId}&limit=10`
        : `${API_BASE_URL}/api/trainer/client/${clientId}/workout-logs?limit=10`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();
      if (result.success) {
        setWorkoutLogs(result.data.logs || []);
      }
    } catch (error) {
      console.error('Error loading workout logs:', error);
    } finally {
      setWorkoutLogsLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    if (data?.program?.id) {
      await loadWorkoutLogs(data.program.id);
    }
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
        <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!data) {
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
          <Text style={styles.title}>{data.client.name}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* ============================================ */}
          {/* OSOBNI PODACI */}
          {/* ============================================ */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Osobni podaci</Text>
            <Text style={styles.cardValue}>{data.client.name}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{data.client.email}</Text>
            </View>
            {data.client.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefon:</Text>
                <Text style={styles.infoValue}>{data.client.phone}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Spol:</Text>
              <Text style={styles.infoValue}>
                {data.client.gender === 'male' ? 'Muški' : data.client.gender === 'female' ? 'Ženski' : 'Ostalo'}
              </Text>
            </View>
            {data.client.ageRange && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dob:</Text>
                <Text style={styles.infoValue}>{data.client.ageRange} godina</Text>
              </View>
            )}
            {data.client.createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Član od:</Text>
                <Text style={styles.infoValue}>
                  {new Date(data.client.createdAt).toLocaleDateString('hr-HR')}
                </Text>
              </View>
            )}
          </View>

          {/* ============================================ */}
          {/* TJELESNE MJERE */}
          {/* ============================================ */}
          {(data.client.weight || data.client.height) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tjelesne mjere</Text>
              <View style={styles.metricsRow}>
                {data.client.weight && (
                  <View style={styles.metricBox}>
                    <Text style={styles.metricValue}>
                      {data.client.weight.value}
                    </Text>
                    <Text style={styles.metricUnit}>{data.client.weight.unit}</Text>
                    <Text style={styles.metricLabel}>Težina</Text>
                  </View>
                )}
                {data.client.height && (
                  <View style={styles.metricBox}>
                    <Text style={styles.metricValue}>
                      {data.client.height.value}
                    </Text>
                    <Text style={styles.metricUnit}>{data.client.height.unit}</Text>
                    <Text style={styles.metricLabel}>Visina</Text>
                  </View>
                )}
                {data.client.bmi && (
                  <View style={styles.metricBox}>
                    <Text style={[
                      styles.metricValue,
                      data.client.bmi < 18.5 && styles.bmiUnderweight,
                      data.client.bmi >= 18.5 && data.client.bmi < 25 && styles.bmiNormal,
                      data.client.bmi >= 25 && data.client.bmi < 30 && styles.bmiOverweight,
                      data.client.bmi >= 30 && styles.bmiObese,
                    ]}>
                      {data.client.bmi}
                    </Text>
                    <Text style={styles.metricUnit}>BMI</Text>
                    <Text style={styles.metricLabel}>
                      {data.client.bmi < 18.5 ? 'Pothranjen' :
                       data.client.bmi < 25 ? 'Normalan' :
                       data.client.bmi < 30 ? 'Prekomjerna' : 'Pretilost'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ============================================ */}
          {/* KALKULATOR REZULTATI */}
          {/* ============================================ */}
          {data.calculations && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Kalkulator</Text>
              <View style={styles.macrosContainer}>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{data.calculations.targetCalories}</Text>
                  <Text style={styles.macroLabel}>kcal</Text>
                </View>
                <View style={[styles.macroBox, styles.macroProtein]}>
                  <Text style={styles.macroValue}>{data.calculations.targetProtein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={[styles.macroBox, styles.macroCarbs]}>
                  <Text style={styles.macroValue}>{data.calculations.targetCarbs}g</Text>
                  <Text style={styles.macroLabel}>Ugljikoh.</Text>
                </View>
                <View style={[styles.macroBox, styles.macroFats]}>
                  <Text style={styles.macroValue}>{data.calculations.targetFats}g</Text>
                  <Text style={styles.macroLabel}>Masti</Text>
                </View>
              </View>
              <View style={styles.calculationsExtra}>
                <Text style={styles.calculationsExtraText}>
                  BMR: {data.calculations.bmr} kcal • TDEE: {data.calculations.tdee} kcal
                </Text>
              </View>
            </View>
          )}

          {/* ============================================ */}
          {/* CILJEVI */}
          {/* ============================================ */}
          {data.client.goals && data.client.goals.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ciljevi</Text>
              <View style={styles.tagsContainer}>
                {data.client.goals.map((goal: any, index: number) => (
                  <View key={index} style={styles.tagGoal}>
                    <Text style={styles.tagText}>{goal.label}</Text>
                  </View>
                ))}
              </View>
              {data.client.otherGoals && (
                <Text style={styles.otherText}>+ {data.client.otherGoals}</Text>
              )}
            </View>
          )}

          {/* ============================================ */}
          {/* AKTIVNOSTI */}
          {/* ============================================ */}
          {data.client.activities && data.client.activities.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Aktivnosti</Text>
              <View style={styles.tagsContainer}>
                {data.client.activities.map((activity: any, index: number) => (
                  <View key={index} style={styles.tagActivity}>
                    <Text style={styles.tagText}>{activity.label}</Text>
                  </View>
                ))}
              </View>
              {data.client.otherActivities && (
                <Text style={styles.otherText}>+ {data.client.otherActivities}</Text>
              )}
            </View>
          )}

          {/* ============================================ */}
          {/* TRENING PREFERENCIJE */}
          {/* ============================================ */}
          {data.client.training && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trening preferencije</Text>
              {data.client.training.frequencyLabel && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Frekvencija:</Text>
                  <Text style={styles.infoValue}>{data.client.training.frequencyLabel}</Text>
                </View>
              )}
              {data.client.training.durationLabel && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Trajanje:</Text>
                  <Text style={styles.infoValue}>{data.client.training.durationLabel}</Text>
                </View>
              )}
              {data.client.training.locationLabel && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Lokacija:</Text>
                  <Text style={styles.infoValue}>{data.client.training.locationLabel}</Text>
                </View>
              )}
              {data.client.training.experienceLabel && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Iskustvo:</Text>
                  <Text style={[
                    styles.infoValue,
                    data.client.training.experience === 'beginner' && styles.experienceBeginner,
                    data.client.training.experience === 'intermediate' && styles.experienceIntermediate,
                    data.client.training.experience === 'advanced' && styles.experienceAdvanced,
                  ]}>
                    {data.client.training.experienceLabel}
                  </Text>
                </View>
              )}
              {data.client.training.equipment && data.client.training.equipment.length > 0 && (
                <>
                  <Text style={styles.subLabel}>Dostupna oprema:</Text>
                  <View style={styles.tagsContainer}>
                    {data.client.training.equipment.map((eq: any, index: number) => (
                      <View key={index} style={styles.tagEquipment}>
                        <Text style={styles.tagText}>{eq.label}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* ============================================ */}
          {/* PREHRANA */}
          {/* ============================================ */}
          {data.client.nutrition && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Prehrana</Text>
              {data.client.nutrition.dietCleanliness !== null && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Kvaliteta prehrane:</Text>
                  <Text style={[
                    styles.infoValue,
                    data.client.nutrition.dietCleanliness < 40 && styles.dietPoor,
                    data.client.nutrition.dietCleanliness >= 40 && data.client.nutrition.dietCleanliness < 70 && styles.dietAverage,
                    data.client.nutrition.dietCleanliness >= 70 && styles.dietGood,
                  ]}>
                    {data.client.nutrition.dietCleanliness}%
                  </Text>
                </View>
              )}
              {data.client.nutrition.mealFrequency && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Obroci dnevno:</Text>
                  <Text style={styles.infoValue}>{data.client.nutrition.mealFrequency}</Text>
                </View>
              )}
              {data.client.nutrition.allergies && (
                <View style={styles.allergiesBox}>
                  <Text style={styles.allergiesTitle}>Alergije / Netolerancije</Text>
                  <Text style={styles.allergiesText}>{data.client.nutrition.allergies}</Text>
                </View>
              )}
            </View>
          )}

          {/* ============================================ */}
          {/* OZLJEDE / NAPOMENE */}
          {/* ============================================ */}
          {(data.client.injuries || data.client.notes) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Zdravlje i napomene</Text>
              {data.client.injuries && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>Ozljede / Ograničenja</Text>
                  <Text style={styles.warningText}>{data.client.injuries}</Text>
                </View>
              )}
              {data.client.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesTitle}>Napomene</Text>
                  <Text style={styles.notesText}>{data.client.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* ============================================ */}
          {/* PROGRAM INFO */}
          {/* ============================================ */}
          {data.program && (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => onViewProgram?.(data.program.id, data.client?.name || 'Klijent')}
              activeOpacity={0.7}
            >
              <View style={styles.programCardHeader}>
                <Text style={styles.cardTitle}>Trenutni program</Text>
                <Text style={styles.viewProgramLink}>Pregledaj →</Text>
              </View>
              <Text style={styles.cardValue}>{data.program.name}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{data.program.status}</Text>
              </View>
              <Text style={styles.cardLabel}>
                Tjedan {data.program.currentWeek} / {data.program.totalWeeks}
              </Text>
            </TouchableOpacity>
          )}

          {/* ============================================ */}
          {/* ADHERENCE */}
          {/* ============================================ */}
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
                  <Text style={styles.sessionName}>{session.sessionName || session.name}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.date || session.started_at).toLocaleDateString('hr-HR')}
                  </Text>
                  <View
                    style={[
                      styles.sessionStatusBadge,
                      (session.status === 'completed' || session.adherence > 80) && styles.sessionStatusCompleted,
                      session.status === 'partial' && styles.sessionStatusPartial,
                      session.status === 'skipped' && styles.sessionStatusSkipped,
                    ]}
                  >
                    <Text style={styles.sessionStatusText}>
                      {session.status === 'completed' ? 'Završeno' :
                       session.status === 'partial' ? 'Djelomično' :
                       session.status === 'skipped' ? 'Preskočeno' : session.status}
                    </Text>
                  </View>
                  {session.adherence !== undefined && (
                    <Text style={styles.sessionAdherence}>
                      {session.adherence.toFixed(0)}% adherence
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Workout Logs - Detaljni pregled */}
          {data.program && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Workout Logs</Text>
                <TouchableOpacity
                  onPress={() => setShowWorkoutLogs(!showWorkoutLogs)}
                  style={styles.toggleButton}
                >
                  <Text style={styles.toggleButtonText}>
                    {showWorkoutLogs ? 'Sakrij' : 'Prikaži'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {workoutLogsLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginVertical: 20 }} />
              ) : workoutLogs.length === 0 ? (
                <Text style={styles.emptyText}>Nema workout logs</Text>
              ) : showWorkoutLogs ? (
                <>
                  {workoutLogs.map((log: any, index: number) => (
                    <View key={log.id || index} style={styles.workoutLogItem}>
                      <View style={styles.workoutLogHeader}>
                        <View>
                          <Text style={styles.workoutLogDate}>
                            {new Date(log.started_at).toLocaleDateString('hr-HR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                          <Text style={styles.workoutLogTime}>
                            {new Date(log.started_at).toLocaleTimeString('hr-HR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} - {log.duration_minutes} min
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.workoutLogStatusBadge,
                            log.status === 'completed' && styles.workoutLogStatusCompleted,
                            log.status === 'partial' && styles.workoutLogStatusPartial,
                            log.status === 'skipped' && styles.workoutLogStatusSkipped,
                          ]}
                        >
                          <Text style={styles.workoutLogStatusText}>
                            {log.status === 'completed' ? '✓' :
                             log.status === 'partial' ? '~' : '✕'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.workoutLogStats}>
                        <View style={styles.workoutLogStat}>
                          <Text style={styles.workoutLogStatValue}>
                            {log.completed_exercises}/{log.total_exercises}
                          </Text>
                          <Text style={styles.workoutLogStatLabel}>Vježbe</Text>
                        </View>
                        <View style={styles.workoutLogStat}>
                          <Text style={styles.workoutLogStatValue}>
                            {log.completed_sets}/{log.total_sets}
                          </Text>
                          <Text style={styles.workoutLogStatLabel}>Setovi</Text>
                        </View>
                        <View style={styles.workoutLogStat}>
                          <Text style={styles.workoutLogStatValue}>
                            {log.adherence_score?.toFixed(0) || 0}%
                          </Text>
                          <Text style={styles.workoutLogStatLabel}>Adherence</Text>
                        </View>
                        {log.total_volume > 0 && (
                          <View style={styles.workoutLogStat}>
                            <Text style={styles.workoutLogStatValue}>
                              {log.total_volume.toFixed(0)}kg
                            </Text>
                            <Text style={styles.workoutLogStatLabel}>Volumen</Text>
                          </View>
                        )}
                      </View>
                      
                      {log.session?.split_name && (
                        <Text style={styles.workoutLogSessionName}>
                          {log.session.split_name}
                        </Text>
                      )}
                      
                      {log.client_notes && (
                        <Text style={styles.workoutLogNotes}>
                          📝 {log.client_notes}
                        </Text>
                      )}
                    </View>
                  ))}
                  
                  {workoutLogs.length >= 10 && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => loadWorkoutLogs(data.program?.id)}
                    >
                      <Text style={styles.loadMoreButtonText}>Učitaj više</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>
                  {workoutLogs.length} workout log(s) dostupno
                </Text>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            {/* GLAVNI GUMB - Godišnji plan */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => {
                if (onAnnualPlanPress && data?.client?.name) {
                  onAnnualPlanPress(clientId, data.client.name);
                } else {
                  Alert.alert('Info', 'Godišnji plan builder dolazi uskoro');
                }
              }}
            >
              <Text style={styles.actionButtonText}>Godišnji plan</Text>
              <Text style={styles.actionButtonSub}>Posloži faze i generiraj programe</Text>
            </TouchableOpacity>
            {data.program && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRegenerateWeek}
                >
                  <Text style={styles.actionButtonText}>Regeneriraj tjedan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => handleCopyProgram(data.program.id)}
                >
                  <Text style={styles.actionButtonText}>Kopiraj program</Text>
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
              <Text style={styles.actionButtonText}>Pogledaj rezultate</Text>
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
  backText: { color: '#FFFFFF', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  placeholder: { width: 80 },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#71717A', fontSize: 16 },
  
  // Card styles
  card: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, color: '#FFFFFF', marginBottom: 12, fontWeight: '600' },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  cardLabel: { fontSize: 14, color: '#D4D4D8', marginTop: 4 },
  
  // Program card
  programCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewProgramLink: {
    fontSize: 13,
    color: '#60A5FA',
    fontWeight: '600',
  },
  
  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: { fontSize: 14, color: '#71717A' },
  infoValue: { fontSize: 14, color: '#FFF', fontWeight: '500' },
  
  // Metrics (weight, height, BMI)
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  metricUnit: { fontSize: 12, color: '#71717A', marginTop: 2 },
  metricLabel: { fontSize: 12, color: '#52525B', marginTop: 4 },
  
  // BMI colors
  bmiUnderweight: { color: '#A1A1AA' },
  bmiNormal: { color: '#3F3F46' },
  bmiOverweight: { color: '#71717A' },
  bmiObese: { color: '#F44336' },
  
  // Macros
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  macroBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  macroProtein: { backgroundColor: '#2D4A3E' },
  macroCarbs: { backgroundColor: '#4A3D2D' },
  macroFats: { backgroundColor: '#4A2D3D' },
  macroValue: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  macroLabel: { fontSize: 10, color: '#71717A', marginTop: 4 },
  calculationsExtra: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  calculationsExtraText: { fontSize: 12, color: '#52525B', textAlign: 'center' },
  
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagGoal: {
    backgroundColor: '#3D2D4A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagActivity: {
    backgroundColor: '#2D3D4A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagEquipment: {
    backgroundColor: '#3D3D3D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: { fontSize: 12, color: '#FFF' },
  otherText: { fontSize: 12, color: '#71717A', marginTop: 8, fontStyle: 'italic' },
  subLabel: { fontSize: 12, color: '#71717A', marginTop: 12, marginBottom: 4 },
  
  // Experience levels
  experienceBeginner: { color: '#3F3F46' },
  experienceIntermediate: { color: '#71717A' },
  experienceAdvanced: { color: '#F44336' },
  
  // Diet quality
  dietPoor: { color: '#F44336' },
  dietAverage: { color: '#71717A' },
  dietGood: { color: '#3F3F46' },
  
  // Allergies box
  allergiesBox: {
    backgroundColor: '#4A3D2D',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  allergiesTitle: { fontSize: 12, color: '#A1A1AA', fontWeight: '600', marginBottom: 4 },
  allergiesText: { fontSize: 14, color: '#FFF' },
  
  // Warning box (injuries)
  warningBox: {
    backgroundColor: '#4A2D2D',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningTitle: { fontSize: 12, color: '#F44336', fontWeight: '600', marginBottom: 4 },
  warningText: { fontSize: 14, color: '#FFF' },
  
  // Notes box
  notesBox: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
  },
  notesTitle: { fontSize: 12, color: '#71717A', fontWeight: '600', marginBottom: 4 },
  notesText: { fontSize: 14, color: '#D4D4D8' },
  
  // Status badge
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  
  // Adherence
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
  
  // Flagged exercises
  flaggedItem: {
    backgroundColor: '#3A2A2A',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  flaggedName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  flaggedReason: { fontSize: 12, color: '#A1A1AA', marginBottom: 4 },
  flaggedNotes: { fontSize: 12, color: '#D4D4D8' },
  
  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#27272A',
    borderRadius: 6,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Workout Logs
  workoutLogItem: {
    backgroundColor: '#27272A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  workoutLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutLogDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  workoutLogTime: {
    fontSize: 12,
    color: '#71717A',
  },
  workoutLogStatusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutLogStatusCompleted: {
    backgroundColor: '#22C55E',
  },
  workoutLogStatusPartial: {
    backgroundColor: '#F59E0B',
  },
  workoutLogStatusSkipped: {
    backgroundColor: '#DC2626',
  },
  workoutLogStatusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workoutLogStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3F3F46',
  },
  workoutLogStat: {
    alignItems: 'center',
    flex: 1,
  },
  workoutLogStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  workoutLogStatLabel: {
    fontSize: 10,
    color: '#71717A',
  },
  workoutLogSessionName: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 8,
    fontStyle: 'italic',
  },
  workoutLogNotes: {
    fontSize: 12,
    color: '#D4D4D8',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3F3F46',
  },
  loadMoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 8,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Sessions
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
  sessionStatusCompleted: { backgroundColor: '#22C55E' },
  sessionStatusPartial: { backgroundColor: '#F59E0B' },
  sessionStatusSkipped: { backgroundColor: '#DC2626' },
  sessionStatusText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  sessionAdherence: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
  },
  
  // Actions
  actionsContainer: { marginBottom: 40 },
  actionButton: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonPrimary: {
    backgroundColor: '#3F3F46',
  },
  actionButtonSecondary: {
    backgroundColor: '#27272A',
  },
  actionButtonResults: {
    backgroundColor: '#3B82F6',
    marginTop: 8,
  },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  actionButtonSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
});


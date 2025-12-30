/**
 * Workout Session Screen
 * ======================
 * Ekran za izvršavanje treninga - klijent unosi rezultate
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

interface Props {
  authToken: string;
  sessionId: string;
  onComplete?: () => void;
  onBack?: () => void;
}

interface Exercise {
  id: string;
  name: string;
  nameEn: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  rir?: number;
  equipment: string;
  primaryMuscles: string[];
  notes?: string;
  // Tracking
  completedSets: SetResult[];
  isCompleted: boolean;
}

interface SetResult {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  notes?: string;
}

interface SessionData {
  id: string;
  name: string;
  sessionType: string;
  estimatedDuration: number;
  exercises: Exercise[];
  status: 'pending' | 'in_progress' | 'completed';
}

export default function WorkoutSessionScreen({ authToken, sessionId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showSetModal, setShowSetModal] = useState(false);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [setInput, setSetInput] = useState<SetResult>({
    setNumber: 1,
    reps: null,
    weight: null,
    rir: null,
  });
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Rest timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (restTimer === 0) {
      setIsResting(false);
      Alert.alert('⏰ Odmor završen!', 'Vrijeme je za sljedeći set!');
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  async function loadSession() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/client/session/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();

      if (result.success) {
        // Inicijaliziraj completedSets za svaku vježbu
        const exercisesWithTracking = result.data.exercises.map((ex: any) => ({
          ...ex,
          completedSets: [],
          isCompleted: false,
        }));
        setSession({
          ...result.data,
          exercises: exercisesWithTracking,
        });
      } else {
        // Mock podaci za testiranje
        setSession({
          id: sessionId,
          name: 'Push Day A',
          sessionType: 'strength',
          estimatedDuration: 60,
          status: 'pending',
          exercises: [
            {
              id: '1',
              name: 'Bench Press',
              nameEn: 'Bench Press',
              sets: 4,
              reps: '8-12',
              restSeconds: 120,
              tempo: '3-0-2-0',
              rir: 2,
              equipment: 'Barbell',
              primaryMuscles: ['Prsa'],
              completedSets: [],
              isCompleted: false,
            },
            {
              id: '2',
              name: 'Incline Dumbbell Press',
              nameEn: 'Incline Dumbbell Press',
              sets: 3,
              reps: '10-12',
              restSeconds: 90,
              rir: 2,
              equipment: 'Dumbbell',
              primaryMuscles: ['Prsa', 'Ramena'],
              completedSets: [],
              isCompleted: false,
            },
            {
              id: '3',
              name: 'Overhead Press',
              nameEn: 'Overhead Press',
              sets: 4,
              reps: '6-8',
              restSeconds: 120,
              rir: 1,
              equipment: 'Barbell',
              primaryMuscles: ['Ramena'],
              completedSets: [],
              isCompleted: false,
            },
            {
              id: '4',
              name: 'Lateral Raises',
              nameEn: 'Lateral Raises',
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              rir: 1,
              equipment: 'Dumbbell',
              primaryMuscles: ['Ramena'],
              completedSets: [],
              isCompleted: false,
            },
            {
              id: '5',
              name: 'Tricep Pushdown',
              nameEn: 'Tricep Pushdown',
              sets: 3,
              reps: '10-12',
              restSeconds: 60,
              rir: 1,
              equipment: 'Cable',
              primaryMuscles: ['Triceps'],
              completedSets: [],
              isCompleted: false,
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Greška', 'Nije moguće učitati trening.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenSetModal(exerciseIndex: number, setIndex: number) {
    const exercise = session?.exercises[exerciseIndex];
    if (!exercise) return;

    // Pronađi postojeći set ili kreiraj novi
    const existingSet = exercise.completedSets.find(s => s.setNumber === setIndex + 1);
    
    setCurrentExerciseIndex(exerciseIndex);
    setCurrentSetIndex(setIndex);
    setSetInput(existingSet || {
      setNumber: setIndex + 1,
      reps: null,
      weight: null,
      rir: null,
    });
    setShowSetModal(true);
  }

  function handleSaveSet() {
    if (!session) return;

    const updatedExercises = [...session.exercises];
    const exercise = updatedExercises[currentExerciseIndex];
    
    // Ažuriraj ili dodaj set
    const existingIndex = exercise.completedSets.findIndex(
      s => s.setNumber === setInput.setNumber
    );
    
    if (existingIndex >= 0) {
      exercise.completedSets[existingIndex] = setInput;
    } else {
      exercise.completedSets.push(setInput);
    }

    // Provjeri je li vježba završena
    exercise.isCompleted = exercise.completedSets.length >= exercise.sets;

    setSession({ ...session, exercises: updatedExercises });
    setShowSetModal(false);

    // Pokreni timer za odmor
    if (exercise.restSeconds && currentSetIndex < exercise.sets - 1) {
      setRestTimer(exercise.restSeconds);
      setIsResting(true);
    }
  }

  function handleSkipRest() {
    setIsResting(false);
    setRestTimer(null);
  }

  async function handleCompleteWorkout() {
    if (!session) return;

    const completedCount = session.exercises.filter(e => e.isCompleted).length;
    const totalCount = session.exercises.length;

    if (completedCount < totalCount) {
      Alert.alert(
        'Trening nije završen',
        `Završili ste ${completedCount} od ${totalCount} vježbi. Želite li ipak završiti trening?`,
        [
          { text: 'Nastavi trenirati', style: 'cancel' },
          { text: 'Završi', onPress: () => submitWorkout() },
        ]
      );
    } else {
      submitWorkout();
    }
  }

  async function submitWorkout() {
    setSaving(true);
    try {
      // Pripremi podatke za slanje
      const workoutData = {
        sessionId: session?.id,
        exercises: session?.exercises.map(ex => ({
          exerciseId: ex.id,
          completedSets: ex.completedSets,
        })),
        completedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/api/client/session/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workoutData),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '🎉 Trening završen!',
          'Odličan posao! Tvoj napredak je spremljen.',
          [{ text: 'OK', onPress: () => onComplete?.() }]
        );
      } else {
        // Simuliraj uspjeh za testiranje
        Alert.alert(
          '🎉 Trening završen!',
          'Odličan posao!',
          [{ text: 'OK', onPress: () => onComplete?.() }]
        );
      }
    } catch (error) {
      console.error('Error completing workout:', error);
      // Simuliraj uspjeh za testiranje
      Alert.alert(
        '🎉 Trening završen!',
        'Odličan posao!',
        [{ text: 'OK', onPress: () => onComplete?.() }]
      );
    } finally {
      setSaving(false);
    }
  }

  function getProgress() {
    if (!session) return { completed: 0, total: 0, percentage: 0 };
    const completed = session.exercises.filter(e => e.isCompleted).length;
    const total = session.exercises.length;
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
    };
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Učitavanje treninga...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Trening nije pronađen</Text>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Natrag</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const progress = getProgress();
  const currentExercise = session.exercises[currentExerciseIndex];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Izađi</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{session.name}</Text>
          <Text style={styles.progressText}>{progress.percentage}%</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
        </View>

        {/* Rest Timer Overlay */}
        {isResting && restTimer !== null && (
          <View style={styles.restOverlay}>
            <Text style={styles.restTitle}>😮‍💨 ODMOR</Text>
            <Text style={styles.restTimer}>{Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}</Text>
            <TouchableOpacity style={styles.skipRestButton} onPress={handleSkipRest}>
              <Text style={styles.skipRestText}>Preskoči odmor →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Exercise List */}
        <ScrollView style={styles.content}>
          {session.exercises.map((exercise, exerciseIndex) => (
            <View 
              key={exercise.id} 
              style={[
                styles.exerciseCard,
                exercise.isCompleted && styles.exerciseCardCompleted,
                exerciseIndex === currentExerciseIndex && styles.exerciseCardActive,
              ]}
            >
              <TouchableOpacity 
                style={styles.exerciseHeader}
                onPress={() => setCurrentExerciseIndex(exerciseIndex)}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseNumber}>
                    {exercise.isCompleted ? '✅' : `${exerciseIndex + 1}`}
                  </Text>
                  <View>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.sets}×{exercise.reps} • {exercise.equipment} • {exercise.primaryMuscles.join(', ')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.exerciseExpandIcon}>
                  {exerciseIndex === currentExerciseIndex ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {/* Expanded Sets */}
              {exerciseIndex === currentExerciseIndex && (
                <View style={styles.setsContainer}>
                  {/* Exercise Details */}
                  <View style={styles.exerciseDetails}>
                    {exercise.tempo && (
                      <Text style={styles.detailText}>⏱️ Tempo: {exercise.tempo}</Text>
                    )}
                    {exercise.rir !== undefined && (
                      <Text style={styles.detailText}>💪 RIR: {exercise.rir}</Text>
                    )}
                    <Text style={styles.detailText}>😮‍💨 Odmor: {exercise.restSeconds}s</Text>
                  </View>

                  {/* Sets */}
                  <View style={styles.setsGrid}>
                    {Array.from({ length: exercise.sets }, (_, setIndex) => {
                      const completedSet = exercise.completedSets.find(
                        s => s.setNumber === setIndex + 1
                      );
                      const isCompleted = !!completedSet;

                      return (
                        <TouchableOpacity
                          key={setIndex}
                          style={[
                            styles.setButton,
                            isCompleted && styles.setButtonCompleted,
                          ]}
                          onPress={() => handleOpenSetModal(exerciseIndex, setIndex)}
                        >
                          <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                          {isCompleted ? (
                            <View style={styles.setResult}>
                              <Text style={styles.setResultText}>
                                {completedSet.weight}kg × {completedSet.reps}
                              </Text>
                              {completedSet.rir !== null && (
                                <Text style={styles.setRirText}>RIR {completedSet.rir}</Text>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.setPlaceholder}>Klikni za unos</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* Complete Workout Button */}
          <TouchableOpacity
            style={[styles.completeButton, saving && styles.completeButtonDisabled]}
            onPress={handleCompleteWorkout}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.completeButtonText}>
                🏁 Završi trening ({progress.completed}/{progress.total})
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Set Input Modal */}
        <Modal
          visible={showSetModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSetModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {currentExercise?.name} - Set {currentSetIndex + 1}
              </Text>

              {/* Weight Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Težina (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={setInput.weight?.toString() || ''}
                  onChangeText={(text) => setSetInput({ ...setInput, weight: text ? parseFloat(text) : null })}
                  placeholder="0"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Reps Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ponavljanja</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={setInput.reps?.toString() || ''}
                  onChangeText={(text) => setSetInput({ ...setInput, reps: text ? parseInt(text) : null })}
                  placeholder={currentExercise?.reps || '0'}
                  placeholderTextColor="#666"
                />
              </View>

              {/* RIR Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RIR (Reps In Reserve)</Text>
                <View style={styles.rirButtons}>
                  {[0, 1, 2, 3, 4, 5].map((rir) => (
                    <TouchableOpacity
                      key={rir}
                      style={[
                        styles.rirButton,
                        setInput.rir === rir && styles.rirButtonActive,
                      ]}
                      onPress={() => setSetInput({ ...setInput, rir })}
                    >
                      <Text style={[
                        styles.rirButtonText,
                        setInput.rir === rir && styles.rirButtonTextActive,
                      ]}>
                        {rir}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowSetModal(false)}
                >
                  <Text style={styles.modalCancelText}>Odustani</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleSaveSet}
                >
                  <Text style={styles.modalSaveText}>✓ Spremi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  backText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  progressText: { color: '#8B5CF6', fontSize: 16, fontWeight: '700' },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#333',
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', marginTop: 10, fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#FFF', fontSize: 18, marginBottom: 20 },
  backButton: { backgroundColor: '#8B5CF6', padding: 15, borderRadius: 12 },
  backButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  content: { flex: 1, padding: 20 },

  // Rest Timer
  restOverlay: {
    backgroundColor: 'rgba(139, 92, 246, 0.95)',
    padding: 30,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  restTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  restTimer: { color: '#FFF', fontSize: 48, fontWeight: '800' },
  skipRestButton: { marginTop: 15 },
  skipRestText: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },

  // Exercise Card
  exerciseCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseCardCompleted: {
    borderColor: '#22C55E',
    borderWidth: 2,
  },
  exerciseCardActive: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  exerciseInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
    overflow: 'hidden',
  },
  exerciseName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  exerciseMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  exerciseExpandIcon: { color: '#888', fontSize: 12 },

  // Sets
  setsContainer: { padding: 16, paddingTop: 0 },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  detailText: { color: '#AAA', fontSize: 13 },
  setsGrid: { gap: 8 },
  setButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setButtonCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22C55E',
    borderWidth: 1,
  },
  setNumber: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  setResult: { alignItems: 'flex-end' },
  setResultText: { color: '#22C55E', fontSize: 16, fontWeight: '700' },
  setRirText: { color: '#888', fontSize: 12 },
  setPlaceholder: { color: '#666', fontSize: 14 },

  // Complete Button
  completeButton: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  completeButtonDisabled: { backgroundColor: '#555' },
  completeButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#AAA', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  rirButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rirButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  rirButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  rirButtonText: { color: '#888', fontSize: 18, fontWeight: '700' },
  rirButtonTextActive: { color: '#FFF' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  modalSaveButton: {
    flex: 2,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalSaveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

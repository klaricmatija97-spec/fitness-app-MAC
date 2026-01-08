/**
 * TrainerWorkoutLogScreen
 * =======================
 * Ekran za trenera da evidentira trening klijenta u realnom vremenu
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { API_BASE_URL } from '../services/api';

interface Exercise {
  id: string;
  exercise_name: string;
  planned_sets: number;
  planned_reps_min: number | null;
  planned_reps_max: number | string | null;
  planned_rir: number | null;
  order_in_workout?: number; // Koristi se samo za sortiranje u UI
}

interface SetData {
  id?: string;
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
  rpe: string;
  isWarmup: boolean;
  completed: boolean;
  notes: string;
  saved: boolean;
}

interface Props {
  authToken: string;
  clientId: string;
  clientName: string;
  sessionId: string;
  sessionName: string;
  programId?: string;
  onBack: () => void;
  onComplete: () => void;
}

export default function TrainerWorkoutLogScreen({
  authToken,
  clientId,
  clientName,
  sessionId,
  sessionName,
  programId,
  onBack,
  onComplete,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<Record<string, SetData[]>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [trainerNotes, setTrainerNotes] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentExerciseIndex]);

  // Start workout
  useEffect(() => {
    startWorkout();
  }, []);

  const startWorkout = async () => {
    try {
      setLoading(true);
      
      // Debug: provjeri token
      console.log('[WorkoutLog] Starting with token:', authToken ? authToken.substring(0, 30) + '...' : 'NO TOKEN');
      console.log('[WorkoutLog] Client:', clientId, 'Session:', sessionId);
      
      if (!authToken) {
        Alert.alert('Greška', 'Nema autorizacijskog tokena. Molimo prijavite se ponovno.');
        onBack();
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/trainer/workout-log/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          sessionId,
          programId,
        }),
      });

      console.log('[WorkoutLog] Response status:', response.status);
      const result = await response.json();
      console.log('[WorkoutLog] Result:', result.success ? 'SUCCESS' : result.error);

      if (result.success) {
        setWorkoutLogId(result.data.workoutLogId);
        let receivedExercises = (result.data.exercises || []).map((ex: any, index: number) => ({
          ...ex,
          order_in_workout: index + 1, // Dodaj order za sortiranje u UI
        }));
        
        // Ako nema vježbi, dodaj placeholder vježbu za ručni unos
        if (receivedExercises.length === 0) {
          const placeholderExercise = {
            id: 'manual-1',
            exercise_name: 'Vježba 1',
            planned_sets: 3,
            planned_reps_min: null,
            planned_reps_max: 10,
            planned_rir: 2,
            order_in_workout: 1,
          };
          receivedExercises = [placeholderExercise];
        }
        
        setExercises(receivedExercises);

        // Inicijaliziraj setove za svaku vježbu
        const initialSets: Record<string, SetData[]> = {};
        for (const ex of receivedExercises) {
          initialSets[ex.id] = Array.from({ length: ex.planned_sets || 3 }, (_, i) => ({
            setNumber: i + 1,
            weight: '',
            reps: '',
            rir: ex.planned_rir?.toString() || '',
            rpe: '',
            isWarmup: false,
            completed: false,
            notes: '',
            saved: false,
          }));
        }
        setSets(initialSets);
      } else {
        Alert.alert('Greška', result.error || 'Nije moguće započeti trening');
        onBack();
      }
    } catch (error) {
      console.error('Error starting workout:', error);
      Alert.alert('Greška', 'Nije moguće povezati se sa serverom');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const saveSet = async (exerciseId: string, setIndex: number) => {
    if (!workoutLogId) return;

    const setData = sets[exerciseId]?.[setIndex];
    if (!setData) return;

    // Validacija
    if (!setData.weight || !setData.reps) {
      Alert.alert('Upozorenje', 'Unesi težinu i ponavljanja');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/trainer/workout-log/${workoutLogId}/set`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseLogId: exerciseId,
          setNumber: setData.setNumber,
          weight: parseFloat(setData.weight) || 0,
          reps: parseInt(setData.reps) || 0,
          rir: setData.rir ? parseInt(setData.rir) : null,
          rpe: setData.rpe ? parseFloat(setData.rpe) : null,
          isWarmup: setData.isWarmup,
          completed: true,
          notes: setData.notes || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Označi set kao spremljen
        setSets(prev => ({
          ...prev,
          [exerciseId]: prev[exerciseId].map((s, i) =>
            i === setIndex ? { ...s, saved: true, completed: true, id: result.data.set.id } : s
          ),
        }));
      } else {
        Alert.alert('Greška', result.error || 'Nije moguće spremiti set');
      }
    } catch (error) {
      console.error('Error saving set:', error);
      Alert.alert('Greška', 'Nije moguće spremiti set');
    } finally {
      setSaving(false);
    }
  };

  const addExercise = () => {
    const newId = `manual-${exercises.length + 1}`;
    const newExercise = {
      id: newId,
      exercise_name: `Vježba ${exercises.length + 1}`,
      planned_sets: 3,
      planned_reps_min: null,
      planned_reps_max: 10,
      planned_rir: 2,
      order_in_workout: exercises.length + 1,
    };
    setExercises(prev => [...prev, newExercise]);
    setSets(prev => ({
      ...prev,
      [newId]: Array.from({ length: 3 }, (_, i) => ({
        setNumber: i + 1,
        weight: '',
        reps: '',
        rir: '2',
        rpe: '',
        isWarmup: false,
        completed: false,
        notes: '',
        saved: false,
      })),
    }));
    // Navigiraj na novu vježbu
    setCurrentExerciseIndex(exercises.length);
  };

  const updateExerciseName = (exerciseId: string, newName: string) => {
    setExercises(prev => prev.map(ex => 
      ex.id === exerciseId ? { ...ex, exercise_name: newName } : ex
    ));
  };

  const addSet = (exerciseId: string) => {
    setSets(prev => {
      const currentSets = prev[exerciseId] || [];
      const newSetNumber = currentSets.length + 1;
      return {
        ...prev,
        [exerciseId]: [
          ...currentSets,
          {
            setNumber: newSetNumber,
            weight: currentSets[currentSets.length - 1]?.weight || '',
            reps: '',
            rir: '',
            rpe: '',
            isWarmup: false,
            completed: false,
            notes: '',
            saved: false,
          },
        ],
      };
    });
  };

  const updateSet = (exerciseId: string, setIndex: number, field: keyof SetData, value: any) => {
    setSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIndex ? { ...s, [field]: value, saved: false } : s
      ),
    }));
  };

  const completeWorkout = async () => {
    if (!workoutLogId) return;

    // Provjeri ima li nespremljenih setova
    const unsavedSets = Object.values(sets).flat().filter(s => s.weight && s.reps && !s.saved);
    if (unsavedSets.length > 0) {
      Alert.alert(
        'Nespremljeni setovi',
        `Imaš ${unsavedSets.length} nespremljenih setova. Želiš li ih spremiti?`,
        [
          { text: 'Odustani', style: 'cancel' },
          { text: 'Završi bez spremanja', onPress: () => finishWorkout() },
        ]
      );
      return;
    }

    finishWorkout();
  };

  const finishWorkout = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/trainer/workout-log/${workoutLogId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerNotes,
          status: 'completed',
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '✅ Trening završen!',
          `Trajanje: ${result.data.summary.duration}\nAdherence: ${result.data.summary.adherence}\nVolumen: ${result.data.summary.volume}`,
          [{ text: 'OK', onPress: onComplete }]
        );
      } else {
        Alert.alert('Greška', result.error || 'Nije moguće završiti trening');
      }
    } catch (error) {
      console.error('Error completing workout:', error);
      Alert.alert('Greška', 'Nije moguće završiti trening');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentExercise = exercises[currentExerciseIndex];
  const currentSets = currentExercise ? sets[currentExercise.id] || [] : [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Pokrećem trening...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.sessionName}>{sessionName}</Text>
        </View>
        <View style={styles.timer}>
          <Text style={styles.timerText}>⏱️ {formatTime(elapsedTime)}</Text>
        </View>
      </View>

      {/* Exercise Navigation */}
      <View style={styles.exerciseNav}>
        <TouchableOpacity
          style={[styles.navButton, currentExerciseIndex === 0 && styles.navButtonDisabled]}
          onPress={() => setCurrentExerciseIndex(prev => Math.max(0, prev - 1))}
          disabled={currentExerciseIndex === 0}
        >
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <View style={styles.exerciseCounterContainer}>
          <Text style={styles.exerciseCounter}>
            Vježba {currentExerciseIndex + 1} / {exercises.length}
          </Text>
          <TouchableOpacity style={styles.addExerciseButton} onPress={addExercise}>
            <Text style={styles.addExerciseButtonText}>+ Nova</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.navButton, currentExerciseIndex >= exercises.length - 1 && styles.navButtonDisabled]}
          onPress={() => setCurrentExerciseIndex(prev => Math.min(exercises.length - 1, prev + 1))}
          disabled={currentExerciseIndex >= exercises.length - 1}
        >
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Current Exercise */}
      {currentExercise && (
        <Animated.View style={[styles.exerciseContainer, { opacity: fadeAnim }]}>
          <View style={styles.exerciseHeader}>
            {/* Editabilni naziv vježbe za ručno dodane */}
            {currentExercise.id.startsWith('manual-') ? (
              <TextInput
                style={styles.exerciseNameInput}
                value={currentExercise.exercise_name}
                onChangeText={(text) => updateExerciseName(currentExercise.id, text)}
                placeholder="Naziv vježbe..."
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.exerciseName}>{currentExercise.exercise_name}</Text>
            )}
            <Text style={styles.plannedInfo}>
              Plan: {currentExercise.planned_sets} × {currentExercise.planned_reps_min || '?'}-{currentExercise.planned_reps_max || '?'}
              {currentExercise.planned_rir !== null && ` @ RIR ${currentExercise.planned_rir}`}
            </Text>
          </View>

          <ScrollView style={styles.setsContainer} showsVerticalScrollIndicator={false}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.setColumn]}>Set</Text>
              <Text style={[styles.tableHeaderCell, styles.weightColumn]}>Kg</Text>
              <Text style={[styles.tableHeaderCell, styles.repsColumn]}>Pon.</Text>
              <Text style={[styles.tableHeaderCell, styles.rirColumn]}>RIR</Text>
              <Text style={[styles.tableHeaderCell, styles.actionColumn]}></Text>
            </View>

            {/* Sets */}
            {currentSets.map((set, index) => (
              <View key={index} style={[styles.setRow, set.saved && styles.setRowSaved]}>
                <View style={[styles.setCell, styles.setColumn]}>
                  <Text style={styles.setNumber}>{set.setNumber}</Text>
                  {set.isWarmup && <Text style={styles.warmupBadge}>W</Text>}
                </View>

                <View style={[styles.setCell, styles.weightColumn]}>
                  <TextInput
                    style={[styles.input, set.saved && styles.inputSaved]}
                    value={set.weight}
                    onChangeText={(v) => updateSet(currentExercise.id, index, 'weight', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#666"
                    editable={!set.saved}
                  />
                </View>

                <View style={[styles.setCell, styles.repsColumn]}>
                  <TextInput
                    style={[styles.input, set.saved && styles.inputSaved]}
                    value={set.reps}
                    onChangeText={(v) => updateSet(currentExercise.id, index, 'reps', v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#666"
                    editable={!set.saved}
                  />
                </View>

                <View style={[styles.setCell, styles.rirColumn]}>
                  <TextInput
                    style={[styles.input, set.saved && styles.inputSaved]}
                    value={set.rir}
                    onChangeText={(v) => updateSet(currentExercise.id, index, 'rir', v)}
                    keyboardType="number-pad"
                    placeholder="-"
                    placeholderTextColor="#666"
                    editable={!set.saved}
                  />
                </View>

                <View style={[styles.setCell, styles.actionColumn]}>
                  {set.saved ? (
                    <Text style={styles.savedIcon}>✓</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => saveSet(currentExercise.id, index)}
                      disabled={saving}
                    >
                      <Text style={styles.saveButtonText}>💾</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {/* Add Set Button */}
            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => addSet(currentExercise.id)}
            >
              <Text style={styles.addSetButtonText}>+ Dodaj set</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TextInput
          style={styles.notesInput}
          value={trainerNotes}
          onChangeText={setTrainerNotes}
          placeholder="Napomene trenera..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity
          style={[styles.completeButton, saving && styles.completeButtonDisabled]}
          onPress={completeWorkout}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.completeButtonText}>✅ Završi trening</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sessionName: {
    color: '#888888',
    fontSize: 14,
    marginTop: 2,
  },
  timer: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timerText: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Exercise Navigation
  exerciseNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0A0A0A',
  },
  navButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1E1E1E',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  exerciseCounter: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },

  // Exercise Container
  exerciseContainer: {
    flex: 1,
    padding: 16,
  },
  exerciseHeader: {
    marginBottom: 16,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  exerciseNameInput: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 4,
  },
  exerciseCounterContainer: {
    alignItems: 'center',
  },
  addExerciseButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  addExerciseButtonText: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: '600',
  },
  plannedInfo: {
    color: '#888888',
    fontSize: 14,
    marginTop: 4,
  },

  // Sets Table
  setsContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    marginBottom: 8,
  },
  tableHeaderCell: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  setColumn: { width: 50, textAlign: 'center' },
  weightColumn: { flex: 1, textAlign: 'center' },
  repsColumn: { flex: 1, textAlign: 'center' },
  rirColumn: { width: 60, textAlign: 'center' },
  actionColumn: { width: 50, textAlign: 'center' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 8,
    paddingVertical: 8,
  },
  setRowSaved: {
    backgroundColor: '#0D2818',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  setCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warmupBadge: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  input: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 60,
  },
  inputSaved: {
    backgroundColor: '#1A3A25',
    color: '#00FF88',
  },

  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 20,
  },
  savedIcon: {
    color: '#00FF88',
    fontSize: 20,
    fontWeight: '700',
  },

  addSetButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333333',
    borderStyle: 'dashed',
  },
  addSetButtonText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    padding: 16,
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  notesInput: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    minHeight: 50,
  },
  completeButton: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});


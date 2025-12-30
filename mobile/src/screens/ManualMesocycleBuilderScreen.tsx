/**
 * Manual Mesocycle Builder Screen
 * ================================
 * 
 * Omogućava treneru da ručno kreira mezociklus:
 * 1. Naziv mezociklusa
 * 2. Broj tjedana
 * 3. Treninga po tjednu
 * 4. Odabir vježbi iz library-a
 * 
 * Auto mezociklusi su READ ONLY i jasno označeni kao "AI Generated"
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================
// TIPOVI
// ============================================

interface Exercise {
  id: string;
  name: string;
  name_hr?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string;
  level?: string;
  mechanic?: string;
}

interface SelectedExercise extends Exercise {
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  rpe?: number;
  rir?: number;
  orderIndex: number;
}

interface Session {
  id: string;
  weekNumber: number;
  dayOfWeek: number;
  name: string;
  exercises: SelectedExercise[];
}

interface MesocycleForm {
  programId: string;
  name: string;
  type: 'volume' | 'intensity' | 'peak' | 'deload';
  weekStart: number;
  weekEnd: number;
  sessions: Session[];
}

// ============================================
// API FUNKCIJE
// ============================================

import { API_BASE_URL } from '../services/api';

async function fetchExercises(filters?: {
  equipment?: string;
  muscleGroup?: string;
  level?: string;
  search?: string;
}): Promise<Exercise[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.equipment) params.append('equipment', filters.equipment);
    if (filters?.muscleGroup) params.append('muscleGroup', filters.muscleGroup);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.search) params.append('search', filters.search);
    
    const response = await fetch(`${API_BASE_URL}/api/training/exercises?${params.toString()}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data.exercises || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }
}

async function createMesocycle(form: MesocycleForm): Promise<{ success: boolean; mesocycleId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/manual/mesocycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programId: form.programId,
        naziv: form.name,
        tip: form.type,
        tjedanOd: form.weekStart,
        tjedanDo: form.weekEnd,
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
  }
}

async function createSession(
  programId: string,
  mesocycleId: string,
  weekNumber: number,
  dayOfWeek: number,
  name: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/manual/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programId,
        mesocycleId,
        tjedanBroj: weekNumber,
        danUTjednu: dayOfWeek,
        redniBrojUTjednu: dayOfWeek,
        naziv: name,
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
  }
}

async function addExercise(
  sessionId: string,
  exercise: SelectedExercise
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/manual/exercise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        exerciseId: exercise.id,
        nazivHr: exercise.name_hr || exercise.name,
        nazivEn: exercise.name,
        redniBroj: exercise.orderIndex,
        setovi: exercise.sets,
        ponavljanja: exercise.reps,
        odmorSekunde: exercise.restSeconds,
        tempo: exercise.tempo,
        rpe: exercise.rpe,
        rir: exercise.rir,
        primarniMisici: exercise.primaryMuscles || [],
        sekundarniMisici: exercise.secondaryMuscles || [],
        oprema: exercise.equipment,
        mehanika: exercise.mechanic === 'compound' ? 'compound' : 'isolation',
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
  }
}

// ============================================
// KOMPONENTA
// ============================================

interface Props {
  programId: string;
  onComplete?: (mesocycleId: string) => void;
  onCancel?: () => void;
}

export default function ManualMesocycleBuilderScreen({ programId, onComplete, onCancel }: Props) {
  // ============================================
  // STATE
  // ============================================
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'volume' | 'intensity' | 'peak' | 'deload'>('volume');
  const [weeksCount, setWeeksCount] = useState(4);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(4);
  const [weekStart, setWeekStart] = useState(1);
  
  // Exercise selection
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  
  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  
  // ============================================
  // EFFECTS
  // ============================================
  
  useEffect(() => {
    loadExercises();
  }, []);
  
  useEffect(() => {
    filterExercises();
  }, [exercises, searchQuery, selectedMuscleGroup, selectedEquipment]);
  
  useEffect(() => {
    if (step === 3) {
      initializeSessions();
    }
  }, [step, weeksCount, sessionsPerWeek]);
  
  // ============================================
  // FUNKCIJE
  // ============================================
  
  async function loadExercises() {
    setLoading(true);
    const data = await fetchExercises();
    setExercises(data);
    setFilteredExercises(data);
    setLoading(false);
  }
  
  function filterExercises() {
    let filtered = [...exercises];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex => 
        ex.name?.toLowerCase().includes(query) ||
        ex.name_hr?.toLowerCase().includes(query)
      );
    }
    
    if (selectedMuscleGroup) {
      filtered = filtered.filter(ex =>
        ex.primaryMuscles?.some(m => m.toLowerCase().includes(selectedMuscleGroup.toLowerCase())) ||
        ex.secondaryMuscles?.some(m => m.toLowerCase().includes(selectedMuscleGroup.toLowerCase()))
      );
    }
    
    if (selectedEquipment) {
      filtered = filtered.filter(ex =>
        ex.equipment?.toLowerCase().includes(selectedEquipment.toLowerCase())
      );
    }
    
    setFilteredExercises(filtered);
  }
  
  function initializeSessions() {
    const newSessions: Session[] = [];
    let sessionCounter = 1;
    
    for (let week = 1; week <= weeksCount; week++) {
      for (let day = 1; day <= sessionsPerWeek; day++) {
        newSessions.push({
          id: `session-${sessionCounter}`,
          weekNumber: weekStart + week - 1,
          dayOfWeek: day,
          name: `Trening ${day}`,
          exercises: [],
        });
        sessionCounter++;
      }
    }
    
    setSessions(newSessions);
  }
  
  function openExerciseModal(session: Session) {
    setCurrentSession(session);
    setShowExerciseModal(true);
  }
  
  function addExerciseToSession(exercise: Exercise) {
    if (!currentSession) return;
    
    const selectedExercise: SelectedExercise = {
      ...exercise,
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      orderIndex: currentSession.exercises.length + 1,
    };
    
    const updatedSessions = sessions.map(s =>
      s.id === currentSession.id
        ? { ...s, exercises: [...s.exercises, selectedExercise] }
        : s
    );
    
    setSessions(updatedSessions);
    setShowExerciseModal(false);
    setCurrentSession(null);
  }
  
  function removeExerciseFromSession(sessionId: string, exerciseIndex: number) {
    const updatedSessions = sessions.map(s =>
      s.id === sessionId
        ? { ...s, exercises: s.exercises.filter((_, i) => i !== exerciseIndex) }
        : s
    );
    setSessions(updatedSessions);
  }
  
  async function saveMesocycle() {
    if (!name.trim()) {
      Alert.alert('Greška', 'Unesite naziv mezociklusa');
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. Kreiraj mezociklus
      const mesoResult = await createMesocycle({
        programId,
        name,
        type,
        weekStart,
        weekEnd: weekStart + weeksCount - 1,
        sessions: [],
      });
      
      if (!mesoResult.success || !mesoResult.mesocycleId) {
        Alert.alert('Greška', mesoResult.error || 'Neuspješno kreiranje mezociklusa');
        setLoading(false);
        return;
      }
      
      // 2. Kreiraj sesije i dodaj vježbe
      for (const session of sessions) {
        const sessionResult = await createSession(
          programId,
          mesoResult.mesocycleId,
          session.weekNumber,
          session.dayOfWeek,
          session.name
        );
        
        if (!sessionResult.success || !sessionResult.sessionId) {
          console.error(`Greška pri kreiranju sesije ${session.id}:`, sessionResult.error);
          continue;
        }
        
        // Dodaj vježbe u sesiju
        for (const exercise of session.exercises) {
          await addExercise(sessionResult.sessionId, exercise);
        }
      }
      
      Alert.alert('Uspjeh', 'Mezociklus uspješno kreiran!', [
        { text: 'OK', onPress: () => onComplete?.(mesoResult.mesocycleId!) },
      ]);
      
    } catch (error) {
      Alert.alert('Greška', error instanceof Error ? error.message : 'Nepoznata greška');
    } finally {
      setLoading(false);
    }
  }
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Odustani</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Ručni Mezociklus</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.progressStep,
                step >= s && styles.progressStepActive,
              ]}
            />
          ))}
        </View>
        
        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>1. Osnovne informacije</Text>
              
              <Text style={styles.label}>Naziv mezociklusa</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="npr. Akumulacija - Visok volumen"
                placeholderTextColor="#666"
              />
              
              <Text style={styles.label}>Tip mezociklusa</Text>
              <View style={styles.typeContainer}>
                {(['volume', 'intensity', 'peak', 'deload'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeButton, type === t && styles.typeButtonActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                      {t === 'volume' ? 'Volumen' : t === 'intensity' ? 'Intenzitet' : t === 'peak' ? 'Peak' : 'Deload'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.label}>Broj tjedana</Text>
              <View style={styles.numberContainer}>
                {[2, 3, 4, 5, 6].map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.numberButton, weeksCount === w && styles.numberButtonActive]}
                    onPress={() => setWeeksCount(w)}
                  >
                    <Text style={[styles.numberText, weeksCount === w && styles.numberTextActive]}>
                      {w}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.label}>Treninga po tjednu</Text>
              <View style={styles.numberContainer}>
                {[3, 4, 5, 6].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.numberButton, sessionsPerWeek === s && styles.numberButtonActive]}
                    onPress={() => setSessionsPerWeek(s)}
                  >
                    <Text style={[styles.numberText, sessionsPerWeek === s && styles.numberTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setStep(2)}
                disabled={!name.trim()}
              >
                <Text style={styles.nextButtonText}>Dalje</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>2. Pregled sesija</Text>
              <Text style={styles.stepDescription}>
                {sessions.length} sesija kreirano. Kliknite na sesiju da dodate vježbe.
              </Text>
              
              <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.sessionCard}
                    onPress={() => {
                      setCurrentSession(item);
                      setStep(3);
                    }}
                  >
                    <Text style={styles.sessionName}>
                      Tjedan {item.weekNumber} - {item.name}
                    </Text>
                    <Text style={styles.sessionExercises}>
                      {item.exercises.length} vježbi
                    </Text>
                  </TouchableOpacity>
                )}
              />
              
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setStep(4)}
              >
                <Text style={styles.nextButtonText}>Spremi mezociklus</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {step === 3 && currentSession && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>
                3. Vježbe - {currentSession.name} (Tjedan {currentSession.weekNumber})
              </Text>
              
              {/* Search */}
              <TextInput
                style={styles.input}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Pretraži vježbe..."
                placeholderTextColor="#666"
              />
              
              {/* Exercise List */}
              {loading ? (
                <ActivityIndicator size="large" color="#8B5CF6" />
              ) : (
                <FlatList
                  data={filteredExercises.slice(0, 50)}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.exerciseCard}
                      onPress={() => addExerciseToSession(item)}
                    >
                      <Text style={styles.exerciseName}>
                        {item.name_hr || item.name}
                      </Text>
                      <Text style={styles.exerciseDetails}>
                        {item.primaryMuscles?.join(', ')} • {item.equipment}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
              
              {/* Selected Exercises */}
              <Text style={styles.label}>Odabrane vježbe ({currentSession.exercises.length})</Text>
              {currentSession.exercises.map((ex, index) => (
                <View key={index} style={styles.selectedExerciseCard}>
                  <Text style={styles.selectedExerciseName}>{ex.name_hr || ex.name}</Text>
                  <Text style={styles.selectedExerciseDetails}>
                    {ex.sets} × {ex.reps} • {ex.restSeconds}s odmor
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeExerciseFromSession(currentSession.id, index)}
                  >
                    <Text style={styles.removeButtonText}>Ukloni</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setCurrentSession(null);
                  setStep(2);
                }}
              >
                <Text style={styles.backButtonText}>Natrag</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>4. Sažetak</Text>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Naziv:</Text>
                <Text style={styles.summaryValue}>{name}</Text>
                
                <Text style={styles.summaryLabel}>Tip:</Text>
                <Text style={styles.summaryValue}>{type}</Text>
                
                <Text style={styles.summaryLabel}>Trajanje:</Text>
                <Text style={styles.summaryValue}>{weeksCount} tjedana</Text>
                
                <Text style={styles.summaryLabel}>Sesije:</Text>
                <Text style={styles.summaryValue}>
                  {sessions.length} sesija ({sessionsPerWeek} po tjednu)
                </Text>
                
                <Text style={styles.summaryLabel}>Ukupno vježbi:</Text>
                <Text style={styles.summaryValue}>
                  {sessions.reduce((sum, s) => sum + s.exercises.length, 0)}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveMesocycle}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Spremi mezociklus</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
      
      {/* Exercise Selection Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Odaberi vježbu</Text>
            <FlatList
              data={filteredExercises.slice(0, 100)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseCard}
                  onPress={() => {
                    addExerciseToSession(item);
                    setShowExerciseModal(false);
                  }}
                >
                  <Text style={styles.exerciseName}>
                    {item.name_hr || item.name}
                  </Text>
                  <Text style={styles.exerciseDetails}>
                    {item.primaryMuscles?.join(', ')} • {item.equipment}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowExerciseModal(false)}
            >
              <Text style={styles.modalCloseText}>Zatvori</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#8B5CF6',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 80,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  progressStep: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#8B5CF6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333',
  },
  typeButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  typeText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#FFF',
  },
  numberContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  numberButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  numberText: {
    color: '#999',
    fontSize: 18,
    fontWeight: 'bold',
  },
  numberTextActive: {
    color: '#FFF',
  },
  sessionCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  sessionExercises: {
    fontSize: 14,
    color: '#999',
  },
  exerciseCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#999',
  },
  selectedExerciseCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  selectedExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  selectedExerciseDetails: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF4444',
  },
  removeButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  nextButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


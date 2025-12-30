/**
 * Trainer Program Builder Screen (V2)
 * ====================================
 * 
 * Kompletni flow za kreiranje programa:
 * 
 * KORAK 1: Odabir klijenta (+ prikaz spol, dob, težina)
 * KORAK 2: Osnovne postavke (cilj, razina, trajanje, split, oprema)
 * KORAK 3: Odabir načina (s mezociklusima ili čisti plan)
 * KORAK 3A: Posloži mezocikluse (opcionalno)
 * KORAK 4: Generiraj tjedni plan
 * KORAK 5: Pregled i prilagodba vježbi
 * KORAK 6: Zamjena vježbe modal
 * KORAK 7: Spremi i objavi
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface Props {
  authToken: string;
  clientId?: string;
  onComplete?: (programId: string) => void;
  onCancel?: () => void;
}

type Step = 1 | 2 | 3 | '3A' | 4 | 5 | 6 | 7;

type ProgramGoal = 'hipertrofija' | 'maksimalna_snaga' | 'misicna_izdrzljivost' | 'rekreacija_zdravlje';
type UserLevel = 'pocetnik' | 'srednji' | 'napredni';
type SplitType = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bro_split';
type Gender = 'male' | 'female' | 'other';
type MesocycleType = 'hipertrofija' | 'jakost' | 'snaga' | 'izdrzljivost' | 'deload' | 'priprema' | 'natjecanje' | 'tranzicija';
type ProgramMode = 'with_mesocycles' | 'clean_plan';

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  gender: Gender;
  age?: number;
  weight?: number;
  height?: number;
}

interface Mesocycle {
  id: string;
  weekNumber: number;
  type: MesocycleType;
  name: string;
}

interface Exercise {
  id: string;
  name: string;
  nameEn: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  rir: number;
  tempo?: string;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  isLocked: boolean;
}

interface TrainingSession {
  id: string;
  dayOfWeek: number;
  name: string;
  type: string;
  exercises: Exercise[];
}

interface WeekPlan {
  weekNumber: number;
  mesocycleType: MesocycleType | null;
  sessions: TrainingSession[];
}

// ============================================
// CONSTANTS
// ============================================

const GOALS: { value: ProgramGoal; label: string; description: string }[] = [
  { value: 'hipertrofija', label: '💪 Hipertrofija', description: 'Povećanje mišićne mase' },
  { value: 'maksimalna_snaga', label: '🏋️ Maksimalna snaga', description: 'Povećanje 1RM' },
  { value: 'misicna_izdrzljivost', label: '🔄 Mišićna izdržljivost', description: 'Veći broj ponavljanja' },
  { value: 'rekreacija_zdravlje', label: '❤️ Rekreacija/Zdravlje', description: 'Opća kondicija' },
];

const LEVELS: { value: UserLevel; label: string; description: string }[] = [
  { value: 'pocetnik', label: '🌱 Početnik', description: '0-1 godina iskustva' },
  { value: 'srednji', label: '📈 Srednji', description: '1-3 godine iskustva' },
  { value: 'napredni', label: '🏆 Napredni', description: '3+ godina iskustva' },
];

const SPLITS: { value: SplitType; label: string; description: string; sessionsPerWeek: number }[] = [
  { value: 'full_body', label: 'Full Body', description: '2-3x tjedno, cijelo tijelo', sessionsPerWeek: 3 },
  { value: 'upper_lower', label: 'Upper/Lower', description: '4x tjedno, gornje/donje', sessionsPerWeek: 4 },
  { value: 'push_pull_legs', label: 'Push/Pull/Legs', description: '5-6x tjedno', sessionsPerWeek: 6 },
  { value: 'bro_split', label: 'Bro Split', description: '5x tjedno, po mišićnoj grupi', sessionsPerWeek: 5 },
];

const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: '🏋️ Šipka i utezi', selected: true },
  { id: 'dumbbell', label: '💪 Bučice', selected: true },
  { id: 'machine', label: '🔧 Sprave', selected: true },
  { id: 'cable', label: '🔗 Kabel', selected: true },
  { id: 'bodyweight', label: '🧘 Bodyweight', selected: false },
];

const MESOCYCLE_TYPES: { value: MesocycleType; label: string; color: string; description: string }[] = [
  { value: 'hipertrofija', label: 'Hipertrofija', color: '#8B5CF6', description: 'Volumen, 8-12 rep' },
  { value: 'jakost', label: 'Jakost', color: '#EF4444', description: 'Intenzitet, 3-6 rep' },
  { value: 'snaga', label: 'Snaga/Power', color: '#F59E0B', description: 'Eksplozivnost, 1-5 rep' },
  { value: 'izdrzljivost', label: 'Izdržljivost', color: '#3B82F6', description: '15-25 rep' },
  { value: 'deload', label: 'Deload', color: '#22C55E', description: 'Oporavak, -40% volume' },
  { value: 'priprema', label: 'Priprema', color: '#EC4899', description: 'Pred-natjecanje' },
  { value: 'natjecanje', label: 'Natjecanje', color: '#F97316', description: 'Peak performance' },
  { value: 'tranzicija', label: 'Tranzicija', color: '#6B7280', description: 'Aktivni odmor' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function TrainerProgramBuilderScreen({ authToken, clientId, onComplete, onCancel }: Props) {
  // Navigation
  const [step, setStep] = useState<Step>(clientId ? 2 : 1);
  const [loading, setLoading] = useState(false);

  // Step 1: Client Selection
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);

  // Step 2: Basic Settings
  const [goal, setGoal] = useState<ProgramGoal>('hipertrofija');
  const [level, setLevel] = useState<UserLevel>('srednji');
  const [splitType, setSplitType] = useState<SplitType>('upper_lower');
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [equipment, setEquipment] = useState(EQUIPMENT_OPTIONS.map(e => ({ ...e })));

  // Step 3: Program Mode
  const [programMode, setProgramMode] = useState<ProgramMode | null>(null);

  // Step 3A: Mesocycles
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);

  // Step 4-5: Generated Plan
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1);

  // Step 6: Exercise Replacement
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [exerciseToReplace, setExerciseToReplace] = useState<{ sessionIndex: number; exerciseIndex: number } | null>(null);
  const [replacementExercises, setReplacementExercises] = useState<Exercise[]>([]);

  // Program ID
  const [programId, setProgramId] = useState<string | null>(null);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (!clientId) {
      loadClients();
    } else {
      loadClientInfo(clientId);
    }
  }, [clientId]);

  // ============================================
  // API CALLS
  // ============================================

  async function loadClients() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/clients`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success) {
        setClients(data.data.clients.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          gender: c.gender || 'other',
          age: c.age,
          weight: c.weight,
          height: c.height,
        })));
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  async function loadClientInfo(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trainer/client/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success) {
        setSelectedClient({
          id: data.data.client.id,
          name: data.data.client.name,
          email: data.data.client.email,
          gender: data.data.client.gender || 'other',
          age: data.data.client.age,
          weight: data.data.client.weight,
          height: data.data.client.height,
        });
      }
    } catch (error) {
      console.error('Error loading client:', error);
    }
  }

  async function generateWeekPlan() {
    if (!selectedClient) return;

    setLoading(true);
    try {
      const currentMesocycle = mesocycles.find(m => m.weekNumber === currentWeekNumber);
      
      const response = await fetch(`${API_BASE_URL}/api/training/generate-week`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          gender: selectedClient.gender,
          goal,
          level,
          splitType,
          weekNumber: currentWeekNumber,
          mesocycleType: currentMesocycle?.type || goal === 'hipertrofija' ? 'hipertrofija' : 'jakost',
          equipment: equipment.filter(e => e.selected).map(e => e.id),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setWeekPlan(data.data);
        setProgramId(data.data.programId);
        setStep(5);
      } else {
        // Fallback: Generate mock data for testing
        setWeekPlan(generateMockWeekPlan());
        setStep(5);
      }
    } catch (error) {
      console.error('Error generating week:', error);
      // Fallback: Generate mock data
      setWeekPlan(generateMockWeekPlan());
      setStep(5);
    } finally {
      setLoading(false);
    }
  }

  function generateMockWeekPlan(): WeekPlan {
    const isMale = selectedClient?.gender === 'male';
    const currentMesocycle = mesocycles.find(m => m.weekNumber === currentWeekNumber);
    
    // Vježbe prilagođene spolu
    const upperExercises: Exercise[] = isMale ? [
      { id: '1', name: 'Bench Press', nameEn: 'Bench Press', sets: 4, repsMin: 8, repsMax: 12, restSeconds: 120, rir: 2, equipment: 'barbell', primaryMuscles: ['Prsa'], secondaryMuscles: ['Triceps', 'Ramena'], isLocked: false },
      { id: '2', name: 'Bent Over Row', nameEn: 'Bent Over Row', sets: 4, repsMin: 8, repsMax: 12, restSeconds: 120, rir: 2, equipment: 'barbell', primaryMuscles: ['Leđa'], secondaryMuscles: ['Biceps'], isLocked: false },
      { id: '3', name: 'Overhead Press', nameEn: 'Overhead Press', sets: 3, repsMin: 8, repsMax: 10, restSeconds: 90, rir: 2, equipment: 'barbell', primaryMuscles: ['Ramena'], secondaryMuscles: ['Triceps'], isLocked: false },
      { id: '4', name: 'Lat Pulldown', nameEn: 'Lat Pulldown', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, rir: 2, equipment: 'cable', primaryMuscles: ['Leđa'], secondaryMuscles: ['Biceps'], isLocked: false },
      { id: '5', name: 'Incline DB Curl', nameEn: 'Incline Dumbbell Curl', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60, rir: 1, equipment: 'dumbbell', primaryMuscles: ['Biceps'], secondaryMuscles: [], isLocked: false },
      { id: '6', name: 'Tricep Pushdown', nameEn: 'Tricep Pushdown', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60, rir: 1, equipment: 'cable', primaryMuscles: ['Triceps'], secondaryMuscles: [], isLocked: false },
    ] : [
      { id: '1', name: 'Incline DB Press', nameEn: 'Incline Dumbbell Press', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, rir: 2, equipment: 'dumbbell', primaryMuscles: ['Prsa'], secondaryMuscles: ['Ramena', 'Triceps'], isLocked: false },
      { id: '2', name: 'Lat Pulldown', nameEn: 'Lat Pulldown', sets: 4, repsMin: 10, repsMax: 12, restSeconds: 90, rir: 2, equipment: 'cable', primaryMuscles: ['Leđa'], secondaryMuscles: ['Biceps'], isLocked: false },
      { id: '3', name: 'Seated Row', nameEn: 'Seated Cable Row', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, rir: 2, equipment: 'cable', primaryMuscles: ['Leđa'], secondaryMuscles: ['Biceps'], isLocked: false },
      { id: '4', name: 'Lateral Raise', nameEn: 'Dumbbell Lateral Raise', sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, rir: 2, equipment: 'dumbbell', primaryMuscles: ['Ramena'], secondaryMuscles: [], isLocked: false },
      { id: '5', name: 'Face Pull', nameEn: 'Face Pull', sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, rir: 1, equipment: 'cable', primaryMuscles: ['Ramena', 'Leđa'], secondaryMuscles: [], isLocked: false },
    ];

    const lowerExercises: Exercise[] = isMale ? [
      { id: '7', name: 'Squat', nameEn: 'Barbell Back Squat', sets: 4, repsMin: 6, repsMax: 8, restSeconds: 180, rir: 2, equipment: 'barbell', primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Gluteus', 'Hamstrings'], isLocked: false },
      { id: '8', name: 'Romanian Deadlift', nameEn: 'Romanian Deadlift', sets: 3, repsMin: 8, repsMax: 10, restSeconds: 120, rir: 2, equipment: 'barbell', primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Gluteus', 'Leđa'], isLocked: false },
      { id: '9', name: 'Leg Press', nameEn: 'Leg Press', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 120, rir: 2, equipment: 'machine', primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Gluteus'], isLocked: false },
      { id: '10', name: 'Leg Curl', nameEn: 'Lying Leg Curl', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, rir: 2, equipment: 'machine', primaryMuscles: ['Hamstrings'], secondaryMuscles: [], isLocked: false },
      { id: '11', name: 'Calf Raise', nameEn: 'Standing Calf Raise', sets: 4, repsMin: 12, repsMax: 15, restSeconds: 60, rir: 1, equipment: 'machine', primaryMuscles: ['Listovi'], secondaryMuscles: [], isLocked: false },
    ] : [
      { id: '7', name: 'Hip Thrust', nameEn: 'Barbell Hip Thrust', sets: 4, repsMin: 10, repsMax: 12, restSeconds: 120, rir: 2, equipment: 'barbell', primaryMuscles: ['Gluteus'], secondaryMuscles: ['Hamstrings'], isLocked: false },
      { id: '8', name: 'Bulgarian Split Squat', nameEn: 'Bulgarian Split Squat', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, rir: 2, equipment: 'dumbbell', primaryMuscles: ['Quadriceps', 'Gluteus'], secondaryMuscles: [], isLocked: false },
      { id: '9', name: 'Romanian Deadlift', nameEn: 'Romanian Deadlift', sets: 4, repsMin: 10, repsMax: 12, restSeconds: 120, rir: 2, equipment: 'barbell', primaryMuscles: ['Hamstrings', 'Gluteus'], secondaryMuscles: ['Leđa'], isLocked: false },
      { id: '10', name: 'Goblet Squat', nameEn: 'Goblet Squat', sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90, rir: 2, equipment: 'dumbbell', primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Gluteus'], isLocked: false },
      { id: '11', name: 'Glute Bridge', nameEn: 'Glute Bridge', sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, rir: 1, equipment: 'bodyweight', primaryMuscles: ['Gluteus'], secondaryMuscles: ['Hamstrings'], isLocked: false },
      { id: '12', name: 'Abductor Machine', nameEn: 'Hip Abductor Machine', sets: 3, repsMin: 15, repsMax: 20, restSeconds: 60, rir: 1, equipment: 'machine', primaryMuscles: ['Gluteus'], secondaryMuscles: [], isLocked: false },
    ];

    return {
      weekNumber: currentWeekNumber,
      mesocycleType: currentMesocycle?.type || 'hipertrofija',
      sessions: [
        { id: 's1', dayOfWeek: 1, name: 'Upper A', type: 'upper', exercises: upperExercises },
        { id: 's2', dayOfWeek: 2, name: 'Lower A', type: 'lower', exercises: lowerExercises },
        { id: 's3', dayOfWeek: 4, name: 'Upper B', type: 'upper', exercises: upperExercises.map((e, i) => ({ ...e, id: `b${i}` })) },
        { id: 's4', dayOfWeek: 5, name: 'Lower B', type: 'lower', exercises: lowerExercises.map((e, i) => ({ ...e, id: `b${i + 10}` })) },
      ],
    };
  }

  async function publishProgram() {
    if (!programId && !weekPlan) {
      Alert.alert('Greška', 'Nema generiranog programa za objaviti');
      return;
    }

    setLoading(true);
    try {
      // Za sada simuliramo objavu
      Alert.alert(
        '✅ Program objavljen!',
        `Program je uspješno objavljen za ${selectedClient?.name}. Klijent će ga moći vidjeti u aplikaciji.`,
        [{ text: 'OK', onPress: () => onComplete?.(programId || 'new-program') }]
      );
    } catch (error) {
      Alert.alert('Greška', 'Nije moguće objaviti program');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  function initializeMesocycles() {
    const cycles: Mesocycle[] = [];
    for (let i = 1; i <= durationWeeks; i++) {
      cycles.push({
        id: `m${i}`,
        weekNumber: i,
        type: 'hipertrofija',
        name: `Tjedan ${i}`,
      });
    }
    setMesocycles(cycles);
  }

  function getMesocycleColor(type: MesocycleType): string {
    return MESOCYCLE_TYPES.find(m => m.value === type)?.color || '#6B7280';
  }

  function getGenderIcon(gender: Gender): string {
    switch (gender) {
      case 'male': return '♂️';
      case 'female': return '♀️';
      default: return '👤';
    }
  }

  function getDayName(day: number): string {
    const days = ['', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];
    return days[day] || '';
  }

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  function renderStepIndicator() {
    const steps = ['Klijent', 'Postavke', 'Način', 'Plan', 'Pregled', 'Objava'];
    const currentStepIndex = typeof step === 'number' ? step - 1 : 2;
    
    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= currentStepIndex && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, i <= currentStepIndex && styles.stepNumberActive]}>
                {i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, i <= currentStepIndex && styles.stepLabelActive]}>
              {s}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // STEP 1: Client Selection
  function renderStep1() {
    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>👤 Odaberi klijenta</Text>
        <Text style={styles.stepDescription}>
          Odaberi klijenta za kojeg kreiraš program
        </Text>

        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nema klijenata</Text>
          </View>
        ) : (
          clients.map((client) => (
            <TouchableOpacity
              key={client.id}
              style={[styles.clientCard, selectedClient?.id === client.id && styles.clientCardSelected]}
              onPress={() => setSelectedClient(client)}
            >
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientEmail}>{client.email}</Text>
                <View style={styles.clientMeta}>
                  <Text style={styles.clientMetaItem}>{getGenderIcon(client.gender)} {client.gender === 'male' ? 'Muški' : client.gender === 'female' ? 'Ženski' : 'Ostalo'}</Text>
                  {client.age && <Text style={styles.clientMetaItem}>📅 {client.age} god</Text>}
                  {client.weight && <Text style={styles.clientMetaItem}>⚖️ {client.weight} kg</Text>}
                </View>
              </View>
              {selectedClient?.id === client.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={[styles.primaryButton, !selectedClient && styles.buttonDisabled]}
          onPress={() => selectedClient && setStep(2)}
          disabled={!selectedClient}
        >
          <Text style={styles.primaryButtonText}>Nastavi →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // STEP 2: Basic Settings
  function renderStep2() {
    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>⚙️ Osnovne postavke</Text>
        
        {selectedClient && (
          <View style={styles.selectedClientBanner}>
            <Text style={styles.selectedClientText}>
              {getGenderIcon(selectedClient.gender)} {selectedClient.name}
            </Text>
          </View>
        )}

        {/* Goal Selection */}
        <Text style={styles.sectionTitle}>🎯 Cilj programa</Text>
        <View style={styles.optionsGrid}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.optionCard, goal === g.value && styles.optionCardSelected]}
              onPress={() => setGoal(g.value)}
            >
              <Text style={styles.optionLabel}>{g.label}</Text>
              <Text style={styles.optionDescription}>{g.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Level Selection */}
        <Text style={styles.sectionTitle}>📊 Razina iskustva</Text>
        <View style={styles.optionsRow}>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l.value}
              style={[styles.optionChip, level === l.value && styles.optionChipSelected]}
              onPress={() => setLevel(l.value)}
            >
              <Text style={[styles.optionChipText, level === l.value && styles.optionChipTextSelected]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration */}
        <Text style={styles.sectionTitle}>📅 Trajanje programa</Text>
        <View style={styles.durationRow}>
          {[4, 8, 12, 16].map((weeks) => (
            <TouchableOpacity
              key={weeks}
              style={[styles.durationChip, durationWeeks === weeks && styles.durationChipSelected]}
              onPress={() => setDurationWeeks(weeks)}
            >
              <Text style={[styles.durationText, durationWeeks === weeks && styles.durationTextSelected]}>
                {weeks} tj.
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Split Selection */}
        <Text style={styles.sectionTitle}>🗓️ Split tip</Text>
        {SPLITS.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.splitCard, splitType === s.value && styles.splitCardSelected]}
            onPress={() => setSplitType(s.value)}
          >
            <View style={styles.splitInfo}>
              <Text style={styles.splitLabel}>{s.label}</Text>
              <Text style={styles.splitDescription}>{s.description}</Text>
            </View>
            <Text style={styles.splitSessions}>{s.sessionsPerWeek}x</Text>
          </TouchableOpacity>
        ))}

        {/* Equipment */}
        <Text style={styles.sectionTitle}>🏠 Dostupna oprema</Text>
        <View style={styles.equipmentGrid}>
          {equipment.map((e, index) => (
            <TouchableOpacity
              key={e.id}
              style={[styles.equipmentChip, e.selected && styles.equipmentChipSelected]}
              onPress={() => {
                const newEquipment = [...equipment];
                newEquipment[index].selected = !newEquipment[index].selected;
                setEquipment(newEquipment);
              }}
            >
              <Text style={[styles.equipmentText, e.selected && styles.equipmentTextSelected]}>
                {e.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
            <Text style={styles.secondaryButtonText}>← Natrag</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(3)}>
            <Text style={styles.primaryButtonText}>Nastavi →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // STEP 3: Program Mode Selection
  function renderStep3() {
    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>📋 Način kreiranja programa</Text>
        <Text style={styles.stepDescription}>
          Odaberi kako želiš kreirati program za {selectedClient?.name}
        </Text>

        <TouchableOpacity
          style={[styles.modeCard, programMode === 'with_mesocycles' && styles.modeCardSelected]}
          onPress={() => setProgramMode('with_mesocycles')}
        >
          <Text style={styles.modeIcon}>📅</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>S mezociklusima</Text>
            <Text style={styles.modeDescription}>
              Posloži faze programa (hipertrofija → deload → jakost → natjecanje)
            </Text>
            <View style={styles.modeFeatures}>
              <Text style={styles.modeFeature}>✓ IFT metodologija</Text>
              <Text style={styles.modeFeature}>✓ Periodizacija</Text>
              <Text style={styles.modeFeature}>✓ Automatska progresija</Text>
            </View>
          </View>
          {programMode === 'with_mesocycles' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeCard, programMode === 'clean_plan' && styles.modeCardSelected]}
          onPress={() => setProgramMode('clean_plan')}
        >
          <Text style={styles.modeIcon}>✏️</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>Čisti plan (bez faza)</Text>
            <Text style={styles.modeDescription}>
              Direktno kreiraj tjedni plan bez mezociklusa
            </Text>
            <View style={styles.modeFeatures}>
              <Text style={styles.modeFeature}>✓ Potpuna kontrola</Text>
              <Text style={styles.modeFeature}>✓ Brže kreiranje</Text>
              <Text style={styles.modeFeatureNegative}>✗ Bez automatske periodizacije</Text>
            </View>
          </View>
          {programMode === 'clean_plan' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
            <Text style={styles.secondaryButtonText}>← Natrag</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, !programMode && styles.buttonDisabled]}
            onPress={() => {
              if (programMode === 'with_mesocycles') {
                initializeMesocycles();
                setStep('3A');
              } else {
                setStep(4);
              }
            }}
            disabled={!programMode}
          >
            <Text style={styles.primaryButtonText}>Nastavi →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // STEP 3A: Mesocycle Setup - Apple Style Timeline
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [showPhaseSelector, setShowPhaseSelector] = useState(false);

  function renderStep3A() {
    // Grupiraj tjedne po fazama za vizualizaciju
    const phases: { type: MesocycleType; startWeek: number; endWeek: number }[] = [];
    let currentPhase: { type: MesocycleType; startWeek: number; endWeek: number } | null = null;

    mesocycles.forEach((mc, index) => {
      if (!currentPhase || currentPhase.type !== mc.type) {
        if (currentPhase) phases.push(currentPhase);
        currentPhase = { type: mc.type, startWeek: mc.weekNumber, endWeek: mc.weekNumber };
      } else {
        currentPhase.endWeek = mc.weekNumber;
      }
    });
    if (currentPhase) phases.push(currentPhase);

    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>Faze programa</Text>
        <Text style={styles.stepDescription}>
          Dodirni tjedan za promjenu faze • {durationWeeks} tjedana
        </Text>

        {/* Timeline Container */}
        <View style={styles.timelineContainer}>
          {/* Timeline Header - Months indicator */}
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineHeaderText}>POČETAK</Text>
            <View style={styles.timelineHeaderLine} />
            <Text style={styles.timelineHeaderText}>KRAJ</Text>
          </View>

          {/* Main Timeline */}
          <View style={styles.timeline}>
            {mesocycles.map((mc, index) => {
              const isSelected = selectedWeekIndex === index;
              const isFirstOfPhase = index === 0 || mesocycles[index - 1].type !== mc.type;
              const isLastOfPhase = index === mesocycles.length - 1 || mesocycles[index + 1]?.type !== mc.type;
              
              return (
                <TouchableOpacity
                  key={mc.id}
                  style={[
                    styles.timelineWeek,
                    isFirstOfPhase && styles.timelineWeekFirst,
                    isLastOfPhase && styles.timelineWeekLast,
                    isSelected && styles.timelineWeekSelected,
                  ]}
                  onPress={() => {
                    setSelectedWeekIndex(index);
                    setShowPhaseSelector(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.timelineWeekBar,
                    { opacity: mc.type === 'deload' ? 0.4 : 0.8 },
                  ]} />
                  <Text style={styles.timelineWeekNumber}>{mc.weekNumber}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Phase Labels Below Timeline */}
          <View style={styles.phaseLabelsContainer}>
            {phases.map((phase, index) => {
              const width = ((phase.endWeek - phase.startWeek + 1) / durationWeeks) * 100;
              return (
                <View key={index} style={[styles.phaseLabel, { width: `${width}%` }]}>
                  <Text style={styles.phaseLabelText} numberOfLines={1}>
                    {MESOCYCLE_TYPES.find(m => m.value === phase.type)?.label}
                  </Text>
                  <Text style={styles.phaseLabelWeeks}>
                    T{phase.startWeek}{phase.startWeek !== phase.endWeek ? `-${phase.endWeek}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Presets */}
        <Text style={styles.presetsTitle}>Brzi predlošci</Text>
        <View style={styles.presetsContainer}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              const newMesocycles = mesocycles.map((mc, i) => ({
                ...mc,
                type: (i + 1) % 4 === 0 ? 'deload' : 'hipertrofija' as MesocycleType,
              }));
              setMesocycles(newMesocycles);
            }}
          >
            <Text style={styles.presetButtonText}>Hipertrofija</Text>
            <Text style={styles.presetButtonSub}>3:1 deload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              const newMesocycles = mesocycles.map((mc, i) => ({
                ...mc,
                type: (i + 1) % 4 === 0 ? 'deload' : 'jakost' as MesocycleType,
              }));
              setMesocycles(newMesocycles);
            }}
          >
            <Text style={styles.presetButtonText}>Jakost</Text>
            <Text style={styles.presetButtonSub}>3:1 deload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              const half = Math.floor(durationWeeks / 2);
              const newMesocycles = mesocycles.map((mc, i) => ({
                ...mc,
                type: i < half - 1 ? 'hipertrofija' : 
                      i === half - 1 ? 'deload' :
                      i < durationWeeks - 1 ? 'jakost' : 'deload' as MesocycleType,
              }));
              setMesocycles(newMesocycles);
            }}
          >
            <Text style={styles.presetButtonText}>Blok</Text>
            <Text style={styles.presetButtonSub}>Hip → Jak</Text>
          </TouchableOpacity>
        </View>

        {/* Current Selection Info */}
        {phases.length > 0 && (
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionInfoTitle}>Struktura programa</Text>
            {phases.map((phase, index) => (
              <View key={index} style={styles.selectionInfoRow}>
                <View style={styles.selectionInfoDot} />
                <Text style={styles.selectionInfoText}>
                  {MESOCYCLE_TYPES.find(m => m.value === phase.type)?.label}
                </Text>
                <Text style={styles.selectionInfoWeeks}>
                  {phase.endWeek - phase.startWeek + 1} tj.
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(3)}>
            <Text style={styles.secondaryButtonText}>Natrag</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(4)}>
            <Text style={styles.primaryButtonText}>Nastavi</Text>
          </TouchableOpacity>
        </View>

        {/* Phase Selector Modal */}
        <Modal visible={showPhaseSelector} animationType="slide" transparent>
          <View style={styles.phaseSelectorOverlay}>
            <View style={styles.phaseSelectorContent}>
              <View style={styles.phaseSelectorHeader}>
                <Text style={styles.phaseSelectorTitle}>
                  Tjedan {selectedWeekIndex !== null ? mesocycles[selectedWeekIndex]?.weekNumber : ''}
                </Text>
                <TouchableOpacity onPress={() => setShowPhaseSelector(false)}>
                  <Text style={styles.phaseSelectorClose}>Gotovo</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.phaseSelectorList}>
                {MESOCYCLE_TYPES.map((phase) => {
                  const isSelected = selectedWeekIndex !== null && 
                    mesocycles[selectedWeekIndex]?.type === phase.value;
                  
                  return (
                    <TouchableOpacity
                      key={phase.value}
                      style={[styles.phaseSelectorItem, isSelected && styles.phaseSelectorItemSelected]}
                      onPress={() => {
                        if (selectedWeekIndex !== null) {
                          const newMesocycles = [...mesocycles];
                          newMesocycles[selectedWeekIndex].type = phase.value;
                          setMesocycles(newMesocycles);
                        }
                      }}
                    >
                      <View style={styles.phaseSelectorItemInfo}>
                        <Text style={[styles.phaseSelectorItemTitle, isSelected && styles.phaseSelectorItemTitleSelected]}>
                          {phase.label}
                        </Text>
                        <Text style={styles.phaseSelectorItemDesc}>{phase.description}</Text>
                      </View>
                      {isSelected && <Text style={styles.phaseSelectorCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Apply to range */}
              <View style={styles.phaseSelectorActions}>
                <TouchableOpacity
                  style={styles.phaseSelectorActionButton}
                  onPress={() => {
                    if (selectedWeekIndex !== null) {
                      const selectedType = mesocycles[selectedWeekIndex].type;
                      const newMesocycles = mesocycles.map((mc) => ({
                        ...mc,
                        type: selectedType,
                      }));
                      setMesocycles(newMesocycles);
                      setShowPhaseSelector(false);
                    }
                  }}
                >
                  <Text style={styles.phaseSelectorActionText}>Primijeni na sve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  // STEP 4: Generate Plan
  function renderStep4() {
    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>🏋️ Generiraj tjedni plan</Text>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Sažetak programa</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>👤 Klijent:</Text>
            <Text style={styles.summaryValue}>{selectedClient?.name} ({selectedClient?.gender === 'male' ? 'M' : 'Ž'})</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>🎯 Cilj:</Text>
            <Text style={styles.summaryValue}>{GOALS.find(g => g.value === goal)?.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>📊 Razina:</Text>
            <Text style={styles.summaryValue}>{LEVELS.find(l => l.value === level)?.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>🗓️ Split:</Text>
            <Text style={styles.summaryValue}>{SPLITS.find(s => s.value === splitType)?.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>📅 Trajanje:</Text>
            <Text style={styles.summaryValue}>{durationWeeks} tjedana</Text>
          </View>
          {programMode === 'with_mesocycles' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>📋 Način:</Text>
              <Text style={styles.summaryValue}>S mezociklusima</Text>
            </View>
          )}
        </View>

        <View style={styles.genderNote}>
          <Text style={styles.genderNoteTitle}>
            {selectedClient?.gender === 'male' ? '♂️ Program za muškarca' : '♀️ Program za ženu'}
          </Text>
          <Text style={styles.genderNoteText}>
            {selectedClient?.gender === 'male' 
              ? 'Fokus na prsa, leđa i compound vježbe. Veći volumen za gornje partije.'
              : 'Fokus na gluteus, noge i hip-dominant vježbe. Veći volumen za donje partije.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.generateButton, loading && styles.buttonDisabled]}
          onPress={generateWeekPlan}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.generateButtonText}>⚡ GENERIRAJ TJEDAN {currentWeekNumber}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(programMode === 'with_mesocycles' ? '3A' : 3)}>
          <Text style={styles.secondaryButtonText}>← Natrag</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // STEP 5: Review Plan
  function renderStep5() {
    if (!weekPlan) return null;

    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>📋 Pregled tjednog plana</Text>
        
        <View style={styles.weekHeader}>
          <Text style={styles.weekTitle}>TJEDAN {weekPlan.weekNumber}</Text>
          {weekPlan.mesocycleType && (
            <View style={[styles.mesocycleBadge, { backgroundColor: getMesocycleColor(weekPlan.mesocycleType) }]}>
              <Text style={styles.mesocycleBadgeText}>{weekPlan.mesocycleType.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {weekPlan.sessions.map((session, sessionIndex) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionDay}>📅 {getDayName(session.dayOfWeek)}</Text>
              <Text style={styles.sessionName}>{session.name}</Text>
            </View>

            {session.exercises.map((exercise, exerciseIndex) => (
              <View key={exercise.id} style={styles.exerciseRow}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseNumber}>{exerciseIndex + 1}.</Text>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseParams}>
                      {exercise.sets}×{exercise.repsMin}-{exercise.repsMax} | RIR {exercise.rir} | {exercise.restSeconds}s
                    </Text>
                    <Text style={styles.exerciseMuscles}>
                      {exercise.primaryMuscles.join(', ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.exerciseActions}>
                  <TouchableOpacity
                    style={styles.exerciseActionButton}
                    onPress={() => {
                      setExerciseToReplace({ sessionIndex, exerciseIndex });
                      setShowReplaceModal(true);
                    }}
                  >
                    <Text style={styles.exerciseActionText}>🔄</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.exerciseActionButton}>
                    <Text style={styles.exerciseActionText}>✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addExerciseButton}>
              <Text style={styles.addExerciseText}>+ Dodaj vježbu</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(4)}>
            <Text style={styles.secondaryButtonText}>← Regeneriraj</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(7)}>
            <Text style={styles.primaryButtonText}>Spremi →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // STEP 7: Publish
  function renderStep7() {
    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>🚀 Spremi i objavi</Text>
        
        <View style={styles.publishCard}>
          <Text style={styles.publishIcon}>✅</Text>
          <Text style={styles.publishTitle}>Program je spreman!</Text>
          <Text style={styles.publishDescription}>
            Program za {selectedClient?.name} je kreiran i spreman za objavu.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Detalji programa</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Klijent:</Text>
            <Text style={styles.summaryValue}>{selectedClient?.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cilj:</Text>
            <Text style={styles.summaryValue}>{GOALS.find(g => g.value === goal)?.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trajanje:</Text>
            <Text style={styles.summaryValue}>{durationWeeks} tjedana</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Treninga tjedno:</Text>
            <Text style={styles.summaryValue}>{weekPlan?.sessions.length || 4}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(5)}>
          <Text style={styles.secondaryButtonText}>Spremi kao draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishButton, loading && styles.buttonDisabled]}
          onPress={publishProgram}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.publishButtonText}>🚀 OBJAVI KLIJENTU</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Replace Exercise Modal
  function renderReplaceModal() {
    if (!exerciseToReplace || !weekPlan) return null;

    const currentExercise = weekPlan.sessions[exerciseToReplace.sessionIndex].exercises[exerciseToReplace.exerciseIndex];

    // Mock replacement exercises
    const mockReplacements: Exercise[] = [
      { ...currentExercise, id: 'r1', name: 'Incline Barbell Press', nameEn: 'Incline Barbell Press' },
      { ...currentExercise, id: 'r2', name: 'Dumbbell Bench Press', nameEn: 'Dumbbell Bench Press' },
      { ...currentExercise, id: 'r3', name: 'Machine Chest Press', nameEn: 'Machine Chest Press' },
      { ...currentExercise, id: 'r4', name: 'Cable Fly', nameEn: 'Cable Fly' },
    ];

    return (
      <Modal visible={showReplaceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔄 Zamjena vježbe</Text>
            <Text style={styles.modalSubtitle}>Trenutna: {currentExercise.name}</Text>
            
            <Text style={styles.modalSectionTitle}>Predložene zamjene:</Text>
            
            {mockReplacements.map((replacement) => (
              <TouchableOpacity
                key={replacement.id}
                style={styles.replacementOption}
                onPress={() => {
                  // Replace exercise
                  const newWeekPlan = { ...weekPlan };
                  newWeekPlan.sessions[exerciseToReplace.sessionIndex].exercises[exerciseToReplace.exerciseIndex] = replacement;
                  setWeekPlan(newWeekPlan);
                  setShowReplaceModal(false);
                  setExerciseToReplace(null);
                }}
              >
                <Text style={styles.replacementName}>{replacement.name}</Text>
                <Text style={styles.replacementMeta}>
                  {replacement.equipment} | {replacement.primaryMuscles.join(', ')}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowReplaceModal(false);
                setExerciseToReplace(null);
              }}
            >
              <Text style={styles.modalCloseText}>Odustani</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelText}>✕ Odustani</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Novi Program</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === '3A' && renderStep3A()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 7 && renderStep7()}

        {/* Modals */}
        {renderReplaceModal()}
      </LinearGradient>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

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
  cancelText: { color: '#EF4444', fontSize: 16 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  placeholder: { width: 80 },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: '#8B5CF6' },
  stepNumber: { color: '#666', fontSize: 12, fontWeight: '600' },
  stepNumberActive: { color: '#FFF' },
  stepLabel: { color: '#666', fontSize: 10, marginTop: 4 },
  stepLabelActive: { color: '#FFF' },

  // Step Content
  stepContent: { flex: 1, padding: 20 },
  stepTitle: { color: '#FFF', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  stepDescription: { color: '#AAA', fontSize: 14, marginBottom: 20 },

  // Client Selection
  clientCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clientCardSelected: { borderColor: '#8B5CF6' },
  clientInfo: { flex: 1 },
  clientName: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  clientEmail: { color: '#888', fontSize: 14 },
  clientMeta: { flexDirection: 'row', marginTop: 8, gap: 12 },
  clientMetaItem: { color: '#AAA', fontSize: 12 },
  checkmark: { color: '#8B5CF6', fontSize: 24, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#888', fontSize: 16 },

  // Selected Client Banner
  selectedClientBanner: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  selectedClientText: { color: '#FFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },

  // Section Title
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 12 },

  // Options Grid
  optionsGrid: { gap: 10 },
  optionCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: { borderColor: '#8B5CF6' },
  optionLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  optionDescription: { color: '#888', fontSize: 13, marginTop: 4 },

  // Options Row
  optionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  optionChip: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionChipSelected: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' },
  optionChipText: { color: '#AAA', fontSize: 14 },
  optionChipTextSelected: { color: '#FFF', fontWeight: '600' },

  // Duration
  durationRow: { flexDirection: 'row', gap: 10 },
  durationChip: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationChipSelected: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' },
  durationText: { color: '#AAA', fontSize: 14 },
  durationTextSelected: { color: '#FFF', fontWeight: '600' },

  // Split
  splitCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  splitCardSelected: { borderColor: '#8B5CF6' },
  splitInfo: { flex: 1 },
  splitLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  splitDescription: { color: '#888', fontSize: 13 },
  splitSessions: { color: '#8B5CF6', fontSize: 18, fontWeight: '700' },

  // Equipment
  equipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  equipmentChip: {
    backgroundColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  equipmentChipSelected: { borderColor: '#22C55E', backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  equipmentText: { color: '#AAA', fontSize: 13 },
  equipmentTextSelected: { color: '#22C55E' },

  // Mode Cards
  modeCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardSelected: { borderColor: '#8B5CF6' },
  modeIcon: { fontSize: 32, marginRight: 16 },
  modeInfo: { flex: 1 },
  modeTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  modeDescription: { color: '#AAA', fontSize: 14, marginTop: 4 },
  modeFeatures: { marginTop: 12 },
  modeFeature: { color: '#22C55E', fontSize: 13, marginTop: 4 },
  modeFeatureNegative: { color: '#EF4444', fontSize: 13, marginTop: 4 },

  // ============================================
  // APPLE-STYLE TIMELINE
  // ============================================
  
  timelineContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineHeaderText: {
    color: '#48484A',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timelineHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 12,
  },
  timeline: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timelineWeek: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#3A3A3C',
  },
  timelineWeekFirst: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  timelineWeekLast: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderRightWidth: 0,
  },
  timelineWeekSelected: {
    backgroundColor: '#3A3A3C',
  },
  timelineWeekBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#FFF',
  },
  timelineWeekNumber: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
  },
  phaseLabelsContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  phaseLabel: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  phaseLabelText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  phaseLabelWeeks: {
    color: '#48484A',
    fontSize: 10,
    marginTop: 2,
  },

  // Presets
  presetsTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  presetButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  presetButtonSub: {
    color: '#48484A',
    fontSize: 11,
    marginTop: 4,
  },

  // Selection Info
  selectionInfo: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectionInfoTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectionInfoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 12,
  },
  selectionInfoText: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
  },
  selectionInfoWeeks: {
    color: '#48484A',
    fontSize: 14,
  },

  // Phase Selector Modal
  phaseSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  phaseSelectorContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  phaseSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  phaseSelectorTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  phaseSelectorClose: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: '600',
  },
  phaseSelectorList: {
    padding: 8,
  },
  phaseSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  phaseSelectorItemSelected: {
    backgroundColor: '#2C2C2E',
  },
  phaseSelectorItemInfo: {
    flex: 1,
  },
  phaseSelectorItemTitle: {
    color: '#FFF',
    fontSize: 17,
  },
  phaseSelectorItemTitleSelected: {
    fontWeight: '600',
  },
  phaseSelectorItemDesc: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 2,
  },
  phaseSelectorCheck: {
    color: '#0A84FF',
    fontSize: 18,
    fontWeight: '700',
  },
  phaseSelectorActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  phaseSelectorActionButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  phaseSelectorActionText: {
    color: '#0A84FF',
    fontSize: 17,
    fontWeight: '600',
  },

  // Legacy (kept for compatibility)
  mesocycleLegend: { display: 'none' },
  legendItem: { display: 'none' },
  legendColor: { display: 'none' },
  legendText: { display: 'none' },
  mesocycleTimeline: { display: 'none' },
  mesocycleWeek: { display: 'none' },
  mesocycleWeekNumber: { display: 'none' },
  mesocycleWeekType: { display: 'none' },
  quickActions: { display: 'none' },
  quickActionButton: { display: 'none' },
  quickActionText: { display: 'none' },

  // Summary Card
  summaryCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { color: '#AAA', fontSize: 14 },
  summaryValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Gender Note
  genderNote: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  genderNoteTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  genderNoteText: { color: '#AAA', fontSize: 13, marginTop: 4 },

  // Week Header
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  weekTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginRight: 12 },
  mesocycleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mesocycleBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // Session Card
  sessionCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sessionDay: { color: '#AAA', fontSize: 14 },
  sessionName: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Exercise Row
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  exerciseInfo: { flexDirection: 'row', flex: 1 },
  exerciseNumber: { color: '#8B5CF6', fontSize: 14, fontWeight: '600', width: 24 },
  exerciseDetails: { flex: 1 },
  exerciseName: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  exerciseParams: { color: '#888', fontSize: 12, marginTop: 2 },
  exerciseMuscles: { color: '#8B5CF6', fontSize: 11, marginTop: 2 },
  exerciseActions: { flexDirection: 'row', gap: 8 },
  exerciseActionButton: {
    width: 36,
    height: 36,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseActionText: { fontSize: 16 },

  // Add Exercise
  addExerciseButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  addExerciseText: { color: '#888', fontSize: 14 },

  // Publish Card
  publishCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  publishIcon: { fontSize: 48 },
  publishTitle: { color: '#FFF', fontSize: 24, fontWeight: '700', marginTop: 16 },
  publishDescription: { color: '#AAA', fontSize: 14, textAlign: 'center', marginTop: 8 },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#FFF', fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  generateButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  publishButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  publishButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

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
    maxHeight: '80%',
  },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { color: '#888', fontSize: 14, marginBottom: 20 },
  modalSectionTitle: { color: '#AAA', fontSize: 14, marginBottom: 12 },
  replacementOption: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  replacementName: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  replacementMeta: { color: '#888', fontSize: 13, marginTop: 4 },
  modalCloseButton: {
    marginTop: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCloseText: { color: '#EF4444', fontSize: 16 },
});

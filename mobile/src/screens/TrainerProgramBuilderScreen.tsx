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

import React, { useState, useEffect, useRef } from 'react';
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

// Podaci iz godišnjeg plana
interface PhaseData {
  phaseType: string;
  phaseName: string;
  startWeek: number;
  endWeek: number;
  durationWeeks: number;
  mesocycleId: string;
  ponavljanja: string;
  intenzitet: string;
}

interface Props {
  authToken: string;
  clientId?: string;
  phaseData?: PhaseData; // Ako dolazimo iz godišnjeg plana
  onComplete?: (programId: string) => void;
  onCancel?: () => void;
}

type Step = 1 | 2 | 3 | '3A' | 4 | 5 | 6 | 7;

// IFT Metodika - Ciljevi treninga (Tablica 23)
type ProgramGoal = 'jakost' | 'snaga' | 'hipertrofija' | 'izdrzljivost' | 'rekreacija_zdravlje';
type UserLevel = 'pocetnik' | 'srednji' | 'napredni';
type SplitType = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'body_part_split' | 'custom';

interface CustomSplitDay {
  redniBroj: number;
  naziv: string;
  misicneGrupe: string[];
  opcionalneGrupe?: string[];
}

interface CustomSplit {
  naziv: string;
  opis?: string;
  dani: CustomSplitDay[];
  ukupnoDana: number;
}
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
  volumeModifier: number; // 1.0 = baseline, 1.1 = +10%, 0.6 = deload
  intensityModifier: number;
  isDeload: boolean;
}

// Kompletni program svih tjedana
interface FullProgram {
  phaseType: MesocycleType;
  phaseName: string;
  totalWeeks: number;
  weeks: WeekPlan[];
}

// ============================================
// CONSTANTS
// ============================================

/**
 * IFT Metodika - Tablica 23: Komponente opterećenja prema usmjerenosti vježbanja
 * Izvor: M. Čakan, K. Marković, D. Perkov - Metodika fitnessa u teretani
 */
const GOALS: { value: ProgramGoal; label: string; description: string }[] = [
  { value: 'jakost', label: 'Jakost', description: '1-5 rep, 90-100% 1RM, 3-5 min odmor' },
  { value: 'snaga', label: 'Snaga/Power', description: '6-8 rep, 80-90% 1RM, 2-3 min odmor' },
  { value: 'hipertrofija', label: 'Hipertrofija', description: '8-12 rep, 65-80% 1RM, 60-90 sec odmor' },
  { value: 'izdrzljivost', label: 'Izdrzljivost', description: '12+ rep, do 60% 1RM, 0-60 sec odmor' },
  { value: 'rekreacija_zdravlje', label: 'Rekreacija/Zdravlje', description: 'Opća kondicija i zdravlje' },
];

const LEVELS: { value: UserLevel; label: string; description: string }[] = [
  { value: 'pocetnik', label: '🌱 Početnik', description: '0-1 godina iskustva' },
  { value: 'srednji', label: ' Srednji', description: '1-3 godine iskustva' },
  { value: 'napredni', label: ' Napredni', description: '3+ godina iskustva' },
];

const SPLITS: { value: SplitType; label: string; description: string; sessionsPerWeek: number }[] = [
  { value: 'full_body', label: 'Full Body', description: '2-3x tjedno, cijelo tijelo', sessionsPerWeek: 3 },
  { value: 'upper_lower', label: 'Upper/Lower', description: '4x tjedno, gornje/donje', sessionsPerWeek: 4 },
  { value: 'push_pull_legs', label: 'Push/Pull/Legs', description: '5-6x tjedno', sessionsPerWeek: 6 },
  { value: 'body_part_split', label: 'Bro Split', description: '5x tjedno, po mišićnoj grupi', sessionsPerWeek: 5 },
  { value: 'custom', label: 'Custom Split', description: 'Kreiraj vlastiti split', sessionsPerWeek: 0 },
];

const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'Sipka i utezi', selected: true },
  { id: 'dumbbell', label: 'Bucice', selected: true },
  { id: 'machine', label: 'Sprave', selected: true },
  { id: 'cable', label: 'Kabel', selected: true },
  { id: 'bodyweight', label: 'Bodyweight', selected: false },
];

// ============================================
// FREKVENCIJA TRENINGA - IFT Metodika
// ============================================

const FREQUENCY_OPTIONS = [
  { value: 2, label: '2x', description: 'Minimalna frekvencija', recommendedSplit: 'full_body' as SplitType },
  { value: 3, label: '3x', description: 'Dobra za pocetnike', recommendedSplit: 'full_body' as SplitType },
  { value: 4, label: '4x', description: 'Optimalna', recommendedSplit: 'upper_lower' as SplitType },
  { value: 5, label: '5x', description: 'Napredna', recommendedSplit: 'push_pull_legs' as SplitType },
  { value: 6, label: '6x', description: 'Maksimalna', recommendedSplit: 'push_pull_legs' as SplitType },
];

// ============================================
// KARDIO OPCIJE - IFT Metodika (Tablica 26)
// ============================================

type KardioTip = 'none' | 'kontinuirani' | 'hiit';

const KARDIO_SIMPLE = [
  { value: 'none' as KardioTip, label: 'Bez kardija', description: 'Samo trening snage' },
  { value: 'kontinuirani' as KardioTip, label: 'Lagani kardio', description: '20-30 min, 60-75% SF' },
  { value: 'hiit' as KardioTip, label: 'HIIT', description: '15-20 min, visok intenzitet' },
];

/**
 * IFT Metodika - Tipovi mezociklusa za periodizaciju
 */
const MESOCYCLE_TYPES: { value: MesocycleType; label: string; color: string; description: string }[] = [
  { value: 'hipertrofija', label: 'Hipertrofija', color: '#FFFFFF', description: '8-12 rep, 65-80% 1RM' },
  { value: 'jakost', label: 'Jakost', color: '#71717A', description: '1-5 rep, 90-100% 1RM' },
  { value: 'snaga', label: 'Snaga/Power', color: '#A1A1AA', description: '6-8 rep, 80-90% 1RM' },
  { value: 'izdrzljivost', label: 'Izdržljivost', color: '#3B82F6', description: '15-25 rep' },
  { value: 'deload', label: 'Deload', color: '#3F3F46', description: 'Oporavak, -40% volume' },
  { value: 'priprema', label: 'Priprema', color: '#EC4899', description: 'Pred-natjecanje' },
  { value: 'natjecanje', label: 'Natjecanje', color: '#F97316', description: 'Peak performance' },
  { value: 'tranzicija', label: 'Tranzicija', color: '#6B7280', description: 'Aktivni odmor' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function TrainerProgramBuilderScreen({ authToken, clientId, phaseData, onComplete, onCancel }: Props) {
  // Map phase type to goal
  const mapPhaseToGoal = (phaseType: string): ProgramGoal => {
    const mapping: Record<string, ProgramGoal> = {
      'hipertrofija': 'hipertrofija',
      'jakost': 'jakost',
      'snaga': 'snaga',
      'izdrzljivost': 'izdrzljivost',
      'deload': 'rekreacija_zdravlje',
      'priprema': 'jakost',
      'natjecanje': 'snaga',
      'tranzicija': 'rekreacija_zdravlje',
    };
    return mapping[phaseType] || 'hipertrofija';
  };

  // Determine initial step based on whether we have phaseData
  // UVIJEK prikazuj lentu vremena (Step 3) ako imamo klijenta
  const getInitialStep = (): Step => {
    if (phaseData) return 3; // Idi direktno na lentu vremena
    if (clientId) return 3;  // Idi direktno na lentu vremena
    return 1; // Odabir klijenta
  };

  // Navigation
  const [step, setStep] = useState<Step>(getInitialStep());
  const [loading, setLoading] = useState(false);
  const [fromAnnualPlan] = useState(!!phaseData); // Track if we came from annual plan
  const [annualProgramId, setAnnualProgramId] = useState<string | null>(
    phaseData?.mesocycleId ? phaseData.mesocycleId.split('-')[0] : null // Extract annual program ID if available
  );

  // Step 1: Client Selection
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);

  // Step 2: Basic Settings - Initialize from phaseData if available
  const [goal, setGoal] = useState<ProgramGoal>(phaseData ? mapPhaseToGoal(phaseData.phaseType) : 'hipertrofija');
  const [level, setLevel] = useState<UserLevel>('srednji');
  const [trainingFrequency, setTrainingFrequency] = useState(4); // Koliko dana tjedno
  const [splitType, setSplitType] = useState<SplitType>('upper_lower');
  const [splitAutoSuggested, setSplitAutoSuggested] = useState(true); // Prati da li je auto ili rucno
  const [customSplit, setCustomSplit] = useState<CustomSplit | null>(null);
  const [showCustomSplitBuilder, setShowCustomSplitBuilder] = useState(false);
  const [durationWeeks, setDurationWeeks] = useState(phaseData?.durationWeeks || 12);
  const [equipment, setEquipment] = useState(EQUIPMENT_OPTIONS.map(e => ({ ...e })));
  
  // Kardio postavke - IFT Metodika
  const [kardioTip, setKardioTip] = useState<KardioTip>('none');
  const [kardioFrekvencija, setKardioFrekvencija] = useState(2); // 1-3x tjedno

  // Step 3: Program Mode - Skip if from annual plan
  const [programMode, setProgramMode] = useState<ProgramMode | null>(phaseData ? 'with_mesocycles' : null);

  // Step 3A: Mesocycles
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);

  // Step 4-5: Generated Plan - ALL WEEKS
  const [fullProgram, setFullProgram] = useState<FullProgram | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0); // Index u fullProgram.weeks

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

  // ============================================
  // HELPER: Auto-suggest split based on frequency
  // ============================================
  
  const handleFrequencyChange = (freq: number) => {
    setTrainingFrequency(freq);
    
    // Auto-suggest split if not manually changed
    if (splitAutoSuggested) {
      const recommended = FREQUENCY_OPTIONS.find(f => f.value === freq)?.recommendedSplit || 'upper_lower';
      setSplitType(recommended);
    }
  };
  
  const handleSplitManualChange = (split: SplitType) => {
    setSplitType(split);
    setSplitAutoSuggested(false); // User manually changed it
  };
  
  // Get recommended split description
  const getRecommendedSplitInfo = () => {
    const freqOption = FREQUENCY_OPTIONS.find(f => f.value === trainingFrequency);
    const recommendedSplit = freqOption?.recommendedSplit || 'upper_lower';
    const splitInfo = SPLITS.find(s => s.value === recommendedSplit);
    return {
      recommended: recommendedSplit,
      label: splitInfo?.label || 'Upper/Lower',
      isUsingRecommended: splitType === recommendedSplit,
    };
  };

  // ============================================
  // GENERATE FULL PROGRAM - SVE TJEDNE ODJEDNOM
  // ============================================
  
  async function generateFullProgram() {
    if (!selectedClient) return;

    setLoading(true);
    try {
      // Odredi tip faze i trajanje
      // Ako imamo phaseData, koristi phaseType iz njega, inače mapiraj goal u phaseType
      let phaseType: MesocycleType;
      if (phaseData?.phaseType) {
        phaseType = phaseData.phaseType as MesocycleType;
      } else {
        // Mapiraj goal u phaseType
        phaseType = goal === 'jakost' ? 'jakost' : 
                   goal === 'snaga' ? 'snaga' : 
                   goal === 'izdrzljivost' ? 'izdrzljivost' : 
                   'hipertrofija';
      }
      const phaseName = phaseData?.phaseName || MESOCYCLE_TYPES.find(m => m.value === phaseType)?.label || 'Program';
      const totalWeeks = phaseData?.durationWeeks || durationWeeks;
      
      // Pokušaj API poziv
      const response = await fetch(`${API_BASE_URL}/api/training/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          gender: selectedClient.gender,
          // IFT parametri
          cilj: goal,
          razina: level,
          splitTip: splitType,
          customSplit: splitType === 'custom' && customSplit ? customSplit : undefined,
          treninziTjedno: trainingFrequency,
          trajanjeTjedana: totalWeeks,
          mezociklusTip: phaseType,
          dostupnaOprema: equipment.filter(e => e.selected).map(e => e.id),
          // Kardio - IFT Metodika
          kardio: kardioTip !== 'none' ? {
            tip: kardioTip,
            frekvencija: kardioFrekvencija,
          } : null,
          // Pliometrija - automatski za cilj 'snaga'
          // Generator ce sam dodati ako je goal === 'snaga'
        }),
      });

      const data = await response.json();
      if (data.success && data.data.weeks) {
        setFullProgram({
          phaseType,
          phaseName,
          totalWeeks,
          weeks: data.data.weeks,
        });
        setProgramId(data.data.programId);
        setCurrentWeekIndex(0);
        setStep(5);
      } else {
        // Fallback: Generate locally
        const program = generateMockFullProgram(phaseType, phaseName, totalWeeks);
        setFullProgram(program);
        setCurrentWeekIndex(0);
        setStep(5);
      }
    } catch (error) {
      console.error('Error generating program:', error);
      // Fallback: Generate locally
      const phaseType = phaseData?.phaseType as MesocycleType || 'hipertrofija';
      const phaseName = phaseData?.phaseName || 'Program';
      const totalWeeks = phaseData?.durationWeeks || durationWeeks;
      const program = generateMockFullProgram(phaseType, phaseName, totalWeeks);
      setFullProgram(program);
      setCurrentWeekIndex(0);
      setStep(5);
    } finally {
      setLoading(false);
    }
  }

  // Generira SVE tjedne s progresijom po IFT skripti
  function generateMockFullProgram(phaseType: MesocycleType, phaseName: string, totalWeeks: number): FullProgram {
    const isMale = selectedClient?.gender === 'male';
    const weeks: WeekPlan[] = [];
    
    // IFT parametri po tipu faze
    const phaseParams = getPhaseParameters(phaseType);
    
    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      // Izračunaj progresiju (linearna kroz tjedne)
      const progress = (weekNum - 1) / Math.max(1, totalWeeks - 1);
      
      // Zadnji tjedan je deload (osim ako je cijela faza deload)
      const isDeload = phaseType !== 'deload' && weekNum === totalWeeks && totalWeeks >= 4;
      
      // Volume modifier: raste od 1.0 do 1.15, deload pada na 0.6
      const volumeModifier = isDeload ? 0.6 : 1.0 + (progress * 0.15);
      
      // Intensity modifier: raste od 1.0 do 1.1
      const intensityModifier = isDeload ? 0.7 : 1.0 + (progress * 0.1);
      
      // Prilagodi setove i RIR po tjednu
      const baseSets = phaseParams.sets;
      const weekSets = isDeload ? Math.max(2, baseSets - 2) : Math.round(baseSets * volumeModifier);
      const weekRIR = isDeload ? 4 : Math.max(0, phaseParams.rirEnd - Math.round(progress * (phaseParams.rirStart - phaseParams.rirEnd)));
      
      // Generiraj vježbe za ovaj tjedan
      const exercises = generateWeekExercises(isMale, phaseParams, weekSets, weekRIR, weekNum);
      
      const weekPlan: WeekPlan = {
        weekNumber: weekNum,
        mesocycleType: isDeload ? 'deload' : phaseType,
        volumeModifier: Math.round(volumeModifier * 100) / 100,
        intensityModifier: Math.round(intensityModifier * 100) / 100,
        isDeload,
        sessions: generateWeekSessions(exercises, weekNum),
      };
      
      weeks.push(weekPlan);
    }
    
    return {
      phaseType,
      phaseName,
      totalWeeks,
      weeks,
    };
  }

  // IFT parametri za svaki tip faze
  function getPhaseParameters(phaseType: MesocycleType) {
    const params: Record<MesocycleType, { sets: number; repsMin: number; repsMax: number; restSec: number; rirStart: number; rirEnd: number; intensity: string }> = {
      'jakost': { sets: 5, repsMin: 1, repsMax: 5, restSec: 180, rirStart: 2, rirEnd: 0, intensity: '85-100%' },
      'snaga': { sets: 4, repsMin: 3, repsMax: 6, restSec: 150, rirStart: 3, rirEnd: 1, intensity: '75-90%' },
      'hipertrofija': { sets: 4, repsMin: 8, repsMax: 12, restSec: 90, rirStart: 3, rirEnd: 1, intensity: '65-80%' },
      'izdrzljivost': { sets: 3, repsMin: 15, repsMax: 25, restSec: 45, rirStart: 3, rirEnd: 2, intensity: '50-65%' },
      'deload': { sets: 2, repsMin: 8, repsMax: 12, restSec: 90, rirStart: 4, rirEnd: 4, intensity: '50-60%' },
      'priprema': { sets: 4, repsMin: 6, repsMax: 10, restSec: 120, rirStart: 2, rirEnd: 1, intensity: '70-85%' },
      'natjecanje': { sets: 3, repsMin: 1, repsMax: 3, restSec: 180, rirStart: 1, rirEnd: 0, intensity: '95-105%' },
      'tranzicija': { sets: 2, repsMin: 10, repsMax: 15, restSec: 60, rirStart: 4, rirEnd: 4, intensity: '40-60%' },
    };
    return params[phaseType] || params['hipertrofija'];
  }

  // Generiraj vježbe za tjedan
  function generateWeekExercises(isMale: boolean, params: ReturnType<typeof getPhaseParameters>, sets: number, rir: number, weekNum: number): { upper: Exercise[]; lower: Exercise[] } {
    const upperExercises: Exercise[] = isMale ? [
      { id: `u1-w${weekNum}`, name: 'Bench Press', nameEn: 'Bench Press', sets, repsMin: params.repsMin, repsMax: params.repsMax, restSeconds: params.restSec, rir, equipment: 'barbell', primaryMuscles: ['Prsa'], secondaryMuscles: ['Triceps', 'Ramena'], isLocked: false },
      { id: `u2-w${weekNum}`, name: 'Bent Over Row', nameEn: 'Bent Over Row', sets, repsMin: params.repsMin, repsMax: params.repsMax, restSeconds: params.restSec, rir, equipment: 'barbell', primaryMuscles: ['Leda'], secondaryMuscles: ['Biceps'], isLocked: false },
      { id: `u3-w${weekNum}`, name: 'Overhead Press', nameEn: 'Overhead Press', sets: Math.max(2, sets - 1), repsMin: params.repsMin, repsMax: params.repsMax, restSeconds: params.restSec, rir, equipment: 'barbell', primaryMuscles: ['Ramena'], secondaryMuscles: ['Triceps'], isLocked: false },
      { id: `u4-w${weekNum}`, name: 'Lat Pulldown', nameEn: 'Lat Pulldown', sets: Math.max(2, sets - 1), repsMin: params.repsMin + 2, repsMax: params.repsMax + 2, restSeconds: Math.max(60, params.restSec - 30), rir, equipment: 'cable', primaryMuscles: ['Leda'], secondaryMuscles: ['Biceps'], isLocked: false },
      { id: `u5-w${weekNum}`, name: 'Incline DB Curl', nameEn: 'Incline Dumbbell Curl', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60, rir: Math.min(3, rir + 1), equipment: 'dumbbell', primaryMuscles: ['Biceps'], secondaryMuscles: [], isLocked: false },
      { id: `u6-w${weekNum}`, name: 'Tricep Pushdown', nameEn: 'Tricep Pushdown', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60, rir: Math.min(3, rir + 1), equipment: 'cable', primaryMuscles: ['Triceps'], secondaryMuscles: [], isLocked: false },
    ] : [
      { id: `u1-w${weekNum}`, name: 'Incline DB Press', nameEn: 'Incline Dumbbell Press', sets: Math.max(2, sets - 1), repsMin: params.repsMin + 2, repsMax: params.repsMax + 2, restSeconds: Math.max(60, params.restSec - 30), rir, equipment: 'dumbbell', primaryMuscles: ['Prsa'], secondaryMuscles: ['Ramena', 'Triceps'], isLocked: false },
      { id: `u2-w${weekNum}`, name: 'Lat Pulldown', nameEn: 'Lat Pulldown', sets, repsMin: params.repsMin + 2, repsMax: params.repsMax + 2, restSeconds: Math.max(60, params.restSec - 30), rir, equipment: 'cable', primaryMuscles: ['Leda'], secondaryMuscles: ['Biceps'], isLocked: false },
      { id: `u3-w${weekNum}`, name: 'Seated Row', nameEn: 'Seated Cable Row', sets: Math.max(2, sets - 1), repsMin: params.repsMin + 2, repsMax: params.repsMax + 2, restSeconds: Math.max(60, params.restSec - 30), rir, equipment: 'cable', primaryMuscles: ['Leda'], secondaryMuscles: ['Biceps'], isLocked: false },
      { id: `u4-w${weekNum}`, name: 'Lateral Raise', nameEn: 'Dumbbell Lateral Raise', sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, rir: Math.min(3, rir + 1), equipment: 'dumbbell', primaryMuscles: ['Ramena'], secondaryMuscles: [], isLocked: false },
      { id: `u5-w${weekNum}`, name: 'Face Pull', nameEn: 'Face Pull', sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, rir: Math.min(3, rir + 1), equipment: 'cable', primaryMuscles: ['Ramena', 'Leda'], secondaryMuscles: [], isLocked: false },
    ];

    const lowerExercises: Exercise[] = isMale ? [
      { id: `l1-w${weekNum}`, name: 'Squat', nameEn: 'Barbell Back Squat', sets, repsMin: params.repsMin, repsMax: Math.min(8, params.repsMax), restSeconds: params.restSec, rir, equipment: 'barbell', primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Gluteus', 'Hamstrings'], isLocked: false },
      { id: `l2-w${weekNum}`, name: 'Romanian Deadlift', nameEn: 'Romanian Deadlift', sets: Math.max(2, sets - 1), repsMin: params.repsMin + 2, repsMax: params.repsMax, restSeconds: params.restSec, rir, equipment: 'barbell', primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Gluteus', 'Leda'], isLocked: false },
      { id: `l3-w${weekNum}`, name: 'Leg Press', nameEn: 'Leg Press', sets: Math.max(2, sets - 1), repsMin: params.repsMin + 2, repsMax: params.repsMax + 2, restSeconds: Math.max(60, params.restSec - 30), rir, equipment: 'machine', primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Gluteus'], isLocked: false },
      { id: `l4-w${weekNum}`, name: 'Leg Curl', nameEn: 'Lying Leg Curl', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, rir: Math.min(3, rir + 1), equipment: 'machine', primaryMuscles: ['Hamstrings'], secondaryMuscles: [], isLocked: false },
      { id: `l5-w${weekNum}`, name: 'Calf Raise', nameEn: 'Standing Calf Raise', sets: 4, repsMin: 12, repsMax: 15, restSeconds: 60, rir: Math.min(3, rir + 1), equipment: 'machine', primaryMuscles: ['Listovi'], secondaryMuscles: [], isLocked: false },
    ] : [
      { id: `l1-w${weekNum}`, name: 'Hip Thrust', nameEn: 'Barbell Hip Thrust', sets, repsMin: params.repsMin + 2, repsMax: params.repsMax + 2, restSeconds: params.restSec, rir, equipment: 'barbell', primaryMuscles: ['Gluteus'], secondaryMuscles: ['Hamstrings'], isLocked: false },
      { id: `l2-w${weekNum}`, name: 'Bulgarian Split Squat', nameEn: 'Bulgarian Split Squat', sets: Math.max(2, sets - 1), repsMin: params.repsMin + 2, repsMax: params.repsMax + 2, restSeconds: Math.max(60, params.restSec - 30), rir, equipment: 'dumbbell', primaryMuscles: ['Quadriceps', 'Gluteus'], secondaryMuscles: [], isLocked: false },
      { id: `l3-w${weekNum}`, name: 'Romanian Deadlift', nameEn: 'Romanian Deadlift', sets, repsMin: params.repsMin + 2, repsMax: params.repsMax + 2, restSeconds: params.restSec, rir, equipment: 'barbell', primaryMuscles: ['Hamstrings', 'Gluteus'], secondaryMuscles: ['Leda'], isLocked: false },
      { id: `l4-w${weekNum}`, name: 'Goblet Squat', nameEn: 'Goblet Squat', sets: Math.max(2, sets - 1), repsMin: 12, repsMax: 15, restSeconds: 90, rir: Math.min(3, rir + 1), equipment: 'dumbbell', primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Gluteus'], isLocked: false },
      { id: `l5-w${weekNum}`, name: 'Glute Bridge', nameEn: 'Glute Bridge', sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, rir: Math.min(3, rir + 1), equipment: 'bodyweight', primaryMuscles: ['Gluteus'], secondaryMuscles: ['Hamstrings'], isLocked: false },
      { id: `l6-w${weekNum}`, name: 'Abductor Machine', nameEn: 'Hip Abductor Machine', sets: 3, repsMin: 15, repsMax: 20, restSeconds: 60, rir: Math.min(3, rir + 1), equipment: 'machine', primaryMuscles: ['Gluteus'], secondaryMuscles: [], isLocked: false },
    ];

    return { upper: upperExercises, lower: lowerExercises };
  }

  // Generiraj sesije za tjedan
  function generateWeekSessions(exercises: { upper: Exercise[]; lower: Exercise[] }, weekNum: number): TrainingSession[] {
    return [
      { id: `s1-w${weekNum}`, dayOfWeek: 1, name: 'Upper A', type: 'upper', exercises: exercises.upper },
      { id: `s2-w${weekNum}`, dayOfWeek: 2, name: 'Lower A', type: 'lower', exercises: exercises.lower },
      { id: `s3-w${weekNum}`, dayOfWeek: 4, name: 'Upper B', type: 'upper', exercises: exercises.upper.map(e => ({ ...e, id: e.id + '-b' })) },
      { id: `s4-w${weekNum}`, dayOfWeek: 5, name: 'Lower B', type: 'lower', exercises: exercises.lower.map(e => ({ ...e, id: e.id + '-b' })) },
    ];
  }

  async function publishProgram() {
    if (!programId && !fullProgram) {
      Alert.alert('Greska', 'Nema generiranog programa za objaviti');
      return;
    }

    setLoading(true);
    try {
      // Za sada simuliramo objavu
      Alert.alert(
        ' Program objavljen!',
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
      default: return '';
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
        <Text style={styles.stepTitle}> Odaberi klijenta</Text>
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
                  {client.age && <Text style={styles.clientMetaItem}> {client.age} god</Text>}
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
          onPress={() => selectedClient && setStep(3)}
          disabled={!selectedClient}
        >
          <Text style={styles.primaryButtonText}>Nastavi na lentu vremena →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // STEP 2: Basic Settings
  function renderStep2() {
    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>Postavke programa</Text>
        
        {/* Phase Info Banner - When coming from Annual Plan */}
        {fromAnnualPlan && phaseData && (
          <View style={styles.phaseBanner}>
            <View style={styles.phaseBannerHeader}>
              <Text style={styles.phaseBannerTitle}>{phaseData.phaseName}</Text>
              <Text style={styles.phaseBannerWeeks}>T{phaseData.startWeek}-T{phaseData.endWeek}</Text>
            </View>
            <View style={styles.phaseBannerDetails}>
              <Text style={styles.phaseBannerDetail}>{phaseData.durationWeeks} tjedana</Text>
              <Text style={styles.phaseBannerDetail}>{phaseData.ponavljanja} rep</Text>
              <Text style={styles.phaseBannerDetail}>{phaseData.intenzitet}</Text>
            </View>
          </View>
        )}
        
        {selectedClient && (
          <View style={styles.selectedClientBanner}>
            <Text style={styles.selectedClientText}>
              {getGenderIcon(selectedClient.gender)} {selectedClient.name}
            </Text>
          </View>
        )}

        {/* Goal Selection - Disabled if from annual plan */}
        <Text style={styles.sectionTitle}>Cilj programa {fromAnnualPlan && '(iz plana)'}</Text>
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
        <Text style={styles.sectionTitle}>Razina iskustva</Text>
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

        {/* Duration - samo ako NE dolazimo iz annual plana */}
        {!fromAnnualPlan && (
          <>
            <Text style={styles.sectionTitle}>Trajanje programa</Text>
            <Text style={styles.sectionNote}>Ili definiraj na lenti vremena u sljedećem koraku</Text>
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
          </>
        )}

        {/* Split Selection */}
        <Text style={styles.sectionTitle}>Split tip</Text>
        {SPLITS.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.splitCard, splitType === s.value && styles.splitCardSelected]}
            onPress={() => {
              if (s.value === 'custom') {
                setShowCustomSplitBuilder(true);
              } else {
                setSplitType(s.value);
                setCustomSplit(null);
              }
            }}
          >
            <View style={styles.splitInfo}>
              <Text style={styles.splitLabel}>{s.label}</Text>
              <Text style={styles.splitDescription}>{s.description}</Text>
              {s.value === 'custom' && customSplit && (
                <Text style={styles.customSplitInfo}>✓ {customSplit.naziv} ({customSplit.ukupnoDana} dana)</Text>
              )}
            </View>
            {s.value !== 'custom' && <Text style={styles.splitSessions}>{s.sessionsPerWeek}x</Text>}
          </TouchableOpacity>
        ))}

        {/* Equipment */}
        <Text style={styles.sectionTitle}>Dostupna oprema</Text>
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
          {/* Uvijek isti flow - vrati se na lentu vremena */}
          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(3)}>
            <Text style={styles.primaryButtonText}>← Natrag na lentu vremena</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Initialize mesocycles from phaseData (when coming from annual plan)
  function initializeMesocyclesFromPhase() {
    if (!phaseData) return;
    
    const newMesocycles: Mesocycle[] = [];
    for (let w = 1; w <= phaseData.durationWeeks; w++) {
      newMesocycles.push({
        id: `mc-${w}`,
        weekNumber: w,
        type: phaseData.phaseType as MesocycleType,
        name: `Tjedan ${w}`,
      });
    }
    setMesocycles(newMesocycles);
  }

  // STEP 3: Annual Plan Timeline - Full Year (52 weeks)
  const WEEK_WIDTH_ANNUAL = 24;
  const TRACK_HEIGHT_ANNUAL = 56;
  // Inicijaliziraj faze iz phaseData ako dolazimo iz godišnjeg plana
  const initialAnnualPhases = phaseData ? [{
    id: `phase-${phaseData.mesocycleId || Date.now()}`,
    type: phaseData.phaseType as MesocycleType,
    startWeek: phaseData.startWeek,
    endWeek: phaseData.endWeek,
  }] : [];
  const [annualPhases, setAnnualPhases] = useState<{id: string; type: MesocycleType; startWeek: number; endWeek: number}[]>(initialAnnualPhases);
  const [annualScrollEnabled, setAnnualScrollEnabled] = useState(true);
  const [draggingAnnual, setDraggingAnnual] = useState<{
    phaseIndex: number;
    type: 'left' | 'right';
    startX: number;
    originalStart: number;
    originalEnd: number;
  } | null>(null);
  const [selectedAnnualWeek, setSelectedAnnualWeek] = useState<number | null>(null);
  const [showAnnualPhaseModal, setShowAnnualPhaseModal] = useState(false);
  const annualScrollRef = useRef<ScrollView>(null);

  const MONTHS = ['Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip', 'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro'];
  const WEEKS_PER_MONTH = [5, 4, 4, 5, 4, 4, 5, 4, 5, 4, 4, 5]; // = 52

  function renderStep3() {
    // Drag handlers for annual timeline
    const handleAnnualDragStart = (phaseIndex: number, type: 'left' | 'right', pageX: number) => {
      const phase = annualPhases[phaseIndex];
      if (!phase) return;
      
      setAnnualScrollEnabled(false);
      setDraggingAnnual({
        phaseIndex,
        type,
        startX: pageX,
        originalStart: phase.startWeek,
        originalEnd: phase.endWeek,
      });
    };

    const handleAnnualDragMove = (pageX: number) => {
      if (!draggingAnnual) return;

      const deltaX = pageX - draggingAnnual.startX;
      const deltaWeeks = Math.round(deltaX / WEEK_WIDTH_ANNUAL);

      setAnnualPhases(prev => {
        const newPhases = [...prev];
        const phase = newPhases[draggingAnnual.phaseIndex];
        if (!phase) return prev;

        if (draggingAnnual.type === 'left') {
          let newStart = Math.max(1, draggingAnnual.originalStart + deltaWeeks);
          // Don't overlap previous phase
          if (draggingAnnual.phaseIndex > 0) {
            newStart = Math.max(newPhases[draggingAnnual.phaseIndex - 1].endWeek + 1, newStart);
          }
          newStart = Math.min(phase.endWeek - 1, newStart);
          phase.startWeek = newStart;
        } else {
          let newEnd = Math.min(52, draggingAnnual.originalEnd + deltaWeeks);
          // Don't overlap next phase
          if (draggingAnnual.phaseIndex < newPhases.length - 1) {
            newEnd = Math.min(newPhases[draggingAnnual.phaseIndex + 1].startWeek - 1, newEnd);
          }
          newEnd = Math.max(phase.startWeek + 1, newEnd);
          phase.endWeek = newEnd;
        }
        return newPhases;
      });
    };

    const handleAnnualDragEnd = () => {
      setDraggingAnnual(null);
      setAnnualScrollEnabled(true);
    };

    const handleAnnualWeekPress = (week: number) => {
      // Check if week is in a phase
      const existingPhase = annualPhases.find(p => week >= p.startWeek && week <= p.endWeek);
      if (existingPhase) {
        Alert.alert(
          MESOCYCLE_TYPES.find(m => m.value === existingPhase.type)?.label || existingPhase.type,
          `Tjedni ${existingPhase.startWeek}-${existingPhase.endWeek}`,
          [
            { text: 'Obriši', style: 'destructive', onPress: () => {
              setAnnualPhases(prev => prev.filter(p => p.id !== existingPhase.id));
            }},
            { text: 'Zatvori', style: 'cancel' },
          ]
        );
      } else {
        setSelectedAnnualWeek(week);
        setShowAnnualPhaseModal(true);
      }
    };

    const addAnnualPhase = (type: MesocycleType) => {
      if (selectedAnnualWeek === null) return;
      
      // Find default duration for this type
      const typeConfig = MESOCYCLE_TYPES.find(m => m.value === type);
      const defaultDuration = type === 'deload' ? 1 : 4;
      
      const newPhase = {
        id: `phase-${Date.now()}`,
        type,
        startWeek: selectedAnnualWeek,
        endWeek: Math.min(52, selectedAnnualWeek + defaultDuration - 1),
      };
      
      setAnnualPhases(prev => [...prev, newPhase].sort((a, b) => a.startWeek - b.startWeek));
      setShowAnnualPhaseModal(false);
      setSelectedAnnualWeek(null);
    };

    const timelineWidth = 52 * WEEK_WIDTH_ANNUAL;

    // Calculate total planned weeks
    const totalPlannedWeeks = annualPhases.reduce((sum, p) => sum + (p.endWeek - p.startWeek + 1), 0);

    return (
      <View style={styles.stepContentFull}>
        {/* Header */}
        <View style={styles.annualHeader}>
          <Text style={styles.stepTitle}>Godišnji plan</Text>
          <Text style={styles.annualClientName}>{selectedClient?.name}</Text>
        </View>

        {/* Help Text */}
        <View style={styles.annualHelpSection}>
          {draggingAnnual ? (
            <Text style={styles.annualHelpActive}>Povlacis... Pusti za potvrdu</Text>
          ) : (
            <>
              <Text style={styles.annualHelpText}>Povuci rubove bloka za produživanje</Text>
              <Text style={styles.annualHelpSub}>Tap prazan tjedan = dodaj fazu</Text>
            </>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.annualTimelineContainer}>
          <ScrollView 
            horizontal 
            ref={annualScrollRef}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={annualScrollEnabled}
          >
            <View style={[styles.annualTimeline, { width: timelineWidth + 40 }]}>
              
              {/* Month Labels */}
              <View style={styles.annualMonthRow}>
                {MONTHS.map((month, i) => {
                  let left = 0;
                  for (let j = 0; j < i; j++) {
                    left += WEEKS_PER_MONTH[j] * WEEK_WIDTH_ANNUAL;
                  }
                  return (
                    <View key={i} style={[styles.annualMonthMark, { left, width: WEEKS_PER_MONTH[i] * WEEK_WIDTH_ANNUAL }]}>
                      <Text style={styles.annualMonthLabel}>{month}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Week Numbers */}
              <View style={styles.annualWeekRuler}>
                {Array.from({ length: 52 }, (_, i) => (
                  <View key={i} style={[styles.annualWeekMark, { width: WEEK_WIDTH_ANNUAL }]}>
                    {(i + 1) % 4 === 1 && <Text style={styles.annualWeekLabel}>{i + 1}</Text>}
                  </View>
                ))}
              </View>

              {/* Clickable Week Grid */}
              <View style={styles.annualWeekGrid}>
                {Array.from({ length: 52 }, (_, i) => {
                  const week = i + 1;
                  const isOccupied = annualPhases.some(p => week >= p.startWeek && week <= p.endWeek);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.annualWeekCell, isOccupied && styles.annualWeekCellOccupied]}
                      onPress={() => handleAnnualWeekPress(week)}
                      activeOpacity={0.7}
                    />
                  );
                })}
              </View>

              {/* Phase Blocks */}
              <View style={[styles.annualTrackArea, { height: TRACK_HEIGHT_ANNUAL }]}>
                {annualPhases.map((phase, phaseIndex) => {
                  const mesoType = MESOCYCLE_TYPES.find(m => m.value === phase.type);
                  const left = (phase.startWeek - 1) * WEEK_WIDTH_ANNUAL;
                  const width = (phase.endWeek - phase.startWeek + 1) * WEEK_WIDTH_ANNUAL;
                  const isDragging = draggingAnnual?.phaseIndex === phaseIndex;
                  const bgColor = mesoType?.color || '#FFFFFF';
                  const isLightBg = bgColor === '#FFFFFF' || bgColor === '#E4E4E7' || bgColor === '#D4D4D8';
                  
                  return (
                    <View
                      key={phase.id}
                      style={[
                        styles.annualPhaseBlock,
                        { 
                          left, 
                          width,
                          backgroundColor: bgColor,
                          borderWidth: isDragging ? 2 : 1,
                          borderColor: isDragging ? '#FFF' : 'rgba(255,255,255,0.2)',
                        },
                      ]}
                    >
                      {/* Left Handle */}
                      <View
                        style={styles.annualHandleLeft}
                        onTouchStart={(e) => handleAnnualDragStart(phaseIndex, 'left', e.nativeEvent.pageX)}
                        onTouchMove={(e) => handleAnnualDragMove(e.nativeEvent.pageX)}
                        onTouchEnd={handleAnnualDragEnd}
                      >
                        <View style={styles.annualHandleBar} />
                      </View>

                      {/* Center */}
                      <TouchableOpacity
                        style={styles.annualBlockCenter}
                        onPress={() => handleAnnualWeekPress(phase.startWeek)}
                      >
                        <Text style={[styles.annualBlockLabel, { color: isLightBg ? '#000' : '#FFF' }]}>
                          {mesoType?.label || phase.type}
                        </Text>
                        <Text style={[styles.annualBlockWeeks, { color: isLightBg ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)' }]}>
                          {phase.endWeek - phase.startWeek + 1}t
                        </Text>
                      </TouchableOpacity>

                      {/* Right Handle */}
                      <View
                        style={styles.annualHandleRight}
                        onTouchStart={(e) => handleAnnualDragStart(phaseIndex, 'right', e.nativeEvent.pageX)}
                        onTouchMove={(e) => handleAnnualDragMove(e.nativeEvent.pageX)}
                        onTouchEnd={handleAnnualDragEnd}
                      >
                        <View style={styles.annualHandleBar} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Legend */}
        <View style={styles.annualLegend}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MESOCYCLE_TYPES.map((type) => (
              <TouchableOpacity 
                key={type.value} 
                style={styles.annualLegendItem}
                onPress={() => {
                  // Find first empty week
                  for (let w = 1; w <= 52; w++) {
                    const isOccupied = annualPhases.some(p => w >= p.startWeek && w <= p.endWeek);
                    if (!isOccupied) {
                      setSelectedAnnualWeek(w);
                      addAnnualPhase(type.value);
                      return;
                    }
                  }
                }}
              >
                <View style={[styles.annualLegendColor, { backgroundColor: type.color }]} />
                <Text style={styles.annualLegendText}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={styles.annualStats}>
          <View style={styles.annualStatItem}>
            <Text style={styles.annualStatValue}>{annualPhases.length}</Text>
            <Text style={styles.annualStatLabel}>Faza</Text>
          </View>
          <View style={styles.annualStatItem}>
            <Text style={styles.annualStatValue}>{totalPlannedWeeks}</Text>
            <Text style={styles.annualStatLabel}>Tjedana</Text>
          </View>
          <View style={styles.annualStatItem}>
            <Text style={styles.annualStatValue}>{52 - totalPlannedWeeks}</Text>
            <Text style={styles.annualStatLabel}>Prazno</Text>
          </View>
        </View>

        {/* Phases List */}
        <ScrollView style={styles.annualPhasesList}>
          <Text style={styles.annualPhasesTitle}>PLANIRANE FAZE</Text>
          {annualPhases.length === 0 ? (
            <View style={styles.annualEmpty}>
              <Text style={styles.annualEmptyText}>Nema faza</Text>
              <Text style={styles.annualEmptySub}>Tap na tjedan ili legendu iznad</Text>
            </View>
          ) : (
            annualPhases.map((phase, index) => {
              const mesoType = MESOCYCLE_TYPES.find(m => m.value === phase.type);
              return (
                <View key={phase.id} style={styles.annualPhaseItem}>
                  <View style={[styles.annualPhaseItemColor, { backgroundColor: mesoType?.color || '#FFF' }]} />
                  <View style={styles.annualPhaseItemContent}>
                    <Text style={styles.annualPhaseItemName}>{mesoType?.label}</Text>
                    <Text style={styles.annualPhaseItemWeeks}>T{phase.startWeek} - T{phase.endWeek}</Text>
                  </View>
                  <Text style={styles.annualPhaseItemDuration}>{phase.endWeek - phase.startWeek + 1}t</Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Buttons */}
        <View style={styles.annualButtons}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
            <Text style={styles.secondaryButtonText}>← Klijent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
            <Text style={styles.secondaryButtonText}>⚙️ Postavke</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.primaryButton, annualPhases.length === 0 && styles.buttonDisabled]} 
            onPress={async () => {
              // Generiraj SVE faze odjednom i poveži ih
              if (annualPhases.length > 0) {
                setLoading(true);
                try {
                  // Sortiraj faze po startWeek
                  const sortedPhases = [...annualPhases].sort((a, b) => a.startWeek - b.startWeek);
                  
                  console.log('🎯 [Step3] Generating ALL phases from timeline:', {
                    totalPhases: sortedPhases.length,
                    phases: sortedPhases.map(p => ({ 
                      type: p.type, 
                      start: p.startWeek, 
                      end: p.endWeek,
                      duration: p.endWeek - p.startWeek + 1,
                    })),
                  });
                  
                  // Generiraj sve faze i poveži ih
                  let previousProgramId: string | null = null;
                  const generatedPrograms: Array<{ phaseType: string; programId: string; duration: number; phaseName: string }> = [];
                  const skippedPhases: Array<{ phaseType: string; reason: string; phaseName: string }> = [];
                  const failedPhases: Array<{ phaseType: string; error: string; phaseName: string }> = [];
                  
                  for (let i = 0; i < sortedPhases.length; i++) {
                    const phase = sortedPhases[i];
                    const phaseDuration = phase.endWeek - phase.startWeek + 1;
                    const phaseTypeInfo = MESOCYCLE_TYPES.find(m => m.value === phase.type);
                    
                    // Provjeri validaciju trajanja (API sada podržava 1-16 tjedana)
                    if (phaseDuration < 1 || phaseDuration > 16) {
                      const reason = `Trajanje ${phaseDuration} tjedana je izvan raspona (1-16)`;
                      skippedPhases.push({
                        phaseType: phase.type,
                        reason,
                        phaseName: phaseTypeInfo?.label || phase.type,
                      });
                      console.warn(`⚠️ [Step3] Phase ${i + 1} skipped: ${reason}`);
                      continue;
                    }
                    
                    // Mapiraj tip faze na goal (API očekuje specifične vrijednosti)
                    // Backend ciljevi: 'hipertrofija', 'maksimalna_snaga', 'misicna_izdrzljivost', 'rekreacija_zdravlje'
                    let phaseGoal: string;
                    switch (phase.type) {
                      case 'hipertrofija':
                        phaseGoal = 'hipertrofija';
                        break;
                      case 'jakost':
                      case 'snaga':
                      case 'natjecanje':
                        phaseGoal = 'maksimalna_snaga';
                        break;
                      case 'izdrzljivost':
                        phaseGoal = 'misicna_izdrzljivost';
                        break;
                      case 'priprema':
                        phaseGoal = 'hipertrofija'; // Priprema koristi hipertrofiju kao bazu
                        break;
                      case 'deload':
                      case 'tranzicija':
                        phaseGoal = 'rekreacija_zdravlje'; // Deload i tranzicija koriste rekreaciju
                        break;
                      default:
                        phaseGoal = 'hipertrofija';
                    }
                    
                    console.log(`📋 [Step3] Phase ${i + 1} mapping: ${phase.type} → ${phaseGoal}`);
                    
                    // Provjeri da li imamo sve potrebne podatke
                    if (!selectedClient?.id) {
                      console.error('❌ [Step3] Missing client ID');
                      continue;
                    }
                    
                    // Provjeri da li ima odabrane opreme
                    const selectedEquipment = equipment.filter(e => e.selected).map(e => e.id);
                    if (selectedEquipment.length === 0) {
                      console.warn('⚠️ [Step3] No equipment selected, using defaults');
                    }
                    
                    const requestBody = {
                      clientId: selectedClient.id,
                      cilj: phaseGoal,
                      razina: level || 'srednji',
                      treninziTjedno: trainingFrequency || 4,
                      trajanjeTjedana: phaseDuration,
                      splitTip: splitType || 'upper_lower',
                      dostupnaOprema: selectedEquipment.length > 0 ? selectedEquipment : ['sipka', 'bucice', 'sprava'],
                      // Poveži s prethodnom fazom
                      ...(annualProgramId && { annualProgramId }),
                      ...(previousProgramId && { previousProgramId }),
                      phaseOrder: i + 1,
                      totalPhases: sortedPhases.length,
                    };
                    
                    console.log(`🎯 [Step3] Generating phase ${i + 1}/${sortedPhases.length}:`, {
                      type: phase.type,
                      goal: phaseGoal,
                      duration: phaseDuration,
                      startWeek: phase.startWeek,
                      endWeek: phase.endWeek,
                      requestBody: { ...requestBody, annualProgramId: requestBody.annualProgramId || 'none', previousProgramId: requestBody.previousProgramId || 'none' },
                    });
                    
                    // Generiraj program za ovu fazu
                    const response = await fetch(`${API_BASE_URL}/api/training/generate`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(requestBody),
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      if (result.success && result.data?.programId) {
                        previousProgramId = result.data.programId;
                        generatedPrograms.push({
                          phaseType: phase.type,
                          programId: result.data.programId,
                          duration: phaseDuration,
                          phaseName: phaseTypeInfo?.label || phase.type,
                        });
                        console.log(`✅ [Step3] Phase ${i + 1} generated:`, result.data.programId);
                      } else {
                        const errorMsg = result.error || result.message || 'Unknown error';
                        failedPhases.push({
                          phaseType: phase.type,
                          error: errorMsg,
                          phaseName: phaseTypeInfo?.label || phase.type,
                        });
                        console.error(`❌ [Step3] Phase ${i + 1} generation failed:`, errorMsg, result);
                      }
                    } else {
                      // Pokušaj dohvatiti detalje greške
                      let errorDetails = `Status: ${response.status}`;
                      try {
                        const errorData = await response.json();
                        // Detaljno logiranje za debugging
                        console.error(`❌ [Step3] Phase ${i + 1} error response:`, JSON.stringify(errorData, null, 2));
                        console.error(`❌ [Step3] Request body was:`, JSON.stringify(requestBody, null, 2));
                        
                        // Prikaži sve dostupne detalje greške
                        if (errorData.detalji) {
                          errorDetails = `Validacija: ${JSON.stringify(errorData.detalji)}`;
                        } else if (errorData.error) {
                          errorDetails = errorData.error;
                        } else {
                          errorDetails = JSON.stringify(errorData);
                        }
                        
                        failedPhases.push({
                          phaseType: phase.type,
                          error: typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails),
                          phaseName: phaseTypeInfo?.label || phase.type,
                        });
                        console.error(`❌ [Step3] Failed to generate phase ${i + 1}:`, errorDetails);
                      } catch (e) {
                        failedPhases.push({
                          phaseType: phase.type,
                          error: `${response.status} ${response.statusText}`,
                          phaseName: phaseTypeInfo?.label || phase.type,
                        });
                        console.error(`❌ [Step3] Failed to generate phase ${i + 1}:`, response.status, response.statusText);
                      }
                    }
                  }
                  
                  console.log('🎯 [Step3] Generation complete:', {
                    generated: generatedPrograms.length,
                    skipped: skippedPhases.length,
                    failed: failedPhases.length,
                  });
                  
                  // Prikaži rezultate generiranja
                  let resultMessage = '';
                  if (generatedPrograms.length > 0) {
                    resultMessage += `✅ Uspješno generirano: ${generatedPrograms.length} faza\n`;
                    generatedPrograms.forEach((p, idx) => {
                      resultMessage += `  ${idx + 1}. ${p.phaseName} (${p.duration} tj.)\n`;
                    });
                  }
                  if (skippedPhases.length > 0) {
                    resultMessage += `\n⚠️ Preskočeno: ${skippedPhases.length} faza\n`;
                    skippedPhases.forEach((p, idx) => {
                      resultMessage += `  ${idx + 1}. ${p.phaseName}: ${p.reason}\n`;
                    });
                  }
                  if (failedPhases.length > 0) {
                    resultMessage += `\n❌ Neuspješno: ${failedPhases.length} faza\n`;
                    failedPhases.forEach((p, idx) => {
                      resultMessage += `  ${idx + 1}. ${p.phaseName}: ${p.error}\n`;
                    });
                  }
                  
                  // Prikaži prvu fazu za pregled ako je bilo uspješnih
                  if (generatedPrograms.length > 0) {
                    const firstGeneratedPhase = generatedPrograms[0];
                    const firstPhase = sortedPhases.find(p => p.type === firstGeneratedPhase.phaseType) || sortedPhases[0];
                    const phaseDuration = firstPhase.endWeek - firstPhase.startWeek + 1;
                    const phaseTypeInfo = MESOCYCLE_TYPES.find(m => m.value === firstPhase.type);
                    
                    setDurationWeeks(phaseDuration);
                    setGoal(firstPhase.type === 'hipertrofija' ? 'hipertrofija' :
                           firstPhase.type === 'jakost' ? 'jakost' :
                           firstPhase.type === 'snaga' ? 'snaga' :
                           firstPhase.type === 'izdrzljivost' ? 'izdrzljivost' :
                           'hipertrofija');
                    
                    const programPhaseType = firstPhase.type as MesocycleType;
                    const program = generateMockFullProgram(
                      programPhaseType,
                      phaseTypeInfo?.label || firstPhase.type,
                      phaseDuration
                    );
                    
                    setFullProgram(program);
                    setCurrentWeekIndex(0);
                    setStep(5); // Idi direktno na pregled
                    
                    Alert.alert(
                      'Rezultati generiranja',
                      resultMessage || 'Nema rezultata',
                      [{ text: 'OK' }]
                    );
                  } else {
                    // Nema uspješno generiranih faza
                    Alert.alert(
                      'Greška',
                      resultMessage || 'Nijedna faza nije uspješno generirana. Provjeri postavke i pokušaj ponovno.',
                      [{ text: 'OK' }]
                    );
                  }
                } catch (error) {
                  console.error('Error generating phases:', error);
                  Alert.alert(
                    'Greška',
                    'Greška pri generiranju faza. Pokušaj ponovno.',
                    [{ text: 'OK' }]
                  );
                } finally {
                  setLoading(false);
                }
              }
            }}
            disabled={annualPhases.length === 0 || loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Generiram...' : `Generiraj sve faze (${annualPhases.length > 0 ? annualPhases.reduce((sum, p) => sum + (p.endWeek - p.startWeek + 1), 0) : 0} tj.)`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phase Selector Modal */}
        <Modal visible={showAnnualPhaseModal} animationType="slide" transparent>
          <View style={styles.phaseSelectorOverlay}>
            <View style={styles.phaseSelectorContent}>
              <View style={styles.phaseSelectorHeader}>
                <Text style={styles.phaseSelectorTitle}>Tjedan {selectedAnnualWeek}</Text>
                <TouchableOpacity onPress={() => setShowAnnualPhaseModal(false)}>
                  <Text style={styles.phaseSelectorClose}>X</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.phaseSelectorList}>
                {MESOCYCLE_TYPES.map((phase) => (
                  <TouchableOpacity
                    key={phase.value}
                    style={styles.phaseSelectorItem}
                    onPress={() => addAnnualPhase(phase.value)}
                  >
                    <View style={[styles.phaseSelectorColor, { backgroundColor: phase.color }]} />
                    <View style={styles.phaseSelectorItemInfo}>
                      <Text style={styles.phaseSelectorItemTitle}>{phase.label}</Text>
                      <Text style={styles.phaseSelectorItemDesc}>{phase.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // STEP 3A: Mesocycle Setup - Video Editor Style Timeline
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [showPhaseSelector, setShowPhaseSelector] = useState(false);
  const [timelineScrollEnabled, setTimelineScrollEnabled] = useState(true);
  const [draggingPhase, setDraggingPhase] = useState<{
    phaseIndex: number;
    type: 'left' | 'right';
    startX: number;
    originalStart: number;
    originalEnd: number;
  } | null>(null);
  const timelineScrollRef = useRef<ScrollView>(null);

  // Video Editor Style Timeline Constants
  const WEEK_WIDTH_BUILDER = 28;
  const TRACK_HEIGHT_BUILDER = 56;
  const HANDLE_WIDTH_BUILDER = 14;

  function renderStep3A() {
    // Grupiraj tjedne po fazama za vizualizaciju
    const phases: { type: MesocycleType; startWeek: number; endWeek: number }[] = [];
    let currentPhase: { type: MesocycleType; startWeek: number; endWeek: number } | null = null;

    mesocycles.forEach((mc) => {
      if (!currentPhase || currentPhase.type !== mc.type) {
        if (currentPhase) phases.push(currentPhase);
        currentPhase = { type: mc.type, startWeek: mc.weekNumber, endWeek: mc.weekNumber };
      } else {
        currentPhase.endWeek = mc.weekNumber;
      }
    });
    if (currentPhase) phases.push(currentPhase);

    // Drag handlers
    const handlePhaseDragStart = (phaseIndex: number, type: 'left' | 'right', pageX: number) => {
      const phase = phases[phaseIndex];
      if (!phase) return;
      
      setTimelineScrollEnabled(false);
      setDraggingPhase({
        phaseIndex,
        type,
        startX: pageX,
        originalStart: phase.startWeek,
        originalEnd: phase.endWeek,
      });
    };

    const handlePhaseDragMove = (pageX: number) => {
      if (!draggingPhase) return;

      const deltaX = pageX - draggingPhase.startX;
      const deltaWeeks = Math.round(deltaX / WEEK_WIDTH_BUILDER);

      const phase = phases[draggingPhase.phaseIndex];
      if (!phase) return;

      let newStart = draggingPhase.originalStart;
      let newEnd = draggingPhase.originalEnd;

      if (draggingPhase.type === 'left') {
        // Pomakni lijevi rub
        newStart = Math.max(1, Math.min(draggingPhase.originalEnd - 1, draggingPhase.originalStart + deltaWeeks));
        // Provjeri da ne prelazimo prethodnu fazu
        if (draggingPhase.phaseIndex > 0) {
          const prevPhase = phases[draggingPhase.phaseIndex - 1];
          newStart = Math.max(prevPhase.endWeek + 1, newStart);
        }
      } else {
        // Pomakni desni rub
        newEnd = Math.max(draggingPhase.originalStart + 1, Math.min(durationWeeks, draggingPhase.originalEnd + deltaWeeks));
        // Provjeri da ne prelazimo sljedeću fazu
        if (draggingPhase.phaseIndex < phases.length - 1) {
          const nextPhase = phases[draggingPhase.phaseIndex + 1];
          newEnd = Math.min(nextPhase.startWeek - 1, newEnd);
        }
      }

      // Ažuriraj mesocycles
      const newMesocycles = mesocycles.map((mc) => {
        if (mc.weekNumber >= newStart && mc.weekNumber <= newEnd) {
          return { ...mc, type: phase.type };
        }
        // Ako je bio u ovoj fazi ali više nije
        if (mc.weekNumber >= draggingPhase.originalStart && mc.weekNumber <= draggingPhase.originalEnd) {
          if (mc.weekNumber < newStart || mc.weekNumber > newEnd) {
            // Postavi na susjednu fazu ili deload
            if (draggingPhase.phaseIndex > 0 && mc.weekNumber < newStart) {
              return { ...mc, type: phases[draggingPhase.phaseIndex - 1].type };
            }
            if (draggingPhase.phaseIndex < phases.length - 1 && mc.weekNumber > newEnd) {
              return { ...mc, type: phases[draggingPhase.phaseIndex + 1].type };
            }
          }
        }
        return mc;
      });
      setMesocycles(newMesocycles);
    };

    const handlePhaseDragEnd = () => {
      setDraggingPhase(null);
      setTimelineScrollEnabled(true);
    };

    const timelineWidth = durationWeeks * WEEK_WIDTH_BUILDER;

    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>Faze programa</Text>
        
        {/* Help Text */}
        <View style={styles.timelineHelpSection}>
          {draggingPhase ? (
            <Text style={styles.timelineHelpActive}>Povlacis... Pusti za potvrdu</Text>
          ) : (
            <>
              <Text style={styles.timelineHelpText}>Povuci rubove bloka za produživanje</Text>
              <Text style={styles.timelineHelpSub}>Tap prazan tjedan = dodaj fazu</Text>
            </>
          )}
        </View>

        {/* Video Editor Style Timeline */}
        <View style={styles.videoTimelineContainer}>
          <ScrollView 
            horizontal 
            ref={timelineScrollRef}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={timelineScrollEnabled}
          >
            <View style={[styles.videoTimeline, { width: timelineWidth + 40 }]}>
              
              {/* Week Numbers */}
              <View style={styles.videoWeekRuler}>
                {Array.from({ length: durationWeeks }, (_, i) => (
                  <View key={i} style={[styles.videoWeekMark, { width: WEEK_WIDTH_BUILDER }]}>
                    <Text style={styles.videoWeekLabel}>{i + 1}</Text>
                  </View>
                ))}
              </View>

              {/* Clickable Week Grid */}
              <View style={styles.videoWeekGrid}>
                {Array.from({ length: durationWeeks }, (_, i) => {
                  const week = i + 1;
                  const mc = mesocycles.find(m => m.weekNumber === week);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.videoWeekCell, mc && styles.videoWeekCellOccupied]}
                      onPress={() => {
                        const idx = mesocycles.findIndex(m => m.weekNumber === week);
                        if (idx >= 0) {
                          setSelectedWeekIndex(idx);
                          setShowPhaseSelector(true);
                        }
                      }}
                      activeOpacity={0.7}
                    />
                  );
                })}
              </View>

              {/* Phase Blocks - Draggable */}
              <View style={[styles.videoTrackArea, { height: TRACK_HEIGHT_BUILDER }]}>
                {phases.map((phase, phaseIndex) => {
                  const mesoType = MESOCYCLE_TYPES.find(m => m.value === phase.type);
                  const left = (phase.startWeek - 1) * WEEK_WIDTH_BUILDER;
                  const width = (phase.endWeek - phase.startWeek + 1) * WEEK_WIDTH_BUILDER;
                  const isDragging = draggingPhase?.phaseIndex === phaseIndex;
                  const bgColor = mesoType?.color || '#FFFFFF';
                  const isLightBg = bgColor === '#FFFFFF' || bgColor === '#E4E4E7' || bgColor === '#D4D4D8';
                  
                  return (
                    <View
                      key={phaseIndex}
                      style={[
                        styles.videoPhaseBlock,
                        { 
                          left, 
                          width,
                          backgroundColor: bgColor,
                          borderWidth: isDragging ? 2 : 1,
                          borderColor: isDragging ? '#FFF' : 'rgba(255,255,255,0.2)',
                        },
                      ]}
                    >
                      {/* Left Handle */}
                      <View
                        style={styles.videoHandleLeft}
                        onTouchStart={(e) => handlePhaseDragStart(phaseIndex, 'left', e.nativeEvent.pageX)}
                        onTouchMove={(e) => handlePhaseDragMove(e.nativeEvent.pageX)}
                        onTouchEnd={handlePhaseDragEnd}
                      >
                        <View style={styles.videoHandleBar} />
                      </View>

                      {/* Center */}
                      <TouchableOpacity
                        style={styles.videoBlockCenter}
                        onPress={() => {
                          const idx = mesocycles.findIndex(m => m.weekNumber === phase.startWeek);
                          if (idx >= 0) {
                            setSelectedWeekIndex(idx);
                            setShowPhaseSelector(true);
                          }
                        }}
                      >
                        <Text style={[styles.videoBlockLabel, { color: isLightBg ? '#000' : '#FFF' }]}>
                          {mesoType?.label || phase.type}
                        </Text>
                        <Text style={[styles.videoBlockWeeks, { color: isLightBg ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)' }]}>
                          {phase.endWeek - phase.startWeek + 1}t
                        </Text>
                      </TouchableOpacity>

                      {/* Right Handle */}
                      <View
                        style={styles.videoHandleRight}
                        onTouchStart={(e) => handlePhaseDragStart(phaseIndex, 'right', e.nativeEvent.pageX)}
                        onTouchMove={(e) => handlePhaseDragMove(e.nativeEvent.pageX)}
                        onTouchEnd={handlePhaseDragEnd}
                      >
                        <View style={styles.videoHandleBar} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Legend */}
        <View style={styles.videoLegend}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MESOCYCLE_TYPES.map((type) => (
              <View key={type.value} style={styles.videoLegendItem}>
                <View style={[styles.videoLegendColor, { backgroundColor: type.color }]} />
                <Text style={styles.videoLegendText}>{type.label}</Text>
              </View>
            ))}
          </ScrollView>
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
            <Text style={styles.presetButtonSub}>Hip - Jak</Text>
          </TouchableOpacity>
        </View>

        {/* Current Selection Info */}
        {phases.length > 0 && (
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionInfoTitle}>Struktura programa</Text>
            {phases.map((phase, index) => (
              <View key={index} style={styles.selectionInfoRow}>
                <View style={[styles.selectionInfoDot, { backgroundColor: MESOCYCLE_TYPES.find(m => m.value === phase.type)?.color || '#FFF' }]} />
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
                  <Text style={styles.phaseSelectorClose}>X</Text>
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
                      <View style={[styles.phaseSelectorColor, { backgroundColor: phase.color }]} />
                      <View style={styles.phaseSelectorItemInfo}>
                        <Text style={[styles.phaseSelectorItemTitle, isSelected && styles.phaseSelectorItemTitleSelected]}>
                          {phase.label}
                        </Text>
                        <Text style={styles.phaseSelectorItemDesc}>{phase.description}</Text>
                      </View>
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
        <Text style={styles.stepTitle}> Generiraj tjedni plan</Text>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Sažetak programa</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}> Klijent:</Text>
            <Text style={styles.summaryValue}>{selectedClient?.name} ({selectedClient?.gender === 'male' ? 'M' : 'Ž'})</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}> Cilj:</Text>
            <Text style={styles.summaryValue}>{GOALS.find(g => g.value === goal)?.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}> Razina:</Text>
            <Text style={styles.summaryValue}>{LEVELS.find(l => l.value === level)?.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>🗓️ Split:</Text>
            <Text style={styles.summaryValue}>{SPLITS.find(s => s.value === splitType)?.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}> Trajanje:</Text>
            <Text style={styles.summaryValue}>{durationWeeks} tjedana</Text>
          </View>
          {programMode === 'with_mesocycles' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}> Način:</Text>
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
          onPress={generateFullProgram}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.generateButtonText}>GENERIRAJ PROGRAM ({durationWeeks} tj.)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(programMode === 'with_mesocycles' ? '3A' : 3)}>
          <Text style={styles.secondaryButtonText}>← Natrag</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // STEP 5: Review ALL WEEKS with Navigation
  function renderStep5() {
    if (!fullProgram || fullProgram.weeks.length === 0) return null;

    const currentWeek = fullProgram.weeks[currentWeekIndex];
    if (!currentWeek) return null;

    return (
      <ScrollView style={styles.stepContent}>
        {/* Program Header */}
        <View style={styles.programHeader}>
          <Text style={styles.programTitle}>{fullProgram.phaseName}</Text>
          <Text style={styles.programSubtitle}>{fullProgram.totalWeeks} tjedana</Text>
        </View>

        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity 
            style={[styles.weekNavBtn, currentWeekIndex === 0 && styles.weekNavBtnDisabled]}
            onPress={() => currentWeekIndex > 0 && setCurrentWeekIndex(currentWeekIndex - 1)}
            disabled={currentWeekIndex === 0}
          >
            <Text style={styles.weekNavBtnText}>{'<'}</Text>
          </TouchableOpacity>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekTabs}>
            {fullProgram.weeks.map((week, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekTab,
                  index === currentWeekIndex && styles.weekTabActive,
                  week.isDeload && styles.weekTabDeload,
                ]}
                onPress={() => setCurrentWeekIndex(index)}
              >
                <Text style={[
                  styles.weekTabText,
                  index === currentWeekIndex && styles.weekTabTextActive
                ]}>
                  T{week.weekNumber}
                </Text>
                {week.isDeload && <Text style={styles.weekTabDeloadLabel}>D</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.weekNavBtn, currentWeekIndex === fullProgram.weeks.length - 1 && styles.weekNavBtnDisabled]}
            onPress={() => currentWeekIndex < fullProgram.weeks.length - 1 && setCurrentWeekIndex(currentWeekIndex + 1)}
            disabled={currentWeekIndex === fullProgram.weeks.length - 1}
          >
            <Text style={styles.weekNavBtnText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Week Info */}
        <View style={styles.weekInfoBar}>
          <View style={styles.weekInfoItem}>
            <Text style={styles.weekInfoLabel}>Volumen</Text>
            <Text style={[styles.weekInfoValue, currentWeek.isDeload && styles.weekInfoValueDeload]}>
              {currentWeek.isDeload ? '-40%' : `+${Math.round((currentWeek.volumeModifier - 1) * 100)}%`}
            </Text>
          </View>
          <View style={styles.weekInfoItem}>
            <Text style={styles.weekInfoLabel}>Intenzitet</Text>
            <Text style={[styles.weekInfoValue, currentWeek.isDeload && styles.weekInfoValueDeload]}>
              {currentWeek.isDeload ? '-30%' : `+${Math.round((currentWeek.intensityModifier - 1) * 100)}%`}
            </Text>
          </View>
          <View style={styles.weekInfoItem}>
            <Text style={styles.weekInfoLabel}>Tip</Text>
            <Text style={styles.weekInfoValue}>
              {(() => {
                // Debugging: ispis vrijednosti
                const weekType = currentWeek.mesocycleType;
                const programType = fullProgram.phaseType;
                console.log('🔍 [Step5] Week type display:', { 
                  isDeload: currentWeek.isDeload,
                  weekMesocycleType: weekType, 
                  programPhaseType: programType,
                  programPhaseName: fullProgram.phaseName,
                });
                
                if (currentWeek.isDeload) return 'Deload';
                
                // Koristi weekType ako postoji, inače programType
                const typeToDisplay = weekType || programType;
                const found = MESOCYCLE_TYPES.find(m => m.value === typeToDisplay);
                return found?.label || fullProgram.phaseName;
              })()}
            </Text>
          </View>
        </View>

        {/* Sessions */}
        {currentWeek.sessions.map((session, sessionIndex) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionDay}>{getDayName(session.dayOfWeek)}</Text>
              <Text style={styles.sessionName}>{session.name}</Text>
            </View>

            {session.exercises.map((exercise, exerciseIndex) => (
              <View key={exercise.id} style={styles.exerciseRow}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseNumber}>{exerciseIndex + 1}.</Text>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseParams}>
                      {exercise.sets}x{exercise.repsMin}-{exercise.repsMax} | RIR {exercise.rir} | {exercise.restSeconds}s
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
                    <Text style={styles.exerciseActionText}>Zamijeni</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.exerciseActionButton}
                    onPress={() => handleEditExercise(sessionIndex, exerciseIndex)}
                  >
                    <Text style={styles.exerciseActionText}>Uredi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.addExerciseButton}
              onPress={() => handleAddExercise(sessionIndex)}
            >
              <Text style={styles.addExerciseText}>+ Dodaj vjezbu</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Progress Summary */}
        <View style={styles.progressSummary}>
          <Text style={styles.progressSummaryTitle}>Progresija kroz {fullProgram.totalWeeks} tjedana</Text>
          <View style={styles.progressBar}>
            {fullProgram.weeks.map((week, i) => (
              <View 
                key={i} 
                style={[
                  styles.progressBarSegment,
                  week.isDeload && styles.progressBarSegmentDeload,
                  i === currentWeekIndex && styles.progressBarSegmentActive,
                ]} 
              />
            ))}
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>T1: Bazni</Text>
            <Text style={styles.progressLabel}>Progresija volumena/intenziteta</Text>
            <Text style={styles.progressLabel}>T{fullProgram.totalWeeks}: {fullProgram.weeks[fullProgram.totalWeeks - 1]?.isDeload ? 'Deload' : 'Peak'}</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          {fromAnnualPlan ? (
            // Ako dolazimo iz godišnjeg plana, omogući povratak na lenti vremena
            <>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => {
                // Vrati na lenti vremena (Step 3)
                setStep(3);
              }}>
                <Text style={styles.secondaryButtonText}>Natrag na lenti vremena</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(7)}>
                <Text style={styles.primaryButtonText}>Spremi</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Normalni flow - regeneriraj ili spremi
            <>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(4)}>
                <Text style={styles.secondaryButtonText}>Regeneriraj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(7)}>
                <Text style={styles.primaryButtonText}>Spremi</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  // Edit exercise handler
  function handleEditExercise(sessionIndex: number, exerciseIndex: number) {
    if (!fullProgram) return;
    const week = fullProgram.weeks[currentWeekIndex];
    const exercise = week.sessions[sessionIndex].exercises[exerciseIndex];
    
    Alert.alert(
      exercise.name,
      `Setovi: ${exercise.sets}\nPonavljanja: ${exercise.repsMin}-${exercise.repsMax}\nRIR: ${exercise.rir}\nOdmor: ${exercise.restSeconds}s`,
      [
        { text: 'Odustani', style: 'cancel' },
        { text: '+1 Set', onPress: () => updateExerciseParam(sessionIndex, exerciseIndex, 'sets', exercise.sets + 1) },
        { text: '-1 Set', onPress: () => updateExerciseParam(sessionIndex, exerciseIndex, 'sets', Math.max(1, exercise.sets - 1)) },
        { text: '-1 RIR', onPress: () => updateExerciseParam(sessionIndex, exerciseIndex, 'rir', Math.max(0, exercise.rir - 1)) },
      ]
    );
  }

  // Update exercise parameter
  function updateExerciseParam(sessionIndex: number, exerciseIndex: number, param: keyof Exercise, value: number) {
    if (!fullProgram) return;
    
    setFullProgram(prev => {
      if (!prev) return prev;
      const newWeeks = [...prev.weeks];
      const newSessions = [...newWeeks[currentWeekIndex].sessions];
      const newExercises = [...newSessions[sessionIndex].exercises];
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], [param]: value };
      newSessions[sessionIndex] = { ...newSessions[sessionIndex], exercises: newExercises };
      newWeeks[currentWeekIndex] = { ...newWeeks[currentWeekIndex], sessions: newSessions };
      return { ...prev, weeks: newWeeks };
    });
  }

  // Add exercise handler
  function handleAddExercise(sessionIndex: number) {
    Alert.alert('Dodaj vjezbu', 'Ova funkcija ce otvoriti katalog vjezbi za odabir.');
  }

  // STEP 7: Publish
  function renderStep7() {
    return (
      <ScrollView style={styles.stepContent}>
        <Text style={styles.stepTitle}>Spremi i objavi</Text>
        
        <View style={styles.publishCard}>
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
            <Text style={styles.summaryLabel}>Faza:</Text>
            <Text style={styles.summaryValue}>{fullProgram?.phaseName || GOALS.find(g => g.value === goal)?.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trajanje:</Text>
            <Text style={styles.summaryValue}>{fullProgram?.totalWeeks || durationWeeks} tjedana</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Treninga tjedno:</Text>
            <Text style={styles.summaryValue}>{fullProgram?.weeks[0]?.sessions.length || 4}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ukupno treninga:</Text>
            <Text style={styles.summaryValue}>{(fullProgram?.totalWeeks || durationWeeks) * (fullProgram?.weeks[0]?.sessions.length || 4)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(5)}>
          <Text style={styles.secondaryButtonText}>Natrag na pregled</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishButton, loading && styles.buttonDisabled]}
          onPress={publishProgram}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.publishButtonText}>OBJAVI KLIJENTU</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Custom Split Builder Modal
  function renderCustomSplitBuilder() {
    const [localCustomSplit, setLocalCustomSplit] = useState<CustomSplit>(
      customSplit || {
        naziv: 'Moj Custom Split',
        dani: [],
        ukupnoDana: trainingFrequency,
      }
    );
    const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
    
    const MISICNE_GRUPE = [
      { key: 'prsa', naziv: 'Prsa', kategorija: 'Gornji' },
      { key: 'ledja', naziv: 'Leđa', kategorija: 'Gornji' },
      { key: 'ramena', naziv: 'Ramena', kategorija: 'Gornji' },
      { key: 'biceps', naziv: 'Biceps', kategorija: 'Gornji' },
      { key: 'triceps', naziv: 'Triceps', kategorija: 'Gornji' },
      { key: 'cetveroglavi', naziv: 'Četveroglavi', kategorija: 'Donji' },
      { key: 'straznja_loza', naziv: 'Stražnja loža', kategorija: 'Donji' },
      { key: 'gluteusi', naziv: 'Gluteusi', kategorija: 'Donji' },
      { key: 'listovi', naziv: 'Listovi', kategorija: 'Donji' },
      { key: 'trbusnjaci', naziv: 'Trbušnjaci', kategorija: 'Core' },
    ];
    
    const addDay = () => {
      const newDay: CustomSplitDay = {
        redniBroj: localCustomSplit.dani.length + 1,
        naziv: `Dan ${localCustomSplit.dani.length + 1}`,
        misicneGrupe: [],
      };
      setLocalCustomSplit({
        ...localCustomSplit,
        dani: [...localCustomSplit.dani, newDay],
        ukupnoDana: localCustomSplit.dani.length + 1,
      });
      setEditingDayIndex(localCustomSplit.dani.length);
    };
    
    const removeDay = (index: number) => {
      const newDani = localCustomSplit.dani.filter((_, i) => i !== index).map((d, i) => ({
        ...d,
        redniBroj: i + 1,
      }));
      setLocalCustomSplit({
        ...localCustomSplit,
        dani: newDani,
        ukupnoDana: newDani.length,
      });
    };
    
    const updateDay = (index: number, updates: Partial<CustomSplitDay>) => {
      const newDani = [...localCustomSplit.dani];
      newDani[index] = { ...newDani[index], ...updates };
      setLocalCustomSplit({ ...localCustomSplit, dani: newDani });
    };
    
    const toggleMuscleGroup = (dayIndex: number, muscleKey: string) => {
      const day = localCustomSplit.dani[dayIndex];
      const hasMuscle = day.misicneGrupe.includes(muscleKey);
      updateDay(dayIndex, {
        misicneGrupe: hasMuscle
          ? day.misicneGrupe.filter(m => m !== muscleKey)
          : [...day.misicneGrupe, muscleKey],
      });
    };
    
    const saveCustomSplit = () => {
      if (localCustomSplit.dani.length === 0) {
        Alert.alert('Greška', 'Dodaj barem jedan dan u split');
        return;
      }
      if (localCustomSplit.dani.some(d => d.misicneGrupe.length === 0)) {
        Alert.alert('Greška', 'Svaki dan mora imati barem jednu mišićnu grupu');
        return;
      }
      setCustomSplit(localCustomSplit);
      setSplitType('custom');
      setShowCustomSplitBuilder(false);
    };
    
    if (!showCustomSplitBuilder) return null;
    
    return (
      <Modal
        visible={showCustomSplitBuilder}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCustomSplitBuilder(false)}>
              <Text style={styles.modalCancelText}>Odustani</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Custom Split Builder</Text>
            <TouchableOpacity onPress={saveCustomSplit}>
              <Text style={styles.modalSaveText}>Spremi</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.splitNameInput}
              placeholder="Naziv split-a (npr. Arnold Style)"
              value={localCustomSplit.naziv}
              onChangeText={(text) => setLocalCustomSplit({ ...localCustomSplit, naziv: text })}
            />
            
            <Text style={styles.modalSectionTitle}>Dani ({localCustomSplit.dani.length})</Text>
            
            {localCustomSplit.dani.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.customDayCard}>
                <View style={styles.customDayHeader}>
                  <TextInput
                    style={styles.dayNameInput}
                    value={day.naziv}
                    onChangeText={(text) => updateDay(dayIndex, { naziv: text })}
                    placeholder={`Dan ${dayIndex + 1}`}
                  />
                  <TouchableOpacity
                    style={styles.removeDayButton}
                    onPress={() => removeDay(dayIndex)}
                  >
                    <Text style={styles.removeDayText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.muscleGroupsLabel}>Mišićne grupe:</Text>
                <View style={styles.muscleGroupsGrid}>
                  {MISICNE_GRUPE.map((muscle) => {
                    const isSelected = day.misicneGrupe.includes(muscle.key);
                    return (
                      <TouchableOpacity
                        key={muscle.key}
                        style={[
                          styles.muscleGroupChip,
                          isSelected && styles.muscleGroupChipSelected,
                        ]}
                        onPress={() => toggleMuscleGroup(dayIndex, muscle.key)}
                      >
                        <Text
                          style={[
                            styles.muscleGroupChipText,
                            isSelected && styles.muscleGroupChipTextSelected,
                          ]}
                        >
                          {muscle.naziv}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            
            <TouchableOpacity style={styles.addDayButton} onPress={addDay}>
              <Text style={styles.addDayButtonText}>+ Dodaj dan</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // Replace Exercise Modal
  function renderReplaceModal() {
    if (!exerciseToReplace || !fullProgram) return null;
    
    const currentWeek = fullProgram.weeks[currentWeekIndex];
    if (!currentWeek) return null;

    const currentExercise = currentWeek.sessions[exerciseToReplace.sessionIndex].exercises[exerciseToReplace.exerciseIndex];

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
            <Text style={styles.modalTitle}>Zamjena vjezbe</Text>
            <Text style={styles.modalSubtitle}>Trenutna: {currentExercise.name}</Text>
            
            <Text style={styles.modalSectionTitle}>Predlozene zamjene:</Text>
            
            {mockReplacements.map((replacement) => (
              <TouchableOpacity
                key={replacement.id}
                style={styles.replacementOption}
                onPress={() => {
                  // Replace exercise in current week
                  setFullProgram(prev => {
                    if (!prev) return prev;
                    const newWeeks = [...prev.weeks];
                    const newSessions = [...newWeeks[currentWeekIndex].sessions];
                    const newExercises = [...newSessions[exerciseToReplace.sessionIndex].exercises];
                    newExercises[exerciseToReplace.exerciseIndex] = replacement;
                    newSessions[exerciseToReplace.sessionIndex] = { ...newSessions[exerciseToReplace.sessionIndex], exercises: newExercises };
                    newWeeks[currentWeekIndex] = { ...newWeeks[currentWeekIndex], sessions: newSessions };
                    return { ...prev, weeks: newWeeks };
                  });
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
      <LinearGradient colors={['#0A0A0A', '#171717']} style={styles.gradient}>
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
        {renderCustomSplitBuilder()}
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
  cancelText: { color: '#71717A', fontSize: 16 },
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
  stepCircleActive: { backgroundColor: '#27272A' },
  stepNumber: { color: '#52525B', fontSize: 12, fontWeight: '600' },
  stepNumberActive: { color: '#FFF' },
  stepLabel: { color: '#52525B', fontSize: 10, marginTop: 4 },
  stepLabelActive: { color: '#FFF' },

  // Step Content
  stepContent: { flex: 1, padding: 20 },
  stepTitle: { color: '#FFF', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  stepDescription: { color: '#A1A1AA', fontSize: 14, marginBottom: 20 },

  // Client Selection
  clientCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clientCardSelected: { borderColor: '#FFFFFF' },
  clientInfo: { flex: 1 },
  clientName: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  clientEmail: { color: '#71717A', fontSize: 14 },
  clientMeta: { flexDirection: 'row', marginTop: 8, gap: 12 },
  clientMetaItem: { color: '#A1A1AA', fontSize: 12 },
  checkmark: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#71717A', fontSize: 16 },

  // Selected Client Banner
  // Phase Banner (from Annual Plan)
  phaseBanner: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  phaseBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseBannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  phaseBannerWeeks: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '500',
  },
  phaseBannerDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  phaseBannerDetail: {
    color: '#A1A1AA',
    fontSize: 13,
  },

  selectedClientBanner: {
    backgroundColor: '#27272A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  selectedClientText: { color: '#FFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },

  // Section Title
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 12 },
  sectionNote: { color: '#52525B', fontSize: 12, marginTop: -8, marginBottom: 12 },

  // Options Grid
  optionsGrid: { gap: 10 },
  optionCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: { borderColor: '#FFFFFF' },
  optionLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  optionDescription: { color: '#71717A', fontSize: 13, marginTop: 4 },

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
  optionChipSelected: { borderColor: '#FFFFFF', backgroundColor: '#27272A' },
  optionChipText: { color: '#A1A1AA', fontSize: 14 },
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
  durationChipSelected: { borderColor: '#FFFFFF', backgroundColor: '#27272A' },
  durationText: { color: '#A1A1AA', fontSize: 14 },
  durationTextSelected: { color: '#FFF', fontWeight: '600' },

  // Split
  splitCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  splitCardSelected: { borderColor: '#FFFFFF' },
  splitInfo: { flex: 1 },
  splitLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  splitDescription: { color: '#71717A', fontSize: 13 },
  splitSessions: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

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
  equipmentChipSelected: { borderColor: '#3F3F46', backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  equipmentText: { color: '#A1A1AA', fontSize: 13 },
  equipmentTextSelected: { color: '#3F3F46' },

  // Mode Cards
  modeCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardSelected: { borderColor: '#FFFFFF' },
  modeIcon: { fontSize: 32, marginRight: 16 },
  modeInfo: { flex: 1 },
  modeTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  modeDescription: { color: '#A1A1AA', fontSize: 14, marginTop: 4 },
  modeFeatures: { marginTop: 12 },
  modeFeature: { color: '#3F3F46', fontSize: 13, marginTop: 4 },
  modeFeatureNegative: { color: '#71717A', fontSize: 13, marginTop: 4 },

  // ============================================
  // APPLE-STYLE TIMELINE
  // ============================================
  
  timelineContainer: {
    backgroundColor: '#18181B',
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
    backgroundColor: '#27272A',
    marginHorizontal: 12,
  },
  timeline: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#27272A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timelineWeek: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#3F3F46',
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
    backgroundColor: '#3F3F46',
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

  // ============================================
  // VIDEO EDITOR STYLE TIMELINE
  // ============================================
  
  timelineHelpSection: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  timelineHelpText: {
    color: '#52525B',
    fontSize: 13,
  },
  timelineHelpSub: {
    color: '#3F3F46',
    fontSize: 11,
    marginTop: 2,
  },
  timelineHelpActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  videoTimelineContainer: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  videoTimeline: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  videoWeekRuler: {
    flexDirection: 'row',
    height: 20,
    marginBottom: 6,
  },
  videoWeekMark: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWeekLabel: {
    color: '#3F3F46',
    fontSize: 10,
  },
  videoWeekGrid: {
    flexDirection: 'row',
    height: 20,
    marginBottom: 8,
  },
  videoWeekCell: {
    width: 26,
    height: 20,
    backgroundColor: '#27272A',
    marginRight: 2,
    borderRadius: 3,
  },
  videoWeekCellOccupied: {
    backgroundColor: '#3F3F46',
  },
  videoTrackArea: {
    position: 'relative',
  },
  videoPhaseBlock: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoHandleLeft: {
    width: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  videoHandleRight: {
    width: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  videoHandleBar: {
    width: 3,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
  },
  videoBlockCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  videoBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  videoBlockWeeks: {
    fontSize: 10,
    marginLeft: 4,
  },
  videoLegend: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  videoLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  videoLegendColor: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 5,
  },
  videoLegendText: {
    color: '#52525B',
    fontSize: 10,
  },
  
  phaseSelectorColor: {
    width: 6,
    height: 40,
    borderRadius: 3,
    marginRight: 14,
  },

  // ============================================
  // ANNUAL PLAN TIMELINE (52 weeks)
  // ============================================
  
  stepContentFull: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  annualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  annualClientName: {
    color: '#71717A',
    fontSize: 13,
  },
  annualHelpSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  annualHelpText: {
    color: '#52525B',
    fontSize: 13,
  },
  annualHelpSub: {
    color: '#3F3F46',
    fontSize: 11,
    marginTop: 2,
  },
  annualHelpActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  annualTimelineContainer: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  annualTimeline: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  annualMonthRow: {
    flexDirection: 'row',
    height: 18,
    marginBottom: 4,
    position: 'relative',
  },
  annualMonthMark: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#27272A',
  },
  annualMonthLabel: {
    color: '#52525B',
    fontSize: 9,
    fontWeight: '600',
  },
  annualWeekRuler: {
    flexDirection: 'row',
    height: 14,
    marginBottom: 4,
  },
  annualWeekMark: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  annualWeekLabel: {
    color: '#3F3F46',
    fontSize: 8,
  },
  annualWeekGrid: {
    flexDirection: 'row',
    height: 16,
    marginBottom: 6,
  },
  annualWeekCell: {
    width: 22,
    height: 16,
    backgroundColor: '#27272A',
    marginRight: 2,
    borderRadius: 2,
  },
  annualWeekCellOccupied: {
    backgroundColor: '#3F3F46',
  },
  annualTrackArea: {
    position: 'relative',
  },
  annualPhaseBlock: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  annualHandleLeft: {
    width: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  annualHandleRight: {
    width: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  annualHandleBar: {
    width: 2,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  annualBlockCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  annualBlockLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  annualBlockWeeks: {
    fontSize: 8,
    marginLeft: 3,
  },
  annualLegend: {
    paddingVertical: 8,
  },
  annualLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#18181B',
    borderRadius: 6,
  },
  annualLegendColor: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 5,
  },
  annualLegendText: {
    color: '#71717A',
    fontSize: 11,
  },
  annualStats: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  annualStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  annualStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  annualStatLabel: {
    color: '#52525B',
    fontSize: 10,
    marginTop: 2,
  },
  annualPhasesList: {
    flex: 1,
    marginBottom: 12,
  },
  annualPhasesTitle: {
    color: '#52525B',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  annualEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  annualEmptyText: {
    color: '#52525B',
    fontSize: 14,
  },
  annualEmptySub: {
    color: '#3F3F46',
    fontSize: 12,
    marginTop: 4,
  },
  annualPhaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  annualPhaseItemColor: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  annualPhaseItemContent: {
    flex: 1,
  },
  annualPhaseItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  annualPhaseItemWeeks: {
    color: '#52525B',
    fontSize: 11,
    marginTop: 2,
  },
  annualPhaseItemDuration: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  annualButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
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
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
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
    backgroundColor: '#18181B',
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
    backgroundColor: '#18181B',
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
    borderBottomColor: '#27272A',
  },
  phaseSelectorTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  phaseSelectorClose: {
    color: '#FFFFFF',
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
    backgroundColor: '#27272A',
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  phaseSelectorActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  phaseSelectorActionButton: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  phaseSelectorActionText: {
    color: '#FFFFFF',
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
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { color: '#A1A1AA', fontSize: 14 },
  summaryValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Gender Note
  genderNote: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFFFFF',
  },
  genderNoteTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  genderNoteText: { color: '#A1A1AA', fontSize: 13, marginTop: 4 },

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
  // Program Header
  programHeader: {
    marginBottom: 16,
  },
  programTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
  },
  programSubtitle: {
    color: '#71717A',
    fontSize: 14,
    marginTop: 2,
  },

  // Week Navigation
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 8,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavBtnDisabled: {
    opacity: 0.3,
  },
  weekNavBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  weekTabs: {
    flex: 1,
    marginHorizontal: 8,
  },
  weekTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: '#27272A',
  },
  weekTabActive: {
    backgroundColor: '#FFF',
  },
  weekTabDeload: {
    borderWidth: 1,
    borderColor: '#52525B',
  },
  weekTabText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  weekTabTextActive: {
    color: '#000',
  },
  weekTabDeloadLabel: {
    color: '#52525B',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },

  // Week Info Bar
  weekInfoBar: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  weekInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  weekInfoLabel: {
    color: '#52525B',
    fontSize: 10,
    marginBottom: 2,
  },
  weekInfoValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  weekInfoValueDeload: {
    color: '#71717A',
  },

  // Progress Summary
  progressSummary: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  progressSummaryTitle: {
    color: '#71717A',
    fontSize: 12,
    marginBottom: 12,
  },
  progressBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#27272A',
    marginBottom: 8,
  },
  progressBarSegment: {
    flex: 1,
    backgroundColor: '#52525B',
    marginHorizontal: 1,
  },
  progressBarSegmentDeload: {
    backgroundColor: '#3F3F46',
  },
  progressBarSegmentActive: {
    backgroundColor: '#FFF',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#52525B',
    fontSize: 10,
  },

  sessionCard: {
    backgroundColor: '#18181B',
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
  sessionDay: { color: '#A1A1AA', fontSize: 14 },
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
  exerciseNumber: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', width: 24 },
  exerciseDetails: { flex: 1 },
  exerciseName: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  exerciseParams: { color: '#71717A', fontSize: 12, marginTop: 2 },
  exerciseMuscles: { color: '#FFFFFF', fontSize: 11, marginTop: 2 },
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
  addExerciseText: { color: '#71717A', fontSize: 14 },

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
  publishDescription: { color: '#A1A1AA', fontSize: 14, textAlign: 'center', marginTop: 8 },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#27272A',
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
    backgroundColor: '#3F3F46',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  publishButton: {
    backgroundColor: '#3F3F46',
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
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { color: '#71717A', fontSize: 14, marginBottom: 20 },
  modalSectionTitle: { color: '#A1A1AA', fontSize: 14, marginBottom: 12 },
  replacementOption: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  replacementName: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  replacementMeta: { color: '#71717A', fontSize: 13, marginTop: 4 },
  modalCloseButton: {
    marginTop: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCloseText: { color: '#71717A', fontSize: 16 },
  
  // Custom Split Builder
  customSplitInfo: { color: '#22C55E', fontSize: 12, marginTop: 4 },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  modalCancelText: { color: '#71717A', fontSize: 16 },
  modalSaveText: { color: '#22C55E', fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: 20 },
  splitNameInput: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
  },
  modalSectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  customDayCard: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  customDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayNameInput: {
    flex: 1,
    backgroundColor: '#3F3F46',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
    marginRight: 12,
  },
  removeDayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDayText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  muscleGroupsLabel: {
    color: '#A1A1AA',
    fontSize: 14,
    marginBottom: 8,
  },
  muscleGroupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#3F3F46',
    borderWidth: 1,
    borderColor: '#444',
  },
  muscleGroupChipSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  muscleGroupChipText: {
    color: '#A1A1AA',
    fontSize: 14,
  },
  muscleGroupChipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  addDayButton: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addDayButtonText: {
    color: '#71717A',
    fontSize: 16,
    fontWeight: '600',
  },
});

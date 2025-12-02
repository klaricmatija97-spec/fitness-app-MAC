/**
 * Exercise Database - Baza vježbi
 * 
 * Izvor: wrkout/exercises.json (MIT License)
 * GitHub: https://github.com/wrkout/exercises.json
 * 
 * 873 vježbi s detaljnim uputama, mišićnim grupama i opremom
 */

import exercisesData from '../../data/exercises/wrkout-database.json';

// ============================================
// TYPES
// ============================================

export interface Exercise {
  id: string;
  name: string;
  nameHr?: string;
  force: 'push' | 'pull' | 'static' | null;
  level: 'beginner' | 'intermediate' | 'expert';
  mechanic: 'compound' | 'isolation' | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: 'strength' | 'stretching' | 'plyometrics' | 'strongman' | 'powerlifting' | 'cardio' | 'olympic weightlifting';
}

export type MuscleGroup = 
  | 'quadriceps' | 'shoulders' | 'abdominals' | 'chest' | 'hamstrings'
  | 'triceps' | 'biceps' | 'lats' | 'middle back' | 'calves'
  | 'lower back' | 'forearms' | 'glutes' | 'traps' | 'adductors'
  | 'abductors' | 'neck';

export type EquipmentType = 
  | 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'kettlebell'
  | 'body only' | 'bands' | 'medicine ball' | 'exercise ball'
  | 'foam roll' | 'e-z curl bar' | 'other';

// ============================================
// DATABASE
// ============================================

const exercises: Exercise[] = exercisesData as Exercise[];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Dohvati sve vježbe
 */
export function getAllExercises(): Exercise[] {
  return exercises;
}

/**
 * Dohvati vježbu po ID-u
 */
export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find(e => e.id === id);
}

/**
 * Dohvati vježbu po imenu
 */
export function getExerciseByName(name: string): Exercise | undefined {
  return exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
}

/**
 * Filtriraj vježbe po mišićnoj grupi
 */
export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return exercises.filter(e => 
    e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)
  );
}

/**
 * Filtriraj vježbe po primarnoj mišićnoj grupi
 */
export function getExercisesByPrimaryMuscle(muscle: MuscleGroup): Exercise[] {
  return exercises.filter(e => e.primaryMuscles.includes(muscle));
}

/**
 * Filtriraj vježbe po opremi
 */
export function getExercisesByEquipment(equipment: EquipmentType): Exercise[] {
  return exercises.filter(e => e.equipment === equipment);
}

/**
 * Filtriraj vježbe po razini
 */
export function getExercisesByLevel(level: 'beginner' | 'intermediate' | 'expert'): Exercise[] {
  return exercises.filter(e => e.level === level);
}

/**
 * Filtriraj vježbe po kategoriji
 */
export function getExercisesByCategory(category: Exercise['category']): Exercise[] {
  return exercises.filter(e => e.category === category);
}

/**
 * Filtriraj vježbe po tipu pokreta (push/pull)
 */
export function getExercisesByForce(force: 'push' | 'pull' | 'static'): Exercise[] {
  return exercises.filter(e => e.force === force);
}

/**
 * Filtriraj compound vježbe
 */
export function getCompoundExercises(): Exercise[] {
  return exercises.filter(e => e.mechanic === 'compound');
}

/**
 * Filtriraj isolation vježbe
 */
export function getIsolationExercises(): Exercise[] {
  return exercises.filter(e => e.mechanic === 'isolation');
}

/**
 * Napredna pretraga vježbi
 */
export function searchExercises(options: {
  muscle?: MuscleGroup;
  equipment?: EquipmentType;
  level?: 'beginner' | 'intermediate' | 'expert';
  category?: Exercise['category'];
  force?: 'push' | 'pull' | 'static';
  mechanic?: 'compound' | 'isolation';
  searchTerm?: string;
}): Exercise[] {
  return exercises.filter(e => {
    if (options.muscle && !e.primaryMuscles.includes(options.muscle) && !e.secondaryMuscles.includes(options.muscle)) {
      return false;
    }
    if (options.equipment && e.equipment !== options.equipment) {
      return false;
    }
    if (options.level && e.level !== options.level) {
      return false;
    }
    if (options.category && e.category !== options.category) {
      return false;
    }
    if (options.force && e.force !== options.force) {
      return false;
    }
    if (options.mechanic && e.mechanic !== options.mechanic) {
      return false;
    }
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      return e.name.toLowerCase().includes(term) || 
             e.instructions.some(i => i.toLowerCase().includes(term));
    }
    return true;
  });
}

/**
 * Dohvati nasumične vježbe
 */
export function getRandomExercises(count: number, options?: {
  muscle?: MuscleGroup;
  equipment?: EquipmentType;
  level?: 'beginner' | 'intermediate' | 'expert';
}): Exercise[] {
  let pool = exercises;
  
  if (options) {
    pool = searchExercises(options);
  }
  
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Statistika baze
 */
export function getDatabaseStats() {
  const muscles = new Set(exercises.flatMap(e => e.primaryMuscles));
  const equipment = new Set(exercises.filter(e => e.equipment).map(e => e.equipment));
  const categories = new Set(exercises.map(e => e.category));
  const levels = exercises.reduce((acc, e) => {
    acc[e.level] = (acc[e.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalExercises: exercises.length,
    muscleGroups: muscles.size,
    equipmentTypes: equipment.size,
    categories: [...categories],
    byLevel: levels,
    source: 'wrkout/exercises.json (MIT License)',
    sourceUrl: 'https://github.com/wrkout/exercises.json'
  };
}

// ============================================
// MAPIRANJE NA HRVATSKI
// ============================================

export const MUSCLE_TRANSLATIONS: Record<string, string> = {
  'quadriceps': 'Kvadriceps',
  'shoulders': 'Ramena',
  'abdominals': 'Trbušnjaci',
  'chest': 'Prsa',
  'hamstrings': 'Stražnja loža',
  'triceps': 'Triceps',
  'biceps': 'Biceps',
  'lats': 'Leđa (latissimus)',
  'middle back': 'Srednja leđa',
  'calves': 'Listovi',
  'lower back': 'Donja leđa',
  'forearms': 'Podlaktice',
  'glutes': 'Gluteusi',
  'traps': 'Trapezius',
  'adductors': 'Aduktori',
  'abductors': 'Abduktori',
  'neck': 'Vrat'
};

export const EQUIPMENT_TRANSLATIONS: Record<string, string> = {
  'barbell': 'Šipka',
  'dumbbell': 'Bučice',
  'machine': 'Sprava',
  'cable': 'Kabel',
  'kettlebell': 'Kettlebell',
  'body only': 'Vlastita težina',
  'bands': 'Elastične trake',
  'medicine ball': 'Medicinka',
  'exercise ball': 'Lopta za vježbanje',
  'foam roll': 'Foam roller',
  'e-z curl bar': 'EZ šipka',
  'other': 'Ostalo'
};

export const LEVEL_TRANSLATIONS: Record<string, string> = {
  'beginner': 'Početnik',
  'intermediate': 'Srednji',
  'expert': 'Napredni'
};

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'strength': 'Snaga',
  'stretching': 'Istezanje',
  'plyometrics': 'Pliometrija',
  'strongman': 'Strongman',
  'powerlifting': 'Powerlifting',
  'cardio': 'Kardio',
  'olympic weightlifting': 'Olimpijsko dizanje'
};


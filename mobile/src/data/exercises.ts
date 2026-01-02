/**
 * Exercise Database - 873 vježbe
 * 
 * Izvor: wrkout/exercises.json (MIT License)
 * GitHub: https://github.com/wrkout/exercises.json
 */

import wrkoutDatabase from './wrkout-database.json';

// ============================================
// TYPES
// ============================================

export interface WrkoutExercise {
  id: string;
  name: string;
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

// ============================================
// PRIJEVODI
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
  'kettlebells': 'Kettlebell',
  'body only': 'Vlastita težina',
  'bands': 'Elastične trake',
  'medicine ball': 'Medicinka',
  'exercise ball': 'Lopta za vježbanje',
  'foam roll': 'Foam roller',
  'e-z curl bar': 'EZ šipka',
  'other': 'Ostalo',
  'null': 'Bez opreme'
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

export const LEVEL_TRANSLATIONS: Record<string, string> = {
  'beginner': 'Početnik',
  'intermediate': 'Srednji',
  'expert': 'Napredni'
};

// ============================================
// BAZA VJEŽBI
// ============================================

export const allExercises: WrkoutExercise[] = wrkoutDatabase as WrkoutExercise[];

// ============================================
// HELPER FUNKCIJE
// ============================================

/**
 * Dohvati sve vježbe
 */
export function getAllExercises(): WrkoutExercise[] {
  return allExercises;
}

/**
 * Dohvati vježbu po ID-u
 */
export function getExerciseById(id: string): WrkoutExercise | undefined {
  return allExercises.find(e => e.id === id);
}

/**
 * Dohvati vježbu po imenu
 */
export function getExerciseByName(name: string): WrkoutExercise | undefined {
  return allExercises.find(e => e.name.toLowerCase() === name.toLowerCase());
}

/**
 * Filtriraj vježbe po mišićnoj grupi
 */
export function getExercisesByMuscle(muscle: string): WrkoutExercise[] {
  const muscleLower = muscle.toLowerCase();
  return allExercises.filter(e => 
    e.primaryMuscles.some(m => m.toLowerCase() === muscleLower) ||
    e.secondaryMuscles.some(m => m.toLowerCase() === muscleLower)
  );
}

/**
 * Filtriraj vježbe po primarnoj mišićnoj grupi
 */
export function getExercisesByPrimaryMuscle(muscle: string): WrkoutExercise[] {
  const muscleLower = muscle.toLowerCase();
  return allExercises.filter(e => 
    e.primaryMuscles.some(m => m.toLowerCase() === muscleLower)
  );
}

/**
 * Filtriraj vježbe po opremi
 */
export function getExercisesByEquipment(equipment: string): WrkoutExercise[] {
  return allExercises.filter(e => e.equipment === equipment);
}

/**
 * Filtriraj vježbe po kategoriji
 */
export function getExercisesByCategory(category: string): WrkoutExercise[] {
  return allExercises.filter(e => e.category === category);
}

/**
 * Filtriraj vježbe po razini
 */
export function getExercisesByLevel(level: 'beginner' | 'intermediate' | 'expert'): WrkoutExercise[] {
  return allExercises.filter(e => e.level === level);
}

/**
 * Napredna pretraga
 */
export function searchExercises(options: {
  muscle?: string;
  equipment?: string;
  level?: 'beginner' | 'intermediate' | 'expert';
  category?: string;
  searchTerm?: string;
}): WrkoutExercise[] {
  return allExercises.filter(e => {
    if (options.muscle) {
      const muscleLower = options.muscle.toLowerCase();
      if (!e.primaryMuscles.some(m => m.toLowerCase() === muscleLower) && 
          !e.secondaryMuscles.some(m => m.toLowerCase() === muscleLower)) {
        return false;
      }
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
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      return e.name.toLowerCase().includes(term) || 
             e.primaryMuscles.some(m => m.toLowerCase().includes(term));
    }
    return true;
  });
}

// ============================================
// KATEGORIJE ZA PRIKAZ U MODALU
// ============================================

export const muscleGroupCategories: { id: string; nameHr: string; nameEn: string }[] = [
  { id: 'chest', nameHr: 'Prsa', nameEn: 'chest' },
  { id: 'lats', nameHr: 'Leđa', nameEn: 'lats' },
  { id: 'middle back', nameHr: 'Srednja leđa', nameEn: 'middle back' },
  { id: 'lower back', nameHr: 'Donja leđa', nameEn: 'lower back' },
  { id: 'shoulders', nameHr: 'Ramena', nameEn: 'shoulders' },
  { id: 'biceps', nameHr: 'Biceps', nameEn: 'biceps' },
  { id: 'triceps', nameHr: 'Triceps', nameEn: 'triceps' },
  { id: 'forearms', nameHr: 'Podlaktice', nameEn: 'forearms' },
  { id: 'quadriceps', nameHr: 'Kvadriceps', nameEn: 'quadriceps' },
  { id: 'hamstrings', nameHr: 'Stražnja loža', nameEn: 'hamstrings' },
  { id: 'glutes', nameHr: 'Gluteusi', nameEn: 'glutes' },
  { id: 'calves', nameHr: 'Listovi', nameEn: 'calves' },
  { id: 'abdominals', nameHr: 'Trbušnjaci', nameEn: 'abdominals' },
  { id: 'traps', nameHr: 'Trapezius', nameEn: 'traps' },
  { id: 'adductors', nameHr: 'Aduktori', nameEn: 'adductors' },
  { id: 'abductors', nameHr: 'Abduktori', nameEn: 'abductors' },
  { id: 'neck', nameHr: 'Vrat', nameEn: 'neck' },
];

export const categoryList: { id: string; nameHr: string }[] = [
  { id: 'strength', nameHr: 'Snaga' },
  { id: 'plyometrics', nameHr: 'Pliometrija' },
  { id: 'powerlifting', nameHr: 'Powerlifting' },
  { id: 'olympic weightlifting', nameHr: 'Olimpijsko dizanje' },
  { id: 'strongman', nameHr: 'Strongman' },
  { id: 'cardio', nameHr: 'Kardio' },
  { id: 'stretching', nameHr: 'Istezanje' },
];

// ============================================
// STATISTIKA
// ============================================

export function getDatabaseStats() {
  const muscles = new Set(allExercises.flatMap(e => e.primaryMuscles));
  const equipment = new Set(allExercises.filter(e => e.equipment).map(e => e.equipment));
  const categories = new Set(allExercises.map(e => e.category));
  
  const byCategory: Record<string, number> = {};
  allExercises.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  });

  const byLevel: Record<string, number> = {};
  allExercises.forEach(e => {
    byLevel[e.level] = (byLevel[e.level] || 0) + 1;
  });

  return {
    totalExercises: allExercises.length,
    muscleGroups: muscles.size,
    equipmentTypes: equipment.size,
    categories: [...categories],
    byCategory,
    byLevel,
    source: 'wrkout/exercises.json (MIT License)',
  };
}

/**
 * Exercise Enricher - Obogaćuje vježbe podacima iz wrkout baze
 * 
 * Mapira naše vježbe na wrkout bazu i dodaje:
 * - Detaljne upute za izvođenje
 * - Sekundarne mišiće
 * - Razinu težine
 * - Tip pokreta (push/pull)
 */

import { 
  getAllExercises, 
  Exercise, 
  searchExercises,
  MUSCLE_TRANSLATIONS,
  EQUIPMENT_TRANSLATIONS,
  LEVEL_TRANSLATIONS
} from '../data/exercises-database';

// ============================================
// MAPIRANJE NAŠIH VJEŽBI NA WRKOUT BAZU
// ============================================

/**
 * Mapiranje imena naših vježbi na imena u wrkout bazi
 */
const EXERCISE_NAME_MAP: Record<string, string> = {
  // Prsa
  "Bench press": "Barbell Bench Press - Medium Grip",
  "Incline dumbbell press": "Incline Dumbbell Press",
  "Incline barbell press": "Barbell Incline Bench Press - Medium Grip",
  "Dumbbell bench press": "Dumbbell Bench Press",
  "Cable chest fly": "Cable Crossover",
  "Machine chest press": "Machine Bench Press",
  
  // Ramena
  "Overhead shoulder press": "Standing Military Press",
  "Shoulder press": "Dumbbell Shoulder Press",
  "Lateral raises": "Side Lateral Raise",
  "Front raises": "Front Dumbbell Raise",
  "Face pull": "Face Pull",
  
  // Leđa
  "Lat pulldown": "Wide-Grip Lat Pulldown",
  "Seated cable row": "Seated Cable Rows",
  "T-bar row": "T-Bar Row",
  "Pull-ups": "Pullups",
  "Barbell row": "Bent Over Barbell Row",
  "Dumbbell row": "One-Arm Dumbbell Row",
  "Reverse fly": "Seated Bent-Over Rear Delt Raise",
  "Shrugs": "Barbell Shrug",
  
  // Noge
  "Back squat": "Barbell Squat",
  "Front squat": "Front Barbell Squat",
  "Leg press": "Leg Press",
  "Romanian deadlift": "Romanian Deadlift",
  "Hack squat": "Hack Squat",
  "Leg extension": "Leg Extensions",
  "Leg curl": "Lying Leg Curls",
  "Hip thrust": "Barbell Hip Thrust",
  "Bulgarian split squat": "Single Leg Push-off",
  "Walking lunges": "Barbell Walking Lunge",
  "Calf raises": "Standing Calf Raises",
  "Goblet squat": "Goblet Squat",
  "Sumo deadlift": "Sumo Deadlift",
  
  // Ruke - Triceps
  "Triceps pushdown": "Triceps Pushdown",
  "Triceps rope pushdown": "Triceps Pushdown - Rope Attachment",
  "Overhead triceps extension": "Standing Overhead Barbell Triceps Extension",
  "Dips": "Dips - Triceps Version",
  
  // Ruke - Biceps
  "Barbell curls": "Barbell Curl",
  "Dumbbell curls": "Dumbbell Bicep Curl",
  "Hammer curls": "Hammer Curls",
  "Preacher curl": "Preacher Curl",
  "Cable curl": "Cable Hammer Curls - Rope Attachment",
  "Biceps curls": "Dumbbell Bicep Curl",
  
  // Core
  "Plank": "Plank",
  "Side plank": "Side Bridge",
  "Hanging leg raises": "Hanging Leg Raise",
  "Cable crunch": "Cable Crunch",
  
  // Gluteus
  "Cable glute kickbacks": "Glute Kickback",
  "Hip abductions": "Thigh Abductor",
  "Reverse lunges": "Dumbbell Rear Lunge",
  "Glute bridge": "Butt Lift (Bridge)",
  "Step-ups": "Barbell Step Ups",
};

// ============================================
// ENRICHMENT FUNCTIONS
// ============================================

export interface EnrichedExercise {
  name: string;
  nameHr: string;
  equipment: string;
  isPrimary: boolean;
  // Iz wrkout baze
  instructions?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  level?: string;
  force?: string;
  mechanic?: string;
  category?: string;
}

/**
 * Pronađi vježbu u wrkout bazi po imenu
 */
function findWrkoutExercise(exerciseName: string): Exercise | undefined {
  const allExercises = getAllExercises();
  
  // Prvo pokušaj direktno mapiranje
  const mappedName = EXERCISE_NAME_MAP[exerciseName];
  if (mappedName) {
    const found = allExercises.find(e => 
      e.name.toLowerCase() === mappedName.toLowerCase()
    );
    if (found) return found;
  }
  
  // Zatim pokušaj fuzzy search
  const searchTerm = exerciseName.toLowerCase().replace(/[-_]/g, ' ');
  return allExercises.find(e => 
    e.name.toLowerCase().includes(searchTerm) ||
    searchTerm.includes(e.name.toLowerCase().split(' ')[0])
  );
}

/**
 * Obogati jednu vježbu s podacima iz wrkout baze
 */
export function enrichExercise(exercise: {
  name: string;
  nameHr: string;
  equipment?: string;
  isPrimary: boolean;
}): EnrichedExercise {
  const wrkoutExercise = findWrkoutExercise(exercise.name);
  
  if (wrkoutExercise) {
    return {
      ...exercise,
      equipment: exercise.equipment || wrkoutExercise.equipment || 'body only',
      instructions: wrkoutExercise.instructions,
      primaryMuscles: wrkoutExercise.primaryMuscles,
      secondaryMuscles: wrkoutExercise.secondaryMuscles,
      level: wrkoutExercise.level,
      force: wrkoutExercise.force || undefined,
      mechanic: wrkoutExercise.mechanic || undefined,
      category: wrkoutExercise.category,
    };
  }
  
  return {
    ...exercise,
    equipment: exercise.equipment || 'body only',
  };
}

/**
 * Obogati niz vježbi
 */
export function enrichExercises(exercises: Array<{
  name: string;
  nameHr: string;
  equipment?: string;
  isPrimary: boolean;
}>): EnrichedExercise[] {
  return exercises.map(enrichExercise);
}

/**
 * Dohvati dodatne vježbe iz wrkout baze za određenu mišićnu grupu
 */
export function getAdditionalExercisesFromWrkout(
  muscle: string,
  count: number = 5,
  excludeNames: string[] = []
): Array<{
  name: string;
  nameHr: string;
  equipment: string;
  isPrimary: boolean;
  instructions: string[];
}> {
  // Mapiraj naše nazive mišića na wrkout nazive
  const muscleMap: Record<string, string> = {
    'chest': 'chest',
    'prsa': 'chest',
    'shoulders': 'shoulders',
    'ramena': 'shoulders',
    'back': 'lats',
    'leđa': 'lats',
    'legs': 'quadriceps',
    'noge': 'quadriceps',
    'triceps': 'triceps',
    'biceps': 'biceps',
    'core': 'abdominals',
    'trbušnjaci': 'abdominals',
    'glutes': 'glutes',
    'gluteus': 'glutes',
  };
  
  const wrkoutMuscle = muscleMap[muscle.toLowerCase()] || muscle;
  
  const exercises = searchExercises({
    muscle: wrkoutMuscle as any,
    category: 'strength',
  });
  
  // Filtriraj već korištene
  const filtered = exercises.filter(e => 
    !excludeNames.some(name => 
      e.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(e.name.toLowerCase().split(' ')[0])
    )
  );
  
  // Sortiraj po razini (beginner prvo)
  const sorted = filtered.sort((a, b) => {
    const levelOrder = { beginner: 0, intermediate: 1, expert: 2 };
    return (levelOrder[a.level] || 1) - (levelOrder[b.level] || 1);
  });
  
  return sorted.slice(0, count).map(e => ({
    name: e.name,
    nameHr: e.name, // TODO: dodati hrvatske prijevode
    equipment: e.equipment || 'body only',
    isPrimary: e.mechanic === 'compound',
    instructions: e.instructions,
  }));
}

/**
 * Statistika mapiranja
 */
export function getEnrichmentStats(): {
  totalMapped: number;
  totalInMap: number;
  mappedExercises: string[];
  unmappedExercises: string[];
} {
  const allExercises = getAllExercises();
  const mapped: string[] = [];
  const unmapped: string[] = [];
  
  for (const [ourName, wrkoutName] of Object.entries(EXERCISE_NAME_MAP)) {
    const found = allExercises.find(e => 
      e.name.toLowerCase() === wrkoutName.toLowerCase()
    );
    if (found) {
      mapped.push(ourName);
    } else {
      unmapped.push(ourName);
    }
  }
  
  return {
    totalMapped: mapped.length,
    totalInMap: Object.keys(EXERCISE_NAME_MAP).length,
    mappedExercises: mapped,
    unmappedExercises: unmapped,
  };
}


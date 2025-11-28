/**
 * Workout Plan Generator Service
 * 
 * Generiše tjedni trening plan za klijenta na temelju:
 * - workout_exercises baze
 * - korisničkih podataka (goal, training_days_per_week, training_level, equipment)
 * - ciljeva i opreme
 */

import { createServiceClient } from "@/lib/supabase";
import { getWorkoutExercises } from "@/lib/db/queries";
import type { WorkoutExercise, ExerciseLevel, MuscleGroup, Equipment } from "@/lib/db/models";

const supabase = createServiceClient();

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ClientWorkoutPreferences {
  goal: "lose" | "maintain" | "gain" | "strength";
  training_days_per_week: 3 | 4 | 5;
  training_level: ExerciseLevel; // "beginner" | "intermediate" | "advanced" | "expert"
  available_equipment?: Equipment[]; // Opciono: lista dostupne opreme
}

export interface WorkoutExercisePlan {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  sets: number;
  reps: number | string; // Može biti "8-12" ili broj
  restSeconds: number;
  instructions?: string | null;
  video_url?: string | null;
}

export interface WorkoutDay {
  dayIndex: number;
  name: string; // "Full body A" | "Upper" | "Lower" | "Push" | "Pull" | "Legs"
  exercises: WorkoutExercisePlan[];
  cardioMinutes?: number; // Za lose goal, opciono
}

export interface WorkoutPlan {
  clientId: string;
  daysPerWeek: number;
  goal: string;
  level: string;
  days: WorkoutDay[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Dohvati podatke klijenta i kalkulacije
 */
async function getClientData(clientId: string): Promise<{
  goal: "lose" | "maintain" | "gain";
  training_days_per_week: 3 | 4 | 5;
  training_level: ExerciseLevel;
  available_equipment: Equipment[];
} | null> {
  try {
    // Dohvati klijenta
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Error fetching client:", clientError);
      return null;
    }

    // Dohvati kalkulacije za goal_type
    const { data: calculations, error: calcError } = await supabase
      .from("client_calculations")
      .select("goal_type")
      .eq("client_id", clientId)
      .single();

    // Goal type - koristi iz calculations ili default
    const goal = (calculations?.goal_type as "lose" | "maintain" | "gain") || "maintain";

    // Training days per week - ako postoji polje, inače default 3
    // NAPOMENA: Ovo polje možda ne postoji u bazi - možete ga dodati kasnije
    // Za sada koristimo default ili možemo dodati u clients tablicu
    const training_days_per_week = (client.training_days_per_week as 3 | 4 | 5) || 3;

    // Training level - ako postoji, inače default "beginner"
    // NAPOMENA: Ovo polje možda ne postoji u bazi - možete ga dodati kasnije
    const training_level = (client.training_level as ExerciseLevel) || "beginner";

    // Available equipment - ako postoji array, inače svi tipovi
    // NAPOMENA: Ovo polje možda ne postoji u bazi - možete ga dodati kasnije
    let available_equipment: Equipment[] = [];
    if (client.available_equipment && Array.isArray(client.available_equipment)) {
      available_equipment = client.available_equipment as Equipment[];
    } else {
      // Ako nije navedeno, pretpostavljamo da ima sve (ili barem bodyweight)
      available_equipment = [
        "bodyweight",
        "dumbbells",
        "barbell",
        "kettlebell",
        "cable",
        "machine",
        "resistance-bands",
      ];
    }

    return {
      goal,
      training_days_per_week,
      training_level,
      available_equipment,
    };
  } catch (error) {
    console.error("Error in getClientData:", error);
    throw error;
  }
}

/**
 * Odredi strukturu programa prema broju dana tjedno
 */
function determineProgramStructure(daysPerWeek: 3 | 4 | 5): {
  days: Array<{ dayIndex: number; name: string; muscleGroups: MuscleGroup[] }>;
} {
  if (daysPerWeek === 3) {
    // Full body 3x tjedno
    return {
      days: [
        {
          dayIndex: 1,
          name: "Full body A",
          muscleGroups: ["full-body", "chest", "back", "legs", "shoulders", "arms", "core"],
        },
        {
          dayIndex: 2,
          name: "Full body B",
          muscleGroups: ["full-body", "chest", "back", "legs", "shoulders", "arms", "core"],
        },
        {
          dayIndex: 3,
          name: "Full body C",
          muscleGroups: ["full-body", "chest", "back", "legs", "shoulders", "arms", "core"],
        },
      ],
    };
  } else if (daysPerWeek === 4) {
    // Upper / Lower split
    return {
      days: [
        {
          dayIndex: 1,
          name: "Upper",
          muscleGroups: ["chest", "back", "shoulders", "arms", "biceps", "triceps", "core"],
        },
        {
          dayIndex: 2,
          name: "Lower",
          muscleGroups: ["legs", "quads", "hamstrings", "glutes", "calves", "core"],
        },
        {
          dayIndex: 3,
          name: "Upper",
          muscleGroups: ["chest", "back", "shoulders", "arms", "biceps", "triceps", "core"],
        },
        {
          dayIndex: 4,
          name: "Lower",
          muscleGroups: ["legs", "quads", "hamstrings", "glutes", "calves", "core"],
        },
      ],
    };
  } else {
    // 5 dana → PPL split
    return {
      days: [
        {
          dayIndex: 1,
          name: "Push",
          muscleGroups: ["chest", "shoulders", "triceps", "core"],
        },
        {
          dayIndex: 2,
          name: "Pull",
          muscleGroups: ["back", "biceps", "arms", "core"],
        },
        {
          dayIndex: 3,
          name: "Legs",
          muscleGroups: ["legs", "quads", "hamstrings", "glutes", "calves", "core"],
        },
        {
          dayIndex: 4,
          name: "Push",
          muscleGroups: ["chest", "shoulders", "triceps", "core"],
        },
        {
          dayIndex: 5,
          name: "Pull",
          muscleGroups: ["back", "biceps", "arms", "core"],
        },
      ],
    };
  }
}

/**
 * Odredi setove i ponavljanja prema goal-u
 */
function getSetsAndReps(
  goal: "lose" | "maintain" | "gain" | "strength",
  exercise: WorkoutExercise,
  isCompound: boolean = false
): { sets: number; reps: number | string; restSeconds: number } {
  // Provjeri da li je compound vježba (više mišićnih grupa)
  const compoundExercises = ["chest", "back", "legs", "shoulders"];
  const isCompoundExercise = compoundExercises.some((mg) =>
    exercise.muscle_group.toLowerCase().includes(mg)
  );

  // Za glavne compound vježbe više setova
  const mainExercise = isCompound || isCompoundExercise;

  switch (goal) {
    case "gain":
      // Mišićna masa: 3-4 serije x 8-12 ponavljanja
      return {
        sets: mainExercise ? 4 : 3,
        reps: "8-12",
        restSeconds: 90,
      };

    case "lose":
      // Mršavljenje: 3 serije x 12-20 ponavljanja
      return {
        sets: 3,
        reps: "12-20",
        restSeconds: 60,
      };

    case "strength":
      // Snaga: 4-5 serija x 3-6 ponavljanja (za glavne vježbe)
      if (mainExercise) {
        return {
          sets: 5,
          reps: "3-6",
          restSeconds: 180,
        };
      } else {
        return {
          sets: 3,
          reps: "8-10",
          restSeconds: 90,
        };
      }

    case "maintain":
    default:
      // Održavanje: 3 serije x 10-15 ponavljanja
      return {
        sets: 3,
        reps: "10-15",
        restSeconds: 75,
      };
  }
}

/**
 * Odaberi vježbe za određeni dan
 */
async function selectExercisesForDay(
  muscleGroups: MuscleGroup[],
  availableEquipment: Equipment[],
  maxLevel: ExerciseLevel,
  goal: "lose" | "maintain" | "gain" | "strength",
  existingExerciseIds: Set<string> = new Set()
): Promise<WorkoutExercisePlan[]> {
  try {
    // Dohvati sve vježbe koje odgovaraju filterima
    const allExercises = await getWorkoutExercises({
      muscle_group: muscleGroups,
      equipment: availableEquipment,
    });

    // Filtriraj po levelu (samo one koje su <= maxLevel)
    const levelOrder: ExerciseLevel[] = ["beginner", "intermediate", "advanced", "expert"];
    const maxLevelIndex = levelOrder.indexOf(maxLevel);
    const filteredExercises = allExercises.filter((ex) => {
      const exLevelIndex = levelOrder.indexOf(ex.level);
      return exLevelIndex <= maxLevelIndex;
    });

    // Ukloni već korištene vježbe (izbjegni duplikate u istom danu)
    const availableExercises = filteredExercises.filter(
      (ex) => !existingExerciseIds.has(ex.id)
    );

    if (availableExercises.length === 0) {
      console.warn("Nema dostupnih vježbi za dane filtere");
      return [];
    }

    // Odredi prioritet vježbi:
    // 1. Compound vježbe (više mišićnih grupa)
    // 2. Vježbe koje se poklapaju sa muscle groups
    // 3. Bodyweight vježbe (ako su dostupne) - lakše za početak

    const compoundGroups = ["chest", "back", "legs", "shoulders", "full-body"];
    const priorityExercises: WorkoutExercise[] = [];
    const secondaryExercises: WorkoutExercise[] = [];

    for (const exercise of availableExercises) {
      const isCompound = compoundGroups.some((mg) =>
        exercise.muscle_group.toLowerCase().includes(mg)
      );
      const matchesMuscleGroup = muscleGroups.some((mg) =>
        exercise.muscle_group.toLowerCase().includes(mg.toLowerCase())
      );

      if (isCompound && matchesMuscleGroup) {
        priorityExercises.push(exercise);
      } else if (matchesMuscleGroup) {
        secondaryExercises.push(exercise);
      }
    }

    // Kombiniraj prioritetne i sekundarne vježbe
    const sortedExercises = [...priorityExercises, ...secondaryExercises];

    // Odaberi 4-6 vježbi (varijabilno po tipu programa)
    const numExercises = muscleGroups.length > 4 ? 6 : 4; // Više grupa = više vježbi
    const selectedExercises = sortedExercises.slice(0, numExercises);

    // Generiši plan za svaku vježbu
    const exercisePlan: WorkoutExercisePlan[] = selectedExercises.map((exercise, index) => {
      const isCompound = compoundGroups.some((mg) =>
        exercise.muscle_group.toLowerCase().includes(mg)
      );
      const { sets, reps, restSeconds } = getSetsAndReps(goal, exercise, isCompound);

      return {
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscle_group,
        equipment: exercise.equipment,
        sets,
        reps,
        restSeconds,
        instructions: exercise.instructions,
        video_url: exercise.video_url,
      };
    });

    return exercisePlan;
  } catch (error) {
    console.error("Error selecting exercises for day:", error);
    throw error;
  }
}

// ============================================
// MAIN FUNCTION: generateWorkoutPlanForClient
// ============================================

/**
 * Generiše tjedni trening plan za klijenta
 * 
 * @param clientId - UUID klijenta
 * @returns Promise<WorkoutPlan> - Kompletan tjedni plan treninga
 * 
 * @example
 * const plan = await generateWorkoutPlanForClient("client-uuid");
 */
export async function generateWorkoutPlanForClient(
  clientId: string
): Promise<WorkoutPlan> {
  try {
    // 1. Dohvati podatke klijenta
    const clientData = await getClientData(clientId);
    if (!clientData) {
      throw new Error(`Klijent ${clientId} nije pronađen ili nema dovoljno podataka`);
    }

    const { goal, training_days_per_week, training_level, available_equipment } = clientData;

    // 2. Odredi strukturu programa
    const programStructure = determineProgramStructure(training_days_per_week);

    // 3. Generiši plan za svaki dan
    const workoutDays: WorkoutDay[] = [];
    const allUsedExerciseIds = new Set<string>();

    for (const dayConfig of programStructure.days) {
      // Odaberi vježbe za ovaj dan
      const exercises = await selectExercisesForDay(
        dayConfig.muscleGroups,
        available_equipment,
        training_level,
        goal,
        allUsedExerciseIds
      );

      // Dodaj ID-jeve odabranih vježbi u set (za izbjegavanje duplikata)
      exercises.forEach((ex) => allUsedExerciseIds.add(ex.exerciseId));

      // Ako je goal "lose", dodaj cardio preporuku
      const cardioMinutes = goal === "lose" ? 10 : undefined;

      workoutDays.push({
        dayIndex: dayConfig.dayIndex,
        name: dayConfig.name,
        exercises,
        cardioMinutes,
      });
    }

    // 4. Vrati kompletan plan
    return {
      clientId,
      daysPerWeek: training_days_per_week,
      goal,
      level: training_level,
      days: workoutDays,
    };
  } catch (error) {
    console.error("Error generating workout plan:", error);
    throw error;
  }
}

// ============================================
// SAVE FUNCTION: saveWorkoutPlanToSupabase
// ============================================

/**
 * Spremi generirani trening plan u Supabase tablicu training_plans
 * 
 * @param clientId - UUID klijenta
 * @param plan - Generirani workout plan
 * @returns Promise<Record<string, any>> - Spremljeni zapis iz training_plans
 * 
 * @example
 * const savedPlan = await saveWorkoutPlanToSupabase(clientId, plan);
 */
export async function saveWorkoutPlanToSupabase(
  clientId: string,
  plan: Awaited<ReturnType<typeof generateWorkoutPlanForClient>>
): Promise<Record<string, any>> {
  try {
    // Generiši ime plana
    const planName = `Plan ${plan.daysPerWeek} dana - ${plan.goal}`;

    // Pripremi podatke za spremanje
    // training_plans tablica ima: id, client_id, plan_name, exercises (JSONB), warmup_type, estimated_calories_burned, created_at
    const planData = {
      client_id: clientId,
      plan_name: planName,
      exercises: plan.days, // Spremamo cijeli plan u JSONB polje
      warmup_type: "bodyweight" as const, // Default warmup
      estimated_calories_burned: calculateEstimatedCalories(plan),
    };

    // Spremi u bazu
    const { data, error } = await supabase
      .from("training_plans")
      .insert(planData)
      .select()
      .single();

    if (error) {
      console.error("Error saving workout plan to Supabase:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in saveWorkoutPlanToSupabase:", error);
    throw error;
  }
}

/**
 * Izračunaj procijenjene kalorije koje će se sagorjeti
 * (jednostavna procjena bazirana na broju dana i vježbi)
 */
function calculateEstimatedCalories(plan: WorkoutPlan): number {
  // Prosječno: 1 sat treninga = 300-600 kalorija (ovisno o intenzitetu)
  // Za plan sa više dana i više vježbi = više kalorija
  const baseCaloriesPerDay = 400;
  const caloriesPerExercise = 50;

  let totalCalories = 0;
  for (const day of plan.days) {
    totalCalories += baseCaloriesPerDay + day.exercises.length * caloriesPerExercise;
  }

  // Prosjek po tjednu (za sedam dana)
  return Math.round(totalCalories / 7);
}

// ============================================
// EXPORT
// ============================================

export default {
  generateWorkoutPlanForClient,
  saveWorkoutPlanToSupabase,
};


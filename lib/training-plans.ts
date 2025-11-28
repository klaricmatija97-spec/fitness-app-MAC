import { gymExercises, bodyweightExercises, type Exercise, type MuscleGroup, getExercisesByMuscleGroup, getAlternatives } from "./exercises";

export type TrainingSplit = "push-pull-legs" | "upper-lower" | "full-body";
export type TrainingFrequency = "3-days" | "5-days";
export type TrainingType = "gym" | "circuit-gym" | "circuit-bodyweight";

export interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: string; // "do otkaza" ili broj
  restSeconds: number;
  alternatives: Exercise[];
}

export interface Workout {
  id: string;
  name: string;
  nameHr: string;
  day: number;
  type: TrainingType;
  warmup: {
    type: "treadmill" | "bike" | "bodyweight";
    duration: number; // u minutama
  };
  exercises: WorkoutExercise[];
  coreExercises: WorkoutExercise[]; // Trbuh na kraju
  estimatedCalories: number;
}

export interface TrainingPlan {
  id: string;
  name: string;
  nameHr: string;
  split: TrainingSplit;
  frequency: TrainingFrequency;
  type: TrainingType;
  gender: "male" | "female";
  workouts: Workout[];
}

// Generiranje Push/Pull/Legs plana
function generatePPLPlan(
  frequency: TrainingFrequency,
  gender: "male" | "female",
  type: TrainingType = "gym"
): TrainingPlan {
  const workouts: Workout[] = [];
  
  if (frequency === "3-days") {
    // PPL - 3 dana
    workouts.push(
      createPushDay(1, gender, type),
      createPullDay(2, gender, type),
      createLegsDay(3, gender, type)
    );
  } else {
    // PPL - 5 dana (PPLPP ili PPLPL)
    workouts.push(
      createPushDay(1, gender, type),
      createPullDay(2, gender, type),
      createLegsDay(3, gender, type),
      createPushDay(4, gender, type),
      createPullDay(5, gender, type)
    );
  }

  return {
    id: `ppl-${frequency}-${gender}`,
    name: "Push/Pull/Legs",
    nameHr: "Pritisak/Vlačenje/Noge",
    split: "push-pull-legs",
    frequency,
    type,
    gender,
    workouts,
  };
}

// Push dan (prsni, ramena, triceps)
function createPushDay(day: number, gender: "male" | "female", type: TrainingType): Workout {
  const chestExercises = getExercisesByMuscleGroup("chest");
  const shoulderExercises = getExercisesByMuscleGroup("shoulders");
  const armExercises = getExercisesByMuscleGroup("arms").filter(ex => 
    ex.name.toLowerCase().includes("tricep") || ex.name.toLowerCase().includes("triceps")
  );

  // Provjeri da imamo dovoljno vježbi
  if (chestExercises.length === 0 || shoulderExercises.length === 0) {
    console.warn("Nedovoljno vježbi za Push dan");
  }

  // 4 vježbe za veće skupine (prsni, ramena)
  const mainExercises: WorkoutExercise[] = [
    {
      exercise: chestExercises[0] || gymExercises.find(ex => ex.muscleGroup === "chest") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(chestExercises[0]?.id || ""),
    },
    {
      exercise: chestExercises[1] || chestExercises[0] || gymExercises.find(ex => ex.muscleGroup === "chest") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(chestExercises[1]?.id || chestExercises[0]?.id || ""),
    },
    {
      exercise: shoulderExercises[0] || gymExercises.find(ex => ex.muscleGroup === "shoulders") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(shoulderExercises[0]?.id || ""),
    },
    {
      exercise: shoulderExercises[1] || shoulderExercises[0] || gymExercises.find(ex => ex.muscleGroup === "shoulders") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(shoulderExercises[1]?.id || shoulderExercises[0]?.id || ""),
    },
  ];

  // 2 vježbe za manje skupine (triceps)
  const accessoryExercises: WorkoutExercise[] = [
    {
      exercise: armExercises[0] || gymExercises.find(ex => ex.muscleGroup === "arms" && (ex.name.toLowerCase().includes("tricep") || ex.name.toLowerCase().includes("triceps"))) || gymExercises.find(ex => ex.muscleGroup === "arms") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 60,
      alternatives: getAlternatives(armExercises[0]?.id || ""),
    },
    {
      exercise: armExercises[1] || armExercises[0] || gymExercises.find(ex => ex.muscleGroup === "arms") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 60,
      alternatives: getAlternatives(armExercises[1]?.id || armExercises[0]?.id || ""),
    },
  ];

  // Trbuh
  const coreExercises = getExercisesByMuscleGroup("core");
  const core: WorkoutExercise[] = [
    {
      exercise: coreExercises[0] || gymExercises.find(ex => ex.muscleGroup === "core") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 45,
      alternatives: getAlternatives(coreExercises[0]?.id || ""),
    },
  ];

  return {
    id: `push-day-${day}`,
    name: `Push Day ${day}`,
    nameHr: `Pritisak Dan ${day}`,
    day,
    type,
    warmup: {
      type: day % 2 === 0 ? "bike" : "treadmill",
      duration: 5,
    },
    exercises: [...mainExercises, ...accessoryExercises],
    coreExercises: core,
    estimatedCalories: gender === "male" ? 350 : 280,
  };
}

// Pull dan (leđa, biceps)
function createPullDay(day: number, gender: "male" | "female", type: TrainingType): Workout {
  const backExercises = getExercisesByMuscleGroup("back");
  const armExercises = getExercisesByMuscleGroup("arms").filter(ex => 
    ex.name.toLowerCase().includes("curl") || ex.name.toLowerCase().includes("bicep")
  );

  // 4 vježbe za veće skupine (leđa)
  const mainExercises: WorkoutExercise[] = [
    {
      exercise: backExercises[0] || gymExercises.find(ex => ex.muscleGroup === "back") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(backExercises[0]?.id || ""),
    },
    {
      exercise: backExercises[1] || gymExercises.find(ex => ex.muscleGroup === "back") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(backExercises[1]?.id || ""),
    },
    {
      exercise: backExercises[2] || gymExercises.find(ex => ex.muscleGroup === "back") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(backExercises[2]?.id || ""),
    },
    {
      exercise: backExercises[3] || gymExercises.find(ex => ex.muscleGroup === "back") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(backExercises[3]?.id || ""),
    },
  ];

  // 2 vježbe za manje skupine (biceps)
  const accessoryExercises: WorkoutExercise[] = [
    {
      exercise: armExercises[0] || gymExercises.find(ex => ex.muscleGroup === "arms") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 60,
      alternatives: getAlternatives(armExercises[0]?.id || ""),
    },
    {
      exercise: armExercises[1] || gymExercises.find(ex => ex.muscleGroup === "arms") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 60,
      alternatives: getAlternatives(armExercises[1]?.id || ""),
    },
  ];

  // Trbuh
  const coreExercises = getExercisesByMuscleGroup("core");
  const core: WorkoutExercise[] = [
    {
      exercise: coreExercises[0] || gymExercises.find(ex => ex.muscleGroup === "core") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 45,
      alternatives: getAlternatives(coreExercises[0]?.id || ""),
    },
  ];

  return {
    id: `pull-day-${day}`,
    name: `Pull Day ${day}`,
    nameHr: `Vlačenje Dan ${day}`,
    day,
    type,
    warmup: {
      type: day % 2 === 0 ? "bike" : "treadmill",
      duration: 5,
    },
    exercises: [...mainExercises, ...accessoryExercises],
    coreExercises: core,
    estimatedCalories: gender === "male" ? 380 : 300,
  };
}

// Legs dan (noge)
function createLegsDay(day: number, gender: "male" | "female", type: TrainingType): Workout {
  const legExercises = getExercisesByMuscleGroup("legs");

  // 4 vježbe za veće skupine (noge)
  const mainExercises: WorkoutExercise[] = [
    {
      exercise: legExercises[0] || gymExercises.find(ex => ex.muscleGroup === "legs") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(legExercises[0]?.id || ""),
    },
    {
      exercise: legExercises[1] || gymExercises.find(ex => ex.muscleGroup === "legs") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(legExercises[1]?.id || ""),
    },
    {
      exercise: legExercises[2] || gymExercises.find(ex => ex.muscleGroup === "legs") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(legExercises[2]?.id || ""),
    },
    {
      exercise: legExercises[3] || gymExercises.find(ex => ex.muscleGroup === "legs") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 90,
      alternatives: getAlternatives(legExercises[3]?.id || ""),
    },
  ];

  // 2 vježbe za manje skupine (listovi, trbušnjaci)
  const accessoryExercises: WorkoutExercise[] = [
    {
      exercise: legExercises.find(ex => ex.name.toLowerCase().includes("calf")) || legExercises[4] || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 60,
      alternatives: getAlternatives(legExercises.find(ex => ex.name.toLowerCase().includes("calf"))?.id || ""),
    },
    {
      exercise: legExercises.find(ex => ex.name.toLowerCase().includes("extension")) || legExercises[5] || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 60,
      alternatives: getAlternatives(legExercises.find(ex => ex.name.toLowerCase().includes("extension"))?.id || ""),
    },
  ];

  // Trbuh
  const coreExercises = getExercisesByMuscleGroup("core");
  const core: WorkoutExercise[] = [
    {
      exercise: coreExercises[0] || gymExercises.find(ex => ex.muscleGroup === "core") || gymExercises[0],
      sets: 4,
      reps: "do otkaza",
      restSeconds: 45,
      alternatives: getAlternatives(coreExercises[0]?.id || ""),
    },
  ];

  return {
    id: `legs-day-${day}`,
    name: `Legs Day ${day}`,
    nameHr: `Noge Dan ${day}`,
    day,
    type,
    warmup: {
      type: "bodyweight",
      duration: 5,
    },
    exercises: [...mainExercises, ...accessoryExercises],
    coreExercises: core,
    estimatedCalories: gender === "male" ? 420 : 340,
  };
}

// Generiranje kružnog treninga (teretanske sprave)
function generateCircuitGymPlan(gender: "male" | "female"): TrainingPlan {
  const workouts: Workout[] = [
    {
      id: "circuit-gym-1",
      name: "Circuit Gym Workout",
      nameHr: "Kružni Trening - Teretana",
      day: 1,
      type: "circuit-gym",
      warmup: {
        type: "treadmill",
        duration: 5,
      },
      exercises: [
        // Kombinacija vježbi za cijelo tijelo
        {
          exercise: gymExercises.find(ex => ex.muscleGroup === "chest") || gymExercises[0],
          sets: 3,
          reps: "12-15",
          restSeconds: 30,
          alternatives: getAlternatives(gymExercises.find(ex => ex.muscleGroup === "chest")?.id || ""),
        },
        {
          exercise: gymExercises.find(ex => ex.muscleGroup === "back") || gymExercises[0],
          sets: 3,
          reps: "12-15",
          restSeconds: 30,
          alternatives: getAlternatives(gymExercises.find(ex => ex.muscleGroup === "back")?.id || ""),
        },
        {
          exercise: gymExercises.find(ex => ex.muscleGroup === "legs") || gymExercises[0],
          sets: 3,
          reps: "12-15",
          restSeconds: 30,
          alternatives: getAlternatives(gymExercises.find(ex => ex.muscleGroup === "legs")?.id || ""),
        },
        {
          exercise: gymExercises.find(ex => ex.muscleGroup === "shoulders") || gymExercises[0],
          sets: 3,
          reps: "12-15",
          restSeconds: 30,
          alternatives: getAlternatives(gymExercises.find(ex => ex.muscleGroup === "shoulders")?.id || ""),
        },
      ],
      coreExercises: [
        {
          exercise: gymExercises.find(ex => ex.muscleGroup === "core") || gymExercises[0],
          sets: 3,
          reps: "do otkaza",
          restSeconds: 30,
          alternatives: getAlternatives(gymExercises.find(ex => ex.muscleGroup === "core")?.id || ""),
        },
      ],
      estimatedCalories: gender === "male" ? 400 : 320,
    },
  ];

  return {
    id: `circuit-gym-${gender}`,
    name: "Circuit Gym",
    nameHr: "Kružni Trening - Teretana",
    split: "full-body",
    frequency: "3-days",
    type: "circuit-gym",
    gender,
    workouts,
  };
}

// Generiranje kružnog treninga (vlastito tijelo + tabata)
function generateCircuitBodyweightPlan(gender: "male" | "female"): TrainingPlan {
  const workouts: Workout[] = [
    {
      id: "circuit-bodyweight-1",
      name: "Circuit Bodyweight + Tabata",
      nameHr: "Kružni Trening - Vlastito Tijelo + Tabata",
      day: 1,
      type: "circuit-bodyweight",
      warmup: {
        type: "bodyweight",
        duration: 5,
      },
      exercises: [
        {
          exercise: bodyweightExercises.find(ex => ex.id === "push-up") || bodyweightExercises[0],
          sets: 3,
          reps: "do otkaza",
          restSeconds: 30,
          alternatives: getAlternatives("push-up"),
        },
        {
          exercise: bodyweightExercises.find(ex => ex.id === "squat-bodyweight") || bodyweightExercises[0],
          sets: 3,
          reps: "do otkaza",
          restSeconds: 30,
          alternatives: getAlternatives("squat-bodyweight"),
        },
        {
          exercise: bodyweightExercises.find(ex => ex.id === "burpees") || bodyweightExercises[0],
          sets: 3,
          reps: "20 sekundi (Tabata)",
          restSeconds: 10,
          alternatives: getAlternatives("burpees"),
        },
        {
          exercise: bodyweightExercises.find(ex => ex.id === "mountain-climbers") || bodyweightExercises[0],
          sets: 3,
          reps: "20 sekundi (Tabata)",
          restSeconds: 10,
          alternatives: getAlternatives("mountain-climbers"),
        },
      ],
      coreExercises: [
        {
          exercise: bodyweightExercises.find(ex => ex.muscleGroup === "core") || bodyweightExercises[0],
          sets: 3,
          reps: "do otkaza",
          restSeconds: 30,
          alternatives: getAlternatives(bodyweightExercises.find(ex => ex.muscleGroup === "core")?.id || ""),
        },
      ],
      estimatedCalories: gender === "male" ? 350 : 280,
    },
  ];

  return {
    id: `circuit-bodyweight-${gender}`,
    name: "Circuit Bodyweight",
    nameHr: "Kružni Trening - Vlastito Tijelo",
    split: "full-body",
    frequency: "3-days",
    type: "circuit-bodyweight",
    gender,
    workouts,
  };
}

// Glavna funkcija za generiranje plana treninga
export function generateTrainingPlan(
  split: TrainingSplit,
  frequency: TrainingFrequency,
  type: TrainingType,
  gender: "male" | "female"
): TrainingPlan {
  if (type === "circuit-gym") {
    return generateCircuitGymPlan(gender);
  }
  
  if (type === "circuit-bodyweight") {
    return generateCircuitBodyweightPlan(gender);
  }

  // Gym splitovi
  if (split === "push-pull-legs") {
    return generatePPLPlan(frequency, gender, type);
  }

  // Default PPL
  return generatePPLPlan(frequency, gender, type);
}


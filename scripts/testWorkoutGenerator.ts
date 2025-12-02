/**
 * Test script za Workout Plan Generator V2
 * 
 * Pokreni: npx ts-node scripts/testWorkoutGenerator.ts
 */

import { generateWorkoutPlan, getAvailablePrograms, UserInputs } from "../lib/services/workoutPlanGeneratorV2.js";

// Test cases
const testCases: UserInputs[] = [
  // Test 1: Muški početnik, gubitak masnoće, 3x tjedno, cardio
  {
    gender: "muško",
    age: 30,
    height: 180,
    weight: 85,
    level: "početnik",
    primaryGoal: "gubiti masnoću",
    trainingDaysPerWeek: 3,
    sessionDuration: 60,
    selectedProgram: "PPL",
    wantsCardio: true,
    cardioType: "trčanje",
    wantsPlyometrics: false,
  },
  // Test 2: Ženski srednji, mišićna masa, 4x tjedno
  {
    gender: "žensko",
    age: 28,
    height: 165,
    weight: 60,
    level: "srednji",
    primaryGoal: "povećati mišićnu masu",
    trainingDaysPerWeek: 4,
    sessionDuration: 60,
    selectedProgram: "GLUTE_LEGS",
    wantsCardio: false,
    wantsPlyometrics: false,
  },
  // Test 3: Muški napredni, snaga, 5x tjedno, pliometrija
  {
    gender: "muško",
    age: 35,
    height: 175,
    weight: 90,
    level: "napredni",
    primaryGoal: "povećati snagu",
    trainingDaysPerWeek: 5,
    sessionDuration: 75,
    selectedProgram: "PPL",
    wantsCardio: false,
    wantsPlyometrics: true,
  },
  // Test 4: Ženski početnik, brzina, 3x tjedno, pliometrija
  {
    gender: "žensko",
    age: 22,
    height: 170,
    weight: 55,
    level: "početnik",
    primaryGoal: "povećati brzinu",
    trainingDaysPerWeek: 3,
    sessionDuration: 45,
    selectedProgram: "UPPER_LOWER",
    wantsCardio: false,
    wantsPlyometrics: true,
  },
  // Test 5: Muški stariji (45+), održavanje, Full Body
  {
    gender: "muško",
    age: 48,
    height: 178,
    weight: 82,
    level: "srednji",
    primaryGoal: "gubiti masnoću",
    trainingDaysPerWeek: 3,
    sessionDuration: 60,
    selectedProgram: "FULL_BODY_AB",
    wantsCardio: true,
    cardioType: "hodanje",
    wantsPlyometrics: false,
  },
];

console.log("🏋️ WORKOUT PLAN GENERATOR V2 - TEST\n");
console.log("=".repeat(60));

// Test available programs
console.log("\n📋 Dostupni programi:\n");
console.log("MUŠKI:");
getAvailablePrograms("muško").forEach((p) => {
  console.log(`  - ${p.name}: ${p.description}`);
});
console.log("\nŽENSKI:");
getAvailablePrograms("žensko").forEach((p) => {
  console.log(`  - ${p.name}: ${p.description}`);
});

console.log("\n" + "=".repeat(60));
console.log("\n🧪 TESTOVI GENERIRANJA PLANOVA:\n");

testCases.forEach((testInput, index) => {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`TEST ${index + 1}: ${testInput.gender.toUpperCase()} | ${testInput.level} | ${testInput.primaryGoal}`);
  console.log(`${"─".repeat(60)}`);
  
  console.log(`\n📊 Input:`);
  console.log(`  Spol: ${testInput.gender}`);
  console.log(`  Dob: ${testInput.age} god`);
  console.log(`  Visina/Težina: ${testInput.height}cm / ${testInput.weight}kg`);
  console.log(`  Razina: ${testInput.level}`);
  console.log(`  Cilj: ${testInput.primaryGoal}`);
  console.log(`  Treninga tjedno: ${testInput.trainingDaysPerWeek}x`);
  console.log(`  Trajanje: ${testInput.sessionDuration} min`);
  console.log(`  Program: ${testInput.selectedProgram}`);
  console.log(`  Cardio: ${testInput.wantsCardio ? testInput.cardioType : "Ne"}`);
  console.log(`  Pliometrija: ${testInput.wantsPlyometrics ? "Da" : "Ne"}`);

  try {
    const plan = generateWorkoutPlan(testInput);
    
    console.log(`\n✅ Plan generiran uspješno!`);
    console.log(`\n📅 Tjedni plan (${plan.programType}):`);
    
    plan.days.forEach((day) => {
      console.log(`\n  ${day.dayName} (${day.splitName || day.type}):`);
      
      if (day.exercises && day.exercises.length > 0) {
        console.log(`    Vježbe (${day.exercises.length}):`);
        day.exercises.forEach((ex, i) => {
          console.log(`      ${i + 1}. ${ex.nameHr}`);
          console.log(`         ${ex.sets} x ${ex.reps} | Odmor: ${ex.restSeconds}s | RPE: ${ex.rpe}`);
        });
      }
      
      if (day.cardio) {
        console.log(`    Cardio: ${day.cardio.type} - ${day.cardio.duration} min`);
        console.log(`      ${day.cardio.protocol}`);
      }
      
      if (day.plyometrics) {
        console.log(`    Pliometrija (${day.plyometrics.totalDuration} min):`);
        day.plyometrics.exercises.forEach((ex, i) => {
          console.log(`      ${i + 1}. ${ex.nameHr} - ${ex.sets}x${ex.reps}`);
        });
      }
      
      console.log(`    ⏱️ Procijenjeno trajanje: ${day.estimatedDuration} min`);
    });
    
    console.log(`\n📈 Tjedni volumen:`);
    console.log(`  Strength dana: ${plan.weeklyVolume.strengthDays}`);
    console.log(`  Cardio dana: ${plan.weeklyVolume.cardioDays}`);
    console.log(`  Pliometrija dana: ${plan.weeklyVolume.plyometricsDays}`);
    console.log(`  Ukupno minuta: ${plan.weeklyVolume.totalMinutes}`);
    
    console.log(`\n💡 Preporuke:`);
    plan.recommendations.forEach((rec) => {
      console.log(`  ${rec}`);
    });
    
  } catch (error) {
    console.log(`\n❌ Greška: ${error}`);
  }
});

console.log("\n" + "=".repeat(60));
console.log("✅ Svi testovi završeni!");
console.log("=".repeat(60) + "\n");


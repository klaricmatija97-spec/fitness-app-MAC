/**
 * DEBUG TEST SCENARIOS
 * 
 * Interni test alat za provjeru generatora plana prehrane.
 * Koristi se samo za development/debugging.
 */

import type { UserProfile, NutritionTargets, DayPlan, MealWithType } from "./generator";
import { validateUserInput } from "./validation";
import { generateWeeklyPlan } from "./generator";
import { calculateMacros, type Gender } from "@/lib/services/macroCalculator";
import mealComponentsData from "../data/meal_components.json";
import { findNamirnica, calculateMacrosForGrams } from "../data/foods-database";

// ============================================
// KONVERZIJA JELA
// ============================================

/**
 * Konvertira jela iz meal_components.json u MealWithType[] format.
 */
function convertMealsToMealWithType(): MealWithType[] {
  const allMeals: MealWithType[] = [];
  
  // Prođi kroz sve tipove obroka
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
  
  for (const mealType of mealTypes) {
    const meals = (mealComponentsData as any)[mealType] || [];
    
    for (const meal of meals) {
      // Izračunaj makroe za jelo
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      
      for (const component of meal.components || []) {
        const namirnica = findNamirnica(component.food);
        if (namirnica) {
          const macros = calculateMacrosForGrams(namirnica, component.grams);
          totalCalories += macros.calories;
          totalProtein += macros.protein;
          totalCarbs += macros.carbs;
          totalFat += macros.fat;
        }
      }
      
      // Mapiraj tip obroka
      // Generator koristi "snack" za sve snack obroke, a zatim ih mapira na snack1, snack2, snack3
      // Ovdje koristimo "snack" kao tip, a generator će odabrati pravi slot
      const mappedType = mealType;
      
      allMeals.push({
        id: meal.id,
        type: mappedType,
        name: meal.name,
        kcal: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        // Dodatna polja
        description: meal.description,
        image: meal.image,
        preparationTip: meal.preparationTip,
        components: meal.components,
        tags: meal.tags,
        suitableFor: meal.suitableFor,
      });
    }
  }
  
  return allMeals;
}

// ============================================
// TEST KORISNICI
// ============================================

const TEST_USERS: UserProfile[] = [
  {
    name: "Test 1 - Mršavljenje, muško",
    age: 28,
    gender: "male",
    height: 180,
    weight: 85,
    activityLevel: "moderate",
    goal: "lose_weight",
    meals_per_day: 4,
    allergies: [],
    dislikes: [],
    favorites: [],
  },
  {
    name: "Test 2 - Održavanje, žensko",
    age: 32,
    gender: "female",
    height: 165,
    weight: 60,
    activityLevel: "low",
    goal: "maintain_weight",
    meals_per_day: 3,
    allergies: [],
    dislikes: [],
    favorites: [],
  },
  {
    name: "Test 3 - Masa, muško, aktivan",
    age: 24,
    gender: "male",
    height: 185,
    weight: 78,
    activityLevel: "high",
    goal: "gain_weight",
    meals_per_day: 5,
    allergies: [],
    dislikes: [],
    favorites: [],
  },
  {
    name: "Test 4 - Mršavljenje, žensko, 6 obroka",
    age: 40,
    gender: "female",
    height: 170,
    weight: 90,
    activityLevel: "moderate",
    goal: "lose_weight",
    meals_per_day: 6,
    allergies: ["mlijeko"],
    dislikes: [],
    favorites: [],
  },
  {
    name: "Test 5 - Održavanje, muško, alergije",
    age: 35,
    gender: "male",
    height: 178,
    weight: 82,
    activityLevel: "low",
    goal: "maintain_weight",
    meals_per_day: 3,
    allergies: ["jaja", "kikiriki"],
    dislikes: [],
    favorites: [],
  },
];

// ============================================
// HELPER FUNKCIJE
// ============================================

/**
 * Mapira activity level string na broj (1-5)
 */
function mapActivityLevelToNumber(activityLevel: string): number {
  const mapping: Record<string, number> = {
    low: 2,        // Light
    moderate: 3,   // Moderate
    high: 4,       // Active
    very_high: 5,  // Very Active
  };
  return mapping[activityLevel] || 2;
}

/**
 * Mapira goal string na GoalType
 */
function mapGoalToGoalType(goal: string): "lose" | "maintain" | "gain" {
  if (goal === "lose_weight" || goal === "lose") return "lose";
  if (goal === "maintain_weight" || goal === "maintain") return "maintain";
  if (goal === "gain_weight" || goal === "gain") return "gain";
  return "maintain"; // default
}

/**
 * Izračunava dnevne ciljeve (NutritionTargets) iz UserProfile
 */
function calculateDailyTargets(user: UserProfile): NutritionTargets {
  // Konvertuj UserProfile u User format za calculateMacros
  const activityLevelNum = mapActivityLevelToNumber(user.activityLevel || "moderate");
  const goalType = mapGoalToGoalType(user.goal || user.goalType || "maintain_weight");
  
  const macroResult = calculateMacros({
    age: user.age || 30,
    gender: (user.gender || "male") as Gender,
    weight: user.weight || 70,
    height: user.height || 175,
    activityLevel: activityLevelNum,
    goal: goalType,
  });

  return {
    kcal: macroResult.calories,
    protein: macroResult.protein,
    fat: macroResult.fat,
    carbs: macroResult.carbs,
  };
}

/**
 * Evaluira dnevni plan prema targetu.
 * 
 * @param targetKcal - Ciljne kalorije
 * @param actualKcal - Stvarne kalorije
 * @returns Objekt s diff, diffPercent i status
 */
function evaluateDay(
  targetKcal: number,
  actualKcal: number
): { diff: number; diffPercent: number; status: "PASS" | "FAIL" } {
  const diff = actualKcal - targetKcal;
  const diffPercent = (diff / targetKcal) * 100;
  const status: "PASS" | "FAIL" = Math.abs(diffPercent) <= 10 ? "PASS" : "FAIL";

  return { diff, diffPercent, status };
}

// ============================================
// GLAVNA FUNKCIJA
// ============================================

/**
 * Pokreće test scenarije za 5 fiksnih korisnika.
 * Ako allMeals nije proslijeđen, automatski učitava jela iz meal_components.json.
 * 
 * @param allMeals - Sva dostupna jela (opcionalno, ako nije proslijeđeno, učitava se automatski)
 */
export function runTestScenarios(allMeals?: MealWithType[]): void {
  // Ako nisu proslijeđena jela, učitaj ih automatski
  const meals = allMeals || convertMealsToMealWithType();
  console.log("\n🧪 POKRETANJE TEST SCENARIJA ZA GENERATOR PLANA PREHRANE\n");
  console.log("=".repeat(80));

  for (const testUser of TEST_USERS) {
    console.log("\n" + "=".repeat(80));
    console.log(`📋 ${testUser.name}`);
    console.log("=".repeat(80));

    // 1. Validiraj korisničke podatke
    const inputErrors = validateUserInput(testUser);
    if (inputErrors.length > 0) {
      console.log("❌ Input errors:", inputErrors);
      console.log("\n");
      continue;
    }

    // 2. Izračunaj dnevne ciljeve
    const dailyTargets = calculateDailyTargets(testUser);
    console.log(`🎯 Dnevni ciljevi: ${dailyTargets.kcal.toFixed(0)} kcal, P: ${dailyTargets.protein}g, C: ${dailyTargets.carbs}g, F: ${dailyTargets.fat}g`);

    // 3. Generiraj tjedni plan
    let weeklyPlan: DayPlan[];
    try {
      weeklyPlan = generateWeeklyPlan(testUser, dailyTargets, meals);
    } catch (error) {
      console.log(`❌ Greška pri generiranju plana: ${error}`);
      console.log("\n");
      continue;
    }

    // 4. Evaluiraj svaki dan
    console.log("\n📊 Evaluacija dnevnih planova:");
    let totalDiff = 0;
    let totalDiffPercent = 0;
    let passCount = 0;
    let failCount = 0;

    for (let dayIndex = 0; dayIndex < weeklyPlan.length; dayIndex++) {
      const dayPlan = weeklyPlan[dayIndex];
      const evaluation = evaluateDay(dailyTargets.kcal, dayPlan.totalKcal);

      totalDiff += evaluation.diff;
      totalDiffPercent += evaluation.diffPercent;
      if (evaluation.status === "PASS") {
        passCount++;
      } else {
        failCount++;
      }

      console.log(
        `  Dan ${dayIndex + 1}: target=${dailyTargets.kcal.toFixed(0)} kcal, ` +
        `actual=${dayPlan.totalKcal.toFixed(0)} kcal, ` +
        `diff=${evaluation.diff.toFixed(0)} kcal (${evaluation.diffPercent.toFixed(1)}%), ` +
        `status=${evaluation.status}`
      );
    }

    // 5. Prosječne vrijednosti
    const avgDiff = totalDiff / weeklyPlan.length;
    const avgDiffPercent = totalDiffPercent / weeklyPlan.length;
    console.log(`\n📈 Prosjek: diff=${avgDiff.toFixed(0)} kcal (${avgDiffPercent.toFixed(1)}%)`);
    console.log(`✅ PASS: ${passCount}/7 dana, ❌ FAIL: ${failCount}/7 dana`);

    console.log("\n");
  }

  console.log("=".repeat(80));
  console.log("✅ TEST SCENARIJI ZAVRŠENI\n");
}


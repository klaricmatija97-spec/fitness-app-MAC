/**
 * TJEDNI PLAN PREHRANE - NOVI GENERATOR
 * 
 * Generira 7-dnevni plan prehrane koristeći SAMO kompozitne obroke
 * iz meal_components.json prema nutricionističkim pravilima.
 * 
 * Pravila:
 * - Svaki obrok ima 3-5 namirnica (nikad jedna namirnica!)
 * - Ne ponavlja isti glavni protein više puta dnevno
 * - Skalira porcije prema korisnikovim kalorijama i cilju
 * - Koristi podatke iz Supabase (kalkulacije, preferencije)
 */

import { createServiceClient } from "../supabase";
import mealComponentsData from "../data/meal_components.json";

const supabase = createServiceClient();

// ============================================
// TIPOVI
// ============================================

interface MealComponent {
  food: string;
  grams: number;
  displayName: string;
}

interface CompositeMeal {
  id: string;
  name: string;
  description: string;
  components: MealComponent[];
  tags: string[];
  suitableFor: string[];
}

interface MealComponentsData {
  breakfast: CompositeMeal[];
  lunch: CompositeMeal[];
  dinner: CompositeMeal[];
  snack: CompositeMeal[];
}

interface UserCalculations {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  goalType: "lose" | "maintain" | "gain";
  bmr: number;
  tdee: number;
}

interface GeneratedMeal {
  name: string;
  description: string;
  components: {
    name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface DailyPlan {
  date: string;
  dayName: string;
  meals: {
    breakfast: GeneratedMeal;
    snack1: GeneratedMeal;
    lunch: GeneratedMeal;
    snack2: GeneratedMeal;
    dinner: GeneratedMeal;
  };
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface WeeklyMealPlan {
  userId: string;
  generatedAt: string;
  weekStartDate: string;
  userTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goal: string;
  };
  days: DailyPlan[];
  weeklyTotals: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
  };
}

// ============================================
// MAKRO PODACI ZA NAMIRNICE (po 100g)
// ============================================

const FOOD_MACROS: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
  // Proteini
  "Egg": { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  "Egg white": { calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  "Chicken breast": { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  "Turkey breast": { calories: 135, protein: 30, carbs: 0, fat: 1 },
  "Salmon": { calories: 208, protein: 20, carbs: 0, fat: 13 },
  "Tuna": { calories: 132, protein: 29, carbs: 0, fat: 1 },
  
  // Mliječni proizvodi
  "Greek yogurt": { calories: 97, protein: 9, carbs: 3.6, fat: 5 },
  "Skyr": { calories: 63, protein: 11, carbs: 4, fat: 0.2 },
  "Cottage cheese": { calories: 98, protein: 11, carbs: 3.4, fat: 4.3 },
  "Milk": { calories: 47, protein: 3.4, carbs: 4.8, fat: 1.5 },
  "Sour cream": { calories: 193, protein: 2.4, carbs: 4.6, fat: 19 },
  
  // Ugljikohidrati
  "Oats": { calories: 389, protein: 17, carbs: 66, fat: 7 },
  "Toast": { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  "Rice crackers": { calories: 387, protein: 8, carbs: 82, fat: 2.8 },
  "Pasta cooked": { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  "Potatoes": { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  "Buckwheat": { calories: 92, protein: 3.4, carbs: 20, fat: 0.6 },
  
  // Voće
  "Banana": { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  "Apple": { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  "Blueberries": { calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  "Cherries": { calories: 50, protein: 1, carbs: 12, fat: 0.3 },
  
  // Povrće
  "Lettuce": { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  "Tomato": { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  "Cucumber": { calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
  "Mushroom": { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  "Onion": { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  "Corn": { calories: 86, protein: 3.2, carbs: 19, fat: 1.2 },
  "Broccoli": { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  "Carrot": { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  
  // Masti i orašasti plodovi
  "Avocado": { calories: 160, protein: 2, carbs: 9, fat: 15 },
  "Peanut butter": { calories: 588, protein: 25, carbs: 20, fat: 50 },
  "Almonds": { calories: 579, protein: 21, carbs: 22, fat: 50 },
  "Cashews": { calories: 553, protein: 18, carbs: 30, fat: 44 },
  
  // Suplementi
  "Whey": { calories: 400, protein: 80, carbs: 10, fat: 5 },
};

// ============================================
// POMOĆNE FUNKCIJE
// ============================================

/**
 * Dohvati korisničke kalkulacije iz Supabase ili localStorage
 */
async function getUserCalculations(userId: string): Promise<UserCalculations | null> {
  try {
    // Prvo pokušaj iz Supabase
    const { data, error } = await supabase
      .from("client_calculations")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      return {
        targetCalories: data.target_calories || 2000,
        targetProtein: data.protein_grams || 150,
        targetCarbs: data.carbs_grams || 200,
        targetFat: data.fats_grams || 70,
        goalType: data.goal_type || "maintain",
        bmr: data.bmr || 1800,
        tdee: data.tdee || 2200,
      };
    }

    // Fallback na default vrijednosti
    console.warn("⚠️ Nema kalkulacija u bazi, koristim default vrijednosti");
    return {
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 70,
      goalType: "maintain",
      bmr: 1800,
      tdee: 2200,
    };
  } catch (error) {
    console.error("Greška pri dohvatu kalkulacija:", error);
    return null;
  }
}

/**
 * Izračunaj makroe za jedan obrok na temelju komponenti
 * Sve vrijednosti zaokružene na cijeli broj za lakše korištenje
 */
function calculateMealMacros(components: MealComponent[], scaleFactor: number = 1): GeneratedMeal["components"] {
  return components.map(comp => {
    const macros = FOOD_MACROS[comp.food] || { calories: 100, protein: 5, carbs: 10, fat: 3 };
    // Zaokruži grame na najbliži broj djeljiv s 5 (npr. 45, 50, 55...) za lakše vaganje
    const rawGrams = comp.grams * scaleFactor;
    const scaledGrams = Math.round(rawGrams / 5) * 5;
    const factor = scaledGrams / 100;
    
    return {
      name: comp.displayName || comp.food,
      grams: scaledGrams,
      calories: Math.round(macros.calories * factor),
      protein: Math.round(macros.protein * factor),
      carbs: Math.round(macros.carbs * factor),
      fat: Math.round(macros.fat * factor),
    };
  });
}

/**
 * Izračunaj ukupne makroe za obrok
 */
function calculateMealTotals(components: GeneratedMeal["components"]): GeneratedMeal["totals"] {
  return components.reduce(
    (totals, comp) => ({
      calories: totals.calories + comp.calories,
      protein: Math.round((totals.protein + comp.protein) * 10) / 10,
      carbs: Math.round((totals.carbs + comp.carbs) * 10) / 10,
      fat: Math.round((totals.fat + comp.fat) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Odaberi nasumični obrok iz kategorije, filtrirano po cilju
 * PRAVILO: Iste namirnice se NE smiju ponavljati dva puta dnevno
 */
function selectRandomMeal(
  meals: CompositeMeal[],
  goalType: string,
  usedMealIds: Set<string>,
  usedIngredientsToday: Set<string>
): CompositeMeal | null {
  // Filtriraj po cilju
  let suitableMeals = meals.filter(meal => {
    if (!meal.suitableFor || meal.suitableFor.length === 0) return true;
    return meal.suitableFor.includes(goalType);
  });

  // Ako nema prikladnih, koristi sve
  if (suitableMeals.length === 0) {
    suitableMeals = meals;
  }

  // Izbjegni već korištene obroke danas
  let availableMeals = suitableMeals.filter(meal => !usedMealIds.has(meal.id));
  
  // NOVO: Filtriraj obroke koji imaju već korištene namirnice
  availableMeals = availableMeals.filter(meal => {
    const mealIngredients = meal.components.map(c => c.food.toLowerCase());
    const hasUsedIngredient = mealIngredients.some(ing => usedIngredientsToday.has(ing));
    return !hasUsedIngredient;
  });

  // Ako nema dostupnih bez ponavljanja, popusti pravilo za namirnice (ali ne za obroke)
  if (availableMeals.length === 0) {
    availableMeals = suitableMeals.filter(meal => !usedMealIds.has(meal.id));
  }
  
  // Ako su svi korišteni, resetiraj
  const mealsToChooseFrom = availableMeals.length > 0 ? availableMeals : suitableMeals;

  if (mealsToChooseFrom.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * mealsToChooseFrom.length);
  return mealsToChooseFrom[randomIndex];
}

/**
 * Generiraj jedan obrok s pravilnim skaliranjem
 * PRAVILO: Iste namirnice se NE smiju ponavljati dva puta dnevno
 */
function generateMeal(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  mealData: MealComponentsData,
  targetCalories: number,
  goalType: string,
  usedMealIds: Set<string>,
  usedIngredientsToday: Set<string>
): GeneratedMeal {
  const meals = mealData[mealType] as CompositeMeal[];
  const selectedMeal = selectRandomMeal(meals, goalType, usedMealIds, usedIngredientsToday);

  if (!selectedMeal) {
    // Fallback obrok
    return {
      name: `Default ${mealType}`,
      description: "Automatski generiran obrok",
      components: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }

  // Označi kao korišten
  usedMealIds.add(selectedMeal.id);
  
  // Dodaj sve namirnice iz ovog obroka u korištene
  selectedMeal.components.forEach(comp => {
    usedIngredientsToday.add(comp.food.toLowerCase());
  });

  // Izračunaj trenutne makroe bez skaliranja
  const baseComponents = calculateMealMacros(selectedMeal.components, 1);
  const baseTotals = calculateMealTotals(baseComponents);

  // Izračunaj faktor skaliranja prema target kalorijama
  let scaleFactor = 1;
  if (baseTotals.calories > 0) {
    scaleFactor = targetCalories / baseTotals.calories;
    // Ograniči skaliranje na razumne granice (0.5x - 2x)
    scaleFactor = Math.max(0.5, Math.min(2, scaleFactor));
  }

  // Primijeni skaliranje
  const scaledComponents = calculateMealMacros(selectedMeal.components, scaleFactor);
  const scaledTotals = calculateMealTotals(scaledComponents);

  return {
    name: selectedMeal.name,
    description: selectedMeal.description,
    components: scaledComponents,
    totals: scaledTotals,
  };
}

// ============================================
// GLAVNI GENERATOR
// ============================================

/**
 * Generiraj tjedni plan prehrane (7 dana)
 */
export async function generateWeeklyMealPlan(userId: string): Promise<WeeklyMealPlan> {
  console.log("🚀 Pokretanje NOVOG generatora tjednog plana prehrane...");
  console.log(`📋 Korisnik ID: ${userId}`);

  // 1. Dohvati korisničke kalkulacije
  const calculations = await getUserCalculations(userId);
  if (!calculations) {
    throw new Error("Nije moguće dohvatiti korisničke kalkulacije");
  }

  console.log(`✅ Kalkulacije: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`);
  console.log(`🎯 Cilj: ${calculations.goalType}`);

  // 2. Učitaj podatke o obrocima
  const mealData = mealComponentsData as MealComponentsData;

  // 3. Odredi distribuciju kalorija po obrocima (5 obroka)
  const calorieDistribution = {
    breakfast: 0.25,  // 25%
    snack1: 0.10,     // 10%
    lunch: 0.30,      // 30%
    snack2: 0.10,     // 10%
    dinner: 0.25,     // 25%
  };

  // Prilagodi za cilj
  if (calculations.goalType === "lose") {
    calorieDistribution.dinner = 0.20;
    calorieDistribution.breakfast = 0.30;
  } else if (calculations.goalType === "gain") {
    calorieDistribution.lunch = 0.35;
    calorieDistribution.snack1 = 0.12;
    calorieDistribution.snack2 = 0.12;
  }

  // 4. Generiraj 7 dana
  const days: DailyPlan[] = [];
  const dayNames = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + daysToMonday);

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];

    console.log(`\n📅 Generiranje dana ${i + 1}/7: ${dayNames[i]} (${dateStr})`);

    // Set za praćenje korištenih obroka danas
    const usedMealIds = new Set<string>();
    // NOVO: Set za praćenje korištenih namirnica danas (ne smiju se ponavljati!)
    const usedIngredientsToday = new Set<string>();

    // Generiraj svaki obrok
    const breakfast = generateMeal(
      "breakfast",
      mealData,
      calculations.targetCalories * calorieDistribution.breakfast,
      calculations.goalType,
      usedMealIds,
      usedIngredientsToday
    );
    console.log(`   🍳 Doručak: ${breakfast.name} (${breakfast.totals.calories} kcal)`);

    const snack1 = generateMeal(
      "snack",
      mealData,
      calculations.targetCalories * calorieDistribution.snack1,
      calculations.goalType,
      usedMealIds,
      usedIngredientsToday
    );
    console.log(`   🍎 Međuobrok 1: ${snack1.name} (${snack1.totals.calories} kcal)`);

    const lunch = generateMeal(
      "lunch",
      mealData,
      calculations.targetCalories * calorieDistribution.lunch,
      calculations.goalType,
      usedMealIds,
      usedIngredientsToday
    );
    console.log(`   🍽️ Ručak: ${lunch.name} (${lunch.totals.calories} kcal)`);

    const snack2 = generateMeal(
      "snack",
      mealData,
      calculations.targetCalories * calorieDistribution.snack2,
      calculations.goalType,
      usedMealIds,
      usedIngredientsToday
    );
    console.log(`   🍏 Međuobrok 2: ${snack2.name} (${snack2.totals.calories} kcal)`);

    const dinner = generateMeal(
      "dinner",
      mealData,
      calculations.targetCalories * calorieDistribution.dinner,
      calculations.goalType,
      usedMealIds,
      usedIngredientsToday
    );
    console.log(`   🌙 Večera: ${dinner.name} (${dinner.totals.calories} kcal)`);

    // Izračunaj dnevne totale
    const dailyTotals = {
      calories: breakfast.totals.calories + snack1.totals.calories + lunch.totals.calories + snack2.totals.calories + dinner.totals.calories,
      protein: Math.round((breakfast.totals.protein + snack1.totals.protein + lunch.totals.protein + snack2.totals.protein + dinner.totals.protein) * 10) / 10,
      carbs: Math.round((breakfast.totals.carbs + snack1.totals.carbs + lunch.totals.carbs + snack2.totals.carbs + dinner.totals.carbs) * 10) / 10,
      fat: Math.round((breakfast.totals.fat + snack1.totals.fat + lunch.totals.fat + snack2.totals.fat + dinner.totals.fat) * 10) / 10,
    };

    console.log(`   📊 Dnevni total: ${dailyTotals.calories} kcal, P: ${dailyTotals.protein}g, C: ${dailyTotals.carbs}g, F: ${dailyTotals.fat}g`);

    days.push({
      date: dateStr,
      dayName: dayNames[i],
      meals: {
        breakfast,
        snack1,
        lunch,
        snack2,
        dinner,
      },
      dailyTotals,
    });
  }

  // 5. Izračunaj tjedne prosjeke
  const weeklyTotals = {
    avgCalories: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / 7),
    avgProtein: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / 7 * 10) / 10,
    avgCarbs: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / 7 * 10) / 10,
    avgFat: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.fat, 0) / 7 * 10) / 10,
  };

  console.log("\n✅ TJEDNI PLAN GENERIRAN!");
  console.log(`📊 Tjedni prosjek: ${weeklyTotals.avgCalories} kcal, P: ${weeklyTotals.avgProtein}g, C: ${weeklyTotals.avgCarbs}g, F: ${weeklyTotals.avgFat}g`);
  console.log(`🎯 Target: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`);

  return {
    userId,
    generatedAt: new Date().toISOString(),
    weekStartDate: weekStart.toISOString().split("T")[0],
    userTargets: {
      calories: calculations.targetCalories,
      protein: calculations.targetProtein,
      carbs: calculations.targetCarbs,
      fat: calculations.targetFat,
      goal: calculations.goalType,
    },
    days,
    weeklyTotals,
  };
}

/**
 * Spremi plan u Supabase (opcionalno)
 */
export async function saveWeeklyPlanToSupabase(
  plan: WeeklyMealPlan
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("meal_plans")
      .insert({
        client_id: plan.userId,
        week_start_date: plan.weekStartDate,
        meals: plan.days,
        total_calories: plan.weeklyTotals.avgCalories * 7,
        total_protein: Math.round(plan.weeklyTotals.avgProtein * 7),
        total_carbs: Math.round(plan.weeklyTotals.avgCarbs * 7),
        total_fats: Math.round(plan.weeklyTotals.avgFat * 7),
      })
      .select("id")
      .single();

    if (error) {
      console.warn("⚠️ Greška pri spremanju u bazu:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Greška pri spremanju:", error);
    return { success: false, error: String(error) };
  }
}

export default {
  generateWeeklyMealPlan,
  saveWeeklyPlanToSupabase,
};


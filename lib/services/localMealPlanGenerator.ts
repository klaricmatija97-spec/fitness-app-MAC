/**
 * LOCAL MEAL PLAN GENERATOR
 * 
 * Čisti generator koji koristi SAMO:
 * - meal_components.json za definicije obroka
 * - foods-database.ts za nutritivne podatke
 * - Edamam API za opcionalna validaciju (ako je konfiguriran)
 * 
 * NEMA Supabase integraciju - svi podaci dolaze lokalno ili kroz API request.
 */

import mealComponentsData from "../data/meal_components.json";
import { 
  findNamirnica, 
  calculateMacrosForGrams, 
  type Namirnica,
  NAMIRNICE 
} from "../data/foods-database";
import { analyzeNutritionFromText } from "./edamamService";

// ============================================
// TIPOVI
// ============================================

export interface MealComponent {
  food: string;
  grams: number;
  displayName?: string;
}

export interface CompositeMeal {
  id: string;
  name: string;
  description: string;
  image?: string;
  preparationTip?: string;
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

export interface UserCalculations {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  goalType: "lose" | "maintain" | "gain";
  bmr?: number;
  tdee?: number;
}

export interface UserPreferences {
  avoidIngredients: string[];
  preferredIngredients: string[];
  desiredMealsPerDay: 3 | 5 | 6;
}

export interface GeneratedMealComponent {
  name: string;
  food?: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface GeneratedMeal {
  id?: string;
  name: string;
  description: string;
  image?: string;
  preparationTip?: string;
  components: GeneratedMealComponent[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface DailyPlan {
  date: string;
  dayName: string;
  meals: Record<string, GeneratedMeal>;
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface WeeklyMealPlan {
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
  weeklyAverage?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// ============================================
// KONSTANTE
// ============================================

const MEAL_COMPONENTS = mealComponentsData as MealComponentsData;

// Distribucija kalorija po obrocima
const MEAL_DISTRIBUTION: Record<number, Record<string, { calories: number; protein: number; carbs: number; fat: number }>> = {
  3: {
    breakfast: { calories: 0.30, protein: 0.30, carbs: 0.35, fat: 0.25 },
    lunch: { calories: 0.40, protein: 0.40, carbs: 0.35, fat: 0.40 },
    dinner: { calories: 0.30, protein: 0.30, carbs: 0.30, fat: 0.35 },
  },
  5: {
    breakfast: { calories: 0.25, protein: 0.25, carbs: 0.25, fat: 0.20 },
    snack1: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 },
    lunch: { calories: 0.30, protein: 0.30, carbs: 0.30, fat: 0.30 },
    snack2: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.15 },
    dinner: { calories: 0.25, protein: 0.25, carbs: 0.25, fat: 0.25 },
  },
  6: {
    breakfast: { calories: 0.22, protein: 0.22, carbs: 0.22, fat: 0.18 },
    snack1: { calories: 0.08, protein: 0.08, carbs: 0.08, fat: 0.10 },
    lunch: { calories: 0.28, protein: 0.28, carbs: 0.28, fat: 0.28 },
    snack2: { calories: 0.08, protein: 0.08, carbs: 0.08, fat: 0.10 },
    dinner: { calories: 0.26, protein: 0.26, carbs: 0.26, fat: 0.26 },
    snack3: { calories: 0.08, protein: 0.08, carbs: 0.08, fat: 0.08 },
  },
};

// Portion limits po goal tipu - FLEKSIBILNIJI za bolje skaliranje
const PORTION_LIMITS: Record<string, Record<string, { min: number; max: number }>> = {
  lose: {
    milk: { min: 50, max: 200 },
    oats: { min: 30, max: 80 },
    rice: { min: 50, max: 180 },
    pasta: { min: 50, max: 180 },
    chicken: { min: 80, max: 180 },
    beef: { min: 60, max: 150 },
    egg: { min: 30, max: 120 },
    whey: { min: 15, max: 35 },
    default: { min: 20, max: 200 },
  },
  maintain: {
    milk: { min: 80, max: 300 },
    oats: { min: 40, max: 100 },
    rice: { min: 80, max: 250 },
    pasta: { min: 80, max: 250 },
    chicken: { min: 80, max: 220 },
    beef: { min: 70, max: 180 },
    egg: { min: 40, max: 150 },
    whey: { min: 20, max: 40 },
    default: { min: 25, max: 280 },
  },
  gain: {
    milk: { min: 150, max: 450 },
    oats: { min: 50, max: 150 },
    rice: { min: 150, max: 400 },
    pasta: { min: 150, max: 400 },
    chicken: { min: 120, max: 300 },
    beef: { min: 100, max: 250 },
    egg: { min: 50, max: 200 },
    whey: { min: 25, max: 50 },
    default: { min: 40, max: 400 },
  },
};

// ============================================
// POMOĆNE FUNKCIJE
// ============================================

function getPortionLimits(foodKey: string, goalType: "lose" | "maintain" | "gain"): { min: number; max: number } {
  const limits = PORTION_LIMITS[goalType];
  const foodLower = foodKey.toLowerCase();
  
  for (const [key, value] of Object.entries(limits)) {
    if (key !== 'default' && foodLower.includes(key)) {
      return value;
    }
  }
  
  return limits.default;
}

function clampToPortionLimits(foodKey: string, grams: number, goalType: "lose" | "maintain" | "gain"): number {
  const limits = getPortionLimits(foodKey, goalType);
  return Math.max(limits.min, Math.min(limits.max, Math.round(grams / 5) * 5));
}

function getMealDistribution(
  numMeals: 3 | 5 | 6,
  goalType: "lose" | "maintain" | "gain"
): Record<string, { calories: number; protein: number; carbs: number; fat: number }> {
  return MEAL_DISTRIBUTION[numMeals];
}

function parseUserPreferences(allergiesText: string | null | undefined): UserPreferences {
  const preferences: UserPreferences = {
    avoidIngredients: [],
    preferredIngredients: [],
    desiredMealsPerDay: 5,
  };

  if (!allergiesText) return preferences;

  const lowerText = allergiesText.toLowerCase();

  // Parse alergije
  const alergijeMatch = lowerText.match(/(?:alergije|alergičan|intolerancija)[:;]?\s*(.+?)(?:\.|ne\s+želim|preferiram|obroci|$)/i);
  if (alergijeMatch) {
    const alergijeArray = alergijeMatch[1].split(/[,;]/).map(a => a.trim());
    preferences.avoidIngredients.push(...alergijeArray);
  }

  // Parse "ne želim"
  const neZelimMatch = lowerText.match(/(?:ne\s+želim|izbjegavam|ne\s+volim)[:;]?\s*(.+?)(?:\.|preferiram|obroci|$)/i);
  if (neZelimMatch) {
    const avoidArray = neZelimMatch[1].split(/[,;]/).map(a => a.trim()).filter(Boolean);
    preferences.avoidIngredients.push(...avoidArray);
  }

  // Parse "preferiram"
  const preferiramMatch = lowerText.match(/(?:preferiram|volim|želim)[:;]?\s*(.+?)(?:\.|obroci|$)/i);
  if (preferiramMatch) {
    const prefArray = preferiramMatch[1].split(/[,;]/).map(p => p.trim()).filter(Boolean);
    preferences.preferredIngredients.push(...prefArray);
  }

  // Parse broj obroka
  const obrociMatch = lowerText.match(/(?:obroci|meals)[:;]?\s*([356])/i);
  if (obrociMatch) {
    const numMeals = parseInt(obrociMatch[1]);
    if (numMeals === 3 || numMeals === 5 || numMeals === 6) {
      preferences.desiredMealsPerDay = numMeals as 3 | 5 | 6;
    }
  }

  return preferences;
}

function hasAvoidedIngredient(meal: CompositeMeal, avoidIngredients: string[]): boolean {
  if (avoidIngredients.length === 0) return false;

  const mealIngredients = meal.components.map(c => c.food.toLowerCase());
  const avoidLower = avoidIngredients.map(a => a.toLowerCase());

  return mealIngredients.some(ing => {
    return avoidLower.some(avoid => ing.includes(avoid) || avoid.includes(ing));
  });
}

function getMealsForGoal(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  goal: "lose" | "maintain" | "gain"
): CompositeMeal[] {
  const meals = MEAL_COMPONENTS[mealType] || [];
  return meals.filter(meal => {
    if (!meal.suitableFor || meal.suitableFor.length === 0) {
      return true;
    }
    return meal.suitableFor.includes(goal);
  });
}

// ============================================
// GENERIRANJE OBROKA
// ============================================

function calculateMealMacros(
  components: MealComponent[],
  scaleFactor: number = 1
): GeneratedMealComponent[] {
  return components.map(comp => {
    const namirnica = findNamirnica(comp.food);
    const scaledGrams = Math.round(comp.grams * scaleFactor);
    
    if (!namirnica) {
      // Ako namirnica nije pronađena, vrati 0 makroa
      return {
        name: comp.displayName || comp.food,
        food: comp.food,
        grams: scaledGrams,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    const macros = calculateMacrosForGrams(namirnica, scaledGrams);
    
    return {
      name: comp.displayName || namirnica.name,
      food: comp.food,
      grams: scaledGrams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    };
  });
}

function calculateMealTotals(components: GeneratedMealComponent[]): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  return components.reduce(
    (totals, comp) => ({
      calories: totals.calories + comp.calories,
      protein: totals.protein + comp.protein,
      carbs: totals.carbs + comp.carbs,
      fat: totals.fat + comp.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function selectRandomMeal(
  meals: CompositeMeal[],
  usedMealIds: Set<string>,
  usedMealNamesToday: Set<string>,
  usedMealNamesThisWeek: Set<string>,
  preferences: UserPreferences
): CompositeMeal | null {
  // Filtriraj alergije
  let availableMeals = meals;
  if (preferences.avoidIngredients.length > 0) {
    availableMeals = availableMeals.filter(meal => !hasAvoidedIngredient(meal, preferences.avoidIngredients));
  }

  if (availableMeals.length === 0) return null;

  // Filtriraj već korištena jela
  let preferredMeals = availableMeals.filter(meal => 
    !usedMealIds.has(meal.id) && 
    !usedMealNamesToday.has(meal.name.toLowerCase()) &&
    !usedMealNamesThisWeek.has(meal.name.toLowerCase())
  );

  // Ako nema novih jela, dozvoli ponavljanje
  if (preferredMeals.length === 0) {
    preferredMeals = availableMeals.filter(meal => 
      !usedMealIds.has(meal.id) &&
      !usedMealNamesToday.has(meal.name.toLowerCase())
    );
  }

  // Ako i dalje nema, koristi sva dostupna
  if (preferredMeals.length === 0) {
    preferredMeals = availableMeals;
  }

  // Nasumično odaberi
  const randomIndex = Math.floor(Math.random() * preferredMeals.length);
  return preferredMeals[randomIndex];
}

async function generateMeal(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  usedMealIds: Set<string>,
  usedMealNamesToday: Set<string>,
  usedMealNamesThisWeek: Set<string>,
  preferences: UserPreferences,
  goalType: "lose" | "maintain" | "gain"
): Promise<GeneratedMeal | null> {
  const meals = getMealsForGoal(mealType, goalType);
  const selectedMeal = selectRandomMeal(meals, usedMealIds, usedMealNamesToday, usedMealNamesThisWeek, preferences);

  if (!selectedMeal) return null;

  // Označi kao korišten
  usedMealIds.add(selectedMeal.id);
  usedMealNamesToday.add(selectedMeal.name.toLowerCase());
  usedMealNamesThisWeek.add(selectedMeal.name.toLowerCase());

  // Izračunaj bazne makroe
  const baseComponents = calculateMealMacros(selectedMeal.components, 1);
  const baseTotals = calculateMealTotals(baseComponents);

  if (baseTotals.calories === 0) return null;

  // Izračunaj faktor skaliranja
  const proteinFactor = baseTotals.protein > 0 ? targetProtein / baseTotals.protein : 1;
  const carbsFactor = baseTotals.carbs > 0 ? targetCarbs / baseTotals.carbs : 1;
  const fatFactor = baseTotals.fat > 0 ? targetFat / baseTotals.fat : 1;

  // Kombiniraj faktore s prioritetom na protein
  let scaleFactor = proteinFactor * 0.5 + carbsFactor * 0.3 + fatFactor * 0.2;
  scaleFactor = Math.max(0.7, Math.min(1.8, scaleFactor));

  // Primijeni skaliranje s portion limits
  const scaledComponents = selectedMeal.components.map(comp => {
    const namirnica = findNamirnica(comp.food);
    let scaledGrams = Math.round(comp.grams * scaleFactor);
    scaledGrams = clampToPortionLimits(comp.food, scaledGrams, goalType);
    
    const macros = namirnica 
      ? calculateMacrosForGrams(namirnica, scaledGrams)
      : { calories: 0, protein: 0, carbs: 0, fat: 0 };

    return {
      name: comp.displayName || (namirnica?.name || comp.food),
      food: comp.food,
      grams: scaledGrams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    };
  });

  const scaledTotals = calculateMealTotals(scaledComponents);

  return {
    id: selectedMeal.id,
    name: selectedMeal.name,
    description: selectedMeal.description,
    image: selectedMeal.image,
    preparationTip: selectedMeal.preparationTip,
    components: scaledComponents,
    totals: scaledTotals,
  };
}

// ============================================
// SKALIRANJE SVIH OBROKA
// ============================================

function scaleAllMealsToTarget(
  meals: Record<string, GeneratedMeal>,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  goalType: "lose" | "maintain" | "gain"
): Record<string, GeneratedMeal> {
  const MAX_ITERATIONS = 50;
  const CALORIE_TOLERANCE = 30; // ±30 kcal

  let currentMeals = JSON.parse(JSON.stringify(meals)); // Deep copy

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Izračunaj trenutne totale
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const meal of Object.values(currentMeals) as GeneratedMeal[]) {
      totalCalories += meal.totals.calories;
      totalProtein += meal.totals.protein;
      totalCarbs += meal.totals.carbs;
      totalFat += meal.totals.fat;
    }

    const calDiff = totalCalories - targetCalories;

    // Ako smo unutar tolerancije, završi
    if (Math.abs(calDiff) <= CALORIE_TOLERANCE) {
      console.log(`✅ Skaliranje završeno na iteraciji ${iteration}: ${Math.round(totalCalories)} kcal (target: ${targetCalories})`);
      return currentMeals;
    }

    // Izračunaj faktor skaliranja - DIREKTNO prema kalorijama
    const calorieFactor = targetCalories / totalCalories;
    
    // Ograniči faktor da ne bude preagresivan (max ±15% po iteraciji)
    const limitedFactor = Math.max(0.85, Math.min(1.15, calorieFactor));

    // Skaliraj sve obroke
    const scaledMeals: Record<string, GeneratedMeal> = {};

    for (const [mealType, meal] of Object.entries(currentMeals) as [string, GeneratedMeal][]) {
      const scaledComponents = meal.components.map(comp => {
        const namirnica = findNamirnica(comp.food || comp.name);
        
        // Primijeni faktor skaliranja
        let newGrams = Math.round(comp.grams * limitedFactor);
        
        // Primijeni portion limits
        newGrams = clampToPortionLimits(comp.food || comp.name, newGrams, goalType);
        
        // Izračunaj nove makroe
        const macros = namirnica
          ? calculateMacrosForGrams(namirnica, newGrams)
          : { calories: 0, protein: 0, carbs: 0, fat: 0 };

        return {
          ...comp,
          grams: newGrams,
          calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
        };
      });

      scaledMeals[mealType] = {
        ...meal,
        components: scaledComponents,
        totals: calculateMealTotals(scaledComponents),
      };
    }

    currentMeals = scaledMeals;
  }

  // Log upozorenje ako nismo postigli cilj
  const finalCalories = Object.values(currentMeals as Record<string, GeneratedMeal>).reduce(
    (sum, meal) => sum + meal.totals.calories, 0
  );
  console.warn(`⚠️ Skaliranje nije postiglo cilj: ${Math.round(finalCalories)} kcal (target: ${targetCalories})`);

  return currentMeals;
}


// ============================================
// GLAVNI GENERATOR
// ============================================

export async function generateWeeklyMealPlanLocal(
  calculations: UserCalculations,
  preferencesInput?: {
    allergies?: string;
    avoidIngredients?: string;
    foodPreferences?: string;
  }
): Promise<WeeklyMealPlan> {
  console.log(`\n========================================`);
  console.log(`🚀 LOCAL GENERATOR - START`);
  console.log(`📊 Target: ${calculations.targetCalories} kcal`);
  console.log(`📊 Macros: P:${calculations.targetProtein}g C:${calculations.targetCarbs}g F:${calculations.targetFat}g`);
  console.log(`🎯 Goal: ${calculations.goalType}`);
  console.log(`========================================\n`);

  // Parse preferencije
  const combinedText = [
    preferencesInput?.allergies,
    preferencesInput?.avoidIngredients,
    preferencesInput?.foodPreferences,
  ].filter(Boolean).join('. ');

  const preferences = parseUserPreferences(combinedText);
  console.log(`📝 Preferences: ${preferences.desiredMealsPerDay} obroka/dan`);
  if (preferences.avoidIngredients.length > 0) {
    console.log(`🚫 Izbjegavam: ${preferences.avoidIngredients.join(', ')}`);
  }

  // Odredi distribuciju kalorija
  const mealDistribution = getMealDistribution(preferences.desiredMealsPerDay, calculations.goalType);

  // Generiraj 7 dana
  const days: DailyPlan[] = [];
  const dayNames = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];

  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  // Tracking za varijaciju kroz tjedan
  const usedMealNamesThisWeek: Record<string, Set<string>> = {
    breakfast: new Set(),
    snack: new Set(),
    lunch: new Set(),
    dinner: new Set(),
  };

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + dayIndex);
    const dateStr = currentDate.toISOString().split('T')[0];

    console.log(`\n📅 Generiram dan ${dayIndex + 1}/7: ${dayNames[dayIndex]}`);

    const usedMealIds = new Set<string>();
    const usedMealNamesToday = new Set<string>();
    const dayMeals: Record<string, GeneratedMeal> = {};

    // Generiraj svaki obrok
    for (const [slotKey, distribution] of Object.entries(mealDistribution)) {
      const mealType = slotKey.startsWith('snack') ? 'snack' : slotKey as "breakfast" | "lunch" | "dinner";
      
      const slotTargetCalories = Math.round(calculations.targetCalories * distribution.calories);
      const slotTargetProtein = Math.round(calculations.targetProtein * distribution.protein);
      const slotTargetCarbs = Math.round(calculations.targetCarbs * distribution.carbs);
      const slotTargetFat = Math.round(calculations.targetFat * distribution.fat);

      const meal = await generateMeal(
        mealType,
        slotTargetCalories,
        slotTargetProtein,
        slotTargetCarbs,
        slotTargetFat,
        usedMealIds,
        usedMealNamesToday,
        usedMealNamesThisWeek[mealType] || new Set(),
        preferences,
        calculations.goalType
      );

      if (meal) {
        dayMeals[slotKey] = meal;
        usedMealNamesThisWeek[mealType]?.add(meal.name.toLowerCase());
      }
    }

    // Skaliraj sve obroke za dan da postignu dnevne ciljeve
    const scaledMeals = scaleAllMealsToTarget(
      dayMeals,
      calculations.targetCalories,
      calculations.targetProtein,
      calculations.targetCarbs,
      calculations.targetFat,
      calculations.goalType
    );

    // Izračunaj dnevne totale
    const dailyTotals = Object.values(scaledMeals).reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.totals.calories,
        protein: totals.protein + meal.totals.protein,
        carbs: totals.carbs + meal.totals.carbs,
        fat: totals.fat + meal.totals.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    days.push({
      date: dateStr,
      dayName: dayNames[dayIndex],
      meals: scaledMeals,
      dailyTotals: {
        calories: Math.round(dailyTotals.calories),
        protein: Math.round(dailyTotals.protein * 10) / 10,
        carbs: Math.round(dailyTotals.carbs * 10) / 10,
        fat: Math.round(dailyTotals.fat * 10) / 10,
      },
    });

    console.log(`   ✅ ${dayNames[dayIndex]}: ${Math.round(dailyTotals.calories)} kcal`);
  }

  // Izračunaj tjedne prosjeke
  const weeklyAvg = days.reduce(
    (avg, day) => ({
      calories: avg.calories + day.dailyTotals.calories / 7,
      protein: avg.protein + day.dailyTotals.protein / 7,
      carbs: avg.carbs + day.dailyTotals.carbs / 7,
      fat: avg.fat + day.dailyTotals.fat / 7,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  console.log(`\n========================================`);
  console.log(`✅ TJEDNI PLAN GENERIRAN`);
  console.log(`📊 Prosjek: ${Math.round(weeklyAvg.calories)} kcal/dan`);
  console.log(`📊 Makroi: P:${Math.round(weeklyAvg.protein)}g C:${Math.round(weeklyAvg.carbs)}g F:${Math.round(weeklyAvg.fat)}g`);
  console.log(`========================================\n`);

  return {
    generatedAt: new Date().toISOString(),
    weekStartDate: monday.toISOString().split('T')[0],
    userTargets: {
      calories: calculations.targetCalories,
      protein: calculations.targetProtein,
      carbs: calculations.targetCarbs,
      fat: calculations.targetFat,
      goal: calculations.goalType,
    },
    days,
    weeklyTotals: {
      avgCalories: Math.round(weeklyAvg.calories),
      avgProtein: Math.round(weeklyAvg.protein * 10) / 10,
      avgCarbs: Math.round(weeklyAvg.carbs * 10) / 10,
      avgFat: Math.round(weeklyAvg.fat * 10) / 10,
    },
    weeklyAverage: {
      calories: Math.round(weeklyAvg.calories),
      protein: Math.round(weeklyAvg.protein * 10) / 10,
      carbs: Math.round(weeklyAvg.carbs * 10) / 10,
      fat: Math.round(weeklyAvg.fat * 10) / 10,
    },
  };
}


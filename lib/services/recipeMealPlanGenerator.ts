/**
 * Recipe-Based Meal Plan Generator
 * 
 * Koristi Edamam Recipe Search API za generiranje personaliziranih jelovnika
 * s pravim receptima, fotografijama i preciznim nutritivnim vrijednostima
 */

import { searchRecipes, SimplifiedRecipe } from './edamamRecipeService';
import { createServiceClient } from '../supabase';

const supabase = createServiceClient();

// ============================================
// TYPES
// ============================================

export interface UserNutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalType: 'lose' | 'maintain' | 'gain';
}

export interface UserPreferences {
  allergies: string[];
  dietType?: string;
  excludedIngredients: string[];
  preferredCuisines: string[];
  mealsPerDay: 3 | 5 | 6;
}

export interface MealSlot {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack1' | 'snack2' | 'snack3';
  name: string;
  caloriePercent: number;
}

export interface ScaledIngredient {
  food: string;
  grams: number;
  text: string;
}

export interface GeneratedMealRecipe {
  id: string;
  slotType: string;
  slotName: string;
  recipe: SimplifiedRecipe;
  scaleFactor: number;
  scaledIngredientsWithGrams: ScaledIngredient[];
  scaledTotalWeight: number;
  adjustedNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

export interface DailyMealPlan {
  dayIndex: number;
  dayName: string;
  meals: GeneratedMealRecipe[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  targetComparison: {
    caloriesDiff: number;
    proteinDiff: number;
    carbsDiff: number;
    fatDiff: number;
  };
}

export interface WeeklyRecipePlan {
  userId: string;
  generatedAt: string;
  weekStartDate: string;
  userTargets: UserNutritionTargets;
  preferences: UserPreferences;
  days: DailyMealPlan[];
  weeklyAverages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  source: 'edamam-recipe-api';
}

// ============================================
// CONSTANTS
// ============================================

const DAY_NAMES = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];

const MEAL_SLOTS_3: MealSlot[] = [
  { type: 'breakfast', name: 'Doručak', caloriePercent: 0.30 },
  { type: 'lunch', name: 'Ručak', caloriePercent: 0.40 },
  { type: 'dinner', name: 'Večera', caloriePercent: 0.30 },
];

const MEAL_SLOTS_5: MealSlot[] = [
  { type: 'breakfast', name: 'Doručak', caloriePercent: 0.25 },
  { type: 'snack1', name: 'Užina 1', caloriePercent: 0.10 },
  { type: 'lunch', name: 'Ručak', caloriePercent: 0.30 },
  { type: 'snack2', name: 'Užina 2', caloriePercent: 0.10 },
  { type: 'dinner', name: 'Večera', caloriePercent: 0.25 },
];

const MEAL_SLOTS_6: MealSlot[] = [
  { type: 'breakfast', name: 'Doručak', caloriePercent: 0.20 },
  { type: 'snack1', name: 'Užina 1', caloriePercent: 0.10 },
  { type: 'lunch', name: 'Ručak', caloriePercent: 0.25 },
  { type: 'snack2', name: 'Užina 2', caloriePercent: 0.10 },
  { type: 'dinner', name: 'Večera', caloriePercent: 0.25 },
  { type: 'snack3', name: 'Užina 3', caloriePercent: 0.10 },
];

// Mapiranje alergija na Edamam health labels
const ALLERGY_MAP: Record<string, string> = {
  'gluten': 'gluten-free',
  'mlijeko': 'dairy-free',
  'laktoza': 'dairy-free',
  'jaja': 'egg-free',
  'orašasti plodovi': 'tree-nut-free',
  'kikiriki': 'peanut-free',
  'soja': 'soy-free',
  'riba': 'fish-free',
  'školjke': 'shellfish-free',
  'vegetarijanac': 'vegetarian',
  'vegan': 'vegan',
};

// Query strings prilagođeni CILJU korisnika
const MEAL_QUERIES_BY_GOAL: Record<'lose' | 'maintain' | 'gain', Record<string, string[]>> = {
  // MRŠAVLJENJE: visoki proteini, niže kalorije, manje UH
  lose: {
    breakfast: ['egg whites vegetables', 'omelette spinach lean', 'cottage cheese breakfast'],
    lunch: ['grilled chicken salad', 'fish vegetables steamed', 'turkey breast lean'],
    dinner: ['grilled fish vegetables', 'chicken breast broccoli', 'salmon asparagus lean'],
    snack: ['greek yogurt protein', 'hard boiled eggs', 'cottage cheese low fat'],
  },
  // ODRŽAVANJE: balansirano
  maintain: {
    breakfast: ['eggs bacon breakfast', 'omelette cheese vegetables', 'protein pancakes'],
    lunch: ['chicken breast rice vegetables', 'salmon quinoa', 'turkey wrap healthy'],
    dinner: ['salmon dinner vegetables', 'chicken breast potato', 'lean steak vegetables'],
    snack: ['greek yogurt berries', 'nuts almonds protein', 'protein shake'],
  },
  // BULK: više ugljikohidrata za energiju
  gain: {
    breakfast: ['oatmeal banana protein', 'pancakes eggs carbs', 'breakfast burrito eggs'],
    lunch: ['chicken rice pasta', 'beef steak potatoes', 'pasta chicken vegetables'],
    dinner: ['pasta chicken dinner', 'steak rice carbs', 'chicken potato dinner'],
    snack: ['banana peanut butter', 'oatmeal protein shake', 'granola yogurt'],
  },
};

// Fallback za stare pozive
const MEAL_QUERIES: Record<string, string[]> = MEAL_QUERIES_BY_GOAL.maintain;

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMealSlots(mealsPerDay: 3 | 5 | 6): MealSlot[] {
  switch (mealsPerDay) {
    case 3: return MEAL_SLOTS_3;
    case 5: return MEAL_SLOTS_5;
    case 6: return MEAL_SLOTS_6;
    default: return MEAL_SLOTS_5;
  }
}

function getRandomQuery(mealType: string, goalType: 'lose' | 'maintain' | 'gain' = 'maintain'): string {
  const goalQueries = MEAL_QUERIES_BY_GOAL[goalType];
  const queries = goalQueries[mealType] || goalQueries.lunch;
  return queries[Math.floor(Math.random() * queries.length)];
}

function mapAllergiesToHealthLabels(allergies: string[]): string[] {
  const healthLabels: string[] = [];
  for (const allergy of allergies) {
    const label = ALLERGY_MAP[allergy.toLowerCase()];
    if (label && !healthLabels.includes(label)) {
      healthLabels.push(label);
    }
  }
  return healthLabels;
}

function getMealTypeForSlot(slotType: string): 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' {
  if (slotType === 'breakfast') return 'Breakfast';
  if (slotType === 'lunch') return 'Lunch';
  if (slotType === 'dinner') return 'Dinner';
  return 'Snack';
}

function getQueryTypeForSlot(slotType: string): string {
  if (slotType.startsWith('snack')) return 'snack';
  return slotType;
}

// ============================================
// MAIN GENERATOR FUNCTIONS
// ============================================

/**
 * Dohvati korisničke ciljeve iz baze (iz client_calculations tablice)
 */
async function getUserTargets(userId: string): Promise<UserNutritionTargets> {
  // Prvo pokušaj iz client_calculations
  const { data, error } = await supabase
    .from('client_calculations')
    .select('target_calories, protein_grams, carbs_grams, fats_grams, goal_type')
    .eq('client_id', userId)
    .single();

  if (error || !data) {
    // Fallback - pokušaj iz clients tablice
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('bmr, tdee, target_calories, protein_grams, carbs_grams, fats_grams, goal_type')
      .eq('id', userId)
      .single();

    if (clientError || !clientData) {
      throw new Error(`Nema kalkulacija u bazi. Molimo prvo izračunajte kalkulacije na kalkulatoru.`);
    }

    return {
      calories: clientData.target_calories || 2000,
      protein: clientData.protein_grams || 150,
      carbs: clientData.carbs_grams || 200,
      fat: clientData.fats_grams || 65,
      goalType: (clientData.goal_type as 'lose' | 'maintain' | 'gain') || 'maintain',
    };
  }

  // Parse numeric values (mogu biti string ili number)
  const parseNumeric = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };

  return {
    calories: parseNumeric(data.target_calories) || 2000,
    protein: parseNumeric(data.protein_grams) || 150,
    carbs: parseNumeric(data.carbs_grams) || 200,
    fat: parseNumeric(data.fats_grams) || 65,
    goalType: (data.goal_type as 'lose' | 'maintain' | 'gain') || 'maintain',
  };
}

/**
 * Dohvati korisničke preferencije iz baze
 */
async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const { data } = await supabase
    .from('clients')
    .select('allergies, diet_type, meal_frequency')
    .eq('id', userId)
    .single();

  // Parse allergies
  let allergies: string[] = [];
  if (data?.allergies) {
    if (typeof data.allergies === 'string') {
      allergies = data.allergies.split(',').map((a: string) => a.trim()).filter(Boolean);
    } else if (Array.isArray(data.allergies)) {
      allergies = data.allergies;
    }
  }

  // Determine meals per day
  let mealsPerDay: 3 | 5 | 6 = 5;
  if (data?.meal_frequency) {
    const freq = parseInt(data.meal_frequency);
    if (freq === 3 || freq === 5 || freq === 6) {
      mealsPerDay = freq as 3 | 5 | 6;
    }
  }

  return {
    allergies,
    dietType: data?.diet_type || undefined,
    excludedIngredients: [],
    preferredCuisines: [],
    mealsPerDay,
  };
}

/**
 * Pronađi recept za određeni obrok - PRILAGOĐENO CILJU KORISNIKA
 */
async function findRecipeForMeal(
  slot: MealSlot,
  targetCalories: number,
  healthLabels: string[],
  excludedIngredients: string[],
  usedRecipeIds: Set<string>,
  goalType: 'lose' | 'maintain' | 'gain'
): Promise<SimplifiedRecipe | null> {
  const mealType = getMealTypeForSlot(slot.type);
  const queryType = getQueryTypeForSlot(slot.type);
  
  // Koristi query prilagođen cilju
  const query = getRandomQuery(queryType, goalType);

  // Diet prema cilju
  const diet = goalType === 'lose' ? 'high-protein' : 
               goalType === 'gain' ? 'balanced' : 
               'high-protein';

  // Pretraži recepte
  let recipes = await searchRecipes({
    query,
    mealType,
    diet: diet as any,
    health: healthLabels.length > 0 ? healthLabels : undefined,
    excluded: excludedIngredients.length > 0 ? excludedIngredients : undefined,
    random: true,
    limit: 25,
  });

  // Filtriraj nekorištene recepte
  let availableRecipes = recipes.filter(r => !usedRecipeIds.has(r.id));

  if (availableRecipes.length > 0) {
    // SORTIRAJ PREMA CILJU
    availableRecipes.sort((a, b) => {
      if (goalType === 'lose') {
        // Za mršavljenje: prioritet protein ratio
        const ratioA = (a.protein / a.calories) * 100;
        const ratioB = (b.protein / b.calories) * 100;
        return ratioB - ratioA;
      } else if (goalType === 'gain') {
        // Za bulk: prioritet ugljikohidrati
        const carbsRatioA = (a.carbs * 4 / a.calories);
        const carbsRatioB = (b.carbs * 4 / b.calories);
        return carbsRatioB - carbsRatioA;
      } else {
        // Održavanje: balansirano (protein prvo)
        const ratioA = (a.protein / a.calories) * 100;
        const ratioB = (b.protein / b.calories) * 100;
        return ratioB - ratioA;
      }
    });

    // Uzmi top 10 po proteinima
    const topProtein = availableRecipes.slice(0, 10);

    // Od top proteina, biraj najbliži ciljanim kalorijama
    const calorieMin = Math.round(targetCalories * 0.4);
    const calorieMax = Math.round(targetCalories * 2.5);
    
    const inRange = topProtein.filter(r => r.calories >= calorieMin && r.calories <= calorieMax);
    
    if (inRange.length > 0) {
      // Sortiraj po blizini ciljanim kalorijama
      inRange.sort((a, b) => 
        Math.abs(a.calories - targetCalories) - Math.abs(b.calories - targetCalories)
      );
      return inRange[0];
    }

    // Ako nema u rasponu, vrati prvi s najviše proteina
    return topProtein[0];
  }

  // FALLBACK: fitness-focused jednostavniji query
  const fallbackQueries: Record<string, string> = {
    breakfast: 'egg whites chicken',
    lunch: 'grilled chicken breast',
    dinner: 'grilled salmon lean',
    snack: 'cottage cheese greek yogurt',
  };

  console.log(`   ⚠️ Fallback fitness search za ${slot.name}...`);
  const fallbackRecipes = await searchRecipes({
    query: fallbackQueries[queryType] || 'chicken breast lean',
    diet: 'high-protein',
    random: true,
    limit: 15,
  });

  const fallbackAvailable = fallbackRecipes.filter(r => !usedRecipeIds.has(r.id));
  if (fallbackAvailable.length > 0) {
    // Sortiraj i fallback po proteinima
    fallbackAvailable.sort((a, b) => {
      const ratioA = (a.protein / a.calories) * 100;
      const ratioB = (b.protein / b.calories) * 100;
      return ratioB - ratioA;
    });
    return fallbackAvailable[0];
  }

  return recipes[0] || null;
}

/**
 * Generiraj dnevni plan s receptima
 */
async function generateDayPlan(
  dayIndex: number,
  targets: UserNutritionTargets,
  preferences: UserPreferences,
  usedRecipeIds: Set<string>
): Promise<DailyMealPlan> {
  const slots = getMealSlots(preferences.mealsPerDay);
  const healthLabels = mapAllergiesToHealthLabels(preferences.allergies);
  const meals: GeneratedMealRecipe[] = [];

  console.log(`\n📅 Dan ${dayIndex + 1}: ${DAY_NAMES[dayIndex]}`);

  for (const slot of slots) {
    const targetCalories = Math.round(targets.calories * slot.caloriePercent);
    
    console.log(`   🍽️ ${slot.name}: tražim recept za ~${targetCalories} kcal...`);

    const recipe = await findRecipeForMeal(
      slot,
      targetCalories,
      healthLabels,
      preferences.excludedIngredients,
      usedRecipeIds,
      targets.goalType
    );

    if (recipe) {
      usedRecipeIds.add(recipe.id);

      // Calculate scale factor to match target calories
      const scaleFactor = targetCalories / recipe.calories;
      
      // Clamp scale factor za realistične porcije (0.4x - 3x)
      const clampedScale = Math.max(0.4, Math.min(3, scaleFactor));
      
      const adjustedNutrition = {
        calories: Math.round(recipe.calories * clampedScale),
        protein: Math.round(recipe.protein * clampedScale * 10) / 10,
        carbs: Math.round(recipe.carbs * clampedScale * 10) / 10,
        fat: Math.round(recipe.fat * clampedScale * 10) / 10,
        fiber: Math.round(recipe.fiber * clampedScale * 10) / 10,
      };

      // Skalirane gramaže sastojaka
      const scaledIngredientsWithGrams: ScaledIngredient[] = (recipe.ingredientsWithGrams || []).map(ing => ({
        food: ing.food,
        grams: Math.round(ing.grams * clampedScale),
        text: ing.text,
      }));
      
      const scaledTotalWeight = Math.round((recipe.totalWeight || 0) * clampedScale);

      meals.push({
        id: recipe.id,
        slotType: slot.type,
        slotName: slot.name,
        recipe,
        scaleFactor: clampedScale,
        scaledIngredientsWithGrams,
        scaledTotalWeight,
        adjustedNutrition,
      });

      console.log(`      ✅ ${recipe.name} (${adjustedNutrition.calories} kcal, ${adjustedNutrition.protein}g P, ${scaledTotalWeight}g)`);
    } else {
      console.log(`      ⚠️ Nije pronađen recept za ${slot.name}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Calculate totals
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.adjustedNutrition.calories,
      protein: acc.protein + meal.adjustedNutrition.protein,
      carbs: acc.carbs + meal.adjustedNutrition.carbs,
      fat: acc.fat + meal.adjustedNutrition.fat,
      fiber: acc.fiber + meal.adjustedNutrition.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const targetComparison = {
    caloriesDiff: totals.calories - targets.calories,
    proteinDiff: totals.protein - targets.protein,
    carbsDiff: totals.carbs - targets.carbs,
    fatDiff: totals.fat - targets.fat,
  };

  console.log(`   📊 Ukupno: ${totals.calories} kcal (target: ${targets.calories}), ${totals.protein}g P`);

  return {
    dayIndex,
    dayName: DAY_NAMES[dayIndex],
    meals,
    totals,
    targetComparison,
  };
}

/**
 * Glavna funkcija - generiraj tjedni plan s receptima
 */
export async function generateWeeklyRecipePlan(userId: string): Promise<WeeklyRecipePlan> {
  console.log('\n🚀 ========================================');
  console.log('   RECIPE MEAL PLAN GENERATOR');
  console.log('   Powered by Edamam Recipe Search API');
  console.log('========================================\n');

  // 1. Dohvati korisničke podatke
  console.log('📋 Dohvaćam korisničke podatke...');
  const targets = await getUserTargets(userId);
  const preferences = await getUserPreferences(userId);

  console.log(`   Ciljevi: ${targets.calories} kcal, ${targets.protein}g P, ${targets.carbs}g C, ${targets.fat}g F`);
  console.log(`   Cilj: ${targets.goalType}`);
  console.log(`   Obroka dnevno: ${preferences.mealsPerDay}`);
  console.log(`   Alergije: ${preferences.allergies.length > 0 ? preferences.allergies.join(', ') : 'Nema'}`);

  // 2. Generiraj plan za svaki dan
  const days: DailyMealPlan[] = [];
  const usedRecipeIds = new Set<string>();

  for (let i = 0; i < 7; i++) {
    const dayPlan = await generateDayPlan(i, targets, preferences, usedRecipeIds);
    days.push(dayPlan);
  }

  // 3. Izračunaj tjedne prosjeke
  const weeklyAverages = {
    calories: Math.round(days.reduce((sum, d) => sum + d.totals.calories, 0) / 7),
    protein: Math.round(days.reduce((sum, d) => sum + d.totals.protein, 0) / 7 * 10) / 10,
    carbs: Math.round(days.reduce((sum, d) => sum + d.totals.carbs, 0) / 7 * 10) / 10,
    fat: Math.round(days.reduce((sum, d) => sum + d.totals.fat, 0) / 7 * 10) / 10,
  };

  console.log('\n========================================');
  console.log('✅ TJEDNI PLAN GENERIRAN!');
  console.log(`   Prosjek: ${weeklyAverages.calories} kcal, ${weeklyAverages.protein}g P`);
  console.log(`   Različitih recepata: ${usedRecipeIds.size}`);
  console.log('========================================\n');

  return {
    userId,
    generatedAt: new Date().toISOString(),
    weekStartDate: getNextMonday(),
    userTargets: targets,
    preferences,
    days,
    weeklyAverages,
    source: 'edamam-recipe-api',
  };
}

function getNextMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split('T')[0];
}

/**
 * Spremi plan u bazu
 */
export async function saveRecipePlanToDatabase(plan: WeeklyRecipePlan): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        client_id: plan.userId,
        plan_type: 'recipe',
        plan_data: plan,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}


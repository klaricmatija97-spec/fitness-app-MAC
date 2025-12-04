/**
 * Nutrition Lookup - Dohvat Edamam nutritivnih podataka za jela
 * 
 * Koristi cache iz meal_nutrition_cache.json umjesto API poziva
 */

import nutritionCache from './meal_nutrition_cache.json';

// ============================================
// TYPES
// ============================================

export interface MealNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
  vitaminB12: number;
  calcium: number;
  iron: number;
  potassium: number;
  magnesium: number;
}

interface NutritionCache {
  lastUpdated: string;
  source: string;
  totalMeals: number;
  nutritionById: Record<string, MealNutrition>;
}

// ============================================
// CACHE DATA
// ============================================

const cache = nutritionCache as NutritionCache;

// ============================================
// FUNCTIONS
// ============================================

/**
 * Dohvati nutritivne podatke za jelo po ID-u
 */
export function getNutritionById(mealId: string): MealNutrition | null {
  return cache.nutritionById[mealId] || null;
}

/**
 * Dohvati osnovne makrose za jelo
 */
export function getMacrosById(mealId: string): { 
  calories: number; 
  protein: number; 
  carbs: number; 
  fat: number 
} | null {
  const nutrition = cache.nutritionById[mealId];
  if (!nutrition) return null;
  
  return {
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
  };
}

/**
 * Izračunaj skalirane makrose za jelo
 * 
 * @param mealId - ID jela
 * @param scaleFactor - Faktor skaliranja (1.0 = 100%, 1.5 = 150%)
 */
export function getScaledNutrition(
  mealId: string, 
  scaleFactor: number
): MealNutrition | null {
  const nutrition = cache.nutritionById[mealId];
  if (!nutrition) return null;
  
  return {
    calories: Math.round(nutrition.calories * scaleFactor),
    protein: Math.round(nutrition.protein * scaleFactor * 10) / 10,
    carbs: Math.round(nutrition.carbs * scaleFactor * 10) / 10,
    fat: Math.round(nutrition.fat * scaleFactor * 10) / 10,
    fiber: Math.round(nutrition.fiber * scaleFactor * 10) / 10,
    sugar: Math.round(nutrition.sugar * scaleFactor * 10) / 10,
    sodium: Math.round(nutrition.sodium * scaleFactor),
    saturatedFat: Math.round(nutrition.saturatedFat * scaleFactor * 10) / 10,
    vitaminA: Math.round(nutrition.vitaminA * scaleFactor),
    vitaminC: Math.round(nutrition.vitaminC * scaleFactor),
    vitaminD: Math.round(nutrition.vitaminD * scaleFactor * 10) / 10,
    vitaminB12: Math.round(nutrition.vitaminB12 * scaleFactor * 10) / 10,
    calcium: Math.round(nutrition.calcium * scaleFactor),
    iron: Math.round(nutrition.iron * scaleFactor * 10) / 10,
    potassium: Math.round(nutrition.potassium * scaleFactor),
    magnesium: Math.round(nutrition.magnesium * scaleFactor),
  };
}

/**
 * Provjeri postoji li nutritivni podatak za jelo
 */
export function hasNutritionData(mealId: string): boolean {
  return mealId in cache.nutritionById;
}

/**
 * Dohvati statistiku cache-a
 */
export function getCacheStats(): {
  source: string;
  lastUpdated: string;
  totalMeals: number;
} {
  return {
    source: cache.source,
    lastUpdated: cache.lastUpdated,
    totalMeals: cache.totalMeals,
  };
}

/**
 * Dohvati sva jela s nutritivnim podacima
 */
export function getAllNutritionData(): Record<string, MealNutrition> {
  return cache.nutritionById;
}


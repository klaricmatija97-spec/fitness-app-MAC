/**
 * PRO Meal Plan Generator Service
 * 
 * Napredni generator dnevnog plana prehrane sa scoring sistemom i personalizacijom.
 * 
 * KORISTI TABLICE:
 * - client_calculations (target calories, protein, carbs, fat, goal)
 * - recipes (sa meal_type, goal_tags, diet_tags, health_score)
 * - foods (USDA baza + custom foods)
 * - recipe_ingredients (sastojci recepata)
 * 
 * KAKO SE RAČUNAJU SLOTOVI:
 * - Breakfast: 25% dnevnih kalorija/proteina/carbs/fat
 * - Lunch: 35% dnevnih kalorija/proteina/carbs/fat
 * - Dinner: 30% dnevnih kalorija/proteina/carbs/fat
 * - Snack: 10% dnevnih kalorija/proteina/carbs/fat
 * 
 * Distribucija varira prema goal-u:
 * - lose: manje carbs navečer, više proteina
 * - gain: više carbs kroz dan, uravnoteženo
 * - maintain: standardna distribucija
 * 
 * KAKO FUNKCIONIRA SCORING:
 * - calorieMatch (0-1): Koliko se kalorije kandidata poklapaju sa target kalorijama (gausova distribucija)
 * - macroMatch (0-1): Prosječno poklapanje proteina/carbs/fat sa target vrijednostima
 * - healthBonus (0-1): Bonus baziran na health_score (ako postoji, 0-100 se mapira na 0-1)
 * - varietyPenalty (0-1): Penalty ako se isti glavni protein ili recipe već pojavio taj dan
 * 
 * Total score = weighted sum:
 * - calorieMatch * 0.3
 * - macroMatch * 0.4
 * - healthBonus * 0.2
 * - (1 - varietyPenalty) * 0.1
 * 
 * KAKO POKRENUTI:
 * - Preko API-ja: POST /api/meal-plan/pro/generate { userId: "..." }
 * - Direktno iz koda: await generateProDailyMealPlan(userId)
 * 
 * REQUIRED:
 * - SQL skripta supabase-upgrade-recipes-foods.sql mora biti pokrenuta
 * - Korisnik mora imati client_calculations zapis
 * - Baza mora imati recipes i foods sa odgovarajućim poljima
 */

import { createServiceClient } from "../supabase";
import { getRecipes, getFoods } from "../db/queries";
import { calculateAll, determineActivityLevel, type ClientData } from "../calculations";
import { 
  searchFoods, 
  getFoodMacros, 
  getAllFoodsWithMacros,
  initializeCSVData 
} from "../data/csvLoader";
import { getUserData, updateUserCalculations } from "../data/userData";
import { loadUserCalculations, type UserCalculations as LoadedCalculations } from "../utils/loadCalculations";
import { translateFoodName } from "../utils/foodTranslations";
import { mealComponents, type MealComponentsConfig, type GoalType, getMealsForGoal, getDisplayName } from "../data/meal_components";
import { analyzeNutritionFromText } from "../services/edamamService";
import { findNamirnica, calculateMacrosForGrams, type Namirnica } from "../data/foods-database";
import type {
  Recipe,
  Food,
  MealCandidate,
  ScoredMeal,
  MealSlot,
} from "../db/models";

const supabase = createServiceClient();

// ============================================
// EDAMAM FALLBACK CONFIGURATION
// ============================================

// Feature flag: Opcijski Edamam fallback za sumnjive USDA rezultate
const USE_EDAMAM_FALLBACK = process.env.USE_EDAMAM_FALLBACK === 'true'; // Default: false

// Cache za Edamam rezultate (in-memory Map)
// Key: normalized ingredient name (lowercase, trimmed)
// Value: NutritionResult per 100g
const edamamCache = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();

// Concurrency limiter za Edamam API pozive
let edamamActiveRequests = 0;
const EDAMAM_MAX_CONCURRENT = 3;
const EDAMAM_TIMEOUT_MS = 5000; // 5 sekundi

// ============================================
// TYPES & INTERFACES
// ============================================

// ===== Composite Meal Types =====
type MealComponent = {
  food: string;
  grams: number;
};

type MealOption = {
  name: string;
  components: MealComponent[];
};

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

// Legacy types for backward compatibility
type ComponentDefinition = MealComponent;
type CompositeMealDefinition = MealOption;

const MEAL_COMPONENTS = mealComponents;

// ============================================
// PORTION LIMITS (kao web generator)
// ============================================

// LOSE MODE: Više proteina, manje UH i masti
const PORTION_LIMITS_LOSE: Record<string, { min: number; max: number }> = {
  "chicken_breast": { min: 100, max: 250 },
  "turkey_breast": { min: 100, max: 250 },
  "beef_lean": { min: 80, max: 200 },
  "beef": { min: 80, max: 200 },
  "salmon": { min: 80, max: 200 },
  "tuna_canned": { min: 80, max: 180 },
  "tuna": { min: 80, max: 180 },
  "egg_whole": { min: 50, max: 200 },
  "egg": { min: 50, max: 200 },
  "egg_white": { min: 50, max: 250 },
  "whey": { min: 25, max: 50 },
  "skyr": { min: 100, max: 250 },
  "oats": { min: 30, max: 80 },
  "rice_cooked": { min: 80, max: 200 },
  "rice": { min: 80, max: 200 },
  "pasta_cooked": { min: 80, max: 200 },
  "pasta": { min: 80, max: 200 },
  "potatoes": { min: 100, max: 250 },
  "sweet_potato": { min: 80, max: 200 },
  "bread": { min: 30, max: 80 },
  "toast": { min: 30, max: 80 },
  "banana": { min: 60, max: 120 },
  "granola": { min: 30, max: 60 },
  "avocado": { min: 30, max: 80 },
  "peanut_butter": { min: 10, max: 25 },
  "peanut butter": { min: 10, max: 25 },
  "olive_oil": { min: 5, max: 15 },
  "almonds": { min: 10, max: 25 },
  "butter": { min: 5, max: 15 },
  "butter light": { min: 5, max: 15 },
  "sour_cream": { min: 15, max: 50 },
  "sour cream": { min: 15, max: 50 },
  "greek_yogurt": { min: 100, max: 300 },
  "cottage_cheese": { min: 80, max: 250 },
  "milk": { min: 100, max: 300 },
  "apple": { min: 80, max: 150 },
  "blueberries": { min: 50, max: 100 },
  "default": { min: 30, max: 200 },
};

// MAINTAIN MODE: Uravnoteženo
const PORTION_LIMITS_MAINTAIN: Record<string, { min: number; max: number }> = {
  "chicken_breast": { min: 80, max: 200 },
  "turkey_breast": { min: 80, max: 200 },
  "beef_lean": { min: 80, max: 180 },
  "beef": { min: 80, max: 180 },
  "salmon": { min: 80, max: 180 },
  "tuna_canned": { min: 60, max: 150 },
  "tuna": { min: 60, max: 150 },
  "egg_whole": { min: 50, max: 180 },
  "egg": { min: 50, max: 180 },
  "egg_white": { min: 30, max: 200 },
  "whey": { min: 20, max: 40 },
  "skyr": { min: 80, max: 200 },
  "oats": { min: 40, max: 120 },
  "rice_cooked": { min: 100, max: 300 },
  "rice": { min: 100, max: 300 },
  "pasta_cooked": { min: 100, max: 300 },
  "pasta": { min: 100, max: 300 },
  "potatoes": { min: 100, max: 350 },
  "sweet_potato": { min: 100, max: 300 },
  "bread": { min: 40, max: 120 },
  "toast": { min: 40, max: 120 },
  "banana": { min: 80, max: 150 },
  "granola": { min: 40, max: 100 },
  "avocado": { min: 40, max: 120 },
  "peanut_butter": { min: 15, max: 40 },
  "peanut butter": { min: 15, max: 40 },
  "olive_oil": { min: 5, max: 25 },
  "almonds": { min: 15, max: 40 },
  "butter": { min: 5, max: 25 },
  "butter light": { min: 5, max: 25 },
  "sour_cream": { min: 20, max: 80 },
  "sour cream": { min: 20, max: 80 },
  "greek_yogurt": { min: 100, max: 250 },
  "cottage_cheese": { min: 80, max: 200 },
  "milk": { min: 100, max: 350 },
  "apple": { min: 80, max: 180 },
  "blueberries": { min: 50, max: 120 },
  "default": { min: 30, max: 250 },
};

// GAIN MODE: Više UH, manje proteina
const PORTION_LIMITS_GAIN: Record<string, { min: number; max: number }> = {
  "chicken_breast": { min: 50, max: 150 },
  "turkey_breast": { min: 50, max: 150 },
  "beef_lean": { min: 50, max: 150 },
  "beef": { min: 50, max: 150 },
  "salmon": { min: 50, max: 150 },
  "tuna_canned": { min: 50, max: 120 },
  "tuna": { min: 50, max: 120 },
  "egg_whole": { min: 30, max: 150 },
  "egg": { min: 30, max: 150 },
  "egg_white": { min: 20, max: 150 },
  "whey": { min: 15, max: 35 },
  "skyr": { min: 50, max: 150 },
  "oats": { min: 60, max: 150 },
  "rice_cooked": { min: 150, max: 400 },
  "rice": { min: 150, max: 400 },
  "pasta_cooked": { min: 150, max: 400 },
  "pasta": { min: 150, max: 400 },
  "potatoes": { min: 150, max: 500 },
  "sweet_potato": { min: 150, max: 400 },
  "bread": { min: 60, max: 200 },
  "toast": { min: 60, max: 150 },
  "banana": { min: 100, max: 200 },
  "granola": { min: 60, max: 120 },
  "avocado": { min: 40, max: 120 },
  "peanut_butter": { min: 15, max: 50 },
  "peanut butter": { min: 15, max: 50 },
  "olive_oil": { min: 10, max: 30 },
  "almonds": { min: 15, max: 40 },
  "butter": { min: 10, max: 30 },
  "butter light": { min: 10, max: 30 },
  "sour_cream": { min: 30, max: 100 },
  "sour cream": { min: 30, max: 100 },
  "greek_yogurt": { min: 80, max: 200 },
  "cottage_cheese": { min: 50, max: 150 },
  "milk": { min: 150, max: 450 },
  "apple": { min: 100, max: 200 },
  "blueberries": { min: 50, max: 150 },
  "default": { min: 40, max: 350 },
};

function getPortionLimitsForGoal(goalType: "lose" | "maintain" | "gain"): Record<string, { min: number; max: number }> {
  switch (goalType) {
    case "lose": return PORTION_LIMITS_LOSE;
    case "gain": return PORTION_LIMITS_GAIN;
    default: return PORTION_LIMITS_MAINTAIN;
  }
}

function getPortionLimits(foodKey: string, goalType?: "lose" | "maintain" | "gain"): { min: number; max: number } {
  const limits = getPortionLimitsForGoal(goalType || "maintain");
  const namirnica = findNamirnica(foodKey);
  
  if (!namirnica) {
    return limits["default"];
  }
  
  const byId = limits[namirnica.id];
  if (byId) return byId;
  
  const byName = limits[namirnica.name.toLowerCase()];
  if (byName) return byName;
  
  const byNameEn = limits[namirnica.nameEn.toLowerCase()];
  if (byNameEn) return byNameEn;
  
  return limits["default"];
}

function clampToPortionLimits(foodKey: string, grams: number, goalType?: "lose" | "maintain" | "gain"): number {
  const limits = getPortionLimits(foodKey, goalType);
  const clamped = Math.max(limits.min, Math.min(limits.max, Math.round(grams / 5) * 5));
  return clamped;
}

// Strong matching map: foodKey → USDA description aliases
const foodAliases: Record<string, string[]> = {
  "Egg": ["Egg", "Egg, whole, raw", "Eggs, whole, raw", "Chicken egg", "Egg, whole"],
  "Egg white": ["Egg white", "Egg whites", "Egg, white, raw", "Egg white, raw"],
  "Toast": ["Bread, toasted", "Toast", "Bread, white, toasted", "Bread, whole wheat, toasted", "Bread, whole grain"],
  "Avocado": ["Avocado", "Avocados, raw", "Avocado, raw"],
  "Oats": ["Oats", "Oatmeal", "Oats, rolled", "Oatmeal, cooked", "Oats, regular"],
  "Whey": ["Whey", "Whey protein", "Protein powder", "Whey protein powder", "Protein, whey"],
  "Banana": ["Banana", "Bananas, raw", "Banana, raw"],
  "Milk": ["Milk", "Milk, lowfat", "Milk, whole", "Milk, 2%", "Milk, 1%", "Milk, reduced fat"],
  "Greek yogurt": ["Yogurt, Greek, plain, lowfat", "Greek yogurt", "Yogurt, Greek", "Greek style yogurt", "Yogurt, Greek, plain"],
  "Skyr": ["Skyr", "Yogurt, Icelandic", "Icelandic yogurt", "Skyr, plain"],
  "Cottage cheese": ["Cottage cheese", "Cheese, cottage", "Cottage cheese, lowfat", "Cheese, cottage, lowfat"],
  "Chicken breast": ["Chicken breast", "Chicken, breast, raw", "Chicken, breast, skinless", "Chicken breast, skinless"],
  "Chicken ham": ["Chicken ham", "Chicken, deli", "Chicken, sliced", "Chicken sausage", "Chicken salami", "Ham, chicken"],
  "Turkey breast": ["Turkey breast", "Turkey, breast", "Turkey, breast, skinless", "Turkey, deli"],
  "Beef": ["Beef", "Beef, raw", "Beef, ground", "Beef, lean"],
  "Rice cooked": ["Rice cooked", "Rice, white, cooked", "Rice, brown, cooked", "Rice, cooked"],
  "Pasta cooked": ["Pasta cooked", "Spaghetti, cooked", "Pasta, cooked", "Macaroni, cooked"],
  "Potatoes": ["Potatoes, boiled", "Potatoes", "Potato, boiled", "Potatoes, cooked"],
  "Salmon": ["Salmon", "Salmon, Atlantic, raw", "Salmon, raw", "Salmon, cooked"],
  "Tuna": ["Tuna", "Tuna, light, canned", "Tuna, canned", "Tuna fish"],
  "Lettuce": ["Lettuce", "Lettuce, green leaf", "Lettuce, iceberg", "Lettuce, romaine"],
  "Tomato": ["Tomato", "Tomatoes, red, raw", "Tomato, raw", "Tomatoes, raw"],
  "Cucumber": ["Cucumber", "Cucumbers, raw", "Cucumber, raw"],
  "Mushroom": ["Mushroom", "Mushrooms", "Mushrooms, raw", "Mushroom, raw", "Champignon"],
  "Blueberries": ["Blueberries", "Blueberries, raw", "Blueberry, raw"],
  "Cherries": ["Cherries", "Cherries, sour, raw", "Cherries, sweet, raw", "Cherry, raw"],
  "Apple": ["Apple", "Apples, raw", "Apple, raw", "Apple, fresh"],
  "Ham": ["Ham", "Ham, cured", "Ham, cooked", "Ham, sliced"],
  "Broccoli": ["Broccoli", "Broccoli, raw", "Broccoli, cooked"],
  "Carrot": ["Carrot", "Carrots, raw", "Carrot, raw"],
  "Peanut butter": ["Peanut butter", "Peanut butter, smooth", "Peanut butter, creamy", "Butter, peanut"],
  "Almonds": ["Almonds", "Almonds, raw", "Nuts, almonds", "Almond"],
  "Onion": ["Onion", "Onions, raw", "Onion, raw", "Luk"],
  "Cashews": ["Cashews", "Nuts, cashew", "Cashew nuts", "Cashews, raw"],
  "Peanuts": ["Peanuts", "Peanuts, raw", "Nuts, peanuts", "Peanut"],
  "Frozen berries": ["Frozen berries", "Berries, frozen", "Mixed berries", "Berries mix"],
  "Rice crackers": ["Rice crackers", "Rice cakes", "Rice cake", "Crackers, rice"],
  "Buckwheat": ["Buckwheat", "Buckwheat groats", "Kasha", "Buckwheat, cooked"],
  "Corn": ["Corn", "Corn, sweet", "Sweet corn", "Corn, canned"],
  "Sour cream": ["Sour cream", "Cream, sour", "Vrhnje", "Cream"],
};

// Hrvatski nazivi za prikaz u aplikaciji
const croatianFoodNames: Record<string, string> = {
  "Egg": "Jaja",
  "Egg white": "Bjelanjak",
  "Toast": "Tost",
  "Avocado": "Avokado",
  "Oats": "Zobene pahuljice",
  "Whey": "Whey protein",
  "Banana": "Banana",
  "Milk": "Mlijeko",
  "Greek yogurt": "Grčki jogurt",
  "Skyr": "Skyr",
  "Cottage cheese": "Zrnati sir",
  "Chicken breast": "Pileća prsa",
  "Chicken ham": "Pileća šunka",
  "Turkey breast": "Pureća prsa",
  "Beef": "Junetina",
  "Rice cooked": "Riža",
  "Pasta cooked": "Tjestenina",
  "Potatoes": "Krumpir",
  "Salmon": "Losos",
  "Tuna": "Tuna",
  "Lettuce": "Zelena salata",
  "Tomato": "Rajčica",
  "Cucumber": "Krastavac",
  "Mushroom": "Gljive",
  "Blueberries": "Borovnice",
  "Cherries": "Višnje",
  "Apple": "Jabuka",
  "Ham": "Šunka",
  "Broccoli": "Brokula",
  "Carrot": "Mrkva",
  "Peanut butter": "Kikiriki maslac",
  "Almonds": "Bademi",
  "Onion": "Luk",
  "Cashews": "Indijski oraščići",
  "Peanuts": "Kikiriki",
  "Frozen berries": "Smrznuto voće",
  "Rice crackers": "Rižini krekeri",
  "Buckwheat": "Hajdinska kaša",
  "Corn": "Kukuruz",
  "Sour cream": "Vrhnje za kuhanje",
};

// Funkcija za dobivanje hrvatskog naziva namirnice
export function getCroatianFoodName(foodKey: string): string {
  return croatianFoodNames[foodKey] || foodKey;
}

/**
 * Pronađi USDA hranu po foodKey iz meal_components.json
 * 
 * @param allFoods - Lista svih dostupnih namirnica
 * @param foodKey - Ključ iz meal_components.json (npr. "Egg", "Chicken breast")
 * @returns Food objekt ili undefined ako nije pronađen (NIKADA ne baca exception)
 */
function findFoodByName(allFoods: Food[], foodKey: string): Food | undefined {
  try {
    if (!foodKey || !allFoods || allFoods.length === 0) {
      return undefined;
    }
    
    const normalizedKey = foodKey.trim();
    if (!normalizedKey) {
      return undefined;
    }
    
    const lowerKey = normalizedKey.toLowerCase();
    
    // 1. Provjeri aliase prvo (strong matching)
    const aliases = foodAliases[normalizedKey] || [];
    for (const alias of aliases) {
      // Exact match na alias
      const exactMatch = allFoods.find(f => {
        if (!f.name) return false;
        return f.name.toLowerCase().trim() === alias.toLowerCase().trim();
      });
      if (exactMatch) return exactMatch;
      
      // Partial match na alias
      const partialMatch = allFoods.find(f => {
        if (!f.name) return false;
        const foodNameLower = f.name.toLowerCase();
        const aliasLower = alias.toLowerCase();
        return foodNameLower.includes(aliasLower) || aliasLower.includes(foodNameLower);
      });
      if (partialMatch) return partialMatch;
    }
    
    // 2. Exact match na originalni foodKey
    const exact = allFoods.find(f => {
      if (!f.name) return false;
      return f.name.toLowerCase().trim() === lowerKey;
    });
    if (exact) return exact;
    
    // 3. Partial match (foodKey je substring u USDA description)
    const partialMatches = allFoods.filter(f => {
      if (!f.name) return false;
      return f.name.toLowerCase().includes(lowerKey);
    });
    if (partialMatches.length > 0) {
      // Sortiraj po duljini naziva (kraći = bolji match)
      partialMatches.sort((a, b) => (a.name?.length || 0) - (b.name?.length || 0));
      return partialMatches[0];
    }
    
    // 4. Reverse match (USDA description je substring u foodKey)
    const reverse = allFoods.find(f => {
      if (!f.name) return false;
      const foodNameLower = f.name.toLowerCase().trim();
      return lowerKey.includes(foodNameLower) && foodNameLower.length >= 3;
    });
    if (reverse) return reverse;
    
    // 5. Keyword matching (split foodKey i traži po riječima)
    const keywords = lowerKey.split(/\s+/).filter(k => k.length >= 3);
    for (const keyword of keywords) {
      const keywordMatch = allFoods.find(f => {
        if (!f.name) return false;
        return f.name.toLowerCase().includes(keyword);
      });
      if (keywordMatch) return keywordMatch;
    }
    
    // Nije pronađeno - vrati undefined (NE null, NE exception)
    return undefined;
  } catch (error) {
    // Nikada ne baci exception - samo logiraj i vrati undefined
    console.warn(`⚠️ Greška u findFoodByName za "${foodKey}":`, error);
    return undefined;
  }
}

// ===== Helper Functions for Quality Meal Selection =====

/**
 * Provjeri ima li obrok minimalan broj sastojaka
 */
function hasMinIngredients(meal: MealOption, min: number): boolean {
  return meal.components.length >= min;
}

/**
 * Provjeri dijele li dva obroka neku namirnicu
 */
function sharesIngredient(a: MealOption, b: MealOption): boolean {
  const foodsA = new Set(a.components.map(c => c.food));
  return b.components.some(c => foodsA.has(c.food));
}

/**
 * Izračunaj score za obrok s obzirom na raznolikost
 * Više sastojaka = bolje, ponavljanje sastojaka = penalty
 */
function scoreMealOption(
  option: MealOption,
  previousMeals: MealOption[]
): number {
  const ingredientCountScore = option.components.length; // više sastojaka = bolje
  const penaltyForRepeats = previousMeals.reduce((penalty, prev) => {
    return penalty + (sharesIngredient(option, prev) ? 2 : 0);
  }, 0);
  return ingredientCountScore - penaltyForRepeats;
}

/**
 * Odaberi sljedeći obrok uz sva pravila:
 * - minimalan broj sastojaka
 * - bez ponavljanja namirnica s prethodnim obrokom
 * - raznolikost kroz dan
 */
function pickNextMeal(
  allOptions: MealOption[],
  previousMeal: MealOption | null,
  previousMeals: MealOption[],
  minIngredients: number
): MealOption | null {
  // 1. Minimalan broj sastojaka
  let candidates = allOptions.filter(o => hasMinIngredients(o, minIngredients));

  // 2. Izbaciti one koji dijele namirnice s PRETHODNIM obrokom
  if (previousMeal) {
    candidates = candidates.filter(o => !sharesIngredient(o, previousMeal));
  }

  // Ako smo se previše suzili pa nema kandidata, popusti pravilo "bez ponavljanja"
  if (candidates.length === 0) {
    candidates = allOptions.filter(o => hasMinIngredients(o, minIngredients));
  }

  // Ako i dalje nema kandidata, vrati null
  if (candidates.length === 0) {
    return null;
  }

  // 3. Izračunaj score za svaki kandidat s obzirom na cijeli dan (da bude raznoliko)
  const scored = candidates.map(option => ({
    option,
    score: scoreMealOption(option, previousMeals),
  }));

  // 4. Odaberi najbolji score, ali uz malo slučajnosti (da nije uvijek ista kombinacija)
  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const topCandidates = scored.filter(s => s.score >= topScore - 1).map(s => s.option);

  const index = Math.floor(Math.random() * topCandidates.length);
  return topCandidates[index];
}

// Meal slot types
export type MealSlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'extraSnack';

export const MEAL_SLOT_LABELS: Record<MealSlotType, string> = {
  breakfast: 'Doručak',
  snack: 'Užina',
  lunch: 'Ručak',
  extraSnack: 'Dodatna užina',
  dinner: 'Večera',
};

/**
 * Vrati slotove obroka ovisno o broju obroka dnevno
 */
function getSlotsForMealsPerDay(mealsPerDay: number): MealSlotType[] {
  if (mealsPerDay === 3) {
    return ['breakfast', 'lunch', 'dinner'];
  }
  if (mealsPerDay === 4) {
    return ['breakfast', 'lunch', 'dinner', 'snack'];
  }
  if (mealsPerDay === 5) {
    return ['breakfast', 'snack', 'lunch', 'dinner', 'extraSnack'];
  }
  if (mealsPerDay === 6) {
    return ['breakfast', 'snack', 'lunch', 'snack', 'dinner', 'extraSnack'];
  }
  if (mealsPerDay === 7) {
    return ['breakfast', 'snack', 'lunch', 'snack', 'dinner', 'extraSnack', 'snack'];
  }
  // Default: 4 obroka
  return ['breakfast', 'lunch', 'dinner', 'snack'];
}

/**
 * Dohvati kandidate za određeni slot obroka
 * Filtrirati namirnice koje su već korištene taj dan i koje ne odgovaraju slotu
 */
function getCandidatesForSlot(
  allFoods: Food[],
  slot: MealSlotType,
  usedToday: Set<string>
): Food[] {
  return allFoods.filter((food) => {
    // Isključi namirnice koje su već korištene taj dan
    if (usedToday.has(food.id)) return false;
    
    // Ako namirnica ima mealSlot, provjeri da li odgovara slotu
    if (food.mealSlot && food.mealSlot !== slot) return false;
    
    return true;
  });
}

/**
 * Odaberi namirnicu za slot obroka
 * Dodaje odabranu namirnicu u usedToday set
 */
function chooseFoodForSlot(
  allFoods: Food[],
  slot: MealSlotType,
  usedToday: Set<string>
): Food | null {
  const candidates = getCandidatesForSlot(allFoods, slot, usedToday);
  if (!candidates.length) return null;

  // Odaberi nasumičnu namirnicu iz kandidata
  const index = Math.floor(Math.random() * candidates.length);
  const chosen = candidates[index];

  // Dodaj u usedToday set
  usedToday.add(chosen.id);
  return chosen;
}

/**
 * Zbroji makroe iz svih obroka
 */
function sumMealMacros(meals: Record<string, ScoredMeal | undefined>): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  let calories = 0, protein = 0, carbs = 0, fat = 0;

  Object.values(meals).forEach((meal) => {
    if (!meal) return;
    calories += meal.calories;
    protein += meal.protein;
    carbs += meal.carbs;
    fat += meal.fat;
  });

  return { calories, protein, carbs, fat };
}

/**
 * Generira fallback obrok ako sve ne uspije
 * Koristi jela iz meal_components.json (kao web generator)
 */
async function generateFallbackMeal(
  slot: MealSlotType,
  targetCalories: number,
  allFoods: Food[],
  usedToday: Set<string>,
  userGoal: GoalType = "maintain"
): Promise<ScoredMeal> {
  const slotKey = slot === "extraSnack" ? "snack" : (slot as "breakfast" | "lunch" | "dinner" | "snack");
  
  // Koristi jela iz meal_components.json (kao web generator)
  let definitions = getMealsForGoal(slotKey, userGoal);
  if (!definitions || definitions.length === 0) {
    // Ako nema obroka za cilj, koristi sve obroke
    console.warn(`⚠️ Nema obroka za cilj "${userGoal}" za ${slotKey}, koristim sve obroke`);
    definitions = MEAL_COMPONENTS[slotKey] || [];
  }
  
  if (definitions.length === 0) {
    // Ako i dalje nema, pokušaj s drugim slotom ili koristi sva jela
    console.error(`❌ Nema definicija za slot ${slotKey} u meal_components.json, pokušavam s alternativnim slotom...`);
    // Za snack, pokušaj koristiti bilo koje dostupno jelo
    if (slotKey === "snack") {
      // Pokušaj pronaći jela iz drugih slotova koji bi mogli biti snack
      const allMeals = [
        ...(MEAL_COMPONENTS.breakfast || []),
        ...(MEAL_COMPONENTS.lunch || []),
        ...(MEAL_COMPONENTS.dinner || []),
        ...(MEAL_COMPONENTS.snack || [])
      ];
      if (allMeals.length > 0) {
        definitions = allMeals.slice(0, 10); // Koristi prvih 10 jela
        console.warn(`⚠️ Koristim alternativna jela za snack: ${definitions.length} jela`);
      } else {
        throw new Error(`Nema dostupnih jela u meal_components.json za slot ${slotKey}`);
      }
    } else {
      throw new Error(`Nema definicija za slot ${slotKey} u meal_components.json`);
    }
  }
  
  // Odaberi nasumično jelo iz definicija
  const randomIndex = Math.floor(Math.random() * definitions.length);
  const selectedMeal = definitions[randomIndex];
  
  // Konvertiraj u MealOption format
  const mealOption = convertToMealOption(selectedMeal);
  
  // Izgradi obrok iz komponenti (koristi istu logiku kao buildCompositeMealForSlot)
  const componentDetails: Array<{ food: Food; grams: number; units?: number; displayText: string }> = [];
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  let missing = false;
  const missingFoods: string[] = [];
  
  for (const component of mealOption.components) {
    const food = findFoodByName(allFoods, component.food);
    
    if (!food) {
      missing = true;
      missingFoods.push(component.food);
      continue;
    }
    
    const grams = component.grams;
    const ratio = grams / 100;
    
    calories += (food.calories_per_100g || 0) * ratio;
    protein += (food.protein_per_100g || 0) * ratio;
    carbs += (food.carbs_per_100g || 0) * ratio;
    fat += (food.fat_per_100g || 0) * ratio;
    
    // Pronađi displayName iz originalne definicije
    const originalComponent = selectedMeal.components.find(c => c.food === component.food);
    const displayName = originalComponent?.displayName || getCroatianFoodName(component.food);
    const units = grams >= 50 ? Math.round(grams / 50) : undefined;
    const displayText = units ? `${units}x ${displayName}` : `${grams}g ${displayName}`;
    
    componentDetails.push({ food, grams, units, displayText });
    usedToday.add(food.id);
  }
  
  // Ako nedostaju komponente, pokušaj s drugim jelom
  if (missing && missingFoods.length > 0) {
    console.warn(`⚠️ Fallback obrok "${selectedMeal.name}" ima nedostajuće komponente: ${missingFoods.join(", ")}, pokušavam s drugim jelom...`);
    
    // Pokušaj s drugim jelom (isključi trenutno)
    const excluded = new Set([selectedMeal.name]);
    const remainingMeals = definitions.filter(m => m.name !== selectedMeal.name);
    
    if (remainingMeals.length > 0) {
      const nextMeal = remainingMeals[Math.floor(Math.random() * remainingMeals.length)];
      const nextMealOption = convertToMealOption(nextMeal);
      
      // Pokušaj ponovno s novim jelom
      return await generateFallbackMealFromMealOption(nextMealOption, targetCalories, allFoods, usedToday, slotKey);
    }
  }
  
  if (calories <= 0) {
    throw new Error(`Fallback obrok "${selectedMeal.name}" ima 0 kalorija`);
  }
  
  // Prilagodi kalorije prema targetu
  let factor = targetCalories > 0 ? targetCalories / calories : 1;
  factor = Math.max(0.7, Math.min(1.3, factor));
  
  // Prilagodi gramaže faktorom
  const adjustedComponentDetails = componentDetails.map(c => ({
    ...c,
    grams: Math.round(c.grams * factor * 10) / 10
  }));
  
  // Preračunaj makroe s faktorom
  calories = Math.round(calories * factor * 10) / 10;
  protein = Math.round(protein * factor * 10) / 10;
  carbs = Math.round(carbs * factor * 10) / 10;
  fat = Math.round(fat * factor * 10) / 10;
  
  const componentsString = adjustedComponentDetails.map(c => c.displayText).join(", ");
  
  return {
    id: `fallback-${slotKey}-${selectedMeal.id}`,
    type: "recipe" as const,
    name: selectedMeal.name, // Koristi hrvatski naziv iz meal_components.json
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    meta: {
      recipe: undefined,
      food: undefined,
      quantity: undefined,
      cuisine: null,
      prepTime: null,
      difficulty: null,
      healthScore: null,
      tags: ["fallback", ...(selectedMeal.tags || [])],
      goalTags: [],
      dietTags: [],
      description: selectedMeal.description,
      preparationTip: selectedMeal.preparationTip,
    },
    score: 0.5,
    description: selectedMeal.description,
    preparationTip: selectedMeal.preparationTip,
    scoreBreakdown: {
      calorieMatch: 0.5,
      macroMatch: 0.5,
      healthBonus: 0,
      varietyPenalty: 0,
      total: 0.5
    },
    componentsString,
    componentDetails: adjustedComponentDetails.map(c => ({
      foodName: translateFoodName(c.food.name),
      grams: c.grams,
      units: c.units,
      displayText: c.displayText
    }))
  } as ScoredMeal & { componentsString?: string; componentDetails?: Array<{ foodName: string; grams: number; units?: number; displayText: string }> };
}

/**
 * Helper funkcija za generiranje fallback obroka iz MealOption
 */
async function generateFallbackMealFromMealOption(
  mealOption: MealOption,
  targetCalories: number,
  allFoods: Food[],
  usedToday: Set<string>,
  slotKey: string
): Promise<ScoredMeal> {
  const componentDetails: Array<{ food: Food; grams: number; units?: number; displayText: string }> = [];
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  
  for (const component of mealOption.components) {
    const food = findFoodByName(allFoods, component.food);
    
    if (!food) continue;
    
    const grams = component.grams;
    const ratio = grams / 100;
    
    calories += (food.calories_per_100g || 0) * ratio;
    protein += (food.protein_per_100g || 0) * ratio;
    carbs += (food.carbs_per_100g || 0) * ratio;
    fat += (food.fat_per_100g || 0) * ratio;
    
    // Koristi hrvatski naziv namirnice
    const displayName = getCroatianFoodName(component.food);
    const units = grams >= 50 ? Math.round(grams / 50) : undefined;
    const displayText = units ? `${units}x ${displayName}` : `${grams}g ${displayName}`;
    
    componentDetails.push({ food, grams, units, displayText });
    usedToday.add(food.id);
  }
  
  if (calories <= 0) {
    throw new Error(`Fallback obrok ima 0 kalorija`);
  }
  
  // Prilagodi kalorije prema targetu
  let factor = targetCalories > 0 ? targetCalories / calories : 1;
  factor = Math.max(0.7, Math.min(1.3, factor));
  
  const adjustedComponentDetails = componentDetails.map(c => ({
    ...c,
    grams: Math.round(c.grams * factor * 10) / 10
  }));
  
  calories = Math.round(calories * factor * 10) / 10;
  protein = Math.round(protein * factor * 10) / 10;
  carbs = Math.round(carbs * factor * 10) / 10;
  fat = Math.round(fat * factor * 10) / 10;
  
  const componentsString = adjustedComponentDetails.map(c => c.displayText).join(", ");
  
  return {
    id: `fallback-${slotKey}-${mealOption.name}`,
    type: "recipe" as const,
    name: mealOption.name,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    meta: {
      recipe: undefined,
      food: undefined,
      quantity: undefined,
      cuisine: null,
      prepTime: null,
      difficulty: null,
      healthScore: null,
      tags: ["fallback"],
      goalTags: [],
      dietTags: []
    },
    score: 0.5,
    scoreBreakdown: {
      calorieMatch: 0.5,
      macroMatch: 0.5,
      healthBonus: 0,
      varietyPenalty: 0,
      total: 0.5
    },
    componentsString,
    componentDetails: adjustedComponentDetails.map(c => ({
      foodName: translateFoodName(c.food.name),
      grams: c.grams,
      units: c.units,
      displayText: c.displayText
    }))
  } as ScoredMeal & { componentsString?: string; componentDetails?: Array<{ foodName: string; grams: number; units?: number; displayText: string }> };
}

interface ClientCalculations {
  client_id: string;
  bmr: number;
  tdee: number;
  target_calories: number;
  goal_type: "lose" | "maintain" | "gain";
  protein_grams: number;
  carbs_grams: number;
  fats_grams: number;
}

interface ClientPreferences {
  allergies?: string[]; // Lista alergena koje treba izbjegavati
  dietary_restrictions?: string[]; // Lista dietary tagova koje treba koristiti (npr. ["vegetarian", "gluten-free"])
  cuisine_preferences?: string[]; // Lista preferiranih kuhinja
  max_prep_time?: number; // Maksimalno vrijeme pripreme u minutama
  diet_type?: "none" | "vegetarian" | "vegan"; // Tip prehrane
  disliked_foods?: string[]; // Lista namirnica koje korisnik ne voli
  disliked_ingredients?: string[]; // Lista sastojaka koje korisnik ne voli
  max_same_recipe_per_week?: number; // Maksimalno ponavljanje istog recepta u tjednu (default: 2)
}

interface ProDailyMealPlan {
  date: string; // ISO date string
  clientId: string;
  breakfast: ScoredMeal;
  lunch: ScoredMeal;
  dinner: ScoredMeal;
  snack: ScoredMeal;
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    deviation: {
      calories: number; // % devijacija
      protein: number;
      carbs: number;
      fat: number;
      total: number; // Weighted total deviation
    };
  };
}

// ============================================
// CONSTANTS
// ============================================

// Scoring weights
const SCORE_WEIGHTS = {
  calorieMatch: 0.3,
  macroMatch: 0.4,
  healthBonus: 0.2,
  variety: 0.1, // variety = 1 - varietyPenalty
};

// Meal slot distribucija (prema goal-u)
const MEAL_DISTRIBUTION = {
  lose: {
    breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
    lunch: { calories: 0.35, protein: 0.35, carbs: 0.40, fat: 0.35 },
    dinner: { calories: 0.25, protein: 0.30, carbs: 0.20, fat: 0.30 },
    snack: { calories: 0.15, protein: 0.10, carbs: 0.10, fat: 0.10 },
  },
  gain: {
    breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.20 },
    lunch: { calories: 0.30, protein: 0.30, carbs: 0.35, fat: 0.30 },
    dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.35 },
    snack: { calories: 0.15, protein: 0.15, carbs: 0.10, fat: 0.15 },
  },
  maintain: {
    breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
    lunch: { calories: 0.35, protein: 0.35, carbs: 0.35, fat: 0.35 },
    dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.30 },
    snack: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 },
  },
};

// Tolerance za kalorije (gausova distribucija)
const CALORIE_TOLERANCE = 50; // ±50 kalorija za optimal match

// Maksimalni broj kandidata po obroku
const MAX_CANDIDATES_PER_MEAL = 30;

// ============================================
// HELPER FUNCTIONS - DEVIATION CALCULATION
// ============================================

/**
 * Izračunaj devijaciju između target i actual vrijednosti
 * @param target - Ciljna vrijednost
 * @param actual - Stvarna vrijednost
 * @returns Devijacija (0 = idealno, 0.1 = 10% odstupanje)
 */
function calculateMacroDeviation(target: number, actual: number): number {
  if (!target || target <= 0) return 0;
  return Math.abs(actual - target) / target; // 0 = idealno, 0.1 = 10% odstupanje
}

/**
 * Izračunaj ukupnu dnevnu devijaciju od target makroa
 * @param target - Ciljni makroi { calories, protein, carbs, fat }
 * @param actual - Stvarni makroi { calories, protein, carbs, fat }
 * @returns Detaljnu devijaciju sa weighted total
 */
function calculateDailyDeviationDetailed(
  target: { calories: number; protein: number; carbs: number; fat: number },
  actual: { calories: number; protein: number; carbs: number; fat: number }
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  total: number; // Weighted total (niže je bolje)
} {
  const calDev = calculateMacroDeviation(target.calories, actual.calories);
  const protDev = calculateMacroDeviation(target.protein, actual.protein);
  const carbDev = calculateMacroDeviation(target.carbs, actual.carbs);
  const fatDev = calculateMacroDeviation(target.fat, actual.fat);

  // Daj malo veću težinu proteinima i kalorijama
  const weighted =
    calDev * 0.4 +
    protDev * 0.4 +
    carbDev * 0.1 +
    fatDev * 0.1;

  return {
    calories: Math.round(calDev * 1000) / 10, // U postocima sa 1 decimalom
    protein: Math.round(protDev * 1000) / 10,
    carbs: Math.round(carbDev * 1000) / 10,
    fat: Math.round(fatDev * 1000) / 10,
    total: Math.round(weighted * 1000) / 10, // U postocima
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Dohvati korisničke kalkulacije iz lokalnog storage-a ili Supabase
 * Ako kalkulacije ne postoje, automatski ih kreira iz podataka korisnika
 */
async function getClientCalculations(clientId: string): Promise<ClientCalculations | null> {
  // Prvo pokušaj učitati iz lokalnog storage-a (novi format)
  if (typeof window === "undefined") {
    // Server-side: koristi getUserData
    try {
      const userData = getUserData(clientId);
      if (userData && userData.calculations) {
        const calc = userData.calculations;
        return {
          client_id: clientId,
          bmr: calc.bmr,
          tdee: calc.tdee,
          target_calories: calc.targetCalories,
          goal_type: calc.goalType,
          protein_grams: calc.macros.protein,
          carbs_grams: calc.macros.carbs,
          fats_grams: calc.macros.fats,
        };
      }
    } catch (error) {
      console.warn("Error loading from local storage, falling back to Supabase:", error);
    }
  } else {
    // Client-side: pokušaj učitati iz localStorage (novi format)
    try {
      const { loadUserCalculationsLocal } = await import("../utils/userCalculationsLocal");
      const localCalc = loadUserCalculationsLocal();
      if (localCalc) {
        console.log("✅ Kalkulacije učitane iz localStorage za PRO generator");
        return {
          client_id: clientId,
          bmr: localCalc.bmr || 0,
          tdee: localCalc.tdee || 0,
          target_calories: localCalc.totalCalories,
          goal_type: localCalc.goalType || "maintain",
          protein_grams: localCalc.proteinGrams,
          carbs_grams: localCalc.carbGrams,
          fats_grams: localCalc.fatGrams,
        };
      }
    } catch (error) {
      console.warn("Error loading from localStorage (new format), trying other sources:", error);
    }
  }
  
  // Fallback na Supabase - prvo pokušaj novi endpoint, zatim stari
  try {
    // Pokušaj novi endpoint (user_calculations)
    try {
      const { getUserCalculations } = await import("../server/userCalculations");
      const newCalc = await getUserCalculations(clientId);
      if (newCalc) {
        return {
          client_id: clientId,
          bmr: newCalc.bmr || 0,
          tdee: newCalc.tdee || 0,
          target_calories: newCalc.totalCalories,
          goal_type: newCalc.goalType || "maintain",
          protein_grams: newCalc.proteinGrams,
          carbs_grams: newCalc.carbGrams,
          fats_grams: newCalc.fatGrams,
        };
      }
    } catch (newFormatError) {
      console.warn("Error loading from new format, trying legacy:", newFormatError);
    }

    // Fallback na stari format (client_calculations)
    const { data, error } = await supabase
      .from("client_calculations")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Kalkulacije ne postoje u client_calculations, pokušaj učitati iz clients tablice
        const { data: clientCalcData, error: clientCalcError } = await supabase
          .from("clients")
          .select("bmr, tdee, target_calories, goal_type, protein_grams, carbs_grams, fats_grams, activity_level")
          .eq("id", clientId)
          .single();

        if (!clientCalcError && clientCalcData) {
          // Ako postoje kalkulacije u clients tablici, koristi ih
          if (clientCalcData.target_calories && clientCalcData.protein_grams && clientCalcData.carbs_grams && clientCalcData.fats_grams) {
            console.log("✅ Kalkulacije učitane iz clients tablice");
            return {
              client_id: clientId,
              bmr: clientCalcData.bmr || 0,
              tdee: clientCalcData.tdee || 0,
              target_calories: clientCalcData.target_calories,
              goal_type: clientCalcData.goal_type || "maintain",
              protein_grams: clientCalcData.protein_grams,
              carbs_grams: clientCalcData.carbs_grams,
              fats_grams: clientCalcData.fats_grams,
            };
          }
        }

        // Kalkulacije ne postoje, pokušaj automatski kreirati iz podataka korisnika
        console.log(`Kalkulacije ne postoje za korisnika ${clientId}, pokušavam automatski kreirati...`);
        
        // Dohvati podatke korisnika
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("age_range, weight_value, weight_unit, height_value, height_unit, honorific, activities, goals")
          .eq("id", clientId)
          .single();

        if (clientError || !clientData) {
          console.error("Nije moguće dohvatiti podatke korisnika:", clientError);
          return null;
        }

        // Konvertuj podatke u format za kalkulator
        const age = parseInt(clientData.age_range?.split("-")[0]) || 30;
        const weight = clientData.weight_unit === "lb" 
          ? parseFloat(clientData.weight_value) * 0.453592 
          : parseFloat(clientData.weight_value) || 70;
        const height = clientData.height_unit === "in"
          ? parseFloat(clientData.height_value) * 2.54
          : parseFloat(clientData.height_value) || 175;
        
        const gender = clientData.honorific === "mr" ? "male" : "female";
        
        // Odredi activity level iz activities array-a
        const activityLevel = determineActivityLevel(clientData.activities || []);
        
        const clientDataForCalc: ClientData = {
          age,
          gender,
          weight,
          height,
          activityLevel,
          activities: clientData.activities || [],
          goals: clientData.goals || [],
        };

        // Izračunaj kalkulacije
        const calc = calculateAll(clientDataForCalc);

        // Spremi kalkulacije lokalno
        try {
          updateUserCalculations(clientId, {
            bmr: calc.bmr,
            tdee: calc.tdee,
            targetCalories: calc.targetCalories,
            goalType: calc.goalType,
            macros: calc.macros,
            activityLevel: calc.activityLevel,
          });
          console.log(`✅ Kalkulacije spremljene lokalno za korisnika ${clientId}`);
        } catch (localError) {
          console.warn("Greška pri spremanju lokalno, pokušavam Supabase:", localError);
        }

        // Spremi kalkulacije u bazu (fallback)
        const { error: saveError } = await supabase
          .from("client_calculations")
          .insert({
            client_id: clientId,
            bmr: calc.bmr,
            tdee: calc.tdee,
            target_calories: calc.targetCalories,
            goal_type: calc.goalType,
            protein_grams: calc.macros.protein,
            carbs_grams: calc.macros.carbs,
            fats_grams: calc.macros.fats,
            activity_level: calc.activityLevel,
          });

        if (saveError) {
          console.warn("Greška pri spremanju u Supabase (lokalno je spremljeno):", saveError);
        }

        console.log(`Kalkulacije su automatski kreirane za korisnika ${clientId}`);

        // Vrati kreirane kalkulacije
        return {
          client_id: clientId,
          bmr: calc.bmr,
          tdee: calc.tdee,
          target_calories: calc.targetCalories,
          goal_type: calc.goalType,
          protein_grams: calc.macros.protein,
          carbs_grams: calc.macros.carbs,
          fats_grams: calc.macros.fats,
        };
      }
      throw error;
    }

    return {
      client_id: data.client_id,
      bmr: parseFloat(data.bmr),
      tdee: parseFloat(data.tdee),
      target_calories: parseFloat(data.target_calories),
      goal_type: data.goal_type,
      protein_grams: parseFloat(data.protein_grams),
      carbs_grams: parseFloat(data.carbs_grams),
      fats_grams: parseFloat(data.fats_grams),
    };
  } catch (error) {
    console.error("Error fetching client calculations:", error);
    throw error;
  }
}

/**
 * Dohvati korisničke preference (ako postoje)
 */
async function getClientPreferences(clientId: string): Promise<ClientPreferences> {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select(
        "allergies, dietary_restrictions, cuisine_preferences, max_prep_time_minutes, diet_type, disliked_foods, disliked_ingredients, max_same_recipe_per_week"
      )
      .eq("id", clientId)
      .single();

    if (error) {
      // Ako polja ne postoje, vraćamo prazne preference
      return {};
    }

    return {
      allergies: data.allergies ? (Array.isArray(data.allergies) ? data.allergies : [data.allergies]) : undefined,
      dietary_restrictions: data.dietary_restrictions
        ? Array.isArray(data.dietary_restrictions)
          ? data.dietary_restrictions
          : [data.dietary_restrictions]
        : undefined,
      cuisine_preferences: data.cuisine_preferences
        ? Array.isArray(data.cuisine_preferences)
          ? data.cuisine_preferences
          : [data.cuisine_preferences]
        : undefined,
      max_prep_time: data.max_prep_time_minutes ? parseInt(data.max_prep_time_minutes) : undefined,
      diet_type: data.diet_type || undefined,
      disliked_foods: data.disliked_foods
        ? Array.isArray(data.disliked_foods)
          ? data.disliked_foods
          : [data.disliked_foods]
        : undefined,
      disliked_ingredients: data.disliked_ingredients
        ? Array.isArray(data.disliked_ingredients)
          ? data.disliked_ingredients
          : [data.disliked_ingredients]
        : undefined,
      max_same_recipe_per_week: data.max_same_recipe_per_week ? parseInt(data.max_same_recipe_per_week) : 2,
    };
  } catch (error) {
    // Ako greška, vraćamo prazne preference
    return {};
  }
}

/**
 * Izračunaj meal slotove na temelju target makroa i goal-a
 */
function buildMealSlots(
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  goal: "lose" | "maintain" | "gain"
): MealSlot[] {
  const distribution = MEAL_DISTRIBUTION[goal];

  return [
    {
      id: "breakfast",
      name: "Doručak",
      targetCalories: Math.round(targetCalories * distribution.breakfast.calories),
      targetProtein: Math.round(targetProtein * distribution.breakfast.protein * 10) / 10,
      targetCarbs: Math.round(targetCarbs * distribution.breakfast.carbs * 10) / 10,
      targetFat: Math.round(targetFat * distribution.breakfast.fat * 10) / 10,
    },
    {
      id: "lunch",
      name: "Ručak",
      targetCalories: Math.round(targetCalories * distribution.lunch.calories),
      targetProtein: Math.round(targetProtein * distribution.lunch.protein * 10) / 10,
      targetCarbs: Math.round(targetCarbs * distribution.lunch.carbs * 10) / 10,
      targetFat: Math.round(targetFat * distribution.lunch.fat * 10) / 10,
    },
    {
      id: "dinner",
      name: "Večera",
      targetCalories: Math.round(targetCalories * distribution.dinner.calories),
      targetProtein: Math.round(targetProtein * distribution.dinner.protein * 10) / 10,
      targetCarbs: Math.round(targetCarbs * distribution.dinner.carbs * 10) / 10,
      targetFat: Math.round(targetFat * distribution.dinner.fat * 10) / 10,
    },
    {
      id: "snack",
      name: "Užina",
      targetCalories: Math.round(targetCalories * distribution.snack.calories),
      targetProtein: Math.round(targetProtein * distribution.snack.protein * 10) / 10,
      targetCarbs: Math.round(targetCarbs * distribution.snack.carbs * 10) / 10,
      targetFat: Math.round(targetFat * distribution.snack.fat * 10) / 10,
    },
  ];
}

/**
 * Dohvati relevantne recepte za određeni meal slot
 * Sa podrškom za user preferences (diet_type, disliked_ingredients, max_prep_time)
 */
async function getRelevantRecipes(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  goal: string,
  preferences: ClientPreferences,
  excludeRecipeIds: string[] = [] // Recepti koje treba isključiti (za weekly variety)
): Promise<Recipe[]> {
  try {
    let query = supabase.from("recipes").select("*").eq("meal_type", mealType);

    // Isključi recepte koje ne smijemo koristiti (za weekly variety)
    // Filtriranje će biti napravljeno post-processing nakon dohvaćanja podataka

    // Filtriranje po goal_tags
    if (goal) {
      query = query.contains("goal_tags", [goal]);
    }

    // Filtriranje po diet_type
    if (preferences.diet_type) {
      if (preferences.diet_type === "vegetarian") {
        // Isključi recepte sa mesom (proveri tags ili naziv)
        // Koristi se diet_tags ili tags polje - filtriranje će biti u post-processing
      } else if (preferences.diet_type === "vegan") {
        // Isključi meso i dairy/egg - filtriranje će biti u post-processing
        query = query.or("diet_tags.cs.[\"vegan\"],tags.cs.[\"vegan\"]");
      }
    }

    // Filtriranje po diet_tags (ako korisnik ima dietary restrictions)
    if (preferences.dietary_restrictions && preferences.dietary_restrictions.length > 0) {
      query = query.overlaps("diet_tags", preferences.dietary_restrictions);
    }

    // Filtriranje po cuisine preferences (ako postoje)
    if (preferences.cuisine_preferences && preferences.cuisine_preferences.length > 0) {
      query = query.in("cuisine", preferences.cuisine_preferences);
    }

    // Filtriranje po max_prep_time_minutes
    if (preferences.max_prep_time) {
      query = query.or(`prep_time_minutes.is.null,prep_time_minutes.lte.${preferences.max_prep_time}`);
    }

    // Sortiraj po health_score (descending) ako postoji
    query = query.order("health_score", { ascending: false, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching recipes:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return [];
    }

    // Konvertuj JSONB arrays u string[] i filtriraj po disliked_ingredients i diet_type
    let recipes = (data || []).map((recipe: any) => ({
      ...recipe,
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      goal_tags: Array.isArray(recipe.goal_tags) ? recipe.goal_tags : [],
      diet_tags: Array.isArray(recipe.diet_tags) ? recipe.diet_tags : [],
    })) as Recipe[];
    
    console.log(`   📋 Pronađeno ${recipes.length} recepata za ${mealType} (prije filtriranja)`);

    // Isključi recepte koje ne smijemo koristiti (za weekly variety)
    if (excludeRecipeIds.length > 0) {
      recipes = recipes.filter((recipe) => !excludeRecipeIds.includes(recipe.id));
    }

    // Filtriranje po diet_type (post-processing)
    if (preferences.diet_type) {
      if (preferences.diet_type === "vegetarian") {
        const meatTags = ["meat", "beef", "chicken", "pork", "turkey", "fish", "tuna", "salmon", "lamb"];
        recipes = recipes.filter((recipe) => {
          const allTags = [...(recipe.tags || []), ...(recipe.diet_tags || []), ...(recipe.goal_tags || [])].map(
            (tag) => tag.toLowerCase()
          );
          const nameLower = recipe.name.toLowerCase();
          return !meatTags.some((meat) => allTags.some((tag) => tag.includes(meat)) || nameLower.includes(meat));
        });
      } else if (preferences.diet_type === "vegan") {
        const excludedTags = [
          "meat",
          "beef",
          "chicken",
          "pork",
          "turkey",
          "fish",
          "tuna",
          "salmon",
          "lamb",
          "dairy",
          "egg",
          "eggs",
          "milk",
          "cheese",
        ];
        recipes = recipes.filter((recipe) => {
          const allTags = [...(recipe.tags || []), ...(recipe.diet_tags || []), ...(recipe.goal_tags || [])].map(
            (tag) => tag.toLowerCase()
          );
          const nameLower = recipe.name.toLowerCase();
          return (
            !excludedTags.some((excluded) => allTags.some((tag) => tag.includes(excluded)) || nameLower.includes(excluded))
          );
        });
      }
    }

    // Filtriranje po disliked_ingredients i disliked_foods (case-insensitive)
    if (preferences.disliked_ingredients && preferences.disliked_ingredients.length > 0) {
      const dislikedLower = preferences.disliked_ingredients.map((item) => item.toLowerCase());
      recipes = recipes.filter((recipe) => {
        const recipeNameLower = recipe.name.toLowerCase();
        const recipeTags = [...(recipe.tags || []), ...(recipe.diet_tags || []), ...(recipe.goal_tags || [])].map(
          (tag) => tag.toLowerCase()
        );

        // Provjeri da li naziv ili tagovi sadrže disliked ingredient
        const hasDisliked = dislikedLower.some((disliked) => {
          return recipeNameLower.includes(disliked) || recipeTags.some((tag) => tag.includes(disliked));
        });

        return !hasDisliked;
      });
    }

    if (preferences.disliked_foods && preferences.disliked_foods.length > 0) {
      const dislikedLower = preferences.disliked_foods.map((item) => item.toLowerCase());
      recipes = recipes.filter((recipe) => {
        const recipeNameLower = recipe.name.toLowerCase();
        const recipeTags = [...(recipe.tags || []), ...(recipe.diet_tags || []), ...(recipe.goal_tags || [])].map(
          (tag) => tag.toLowerCase()
        );

        const hasDisliked = dislikedLower.some((disliked) => {
          return recipeNameLower.includes(disliked) || recipeTags.some((tag) => tag.includes(disliked));
        });

        return !hasDisliked;
      });
    }

    return recipes;
  } catch (error) {
    console.error("Error in getRelevantRecipes:", error);
    return [];
  }
}

/**
 * Dohvati relevantne namirnice za snack ili dopunu
 * Koristi CSV podatke umjesto Supabase za brz pristup
 */
async function getRelevantFoods(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  preferences: ClientPreferences,
  targetProtein?: number
): Promise<Food[]> {
  try {
    // Inicijaliziraj CSV podatke ako nisu već učitani
    try {
      await initializeCSVData();
    } catch (csvInitError) {
      console.warn("⚠️ Greška pri inicijalizaciji CSV podataka, koristim Supabase:", csvInitError);
      // Nastavi na Supabase fallback
    }
    
    // Dohvati sve namirnice sa makronutrijentima
    let foodsWithMacros: Array<{
      fdc_id: number;
      description: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    }> = [];
    
    try {
      foodsWithMacros = await getAllFoodsWithMacros(1000); // Limit na 1000 za performanse
    } catch (csvError) {
      console.warn("⚠️ Greška pri dohvatu CSV podataka, koristim Supabase:", csvError);
      // Nastavi na Supabase fallback
    }
    
    // Ako nema CSV podataka, koristi Supabase
    if (!foodsWithMacros || foodsWithMacros.length === 0) {
      throw new Error("CSV podaci nisu dostupni, koristim Supabase");
    }
    
    // FILTRIRAJ namirnice sa 0 kalorija ili nedostajućim vrijednostima
    foodsWithMacros = foodsWithMacros.filter(f => {
      return f.calories > 0 && 
             f.protein >= 0 && 
             f.carbs >= 0 && 
             f.fats >= 0 &&
             !isNaN(f.calories) && 
             !isNaN(f.protein) && 
             !isNaN(f.carbs) && 
             !isNaN(f.fats);
    });
    
    // Ako nakon filtriranja nema namirnica, koristi Supabase
    if (foodsWithMacros.length === 0) {
      throw new Error("Nema validnih namirnica u CSV-u, koristim Supabase");
    }
    
    // Za snack, prioritiziraj high-protein foods
    if (mealType === "snack" && targetProtein && targetProtein > 10) {
      foodsWithMacros = foodsWithMacros
        .filter(f => f.protein >= 15 && f.calories > 50) // Minimum 50 kalorija za snack
        .sort((a, b) => b.protein - a.protein);
    } else {
      // Za glavne obroke, prioritiziraj namirnice sa više kalorija i makronutrijenata
      foodsWithMacros = foodsWithMacros
        .filter(f => f.calories > 50) // Minimum 50 kalorija po 100g
        .sort((a, b) => {
          // Sortiraj po ukupnoj nutritivnoj vrijednosti (kalorije + proteini + carbs + fats)
          const scoreA = a.calories + (a.protein * 4) + (a.carbs * 4) + (a.fats * 9);
          const scoreB = b.calories + (b.protein * 4) + (b.carbs * 4) + (b.fats * 9);
          return scoreB - scoreA; // Descending order
        });
    }
    
    // Filtriranje po allergens (izbjegavaj ako korisnik ima alergije)
    if (preferences.allergies && preferences.allergies.length > 0) {
      const allergiesLower = preferences.allergies.map(a => a.toLowerCase());
      foodsWithMacros = foodsWithMacros.filter(f => {
        const descLower = f.description.toLowerCase();
        return !allergiesLower.some(allergy => descLower.includes(allergy));
      });
    }
    
    // Konvertuj CSV format u Food format
    const foods: Food[] = foodsWithMacros.slice(0, 100).map((csvFood) => ({
      id: `csv-${csvFood.fdc_id}`, // Generiraj ID iz fdc_id
      name: csvFood.description,
      calories_per_100g: csvFood.calories,
      protein_per_100g: csvFood.protein,
      carbs_per_100g: csvFood.carbs,
      fat_per_100g: csvFood.fats,
      category: "ostalo", // Default kategorija
      tags: [], // CSV nema tags, ali možemo dodati logiku za kategorizaciju
      allergens: null,
      usda_fdc_id: csvFood.fdc_id,
      is_usda: true,
      default_serving_size_g: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    return foods;
  } catch (error) {
    console.error("Error in getRelevantFoods (CSV):", error);
    // Fallback na Supabase ako CSV ne radi
    try {
      let query = supabase.from("foods").select("*");
      if (mealType === "snack" && targetProtein && targetProtein > 10) {
        query = query.gte("protein_per_100g", 15).order("protein_per_100g", { ascending: false });
      } else {
        query = query.order("name", { ascending: true });
      }
      const { data, error: dbError } = await query;
      if (dbError) throw dbError;
      return (data || []).map((food: any) => ({
        ...food,
        tags: Array.isArray(food.tags) ? food.tags : [],
      })) as Food[];
    } catch (fallbackError) {
      console.error("Error in getRelevantFoods fallback:", fallbackError);
      return [];
    }
  }
}

/**
 * Kreiraj MealCandidate iz recepta
 */
function createMealCandidateFromRecipe(recipe: Recipe, quantity: number = 1): MealCandidate {
  return {
    id: recipe.id,
    type: "recipe",
    name: recipe.name,
    calories: Math.round(recipe.total_calories * quantity * 10) / 10,
    protein: Math.round(recipe.total_protein * quantity * 10) / 10,
    carbs: Math.round(recipe.total_carbs * quantity * 10) / 10,
    fat: Math.round(recipe.total_fat * quantity * 10) / 10,
    meta: {
      recipe,
      quantity,
      cuisine: recipe.cuisine || null,
      prepTime: recipe.prep_time_minutes || recipe.cooking_time_min || null,
      difficulty: recipe.difficulty || null,
      healthScore: recipe.health_score || null,
      tags: recipe.tags || [],
      goalTags: recipe.goal_tags || [],
      dietTags: recipe.diet_tags || [],
    },
  };
}

/**
 * Konvertiraj CompositeMealDefinition u MealOption
 */
function convertToMealOption(def: CompositeMealDefinition): MealOption {
  return {
    name: def.name,
    components: def.components.map(c => ({ food: c.food, grams: c.grams })),
  };
}

/**
 * Provjeri da li obrok sadrži izbjegavane namirnice (kao web generator)
 */
function hasAvoidedIngredient(meal: MealOption, avoidIngredients: string[]): boolean {
  if (avoidIngredients.length === 0) return false;

  const mealIngredients = meal.components.map(c => c.food.toLowerCase());
  const avoidLower = avoidIngredients.map(a => a.toLowerCase());

  return mealIngredients.some(ing => {
    return avoidLower.some(avoid => ing.includes(avoid) || avoid.includes(ing));
  });
}

/**
 * Provjeri da li obrok sadrži preferirane namirnice (kao web generator)
 */
function hasPreferredIngredient(meal: MealOption, preferredIngredients: string[]): boolean {
  if (preferredIngredients.length === 0) return false;

  const mealIngredients = meal.components.map(c => c.food.toLowerCase()).join(" ");
  const prefLower = preferredIngredients.map(p => p.toLowerCase());

  return prefLower.some(pref => mealIngredients.includes(pref));
}

// BLACKLIST namirnica koje se NIKAD ne smiju pojaviti u snack-u
const SNACK_BLACKLIST = [
  'tomato', 'rajčica', 'cucumber', 'krastavac', 'lettuce', 'salata', 
  'cabbage', 'pepper', 'onion', 'garlic', 'water', 'voda', 
  'flour', 'brašno', 'oil', 'ulje', 'spices', 'začini'
];

// Sportski sastojci koji su dozvoljeni u snack-u
const SPORTS_SNACK_INGREDIENTS = [
  'whey', 'yogurt', 'jogurt', 'milk', 'mlijeko', 'oats', 'zobene',
  'banana', 'apple', 'jabuka', 'berries', 'borovnice', 'cherries', 'višnje',
  'greek yogurt', 'grčki jogurt', 'skyr', 'protein'
];

/**
 * Provjeri da li snack template zadovoljava validaciju
 */
function isValidSnackTemplate(
  meal: MealOption,
  allFoods: Food[]
): { valid: boolean; calories: number; protein: number; hasSportsIngredient: boolean } {
  let calories = 0;
  let protein = 0;
  let hasSportsIngredient = false;
  
  for (const component of meal.components) {
    const foodLower = component.food.toLowerCase();
    
    // Provjeri blacklist
    if (SNACK_BLACKLIST.some(blacklisted => foodLower.includes(blacklisted))) {
      return { valid: false, calories: 0, protein: 0, hasSportsIngredient: false };
    }
    
    // Provjeri sportski sastojak
    if (SPORTS_SNACK_INGREDIENTS.some(sports => foodLower.includes(sports))) {
      hasSportsIngredient = true;
    }
    
    const food = findFoodByName(allFoods, component.food);
    if (!food) {
      // Ako namirnica nije pronađena, template nije validan
      return { valid: false, calories: 0, protein: 0, hasSportsIngredient: false };
    }
    
    const ratio = (component.grams || 0) / 100;
    calories += (food.calories_per_100g || 0) * ratio;
    protein += (food.protein_per_100g || 0) * ratio;
  }
  
  // Validacija: min 80 kcal (smanjeno s 120), min 5g proteina (smanjeno s 8g), mora imati sportski sastojak
  // Popustamo jer neki template-i (npr. "Voće" s jabukom) imaju dovoljno kalorija ali manje proteina
  const hasProteinSource = meal.components.some(c => {
    const foodLower = c.food.toLowerCase();
    return foodLower.includes('whey') || foodLower.includes('protein') || 
           foodLower.includes('yogurt') || foodLower.includes('jogurt') || 
           foodLower.includes('milk') || foodLower.includes('mlijeko');
  });
  
  // Ako ima protein izvor (whey, jogurt, mlijeko), minimalni protein je 5g, inače 3g
  const minProtein = hasProteinSource ? 5 : 3;
  const minCalories = 80; // Smanjeno s 120
  const valid = calories >= minCalories && protein >= minProtein && hasSportsIngredient;
  
  return { valid, calories, protein, hasSportsIngredient };
}

/**
 * Provjeri da li lunch/dinner template ima dovoljno kalorija (ne samo povrće)
 */
function isValidLunchDinnerTemplate(
  meal: MealOption,
  allFoods: Food[]
): { valid: boolean; calories: number } {
  const vegetables = ['lettuce', 'salata', 'tomato', 'rajčica', 'cucumber', 'krastavac', 'broccoli', 'brokula', 'carrot', 'mrkva'];
  let totalCalories = 0;
  let nonVegetableCalories = 0;
  
  for (const component of meal.components) {
    const food = findFoodByName(allFoods, component.food);
    if (!food) {
      // Ako namirnica nije pronađena, template nije validan
      return { valid: false, calories: 0 };
    }
    
    const ratio = (component.grams || 0) / 100;
    const componentCalories = (food.calories_per_100g || 0) * ratio;
    totalCalories += componentCalories;
    
    const foodLower = component.food.toLowerCase();
    if (!vegetables.some(veg => foodLower.includes(veg))) {
      nonVegetableCalories += componentCalories;
    }
  }
  
  // Povrće je OK, ali mora biti i nešto drugo (protein, carbs)
  const valid = totalCalories > 0 && nonVegetableCalories >= 100;
  return { valid, calories: totalCalories };
}

/**
 * Build composite meal for a slot from meal_components.json
 * Koristi ISTU jednostavnu logiku kao web generator - samo alergije su hard constraint
 */
async function buildCompositeMealForSlot(
  slot: MealSlotType,
  allFoods: Food[],
  usedToday: Set<string>,
  slotTargetCalories: number,
  previousMeal: MealOption | null = null,
  previousMeals: MealOption[] = [],
  minIngredients: number = 2,
  usedMealsThisWeek: Set<string> | null = null,
  previousDayMeal: MealOption | null = null,
  excludedMealNames: Set<string> = new Set(),
  userGoal: GoalType = "maintain",
  preferences?: {
    avoidIngredients?: string[];
    preferredIngredients?: string[];
  }
): Promise<ScoredMeal | null> {
  // extraSnack koristi snack šablone
  const slotKey = slot === "extraSnack" ? "snack" : (slot as "breakfast" | "lunch" | "dinner" | "snack");
  
  // Filtriraj obroke prema cilju korisnika (kao web generator)
  let definitions = getMealsForGoal(slotKey, userGoal);
  if (!definitions || definitions.length === 0) {
    // Ako nema obroka za cilj, koristi sve obroke
    console.warn(`⚠️ Nema obroka za cilj "${userGoal}" za ${slotKey}, koristim sve obroke`);
    definitions = MEAL_COMPONENTS[slotKey] || [];
    if (definitions.length === 0) {
      console.error(`❌ Nema definicija za slot ${slotKey} u meal_components.json`);
      return null;
    }
  }

  // Konvertiraj u MealOption format i filtriraj isključene obroke
  let availableMeals: MealOption[] = definitions
    .map(convertToMealOption)
    .filter(opt => !excludedMealNames.has(opt.name));

  // JEDINA HARD CONSTRAINT: alergije i "ne želim" (kao web generator)
  const avoidIngredients = preferences?.avoidIngredients || [];
  if (avoidIngredients.length > 0) {
    availableMeals = availableMeals.filter(meal => !hasAvoidedIngredient(meal, avoidIngredients));
  }

  // Ako nema jela nakon filtriranja alergija, vrati null (ali logiraj detalje)
  if (availableMeals.length === 0) {
    console.error(`❌ Nema jela za ${slot} nakon filtriranja alergija`);
    console.error(`   Ukupno definicija: ${definitions.length}`);
    console.error(`   Isključeni obroci: ${excludedMealNames.size}`);
    console.error(`   Alergije: ${avoidIngredients.join(', ') || 'nema'}`);
    return null;
  }
  
  // console.log(`✅ Pronađeno ${availableMeals.length} dostupnih jela za ${slot} (od ${definitions.length} ukupno)`); // Onemogućeno za brzinu

  // MEAL VARIETY: Jelo se ne smije ponoviti unutar 7 dana (kao web generator)
  // Koristi meal ID iz definitions (ako postoji) ili meal name
  const usedMealIds = new Set<string>();
  const usedMealNamesToday = new Set<string>();
  const usedMealNamesThisWeek = usedMealsThisWeek || new Set<string>();
  
  // Popuni usedMealIds i usedMealNamesToday iz previousMeals
  for (const prevMeal of previousMeals) {
    const mealDef = definitions.find(d => d.name === prevMeal.name);
    if (mealDef?.id) {
      usedMealIds.add(mealDef.id);
    }
    usedMealNamesToday.add(prevMeal.name.toLowerCase());
  }
  
  let preferredMeals = availableMeals.filter(meal => {
    const mealDef = definitions.find(d => d.name === meal.name);
    const mealId = mealDef?.id || meal.name;
    return !usedMealIds.has(mealId) && 
           !usedMealNamesToday.has(meal.name.toLowerCase()) &&
           !usedMealNamesThisWeek.has(meal.name.toLowerCase());
  });

  // Ako nema novih jela nakon variety filtra, dozvoli ponavljanje (ali ne isti ID)
  if (preferredMeals.length === 0) {
    preferredMeals = availableMeals.filter(meal => {
      const mealDef = definitions.find(d => d.name === meal.name);
      const mealId = mealDef?.id || meal.name;
      return !usedMealIds.has(mealId) &&
             !usedMealNamesToday.has(meal.name.toLowerCase());
    });
  }

  // Ako i dalje nema, koristi sva dostupna jela (osim alergija) - kao web generator
  if (preferredMeals.length === 0) {
    preferredMeals = availableMeals;
  }

  // Preferiraj obroke s preferiranim namirnicama (weighted selection - 70% šansa, kao web generator)
  const preferredIngredients = preferences?.preferredIngredients || [];
  let finalMealOptions: MealOption[];
  if (preferredIngredients.length > 0) {
    const mealsWithPrefs = preferredMeals.filter(meal => hasPreferredIngredient(meal, preferredIngredients));
    if (mealsWithPrefs.length > 0 && Math.random() < 0.7) {
      finalMealOptions = mealsWithPrefs;
    } else {
      finalMealOptions = preferredMeals;
    }
  } else {
    finalMealOptions = preferredMeals;
  }

  // Nasumično odaberi iz dostupnih jela (kao web generator)
  if (finalMealOptions.length === 0) {
    console.error(`❌ Nema dostupnih jela za ${slot} nakon svih filtera`);
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * finalMealOptions.length);
  const selectedMeal = finalMealOptions[randomIndex];

  // Provjeri da li su sve namirnice dostupne i izračunaj makroe
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  let missing = false;
  let componentDetails: Array<{ food: Food; grams: number; units?: number; displayText: string }> = [];
  const missingFoods: string[] = [];

  // EDAMAM-ONLY MODE: Koristi Edamam API za izračun makronutrijenata
  // ONEMOGUĆENO za brzinu - koristi samo USDA podatke (kao web generator)
  // Web generator koristi samo USDA podatke bez Edamam API poziva
  const USE_EDAMAM_ONLY = false; // Default: false (koristi USDA podatke, brže)

  if (USE_EDAMAM_ONLY) {
    // Koristi Edamam API za izračun makronutrijenata
    const ingredientComponents = selectedMeal.components
      .filter(c => !c.food.toLowerCase().includes('water') && !c.food.toLowerCase().includes('voda'))
      .map(c => {
        const food = findFoodByName(allFoods, c.food);
        if (!food) return null;
        
        // Provjeri da li je namirnica već korištena
        if (usedToday.has(food.id)) {
          return null;
        }

        let actualGrams = c.grams;
        let units: number | undefined;
        
        // Ako je jaja i ima units property, koristi units
        if (c.food.toLowerCase().includes('egg') && (food as any).units && (food as any).gramsPerUnit) {
          const gramsPerUnit = (food as any).gramsPerUnit || 60;
          units = Math.round(c.grams / gramsPerUnit);
          actualGrams = units * gramsPerUnit;
        }

        return {
          food,
          grams: actualGrams,
          units,
          foodName: translateFoodName(food.name),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (ingredientComponents.length === 0) {
      console.warn(`⚠️ Nema valjanih komponenti za ${selectedMeal.name}`);
      return null;
    }

    // Formiraj tekst sastojaka za Edamam
    const ingredientText = ingredientComponents
      .map(c => `${c.grams}g ${c.foodName}`)
      .join(", ");

    // Dohvati podatke iz Edamam API-ja
    try {
      const edamamData = await analyzeNutritionFromText(ingredientText, selectedMeal.name);

      if (!edamamData) {
        console.warn(`⚠️ Edamam API nije vratio podatke za ${selectedMeal.name}, koristim USDA fallback`);
        // Fallback na USDA ako Edamam ne radi
        missing = true;
      } else {
        // Koristi Edamam podatke
        calories = edamamData.calories;
        protein = edamamData.protein;
        carbs = edamamData.carbs;
        fat = edamamData.fat;

        // Kreiraj component details
        componentDetails = ingredientComponents.map(c => ({
          food: c.food,
          grams: c.grams,
          units: c.units,
          displayText: c.units 
            ? `${c.foodName} (${c.units} kom ≈ ${c.grams}g)`
            : `${c.foodName} (${c.grams}g)`,
        }));

        // Označi namirnice kao korištene
        ingredientComponents.forEach(c => usedToday.add(c.food.id));

        console.log(`✅ Edamam-only: ${selectedMeal.name} - ${calories.toFixed(0)} kcal, P: ${protein.toFixed(1)}g, C: ${carbs.toFixed(1)}g, F: ${fat.toFixed(1)}g`);
      }
    } catch (error) {
      console.warn(`⚠️ Edamam API greška za ${selectedMeal.name}, koristim USDA fallback:`, error);
      missing = true;
    }
  } else {
    // USDA MODE - koristi foods-database.ts (kao web generator)
    for (const c of selectedMeal.components) {
      // Preskoči vodu
      if (c.food.toLowerCase().includes('water') || c.food.toLowerCase().includes('voda')) {
        continue;
      }
      
      // Koristi findNamirnica iz foods-database.ts (kao web generator)
      const namirnica = findNamirnica(c.food);
      if (!namirnica) { 
        console.warn(`⚠️ Namirnica "${c.food}" nije pronađena u foods-database.ts za template "${selectedMeal.name}"`);
        missingFoods.push(c.food);
        missing = true; 
        // Ako nedostaje bilo koja komponenta, template nije validan - preskoči ga
        break;
      }

      // Provjeri da li je namirnica već korištena (osim ako je to dozvoljeno)
      // Koristi namirnica.id umjesto food.id
      if (usedToday.has(namirnica.id)) {
        console.warn(`⚠️ Namirnica "${c.food}" već korištena danas, preskačem obrok`);
        missing = true;
        break;
      }

      // Izračunaj makroe - koristi clampToPortionLimits i calculateMacrosForGrams (kao web generator)
      let actualGrams = c.grams;
      let units: number | undefined;
      let displayText = '';
      
      // Ako je jaja, koristi units
      if (c.food.toLowerCase().includes('egg')) {
        const gramsPerUnit = 60; // default 60g po jajetu
        units = Math.round(c.grams / gramsPerUnit);
        actualGrams = units * gramsPerUnit;
        const foodName = namirnica.name; // Koristi hrvatski naziv iz foods-database
        displayText = `${foodName} (${units} kom ≈ ${actualGrams}g)`;
      } else {
        // Normalno s gramima - koristi clampToPortionLimits (kao web generator)
        actualGrams = clampToPortionLimits(c.food, c.grams, userGoal);
        const foodName = namirnica.name; // Koristi hrvatski naziv iz foods-database
        displayText = `${foodName} (${actualGrams}g)`;
      }

      // Koristi calculateMacrosForGramsWithFallback (s opcijskim Edamam fallback-om)
      const macros = await calculateMacrosForGramsWithFallback(namirnica, actualGrams, c.food);
      
      calories += macros.calories;
      protein += macros.protein;
      carbs += macros.carbs;
      fat += macros.fat;

      // Spremi Food objekt za kompatibilnost (koristi namirnica podatke)
      const foodForDetails: Food = {
        id: namirnica.id,
        name: namirnica.name,
        calories_per_100g: namirnica.caloriesPer100g,
        protein_per_100g: namirnica.proteinPer100g,
        carbs_per_100g: namirnica.carbsPer100g,
        fat_per_100g: namirnica.fatsPer100g,
        category: namirnica.category === 'protein' ? 'meso' : 
                  namirnica.category === 'carb' ? 'žitarice' :
                  namirnica.category === 'fat' ? 'masti' :
                  namirnica.category === 'vegetable' ? 'povrće' :
                  namirnica.category === 'fruit' ? 'voće' :
                  namirnica.category === 'dairy' ? 'mliječni proizvodi' : 'ostalo',
        tags: [],
        allergens: null,
        usda_fdc_id: null,
        is_usda: false,
        default_serving_size_g: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mealSlot: undefined,
      };

      componentDetails.push({ food: foodForDetails, grams: actualGrams, units, displayText });
      usedToday.add(namirnica.id);
    }
  }

  // Ako nedostaje BILO KOJA komponenta, preskoči template i pokušaj s drugim
  if (missing && missingFoods.length > 0) {
    console.warn(`❌ Template "${selectedMeal.name}" ima nedostajuće komponente: ${missingFoods.join(", ")}`);
    // Pokušaj s drugim template-om - dodaj u excludedMealNames i pozovi ponovno
    const newExcluded = new Set(excludedMealNames);
    newExcluded.add(selectedMeal.name);
    
    // Ako nismo iscrpili sve opcije, pokušaj ponovno
    if (newExcluded.size < definitions.length) {
      return await buildCompositeMealForSlot(
        slot, allFoods, usedToday, slotTargetCalories, 
        previousMeal, previousMeals, minIngredients, usedMealsThisWeek, previousDayMeal, newExcluded, userGoal, preferences
      );
    }
    // Ako smo iscrpili sve opcije, vrati null (NE baci exception)
    console.error(`❌ Svi template-i za ${slot} imaju nedostajuće komponente`);
    return null;
  }

  // Izračunaj kalorije iz makroa (kao web generator: P×4 + UH×4 + M×9)
  const calculatedCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  if (calculatedCalories <= 0) {
    console.error(`❌ Template "${selectedMeal.name}" ima 0 kalorija nakon izračuna`);
    return null;
  }
  
  // Koristi izračunate kalorije (kao web generator)
  calories = calculatedCalories;

  // Prilagodi kalorije prema targetu (kao web generator - koristi istu logiku)
  let factor = slotTargetCalories > 0 ? slotTargetCalories / calories : 1;
  factor = Math.max(0.7, Math.min(1.3, factor));
  
  // Prilagodi gramaže faktorom i ponovno izračunaj makroe (kao web generator)
  let adjustedCalories = 0, adjustedProtein = 0, adjustedCarbs = 0, adjustedFat = 0;
  const adjustedComponentDetails = await Promise.all(componentDetails.map(async c => {
    const adjustedGrams = clampToPortionLimits(c.food.name, c.grams * factor, userGoal);
    const namirnica = findNamirnica(c.food.name);
    if (!namirnica) return c;
    
    const macros = await calculateMacrosForGramsWithFallback(namirnica, adjustedGrams, c.food.name);
    adjustedCalories += macros.calories;
    adjustedProtein += macros.protein;
    adjustedCarbs += macros.carbs;
    adjustedFat += macros.fat;
    
    return {
      ...c,
      grams: adjustedGrams,
      displayText: c.units 
        ? `${namirnica.name} (${c.units} kom ≈ ${adjustedGrams}g)`
        : `${namirnica.name} (${adjustedGrams}g)`,
    };
  }));
  
  // Koristi prilagođene vrijednosti
  calories = Math.round(adjustedCalories);
  protein = Math.round(adjustedProtein * 10) / 10;
  carbs = Math.round(adjustedCarbs * 10) / 10;
  fat = Math.round(adjustedFat * 10) / 10;
  componentDetails = adjustedComponentDetails;

  // Kreiraj detaljan naziv s gramažama za svaku namirnicu (bez vode)
  const componentsWithGrams = componentDetails.map(c => c.displayText).join(", ");

  // Spremi komponente u name kao dodatni string za parsiranje u UI
  const componentsString = componentDetails.map(c => c.displayText).join(", ");

  // Spremi komponente u meta za validaciju s Edamam
  const mealComponents = componentDetails.map(c => ({
    food: c.food.name,
    grams: c.grams
  }));

  // Pronađi originalnu definiciju jela iz meal_components.json za description i preparationTip
  const originalDefinition = definitions.find(d => d.name === selectedMeal.name);
  
  // Kreiraj osnovno jelo sa USDA podacima
  const baseMeal = {
    id: `composite-${slotKey}-${selectedMeal.name}`,
    type: "recipe" as const,
    name: selectedMeal.name,
    calories: Math.round(calories * factor * 10) / 10,
    protein: Math.round(protein * factor * 10) / 10,
    carbs: Math.round(carbs * factor * 10) / 10,
    fat: Math.round(fat * factor * 10) / 10,
    meta: { 
      recipe: undefined,
      food: undefined,
      quantity: undefined,
      cuisine: null, 
      prepTime: null, 
      difficulty: null, 
      healthScore: null, 
      tags: originalDefinition?.tags || ["composite"],
      goalTags: originalDefinition?.tags?.filter(t => ["lose", "maintain", "gain"].includes(t)) || [],
      dietTags: [],
      components: mealComponents,
      // Dodaj description i preparationTip iz originalne definicije
      description: originalDefinition?.description,
      preparationTip: originalDefinition?.preparationTip,
    },
    score: 0.8,
    scoreBreakdown: {
      calorieMatch: 0.8,
      macroMatch: 0.8,
      healthBonus: 0.5,
      varietyPenalty: 0,
      total: 0.8
    },
    componentsString: componentsString,
    componentDetails: componentDetails.map(c => ({
      foodName: translateFoodName(c.food.name),
      grams: c.grams * factor, // Prilagodi gramaže faktorom
      units: c.units,
      displayText: c.displayText
    })),
    // Dodaj description i preparationTip direktno na jelo (za mobilnu aplikaciju)
    description: originalDefinition?.description,
    preparationTip: originalDefinition?.preparationTip,
  } as ScoredMeal & { 
    componentsString?: string; 
    componentDetails?: Array<{ foodName: string; grams: number; units?: number; displayText: string }>;
    description?: string;
    preparationTip?: string;
  };

  // Vrati osnovno jelo - Edamam validacija će se pozvati nakon kreiranja
  return baseMeal;
}

/**
 * Validiraj jelo s Edamam API-om i koristi točnije podatke
 * Koristi se za SVA jela da osigura točnost
 */
/**
 * Validiraj jelo s Edamam API-om i koristi točnije podatke
 * Koristi se za SVA jela da osigura točnost
 * NOVO: Prilagođava gramaže namirnica prema Edamam podacima za maksimalnu točnost
 */
async function validateAndCorrectMealWithEdamam(
  meal: ScoredMeal
): Promise<ScoredMeal> {
  if (!process.env.EDAMAM_APP_ID || !process.env.EDAMAM_APP_KEY) {
    return meal; // Ako nema credentials, vrati original
  }
  
  // Formiraj tekst sastojaka - koristi componentDetails ako postoji, inače meta.components
  let ingredientText = "";
  let originalGrams: Array<{ foodName: string; grams: number }> = [];
  
  // Provjeri componentDetails (za composite meals)
  if ((meal as any).componentDetails && (meal as any).componentDetails.length > 0) {
    originalGrams = (meal as any).componentDetails.map((c: any) => ({
      foodName: c.foodName,
      grams: c.grams
    }));
    ingredientText = originalGrams.map((c: any) => 
      `${c.grams}g ${c.foodName}`
    ).join(", ");
  } 
  // Provjeri meta.components (ako postoji)
  else if ((meal.meta as any)?.components && Array.isArray((meal.meta as any).components) && (meal.meta as any).components.length > 0) {
    originalGrams = (meal.meta as any).components.map((c: any) => ({
      foodName: c.food,
      grams: c.grams
    }));
    ingredientText = originalGrams.map((c: any) => 
      `${c.grams}g ${c.food}`
    ).join(", ");
  }
  // Ako nema komponenti, vrati original
  else {
    return meal;
  }
  
  try {
    // Dohvati Edamam podatke za trenutne gramaže
    const edamamData = await analyzeNutritionFromText(
      ingredientText,
      meal.name
    );
    
    if (edamamData) {
      // Usporedi s izračunatim vrijednostima
      const deviation = {
        calories: Math.abs(meal.calories - edamamData.calories),
        protein: Math.abs(meal.protein - edamamData.protein),
        carbs: Math.abs(meal.carbs - edamamData.carbs),
        fat: Math.abs(meal.fat - edamamData.fat),
      };
      
      // Ako je razlika > 3%, koristi Edamam podatke i prilagodi gramaže
      const calorieDeviationPercent = meal.calories > 0 
        ? (deviation.calories / meal.calories) * 100 
        : 0;
      
      const proteinDeviationPercent = meal.protein > 0 
        ? (deviation.protein / meal.protein) * 100 
        : 0;
      
      const carbsDeviationPercent = meal.carbs > 0 
        ? (deviation.carbs / meal.carbs) * 100 
        : 0;
      
      const fatDeviationPercent = meal.fat > 0 
        ? (deviation.fat / meal.fat) * 100 
        : 0;
      
      // Koristi Edamam ako je bilo koja devijacija > 3%
      if (calorieDeviationPercent > 3 || 
          proteinDeviationPercent > 3 ||
          carbsDeviationPercent > 3 ||
          fatDeviationPercent > 3) {
        
        console.log(`✅ Edamam korekcija za ${meal.name}:`);
        console.log(`   USDA: ${meal.calories.toFixed(0)} kcal | Edamam: ${edamamData.calories.toFixed(0)} kcal`);
        console.log(`   Razlika: ${deviation.calories.toFixed(0)} kcal (${calorieDeviationPercent.toFixed(1)}%)`);
        
        // Izračunaj faktor skaliranja prema Edamam podacima
        // Koristi kalorije kao glavni pokazatelj
        const calorieScale = meal.calories > 0 && edamamData.calories > 0
          ? meal.calories / edamamData.calories
          : 1;
        
        // Prilagodi gramaže prema Edamam podacima
        if ((meal as any).componentDetails && (meal as any).componentDetails.length > 0) {
          (meal as any).componentDetails = (meal as any).componentDetails.map((c: any) => ({
            ...c,
            grams: Math.round(c.grams * calorieScale * 10) / 10, // Prilagodi gramaže
            displayText: `${c.foodName} (${Math.round(c.grams * calorieScale * 10) / 10}g)`
          }));
        }
        
        // Ažuriraj meta.components
        if ((meal.meta as any)?.components) {
          (meal.meta as any).components = (meal.meta as any).components.map((c: any) => ({
            ...c,
            grams: Math.round(c.grams * calorieScale * 10) / 10
          }));
        }
        
        // Koristi Edamam podatke (točniji)
        meal.calories = Math.round(edamamData.calories * calorieScale);
        meal.protein = Math.round(edamamData.protein * calorieScale * 10) / 10;
        meal.carbs = Math.round(edamamData.carbs * calorieScale * 10) / 10;
        meal.fat = Math.round(edamamData.fat * calorieScale * 10) / 10;
        
        console.log(`   ✅ Ažurirano: ${meal.calories.toFixed(0)} kcal, P: ${meal.protein.toFixed(1)}g, C: ${meal.carbs.toFixed(1)}g, F: ${meal.fat.toFixed(1)}g`);
      } else {
        // Ako je razlika < 3%, samo koristi Edamam podatke bez skaliranja gramaža
        meal.calories = Math.round(edamamData.calories);
        meal.protein = Math.round(edamamData.protein * 10) / 10;
        meal.carbs = Math.round(edamamData.carbs * 10) / 10;
        meal.fat = Math.round(edamamData.fat * 10) / 10;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Edamam validacija neuspješna za ${meal.name}:`, error);
    // Vrati original ako validacija ne uspije
  }
  
  return meal;
}

/**
 * Dohvati makronutrijente za namirnicu s Edamam fallback-om
 * Koristi se SAMO kada USDA/Supabase nema podatke
 */
async function getFoodMacrosWithEdamamFallback(
  food: Food
): Promise<{ calories: number; protein: number; carbs: number; fats: number } | null> {
  // Prvo provjeri da li namirnica već ima podatke
  if (food.calories_per_100g && food.calories_per_100g > 0) {
    return {
      calories: food.calories_per_100g,
      protein: food.protein_per_100g || 0,
      carbs: food.carbs_per_100g || 0,
      fats: food.fat_per_100g || 0,
    };
  }
  
  // Ako ima USDA FDC ID, pokušaj dohvatiti iz CSV-a
  if (food.usda_fdc_id) {
    try {
      const usdaData = await getFoodMacros(food.usda_fdc_id);
      if (usdaData && usdaData.calories > 0) {
        return usdaData;
      }
    } catch (error) {
      // Nastavi na Edamam fallback
    }
  }
  
  // Fallback na Edamam SAMO ako nema podataka i ako su credentials postavljeni
  if (process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY) {
    try {
      console.log(`🔍 USDA nema podatke za ${food.name}, pokušavam Edamam fallback...`);
      const edamamData = await analyzeNutritionFromText(`100g ${food.name}`);
      if (edamamData && edamamData.calories > 0) {
        console.log(`✅ Edamam pronašao podatke za ${food.name}: ${edamamData.calories} kcal`);
        return {
          calories: edamamData.calories,
          protein: edamamData.protein,
          carbs: edamamData.carbs,
          fats: edamamData.fat,
        };
      }
    } catch (error) {
      console.warn(`⚠️ Edamam fallback neuspješan za ${food.name}:`, error);
    }
  }
  
  return null;
}

/**
 * Kreiraj MealCandidate iz namirnice
 * NE MIJENJA POSTOJEĆU LOGIKU - samo dodaje Edamam fallback ako nema podataka
 */
async function createMealCandidateFromFood(
  food: Food,
  quantity: number,
  targetCalories?: number
): Promise<MealCandidate> {
  // Provjeri da li namirnica ima valjane vrijednosti
  let caloriesPer100g = food.calories_per_100g || 0;
  let proteinPer100g = food.protein_per_100g || 0;
  let carbsPer100g = food.carbs_per_100g || 0;
  let fatPer100g = food.fat_per_100g || 0;
  
  // Ako nema podataka, pokušaj Edamam fallback
  if (!caloriesPer100g || caloriesPer100g <= 0) {
    const edamamMacros = await getFoodMacrosWithEdamamFallback(food);
    if (edamamMacros) {
      caloriesPer100g = edamamMacros.calories;
      proteinPer100g = edamamMacros.protein;
      carbsPer100g = edamamMacros.carbs;
      fatPer100g = edamamMacros.fats;
    } else {
      // Ako ni Edamam nema podatke, koristi default (kao prije)
    console.warn(`⚠️ Namirnica ${food.name} nema kalorija, koristim minimalne vrijednosti`);
      caloriesPer100g = 0;
    }
  }
  
  // Ako je naveden targetCalories, prilagodi quantity (ISTA LOGIKA KAO PRIJE)
  if (targetCalories && targetCalories > 0 && caloriesPer100g > 0) {
    if (caloriesPer100g > 0) {
      quantity = Math.round((targetCalories / caloriesPer100g) * 100 * 10) / 10;
    }
  }

  const ratio = quantity / 100;
  // Prevedi naziv namirnice na hrvatski
  const translatedName = translateFoodName(food.name);
  
  // Vrati MealCandidate (ISTA STRUKTURA KAO PRIJE)
  return {
    id: food.id,
    type: "food",
    name: translatedName,
    calories: Math.round(caloriesPer100g * ratio * 10) / 10,
    protein: Math.round(proteinPer100g * ratio * 10) / 10,
    carbs: Math.round(carbsPer100g * ratio * 10) / 10,
    fat: Math.round(fatPer100g * ratio * 10) / 10,
    meta: {
      food,
      quantity,
      tags: food.tags || [],
    },
  };
}

/**
 * Izračunaj score za MealCandidate u odnosu na MealSlot
 * Poboljšana verzija sa detaljnim macro deviation tracking-om
 */
function calculateMealScore(
  candidate: MealCandidate,
  slot: MealSlot,
  dailyContext?: { usedMainProteins: Set<string>; usedRecipeIds: Set<string> }
): ScoredMeal {
  // 1. Macro Deviation - koliko je blizu target makroa za taj obrok
  const macroDeviation = {
    calories: calculateMacroDeviation(slot.targetCalories, candidate.calories),
    protein: calculateMacroDeviation(slot.targetProtein, candidate.protein),
    carbs: calculateMacroDeviation(slot.targetCarbs, candidate.carbs),
    fat: calculateMacroDeviation(slot.targetFat, candidate.fat),
  };

  // Macro penalty - niže je bolje
  const macroPenalty =
    macroDeviation.calories * 0.4 +
    macroDeviation.protein * 0.4 +
    macroDeviation.carbs * 0.1 +
    macroDeviation.fat * 0.1;

  // Macro Match (inverzno od penalty - više je bolje)
  const macroMatch = Math.max(0, 1 - macroPenalty);

  // 2. Calorie Match (Gausova distribucija) - dodatna preciznost
  const calorieDiff = Math.abs(candidate.calories - slot.targetCalories);
  const calorieMatch = Math.exp(-Math.pow(calorieDiff, 2) / (2 * Math.pow(CALORIE_TOLERANCE, 2)));

  // 3. Health Bonus - baziran na health_score i tags
  let healthBonus = 0;
  if (candidate.meta.healthScore !== null && candidate.meta.healthScore !== undefined) {
    healthBonus = candidate.meta.healthScore / 100; // 0-1
  } else {
    healthBonus = 0.5; // Default 0.5 ako nema health_score
  }

  // Dodatni health bonus za specifične tags
  const allTags = [
    ...(candidate.meta.tags || []),
    ...(candidate.meta.goalTags || []),
    ...(candidate.meta.dietTags || []),
  ];
  
  if (allTags.some((tag) => tag.toLowerCase().includes("high_protein") || tag.toLowerCase().includes("high-protein"))) {
    healthBonus += 0.05;
  }
  if (allTags.some((tag) => tag.toLowerCase().includes("veggies") || tag.toLowerCase().includes("vegetables"))) {
    healthBonus += 0.05;
  }
  if (allTags.some((tag) => tag.toLowerCase().includes("whole_grain") || tag.toLowerCase().includes("whole-grain"))) {
    healthBonus += 0.03;
  }
  healthBonus = Math.min(1, healthBonus); // Limit na 1.0

  // 4. Variety Penalty - izbjegavanje ponavljanja
  let varietyPenalty = 0;
  if (dailyContext) {
    // Penalty ako se isti recipe već pojavio
    if (candidate.type === "recipe" && dailyContext.usedRecipeIds.has(candidate.id)) {
      varietyPenalty += 0.15; // 15% penalty za isti recept
    }

    // Penalty ako se isti glavni protein već koristio
    let mainProtein: string | null = null;
    if (candidate.type === "recipe" && candidate.meta.recipe) {
      // Pronađi glavni protein u receptu
      const proteinSource = candidate.meta.recipe.tags?.find((tag) => {
        const lowerTag = tag.toLowerCase();
        return ["chicken", "beef", "fish", "pork", "turkey", "tofu", "beans", "eggs", "tuna", "salmon", "lamb"].some(
          (p) => lowerTag.includes(p)
        );
      });
      if (proteinSource) {
        mainProtein = proteinSource.toLowerCase();
      }
    } else if (candidate.type === "food" && candidate.meta.food) {
      // Provjeri kategoriju hrane
      const category = candidate.meta.food.category?.toLowerCase();
      const proteinCategories = ["meso", "morski plodovi", "jaja", "mliječni proizvodi"];
      if (category && proteinCategories.some((cat) => category.includes(cat))) {
        mainProtein = category;
      }
    }

    if (mainProtein && dailyContext.usedMainProteins.has(mainProtein)) {
      varietyPenalty += 0.1; // 10% penalty za isti protein
    }
  }
  varietyPenalty = Math.min(0.5, varietyPenalty); // Limit penalty na 50%

  // 5. Ukupni score (weighted sum) - veći je bolje
  const totalScore =
    calorieMatch * SCORE_WEIGHTS.calorieMatch +
    macroMatch * SCORE_WEIGHTS.macroMatch +
    healthBonus * SCORE_WEIGHTS.healthBonus +
    (1 - varietyPenalty) * SCORE_WEIGHTS.variety;

  return {
    ...candidate,
    score: Math.max(0, Math.min(1, totalScore)), // Normalizuj na 0-1
    scoreBreakdown: {
      calorieMatch,
      macroMatch,
      healthBonus,
      varietyPenalty,
      total: totalScore,
    },
  };
}

/**
 * Helper funkcija za izračun string similarity (Levenshtein distance normalizirana)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Jednostavna provjera: ako je jedan string substring drugog
  if (s1.includes(s2) || s2.includes(s1)) return 0.7;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  const distance = matrix[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

/**
 * Provjeri da li je USDA rezultat sumnjiv i treba li Edamam fallback
 */
function isSuspiciousUSDAResult(
  ingredientName: string,
  usdaResult: { calories: number; protein: number; carbs: number; fat: number } | null,
  grams: number = 100,
  expectedName?: string
): boolean {
  // Ako nema rezultata, sumnjiv
  if (!usdaResult) return true;
  
  // Izračunaj vrijednosti po 100g
  const ratio = grams > 0 ? 100 / grams : 1;
  const caloriesPer100g = usdaResult.calories * ratio;
  const carbsPer100g = usdaResult.carbs * ratio;
  const fatPer100g = usdaResult.fat * ratio;
  const proteinPer100g = usdaResult.protein * ratio;
  
  // Provjeri kalorije po 100g
  if (caloriesPer100g <= 0 || caloriesPer100g > 900) {
    return true; // Sumnjiv: kalorije izvan normalnog raspona
  }
  
  // Provjeri string similarity ako je očekivani naziv dan
  if (expectedName) {
    const similarity = stringSimilarity(ingredientName, expectedName);
    if (similarity < 0.55) {
      return true; // Sumnjiv: niska sličnost naziva
    }
  }
  
  // Provjeri očekivane makroe za poznate namirnice
  const nameLower = ingredientName.toLowerCase();
  const expectedNameLower = expectedName?.toLowerCase() || '';
  const combinedName = `${nameLower} ${expectedNameLower}`;
  
  // A) MED / ŠEĆER / SIRUPI - mora imati jako puno UH
  const sweetKeywords = ['honey', 'med', 'syrup', 'maple', 'sirup', 'agave', 'sugar', 'šećer'];
  if (sweetKeywords.some(keyword => combinedName.includes(keyword))) {
    if (carbsPer100g < 70 || caloriesPer100g < 250) {
      return true; // Sumnjiv: med/šećer mora imati puno UH i kalorija
    }
  }
  
  // B) MASNIJE MESO (beef, pork, but, chuck, thigh, rib, brisket)
  const meatKeywords = ['beef', 'junetina', 'but', 'chuck', 'thigh', 'rib', 'brisket', 'svinjetina', 'pork'];
  if (meatKeywords.some(keyword => combinedName.includes(keyword))) {
    if (fatPer100g < 5 || caloriesPer100g < 120) {
      return true; // Sumnjiv: meso mora imati više masti i kalorija
    }
  }
  
  // C) KUHANA RIŽA - carbsPer100g mora biti u rasponu 20-35
  if (combinedName.includes('rice') || combinedName.includes('riža') || combinedName.includes('riz')) {
    if (combinedName.includes('cooked') || combinedName.includes('kuhana') || combinedName.includes('kuhano')) {
      if (carbsPer100g < 20 || carbsPer100g > 35) {
        return true; // Sumnjiv: kuhana riža mora imati carbs u rasponu 20-35g/100g
      }
    } else {
      // Sirova riža - provjeri da li ima premalo UH
      const carbsRatio = usdaResult.carbs / (usdaResult.protein + usdaResult.carbs + usdaResult.fat);
      if (carbsRatio < 0.5) {
        return true; // Sumnjiv: riža ima premalo UH
      }
    }
  }
  
  // C) KUHANA TJESTENINA - carbsPer100g mora biti u rasponu 20-35
  if (combinedName.includes('pasta') || combinedName.includes('tjestenina') || combinedName.includes('tjestenine')) {
    if (combinedName.includes('cooked') || combinedName.includes('kuhana') || combinedName.includes('kuhano')) {
      if (carbsPer100g < 20 || carbsPer100g > 35) {
        return true; // Sumnjiv: kuhana tjestenina mora imati carbs u rasponu 20-35g/100g
      }
    }
  }
  
  // D) VELIKE GRAMAŽE POVRĆA (luk 200g+, mrkva, rajčica)
  const vegetableKeywords = ['onion', 'luk', 'carrot', 'mrkva', 'tomato', 'rajčica'];
  if (grams > 200 && vegetableKeywords.some(keyword => combinedName.includes(keyword))) {
    // Za velike gramaže povrća, pozovi Edamam samo ako su makroi totalno nula ili kalorije per100g > 100
    if (usdaResult.calories === 0 && usdaResult.protein === 0 && usdaResult.carbs === 0 && usdaResult.fat === 0) {
      return true; // Sumnjiv: sve je nula
    }
    if (caloriesPer100g > 100) {
      return true; // Sumnjiv: previše kalorija za povrće
    }
    // Inače, ne pozivaj Edamam za velike gramaže povrća
    return false;
  }
  
  // Sir bi trebao imati više masti
  if (nameLower.includes('cheese') || nameLower.includes('sir')) {
    const fatRatio = usdaResult.fat / (usdaResult.protein + usdaResult.carbs + usdaResult.fat);
    if (fatRatio < 0.2) {
      return true; // Sumnjiv: sir ima premalo masti
    }
  }
  
  // Ulje bi trebalo imati skoro sve masti
  if (nameLower.includes('oil') || nameLower.includes('ulje')) {
    const fatRatio = usdaResult.fat / (usdaResult.protein + usdaResult.carbs + usdaResult.fat);
    if (fatRatio < 0.9) {
      return true; // Sumnjiv: ulje ima premalo masti
    }
  }
  
  return false; // Nije sumnjiv
}

/**
 * Opcijski Edamam fallback za sumnjive USDA rezultate
 * Poziva Edamam samo ako je USDA rezultat sumnjiv
 */
async function maybeResolveWithEdamam(
  ingredientName: string,
  grams: number,
  usdaResult: { calories: number; protein: number; carbs: number; fat: number } | null,
  expectedName?: string
): Promise<{ calories: number; protein: number; carbs: number; fat: number } | null> {
  // Ako je fallback onemogućen, vrati USDA rezultat
  if (!USE_EDAMAM_FALLBACK) {
    return usdaResult;
  }
  
  // Provjeri da li je rezultat sumnjiv
  if (!isSuspiciousUSDAResult(ingredientName, usdaResult, grams, expectedName)) {
    return usdaResult; // Nije sumnjiv, koristi USDA
  }
  
  // Provjeri cache
  const cacheKey = ingredientName.toLowerCase().trim();
  const cached = edamamCache.get(cacheKey);
  if (cached) {
    // Skaliraj na grams
    const ratio = grams / 100;
    return {
      calories: Math.round(cached.calories * ratio),
      protein: Math.round(cached.protein * ratio * 10) / 10,
      carbs: Math.round(cached.carbs * ratio * 10) / 10,
      fat: Math.round(cached.fat * ratio * 10) / 10,
    };
  }
  
  // Provjeri concurrency limit
  if (edamamActiveRequests >= EDAMAM_MAX_CONCURRENT) {
    console.warn(`⚠️ Edamam concurrency limit dosegnut, koristim USDA rezultat za ${ingredientName}`);
    return usdaResult;
  }
  
  // Provjeri da li su credentials postavljeni
  if (!process.env.EDAMAM_APP_ID || !process.env.EDAMAM_APP_KEY) {
    return usdaResult;
  }
  
  // Pozovi Edamam s timeout-om
  edamamActiveRequests++;
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), EDAMAM_TIMEOUT_MS);
    });
    
    const edamamPromise = analyzeNutritionFromText(`100g ${ingredientName}`, ingredientName);
    
    const result = await Promise.race([edamamPromise, timeoutPromise]);
    
    if (result) {
      // Spremi u cache (per 100g)
      const per100g = {
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
      };
      edamamCache.set(cacheKey, per100g);
      
      // Skaliraj na grams
      const ratio = grams / 100;
      return {
        calories: Math.round(result.calories * ratio),
        protein: Math.round(result.protein * ratio * 10) / 10,
        carbs: Math.round(result.carbs * ratio * 10) / 10,
        fat: Math.round(result.fat * ratio * 10) / 10,
      };
    } else {
      // Timeout ili greška
      console.warn(`⚠️ Edamam timeout/greška za ${ingredientName}, koristim USDA rezultat`);
      return usdaResult;
    }
  } catch (error) {
    console.warn(`⚠️ Edamam greška za ${ingredientName}:`, error);
    return usdaResult;
  } finally {
    edamamActiveRequests--;
  }
}

/**
 * Wrapper funkcija za calculateMacrosForGrams s opcijskim Edamam fallback-om
 */
async function calculateMacrosForGramsWithFallback(
  namirnica: Namirnica | null,
  grams: number,
  ingredientName?: string
): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
  // Ako nema namirnice, vrati 0
  if (!namirnica) {
    const zeroResult = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    if (USE_EDAMAM_FALLBACK && ingredientName) {
      const edamamResult = await maybeResolveWithEdamam(ingredientName, grams, null);
      return edamamResult || zeroResult;
    }
    return zeroResult;
  }
  
  // Izračunaj USDA rezultat
  const usdaResult = calculateMacrosForGrams(namirnica, grams);
  
  // Ako je fallback uključen, provjeri da li treba Edamam
  if (USE_EDAMAM_FALLBACK) {
    const ingredientNameToUse = ingredientName || namirnica.name || namirnica.nameEn;
    const edamamResult = await maybeResolveWithEdamam(
      ingredientNameToUse,
      grams,
      usdaResult,
      namirnica.nameEn
    );
    return edamamResult || usdaResult;
  }
  
  return usdaResult;
}

/**
 * Izračunaj dnevno odstupanje od target makroa
 * Koristi poboljšanu funkciju calculateDailyDeviationDetailed
 */
function calculateDailyDeviation(
  target: { calories: number; protein: number; carbs: number; fat: number },
  actual: { calories: number; protein: number; carbs: number; fat: number }
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  total: number;
} {
  return calculateDailyDeviationDetailed(target, actual);
}

/**
 * Iterativno skaliraj sve obroke dok makroi nisu unutar ±2% (kao web generator)
 * CALORIE_TOLERANCE = 20 kcal, MACRO_TOLERANCE = 0.02 (2%)
 */
function scaleAllMealsToTarget(
  meals: Record<string, any>,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  goalType: "lose" | "maintain" | "gain"
): Record<string, any> {
  const MAX_ITERATIONS = 150;
  const CALORIE_TOLERANCE = 20; // ±20 kcal
  const MACRO_TOLERANCE = 0.02; // ±2%
  
  let currentMeals = { ...meals };

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Izračunaj trenutne totale (zbroji makroe, zatim izračunaj kalorije)
    const macroTotals = Object.values(currentMeals).reduce(
      (totals, meal) => ({
        protein: totals.protein + meal.totals.protein,
        carbs: totals.carbs + meal.totals.carbs,
        fat: totals.fat + meal.totals.fat,
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
    
    const protein = Math.round(macroTotals.protein * 10) / 10;
    const carbs = Math.round(macroTotals.carbs * 10) / 10;
    const fat = Math.round(macroTotals.fat * 10) / 10;
    const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
    
    const currentTotals = { calories, protein, carbs, fat };

    if (currentTotals.calories === 0) return currentMeals;

    // Provjeri odstupanja
    const calDiff = Math.abs(currentTotals.calories - targetCalories);
    const proteinDev = Math.abs(currentTotals.protein - targetProtein) / targetProtein;
    const carbsDev = Math.abs(currentTotals.carbs - targetCarbs) / targetCarbs;
    const fatDev = Math.abs(currentTotals.fat - targetFat) / targetFat;
    const maxMacroDev = Math.max(proteinDev, carbsDev, fatDev);

    // Provjeri da li je sve unutar tolerancije
    const caloriesOK = calDiff <= CALORIE_TOLERANCE;
    const macrosOK = maxMacroDev <= MACRO_TOLERANCE;

    if (caloriesOK && macrosOK) {
      return currentMeals;
    }

    // Izračunaj faktore skaliranja
    const proteinFactor = targetProtein / currentTotals.protein;
    const carbsFactor = targetCarbs / currentTotals.carbs;
    const fatFactor = targetFat / currentTotals.fat;
    
    // Kombiniraj faktore OVISNO O CILJU (kao web generator)
    let combinedFactor: number;
    if (goalType === "gain") {
      combinedFactor = carbsFactor * 0.55 + proteinFactor * 0.30 + fatFactor * 0.15;
    } else if (goalType === "lose") {
      combinedFactor = proteinFactor * 0.50 + carbsFactor * 0.30 + fatFactor * 0.20;
    } else {
      combinedFactor = proteinFactor * 0.35 + carbsFactor * 0.35 + fatFactor * 0.30;
    }

    // Za lose: kalorije ≤ target
    if (goalType === "lose" && currentTotals.calories > targetCalories) {
      combinedFactor = Math.min(combinedFactor, targetCalories / currentTotals.calories);
    }

    // Za gain: kalorije ≥ target
    if (goalType === "gain" && currentTotals.calories < targetCalories) {
      combinedFactor = Math.max(combinedFactor, targetCalories / currentTotals.calories);
    }
    
    // Za maintain: kalorije ≈ target (osiguraj da se postigne target)
    if (goalType === "maintain") {
      const calFactor = targetCalories / currentTotals.calories;
      // Ako je odstupanje veliko, koristi kalorijski faktor kao osnovu
      if (calDiff > 100) {
        combinedFactor = calFactor * 0.7 + combinedFactor * 0.3; // Kombiniraj faktore
      }
    }

    // INTELIGENTNO SKALIRANJE PO KATEGORIJAMA (kao web generator)
    // Ako je odstupanje veliko (>300 kcal), koristi agresivnije skaliranje
    const isLargeDeviation = calDiff > 300;
    const proteinScale = isLargeDeviation 
      ? Math.max(0.3, Math.min(2.0, proteinFactor))  // Agresivnije za velika odstupanja
      : Math.max(0.5, Math.min(1.5, proteinFactor));
    const carbsScale = isLargeDeviation
      ? Math.max(0.4, Math.min(2.0, carbsFactor))    // Agresivnije za velika odstupanja
      : Math.max(0.7, Math.min(1.6, carbsFactor));
    const fatScale = isLargeDeviation
      ? Math.max(0.3, Math.min(2.0, fatFactor))     // Agresivnije za velika odstupanja
      : Math.max(0.5, Math.min(1.5, fatFactor));

    // Skaliraj sve obroke
    const scaledMeals: Record<string, any> = {};

    for (const [mealType, meal] of Object.entries(currentMeals)) {
      const scaledComponents = meal.components.map((comp: any) => {
        const foodKey = comp.food || comp.name || '';
        const namirnica = findNamirnica(foodKey);
        if (!namirnica) return comp;

        // Odredi kategoriju i primijeni odgovarajući faktor
        let scaleFactor = 1.0;
        const category = namirnica.category;
        
        if (category === 'protein') {
          scaleFactor = proteinScale;
        } else if (category === 'carb') {
          scaleFactor = carbsScale;
        } else if (category === 'fat') {
          scaleFactor = fatScale;
        } else {
          scaleFactor = Math.max(0.6, Math.min(1.6, combinedFactor));
        }

        const newGrams = clampToPortionLimits(foodKey, comp.grams * scaleFactor, goalType);
        const macros = calculateMacrosForGrams(namirnica, newGrams);

        return {
          ...comp,
          food: foodKey,
          grams: newGrams,
          calories: Math.round(macros.calories),
          protein: Math.round(macros.protein * 10) / 10,
          carbs: Math.round(macros.carbs * 10) / 10,
          fat: Math.round(macros.fat * 10) / 10,
        };
      });

      const scaledTotals = scaledComponents.reduce(
        (totals: any, comp: any) => ({
          protein: totals.protein + comp.protein,
          carbs: totals.carbs + comp.carbs,
          fat: totals.fat + comp.fat,
        }),
        { protein: 0, carbs: 0, fat: 0 }
      );
      
      const totalCalories = Math.round(scaledTotals.protein * 4 + scaledTotals.carbs * 4 + scaledTotals.fat * 9);

      scaledMeals[mealType] = {
        ...meal,
        components: scaledComponents,
        totals: {
          calories: totalCalories,
          protein: Math.round(scaledTotals.protein * 10) / 10,
          carbs: Math.round(scaledTotals.carbs * 10) / 10,
          fat: Math.round(scaledTotals.fat * 10) / 10,
        },
      };
    }

    currentMeals = scaledMeals;
  }

  return currentMeals;
}

// ============================================
// MAIN FUNCTION: generateProDailyMealPlan
// ============================================

/**
 * Generiše PRO dnevni plan prehrane sa scoring sistemom
 * 
 * @param userId - UUID korisnika
 * @returns Promise<ProDailyMealPlan> - PRO dnevni plan prehrane
 * 
 * @example
 * const plan = await generateProDailyMealPlan("client-uuid");
 */
export async function generateProDailyMealPlan(
  userId: string
): Promise<ProDailyMealPlan> {
  try {
    console.log("🚀 Pokretanje PRO generiranja plana prehrane...\n");

    // 0. Inicijaliziraj CSV podatke (ako nisu već učitani)
    try {
      await initializeCSVData();
      console.log("✅ CSV podaci inicijalizirani");
    } catch (csvError) {
      console.warn("⚠️ Greška pri inicijalizaciji CSV podataka, nastavljam sa Supabase:", csvError);
    }

    // 1. Dohvati korisničke kalkulacije
    const calculations = await getClientCalculations(userId);
    if (!calculations) {
      throw new Error(`Nisu pronađene kalkulacije za korisnika ${userId}`);
    }

    // 2. Dohvati korisničke preference
    let preferences = await getClientPreferences(userId);
    
    // Pokušaj učitati iz lokalnog storage-a za dodatne podatke
    try {
      const userData = getUserData(userId);
      if (userData) {
        preferences = {
          ...preferences,
          allergies: userData.allergies.length > 0 ? userData.allergies : preferences.allergies,
          dietary_restrictions: userData.dietaryRestrictions.length > 0 ? userData.dietaryRestrictions : preferences.dietary_restrictions,
          disliked_foods: userData.injuries.length > 0 ? userData.injuries : preferences.disliked_foods,
        };
        console.log("✅ Korisnički podaci učitani iz lokalnog storage-a");
      }
    } catch (error) {
      console.warn("⚠️ Error loading user data from local storage:", error);
    }

    // 3. Izračunaj meal slotove
    const mealSlots = buildMealSlots(
      calculations.target_calories,
      calculations.protein_grams,
      calculations.carbs_grams,
      calculations.fats_grams,
      calculations.goal_type
    );

    console.log("📊 Meal slotovi kreirani:");
    mealSlots.forEach((slot) => {
      console.log(`   ${slot.name}: ${slot.targetCalories} kcal, P: ${slot.targetProtein}g, C: ${slot.targetCarbs}g, F: ${slot.targetFat}g`);
    });
    console.log();

    // 4. Generiši plan za svaki slot sa poboljšanim scoring sistemom
    const selectedMeals: ScoredMeal[] = [];
    const dailyContext = {
      usedMainProteins: new Set<string>(),
      usedRecipeIds: new Set<string>(),
    };

    for (const slot of mealSlots) {
      console.log(`🔍 Traženje kandidata za ${slot.name}...`);

      // Dohvati relevantne recepte (bez excludeRecipeIds za dnevni plan)
      const relevantRecipes = await getRelevantRecipes(
        slot.id as "breakfast" | "lunch" | "dinner" | "snack",
        calculations.goal_type,
        preferences,
        [] // Za dnevni plan ne trebamo exclude
      );

      // Dohvati relevantne namirnice (za snack ili dopunu)
      const relevantFoods = await getRelevantFoods(
        slot.id as "breakfast" | "lunch" | "dinner" | "snack",
        preferences,
        slot.targetProtein
      );

      // Kreiraj kandidate
      const candidates: MealCandidate[] = [];

      // Dodaj recepte (do MAX_CANDIDATES_PER_MEAL)
      // Filtrirati recepte sa valjanim kalorijama
      const validRecipes = relevantRecipes.filter(r => 
        r.total_calories > 0 && 
        r.total_protein >= 0 && 
        r.total_carbs >= 0 && 
        r.total_fat >= 0
      );
      
      console.log(`   📋 Pronađeno ${validRecipes.length} valjanih recepata od ${relevantRecipes.length} ukupno za ${slot.name}`);
      
      for (const recipe of validRecipes.slice(0, MAX_CANDIDATES_PER_MEAL)) {
        // Pokušaj prilagoditi količinu recepta prema target kalorijama
        let quantity = 1;
        if (slot.targetCalories > 0 && recipe.total_calories > 0) {
          quantity = Math.round((slot.targetCalories / recipe.total_calories) * 10) / 10;
          quantity = Math.max(0.5, Math.min(2.0, quantity)); // Limitiraj između 0.5 i 2.0
        }
        candidates.push(createMealCandidateFromRecipe(recipe, quantity));
      }

      // Filtrirati namirnice sa 0 kalorija ili nedostajućim vrijednostima (van if bloka za log)
      const validFoods = relevantFoods.filter(f => 
        f.calories_per_100g > 0 && 
        f.protein_per_100g >= 0 && 
        f.carbs_per_100g >= 0 && 
        f.fat_per_100g >= 0 &&
        !isNaN(f.calories_per_100g) && 
        !isNaN(f.protein_per_100g) && 
        !isNaN(f.carbs_per_100g) && 
        !isNaN(f.fat_per_100g)
      );

      // Dodaj namirnice (za snack ili ako nema dovoljno recepata)
      // ALI samo ako namirnica ima kalorije
      if (slot.id === "snack" || candidates.length < 10) {
        const foodsToAdd = Math.min(MAX_CANDIDATES_PER_MEAL - candidates.length, 15);
        
        for (const food of validFoods.slice(0, foodsToAdd)) {
          candidates.push(
            await createMealCandidateFromFood(food, food.default_serving_size_g || 100, slot.targetCalories)
          );
        }
      }

      console.log(`   📋 Pronađeno ${candidates.length} kandidata za ${slot.name} (${validRecipes.length} recepata, ${validFoods.length} namirnica)`);

      // Provjeri da li ima kandidata
      if (candidates.length === 0) {
        const errorMsg = `Nema dostupnih recepata ili namirnica za ${slot.name}. Provjerite da li postoje recepti u bazi podataka ili CSV podaci.`;
        console.error(`❌ ${errorMsg}`);
        console.error(`   Recepti: ${relevantRecipes.length} ukupno, ${validRecipes.length} valjani`);
        console.error(`   Namirnice: ${relevantFoods.length} ukupno, ${validFoods.length} valjane`);
        throw new Error(errorMsg);
      }

      // Izračunaj score za sve kandidate
      const scoredCandidates = candidates.map((candidate) =>
        calculateMealScore(candidate, slot, dailyContext)
      );

      // Sortiraj po score-u (descending) - veći score = bolje
      scoredCandidates.sort((a, b) => b.score - a.score);

      // Odaberi top 1
      const selectedMeal = scoredCandidates[0];

      if (!selectedMeal) {
        throw new Error(`Nije pronađen kandidat za ${slot.name}`);
      }

      // Log najbolji score
      const bestScore = selectedMeal.score.toFixed(3);
      const scoreBreakdown = selectedMeal.scoreBreakdown;
      console.log(`   ✅ Odabran: ${selectedMeal.name}`);
      console.log(`      Score: ${bestScore} (calorie: ${scoreBreakdown.calorieMatch.toFixed(2)}, macro: ${scoreBreakdown.macroMatch.toFixed(2)}, health: ${scoreBreakdown.healthBonus.toFixed(2)}, variety: ${(1 - scoreBreakdown.varietyPenalty).toFixed(2)})`);
      console.log(`      Makroi: ${selectedMeal.calories.toFixed(0)} kcal, P: ${selectedMeal.protein.toFixed(1)}g, C: ${selectedMeal.carbs.toFixed(1)}g, F: ${selectedMeal.fat.toFixed(1)}g`);

      // Onemogućeno Edamam validaciju za brzinu (kao web generator)
      // const validatedMeal = await validateAndCorrectMealWithEdamam(selectedMeal);
      selectedMeals.push(selectedMeal); // Koristi direktno bez Edamam validacije

      // Ažuriraj dailyContext (za variety penalty u sljedećim obrocima)
      if (selectedMeal.type === "recipe") {
        dailyContext.usedRecipeIds.add(selectedMeal.id);
      }

      // Dodaj glavni protein u usedMainProteins
      let mainProtein: string | null = null;
      if (selectedMeal.type === "recipe" && selectedMeal.meta.recipe) {
        const proteinSource = selectedMeal.meta.recipe.tags?.find((tag) => {
          const lowerTag = tag.toLowerCase();
          return ["chicken", "beef", "fish", "pork", "turkey", "tofu", "beans", "eggs", "tuna", "salmon", "lamb"].some(
            (p) => lowerTag.includes(p)
          );
        });
        if (proteinSource) {
          mainProtein = proteinSource.toLowerCase();
        }
      } else if (selectedMeal.type === "food" && selectedMeal.meta.food) {
        const category = selectedMeal.meta.food.category?.toLowerCase();
        const proteinCategories = ["meso", "morski plodovi", "jaja", "mliječni proizvodi"];
        if (category && proteinCategories.some((cat) => category.includes(cat))) {
          mainProtein = category;
        }
      }
      if (mainProtein) {
        dailyContext.usedMainProteins.add(mainProtein);
      }

      console.log(); // Prazna linija za čitljivost
    }

    // 5. Izračunaj ukupne makroe
    const totalCalories = selectedMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const totalProtein = selectedMeals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCarbs = selectedMeals.reduce((sum, meal) => sum + meal.carbs, 0);
    const totalFat = selectedMeals.reduce((sum, meal) => sum + meal.fat, 0);

    const actual = {
      calories: Math.round(totalCalories * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    };

    const target = {
      calories: calculations.target_calories,
      protein: calculations.protein_grams,
      carbs: calculations.carbs_grams,
      fat: calculations.fats_grams,
    };

    // 6. Izračunaj detaljnu devijaciju
    const deviation = calculateDailyDeviation(target, actual);

    // 7. Vrati plan
    const plan: ProDailyMealPlan = {
      date: new Date().toISOString().split("T")[0],
      clientId: userId,
      breakfast: selectedMeals[0],
      lunch: selectedMeals[1],
      dinner: selectedMeals[2],
      snack: selectedMeals[3],
      total: {
        ...actual,
        deviation,
      },
    };

    // 8. Detaljni logovi
    console.log("\n✅ PRO plan generiran!\n");
    console.log("📊 Dnevni rezime:");
    console.log(`   Kalorije: ${actual.calories.toFixed(0)} / ${target.calories.toFixed(0)} (dev: ${deviation.calories}%)`);
    console.log(`   Proteini: ${actual.protein.toFixed(1)}g / ${target.protein.toFixed(1)}g (dev: ${deviation.protein}%)`);
    console.log(`   Ugljikohidrati: ${actual.carbs.toFixed(1)}g / ${target.carbs.toFixed(1)}g (dev: ${deviation.carbs}%)`);
    console.log(`   Masti: ${actual.fat.toFixed(1)}g / ${target.fat.toFixed(1)}g (dev: ${deviation.fat}%)`);
    console.log(`\n   📉 Ukupna devijacija: ${deviation.total}% (niže = bolje)`);
    console.log("\n");

    return plan;
  } catch (error) {
    console.error("Error generating PRO meal plan:", error);
    throw error;
  }
}

/**
 * Spremi PRO plan u Supabase
 */
export async function saveProMealPlanToSupabase(
  clientId: string,
  plan: ProDailyMealPlan
): Promise<Record<string, any>> {
  try {
    // Pripremi tjedni plan (isti dan ponavljan 7 puta)
    const weekPlan = Array(7).fill(null).map(() => ({
      breakfast: plan.breakfast,
      lunch: plan.lunch,
      dinner: plan.dinner,
      snack: plan.snack,
    }));

    // Odredi tjedan start date (ponedjeljak)
    const today = new Date(plan.date);
    const dayOfWeek = today.getDay(); // 0 = nedjelja, 1 = ponedjeljak, ...
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + daysToMonday);
    const weekStartDate = weekStart.toISOString().split("T")[0];

    // Spremi u bazu - bez deviation_percent jer kolona ne postoji u svim bazama
    const insertData: Record<string, any> = {
        client_id: clientId,
        week_start_date: weekStartDate,
        meals: weekPlan,
        total_calories: Math.round(plan.total.calories * 7),
        total_protein: Math.round(plan.total.protein * 7),
        total_carbs: Math.round(plan.total.carbs * 7),
        total_fats: Math.round(plan.total.fat * 7),
        plan_type: "pro",
        plan_version: "2.1", // Ažurirana verzija sa poboljšanim scoring-om
    };

    const { data, error } = await supabase
      .from("meal_plans")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error saving PRO meal plan to Supabase:", error);
      // Nastavi bez bacanja greške - plan je generiran
      return { id: null, ...insertData };
    }

    return data;
  } catch (error) {
    console.error("Error in saveProMealPlanToSupabase:", error);
    throw error;
  }
}

// ============================================
// WEEKLY PLAN GENERATOR
// ============================================

/**
 * DailyProPlan - Struktura za jedan dan u tjednom planu
 */
export type WeeklyDay = {
  date: string; // ISO YYYY-MM-DD
  meals: {
    breakfast: ScoredMeal;
    lunch: ScoredMeal;
    dinner: ScoredMeal;
    snack: ScoredMeal;
    extraSnack?: ScoredMeal; // Opcionalno - samo za 5 obroka dnevno
  };
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    deviation: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      total: number;
    };
  };
};

/**
 * WeeklyPlan - Struktura za tjedni plan (7 dana)
 */
export type WeeklyPlan = {
  clientId: string;
  weekStartDate: string; // ISO YYYY-MM-DD (ponedjeljak)
  days: WeeklyDay[];
  weeklyAverage: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    deviation: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      total: number;
    };
  };
  userTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goal: string;
  };
};

/**
 * Opcije za generiranje tjednog plana
 */
export interface WeeklyPlanOptions {
  mealsPerDay?: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

/**
 * Direktne kalkulacije za generiranje plana bez userId
 */
export interface DirectCalculations {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  goalType: "lose" | "maintain" | "gain";
  bmr?: number;
  tdee?: number;
  preferences?: {
    allergies?: string;
    foodPreferences?: string;
    avoidIngredients?: string;
    trainingFrequency?: string;
  };
}

/**
 * Generiše PRO tjedni plan prehrane (7 dana) sa raznolikošću i user preferences
 * 
 * @param userId - UUID korisnika
 * @param options - Opcije za generiranje plana (mealsPerDay, targetCalories, targetProtein, targetCarbs, targetFat)
 * @returns Promise<WeeklyPlan> - PRO tjedni plan prehrane
 * 
 * @example
 * const plan = await generateWeeklyProMealPlan("client-uuid", {
 *   mealsPerDay: 4,
 *   targetCalories: 2000,
 *   targetProtein: 150,
 *   targetCarbs: 200,
 *   targetFat: 65
 * });
 */
export async function generateWeeklyProMealPlan(
  userId: string,
  options?: WeeklyPlanOptions
): Promise<WeeklyPlan> {
  try {
    console.log("🚀 Pokretanje PRO generiranja tjednog plana prehrane...\n");
    console.log(`📋 Korisnik ID: ${userId}`);

    // 0. Inicijaliziraj CSV podatke (ako nisu već učitani)
    try {
      await initializeCSVData();
      console.log("✅ CSV podaci inicijalizirani");
    } catch (csvError) {
      console.warn("⚠️ Greška pri inicijalizaciji CSV podataka, nastavljam sa Supabase:", csvError);
    }

    // 1. Dohvati korisničke kalkulacije
    console.log("📊 Dohvaćanje kalkulacija...");
    const calculations = await getClientCalculations(userId);
    if (!calculations) {
      const errorMsg = `Nisu pronađene kalkulacije za korisnika ${userId}. Molimo prvo izračunajte svoje kalorije i makroe.`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Validiraj da li su sve potrebne vrijednosti prisutne
    if (
      !calculations.target_calories ||
      !calculations.protein_grams ||
      !calculations.carbs_grams ||
      !calculations.fats_grams ||
      calculations.target_calories <= 0 ||
      calculations.protein_grams <= 0 ||
      calculations.carbs_grams <= 0 ||
      calculations.fats_grams <= 0
    ) {
      const errorMsg = `Kalkulacije za korisnika ${userId} nisu potpune ili su neispravne. Molimo prvo izračunajte svoje kalorije i makroe.`;
      console.error(`❌ ${errorMsg}`);
      console.error(`   Kalkulacije:`, calculations);
      throw new Error(errorMsg);
    }

    console.log(`✅ Kalkulacije pronađene: ${calculations.target_calories} kcal, P: ${calculations.protein_grams}g, C: ${calculations.carbs_grams}g, F: ${calculations.fats_grams}g`);

    // 2. Dohvati korisničke preference
    let preferences = await getClientPreferences(userId);
    
    // Pokušaj učitati iz lokalnog storage-a za dodatne podatke
    try {
      const userData = getUserData(userId);
      if (userData) {
        // Ažuriraj preference sa podacima iz lokalnog storage-a
        preferences = {
          ...preferences,
          allergies: userData.allergies.length > 0 ? userData.allergies : preferences.allergies,
          dietary_restrictions: userData.dietaryRestrictions.length > 0 ? userData.dietaryRestrictions : preferences.dietary_restrictions,
          disliked_foods: userData.injuries.length > 0 ? userData.injuries : preferences.disliked_foods,
        };
        console.log("✅ Korisnički podaci učitani iz lokalnog storage-a");
      }
    } catch (error) {
      console.warn("⚠️ Error loading user data from local storage:", error);
    }
    const maxSameRecipePerWeek = preferences.max_same_recipe_per_week || 2;

    // 5. Odredi mealsPerDay iz opcija ili default 5
    const mealsPerDay = options?.mealsPerDay || 5;
    const targetCalories = options?.targetCalories || calculations.target_calories;
    const targetProtein = options?.targetProtein || calculations.protein_grams;
    const targetCarbs = options?.targetCarbs || calculations.carbs_grams;
    const targetFat = options?.targetFat || calculations.fats_grams;

    // Convert preferences to internal format
    const internalPreferences = {
      allergies: Array.isArray(preferences.allergies) ? preferences.allergies.join(", ") : (preferences.allergies || ""),
      dietary_restrictions: Array.isArray(preferences.dietary_restrictions) ? preferences.dietary_restrictions.join(", ") : (preferences.dietary_restrictions || ""),
      disliked_foods: Array.isArray(preferences.disliked_foods) ? preferences.disliked_foods.join(", ") : (preferences.disliked_foods || ""),
      max_same_recipe_per_week: maxSameRecipePerWeek,
    };

    // Call internal function
    return generateWeeklyProMealPlanInternal(
      {
        target_calories: targetCalories,
        protein_grams: targetProtein,
        carbs_grams: targetCarbs,
        fats_grams: targetFat,
        goal_type: calculations.goal_type || "maintain",
        bmr: calculations.bmr || 0,
        tdee: calculations.tdee || 0,
      },
      internalPreferences,
      mealsPerDay,
      userId
    );
  } catch (error) {
    console.error("Error generating weekly PRO meal plan:", error);
    throw error;
  }
}

/**
 * Generiše PRO tjedni plan prehrane s direktnim kalkulacijama (bez userId)
 * 
 * @param directCalculations - Direktne kalkulacije i preference
 * @returns Promise<WeeklyPlan> - PRO tjedni plan prehrane
 */
export async function generateWeeklyProMealPlanWithCalculations(
  directCalculations: DirectCalculations
): Promise<WeeklyPlan> {
  console.log("🚀 Pokretanje PRO generiranja tjednog plana prehrane (direct calculations mode)...");
  console.log(`✅ Kalkulacije: ${directCalculations.targetCalories} kcal, P: ${directCalculations.targetProtein}g, C: ${directCalculations.targetCarbs}g, F: ${directCalculations.targetFat}g`);
  console.log(`🎯 Cilj: ${directCalculations.goalType}`);
  
  // Validacija
  if (
    directCalculations.targetCalories <= 0 ||
    directCalculations.targetProtein <= 0 ||
    directCalculations.targetCarbs <= 0 ||
    directCalculations.targetFat <= 0
  ) {
    throw new Error(`Nevaljane kalkulacije: ${directCalculations.targetCalories} kcal, P: ${directCalculations.targetProtein}g, C: ${directCalculations.targetCarbs}g, F: ${directCalculations.targetFat}g`);
  }

  // Parse preferences
  let preferences = {
    allergies: directCalculations.preferences?.allergies || "",
    dietary_restrictions: directCalculations.preferences?.foodPreferences || "",
    disliked_foods: directCalculations.preferences?.avoidIngredients || "",
    max_same_recipe_per_week: 2,
  };

  // Default: 5 obroka dnevno (kao web generator)
  // NAPOMENA: trainingFrequency se NE koristi za određivanje broja obroka
  // jer može značiti "3 puta tjedno" (trening), a ne "3 obroka dnevno"
  // Koristimo fiksno 5 obroka kao default (kao web generator)
  let mealsPerDay = 5;

  // GAIN mode automatski koristi 6 obroka
  if (directCalculations.goalType === "gain" && mealsPerDay === 5) {
    mealsPerDay = 6;
    console.log(`🍽️ GAIN MODE: Automatski povećan broj obroka na 6`);
  }

  // Call internal function with calculated values
  return generateWeeklyProMealPlanInternal(
    {
      target_calories: directCalculations.targetCalories,
      protein_grams: directCalculations.targetProtein,
      carbs_grams: directCalculations.targetCarbs,
      fats_grams: directCalculations.targetFat,
      goal_type: directCalculations.goalType,
      bmr: directCalculations.bmr || 0,
      tdee: directCalculations.tdee || 0,
    },
    preferences,
    mealsPerDay,
    "guest" // guest userId for direct calculations
  );
}

/**
 * Interna funkcija za generiranje PRO tjednog plana (refaktorizirana iz generateWeeklyProMealPlan)
 */
async function generateWeeklyProMealPlanInternal(
  calculations: {
    target_calories: number;
    protein_grams: number;
    carbs_grams: number;
    fats_grams: number;
    goal_type: "lose" | "maintain" | "gain";
    bmr?: number;
    tdee?: number;
  },
  preferences: {
    allergies: string;
    dietary_restrictions: string;
    disliked_foods: string;
    max_same_recipe_per_week?: number;
  },
  mealsPerDay: number,
  userId: string
): Promise<WeeklyPlan> {
  try {
    // 0. Inicijaliziraj CSV podatke SAMO JEDNOM (optimizacija za brzinu)
    try {
      await initializeCSVData();
    } catch (csvError) {
      console.warn("⚠️ Greška pri inicijalizaciji CSV podataka, nastavljam sa Supabase:", csvError);
    }

    const maxSameRecipePerWeek = preferences.max_same_recipe_per_week || 2;
    const targetCalories = calculations.target_calories;
    const targetProtein = calculations.protein_grams;
    const targetCarbs = calculations.carbs_grams;
    const targetFat = calculations.fats_grams;
    const userGoal: GoalType = calculations.goal_type || "maintain";

    // Postavi week start date (ponedjeljak)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split("T")[0];

    // Mapa za praćenje ponavljanja recepata u tjednu
    const recipeUsageCount = new Map<string, number>();

    // Dohvati sve namirnice (foods) jednom za sve dane (CSV već inicijaliziran)
    let allFoods: Food[] = [];
    try {
      const csvFoods = await getAllFoodsWithMacros(10000);
      allFoods = csvFoods.map((csvFood) => ({
        id: `csv-${csvFood.fdc_id}`,
        name: csvFood.description,
        calories_per_100g: csvFood.calories,
        protein_per_100g: csvFood.protein,
        carbs_per_100g: csvFood.carbs,
        fat_per_100g: csvFood.fats,
        category: "ostalo",
        tags: [],
        allergens: null,
        usda_fdc_id: csvFood.fdc_id,
        is_usda: true,
        default_serving_size_g: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mealSlot: undefined,
      })) as Food[];
      
      allFoods = allFoods.filter(f => 
        f.calories_per_100g > 0 && 
        f.protein_per_100g >= 0 && 
        f.carbs_per_100g >= 0 && 
        f.fat_per_100g >= 0 &&
        !isNaN(f.calories_per_100g) && 
        !isNaN(f.protein_per_100g) && 
        !isNaN(f.carbs_per_100g) && 
        !isNaN(f.fat_per_100g)
      );
      
      // console.log(`✅ Dohvaćeno ${allFoods.length} valjanih namirnica iz CSV-a`); // Onemogućeno za brzinu
    } catch (csvError) {
      console.warn("⚠️ Greška pri dohvatu CSV podataka, koristim Supabase:", csvError);
      const { data: supabaseFoods, error: supabaseError } = await supabase
        .from("foods")
        .select("*")
        .limit(10000);
      
      if (!supabaseError && supabaseFoods) {
        allFoods = supabaseFoods.map((food: any) => ({
          ...food,
          tags: Array.isArray(food.tags) ? food.tags : [],
        })) as Food[];
        console.log(`✅ Dohvaćeno ${allFoods.length} namirnica iz Supabase`);
      } else {
        throw new Error("Nema dostupnih namirnica za generiranje plana");
      }
    }

    // Generiraj plan za svaki dan (7 dana)
    console.log("📅 Počinjem generiranje plana za 7 dana...");
    const slots = getSlotsForMealsPerDay(mealsPerDay);
    const days: WeeklyDay[] = [];
    
    const usedMealsThisWeek: Map<string, Set<string>> = new Map();
    const previousDayMeals: Map<string, MealOption | null> = new Map();

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      // console.log(`📅 Generiranje plana za dan ${i + 1}/7 (${dateStr})...`); // Onemogućeno za brzinu

      try {
        const usedToday = new Set<string>();
        const dayMeals: Record<string, ScoredMeal> = {};
        
        const previousMealsInDay: MealOption[] = [];
        let previousMealOption: MealOption | null = null;

        for (const slot of slots) {
          const slotTargetCalories = targetCalories / mealsPerDay;
          let minIngredients = 2;
          if (slot === "breakfast" || slot === "lunch" || slot === "dinner") {
            minIngredients = 3;
          }

          const slotKeyForTracking = slot === "extraSnack" ? "snack" : (slot as "breakfast" | "lunch" | "dinner" | "snack");
          const previousDayMealForSlot = previousDayMeals.get(slot) || null;
          const usedMealsForSlot = usedMealsThisWeek.get(slotKeyForTracking) || new Set<string>();
          
          // Retry logika - pokušaj generirati obrok sve dok ne uspije
          let composite: ScoredMeal | null = null;
          let retryCount = 0;
          const maxRetries = 2; // Smanjeno s 5 na 2 za brzinu
          let excludedMealNames = new Set<string>();
          let currentPreviousDayMeal = previousDayMealForSlot;
          let currentUsedMealsForSlot = new Set(usedMealsForSlot);
          let currentMinIngredients = minIngredients;
          
          // Parsiraj preferences u format koji web generator koristi
          const parsedPreferences = {
            avoidIngredients: preferences.disliked_foods 
              ? preferences.disliked_foods.split(/[,;]/).map(s => s.trim()).filter(Boolean)
              : [],
            preferredIngredients: preferences.dietary_restrictions
              ? preferences.dietary_restrictions.split(/[,;]/).map(s => s.trim()).filter(Boolean)
              : []
          };
          
          while (!composite && retryCount < maxRetries) {
            composite = await buildCompositeMealForSlot(
              slot, 
              allFoods, 
              usedToday, 
              slotTargetCalories,
              previousMealOption,
              previousMealsInDay,
              currentMinIngredients,
              currentUsedMealsForSlot,
              currentPreviousDayMeal,
              excludedMealNames,
              userGoal,
              parsedPreferences
            );
            
            if (!composite) {
              retryCount++;
              console.warn(`⚠️ Pokušaj ${retryCount}/${maxRetries} za ${slot} nije uspio, pokušavam ponovno s manje restriktivnim filterima...`);
              
              // Ukloni neke filtere za retry
              if (retryCount >= 2) {
                // Nakon 2 pokušaja, ignoriraj previousDayMeal
                currentPreviousDayMeal = null;
              }
              if (retryCount >= 3) {
                // Nakon 3 pokušaja, ignoriraj usedMealsThisWeek
                currentUsedMealsForSlot = new Set();
              }
              if (retryCount >= 4) {
                // Nakon 4 pokušaja, smanji minIngredients
                currentMinIngredients = Math.max(1, currentMinIngredients - 1);
              }
            }
          }
          
          // Ako i dalje nema obroka, generiraj fallback obrok
          if (!composite) {
            console.error(`❌ Nema dostupnih composite meals za ${slot} nakon ${maxRetries} pokušaja, generiram fallback obrok iz meal_components.json...`);
            try {
              composite = await generateFallbackMeal(slot, slotTargetCalories, allFoods, usedToday, userGoal);
            } catch (fallbackError) {
              console.error(`❌ Fallback funkcija nije uspjela za ${slot}:`, fallbackError);
              // Ako i fallback ne uspije, pokušaj s najjednostavnijim obrokom
              console.warn(`⚠️ Pokušavam s najjednostavnijim obrokom za ${slot}...`);
              // Koristi prvo dostupno jelo iz meal_components.json bez validacije
              const slotKeyForFallback = slot === "extraSnack" ? "snack" : (slot as "breakfast" | "lunch" | "dinner" | "snack");
              const allDefinitions = MEAL_COMPONENTS[slotKeyForFallback] || [];
              if (allDefinitions.length > 0) {
                const simplestMeal = allDefinitions[0];
                composite = await generateFallbackMealFromMealOption(
                  convertToMealOption(simplestMeal),
                  slotTargetCalories,
                  allFoods,
                  usedToday,
                  slotKeyForFallback
                );
              }
            }
          }
          
          if (composite) {
            // Onemogućeno Edamam validaciju za brzinu (kao web generator)
            // const validatedComposite = await validateAndCorrectMealWithEdamam(composite);
            dayMeals[slot] = composite; // Koristi direktno bez Edamam validacije
            
            const definitions = MEAL_COMPONENTS[slotKeyForTracking];
            if (definitions) {
              const originalName = composite.name.split(" - ")[0];
              const matchedMeal = definitions.find(d => d.name === originalName);
              if (matchedMeal) {
                const mealOption = convertToMealOption(matchedMeal);
                previousMealsInDay.push(mealOption);
                previousMealOption = mealOption;
                previousDayMeals.set(slot, mealOption);
                usedMealsForSlot.add(mealOption.name);
                usedMealsThisWeek.set(slotKeyForTracking, usedMealsForSlot);
              }
            }
            
            // console.log(`   ✅ ${MEAL_SLOT_LABELS[slot]}: ${composite.name}`); // Onemogućeno za brzinu
          } else {
            throw new Error(`Nije moguće generirati obrok za ${slot} ni nakon ${maxRetries} pokušaja i fallback-a`);
          }
        }

        // Provjeri da li su svi obroci generirani - koristi stvarne slotove koji su generirani
        const missingMeals = slots.filter(slot => !dayMeals[slot]);
        
        if (missingMeals.length > 0) {
          console.error(`❌ Dan ${i + 1}/7 (${dateStr}): Nedostaju obroci: ${missingMeals.join(', ')}`);
          console.error(`   Generirani obroci:`, Object.keys(dayMeals));
          console.error(`   Očekivani slotovi:`, slots);
          throw new Error(`Nedostaju obroci za dan ${i + 1}/7: ${missingMeals.join(', ')}`);
        }
        
        // ITERATIVNO SKALIRANJE - kao web generator (preciznost ±2%)
        // Konvertiraj ScoredMeal u GeneratedMeal format za skaliranje
        const mealsForScaling: Record<string, any> = {};
        for (const slot of slots) {
          const meal = dayMeals[slot];
          if (!meal) continue;
          
          // Konvertiraj u GeneratedMeal format
          const components = (meal as any).componentDetails?.map((c: any) => ({
            name: c.foodName || c.name || '',
            food: c.food?.name || '',
            grams: c.grams || 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          })) || [];
          
          // Izračunaj makroe za komponente (koristi Edamam fallback ako je uključen)
          const mealComponents = await Promise.all(components.map(async (comp: any) => {
            const namirnica = findNamirnica(comp.food);
            if (!namirnica) return comp;
            const macros = await calculateMacrosForGramsWithFallback(namirnica, comp.grams, comp.name || comp.food);
            return {
              ...comp,
              calories: macros.calories,
              protein: macros.protein,
              carbs: macros.carbs,
              fat: macros.fat,
            };
          }));
          
          const mealTotals = mealComponents.reduce(
            (totals: any, comp: any) => ({
              protein: totals.protein + comp.protein,
              carbs: totals.carbs + comp.carbs,
              fat: totals.fat + comp.fat,
            }),
            { protein: 0, carbs: 0, fat: 0 }
          );
          
          const totalCalories = Math.round(mealTotals.protein * 4 + mealTotals.carbs * 4 + mealTotals.fat * 9);
          
          mealsForScaling[slot] = {
            id: meal.id,
            name: meal.name,
            description: (meal as any).description || (meal as any).meta?.description,
            preparationTip: (meal as any).preparationTip || (meal as any).meta?.preparationTip,
            components: mealComponents,
            totals: {
              calories: totalCalories,
              protein: Math.round(mealTotals.protein * 10) / 10,
              carbs: Math.round(mealTotals.carbs * 10) / 10,
              fat: Math.round(mealTotals.fat * 10) / 10,
            },
          };
        }
        
        // Primijeni iterativno skaliranje (kao web generator)
        const scaledMeals = scaleAllMealsToTarget(
          mealsForScaling,
          targetCalories,
          targetProtein,
          targetCarbs,
          targetFat,
          userGoal
        );
        
        // Konvertiraj natrag u ScoredMeal format
        const scaledDayMeals: Record<string, ScoredMeal> = {};
        for (const slot of slots) {
          const scaledMeal = scaledMeals[slot];
          if (!scaledMeal) continue;
          
          const originalMeal = dayMeals[slot];
          if (!originalMeal) continue;
          
          // Ažuriraj makroe i komponente
          const originalComponentDetails = (originalMeal as any).componentDetails || [];
          const updatedMeal: any = {
            ...originalMeal,
            calories: scaledMeal.totals.calories,
            protein: scaledMeal.totals.protein,
            carbs: scaledMeal.totals.carbs,
            fat: scaledMeal.totals.fat,
            description: scaledMeal.description,
            preparationTip: scaledMeal.preparationTip,
            componentDetails: scaledMeal.components.map((comp: any) => {
              const originalComp = originalComponentDetails.find((c: any) => 
                (c.foodName || c.name) === comp.name || Math.abs((c.grams || 0) - comp.grams) < 5
              );
              return {
                food: originalComp?.food || { id: '', name: comp.food } as Food,
                grams: comp.grams,
                units: originalComp?.units,
                displayText: `${comp.name} (${comp.grams}g)`,
                foodName: comp.name,
              };
            }),
          };
          scaledDayMeals[slot] = updatedMeal as ScoredMeal;
        }
        
        const total = sumMealMacros(scaledDayMeals);
        const target = {
          calories: targetCalories,
          protein: targetProtein,
          carbs: targetCarbs,
          fat: targetFat,
        };
        
        // DODATNA PROVJERA: Ako je odstupanje preveliko, primijeni dodatno skaliranje
        const calDiff = Math.abs(total.calories - targetCalories);
        if (calDiff > 50) { // Ako je razlika veća od 50 kcal, primijeni dodatno skaliranje
          // Koristi faktor skaliranja koji osigurava da se postigne target
          const scaleFactor = targetCalories / total.calories;
          
          // Ograniči faktor da ne bude previše ekstreman
          // Ako je potrebno povećati kalorije (scaleFactor > 1), dozvoli veći faktor
          // Ako je potrebno smanjiti kalorije (scaleFactor < 1), ograniči smanjenje
          const limitedFactor = scaleFactor > 1
            ? Math.max(1.0, Math.min(1.4, scaleFactor))  // Povećanje: 1.0x - 1.4x
            : Math.max(0.85, Math.min(1.0, scaleFactor)); // Smanjenje: 0.85x - 1.0x
          
          const additionalScaledMeals: Record<string, ScoredMeal> = {};
          
          for (const slot of slots) {
            const meal = scaledDayMeals[slot];
            if (!meal) continue;
            
            const originalComponentDetails = (meal as any).componentDetails || [];
            const additionalScaledComponents = originalComponentDetails.map((comp: any) => {
              const foodKey = comp.foodName || comp.name || '';
              const namirnica = findNamirnica(foodKey);
              if (!namirnica) return comp;
              
              const newGrams = clampToPortionLimits(foodKey, comp.grams * limitedFactor, userGoal);
              const macros = calculateMacrosForGrams(namirnica, newGrams);
              
              return {
                ...comp,
                grams: newGrams,
                displayText: `${comp.foodName || comp.name} (${newGrams}g)`,
              };
            });
            
            const additionalTotals = additionalScaledComponents.reduce(
              (totals: any, comp: any) => {
                const foodKey = comp.foodName || comp.name || '';
                const namirnica = findNamirnica(foodKey);
                if (!namirnica) return totals;
                const macros = calculateMacrosForGrams(namirnica, comp.grams);
                return {
                  protein: totals.protein + macros.protein,
                  carbs: totals.carbs + macros.carbs,
                  fat: totals.fat + macros.fat,
                };
              },
              { protein: 0, carbs: 0, fat: 0 }
            );
            
            const additionalCalories = Math.round(additionalTotals.protein * 4 + additionalTotals.carbs * 4 + additionalTotals.fat * 9);
            
            additionalScaledMeals[slot] = {
              ...meal,
              calories: additionalCalories,
              protein: Math.round(additionalTotals.protein * 10) / 10,
              carbs: Math.round(additionalTotals.carbs * 10) / 10,
              fat: Math.round(additionalTotals.fat * 10) / 10,
              componentDetails: additionalScaledComponents,
            } as ScoredMeal;
          }
          
          // Ažuriraj scaledDayMeals s dodatno skaliranim vrijednostima
          Object.assign(scaledDayMeals, additionalScaledMeals);
          
          // Ponovno izračunaj total
          const recalculatedTotal = sumMealMacros(scaledDayMeals);
          Object.assign(total, recalculatedTotal);
        }
        
        // FINALNI SCALING PASS: Nakon Edamam fallback-a, osiguraj da su dnevne kalorije točne
        // Izračunaj total kalorije za dan koristeći Edamam fallback (ako je uključen)
        let finalTotalCalories = 0;
        const mealCaloriesBefore: Record<string, number> = {};
        
        for (const slot of slots) {
          const meal = scaledDayMeals[slot];
          if (!meal) continue;
          
          const componentDetails = (meal as any).componentDetails || [];
          let mealCalories = 0;
          
          for (const comp of componentDetails) {
            const foodKey = comp.foodName || comp.name || '';
            const namirnica = findNamirnica(foodKey);
            if (!namirnica) continue;
            
            // Koristi Edamam fallback za izračun makroa
            const macros = await calculateMacrosForGramsWithFallback(namirnica, comp.grams, foodKey);
            mealCalories += macros.calories;
          }
          
          mealCaloriesBefore[slot] = mealCalories;
          finalTotalCalories += mealCalories;
        }
        
        // Ako postoji odstupanje, primijeni finalni scaling (ograničen na 0.9-1.1, ili 0.85-1.15 ako diff > 200)
        if (finalTotalCalories > 0 && Math.abs(finalTotalCalories - targetCalories) > 10) {
          const diff = finalTotalCalories - targetCalories;
          const finalScaleFactor = targetCalories / finalTotalCalories;
          
          // Proširi clamp na 0.85-1.15 SAMO ako diff > 200 kcal
          const minFactor = Math.abs(diff) > 200 ? 0.85 : 0.9;
          const maxFactor = Math.abs(diff) > 200 ? 1.15 : 1.1;
          const limitedFinalFactor = Math.max(minFactor, Math.min(maxFactor, finalScaleFactor));
          
          // DEV only logging
          const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
          if (isDev) {
            console.log(`\n🔧 FINAL SCALING PASS (Dan ${i + 1}/7):`);
            console.log(`   targetCalories: ${targetCalories}`);
            console.log(`   finalTotalCaloriesBefore: ${Math.round(finalTotalCalories)}`);
            console.log(`   diff: ${Math.round(diff)} kcal`);
            console.log(`   rawScaleFactor: ${finalScaleFactor.toFixed(4)}`);
            console.log(`   clampedScaleFactor: ${limitedFinalFactor.toFixed(4)} (range: ${minFactor}-${maxFactor})`);
          }
          
          // Skaliraj samo količine (grams) obroka za taj dan
          const finalScaledMeals: Record<string, ScoredMeal> = {};
          const mealCaloriesAfter: Record<string, number> = {};
          
          // Pronađi najveći obrok (po kalorijama) za eventualnu dodatnu korekciju
          let largestMealSlot = '';
          let largestMealCalories = 0;
          for (const slot of slots) {
            if (mealCaloriesBefore[slot] > largestMealCalories) {
              largestMealCalories = mealCaloriesBefore[slot];
              largestMealSlot = slot;
            }
          }
          
          // Izračunaj ostatak korekcije ako je clamping aktiviran
          const scaledTotalCalories = finalTotalCalories * limitedFinalFactor;
          const remainingCorrection = scaledTotalCalories - targetCalories;
          const needsExtraCorrection = Math.abs(remainingCorrection) > 5 && Math.abs(diff) > 200;
          
          for (const slot of slots) {
            const meal = scaledDayMeals[slot];
            if (!meal) continue;
            
            const originalComponentDetails = (meal as any).componentDetails || [];
            
            // Ako je potrebna dodatna korekcija i ovo je najveći obrok, primijeni ostatak
            let extraFactor = 1.0;
            if (needsExtraCorrection && slot === largestMealSlot && largestMealCalories > 0) {
              // Izračunaj koliko kalorija će biti nakon osnovnog skaliranja
              const scaledLargestMealCalories = largestMealCalories * limitedFinalFactor;
              const otherMealsScaledCalories = scaledTotalCalories - scaledLargestMealCalories;
              const targetForLargestMeal = targetCalories - otherMealsScaledCalories;
              
              if (targetForLargestMeal > 0 && scaledLargestMealCalories > 0) {
                extraFactor = targetForLargestMeal / scaledLargestMealCalories;
                extraFactor = Math.max(0.9, Math.min(1.1, extraFactor));
                if (isDev) {
                  console.log(`   ⚠️ Extra correction na najveći obrok (${slot}): ${extraFactor.toFixed(4)}`);
                }
              }
            }
            
            const finalScaledComponents = originalComponentDetails.map((comp: any) => {
              const foodKey = comp.foodName || comp.name || '';
              const baseGrams = comp.grams * limitedFinalFactor;
              const finalGrams = clampToPortionLimits(foodKey, baseGrams * extraFactor, userGoal);
              
              return {
                ...comp,
                grams: finalGrams,
                displayText: `${comp.foodName || comp.name} (${finalGrams}g)`,
              };
            });
            
            // Ponovno izračunaj makroe s novim gramažama (koristi Edamam fallback)
            let finalMealCalories = 0;
            let finalMealProtein = 0;
            let finalMealCarbs = 0;
            let finalMealFat = 0;
            
            for (const comp of finalScaledComponents) {
              const foodKey = comp.foodName || comp.name || '';
              const namirnica = findNamirnica(foodKey);
              if (!namirnica) continue;
              
              const macros = await calculateMacrosForGramsWithFallback(namirnica, comp.grams, foodKey);
              finalMealCalories += macros.calories;
              finalMealProtein += macros.protein;
              finalMealCarbs += macros.carbs;
              finalMealFat += macros.fat;
            }
            
            mealCaloriesAfter[slot] = finalMealCalories;
            
            finalScaledMeals[slot] = {
              ...meal,
              calories: Math.round(finalMealCalories),
              protein: Math.round(finalMealProtein * 10) / 10,
              carbs: Math.round(finalMealCarbs * 10) / 10,
              fat: Math.round(finalMealFat * 10) / 10,
              componentDetails: finalScaledComponents,
            } as ScoredMeal;
          }
          
          // DEV only logging - po obroku
          if (isDev) {
            console.log(`   Po obroku:`);
            for (const slot of slots) {
              const meal = scaledDayMeals[slot];
              if (!meal) continue;
              const mealName = meal.name || slot;
              const caloriesBefore = Math.round(mealCaloriesBefore[slot] || 0);
              const caloriesAfter = Math.round(mealCaloriesAfter[slot] || 0);
              console.log(`     ${mealName}: ${caloriesBefore} → ${caloriesAfter} kcal`);
            }
          }
          
          // Ažuriraj scaledDayMeals s finalno skaliranim vrijednostima
          Object.assign(scaledDayMeals, finalScaledMeals);
          
          // Ponovno izračunaj total
          const finalRecalculatedTotal = sumMealMacros(scaledDayMeals);
          const finalDiff = finalRecalculatedTotal.calories - targetCalories;
          
          // DEV only logging - finalni diff
          if (isDev) {
            console.log(`   ✅ Finalni diff: ${Math.round(finalDiff)} kcal\n`);
          }
          
          Object.assign(total, finalRecalculatedTotal);
        }
        
        const deviation = calculateDailyDeviation(target, total);

        const weeklyDay: WeeklyDay = {
          date: dateStr,
          meals: {
            breakfast: scaledDayMeals.breakfast!,
            lunch: scaledDayMeals.lunch!,
            dinner: scaledDayMeals.dinner!,
            snack: scaledDayMeals.snack ?? scaledDayMeals.extraSnack!,
            extraSnack: scaledDayMeals.extraSnack,
          },
          total: {
            ...total,
            deviation,
          },
        };
        
        days.push(weeklyDay);
        // console.log(`✅ Dan ${i + 1}/7 generiran: ${total.calories.toFixed(0)} kcal (dev: ${deviation.total}%)`); // Onemogućeno za brzinu
      } catch (dayError) {
        console.error(`❌ Greška pri generiranju plana za dan ${i + 1}/7 (${dateStr}):`, dayError);
        const errorMessage = dayError instanceof Error ? dayError.message : 'Nepoznata greška';
        throw new Error(`Greška pri generiranju plana za dan ${i + 1}/7: ${errorMessage}`);
      }
    }

    // Izračunaj weekly average
    const totalDays = days.length;
    const weeklyAverage = {
      calories: Math.round((days.reduce((sum, day) => sum + day.total.calories, 0) / totalDays) * 10) / 10,
      protein: Math.round((days.reduce((sum, day) => sum + day.total.protein, 0) / totalDays) * 10) / 10,
      carbs: Math.round((days.reduce((sum, day) => sum + day.total.carbs, 0) / totalDays) * 10) / 10,
      fat: Math.round((days.reduce((sum, day) => sum + day.total.fat, 0) / totalDays) * 10) / 10,
      deviation: {
        calories: Math.round((days.reduce((sum, day) => sum + day.total.deviation.calories, 0) / totalDays) * 10) / 10,
        protein: Math.round((days.reduce((sum, day) => sum + day.total.deviation.protein, 0) / totalDays) * 10) / 10,
        carbs: Math.round((days.reduce((sum, day) => sum + day.total.deviation.carbs, 0) / totalDays) * 10) / 10,
        fat: Math.round((days.reduce((sum, day) => sum + day.total.deviation.fat, 0) / totalDays) * 10) / 10,
        total: Math.round((days.reduce((sum, day) => sum + day.total.deviation.total, 0) / totalDays) * 10) / 10,
      },
    };

    const targetDeviation = calculateDailyDeviation(
      {
        calories: calculations.target_calories,
        protein: calculations.protein_grams,
        carbs: calculations.carbs_grams,
        fat: calculations.fats_grams,
      },
      weeklyAverage
    );

    const weeklyPlan: WeeklyPlan = {
      clientId: userId,
      weekStartDate,
      days,
      weeklyAverage: {
        ...weeklyAverage,
        deviation: targetDeviation,
      },
      userTargets: {
        calories: calculations.target_calories,
        protein: calculations.protein_grams,
        carbs: calculations.carbs_grams,
        fat: calculations.fats_grams,
        goal: calculations.goal_type || "maintain",
      },
    };

    console.log("\n✅ PRO tjedni plan generiran!\n");
    console.log("📊 Tjedni rezime:");
    console.log(`   Prosječne kalorije: ${weeklyAverage.calories.toFixed(0)} / ${calculations.target_calories.toFixed(0)} (dev: ${targetDeviation.calories}%)`);
    console.log(`   Prosječni proteini: ${weeklyAverage.protein.toFixed(1)}g / ${calculations.protein_grams.toFixed(1)}g (dev: ${targetDeviation.protein}%)`);
    console.log(`   Prosječni ugljikohidrati: ${weeklyAverage.carbs.toFixed(1)}g / ${calculations.carbs_grams.toFixed(1)}g (dev: ${targetDeviation.carbs}%)`);
    console.log(`   Prosječne masti: ${weeklyAverage.fat.toFixed(1)}g / ${calculations.fats_grams.toFixed(1)}g (dev: ${targetDeviation.fat}%)`);
    console.log(`\n   📉 Prosječno ukupno odstupanje: ${targetDeviation.total}% (niže = bolje)`);
    console.log("\n");

    return weeklyPlan;
  } catch (error) {
    console.error("Error generating weekly PRO meal plan:", error);
    throw error;
  }
}

/**
 * Helper funkcija za generiranje dnevnog plana sa weekly context-om
 * Refaktorizirano iz generateProDailyMealPlan sa dodatnim weekly variety logikom
 */
async function generateProDailyMealPlanWithWeeklyContext(
  userId: string,
  date: string,
  recipeUsageCount: Map<string, number>,
  maxSameRecipePerWeek: number
): Promise<ProDailyMealPlan> {
  // 0. Inicijaliziraj CSV podatke (ako nisu već učitani)
  try {
    await initializeCSVData();
  } catch (csvError) {
    console.warn("⚠️ Greška pri inicijalizaciji CSV podataka:", csvError);
  }

  // 1. Dohvati korisničke kalkulacije
  const calculations = await getClientCalculations(userId);
  if (!calculations) {
    throw new Error(`Nisu pronađene kalkulacije za korisnika ${userId}`);
  }

  // 2. Dohvati korisničke preference
  let preferences = await getClientPreferences(userId);
  
  // Pokušaj učitati iz lokalnog storage-a za dodatne podatke
  try {
    const userData = getUserData(userId);
    if (userData) {
      preferences = {
        ...preferences,
        allergies: userData.allergies.length > 0 ? userData.allergies : preferences.allergies,
        dietary_restrictions: userData.dietaryRestrictions.length > 0 ? userData.dietaryRestrictions : preferences.dietary_restrictions,
        disliked_foods: userData.injuries.length > 0 ? userData.injuries : preferences.disliked_foods,
      };
    }
  } catch (error) {
    console.warn("⚠️ Error loading user data from local storage:", error);
  }

  // 3. Izračunaj meal slotove
  const mealSlots = buildMealSlots(
    calculations.target_calories,
    calculations.protein_grams,
    calculations.carbs_grams,
    calculations.fats_grams,
    calculations.goal_type
  );

  // 4. Generiši plan za svaki slot sa poboljšanim scoring sistemom
  const selectedMeals: ScoredMeal[] = [];
  const dailyContext = {
    usedMainProteins: new Set<string>(),
    usedRecipeIds: new Set<string>(),
  };

  for (const slot of mealSlots) {
    // Pronađi recepte koji još nisu dostigli max_same_recipe_per_week
    const excludeRecipeIds = Array.from(recipeUsageCount.entries())
      .filter(([, count]) => count >= maxSameRecipePerWeek)
      .map(([recipeId]) => recipeId);

    // Dohvati relevantne recepte (sa excludeRecipeIds za weekly variety)
    const relevantRecipes = await getRelevantRecipes(
      slot.id as "breakfast" | "lunch" | "dinner" | "snack",
      calculations.goal_type,
      preferences,
      excludeRecipeIds
    );

    console.log(`   📋 Pronađeno ${relevantRecipes.length} recepata za ${slot.name}`);

    // Dohvati relevantne namirnice
    const relevantFoods = await getRelevantFoods(
      slot.id as "breakfast" | "lunch" | "dinner" | "snack",
      preferences,
      slot.targetProtein
    );

    console.log(`   📋 Pronađeno ${relevantFoods.length} namirnica za ${slot.name}`);

    // Kreiraj kandidate
    const candidates: MealCandidate[] = [];

    // Dodaj recepte - samo valjane recepte
    const validRecipes = relevantRecipes.filter(r => 
      r.total_calories > 0 && 
      r.total_protein >= 0 && 
      r.total_carbs >= 0 && 
      r.total_fat >= 0
    );
    
    console.log(`   📋 Pronađeno ${validRecipes.length} valjanih recepata od ${relevantRecipes.length} ukupno za ${slot.name}`);
    
    for (const recipe of validRecipes.slice(0, MAX_CANDIDATES_PER_MEAL)) {
      let quantity = 1;
      if (slot.targetCalories > 0 && recipe.total_calories > 0) {
        quantity = Math.round((slot.targetCalories / recipe.total_calories) * 10) / 10;
        quantity = Math.max(0.5, Math.min(2.0, quantity));
      }
      candidates.push(createMealCandidateFromRecipe(recipe, quantity));
    }

    // Filtrirati namirnice sa 0 kalorija ili nedostajućim vrijednostima (van if bloka za log)
    const validFoods = relevantFoods.filter(f => 
      f.calories_per_100g > 0 && 
      f.protein_per_100g >= 0 && 
      f.carbs_per_100g >= 0 && 
      f.fat_per_100g >= 0 &&
      !isNaN(f.calories_per_100g) && 
      !isNaN(f.protein_per_100g) && 
      !isNaN(f.carbs_per_100g) && 
      !isNaN(f.fat_per_100g)
    );
    
    console.log(`   📋 Pronađeno ${validFoods.length} valjanih namirnica od ${relevantFoods.length} ukupno za ${slot.name}`);

    // Dodaj namirnice - samo valjane namirnice
    if (slot.id === "snack" || candidates.length < 10) {
      const foodsToAdd = Math.min(MAX_CANDIDATES_PER_MEAL - candidates.length, 15);
      
      for (const food of validFoods.slice(0, foodsToAdd)) {
        candidates.push(
          await createMealCandidateFromFood(food, food.default_serving_size_g || 100, slot.targetCalories)
        );
      }
    }

    console.log(`   📋 Ukupno ${candidates.length} kandidata za ${slot.name} (${validRecipes.length} recepata, ${validFoods.length} namirnica)`);

    // Provjeri da li ima kandidata
    if (candidates.length === 0) {
      const errorMsg = `Nema dostupnih recepata ili namirnica za ${slot.name}. Provjerite da li postoje recepti u bazi podataka ili CSV podaci.`;
      console.error(`❌ ${errorMsg}`);
      console.error(`   Recepti: ${relevantRecipes.length} ukupno, ${validRecipes.length} valjani`);
      console.error(`   Namirnice: ${relevantFoods.length} ukupno, ${validFoods.length} valjane`);
      throw new Error(errorMsg);
    }

    // Izračunaj score za sve kandidate (sa dodatnim weekly variety penalty)
    const scoredCandidates = candidates.map((candidate) => {
      const scored = calculateMealScore(candidate, slot, dailyContext);

      // Dodatni weekly variety penalty - ako je recept već korišten u tjednu
      if (candidate.type === "recipe") {
        const recipeCount = recipeUsageCount.get(candidate.id) || 0;
        if (recipeCount >= maxSameRecipePerWeek) {
          // Već dostigli max - ovo ne bi trebalo biti u kandidatima, ali za sigurnost
          scored.score *= 0.3; // Veliki penalty
        } else if (recipeCount > 0) {
          // Dodatni penalty za već korišten recept
          const penaltyMultiplier = 1 - recipeCount * 0.15; // -15% za svaki dodatni put
          scored.score *= Math.max(0.3, penaltyMultiplier);
        }
      }

      return scored;
    });

    // Sortiraj po score-u i uzmi top 1
    scoredCandidates.sort((a, b) => b.score - a.score);
    const selectedMeal = scoredCandidates[0];

    if (!selectedMeal) {
      throw new Error(`Nije pronađen kandidat za ${slot.name}`);
    }

    selectedMeals.push(selectedMeal);

    // Ažuriraj dailyContext
    if (selectedMeal.type === "recipe") {
      dailyContext.usedRecipeIds.add(selectedMeal.id);
    }

    // Dodaj glavni protein
    let mainProtein: string | null = null;
    if (selectedMeal.type === "recipe" && selectedMeal.meta.recipe) {
      const proteinSource = selectedMeal.meta.recipe.tags?.find((tag) => {
        const lowerTag = tag.toLowerCase();
        return ["chicken", "beef", "fish", "pork", "turkey", "tofu", "beans", "eggs", "tuna", "salmon", "lamb"].some(
          (p) => lowerTag.includes(p)
        );
      });
      if (proteinSource) {
        mainProtein = proteinSource.toLowerCase();
      }
    } else if (selectedMeal.type === "food" && selectedMeal.meta.food) {
      const category = selectedMeal.meta.food.category?.toLowerCase();
      const proteinCategories = ["meso", "morski plodovi", "jaja", "mliječni proizvodi"];
      if (category && proteinCategories.some((cat) => category.includes(cat))) {
        mainProtein = category;
      }
    }

    if (mainProtein) {
      dailyContext.usedMainProteins.add(mainProtein);
    }
  }

  // 5. Izračunaj ukupne makroe
  const totalCalories = selectedMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = selectedMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = selectedMeals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFat = selectedMeals.reduce((sum, meal) => sum + meal.fat, 0);

  const actual = {
    calories: Math.round(totalCalories * 10) / 10,
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
  };

  const target = {
    calories: calculations.target_calories,
    protein: calculations.protein_grams,
    carbs: calculations.carbs_grams,
    fat: calculations.fats_grams,
  };

  // 6. Izračunaj devijaciju
  const deviation = calculateDailyDeviation(target, actual);

  return {
    date,
    clientId: userId,
    breakfast: selectedMeals[0],
    lunch: selectedMeals[1],
    dinner: selectedMeals[2],
    snack: selectedMeals[3],
    total: {
      ...actual,
      deviation,
    },
  };
}

/**
 * Spremi PRO tjedni plan u Supabase
 */
export async function saveWeeklyProMealPlanToSupabase(
  clientId: string,
  plan: WeeklyPlan
): Promise<Record<string, any>> {
  try {
    // Spremi u bazu - bez deviation_percent i plan_json jer kolone možda ne postoje
    const insertData: Record<string, any> = {
        client_id: clientId,
        week_start_date: plan.weekStartDate,
        meals: plan.days.map((day) => day.meals), // Legacy format za kompatibilnost
        total_calories: Math.round(plan.weeklyAverage.calories * 7),
        total_protein: Math.round(plan.weeklyAverage.protein * 7),
        total_carbs: Math.round(plan.weeklyAverage.carbs * 7),
        total_fats: Math.round(plan.weeklyAverage.fat * 7),
        plan_type: "pro_weekly",
        plan_version: "2.1",
    };

    const { data, error } = await supabase
      .from("meal_plans")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error saving weekly PRO meal plan to Supabase:", error);
      // Nastavi bez bacanja greške - plan je generiran
      return { id: null, ...insertData };
    }

    return data;
  } catch (error) {
    console.error("Error in saveWeeklyProMealPlanToSupabase:", error);
    // Vrati prazan objekt umjesto bacanja greške
    return { id: null };
  }
}

// ============================================
// EXPORT
// ============================================

export default {
  generateProDailyMealPlan,
  saveProMealPlanToSupabase,
  generateWeeklyProMealPlan,
  generateWeeklyProMealPlanWithCalculations,
  saveWeeklyProMealPlanToSupabase,
};


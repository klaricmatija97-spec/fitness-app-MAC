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
// ONEMOGUĆENO: Ne koristimo Supabase recipes/foods tablice
// import { getRecipes, getFoods } from "../db/queries";
import { calculateAll, determineActivityLevel, type ClientData } from "../calculations";
// ONEMOGUĆENO: Ne koristimo CSV podatke - samo lokalna baza foods-database.ts
// import { searchFoods, getFoodMacros, getAllFoodsWithMacros, initializeCSVData } from "../data/csvLoader";
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

// Cache za validirane obroke (meal name + ingredients hash → validated macros)
// Sprječava ponavljanje API poziva za isti obrok
const validatedMealsCache = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();

function getMealCacheKey(mealName: string, ingredients: string): string {
  return `${mealName.toLowerCase().trim()}::${ingredients.toLowerCase().trim()}`;
}

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
// FOOD FAMILIES - za sprječavanje ponavljanja sličnih jela u istom danu
// ============================================
const FOOD_FAMILIES: Record<string, string[]> = {
  // ========== GLAVNI PROTEINI ==========
  'tuna': [
    'Tuna canned', 'Tuna', 'tuna_canned'
  ],
  'piletina': [
    'Chicken breast', 'chicken_breast', 'ham_chicken', 'Pileći dimcek'
  ],
  'puretina': [
    'Turkey breast', 'Ground turkey', 'ground_turkey'
  ],
  'losos': [
    'Salmon', 'salmon', 'salmon_smoked'
  ],
  'jaja': [
    'Egg', 'Whole egg', 'Egg white', 'egg', 'whole_egg', 'egg_white'
  ],
  'govedina': [
    'Beef', 'beef_lean', 'beef_ground'
  ],
  'svinjetina': [
    'Pork', 'pork_loin', 'pork_tenderloin'
  ],
  'bijela_riba': [
    'Cod', 'Hake', 'Sea bass', 'Sea bream', 'Trout', 'Carp',
    'Oslić', 'Brancin', 'Orada', 'Pastrva', 'Šaran'
  ],
  
  // ========== MLIJEČNI PROIZVODI ZA UŽINE ==========
  'skyr': [
    'Skyr'  // Exact match from meal_components
  ],
  'grcki_jogurt': [
    'Greek yogurt'  // Exact match from meal_components
  ],
  'zrnati_sir': [
    'Cottage cheese'  // Exact match from meal_components
  ],
  
  // ========== UŽINE SPECIFIČNE ==========
  'whey': [
    'Whey', 'Whey protein'  // Exact matches from meal_components
  ],
  'kikiriki': [
    'Peanut butter'  // Exact match from meal_components
  ],
  'zobena': [
    'Oats'  // Exact match from meal_components
  ],
  'orasasti': [
    'Almonds', 'Walnuts', 'Hazelnuts', 'Pumpkin seeds'  // Exact matches
  ],
  
  // ========== VOĆE ==========
  'banana': [
    'Banana'  // Često se koristi u kombinacijama
  ],
  'borovnice': [
    'Blueberries'
  ],
  
  // ========== OSTALO ==========
  'avokado': [
    'Avocado'
  ],
  'rizini_krekeri': [
    'Rice cakes', 'Rice crackers'
  ]
};

// Dobij obitelj namirnice
function getFoodFamily(foodKey: string): string | null {
  const lowerKey = foodKey.toLowerCase();
  for (const [family, members] of Object.entries(FOOD_FAMILIES)) {
    if (members.some(m => m.toLowerCase() === lowerKey || lowerKey.includes(m.toLowerCase()))) {
      return family;
    }
  }
  return null;
}

// Provjeri je li obitelj već korištena
function isFamilyUsedToday(foodKey: string, usedFamilies: Set<string>): boolean {
  const family = getFoodFamily(foodKey);
  return family ? usedFamilies.has(family) : false;
}

// Dodaj obitelj u korištene
function markFamilyAsUsed(foodKey: string, usedFamilies: Set<string>): void {
  const family = getFoodFamily(foodKey);
  if (family) {
    usedFamilies.add(family);
  }
}

// ============================================
// PORTION LIMITS (kao web generator)
// ============================================

// LOSE MODE: Više proteina, manje UH i masti
const PORTION_LIMITS_LOSE: Record<string, { min: number; max: number }> = {
  "chicken_breast": { min: 100, max: 250 },
  "smoked_chicken_breast": { min: 50, max: 150 },
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
  "smoked_chicken_breast": { min: 50, max: 150 },
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
  "smoked_chicken_breast": { min: 50, max: 150 },
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
 * NOVI: Pronađi namirnicu iz LOKALNE baze (foods-database.ts)
 * NE koristi Supabase ni CSV - samo lokalna baza!
 * 
 * @param foodKey - Ključ iz meal_components.json (npr. "Egg", "Chicken breast", "Almonds")
 * @returns Food objekt ili undefined ako nije pronađen
 */
function findFoodFromLocalDatabase(foodKey: string): Food | undefined {
  const namirnica = findNamirnica(foodKey);
  if (!namirnica) {
    return undefined;
  }
  
  // Konvertiraj Namirnica u Food format
  return {
    id: namirnica.id,
    name: namirnica.name,
    calories_per_100g: namirnica.caloriesPer100g,
    protein_per_100g: namirnica.proteinPer100g,
    carbs_per_100g: namirnica.carbsPer100g,
    fat_per_100g: namirnica.fatsPer100g,
    category: namirnica.category,
    tags: [],
    allergens: null,
    usda_fdc_id: null,
    is_usda: false,
    default_serving_size_g: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    mealSlot: undefined,
  } as Food;
}

/**
 * LEGACY: Pronađi USDA hranu po foodKey iz meal_components.json
 * DEPRECATED - koristi findFoodFromLocalDatabase umjesto ovoga
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
/**
 * Provjeri dijele li dva jela istu glavnu namirnicu/protein
 * Npr. "Tuna" i "Tuna canned" su ista glavna namirnica
 */
function getMainIngredient(foodName: string): string {
  const lower = foodName.toLowerCase();
  
  // Glavni proteini/namirnice koji se ne smiju ponavljati
  const mainIngredients: Record<string, string> = {
    'tuna': 'tuna',
    'tuna canned': 'tuna',
    'chicken': 'chicken',
    'chicken breast': 'chicken',
    'smoked chicken breast': 'chicken',
    'turkey': 'turkey',
    'turkey breast': 'turkey',
    'salmon': 'salmon',
    'beef': 'beef',
    'pork': 'pork',
    'eggs': 'eggs',
    'egg': 'eggs',
    'egg white': 'eggs',
  };
  
  // Provjeri da li foodName sadrži neku od glavnih namirnica
  for (const [key, mainIng] of Object.entries(mainIngredients)) {
    if (lower.includes(key)) {
      return mainIng;
    }
  }
  
  return lower; // Ako nije glavna namirnica, vrati original
}

function sharesIngredient(a: MealOption, b: MealOption): boolean {
  const foodsA = new Set(a.components.map(c => c.food));
  const mainIngredientsA = new Set(a.components.map(c => getMainIngredient(c.food)));
  
  // Provjeri točno poklapanje food itema
  if (b.components.some(c => foodsA.has(c.food))) {
    return true;
  }
  
  // Provjeri glavne namirnice (tuna, chicken, itd.)
  return b.components.some(c => {
    const mainIng = getMainIngredient(c.food);
    return mainIngredientsA.has(mainIng) && mainIng !== c.food.toLowerCase(); // Samo ako je glavna namirnica
  });
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
  let protein = 0, carbs = 0, fat = 0;

  // Zbroji makronutrijente iz svih obroka
  Object.values(meals).forEach((meal) => {
    if (!meal) return;
    protein += meal.protein || 0;
    carbs += meal.carbs || 0;
    fat += meal.fat || 0;
  });

  // IZRAČUNAJ kalorije iz makronutrijenata (P×4 + UH×4 + M×9) za konzistentnost
  const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);

  return { calories, protein: Math.round(protein * 10) / 10, carbs: Math.round(carbs * 10) / 10, fat: Math.round(fat * 10) / 10 };
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
  userGoal: GoalType = "maintain",
  usedFoodFamilies: Set<string> = new Set() // Dodano: korištene food families
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
  
  // FILTRIRAJ: Isključi jela s previše masti/proteina ili iz već korištene obitelji
  const filteredDefinitions = definitions.filter(def => {
    // Brzo procijeni makroe za jelo
    let estFat = 0, estProt = 0, estCal = 0;
    for (const comp of def.components) {
      const food = findFoodFromLocalDatabase(comp.food);
      if (food) {
        const ratio = comp.grams / 100;
        estFat += (food.fat_per_100g || 0) * ratio;
        estProt += (food.protein_per_100g || 0) * ratio;
        estCal += (food.calories_per_100g || 0) * ratio;
      }
    }
    
    // HARD EXCLUSION za food family conflict (npr. 2 riblja jela u danu)
    for (const comp of def.components) {
      const family = getFoodFamily(comp.food);
      if (family && usedFoodFamilies.has(family)) {
        console.log(`🚫 FALLBACK ISKLJUČENO (family): ${def.name} koristi "${family}" koja je već korištena danas`);
        return false;
      }
    }
    
    // HARD EXCLUSION za snack - masti
    if (slotKey === 'snack' && estFat > 25) {
      console.log(`🚫 FALLBACK ISKLJUČENO: ${def.name} ima ${estFat.toFixed(0)}g masti za snack`);
      return false;
    }
    
    // HARD EXCLUSION za bilo koje jelo s >40g masti
    if (estFat > 40) {
      console.log(`🚫 FALLBACK ISKLJUČENO: ${def.name} ima ${estFat.toFixed(0)}g masti (max 40g)`);
      return false;
    }
    
    // HARD EXCLUSION za snack - proteini
    if (slotKey === 'snack' && estProt > 30) {
      console.log(`🚫 FALLBACK ISKLJUČENO: ${def.name} ima ${estProt.toFixed(0)}g proteina za snack`);
      return false;
    }
    
    // HARD EXCLUSION za snack - kalorije
    if (slotKey === 'snack' && estCal > 400) {
      console.log(`🚫 FALLBACK ISKLJUČENO: ${def.name} ima ${estCal.toFixed(0)} kcal za snack`);
      return false;
    }
    
    return true;
  });
  
  // Koristi filtrirane definicije, ili originalne ako nema nijedne
  const mealsToChoose = filteredDefinitions.length > 0 ? filteredDefinitions : definitions;
  
  // Odaberi nasumično jelo iz definicija
  const randomIndex = Math.floor(Math.random() * mealsToChoose.length);
  const selectedMeal = mealsToChoose[randomIndex];
  
  // Konvertiraj u MealOption format
  const mealOption = convertToMealOption(selectedMeal);
  
  // Izgradi obrok iz komponenti (koristi istu logiku kao buildCompositeMealForSlot)
  const componentDetails: Array<{ food: Food; grams: number; units?: number; displayText: string; displayName?: string }> = [];
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  const missingFoods: string[] = []; // Samo za logging - NIKADA ne koristi se za preskakanje jela
  
  // PRAVILO: meal_components.json je JEDINI izvor istine za sastojke
  // Dodaj SVE sastojke, čak i ako nemaju nutritivne podatke (koristi 0)
  for (const component of mealOption.components) {
    // Preskoči vodu (nema nutritivne vrijednosti)
    if (component.food.toLowerCase().includes('water') || component.food.toLowerCase().includes('voda')) {
      continue;
    }
    
    // KORISTI LOKALNU BAZU - NE Supabase/CSV!
    const food = findFoodFromLocalDatabase(component.food);
    
    // PRAVILO: Ako namirnica ne postoji, koristi 0 vrijednosti
    if (!food) {
      console.warn(`⚠️ Namirnica "${component.food}" nije pronađena u lokalnoj bazi za fallback jelo "${mealOption.name}" - koristim 0 vrijednosti`);
      missingFoods.push(component.food);
      // Dodaj placeholder sastojak s 0 vrijednostima
      const placeholderFood: Food = {
        id: `missing-${component.food.toLowerCase().replace(/\s+/g, '-')}`,
        name: component.food,
        calories_per_100g: 0,
        protein_per_100g: 0,
        carbs_per_100g: 0,
        fat_per_100g: 0,
        category: 'ostalo',
        tags: [],
        allergens: null,
        usda_fdc_id: null,
        is_usda: false,
        default_serving_size_g: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mealSlot: undefined,
      };
      const originalDisplayName = (component as any).displayName;
      const displayName = originalDisplayName || getCroatianFoodName(component.food);
      const displayText = `${displayName} (${component.grams}g)`;
      componentDetails.push({ food: placeholderFood, grams: component.grams, units: undefined, displayText, displayName: originalDisplayName });
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
    const originalDisplayName = originalComponent?.displayName;
    const displayName = originalDisplayName || getCroatianFoodName(component.food);
    const units = grams >= 50 ? Math.round(grams / 50) : undefined;
    const displayText = units ? `${units}x ${displayName}` : `${grams}g ${displayName}`;
    
    componentDetails.push({ food, grams, units, displayText, displayName: originalDisplayName });
    usedToday.add(food.id);
  }
  
  // PRAVILO: NIKADA ne preskači jelo zbog nedostajućih namirnica
  // Sve komponente su već dodane (s 0 vrijednostima ako treba)
  if (missingFoods.length > 0) {
    console.warn(`⚠️ Fallback obrok "${selectedMeal.name}" ima komponente bez nutritivnih podataka: ${missingFoods.join(", ")} - koriste 0 vrijednosti`);
  }
  
  if (calories <= 0) {
    throw new Error(`Fallback obrok "${selectedMeal.name}" ima 0 kalorija`);
  }
  
  // Provjeri ima li jelo fixedPortions flag (za gotova jela iz konzerve)
  const hasFixedPortions = (selectedMeal as any).fixedPortions === true;
  
  // Prilagodi kalorije prema targetu (OSIM za fixedPortions jela)
  // PROŠIRENO: Dozvoljen raspon 0.5-2.0 za točnije pogađanje ciljeva
  let factor = 1;
  if (!hasFixedPortions && targetCalories > 0) {
    factor = targetCalories / calories;
    factor = Math.max(0.5, Math.min(2.0, factor));
  }
  
  // Prilagodi gramaže faktorom (samo ako nije fixedPortions)
  const adjustedComponentDetails = componentDetails.map(c => ({
    ...c,
    grams: hasFixedPortions ? c.grams : Math.round(c.grams * factor * 10) / 10
  }));
  
  // Preračunaj makroe s faktorom (samo ako nije fixedPortions)
  if (!hasFixedPortions) {
    calories = Math.round(calories * factor * 10) / 10;
    protein = Math.round(protein * factor * 10) / 10;
    carbs = Math.round(carbs * factor * 10) / 10;
    fat = Math.round(fat * factor * 10) / 10;
  }
  
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
      // KRITIČNO: Koristi displayName ako postoji
      foodName: c.displayName || translateFoodName(c.food.name),
      grams: c.grams,
      units: c.units,
      displayText: c.displayText,
      displayName: c.displayName
    }))
  } as ScoredMeal & { componentsString?: string; componentDetails?: Array<{ foodName: string; grams: number; units?: number; displayText: string; displayName?: string }> };
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
  const componentDetails: Array<{ food: Food; grams: number; units?: number; displayText: string; displayName?: string }> = [];
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  
  for (const component of mealOption.components) {
    // KORISTI LOKALNU BAZU - NE Supabase/CSV!
    const food = findFoodFromLocalDatabase(component.food);
    
    if (!food) continue;
    
    const grams = component.grams;
    const ratio = grams / 100;
    
    calories += (food.calories_per_100g || 0) * ratio;
    protein += (food.protein_per_100g || 0) * ratio;
    carbs += (food.carbs_per_100g || 0) * ratio;
    fat += (food.fat_per_100g || 0) * ratio;
    
    // Koristi originalni displayName ili hrvatski naziv namirnice
    const originalDisplayName = (component as any).displayName;
    const displayName = originalDisplayName || getCroatianFoodName(component.food);
    const units = grams >= 50 ? Math.round(grams / 50) : undefined;
    const displayText = units ? `${units}x ${displayName}` : `${grams}g ${displayName}`;
    
    componentDetails.push({ food, grams, units, displayText, displayName: originalDisplayName });
    usedToday.add(food.id);
  }
  
  if (calories <= 0) {
    throw new Error(`Fallback obrok ima 0 kalorija`);
  }
  
  // Provjeri ima li jelo fixedPortions flag (za gotova jela iz konzerve)
  const hasFixedPortions = (mealOption as any).fixedPortions === true;
  
  // Prilagodi kalorije prema targetu (OSIM za fixedPortions jela)
  // PROŠIRENO: Dozvoljen raspon 0.5-2.0 za točnije pogađanje ciljeva
  let factor = 1;
  if (!hasFixedPortions && targetCalories > 0) {
    factor = targetCalories / calories;
    factor = Math.max(0.5, Math.min(2.0, factor));
  }
  
  const adjustedComponentDetails = componentDetails.map(c => ({
    ...c,
    grams: hasFixedPortions ? c.grams : Math.round(c.grams * factor * 10) / 10
  }));
  
  if (!hasFixedPortions) {
    calories = Math.round(calories * factor * 10) / 10;
    protein = Math.round(protein * factor * 10) / 10;
    carbs = Math.round(carbs * factor * 10) / 10;
    fat = Math.round(fat * factor * 10) / 10;
  }
  
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
      // KRITIČNO: Koristi displayName ako postoji
      foodName: c.displayName || translateFoodName(c.food.name),
      grams: c.grams,
      units: c.units,
      displayText: c.displayText,
      displayName: c.displayName
    }))
  } as ScoredMeal & { componentsString?: string; componentDetails?: Array<{ foodName: string; grams: number; units?: number; displayText: string; displayName?: string }> };
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
    // VIŠE PROTEINA, MANJE UGLJIKOHIDRATA
    // Protein: 28% + 40% + 32% + 10% = 110% → normalizirano na 100%: 25.5% + 36.4% + 29.1% + 9.0%
    // Carbs: 25% + 35% + 15% + 5% = 80% → normalizirano na 100%: 31.25% + 43.75% + 18.75% + 6.25%
    // Breakfast: više proteina, umjereno carbs
    breakfast: { calories: 0.25, protein: 0.255, carbs: 0.3125, fat: 0.25 },
    // Lunch: najviše proteina, više carbs (glavni obrok)
    lunch: { calories: 0.35, protein: 0.364, carbs: 0.4375, fat: 0.35 },
    // Dinner: više proteina, MANJE carbs (minimalno navečer)
    dinner: { calories: 0.25, protein: 0.291, carbs: 0.1875, fat: 0.30 },
    // Snack: minimalno carbs, manje proteina (ispravljeno da suma bude 1.0)
    snack: { calories: 0.15, protein: 0.090, carbs: 0.0625, fat: 0.10 },
  },
  gain: {
    // VIŠE UGLJIKOHIDRATA, uravnoteženo s proteinom
    // Carbs: 35% + 40% + 30% + 15% = 120% → normalizirano na 100%: 29.2% + 33.3% + 25% + 12.5%
    // Protein: 23% + 27% + 30% + 15% = 95% → normalizirano na 100%: 24.2% + 28.4% + 31.6% + 15.8%
    // Breakfast: više carbs za energiju
    breakfast: { calories: 0.25, protein: 0.242, carbs: 0.292, fat: 0.20 },
    // Lunch: najviše carbs
    lunch: { calories: 0.30, protein: 0.284, carbs: 0.333, fat: 0.30 },
    // Dinner: umjereno carbs, više proteina
    dinner: { calories: 0.30, protein: 0.316, carbs: 0.250, fat: 0.35 },
    // Snack: malo carbs
    snack: { calories: 0.15, protein: 0.158, carbs: 0.125, fat: 0.15 },
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

  // POBOLJŠANO V2: Veći prioritet proteinima i ugljikohidratima
  const weighted =
    calDev * 0.20 +
    protDev * 0.40 +
    carbDev * 0.30 +
    fatDev * 0.10;

  return {
    calories: Math.round(calDev * 1000) / 10, // U postocima sa 1 decimalom
    protein: Math.round(protDev * 1000) / 10,
    carbs: Math.round(carbDev * 1000) / 10,
    fat: Math.round(fatDev * 1000) / 10,
    total: Math.round(weighted * 1000) / 10, // U postocima
  };
}

/**
 * Završno balansiranje porcija svih obroka za smanjenje devijacije od dnevnih ciljeva.
 * POBOLJŠANO V2: Koristi iterativni pristup i zasebne faktore za P/UH/M.
 * 
 * @param meals - Niz odabranih obroka
 * @param target - Ciljni dnevni makroi
 * @returns Balansirane obroke s prilagođenim makroima
 */
function balanceMealPortions(
  meals: ScoredMeal[],
  target: { calories: number; protein: number; carbs: number; fat: number }
): ScoredMeal[] {
  if (meals.length === 0) return meals;

  let balancedMeals = [...meals];
  const MAX_ITERATIONS = 3;
  const TOLERANCE = 0.03; // 3% tolerancija

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Izračunaj trenutne ukupne makroe
    const current = {
      calories: balancedMeals.reduce((sum, m) => sum + m.calories, 0),
      protein: balancedMeals.reduce((sum, m) => sum + m.protein, 0),
      carbs: balancedMeals.reduce((sum, m) => sum + m.carbs, 0),
      fat: balancedMeals.reduce((sum, m) => sum + m.fat, 0),
    };

    // Izračunaj devijacije
    const proteinDev = Math.abs(current.protein - target.protein) / target.protein;
    const carbsDev = Math.abs(current.carbs - target.carbs) / target.carbs;
    const fatDev = Math.abs(current.fat - target.fat) / target.fat;
    const calDev = Math.abs(current.calories - target.calories) / target.calories;

    // Ako su svi makroi unutar tolerancije, završi
    if (proteinDev <= TOLERANCE && carbsDev <= TOLERANCE && fatDev <= TOLERANCE && calDev <= TOLERANCE) {
      console.log(`   ✅ Iteracija ${iteration + 1}: Makroi su dobro balansirani (dev: P=${(proteinDev*100).toFixed(1)}%, UH=${(carbsDev*100).toFixed(1)}%, M=${(fatDev*100).toFixed(1)}%)`);
      break;
    }

    // Izračunaj faktore korekcije - veći raspon za proteine i UH
    const proteinFactor = current.protein > 0 ? target.protein / current.protein : 1;
    const carbsFactor = current.carbs > 0 ? target.carbs / current.carbs : 1;
    const fatFactor = current.fat > 0 ? target.fat / current.fat : 1;

    // PROŠIRENO: Limitiraj faktore (±50% za P/UH, ±40% za masti) za točnije pogađanje ciljeva
    const clampedProteinFactor = Math.max(0.50, Math.min(1.50, proteinFactor));
    const clampedCarbsFactor = Math.max(0.50, Math.min(1.50, carbsFactor));
    const clampedFatFactor = Math.max(0.60, Math.min(1.40, fatFactor));

    // Kombinirani faktor s prioritetom na P i UH
    const avgFactor = 
      clampedProteinFactor * 0.45 + 
      clampedCarbsFactor * 0.40 + 
      clampedFatFactor * 0.15;

    console.log(`   🔧 Iteracija ${iteration + 1}: faktor ${avgFactor.toFixed(3)} (P: ${clampedProteinFactor.toFixed(2)}, UH: ${clampedCarbsFactor.toFixed(2)}, M: ${clampedFatFactor.toFixed(2)})`);
    console.log(`      Dev prije: P=${(proteinDev*100).toFixed(1)}%, UH=${(carbsDev*100).toFixed(1)}%, M=${(fatDev*100).toFixed(1)}%, kcal=${(calDev*100).toFixed(1)}%`);

    // Primijeni faktor na sve obroke
    balancedMeals = balancedMeals.map((meal) => {
      const scaledCalories = Math.round(meal.calories * avgFactor);
      const scaledProtein = Math.round(meal.protein * avgFactor * 10) / 10;
      const scaledCarbs = Math.round(meal.carbs * avgFactor * 10) / 10;
      const scaledFat = Math.round(meal.fat * avgFactor * 10) / 10;

      // Ažuriraj componentDetails ako postoje
      const scaledComponentDetails = (meal as any).componentDetails?.map((c: any) => ({
        ...c,
        grams: Math.round(c.grams * avgFactor),
        displayText: c.displayText.replace(
          /(\d+)g/,
          `${Math.round(parseInt(c.displayText.match(/(\d+)g/)?.[1] || '0') * avgFactor)}g`
        ),
      }));

      return {
        ...meal,
        calories: scaledCalories,
        protein: scaledProtein,
        carbs: scaledCarbs,
        fat: scaledFat,
        ...(scaledComponentDetails && { componentDetails: scaledComponentDetails }),
      };
    });
  }

  // Završni log
  const finalCurrent = {
    calories: balancedMeals.reduce((sum, m) => sum + m.calories, 0),
    protein: balancedMeals.reduce((sum, m) => sum + m.protein, 0),
    carbs: balancedMeals.reduce((sum, m) => sum + m.carbs, 0),
    fat: balancedMeals.reduce((sum, m) => sum + m.fat, 0),
  };
  console.log(`   📊 Završno: ${finalCurrent.calories} kcal, P: ${finalCurrent.protein.toFixed(1)}g, UH: ${finalCurrent.carbs.toFixed(1)}g, M: ${finalCurrent.fat.toFixed(1)}g`);
  console.log(`   📊 Cilj:    ${target.calories} kcal, P: ${target.protein.toFixed(1)}g, UH: ${target.carbs.toFixed(1)}g, M: ${target.fat.toFixed(1)}g`);

  return balancedMeals;
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
  // ⚠️ ONEMOGUĆENO: Koristimo samo meal_components.json, ne Supabase recipes tablicu
  // Supabase recipes tablica može imati stare verzije jela (npr. Mix orašastih s jajima i višnjama)
  console.log(`⚠️ getRelevantRecipes pozvan, ali ONEMOGUĆEN - koristimo samo meal_components.json za ${mealType}`);
  return [];
  
  // STARI KOD - ONEMOGUĆEN
  /*
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
  */
}

/**
 * ONEMOGUĆENO: Ne koristimo CSV/Supabase za foods
 * Svi podaci dolaze iz meal_components.json + foods-database.ts
 */
async function getRelevantFoods(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  preferences: ClientPreferences,
  targetProtein?: number
): Promise<Food[]> {
  // ⚠️ ONEMOGUĆENO: Vraćamo prazan niz jer koristimo SAMO meal_components.json
  // Svi sastojci dolaze iz lokalnog foods-database.ts
  console.log(`⚠️ getRelevantFoods pozvan za ${mealType}, ali je ONEMOGUĆEN - koristimo samo meal_components.json`);
  return [];

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
    
    // KORISTI LOKALNU BAZU - NE Supabase/CSV!
    const food = findFoodFromLocalDatabase(component.food);
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
  
  // PRAVILO: meal_components.json je JEDINI izvor istine
  // KORISTI LOKALNU BAZU - NE Supabase/CSV!
  for (const component of meal.components) {
    const food = findFoodFromLocalDatabase(component.food);
    if (!food) {
      // Koristi 0 kalorija za nedostajuću namirnicu (ne invalidiraj template)
      continue;
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
  },
  preferredSnackType: 'sweet' | 'savory' | null = null
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
  
  // DEBUG: Provjeri "Mix orašastih plodova" ako je snack
  if (slotKey === "snack") {
    const mixMeal = definitions.find(d => d.id === "snack_maintain_7" || d.name?.includes("Mix orašastih"));
    if (mixMeal) {
      console.log(`🔍 DEBUG: Pronađen "Mix orašastih plodova" - components:`, mixMeal.components.map(c => `${c.displayName || c.food} ${c.grams}g`).join(", "));
      const hasEgg = mixMeal.components.some(c => c.food?.toLowerCase().includes("egg") || c.displayName?.toLowerCase().includes("jaja"));
      const hasCherries = mixMeal.components.some(c => c.food?.toLowerCase().includes("cherry") || c.displayName?.toLowerCase().includes("višnje"));
      if (hasEgg || hasCherries) {
        console.error(`❌ PROBLEM: "Mix orašastih plodova" sadrži jaja ili višnje!`);
      }
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
  
  // FOOD FAMILY VARIETY: Spriječi previše jela iz iste obitelji u jednom danu
  // Npr. ako je već bila tuna, ne dopusti drugu tunu
  const usedFoodFamiliesToday = new Set<string>();
  
  // Popuni usedMealIds, usedMealNamesToday i usedFoodFamiliesToday iz previousMeals
  for (const prevMeal of previousMeals) {
    const mealDef = definitions.find(d => d.name === prevMeal.name);
    if (mealDef?.id) {
      usedMealIds.add(mealDef.id);
    }
    usedMealNamesToday.add(prevMeal.name.toLowerCase());
    
    // Pronađi komponente jela i označi njihove obitelji kao korištene
    if (mealDef?.components) {
      for (const comp of mealDef.components) {
        markFamilyAsUsed(comp.food, usedFoodFamiliesToday);
      }
    }
  }
  
  // Helper funkcija za provjeru ima li jelo komponente iz već korištene obitelji
  const hasFamilyConflict = (meal: MealOption): boolean => {
    const mealDef = definitions.find(d => d.name === meal.name);
    if (!mealDef?.components) return false;
    
    for (const comp of mealDef.components) {
      if (isFamilyUsedToday(comp.food, usedFoodFamiliesToday)) {
        return true;
      }
    }
    return false;
  };
  
  let preferredMeals = availableMeals.filter(meal => {
    const mealDef = definitions.find(d => d.name === meal.name);
    const mealId = mealDef?.id || meal.name;
    
    // Isključi jela s istim ID-om, istim imenom, ili iz iste obitelji namirnica
    return !usedMealIds.has(mealId) && 
           !usedMealNamesToday.has(meal.name.toLowerCase()) &&
           !usedMealNamesThisWeek.has(meal.name.toLowerCase()) &&
           !hasFamilyConflict(meal);
  });

  // Ako nema novih jela nakon variety filtra, dozvoli ponavljanje obitelji (ali ne isti ID/ime)
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

  // Za breakfast: filtriraj prema preferiranom tipu (slatki/slani/kombinacija)
  if (slot === "breakfast" && (global as any).preferredBreakfastType) {
    const preferredType = (global as any).preferredBreakfastType as 'sweet' | 'savory' | 'combined';
    preferredMeals = preferredMeals.filter(meal => {
      // Pronađi originalnu definiciju za tagove
      const mealDef = definitions.find(d => d.name === meal.name);
      const mealTags = mealDef?.tags || [];
      const mealIsSweet = isSweetBreakfast(meal.name, mealTags);
      const mealIsCombined = isCombinedBreakfast(meal.name, mealTags);
      const mealIsSavory = !mealIsSweet && !mealIsCombined;
      
      switch (preferredType) {
        case 'sweet':
          return mealIsSweet;
        case 'savory':
          return mealIsSavory;
        case 'combined':
          return mealIsCombined;
        default:
          return true;
      }
    });
    
    // Ako nema breakfasta željenog tipa, koristi sve (fallback)
    if (preferredMeals.length === 0) {
      console.warn(`⚠️ Nema ${preferredType} breakfasta za dan, koristim sve dostupne`);
      preferredMeals = availableMeals.filter(meal => {
        const mealDef = definitions.find(d => d.name === meal.name);
        const mealId = mealDef?.id || meal.name;
        return !usedMealIds.has(mealId) && 
               !usedMealNamesToday.has(meal.name.toLowerCase()) &&
               !usedMealNamesThisWeek.has(meal.name.toLowerCase());
      });
    }
  }

  // DODATNO: Filtriraj jela koja dijele istu glavnu namirnicu s prethodnim obrokom
  // Ovo sprječava situacije poput "tuna tortilja" → "tuna s krekerima"
  if (previousMeal) {
    const filteredMeals = preferredMeals.filter(meal => !sharesIngredient(meal, previousMeal));
    // Ako ima dovoljno opcija nakon filtriranja (min 3), koristi ih
    if (filteredMeals.length >= 3) {
      preferredMeals = filteredMeals;
    }
    // Ako nema dovoljno opcija, koristi sve ali će biti veći penalty u scoring-u
  }

  // Za snack: filtriraj prema preferiranom tipu (slatki/slani)
  if ((slot === "snack" || slot === "extraSnack") && preferredSnackType) {
    preferredMeals = preferredMeals.filter(meal => {
      // Pronađi originalnu definiciju za tagove
      const mealDef = definitions.find(d => d.name === meal.name);
      const mealTags = mealDef?.tags || [];
      const mealIsSweet = isSweetBreakfast(meal.name, mealTags);
      return preferredSnackType === 'sweet' ? mealIsSweet : !mealIsSweet;
    });
    
    // Ako nema snackova željenog tipa, koristi sve (fallback)
    if (preferredMeals.length === 0) {
      console.warn(`⚠️ Nema ${preferredSnackType} snackova, koristim sve dostupne`);
      preferredMeals = availableMeals.filter(meal => {
        const mealDef = definitions.find(d => d.name === meal.name);
        const mealId = mealDef?.id || meal.name;
        return !usedMealIds.has(mealId) && 
               !usedMealNamesToday.has(meal.name.toLowerCase()) &&
               !usedMealNamesThisWeek.has(meal.name.toLowerCase());
      });
    }
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

  // POBOLJŠANO: Macro-aware odabir umjesto nasumičnog
  // Scorira jela prema tome koliko dobro njihovi makro omjeri odgovaraju cilju
  if (finalMealOptions.length === 0) {
    console.error(`❌ Nema dostupnih jela za ${slot} nakon svih filtera`);
    return null;
  }
  
  // Izračunaj target makro omjere za ovaj slot
  // slotTargetCalories već ima target kalorije, izračunaj target makroe
  const goalType = userGoal || "maintain";
  const distribution = MEAL_DISTRIBUTION[goalType];
  const slotDist = distribution[slotKey as keyof typeof distribution] || distribution.lunch;
  
  // Procijeni makroe za svako jelo i scoraj prema cilju
  interface ScoredMealOption {
    meal: MealOption;
    score: number;
    estimatedMacros: { calories: number; protein: number; carbs: number; fat: number };
  }
  
  const scoredMeals: ScoredMealOption[] = [];
  
  for (const meal of finalMealOptions) {
    // Brzo procijeni makroe (bez API poziva)
    let estCal = 0, estProt = 0, estCarbs = 0, estFat = 0;
    for (const comp of meal.components) {
      const food = findFoodFromLocalDatabase(comp.food);
      if (food) {
        const factor = comp.grams / 100;
        estCal += (food.calories_per_100g || 0) * factor;
        estProt += (food.protein_per_100g || 0) * factor;
        estCarbs += (food.carbs_per_100g || 0) * factor;
        estFat += (food.fat_per_100g || 0) * factor;
      }
    }
    
    if (estCal === 0) continue; // Preskoči jela bez nutritivnih podataka
    
    // ============================================
    // HARD EXCLUSIONS - potpuno isključi nerealna jela
    // ============================================
    
    // Izračunaj target proteine za slot (proporcionalno kalorijama)
    // Za maintain cilj ~100g proteina dnevno, slot dobiva proporcionalni dio
    const slotProteinTarget = slotTargetCalories * 0.22 / 4; // ~22% kalorija iz proteina
    
    // HARD EXCLUSION 1: Snack s više od 25g masti - NIKAD ne koristi
    if ((slot === 'snack' || slot === 'extraSnack') && estFat > 25) {
      console.log(`🚫 ISKLJUČENO (fat): ${meal.name} ima ${estFat.toFixed(0)}g masti za snack`);
      continue;
    }
    
    // HARD EXCLUSION 2: Bilo koje jelo s više od 40g masti - NIKAD ne koristi
    if (estFat > 40) {
      console.log(`🚫 ISKLJUČENO (fat): ${meal.name} ima ${estFat.toFixed(0)}g masti (max 40g)`);
      continue;
    }
    
    // HARD EXCLUSION 3: Snack s više od 400 kcal - previše za užinu
    if ((slot === 'snack' || slot === 'extraSnack') && estCal > 400) {
      console.log(`🚫 ISKLJUČENO (kcal): ${meal.name} ima ${estCal.toFixed(0)} kcal za snack (max 400)`);
      continue;
    }
    
    // HARD EXCLUSION 4: Jelo s više od 2.5x ciljanih proteina za slot
    // Npr. ako je cilj 25g proteina za slot, max je 62g
    if (estProt > slotProteinTarget * 2.5 && estProt > 50) {
      console.log(`🚫 ISKLJUČENO (protein): ${meal.name} ima ${estProt.toFixed(0)}g proteina (max ${(slotProteinTarget * 2.5).toFixed(0)}g za slot)`);
      continue;
    }
    
    // HARD EXCLUSION 5: Snack s više od 30g proteina - previše za užinu
    if ((slot === 'snack' || slot === 'extraSnack') && estProt > 30) {
      console.log(`🚫 ISKLJUČENO (protein): ${meal.name} ima ${estProt.toFixed(0)}g proteina za snack (max 30g)`);
      continue;
    }
    
    // ============================================
    // SOFT PENALTIES - smanjuju score ali ne isključuju
    // ============================================
    
    // Penaliziraj jela s povišenim mastima (ali ispod hard limita)
    const slotFatTarget = slotTargetCalories * 0.25 / 9; // ~25% kalorija iz masti
    const fatExcessRatio = estFat / Math.max(slotFatTarget, 10);
    const hasFatExcess = fatExcessRatio > 1.5; // Više od 1.5x ciljanih masti
    
    // Penaliziraj snackove s više od 15g masti
    const isHighFatSnack = (slot === 'snack' || slot === 'extraSnack') && estFat > 15;
    
    // Penaliziraj jela s povišenim proteinima (ali ispod hard limita)
    const proteinExcessRatio = estProt / Math.max(slotProteinTarget, 15);
    const hasProteinExcess = proteinExcessRatio > 1.8; // Više od 1.8x ciljanih proteina
    
    // Penaliziraj snackove s više od 20g proteina
    const isHighProteinSnack = (slot === 'snack' || slot === 'extraSnack') && estProt > 20;
    
    // Izračunaj koliko dobro makro OMJERI odgovaraju cilju
    // Target omjeri za slot (protein/carbs/fat kao postotak kalorija)
    // Za maintain: ~25% protein, ~50% carbs, ~25% fat (standardna distribucija)
    const targetProtRatio = slotDist.protein;
    const targetCarbsRatio = slotDist.carbs;
    const targetFatRatio = slotDist.fat;
    
    // Stvarni omjeri obroka (makro kalorije / ukupne kalorije)
    const actualProtRatio = estCal > 0 ? (estProt * 4) / estCal : 0;
    const actualCarbsRatio = estCal > 0 ? (estCarbs * 4) / estCal : 0;
    const actualFatRatio = estCal > 0 ? (estFat * 9) / estCal : 0;
    
    // Normalize ratios to sum to 1
    const totalActual = actualProtRatio + actualCarbsRatio + actualFatRatio;
    const normProtRatio = totalActual > 0 ? actualProtRatio / totalActual : 0.33;
    const normCarbsRatio = totalActual > 0 ? actualCarbsRatio / totalActual : 0.33;
    const normFatRatio = totalActual > 0 ? actualFatRatio / totalActual : 0.33;
    
    // Normalize target ratios to sum to 1
    const totalTarget = targetProtRatio + targetCarbsRatio + targetFatRatio;
    const normTargetProt = totalTarget > 0 ? targetProtRatio / totalTarget : 0.33;
    const normTargetCarbs = totalTarget > 0 ? targetCarbsRatio / totalTarget : 0.33;
    const normTargetFat = totalTarget > 0 ? targetFatRatio / totalTarget : 0.33;
    
    // Score = 1 - weighted deviation
    // Veći prioritet proteinima i ugljikohidratima
    const protDev = Math.abs(normProtRatio - normTargetProt);
    const carbsDev = Math.abs(normCarbsRatio - normTargetCarbs);
    const fatDev = Math.abs(normFatRatio - normTargetFat);
    
    const macroScore = 1 - (protDev * 0.4 + carbsDev * 0.4 + fatDev * 0.2);
    
    // Bonus za jela čije kalorije su bliže cilju (manje skaliranje potrebno)
    const calorieDev = Math.abs(estCal - slotTargetCalories) / slotTargetCalories;
    const calorieScore = Math.max(0, 1 - calorieDev);
    
    // Kombinirani score: 60% macro match, 40% calorie match
    let finalScore = macroScore * 0.6 + calorieScore * 0.4;
    
    // PENALTY za visoke masti
    if (hasFatExcess) {
      finalScore *= 0.3; // -70% score za jela s previše masti
    }
    if (isHighFatSnack) {
      finalScore *= 0.2; // -80% score za high-fat snackove
    }
    
    // PENALTY za visoke proteine
    if (hasProteinExcess) {
      finalScore *= 0.4; // -60% score za jela s previše proteina
    }
    if (isHighProteinSnack) {
      finalScore *= 0.3; // -70% score za high-protein snackove
    }
    
    // HARD EXCLUSION za jela iz iste food family (sprječava 2 riblja jela u danu)
    const mealDef = definitions.find(d => d.name === meal.name);
    let hasFamilyConflict = false;
    let conflictingFamily = '';
    if (mealDef?.components) {
      for (const comp of mealDef.components) {
        const family = getFoodFamily(comp.food);
        if (family && usedFoodFamiliesToday.has(family)) {
          hasFamilyConflict = true;
          conflictingFamily = family;
          break;
        }
      }
    }
    
    // HARD EXCLUSION - potpuno isključi jela iz već korištene obitelji
    if (hasFamilyConflict) {
      console.log(`🚫 ISKLJUČENO (family): ${meal.name} koristi "${conflictingFamily}" koja je već korištena danas`);
      continue; // Potpuno preskoči ovo jelo
    }
    
    // PENALTY za jela s istim glavnim proteinom kao prethodni obrok
    if (previousMeal && sharesIngredient(meal, previousMeal)) {
      finalScore *= 0.15; // -85% score za dijeljenje namirnica s prethodnim obrokom
    }
    
    scoredMeals.push({
      meal,
      score: finalScore,
      estimatedMacros: { calories: estCal, protein: estProt, carbs: estCarbs, fat: estFat }
    });
  }
  
  // Sortiraj po score-u (najbolji prvi)
  scoredMeals.sort((a, b) => b.score - a.score);
  
  // POBOLJŠANO: Filtriraj jela sa score-om ispod 0.15 (previše penalizirani)
  const viableMeals = scoredMeals.filter(sm => sm.score >= 0.15);
  
  // Odaberi iz top 50% (povećano za veću varijaciju)
  const mealsToChooseFrom = viableMeals.length > 0 ? viableMeals : scoredMeals;
  const topCount = Math.max(1, Math.ceil(mealsToChooseFrom.length * 0.5));
  const topMeals = mealsToChooseFrom.slice(0, topCount);
  
  // Weighted random selection - veća šansa za bolje ocijenjene obroke
  const totalWeight = topMeals.reduce((sum, m) => sum + m.score, 0);
  let randomValue = Math.random() * totalWeight;
  let selectedMeal = topMeals[0]?.meal || finalMealOptions[0];
  
  for (const scoredMeal of topMeals) {
    randomValue -= scoredMeal.score;
    if (randomValue <= 0) {
      selectedMeal = scoredMeal.meal;
      break;
    }
  }

  // Provjeri da li su sve namirnice dostupne i izračunaj makroe
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  let componentDetails: Array<{ food: Food; grams: number; units?: number; displayText: string; displayName?: string }> = [];
  const missingFoods: string[] = []; // Samo za logging - NIKADA ne koristi se za preskakanje jela

  // EDAMAM-ONLY MODE: Koristi Edamam API za izračun makronutrijenata
  // ONEMOGUĆENO za brzinu - koristi samo USDA podatke (kao web generator)
  // Web generator koristi samo USDA podatke bez Edamam API poziva
  const USE_EDAMAM_ONLY = false; // Default: false (koristi USDA podatke, brže)

  if (USE_EDAMAM_ONLY) {
    // PRAVILO: meal_components.json je JEDINI izvor istine za sastojke
    // Koristi Edamam API SAMO za nutritivne vrijednosti
    // SVE komponente iz meal_components.json se koriste, čak i ako nemaju nutritivne podatke
    const ingredientComponents = selectedMeal.components
      .filter(c => !c.food.toLowerCase().includes('water') && !c.food.toLowerCase().includes('voda'))
      .map(c => {
        // KORISTI LOKALNU BAZU - NE Supabase/CSV!
        const food = findFoodFromLocalDatabase(c.food);
        // PRAVILO: Ako namirnica ne postoji, koristi placeholder (ne vraćaj null)
        if (!food) {
          console.warn(`⚠️ Namirnica "${c.food}" nije pronađena u lokalnoj bazi za Edamam mode, koristim placeholder`);
          return {
            food: {
              id: `missing-${c.food.toLowerCase().replace(/\s+/g, '-')}`,
              name: c.food,
              calories_per_100g: 0,
              protein_per_100g: 0,
              carbs_per_100g: 0,
              fat_per_100g: 0,
              category: 'ostalo',
              tags: [],
              allergens: null,
              usda_fdc_id: null,
              is_usda: false,
              default_serving_size_g: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              mealSlot: undefined,
            } as Food,
            grams: c.grams,
            units: undefined,
            foodName: c.food,
          };
        }
        
        // PRAVILO: Namirnica se UVJEK koristi, čak i ako je već korištena (samo logiraj)
        if (usedToday.has(food.id)) {
          console.warn(`⚠️ Namirnica "${c.food}" već korištena danas, ali i dalje je u jelu`);
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
      });

    // PRAVILO: NIKADA ne vraćaj null - koristi sve komponente (s 0 vrijednostima ako treba)
    // Formiraj tekst sastojaka za Edamam (samo ako ima komponenti)
    if (ingredientComponents.length > 0) {
      const ingredientText = ingredientComponents
        .map(c => `${c.grams}g ${c.foodName}`)
        .join(", ");

      // Dohvati podatke iz Edamam API-ja
      try {
        const edamamData = await analyzeNutritionFromText(ingredientText, selectedMeal.name);

        if (edamamData) {
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

          // Označi namirnice kao korištene (samo ako imaju valjane ID-ove)
          ingredientComponents.forEach(c => {
            if (c.food.id && !c.food.id.startsWith('missing-')) {
              usedToday.add(c.food.id);
            }
          });

          console.log(`✅ Edamam-only: ${selectedMeal.name} - ${calories.toFixed(0)} kcal, P: ${protein.toFixed(1)}g, C: ${carbs.toFixed(1)}g, F: ${fat.toFixed(1)}g`);
        } else {
          console.warn(`⚠️ Edamam API nije vratio podatke za ${selectedMeal.name}, koristim USDA mode`);
          // Nastavi s USDA mode-om ispod
        }
      } catch (error) {
        console.warn(`⚠️ Edamam API greška za ${selectedMeal.name}, koristim USDA mode:`, error);
        // Nastavi s USDA mode-om ispod
      }
    } else {
      console.warn(`⚠️ Nema komponenti za Edamam mode za ${selectedMeal.name}, koristim USDA mode`);
      // Nastavi s USDA mode-om ispod
    }
    
    // Ako je Edamam mode uspješno kreirao componentDetails, preskoči USDA mode
    if (componentDetails.length === 0) {
      // USDA MODE - koristi foods-database.ts SAMO za nutritivne vrijednosti
      // VAŽNO: meal_components.json je JEDINI izvor istine za sastojke
      
      // Provjeri ima li jelo fixedPortions flag (za gotova jela iz konzerve)
      const mealHasFixedPortions = (selectedMeal as any).fixedPortions === true;
      
      for (const c of selectedMeal.components) {
      // Preskoči vodu (voda nema nutritivne vrijednosti)
      if (c.food.toLowerCase().includes('water') || c.food.toLowerCase().includes('voda')) {
        continue;
      }
      
      // Koristi findNamirnica iz foods-database.ts SAMO za nutritivne vrijednosti
      const namirnica = findNamirnica(c.food);
      
      // PRAVILO: Ako namirnica ne postoji u foods-database, koristi 0 vrijednosti
      // Jelo se I DALJE prikazuje sa svim sastojcima iz meal_components.json
      let actualGrams = c.grams;
      let units: number | undefined;
      let displayText = '';
      let macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      let foodForDetails: Food;
      
      if (!namirnica) { 
        console.warn(`⚠️ Namirnica "${c.food}" nije pronađena u foods-database.ts za template "${selectedMeal.name}" - koristim 0 vrijednosti`);
        // Kreiraj placeholder Food objekt s 0 vrijednostima
        // Pronađi displayName iz originalne definicije ako postoji
        const originalComponent = selectedMeal.components.find(comp => comp.food === c.food);
        const displayName = (originalComponent as any)?.displayName || c.food;
        foodForDetails = {
          id: `missing-${c.food.toLowerCase().replace(/\s+/g, '-')}`,
          name: displayName,
          calories_per_100g: 0,
          protein_per_100g: 0,
          carbs_per_100g: 0,
          fat_per_100g: 0,
          category: 'ostalo',
          tags: [],
          allergens: null,
          usda_fdc_id: null,
          is_usda: false,
          default_serving_size_g: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          mealSlot: undefined,
        };
        displayText = `${displayName} (${actualGrams}g)`;
      } else {
        // Namirnica postoji - izračunaj makroe
        // Provjeri da li je namirnica već korištena (samo logiraj, ne preskači jelo)
        if (usedToday.has(namirnica.id)) {
          console.warn(`⚠️ Namirnica "${c.food}" već korištena danas, ali i dalje je u jelu`);
        }

        // Izračunaj makroe - koristi clampToPortionLimits i calculateMacrosForGrams
        // KRITIČNO: Koristi displayName iz meal_components.json ako postoji!
        // Inače "Ham" prikazuje "Pileća šunka" umjesto "Pršut"
        const originalDisplayName = (c as any).displayName;
        const foodNameToDisplay = originalDisplayName || namirnica.name;
        
        // Ako je jaja, koristi units
        if (c.food.toLowerCase().includes('egg')) {
          const gramsPerUnit = 60; // default 60g po jajetu
          units = Math.round(c.grams / gramsPerUnit);
          actualGrams = units * gramsPerUnit;
          displayText = `${foodNameToDisplay} (${units} kom ≈ ${actualGrams}g)`;
        } else {
          // Normalno s gramima - koristi clampToPortionLimits (OSIM za fixedPortions jela)
          actualGrams = mealHasFixedPortions ? c.grams : clampToPortionLimits(c.food, c.grams, userGoal);
          displayText = `${foodNameToDisplay} (${actualGrams}g)`;
        }

        // Koristi calculateMacrosForGramsWithFallback (s opcijskim Edamam fallback-om)
        macros = await calculateMacrosForGramsWithFallback(namirnica, actualGrams, c.food);
        
        // Spremi Food objekt za kompatibilnost (koristi namirnica podatke)
        foodForDetails = {
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
        
        // Dodaj u usedToday samo ako postoji (za praćenje varijacija)
        usedToday.add(namirnica.id);
      }
      
      // DODAJ SASTOJAK U JELO - UVJEK, čak i ako nema nutritivnih podataka
      calories += macros.calories;
      protein += macros.protein;
      carbs += macros.carbs;
      fat += macros.fat;
      
      // Pronađi originalni displayName iz meal_components.json
      const originalComponent = selectedMeal.components.find(comp => comp.food === c.food);
      const originalDisplayName = (originalComponent as any)?.displayName;
      
      componentDetails.push({ food: foodForDetails, grams: actualGrams, units, displayText, displayName: originalDisplayName });
      }
    }
  }

  // Debug logging za "Grčki jogurt s voćem i bademima"
  if (selectedMeal.name.toLowerCase().includes('grčki jogurt') && selectedMeal.name.toLowerCase().includes('voćem') && selectedMeal.name.toLowerCase().includes('badem')) {
    console.log(`🔍 DEBUG "Grčki jogurt s voćem i bademima":`);
    console.log(`   Originalne komponente iz JSON:`, selectedMeal.components.map(c => `${c.food} (${c.grams}g)`));
    console.log(`   componentDetails nakon obrade:`, componentDetails.map(c => `${c.food.name} (${c.grams}g) - ${c.displayText}`));
    if (missingFoods.length > 0) {
      console.log(`   ⚠️ Komponente bez nutritivnih podataka (koriste 0):`, missingFoods);
    }
  }

  // PRAVILO: NIKADA ne preskači jelo zbog nedostajućih namirnica
  // Sve komponente iz meal_components.json su već dodane (s 0 vrijednostima ako treba)
  // Jelo se UVIJEK prikazuje sa svim sastojcima

  // Izračunaj kalorije iz makroa (kao web generator: P×4 + UH×4 + M×9)
  const calculatedCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  if (calculatedCalories <= 0) {
    console.error(`❌ Template "${selectedMeal.name}" ima 0 kalorija nakon izračuna`);
    return null;
  }
  
  // Koristi izračunate kalorije (kao web generator)
  calories = calculatedCalories;

  // Provjeri ima li jelo fixedPortions flag (za gotova jela iz konzerve)
  const hasFixedPortions = (selectedMeal as any).fixedPortions === true;
  
  // Prilagodi kalorije prema targetu (OSIM za fixedPortions jela)
  // PROŠIRENO: Dozvoljen raspon 0.5-2.0 za točnije pogađanje ciljeva
  let factor = 1;
  if (!hasFixedPortions && slotTargetCalories > 0) {
    factor = slotTargetCalories / calories;
    factor = Math.max(0.5, Math.min(2.0, factor));
  }
  
  // Prilagodi gramaže faktorom i ponovno izračunaj makroe (OSIM za fixedPortions)
  let adjustedCalories = 0, adjustedProtein = 0, adjustedCarbs = 0, adjustedFat = 0;
  const adjustedComponentDetails = await Promise.all(componentDetails.map(async c => {
    const adjustedGrams = hasFixedPortions ? c.grams : clampToPortionLimits(c.food.name, c.grams * factor, userGoal);
    const namirnica = findNamirnica(c.food.name);
    if (!namirnica) return c;
    
    const macros = await calculateMacrosForGramsWithFallback(namirnica, adjustedGrams, c.food.name);
    adjustedCalories += macros.calories;
    adjustedProtein += macros.protein;
    adjustedCarbs += macros.carbs;
    adjustedFat += macros.fat;
    
    // KRITIČNO: Koristi displayName iz meal_components.json ako postoji!
    // Inače namirnica "Ham" prikazuje "Pileća šunka" umjesto "Pršut"
    const displayNameToUse = c.displayName || namirnica.name;
    
    return {
      ...c,
      grams: adjustedGrams,
      displayText: c.units 
        ? `${displayNameToUse} (${c.units} kom ≈ ${adjustedGrams}g)`
        : `${displayNameToUse} (${adjustedGrams}g)`,
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
  
  // CRITICAL FIX: Validate that description matches actual components
  // If components were modified (e.g., banana/milk removed), description should reflect that
  let finalDescription = originalDefinition?.description || '';
  let finalPreparationTip = originalDefinition?.preparationTip || '';
  
  // Check for mismatches between description and actual components
  const componentNamesLower = componentDetails.map(c => c.food.name.toLowerCase()).join(' ');
  const descLower = finalDescription.toLowerCase();
  
  // If description mentions ingredients that aren't in actual components, log warning
  const hasMismatch = 
    (descLower.includes('banana') && !componentNamesLower.includes('banana')) ||
    (descLower.includes('mlijeko') && !componentNamesLower.includes('mlijeko') && !componentNamesLower.includes('milk')) ||
    (descLower.includes('milk') && !componentNamesLower.includes('milk') && !componentNamesLower.includes('mlijeko')) ||
    (descLower.includes('voda') && !componentNamesLower.includes('voda') && !componentNamesLower.includes('water')) ||
    (descLower.includes('water') && !componentNamesLower.includes('water') && !componentNamesLower.includes('voda'));
  
  if (hasMismatch) {
    console.warn(`⚠️ Description mismatch detected for "${selectedMeal.name}": description mentions ingredients not in actual components. Description may be from template, but components were modified.`);
    // Optionally: Adjust description based on actual components (for future enhancement)
  }
  
  // Kreiraj osnovno jelo sa USDA podacima
  // FIX: Don't multiply by factor twice - calories/protein/carbs/fat are already adjusted above
  const baseMeal = {
    id: `composite-${slotKey}-${selectedMeal.name}`,
    type: "recipe" as const,
    name: selectedMeal.name,
    calories: Math.round(calories * 10) / 10, // Already adjusted, don't multiply by factor again
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
      tags: originalDefinition?.tags || ["composite"],
      goalTags: originalDefinition?.tags?.filter(t => ["lose", "maintain", "gain"].includes(t)) || [],
      dietTags: [],
      components: mealComponents,
      // Dodaj description i preparationTip iz originalne definicije (validirano gore)
      description: finalDescription,
      preparationTip: finalPreparationTip,
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
      // KRITIČNO: Koristi displayName ako postoji, inače food.name
      // Ovo osigurava da "Ham" prikazuje "Pršut" a ne "Pileća šunka/salama"
      foodName: c.displayName || translateFoodName(c.food.name),
      name: c.displayName || translateFoodName(c.food.name), // Za kompatibilnost
      grams: c.grams, // Already adjusted above, don't multiply by factor again
      units: c.units,
      displayText: c.displayText,
      displayName: c.displayName
    })),
    // Dodaj description i preparationTip direktno na jelo (za mobilnu aplikaciju) - validirano gore
    description: finalDescription,
    preparationTip: finalPreparationTip,
  } as ScoredMeal & { 
    componentsString?: string; 
    componentDetails?: Array<{ foodName: string; grams: number; units?: number; displayText: string; displayName?: string }>;
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
  
  // CACHE CHECK: Provjeri je li ovaj obrok već validiran
  const cacheKey = getMealCacheKey(meal.name, ingredientText);
  const cachedResult = validatedMealsCache.get(cacheKey);
  if (cachedResult) {
    // Koristi cached rezultate (bez API poziva)
    meal.calories = cachedResult.calories;
    meal.protein = cachedResult.protein;
    meal.carbs = cachedResult.carbs;
    meal.fat = cachedResult.fat;
    // console.log(`   📦 Cache HIT za ${meal.name}`); // Debug log
    return meal;
  }
  // console.log(`   🌐 Cache MISS za ${meal.name} - pozivam Edamam API`); // Debug log
  
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
            // KRITIČNO: Koristi displayName ako postoji, inače foodName
            displayText: `${c.displayName || c.foodName} (${Math.round(c.grams * calorieScale * 10) / 10}g)`
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
      
      // CACHE STORE: Spremi rezultate u cache za buduće korištenje
      validatedMealsCache.set(cacheKey, {
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
      });
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
  
  // ONEMOGUĆENO: Ne koristimo CSV podatke - samo lokalna baza foods-database.ts
  // Ako food ima podatke, vrati ih direktno
  if (food.calories_per_100g && food.calories_per_100g > 0) {
    return {
      calories: food.calories_per_100g,
      protein: food.protein_per_100g || 0,
      carbs: food.carbs_per_100g || 0,
      fats: food.fat_per_100g || 0,
    };
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
  // POBOLJŠANO V2: Veći prioritet proteinima i ugljikohidratima
  const macroPenalty =
    macroDeviation.calories * 0.20 +
    macroDeviation.protein * 0.40 +
    macroDeviation.carbs * 0.30 +
    macroDeviation.fat * 0.10;

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
 * Provjeri da li je doručak slatki (smoothie, puding, jogurt) ili slani
 */
function isSweetBreakfast(breakfastName: string, breakfastTags?: string[]): boolean {
  const nameLower = breakfastName.toLowerCase();
  const tags = (breakfastTags || []).map(t => t.toLowerCase());
  
  // Slatki indikatori
  const sweetKeywords = [
    'smoothie', 'puding', 'pudding', 'chia puding',
    'zobene', 'oats', 'grčki jogurt', 'jogurt', 'skyr',
    'banana bread', 'proteinski muffini', 'whey',
    'slatki', 'sweet'
  ];
  
  // Provjeri naziv
  if (sweetKeywords.some(keyword => nameLower.includes(keyword))) {
    return true;
  }
  
  // Provjeri tagove
  if (tags.some(tag => tag === 'sweet' || tag === 'liquid' || tag === 'healthy-dessert')) {
    return true;
  }
  
  // Ako sadrži jaja, tost, sendvič, omlet - to je slano
  const savoryKeywords = ['jaja', 'eggs', 'tost', 'toast', 'sendvič', 'sandwich', 'omlet', 'kajgana'];
  if (savoryKeywords.some(keyword => nameLower.includes(keyword))) {
    return false;
  }
  
  // Default: ako nema jasnih indikatora, pretpostavi da je slano
  return false;
}

/**
 * Provjeri da li je doručak kombinacija (slano + slatko)
 */
function isCombinedBreakfast(breakfastName: string, breakfastTags?: string[]): boolean {
  const nameLower = breakfastName.toLowerCase();
  const tags = (breakfastTags || []).map(t => t.toLowerCase());
  
  // Kombinacija: jaja + zobene, tost sendvič + chia puding, itd.
  const combinedPatterns = [
    'jaja + zobene', 'jaja+zobene',
    'omlet + zobene', 'omlet+zobene',
    'tost sendvič', 'tost sendvic',
    'zobene + banana' // Ako ima jaja i zobene zajedno
  ];
  
  // Provjeri direktne kombinacije
  if (combinedPatterns.some(pattern => nameLower.includes(pattern))) {
    return true;
  }
  
  // Kombinacija je kada ima i slatke i slane elemente u nazivu
  const hasSweet = nameLower.includes('zobene') || nameLower.includes('puding') || 
                   nameLower.includes('jogurt') || nameLower.includes('chia');
  const hasSavory = (nameLower.includes('jaja') || nameLower.includes('tost') || 
                     nameLower.includes('omlet') || nameLower.includes('sendvič') ||
                     nameLower.includes('kajgana'));
  
  // Ako ima i slatke i slane elemente, to je kombinacija
  return hasSweet && hasSavory;
}

/**
 * Odredi preferirani tip breakfasta za dan na temelju prethodnih dana
 * Rotacija: slatki -> slani -> kombinacija -> slatki -> ...
 */
function getPreferredBreakfastType(
  dayIndex: number,
  previousTypes: Array<'sweet' | 'savory' | 'combined'>
): 'sweet' | 'savory' | 'combined' | null {
  // Prvi dan: može biti bilo što
  if (dayIndex === 0) {
    return null;
  }
  
  // Ako nema prethodnih tipova, ne forsiraj ništa
  if (previousTypes.length === 0) {
    return null;
  }
  
  const lastType = previousTypes[previousTypes.length - 1];
  
  // Rotacija: slatki -> slani -> kombinacija -> slatki -> ...
  switch (lastType) {
    case 'sweet':
      // Nakon slatkog, preferiraj slani
      return 'savory';
    case 'savory':
      // Nakon slanog, preferiraj kombinaciju
      return 'combined';
    case 'combined':
      // Nakon kombinacije, preferiraj slatki
      return 'sweet';
    default:
      return null;
  }
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
  const MAX_ITERATIONS = 200; // Povećano za preciznije skaliranje
  const CALORIE_TOLERANCE = 10; // ±10 kcal (strože za preciznije rezultate)
  const MACRO_TOLERANCE = 0.015; // ±1.5% (strože)
  
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

    // POBOLJŠANO: INTELIGENTNO SKALIRANJE PO KATEGORIJAMA
    // Širi raspon za točnije pogađanje ciljeva
    const isLargeDeviation = calDiff > 200; // Snižen prag za agresivnije skaliranje
    const proteinScale = isLargeDeviation 
      ? Math.max(0.3, Math.min(2.5, proteinFactor))  // Agresivnije za velika odstupanja
      : Math.max(0.4, Math.min(2.0, proteinFactor));
    const carbsScale = isLargeDeviation
      ? Math.max(0.3, Math.min(2.5, carbsFactor))    // Agresivnije za velika odstupanja
      : Math.max(0.5, Math.min(2.0, carbsFactor));
    const fatScale = isLargeDeviation
      ? Math.max(0.3, Math.min(2.5, fatFactor))     // Agresivnije za velika odstupanja
      : Math.max(0.4, Math.min(2.0, fatFactor));

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

    // 0. ONEMOGUĆENO: Ne koristimo CSV - svi podaci dolaze iz foods-database.ts
    console.log("✅ Koristim lokalnu bazu podataka (foods-database.ts)");

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

      // ⚠️ ONEMOGUĆENO: Koristimo samo meal_components.json, ne Supabase recipes
      // const relevantRecipes = await getRelevantRecipes(...); // ONEMOGUĆENO
      const relevantRecipes: Recipe[] = []; // Prazan array - koristimo samo JSON

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

      // Edamam validacija s cachingom - isti obrok se validira samo jednom
      const validatedMeal = await validateAndCorrectMealWithEdamam(selectedMeal);
      selectedMeals.push(validatedMeal);

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

    // 4.5 NOVO: Završno balansiranje porcija za smanjenje devijacije
    const balancedMeals = balanceMealPortions(selectedMeals, {
      calories: calculations.target_calories,
      protein: calculations.protein_grams,
      carbs: calculations.carbs_grams,
      fat: calculations.fats_grams,
    });

    // 5. Izračunaj ukupne makroe (koristi balansirane obroke)
    const totalCalories = balancedMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const totalProtein = balancedMeals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCarbs = balancedMeals.reduce((sum, meal) => sum + meal.carbs, 0);
    const totalFat = balancedMeals.reduce((sum, meal) => sum + meal.fat, 0);

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

    // 7. Vrati plan (koristi balansirane obroke)
    const plan: ProDailyMealPlan = {
      date: new Date().toISOString().split("T")[0],
      clientId: userId,
      breakfast: balancedMeals[0],
      lunch: balancedMeals[1],
      dinner: balancedMeals[2],
      snack: balancedMeals[3],
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

    // 0. ONEMOGUĆENO: Ne koristimo CSV - svi podaci dolaze iz foods-database.ts
    console.log("✅ Koristim lokalnu bazu podataka (foods-database.ts)");

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

  // AUTOMATSKO ODREĐIVANJE BROJA OBROKA NA TEMELJU KALORIJA
  // Cilj: max ~600 kcal po obroku za realne porcije
  // 
  // < 1600 kcal: 4 obroka (400 kcal/obrok)
  // 1600-2200 kcal: 5 obroka (320-440 kcal/obrok)
  // 2200-2800 kcal: 6 obroka (367-467 kcal/obrok)
  // > 2800 kcal: 7 obroka (400-500 kcal/obrok)
  
  const targetCalories = directCalculations.targetCalories;
  let mealsPerDay: number;
  
  if (targetCalories < 1600) {
    mealsPerDay = 4;
  } else if (targetCalories < 2200) {
    mealsPerDay = 5;
  } else if (targetCalories < 2800) {
    mealsPerDay = 6;
  } else {
    mealsPerDay = 7;
  }
  
  // GAIN mode: minimalno 6 obroka (više manjih obroka za lakšu probavu)
  if (directCalculations.goalType === "gain" && mealsPerDay < 6) {
    mealsPerDay = 6;
    console.log(`🍽️ GAIN MODE: Povećan broj obroka na minimum 6`);
  }
  
  // LOSE mode: maksimalno 5 obroka (veći obroci za veću sitost)
  if (directCalculations.goalType === "lose" && mealsPerDay > 5) {
    mealsPerDay = 5;
    console.log(`🎯 LOSE MODE: Smanjen broj obroka na maximum 5 (veća sitost)`);
  }
  
  console.log(`🍽️ Automatski odabrano ${mealsPerDay} obroka za ${targetCalories} kcal/dan (${Math.round(targetCalories/mealsPerDay)} kcal/obrok)`);
  

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
    // CSV inicijalizacija uklonjena - koristimo lokalnu bazu (meal_components.json + foods-database.ts)

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

    // ONEMOGUĆENO: Ne koristimo CSV/Supabase foods - svi podaci dolaze iz meal_components.json + foods-database.ts
    const allFoods: Food[] = [];
    console.log("✅ Koristim lokalnu bazu (meal_components.json + foods-database.ts)");

    // Generiraj plan za svaki dan (7 dana)
    console.log("📅 Počinjem generiranje plana za 7 dana...");
    const slots = getSlotsForMealsPerDay(mealsPerDay);
    const days: WeeklyDay[] = [];
    
    const usedMealsThisWeek: Map<string, Set<string>> = new Map();
    const previousDayMeals: Map<string, MealOption | null> = new Map();
    // Praćenje korištenih breakfast ID-ova kroz tjedan za varijaciju
    const usedBreakfastIds = new Set<string>();
    // Praćenje tipa breakfasta (slatki/slani/kombinacija) za rotaciju kroz tjedan
    const breakfastTypes: Array<'sweet' | 'savory' | 'combined'> = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      // console.log(`📅 Generiranje plana za dan ${i + 1}/7 (${dateStr})...`); // Onemogućeno za brzinu

      try {
        const usedToday = new Set<string>();
        const dayMeals: Record<string, ScoredMeal> = {};
        
        const previousMealsInDay: MealOption[] = [];
        const usedFoodFamiliesInDay = new Set<string>(); // Praćenje korištenih food families u danu
        let previousMealOption: MealOption | null = null;

        // Postavi preferirani tip breakfasta za ovaj dan PRIJE generiranja
        const preferredBreakfastType = getPreferredBreakfastType(i, breakfastTypes);
        (global as any).preferredBreakfastType = preferredBreakfastType || null;

        // Praćenje glavnih namirnica korištenih u uzastopnim obrocima (sprječava ponavljanje)
        const usedMainIngredientsThisDay = new Set<string>();
        
        for (const slot of slots) {
          const slotTargetCalories = targetCalories / mealsPerDay;
          let minIngredients = 2;
          if (slot === "breakfast" || slot === "lunch" || slot === "dinner") {
            minIngredients = 3;
          }

          const slotKeyForTracking = slot === "extraSnack" ? "snack" : (slot as "breakfast" | "lunch" | "dinner" | "snack");
          const previousDayMealForSlot = previousDayMeals.get(slot) || null;
          const usedMealsForSlot = usedMealsThisWeek.get(slotKeyForTracking) || new Set<string>();
          
          // Za breakfast: isključi već korištene breakfast ID-ove kroz tjedan (varijacija)
          let excludedBreakfastNames = new Set<string>();
          if (slot === "breakfast") {
            // Dodaj sve već korištene breakfast nazive u excludedMealNames
            excludedBreakfastNames = new Set(usedBreakfastIds);
          }
          
          // Pronađi prethodni obrok (ako postoji) da provjerimo glavne namirnice
          let previousMealOptionForVariety: MealOption | null = null;
          if (previousMealsInDay.length > 0) {
            previousMealOptionForVariety = previousMealsInDay[previousMealsInDay.length - 1];
          }
          
          // Resetiraj preferredBreakfastType nakon breakfast slot-a
          if (slot !== "breakfast") {
            (global as any).preferredBreakfastType = null;
          }
          
          // Za snack: odredi hoće li biti slatki ili slani na temelju breakfasta
          // Napomena: breakfast je uvijek prvi slot, tako da će biti dostupan u dayMeals
          let preferredSnackType: 'sweet' | 'savory' | null = null;
          if ((slot === "snack" || slot === "extraSnack")) {
            // Provjeri je li breakfast već generiran
            if (dayMeals["breakfast"]) {
              const breakfast = dayMeals["breakfast"];
              // Pronađi originalnu definiciju za tagove
              const breakfastDefinitions = MEAL_COMPONENTS["breakfast"] || [];
              const breakfastDef = breakfastDefinitions.find(d => {
                const originalName = breakfast.name.split(" - ")[0];
                return d.name === originalName;
              });
              const breakfastTags = breakfastDef?.tags || (breakfast as any).meta?.tags || [];
              const breakfastIsSweet = isSweetBreakfast(breakfast.name, breakfastTags);
              // Ako je breakfast slatki, snack treba biti slani i obrnuto
              preferredSnackType = breakfastIsSweet ? 'savory' : 'sweet';
            }
          }
          
          // Retry logika - pokušaj generirati obrok sve dok ne uspije
          let composite: ScoredMeal | null = null;
          let retryCount = 0;
          const maxRetries = 2; // Smanjeno s 5 na 2 za brzinu
          let excludedMealNames = new Set<string>();
          // Za breakfast: dodaj već korištene breakfast nazive
          if (slot === "breakfast") {
            excludedMealNames = new Set(excludedBreakfastNames);
          }
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
              parsedPreferences,
              preferredSnackType // Dodaj preferirani tip snacka
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
              composite = await generateFallbackMeal(slot, slotTargetCalories, allFoods, usedToday, userGoal, usedFoodFamiliesInDay);
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
            // Edamam validacija s cachingom
            const validatedComposite = await validateAndCorrectMealWithEdamam(composite);
            dayMeals[slot] = validatedComposite;
            
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
                
                // Označi food families kao korištene
                for (const comp of matchedMeal.components) {
                  markFamilyAsUsed(comp.food, usedFoodFamiliesInDay);
                }
                usedMealsThisWeek.set(slotKeyForTracking, usedMealsForSlot);
                
                // Za breakfast: dodaj ID u usedBreakfastIds za varijaciju kroz tjedan
                if (slot === "breakfast" && matchedMeal.id) {
                  usedBreakfastIds.add(matchedMeal.id);
                  // Također zapamti tip breakfasta za rotaciju kroz tjedan
                  const breakfastIsSweet = isSweetBreakfast(
                    mealOption.name,
                    matchedMeal.tags || []
                  );
                  const breakfastIsCombined = isCombinedBreakfast(
                    mealOption.name,
                    matchedMeal.tags || []
                  );
                  
                  if (breakfastIsCombined) {
                    breakfastTypes.push('combined');
                  } else if (breakfastIsSweet) {
                    breakfastTypes.push('sweet');
                  } else {
                    breakfastTypes.push('savory');
                  }
                }
                
                // Dodaj glavne namirnice iz ovog obroka u usedMainIngredientsThisDay
                // da se ne ponavljaju u uzastopnim obrocima
                mealOption.components.forEach(comp => {
                  const mainIng = getMainIngredient(comp.food);
                  // Dodaj samo glavne namirnice (tuna, chicken, itd.), ne sve
                  const mainIngredients = ['tuna', 'chicken', 'turkey', 'salmon', 'beef', 'pork', 'eggs'];
                  if (mainIngredients.includes(mainIng)) {
                    usedMainIngredientsThisDay.add(mainIng);
                  }
                });
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
          // KRITIČNO: Koristi food.id za lookup, ne food.name (hrvatski naziv)
          // findNamirnica očekuje engleski ključ ili ID, ne hrvatski naziv
          const components = (meal as any).componentDetails?.map((c: any) => ({
            name: c.displayName || c.foodName || c.name || '',
            food: c.food?.id || c.food?.name || '', // Koristi ID za lookup
            foodKey: c.food?.id || '', // Spremi originalni ID za lookup
            grams: c.grams || 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          })) || [];
          
          // Izračunaj makroe za komponente
          const mealComponents = await Promise.all(components.map(async (comp: any) => {
            const namirnica = findNamirnica(comp.foodKey || comp.food);
            if (!namirnica) return comp;
            const macros = calculateMacrosForGrams(namirnica, comp.grams);
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
        // Ponovno računaj kalorije iz makronutrijenata za konzistentnost
        const recalculatedCalories = Math.round(total.protein * 4 + total.carbs * 4 + total.fat * 9);
        total.calories = recalculatedCalories;
        
        const calDiff = Math.abs(total.calories - targetCalories);
        if (calDiff > 30) { // Ako je razlika veća od 30 kcal, primijeni dodatno skaliranje
          // Koristi faktor skaliranja koji osigurava da se postigne target
          const scaleFactor = targetCalories / total.calories;
          
          // POBOLJŠANO: Agresivnije skaliranje za točnije pogađanje ciljeva
          let limitedFactor;
          if (calDiff > 300) {
            // Za jako velika odstupanja, dozvoli najširi raspon
            limitedFactor = scaleFactor > 1
              ? Math.max(1.0, Math.min(2.0, scaleFactor))  // Povećanje: 1.0x - 2.0x
              : Math.max(0.50, Math.min(1.0, scaleFactor)); // Smanjenje: 0.50x - 1.0x
          } else if (calDiff > 200) {
            // Za velika odstupanja, dozvoli širi raspon
            limitedFactor = scaleFactor > 1
              ? Math.max(1.0, Math.min(1.8, scaleFactor))  // Povećanje: 1.0x - 1.8x
              : Math.max(0.60, Math.min(1.0, scaleFactor)); // Smanjenje: 0.60x - 1.0x
          } else if (calDiff > 100) {
            limitedFactor = scaleFactor > 1
              ? Math.max(1.0, Math.min(1.6, scaleFactor))  // Povećanje: 1.0x - 1.6x
              : Math.max(0.70, Math.min(1.0, scaleFactor)); // Smanjenje: 0.70x - 1.0x
          } else {
            limitedFactor = scaleFactor > 1
              ? Math.max(1.0, Math.min(1.4, scaleFactor))  // Povećanje: 1.0x - 1.4x
              : Math.max(0.80, Math.min(1.0, scaleFactor)); // Smanjenje: 0.80x - 1.0x
          }
          
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
                // KRITIČNO: Koristi displayName ako postoji
                displayText: `${comp.displayName || comp.foodName || comp.name} (${newGrams}g)`,
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
        const isDevFinal = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
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
        
        // Ako postoji odstupanje, primijeni finalni scaling (agresivnije za veća odstupanja)
        // POBOLJŠANO: Ponavljaj dok odstupanje ne bude < 20 kcal (strože) s više iteracija
        let finalTotalCaloriesIterative = finalTotalCalories;
        let iterations = 0;
        const maxScalingIterations = 15; // Više iteracija za bolju konvergenciju (povećano s 8 na 15)
        const TARGET_TOLERANCE = 20; // Smanjeno s 30 na 20 kcal za strožu toleranciju
        
        while (finalTotalCaloriesIterative > 0 && Math.abs(finalTotalCaloriesIterative - targetCalories) > TARGET_TOLERANCE && iterations < maxScalingIterations) {
          iterations++;
          const diff = finalTotalCaloriesIterative - targetCalories;
          const finalScaleFactor = targetCalories / finalTotalCaloriesIterative;
          
          // POBOLJŠANO: Agresivnije skaliranje za točnije pogađanje ciljeva
          // Ako je diff > 500, dozvoli najširi raspon (0.40-2.50) - za velika odstupanja
          // Ako je diff > 300, dozvoli širi raspon (0.50-2.00)
          // Ako je diff > 200, dozvoli širi raspon (0.60-1.70)
          // Ako je diff > 100, koristi 0.70-1.50
          // Inače, koristi 0.80-1.30
          let minFactor, maxFactor;
          if (Math.abs(diff) > 500) {
            minFactor = 0.40;
            maxFactor = 2.50; // Najširi raspon za velika odstupanja (npr. 1000 kcal)
          } else if (Math.abs(diff) > 300) {
            minFactor = 0.50;
            maxFactor = 2.00;
          } else if (Math.abs(diff) > 200) {
            minFactor = 0.60;
            maxFactor = 1.70;
          } else if (Math.abs(diff) > 100) {
            minFactor = 0.70;
            maxFactor = 1.50;
          } else {
            minFactor = 0.80;
            maxFactor = 1.30;
          }
          
          const limitedFinalFactor = Math.max(minFactor, Math.min(maxFactor, finalScaleFactor));
          
          // DEV only logging
          if (iterations === 1) {
            const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
            if (isDev) {
              console.log(`\n🔧 FINAL SCALING PASS (Dan ${i + 1}/7):`);
              console.log(`   targetCalories: ${targetCalories}`);
              console.log(`   finalTotalCaloriesBefore: ${Math.round(finalTotalCaloriesIterative)}`);
              console.log(`   diff: ${Math.round(diff)} kcal`);
            }
          }
          
          // Skaliraj samo količine (grams) obroka za taj dan
          const finalScaledMeals: Record<string, ScoredMeal> = {};
          const mealCaloriesAfter: Record<string, number> = {};
          
          // Pronađi najveći obrok (po kalorijama) za eventualnu dodatnu korekciju
          let largestMealSlot = '';
          let largestMealCalories = 0;
          for (const slot of slots) {
            const meal = scaledDayMeals[slot];
            if (!meal) continue;
            const mealCals = mealCaloriesBefore[slot] || 0;
            if (mealCals > largestMealCalories) {
              largestMealCalories = mealCals;
              largestMealSlot = slot;
            }
          }
          
          // Izračunaj ostatak korekcije ako je clamping aktiviran
          const scaledTotalCalories = finalTotalCaloriesIterative * limitedFinalFactor;
          const remainingCorrection = scaledTotalCalories - targetCalories;
          // Ako je razlika > 20 kcal nakon skaliranja, primijeni dodatnu korekciju (smanjeno s 30 na 20)
          const needsExtraCorrection = Math.abs(remainingCorrection) > TARGET_TOLERANCE;
          
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
                // Širi raspon za extra correction ako je potrebno veliko skaliranje
                const extraMinFactor = Math.abs(remainingCorrection) > 100 ? 0.85 : 0.9;
                const extraMaxFactor = Math.abs(remainingCorrection) > 100 ? 1.15 : 1.1;
                extraFactor = Math.max(extraMinFactor, Math.min(extraMaxFactor, extraFactor));
                if (isDevFinal) {
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
                // KRITIČNO: Koristi displayName ako postoji
                displayText: `${comp.displayName || comp.foodName || comp.name} (${finalGrams}g)`,
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
          
          // Ažuriraj scaledDayMeals s finalno skaliranim vrijednostima
          Object.assign(scaledDayMeals, finalScaledMeals);
          
          // Ažuriraj mealCaloriesBefore za sljedeću iteraciju
          for (const slot of slots) {
            if (mealCaloriesAfter[slot] !== undefined) {
              mealCaloriesBefore[slot] = mealCaloriesAfter[slot];
            }
          }
          
          // Ponovno izračunaj total za sljedeću iteraciju
          const recalculatedTotal = sumMealMacros(scaledDayMeals);
          finalTotalCaloriesIterative = recalculatedTotal.calories;
          
          // DEV only logging
          if (isDevFinal) {
            const currentDiff = finalTotalCaloriesIterative - targetCalories;
            console.log(`   Po obroku (iteracija ${iterations}):`);
            for (const slot of slots) {
              const meal = scaledDayMeals[slot];
              if (!meal) continue;
              const mealName = meal.name || slot;
              const caloriesAfter = Math.round(mealCaloriesAfter[slot] || 0);
              console.log(`     ${mealName}: ${caloriesAfter} kcal`);
            }
            console.log(`   Trenutni diff: ${Math.round(currentDiff)} kcal`);
          }
        }
        
        // Finalno izračunaj total nakon iterativnog skaliranja
        const finalRecalculatedTotal = sumMealMacros(scaledDayMeals);
        const finalDiff = finalRecalculatedTotal.calories - targetCalories;
        
        // DEV only logging - finalni diff
        if (isDevFinal) {
          console.log(`   ✅ Finalni diff nakon iterativnog skaliranja: ${Math.round(finalDiff)} kcal\n`);
        }
        
        Object.assign(total, finalRecalculatedTotal);
        
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
  try {
    console.log(`🔍 [generateProDailyMealPlanWithWeeklyContext] Počinjem za ${userId}, datum: ${date}`);
    
    // CSV inicijalizacija uklonjena - koristimo lokalnu bazu

    // 1. Dohvati korisničke kalkulacije
    console.log(`🔍 [generateProDailyMealPlanWithWeeklyContext] Dohvaćam kalkulacije za ${userId}...`);
    const calculations = await getClientCalculations(userId);
    if (!calculations) {
      throw new Error(`Nisu pronađene kalkulacije za korisnika ${userId}`);
    }
    console.log(`✅ [generateProDailyMealPlanWithWeeklyContext] Kalkulacije dohvaćene: ${calculations.target_calories} kcal`);

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
    // ⚠️ KORISTIMO SAMO meal_components.json, NE SUPABASE RECIPES!
    // buildCompositeMealForSlot koristi MEAL_COMPONENTS iz JSON-a
    console.log(`🔍 [generateProDailyMealPlanWithWeeklyContext] Generiranje ${slot.name} (${slot.id}) - target: ${slot.targetCalories} kcal...`);
    
    // Parsiraj preferences u format koji web generator koristi
    const dislikedFoodsStr = Array.isArray(preferences.disliked_foods) 
      ? preferences.disliked_foods.join(', ') 
      : (preferences.disliked_foods || '');
    const dietaryRestrictionsStr = Array.isArray(preferences.dietary_restrictions)
      ? preferences.dietary_restrictions.join(', ')
      : (preferences.dietary_restrictions || '');
    
    const parsedPreferences = {
      avoidIngredients: dislikedFoodsStr 
        ? dislikedFoodsStr.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
        : [],
      preferredIngredients: dietaryRestrictionsStr
        ? dietaryRestrictionsStr.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
        : []
    };
    
    // Dohvati allFoods iz Supabase (ili koristi prazan array ako nije potrebno)
    // buildCompositeMealForSlot koristi meal_components.json direktno, tako da allFoods može biti prazan
    let allFoods: Food[] = [];
    try {
      allFoods = await getRelevantFoods(
        slot.id as "breakfast" | "lunch" | "dinner" | "snack",
        preferences,
        slot.targetProtein
      );
    } catch (foodsError) {
      console.warn(`⚠️ Greška pri dohvaćanju allFoods za ${slot.name}, koristim prazan array:`, foodsError);
      allFoods = [];
    }
    
    // Pronađi već korištene jela za ovaj slot (za weekly variety)
    // recipeUsageCount je Map<string, number> - broj koliko puta je jelo korišteno
    const excludedMealNames = new Set<string>(); // Možemo dodati logiku za excluded names ako je potrebno
    const usedMealsForSlot = new Set<string>(); // buildCompositeMealForSlot koristi Set<string>
    
    // Koristi buildCompositeMealForSlot direktno (koristi JSON)
    let composite: ScoredMeal | null = null;
    try {
      composite = await buildCompositeMealForSlot(
        slot.id as MealSlotType,
        allFoods,
        new Set(), // usedToday - možemo dodati tracking ako je potrebno
        slot.targetCalories,
        null, // previousMeal
        [], // previousMeals
        2, // minIngredients
        usedMealsForSlot,
        null, // previousDayMeal
        excludedMealNames,
        calculations.goal_type as GoalType,
        parsedPreferences,
        null // preferredSnackType
      );
    } catch (buildError) {
      console.error(`❌ [generateProDailyMealPlanWithWeeklyContext] Greška pri generiranju ${slot.name} iz buildCompositeMealForSlot:`, buildError);
      console.error(`   Slot ID: ${slot.id}, Target calories: ${slot.targetCalories}`);
      console.error(`   Error details:`, buildError instanceof Error ? buildError.stack : buildError);
      throw new Error(`Greška pri generiranju ${slot.name}: ${buildError instanceof Error ? buildError.message : String(buildError)}`);
    }
    
    if (!composite) {
      throw new Error(`Nije moguće generirati ${slot.name} iz meal_components.json - buildCompositeMealForSlot je vratio null`);
    }
    
    selectedMeals.push(composite);

    // Ažuriraj recipeUsageCount (Map<string, number>)
    if (composite.id) {
      const currentCount = recipeUsageCount.get(composite.id) || 0;
      recipeUsageCount.set(composite.id, currentCount + 1);
    }

    // Dodaj glavni protein (iz componentDetails ili meta.components)
    let mainProtein: string | null = null;
    const compositeAny = composite as any;
    const componentsList = compositeAny.componentDetails || compositeAny.meta?.components || [];
    if (componentsList && Array.isArray(componentsList)) {
      const componentNames = componentsList.map((c: any) => {
        const name = c.foodName || c.name || c.food?.name || c.food || "";
        return name.toLowerCase();
      }).join(" ");
      const proteinKeywords = ["chicken", "beef", "fish", "pork", "turkey", "tuna", "salmon", "egg", "piletina", "junetina", "jaja"];
      for (const keyword of proteinKeywords) {
        if (componentNames.includes(keyword)) {
          mainProtein = keyword;
          break;
        }
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

    console.log(`✅ [generateProDailyMealPlanWithWeeklyContext] Plan generiran za ${date}`);
    
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
  } catch (error) {
    console.error(`❌ [generateProDailyMealPlanWithWeeklyContext] Greška za ${userId}, datum: ${date}:`, error);
    console.error(`   Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
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
// Funkcije su već eksportirane kao named exports (export async function)
// Nema potrebe za dodatnim export statementom


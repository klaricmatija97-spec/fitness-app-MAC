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
import type {
  Recipe,
  Food,
  MealCandidate,
  ScoredMeal,
  MealSlot,
} from "../db/models";

const supabase = createServiceClient();

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
 * Build composite meal for a slot from meal_components.json using quality selection
 */
function buildCompositeMealForSlot(
  slot: MealSlotType,
  allFoods: Food[],
  usedToday: Set<string>,
  slotTargetCalories: number,
  previousMeal: MealOption | null = null,
  previousMeals: MealOption[] = [],
  minIngredients: number = 2,
  usedMealsThisWeek: Set<string> | null = null,
  previousDayMeal: MealOption | null = null,
  excludedMealNames: Set<string> = new Set(), // Dodaj parametar za isključene obroke
  userGoal: GoalType = "maintain" // Cilj korisnika (lose/maintain/gain)
): ScoredMeal | null {
  // extraSnack koristi snack šablone
  const slotKey = slot === "extraSnack" ? "snack" : (slot as "breakfast" | "lunch" | "dinner" | "snack");
  
  // Filtriraj obroke prema cilju korisnika
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
  let mealOptions: MealOption[] = definitions
    .map(convertToMealOption)
    .filter(opt => !excludedMealNames.has(opt.name));

  // NOVO: Filtriraj obroke koji imaju iste GLAVNE namirnice kao prethodni obroci danas
  // Glavne namirnice su: proteini (jaja, jogurt, piletina, tuna, itd.) i ugljikohidrati (riža, tjestenina, kruh)
  const mainIngredientKeywords = [
    'egg', 'jaja', 'yogurt', 'jogurt', 'chicken', 'piletina', 'tuna', 'salmon', 'losos',
    'beef', 'junetina', 'turkey', 'puretina', 'cottage', 'skyr', 'whey', 'protein',
    'rice', 'riža', 'pasta', 'tjestenina', 'bread', 'kruh', 'toast', 'oats', 'zobene',
    'banana', 'avocado', 'avokado', 'greek yogurt', 'grčki jogurt'
  ];
  
  // NOVO: Stilovi jela koji se ne smiju ponavljati u istom danu
  const mealStyleKeywords: Record<string, string[]> = {
    'rižot': ['rižot', 'risotto'],
    'gulaš': ['gulaš', 'goulash'],
    'varivo': ['varivo', 'stew'],
    'salata': ['salata', 'salad'],
    'smoothie': ['smoothie', 'shake'],
    'bowl': ['bowl', 'zdjela'],
    'wrap': ['wrap', 'tortilla'],
    'sendvič': ['sendvič', 'sandwich', 'toast'],
    'juha': ['juha', 'soup'],
    'tjestenina': ['tjestenina', 'pasta', 'špageti', 'spaghetti'],
    'burger': ['burger', 'hamburger'],
    'pizza': ['pizza'],
    'palačinke': ['palačinke', 'pancake'],
    'omlette': ['omlet', 'omelette', 'fritata'],
    'pečeno': ['pečen', 'roasted', 'baked'],
  };
  
  // Izvuci glavne namirnice iz prethodnih obroka danas
  const usedMainIngredientsToday = new Set<string>();
  for (const prevMeal of previousMeals) {
    for (const comp of prevMeal.components) {
      const foodLower = comp.food.toLowerCase();
      for (const keyword of mainIngredientKeywords) {
        if (foodLower.includes(keyword)) {
          usedMainIngredientsToday.add(keyword);
        }
      }
    }
  }
  
  // Filtriraj obroke koji koriste iste glavne namirnice
  if (usedMainIngredientsToday.size > 0) {
    const beforeFilter = mealOptions.length;
    mealOptions = mealOptions.filter(option => {
      for (const comp of option.components) {
        const foodLower = comp.food.toLowerCase();
        for (const usedIngredient of usedMainIngredientsToday) {
          if (foodLower.includes(usedIngredient)) {
            // Ova namirnica je već korištena danas - isključi ovaj obrok
            return false;
          }
        }
      }
      return true;
    });
    
    // Ako smo previše suzili izbor, popusti pravilo (ali logiraj upozorenje)
    if (mealOptions.length === 0) {
      console.warn(`⚠️ Svi obroci za ${slot} imaju namirnice koje su već korištene danas, popuštam pravilo...`);
      mealOptions = definitions.map(convertToMealOption).filter(opt => !excludedMealNames.has(opt.name));
    } else if (mealOptions.length < beforeFilter) {
      console.log(`   🔄 Filtrirano ${beforeFilter - mealOptions.length} obroka zbog ponavljanja namirnica (ostalo: ${mealOptions.length})`);
    }
  }
  
  // NOVO: Filtriraj obroke istog STILA (npr. dva rižota u istom danu)
  const usedMealStyles = new Set<string>();
  for (const prevMeal of previousMeals) {
    const mealNameLower = prevMeal.name.toLowerCase();
    for (const [style, keywords] of Object.entries(mealStyleKeywords)) {
      for (const keyword of keywords) {
        if (mealNameLower.includes(keyword)) {
          usedMealStyles.add(style);
          break;
        }
      }
    }
  }
  
  // Filtriraj obroke koji su istog stila kao prethodni obroci danas
  if (usedMealStyles.size > 0) {
    const beforeStyleFilter = mealOptions.length;
    mealOptions = mealOptions.filter(option => {
      const optionNameLower = option.name.toLowerCase();
      for (const usedStyle of usedMealStyles) {
        const styleKeywords = mealStyleKeywords[usedStyle];
        if (styleKeywords) {
          for (const keyword of styleKeywords) {
            if (optionNameLower.includes(keyword)) {
              // Ovaj obrok je istog stila kao neki prethodni - isključi ga
              return false;
            }
          }
        }
      }
      return true;
    });
    
    // Ako smo previše suzili izbor, popusti pravilo
    if (mealOptions.length === 0) {
      console.warn(`⚠️ Svi obroci za ${slot} su istog stila kao prethodni obroci danas, popuštam pravilo...`);
      // Vrati opcije samo bez ponavljanja namirnica
      mealOptions = definitions.map(convertToMealOption).filter(opt => {
        if (excludedMealNames.has(opt.name)) return false;
        // Zadrži filtriranje namirnica
        for (const comp of opt.components) {
          const foodLower = comp.food.toLowerCase();
          for (const usedIngredient of usedMainIngredientsToday) {
            if (foodLower.includes(usedIngredient)) return false;
          }
        }
        return true;
      });
      // Ako i dalje nema, vrati sve
      if (mealOptions.length === 0) {
        mealOptions = definitions.map(convertToMealOption).filter(opt => !excludedMealNames.has(opt.name));
      }
    } else if (mealOptions.length < beforeStyleFilter) {
      console.log(`   🎨 Filtrirano ${beforeStyleFilter - mealOptions.length} obroka zbog istog stila (ostalo: ${mealOptions.length})`);
    }
  }

  // VALIDACIJA: Za snack, filtriraj template-e koji ne zadovoljavaju uvjete
  if (slot === "snack" || slot === "extraSnack") {
    mealOptions = mealOptions.filter(option => {
      const validation = isValidSnackTemplate(option, allFoods);
      if (!validation.valid) {
        console.log(`⚠️ Snack template "${option.name}" ne zadovoljava uvjete (kcal: ${validation.calories.toFixed(0)}, protein: ${validation.protein.toFixed(1)}g, sports: ${validation.hasSportsIngredient})`);
      }
      return validation.valid;
    });
  }

  // VALIDACIJA: Za lunch/dinner, provjeri da nije samo povrće
  if (slot === "lunch" || slot === "dinner") {
    mealOptions = mealOptions.filter(option => {
      const validation = isValidLunchDinnerTemplate(option, allFoods);
      if (!validation.valid) {
        console.log(`⚠️ Lunch/Dinner template "${option.name}" ima premalo kalorija iz ne-povrća (${validation.calories.toFixed(0)} kcal)`);
      }
      return validation.valid;
    });
  }

  // Filtriraj obroke koji su već korišteni u prethodnom danu (da se ne ponavljaju dva dana zaredom)
  if (previousDayMeal) {
    mealOptions = mealOptions.filter(option => option.name !== previousDayMeal.name);
  }

  // Filtriraj obroke koji su već korišteni ovaj tjedan (za raznolikost)
  if (usedMealsThisWeek && usedMealsThisWeek.size > 0) {
    mealOptions = mealOptions.filter(option => !usedMealsThisWeek.has(option.name));
  }

  // Ako smo se previše suzili, popusti pravilo za tjedan (ali ne za prethodni dan)
  if (mealOptions.length === 0 && previousDayMeal) {
    mealOptions = definitions.map(convertToMealOption).filter(option => option.name !== previousDayMeal.name);
    
    // Ponovno validiraj
    if (slot === "snack" || slot === "extraSnack") {
      mealOptions = mealOptions.filter(option => isValidSnackTemplate(option, allFoods).valid);
    }
    if (slot === "lunch" || slot === "dinner") {
      mealOptions = mealOptions.filter(option => isValidLunchDinnerTemplate(option, allFoods).valid);
    }
  }

  // Ako i dalje nema opcija nakon validacije, popusti validaciju (ali zadrži blacklist)
  if (mealOptions.length === 0 && (slot === "snack" || slot === "extraSnack")) {
    console.warn(`⚠️ Nema valjanih snack template-a, pokušavam s popuštenom validacijom...`);
    mealOptions = definitions.map(convertToMealOption).filter(option => {
      // Zadrži blacklist provjeru
      const hasBlacklisted = option.components.some(c => {
        const foodLower = c.food.toLowerCase();
        return SNACK_BLACKLIST.some(blacklisted => foodLower.includes(blacklisted));
      });
      if (hasBlacklisted) return false;
      
      // Popusti validaciju - samo provjeri da ima sportski sastojak i dovoljno kalorija
      const validation = isValidSnackTemplate(option, allFoods);
      return validation.calories >= 80 && validation.hasSportsIngredient;
    });
  }

  // Koristi pickNextMeal za kvalitetan odabir
  const selectedMeal = pickNextMeal(mealOptions, previousMeal, previousMeals, minIngredients);
  if (!selectedMeal) {
    console.error(`❌ Nema dostupnih meal opcija za ${slot} nakon svih validacija`);
    return null;
  }

  // Provjeri da li su sve namirnice dostupne i izračunaj makroe
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  let missing = false;
  const componentDetails: Array<{ food: Food; grams: number; units?: number; displayText: string }> = [];
  const missingFoods: string[] = [];

  for (const c of selectedMeal.components) {
    // Preskoči vodu
    if (c.food.toLowerCase().includes('water') || c.food.toLowerCase().includes('voda')) {
      continue;
    }
    
    const food = findFoodByName(allFoods, c.food);
    if (!food) { 
      console.warn(`⚠️ Namirnica "${c.food}" nije pronađena u bazi za template "${selectedMeal.name}"`);
      missingFoods.push(c.food);
      missing = true; 
      // Ako nedostaje bilo koja komponenta, template nije validan - preskoči ga
      break;
    }

    // Provjeri da li je namirnica već korištena (osim ako je to dozvoljeno)
    if (usedToday.has(food.id)) {
      console.warn(`⚠️ Namirnica "${c.food}" već korištena danas, preskačem obrok`);
      missing = true;
      break;
    }

    // Izračunaj makroe - koristi units/gramsPerUnit ako postoji (npr. za jaja)
    let actualGrams = c.grams;
    let units: number | undefined;
    let displayText = '';
    
    // Ako je jaja i ima units property, koristi units
    if (c.food.toLowerCase().includes('egg') && (food as any).units && (food as any).gramsPerUnit) {
      const gramsPerUnit = (food as any).gramsPerUnit || 60; // default 60g po jajetu
      units = Math.round(c.grams / gramsPerUnit);
      actualGrams = units * gramsPerUnit;
      const foodName = translateFoodName(food.name);
      displayText = `${foodName} (${units} kom ≈ ${actualGrams}g)`;
    } else {
      // Normalno s gramima
      actualGrams = c.grams;
      const foodName = translateFoodName(food.name);
      displayText = `${foodName} (${actualGrams}g)`;
    }

    const ratio = actualGrams / 100;
    calories += (food.calories_per_100g || 0) * ratio;
    protein += (food.protein_per_100g || 0) * ratio;
    carbs += (food.carbs_per_100g || 0) * ratio;
    fat += (food.fat_per_100g || 0) * ratio;

    componentDetails.push({ food, grams: actualGrams, units, displayText });
    usedToday.add(food.id);
  }

  // Ako nedostaje BILO KOJA komponenta, preskoči template i pokušaj s drugim
  if (missing && missingFoods.length > 0) {
    console.warn(`❌ Template "${selectedMeal.name}" ima nedostajuće komponente: ${missingFoods.join(", ")}`);
    // Pokušaj s drugim template-om - dodaj u excludedMealNames i pozovi ponovno
    const newExcluded = new Set(excludedMealNames);
    newExcluded.add(selectedMeal.name);
    
    // Ako nismo iscrpili sve opcije, pokušaj ponovno
    if (newExcluded.size < definitions.length) {
      return buildCompositeMealForSlot(
        slot, allFoods, usedToday, slotTargetCalories, 
        previousMeal, previousMeals, minIngredients, usedMealsThisWeek, previousDayMeal, newExcluded, userGoal
      );
    }
    // Ako smo iscrpili sve opcije, vrati null (NE baci exception)
    console.error(`❌ Svi template-i za ${slot} imaju nedostajuće komponente`);
    return null;
  }

  if (calories <= 0) {
    console.error(`❌ Template "${selectedMeal.name}" ima 0 kalorija nakon izračuna`);
    return null;
  }

  // Prilagodi kalorije prema targetu (ali zadrži originalne grams vrijednosti)
  let factor = slotTargetCalories > 0 ? slotTargetCalories / calories : 1;
  factor = Math.max(0.7, Math.min(1.3, factor));

  // Kreiraj detaljan naziv s gramažama za svaku namirnicu (bez vode)
  const componentsWithGrams = componentDetails.map(c => c.displayText).join(", ");

  // Spremi komponente u name kao dodatni string za parsiranje u UI
  const componentsString = componentDetails.map(c => c.displayText).join(", ");

  return {
    id: `composite-${slotKey}-${selectedMeal.name}`,
    type: "recipe" as const,
    name: selectedMeal.name, // Koristi samo meal.name
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
      tags: ["composite"],
      goalTags: [],
      dietTags: []
    },
    score: 0.8,
    scoreBreakdown: {
      calorieMatch: 0.8,
      macroMatch: 0.8,
      healthBonus: 0.5,
      varietyPenalty: 0,
      total: 0.8
    },
    // Dodaj komponente kao dodatno polje (ne u meta)
    componentsString: componentsString,
    componentDetails: componentDetails.map(c => ({
      foodName: translateFoodName(c.food.name),
      grams: c.grams,
      units: c.units,
      displayText: c.displayText
    }))
  } as ScoredMeal & { componentsString?: string; componentDetails?: Array<{ foodName: string; grams: number; units?: number; displayText: string }> };
}

/**
 * Kreiraj MealCandidate iz namirnice
 */
function createMealCandidateFromFood(
  food: Food,
  quantity: number,
  targetCalories?: number
): MealCandidate {
  // Provjeri da li namirnica ima valjane vrijednosti
  if (!food.calories_per_100g || food.calories_per_100g <= 0) {
    // Ako nema kalorija, postavi default vrijednosti ili koristi minimalne
    console.warn(`⚠️ Namirnica ${food.name} nema kalorija, koristim minimalne vrijednosti`);
  }
  
  // Ako je naveden targetCalories, prilagodi quantity
  if (targetCalories && targetCalories > 0 && food.calories_per_100g > 0) {
    const caloriesPer100g = food.calories_per_100g;
    if (caloriesPer100g > 0) {
      quantity = Math.round((targetCalories / caloriesPer100g) * 100 * 10) / 10;
    }
  }

  const ratio = quantity / 100;
  // Prevedi naziv namirnice na hrvatski
  const translatedName = translateFoodName(food.name);
  
  return {
    id: food.id,
    type: "food",
    name: translatedName,
    calories: Math.round(food.calories_per_100g * ratio * 10) / 10,
    protein: Math.round(food.protein_per_100g * ratio * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * ratio * 10) / 10,
    fat: Math.round(food.fat_per_100g * ratio * 10) / 10,
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
            createMealCandidateFromFood(food, food.default_serving_size_g || 100, slot.targetCalories)
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

      selectedMeals.push(selectedMeal);

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

    // 3. Postavi week start date (ponedjeljak)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = nedjelja, 1 = ponedjeljak, ...
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split("T")[0];

    // 4. Mapa za praćenje ponavljanja recepata u tjednu
    const recipeUsageCount = new Map<string, number>(); // recipeId -> count

    // 5. Odredi mealsPerDay iz opcija ili default 5
    const mealsPerDay = options?.mealsPerDay || 5;
    const targetCalories = options?.targetCalories || calculations.target_calories;
    const targetProtein = options?.targetProtein || calculations.protein_grams;
    const targetCarbs = options?.targetCarbs || calculations.carbs_grams;
    const targetFat = options?.targetFat || calculations.fats_grams;

    // Odredi cilj korisnika za filtriranje obroka
    const userGoal: GoalType = calculations.goal_type || "maintain";

    console.log(`📊 Generiranje plana sa ${mealsPerDay} obroka dnevno`);
    console.log(`📊 Target: ${targetCalories} kcal, P: ${targetProtein}g, C: ${targetCarbs}g, F: ${targetFat}g`);
    console.log(`🎯 Cilj korisnika: ${userGoal}`);

    // 6. Dohvati sve namirnice (foods) jednom za sve dane
    console.log("📋 Dohvaćanje svih namirnica...");
    let allFoods: Food[] = [];
    try {
      // Pokušaj učitati iz CSV-a
      await initializeCSVData();
      const csvFoods = await getAllFoodsWithMacros(10000); // Dohvati do 10000 namirnica
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
        mealSlot: undefined, // CSV namirnice nemaju mealSlot, ali će biti filtrirane po slotu
      })) as Food[];
      
      // Filtrirati namirnice sa 0 kalorija ili nedostajućim vrijednostima
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
      
      console.log(`✅ Dohvaćeno ${allFoods.length} valjanih namirnica iz CSV-a`);
    } catch (csvError) {
      console.warn("⚠️ Greška pri dohvatu CSV podataka, koristim Supabase:", csvError);
      // Fallback na Supabase
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

    // 7. Generiraj plan za svaki dan (7 dana) koristeći novu logiku
    console.log("📅 Počinjem generiranje plana za 7 dana...");
    const slots = getSlotsForMealsPerDay(mealsPerDay);
    const days: WeeklyDay[] = [];
    
    // Praćenje korištenih obroka kroz tjedan (da se ne ponavljaju dva dana zaredom)
    const usedMealsThisWeek: Map<string, Set<string>> = new Map(); // slot -> Set<mealName>
    const previousDayMeals: Map<string, MealOption | null> = new Map(); // slot -> previous day meal

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      console.log(`📅 Generiranje plana za dan ${i + 1}/7 (${dateStr})...`);

      try {
        const usedToday = new Set<string>(); // Set za praćenje korištenih namirnica taj dan
        const dayMeals: Record<string, ScoredMeal> = {};
        
        // Praćenje prethodnih obroka za kvalitetan odabir
        const previousMealsInDay: MealOption[] = [];
        let previousMealOption: MealOption | null = null;

        // Generiraj obrok za svaki slot
        for (const slot of slots) {
          // Izračunaj target kalorije za slot (jednostavna distribucija)
          const slotTargetCalories = targetCalories / mealsPerDay;

          // Odredi minimalan broj sastojaka po slotu
          let minIngredients = 2; // default za snack
          if (slot === "breakfast" || slot === "lunch" || slot === "dinner") {
            minIngredients = 3; // glavni obroci moraju imati min 3 sastojka
          }

          // PRIORITET: Koristi SAMO composite meal iz meal_components.json
          const slotKeyForTracking = slot === "extraSnack" ? "snack" : (slot as "breakfast" | "lunch" | "dinner" | "snack");
          const previousDayMealForSlot = previousDayMeals.get(slot) || null;
          const usedMealsForSlot = usedMealsThisWeek.get(slotKeyForTracking) || new Set<string>();
          
          const composite = buildCompositeMealForSlot(
            slot, 
            allFoods, 
            usedToday, 
            slotTargetCalories,
            previousMealOption,
            previousMealsInDay,
            minIngredients,
            usedMealsForSlot,
            previousDayMealForSlot,
            new Set(), // excludedMealNames
            userGoal
          );
          
          if (composite) {
            dayMeals[slot] = composite;
            
            // Ažuriraj praćenje prethodnih obroka
            const definitions = MEAL_COMPONENTS[slotKeyForTracking];
            if (definitions) {
              // Pronađi originalni naziv obroka (bez gramaža)
              const originalName = composite.name.split(" - ")[0];
              const matchedMeal = definitions.find(d => d.name === originalName);
              if (matchedMeal) {
                const mealOption = convertToMealOption(matchedMeal);
                previousMealsInDay.push(mealOption);
                previousMealOption = mealOption;
                
                // Spremi za sljedeći dan
                previousDayMeals.set(slot, mealOption);
                usedMealsForSlot.add(mealOption.name);
                usedMealsThisWeek.set(slotKeyForTracking, usedMealsForSlot);
              }
            }
            
            console.log(`   ✅ ${MEAL_SLOT_LABELS[slot]}: ${composite.name} (composite, ${minIngredients}+ sastojaka)`);
            continue;
          }

          // NIKADA ne koristi single ingredient foods - samo composite meals iz meal_components.json
          // NIKADA ne koristi fallback - ako nema composite meal, preskoči slot
          if (!composite) {
            console.error(`❌ Nema dostupnih composite meals za ${slot} u meal_components.json, preskačem...`);
            // NE baci grešku - samo preskoči slot i nastavi dalje
            continue;
          }
        }

        // Zbroji makroe iz svih obroka
        const total = sumMealMacros(dayMeals);

        // Izračunaj devijaciju
        const target = {
          calories: targetCalories,
          protein: targetProtein,
          carbs: targetCarbs,
          fat: targetFat,
        };
        const deviation = calculateDailyDeviation(target, total);

        // Kreiraj WeeklyDay format
        const weeklyDay: WeeklyDay = {
          date: dateStr,
          meals: {
            breakfast: dayMeals.breakfast!,
            lunch: dayMeals.lunch!,
            dinner: dayMeals.dinner!,
            snack: dayMeals.snack ?? dayMeals.extraSnack!,
            extraSnack: dayMeals.extraSnack,
          },
          total: {
            ...total,
            deviation,
          },
        };

        days.push(weeklyDay);
        console.log(`✅ Dan ${i + 1}/7 generiran: ${total.calories.toFixed(0)} kcal (dev: ${deviation.total}%)`);
      } catch (dayError) {
        console.error(`❌ Greška pri generiranju plana za dan ${i + 1}/7 (${dateStr}):`, dayError);
        const errorMessage = dayError instanceof Error ? dayError.message : 'Nepoznata greška';
        throw new Error(`Greška pri generiranju plana za dan ${i + 1}/7: ${errorMessage}`);
      }
    }

    // 6. Izračunaj weekly average (prosjek makroa po danu)
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

    // 7. Izračunaj deviation weeklyAverage-a u odnosu na target makroe
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
    };

    console.log("\n✅ PRO tjedni plan generiran!\n");
    console.log("📊 Tjedni rezime:");
    console.log(
      `   Prosječne kalorije: ${weeklyAverage.calories.toFixed(0)} / ${calculations.target_calories.toFixed(0)} (dev: ${targetDeviation.calories}%)`
    );
    console.log(
      `   Prosječni proteini: ${weeklyAverage.protein.toFixed(1)}g / ${calculations.protein_grams.toFixed(1)}g (dev: ${targetDeviation.protein}%)`
    );
    console.log(
      `   Prosječni ugljikohidrati: ${weeklyAverage.carbs.toFixed(1)}g / ${calculations.carbs_grams.toFixed(1)}g (dev: ${targetDeviation.carbs}%)`
    );
    console.log(
      `   Prosječne masti: ${weeklyAverage.fat.toFixed(1)}g / ${calculations.fats_grams.toFixed(1)}g (dev: ${targetDeviation.fat}%)`
    );
    console.log(`\n   📉 Prosječno ukupno odstupanje: ${targetDeviation.total}% (niže = bolje)`);
    console.log(`   📊 Recepti korišteni: ${recipeUsageCount.size} različitih (max ${maxSameRecipePerWeek}x po receptu)`);
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
          createMealCandidateFromFood(food, food.default_serving_size_g || 100, slot.targetCalories)
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
  saveWeeklyProMealPlanToSupabase,
};


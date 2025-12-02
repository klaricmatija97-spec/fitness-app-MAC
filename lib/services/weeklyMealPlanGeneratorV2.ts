/**
 * TJEDNI PLAN PREHRANE - PROFESIONALNI GENERATOR
 * 
 * Po uzoru na najbolje generatore:
 * - Iterativno skaliranje dok makroi nisu unutar ±5% (max ±10%)
 * - Strogi tracking jela (nikad duplikati unutar dana, maksimalna različitost kroz tjedan)
 * - Točne kalorije u skladu s kalkulatorom
 * - Kalorijske granice po obroku
 * - clampToPortionLimits() za realistične porcije
 */

import { createServiceClient } from "../supabase";
import mealComponentsData from "../data/meal_components.json";
import { findNamirnica, calculateMacrosForGrams, type Namirnica } from "../data/foods-database";
import { chooseBestMeal, type Meal } from "./scoring";

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
  id?: string;
  name: string;
  description: string;
  image?: string;
  preparationTip?: string;
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
  // Originalne komponente iz baze (za kasnije skaliranje)
  _originalComponents?: Array<{
    food: string;
    grams: number;
    displayName: string;
  }>;
}

interface DailyPlan {
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

interface UserPreferences {
  avoidIngredients: string[];
  preferredIngredients: string[];
  desiredMealsPerDay: 3 | 5 | 6;
}

// ============================================
// OGRANIČENJA KALORIJA PO OBROKU
// ============================================
// FLEKSIBILNA OGRANIČENJA - prioritet je postizanje točnog dnevnog targeta!
// Ako je potrebno, obroci mogu biti veći/manji da se postigne točan target

const MEAL_CALORIE_LIMITS: Record<string, { min: number; max: number }> = {
  breakfast: { min: 150, max: 1200 },  // Povećano za fleksibilnost
  snack: { min: 50, max: 600 },          // Povećano za fleksibilnost
  snack1: { min: 50, max: 600 },
  snack2: { min: 50, max: 600 },
  snack3: { min: 50, max: 600 },
  lunch: { min: 300, max: 1500 },       // Povećano za fleksibilnost
  dinner: { min: 300, max: 1200 },     // Povećano za fleksibilnost
};

// ============================================
// PORTION LIMITS
// ============================================

const PORTION_LIMITS: Record<string, { min: number; max: number }> = {
  // ISPRAVNI LIMITI - maksimalna porcija bilo koje namirnice
  // Proteini: max 250g, Carbs: max 180g, Fat: max 40g
  // Minimalna porcija: 20g za sve kategorije
  
  // Proteini - max 250g
  "chicken_breast": { min: 20, max: 250 },
  "Chicken breast": { min: 20, max: 250 },
  "turkey_breast": { min: 20, max: 250 },
  "Turkey breast": { min: 20, max: 250 },
  "beef_lean": { min: 20, max: 250 },
  "Beef": { min: 20, max: 250 },
  "salmon": { min: 20, max: 250 },
  "Salmon": { min: 20, max: 250 },
  "tuna_canned": { min: 20, max: 250 },
  "tuna": { min: 20, max: 250 },
  "Tuna": { min: 20, max: 250 },
  "hake": { min: 20, max: 250 },
  "Hake": { min: 20, max: 250 },
  "egg_whole": { min: 20, max: 250 },
  "Egg": { min: 20, max: 250 },
  "egg_white": { min: 20, max: 250 },
  "Egg white": { min: 20, max: 250 },
  
  // Ugljikohidrati - max 180g
  "oats": { min: 20, max: 180 },
  "Oats": { min: 20, max: 180 },
  "rice_cooked": { min: 20, max: 180 },
  "rice": { min: 20, max: 180 },
  "Rice": { min: 20, max: 180 },
  "pasta_cooked": { min: 20, max: 180 },
  "Pasta cooked": { min: 20, max: 180 },
  "Pasta": { min: 20, max: 180 },
  "potato_boiled": { min: 20, max: 180 },
  "potatoes": { min: 20, max: 180 },
  "Potatoes": { min: 20, max: 180 },
  "buckwheat_cooked": { min: 20, max: 180 },
  "Buckwheat": { min: 20, max: 180 },
  "couscous_cooked": { min: 20, max: 180 },
  "Couscous": { min: 20, max: 180 },
  "toast": { min: 20, max: 180 },
  "Toast": { min: 20, max: 180 },
  "rice_crackers": { min: 20, max: 180 },
  "Rice crackers": { min: 20, max: 180 },
  
  // Masti - max 40g
  "avocado": { min: 20, max: 40 },
  "Avocado": { min: 20, max: 40 },
  "peanut_butter": { min: 5, max: 40 },
  "Peanut butter": { min: 5, max: 40 },
  "olive_oil": { min: 3, max: 40 },
  "Olive oil": { min: 3, max: 40 },
  "olives": { min: 20, max: 40 },
  "Olives": { min: 20, max: 40 },
  
  // Mliječni - ovisno o dominantnom makronutrijentu
  "greek_yogurt": { min: 20, max: 250 }, // visok protein
  "Greek yogurt": { min: 20, max: 250 },
  "cottage_cheese": { min: 20, max: 250 }, // visok protein
  "Cottage cheese": { min: 20, max: 250 },
  "milk_low_fat": { min: 20, max: 180 }, // carbs
  "milk": { min: 20, max: 180 },
  "Milk": { min: 20, max: 180 },
  "skyr": { min: 20, max: 250 }, // visok protein
  "Skyr": { min: 20, max: 250 },
  "sour_cream": { min: 20, max: 40 }, // fat
  "Sour cream": { min: 20, max: 40 },
  
  // Voće - carbs (max 180g)
  "banana": { min: 20, max: 180 },
  "Banana": { min: 20, max: 180 },
  "apple": { min: 20, max: 180 },
  "Apple": { min: 20, max: 180 },
  "blueberries": { min: 20, max: 180 },
  "Blueberries": { min: 20, max: 180 },
  "frozen_cherries": { min: 20, max: 180 },
  "FrozenCherries": { min: 20, max: 180 },
  
  // Povrće - niska kalorijska gustoća (max 200g)
  "broccoli": { min: 20, max: 200 },
  "Broccoli": { min: 20, max: 200 },
  "carrot": { min: 20, max: 200 },
  "Carrot": { min: 20, max: 200 },
  "cucumber": { min: 20, max: 200 },
  "Cucumber": { min: 20, max: 200 },
  "lettuce": { min: 20, max: 200 },
  "Lettuce": { min: 20, max: 200 },
  "tomato": { min: 20, max: 200 },
  "Tomato": { min: 20, max: 200 },
  "corn": { min: 20, max: 180 },
  "Corn": { min: 20, max: 180 },
  
  // Whey protein - max 50g (obično 25-30g po obroku)
  "whey_protein": { min: 10, max: 50 },
  "Whey": { min: 10, max: 50 },
  "Whey protein": { min: 10, max: 50 },
  
  // Default - konzervativno
  "default": { min: 20, max: 200 },
};

function getPortionLimits(foodKey: string): { min: number; max: number } {
  const namirnica = findNamirnica(foodKey);
  if (!namirnica) {
    return PORTION_LIMITS["default"];
  }
  
  // Pokušaj pronaći po id
  const byId = PORTION_LIMITS[namirnica.id];
  if (byId) return byId;
  
  // Pokušaj pronaći po imenu (hrvatski)
  const byName = PORTION_LIMITS[namirnica.name];
  if (byName) return byName;
  
  // Pokušaj pronaći po engleskom imenu
  const byNameEn = PORTION_LIMITS[namirnica.nameEn];
  if (byNameEn) return byNameEn;
  
  // Ako nije pronađeno, koristi kategoriju za određivanje limita
  // Proteini: max 250g, Carbs: max 180g, Fat: max 40g, Vegetable: max 200g, Fruit: max 180g
  if (namirnica.category === 'protein') {
    return { min: 20, max: 250 };
  } else if (namirnica.category === 'carb') {
    return { min: 20, max: 180 };
  } else if (namirnica.category === 'fat') {
    return { min: 20, max: 40 };
  } else if (namirnica.category === 'vegetable') {
    return { min: 20, max: 200 };
  } else if (namirnica.category === 'fruit') {
    return { min: 20, max: 180 };
  } else if (namirnica.category === 'dairy') {
    // Mliječni - provjeri dominantni makro
    if (namirnica.proteinPer100g > 8) {
      return { min: 20, max: 250 }; // visok protein
    } else {
      return { min: 20, max: 180 }; // carbs
    }
  }
  
  return PORTION_LIMITS["default"];
}

function clampToPortionLimits(foodKey: string, grams: number): number {
  const limits = getPortionLimits(foodKey);
  // PRO RAZINA - dozvoli veće odstupanja ako je potrebno za postizanje targeta
  // Minimum je obavezan (realistične porcije), ali maksimum je fleksibilan
  const clamped = Math.max(limits.min, Math.min(limits.max * 1.5, Math.round(grams / 5) * 5));
  return clamped;
}

// ============================================
// POMOĆNE FUNKCIJE
// ============================================

/**
 * Dohvati korisničke kalkulacije iz Supabase (NIKAD ne računa - samo čita!)
 * Ovo su TOČNE vrijednosti iz kalkulatora koje generator MORA pratiti!
 */
async function getUserCalculations(userId: string): Promise<UserCalculations> {
  const { data, error } = await supabase
    .from("client_calculations")
    .select("*")
    .eq("client_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Nema kalkulacija u bazi. Molimo prvo izračunajte kalkulacije.");
  }

  // Parsiraj NUMERIC tipove iz Supabase (mogu biti string, number ili Decimal)
  const parseNumeric = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    // Decimal tip
    if (value && typeof value === 'object' && 'toNumber' in value) {
      return value.toNumber();
    }
    return 0;
  };

  const targetCalories = parseNumeric(data.target_calories);
  const targetProtein = parseNumeric(data.protein_grams);
  const targetCarbs = parseNumeric(data.carbs_grams);
  const targetFat = parseNumeric(data.fats_grams);
  const bmr = parseNumeric(data.bmr);
  const tdee = parseNumeric(data.tdee);

  // Validacija - provjeri da li su vrijednosti valjane
  if (targetCalories <= 0 || targetProtein <= 0 || targetCarbs <= 0 || targetFat <= 0) {
    throw new Error(`Nevaljane kalkulacije u bazi: ${targetCalories} kcal, P: ${targetProtein}g, C: ${targetCarbs}g, F: ${targetFat}g`);
  }

  console.log(`📊 ČITAM IZ KALKULATORA: ${targetCalories} kcal, P: ${targetProtein}g, C: ${targetCarbs}g, F: ${targetFat}g`);

  // KORISTI TOČNE VRIJEDNOSTI IZ KALKULATORA - minimalno zaokruživanje
  // Zaokruži samo na 1 decimalu za makroe, kalorije na cijeli broj
  return {
    targetCalories: Math.round(targetCalories), // Kalorije su cijeli brojevi
    targetProtein: Math.round(targetProtein * 10) / 10, // 1 decimala
    targetCarbs: Math.round(targetCarbs * 10) / 10, // 1 decimala
    targetFat: Math.round(targetFat * 10) / 10, // 1 decimala
    goalType: (data.goal_type as "lose" | "maintain" | "gain") || "maintain",
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}

/**
 * Parsira korisničke preferencije iz allergies polja
 */
function parseUserPreferences(allergiesText: string | null | undefined): UserPreferences {
  const preferences: UserPreferences = {
    avoidIngredients: [],
    preferredIngredients: [],
    desiredMealsPerDay: 5, // Default: 5 obroka
  };

  if (!allergiesText) return preferences;

  const lowerText = allergiesText.toLowerCase();

  // Parsiraj alergije
  const alergijeMatch = lowerText.match(/(?:alergije|alergičan|intolerancija)[:;]?\s*(.+?)(?:\.|ne\s+želim|preferiram|obroci|$)/i);
  if (alergijeMatch) {
    const alergijeArray = alergijeMatch[1].split(/[,;]/).map(a => a.trim()).filter(Boolean);
    preferences.avoidIngredients.push(...alergijeArray);
  }

  // Parsiraj "ne želim"
  const neZelimMatch = lowerText.match(/(?:ne\s+želim|izbjegavam|ne\s+volim)[:;]?\s*(.+?)(?:\.|preferiram|obroci|$)/i);
  if (neZelimMatch) {
    const avoidArray = neZelimMatch[1].split(/[,;]/).map(a => a.trim()).filter(Boolean);
    preferences.avoidIngredients.push(...avoidArray);
  }

  // Parsiraj "preferiram"
  const preferiramMatch = lowerText.match(/(?:preferiram|volim|želim)[:;]?\s*(.+?)(?:\.|obroci|$)/i);
  if (preferiramMatch) {
    const prefArray = preferiramMatch[1].split(/[,;]/).map(p => p.trim()).filter(Boolean);
    preferences.preferredIngredients.push(...prefArray);
  }

  // Parsiraj broj obroka (3, 5 ili 6)
  const obrociMatch = lowerText.match(/(?:obroci|meals)[:;]?\s*([356])/i);
  if (obrociMatch) {
    const numMeals = parseInt(obrociMatch[1]);
    if (numMeals === 3 || numMeals === 5 || numMeals === 6) {
      preferences.desiredMealsPerDay = numMeals as 3 | 5 | 6;
    }
  }

  // Ako nema eksplicitnih oznaka, tretiraj sve kao izbjegavane
  if (!alergijeMatch && !neZelimMatch && !preferiramMatch && !obrociMatch) {
    const allItems = allergiesText.split(/[,;]/).map(a => a.trim()).filter(Boolean);
    preferences.avoidIngredients.push(...allItems);
  }

  return preferences;
}

/**
 * Provjeri da li obrok sadrži izbjegavane namirnice
 */
function hasAvoidedIngredient(meal: CompositeMeal, avoidIngredients: string[]): boolean {
  if (avoidIngredients.length === 0) return false;

  const mealIngredients = meal.components.map(c => c.food.toLowerCase());
  const avoidLower = avoidIngredients.map(a => a.toLowerCase());

  return mealIngredients.some(ing => {
    return avoidLower.some(avoid => ing.includes(avoid) || avoid.includes(ing));
  });
}

/**
 * Provjeri da li obrok sadrži preferirane namirnice
 */
function hasPreferredIngredient(meal: CompositeMeal, preferredIngredients: string[]): boolean {
  if (preferredIngredients.length === 0) return false;

  const mealIngredients = meal.components.map(c => c.food.toLowerCase()).join(" ");
  const prefLower = preferredIngredients.map(p => p.toLowerCase());

  return prefLower.some(pref => mealIngredients.includes(pref));
}

/**
 * Izvuci glavne proteine iz jela (za tracking variety)
 */
function getMainProteins(meal: CompositeMeal): string[] {
  const proteinFoods = [
    'chicken', 'beef', 'turkey', 'salmon', 'tuna', 'hake', 'egg', 'cottage', 'greek', 'skyr'
  ];
  
  const mainProteins: string[] = [];
  const mealFoods = meal.components.map(c => c.food.toLowerCase());
  
  for (const food of mealFoods) {
    for (const protein of proteinFoods) {
      if (food.includes(protein) || protein.includes(food)) {
        mainProteins.push(protein);
        break;
      }
    }
  }
  
  return mainProteins;
}

/**
 * Provjeri da li jelo koristi iste glavne proteine kao prethodni dan
 */
function hasSameMainProteins(meal: CompositeMeal, previousMainProteins: string[]): boolean {
  if (previousMainProteins.length === 0) return false;
  
  const currentMainProteins = getMainProteins(meal);
  if (currentMainProteins.length === 0) return false;
  
  // Provjeri da li postoji preklapanje glavnih proteina
  return currentMainProteins.some(protein => previousMainProteins.includes(protein));
}

/**
 * Izračunaj makroe za komponente (ČITA iz foods-database, ne računa!)
 */
function calculateMealMacros(components: MealComponent[], scaleFactor: number = 1): GeneratedMeal["components"] {
  return components.map(comp => {
    const namirnica = findNamirnica(comp.food);
    if (!namirnica) {
      return {
        name: comp.displayName || comp.food,
        grams: Math.round(comp.grams * scaleFactor / 5) * 5,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    const scaledGrams = clampToPortionLimits(comp.food, comp.grams * scaleFactor);
    const macros = calculateMacrosForGrams(namirnica, scaledGrams);

    return {
      name: comp.displayName || comp.food,
      grams: scaledGrams,
      calories: Math.round(macros.calories),
      protein: Math.round(macros.protein * 10) / 10,
      carbs: Math.round(macros.carbs * 10) / 10,
      fat: Math.round(macros.fat * 10) / 10,
    };
  });
}

/**
 * Izračunaj ukupne makroe za obrok
 * KALORIJE SE UVIJEK RAČUNAJU IZ MAKROA: protein*4 + carbs*4 + fat*9
 */
function calculateMealTotals(components: GeneratedMeal["components"]): GeneratedMeal["totals"] {
  const totals = components.reduce(
    (acc, comp) => ({
      protein: acc.protein + comp.protein,
      carbs: acc.carbs + comp.carbs,
      fat: acc.fat + comp.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );
  
  // Zaokruži makroe na 1 decimalu
  const protein = Math.round(totals.protein * 10) / 10;
  const carbs = Math.round(totals.carbs * 10) / 10;
  const fat = Math.round(totals.fat * 10) / 10;
  
  // UVIJEK računaj kalorije iz makroa (formula: P×4 + UH×4 + M×9)
  const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  
  return { calories, protein, carbs, fat };
}

/**
 * Provjeri da li obrok zadovoljava kalorijske granice
 */
function isWithinMealCalorieLimits(meal: GeneratedMeal, mealType: string): boolean {
  const limits = MEAL_CALORIE_LIMITS[mealType];
  if (!limits) return true;
  return meal.totals.calories >= limits.min && meal.totals.calories <= limits.max;
}

/**
 * Provjeri da li jelo zadovoljava pravila za određeni mod (CUT/MAINTAIN/GAIN)
 */
function isMealSuitableForMode(meal: CompositeMeal, goalType: "lose" | "maintain" | "gain"): boolean {
  // Provjeri suitableFor tag
  if (meal.suitableFor && meal.suitableFor.length > 0) {
    const modeMap: Record<string, string> = {
      "lose": "lose",
      "maintain": "maintain",
      "gain": "gain"
    };
    const targetMode = modeMap[goalType];
    if (!meal.suitableFor.includes(targetMode)) {
      return false;
    }
  }
  
  // Dodatna provjera prema komponentama
  const mealFoods = meal.components.map(c => c.food.toLowerCase()).join(" ");
  const mealFoodsLower = mealFoods.toLowerCase();
  
  if (goalType === "lose") {
    // CUT: bez batata, peanut butter max 10g samo u snacku, whey + skyr samo u kombinaciji
    if (mealFoodsLower.includes("batat") || mealFoodsLower.includes("sweet potato")) {
      return false;
    }
    
    // Provjeri peanut butter - max 10g samo u snacku
    const pbComponent = meal.components.find(c => c.food.toLowerCase().includes("peanut") || c.food.toLowerCase().includes("pb"));
    if (pbComponent && pbComponent.grams > 10) {
      return false;
    }
    // PB mora biti u kombinaciji (ne samostalno)
    if (pbComponent && meal.components.length === 1) {
      return false;
    }
  }
  
  if (goalType === "maintain") {
    // MAINTAIN: PB 10-20g, kombinacije dozvoljene
    const pbComponent = meal.components.find(c => c.food.toLowerCase().includes("peanut") || c.food.toLowerCase().includes("pb"));
    if (pbComponent && (pbComponent.grams < 10 || pbComponent.grams > 20)) {
      return false;
    }
  }
  
  if (goalType === "gain") {
    // GAIN: PB do 25g u snacku, clean bulk jela
    const pbComponent = meal.components.find(c => c.food.toLowerCase().includes("peanut") || c.food.toLowerCase().includes("pb"));
    if (pbComponent && pbComponent.grams > 25) {
      return false;
    }
  }
  
  return true;
}

/**
 * Konvertiraj CompositeMeal u Meal format za scoring
 */
function convertToMeal(compositeMeal: CompositeMeal): Meal {
  const baseComponents = calculateMealMacros(compositeMeal.components, 1);
  const totals = calculateMealTotals(baseComponents);
  return {
    kcal: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    id: compositeMeal.id,
    name: compositeMeal.name,
    // Spremi originalni CompositeMeal za kasnije
    _compositeMeal: compositeMeal,
  };
}

/**
 * Odaberi najbolje jelo prema targetu - koristi scoring funkciju
 */
function selectRandomMeal(
  meals: CompositeMeal[],
  usedMealIds: Set<string>,
  usedMealNamesToday: Set<string>,
  usedMealNamesThisWeek: Set<string>,
  preferences: UserPreferences,
  previousMainProteins: string[] | undefined,
  goalType: "lose" | "maintain" | "gain" | undefined,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  runningMacros?: { protein: number; carbs: number; fat: number; calories: number }
): CompositeMeal | null {
  // PRO RAZINA - koristi SVA jela, samo filtriraj alergije
  let availableMeals = meals;

  // JEDINA HARD CONSTRAINT: alergije i "ne želim"
  if (preferences.avoidIngredients.length > 0) {
    availableMeals = availableMeals.filter(meal => !hasAvoidedIngredient(meal, preferences.avoidIngredients));
  }
  
  // FILTRIRANJE PO MODU: Provjeri da li jelo zadovoljava pravila za mod
  if (goalType) {
    availableMeals = availableMeals.filter(meal => isMealSuitableForMode(meal, goalType));
  }

  // Ako nema jela nakon filtriranja alergija, vrati null
  if (availableMeals.length === 0) return null;

  // MEAL VARIETY: Jelo se ne smije ponoviti unutar 7 dana
  let preferredMeals = availableMeals.filter(meal => 
    !usedMealIds.has(meal.id) && 
    !usedMealNamesToday.has(meal.name.toLowerCase()) &&
    !usedMealNamesThisWeek.has(meal.name.toLowerCase())
  );

  // MEAL VARIETY: Ista namirnica (glavni protein) se ne smije ponoviti dva dana zaredom
  if (previousMainProteins && previousMainProteins.length > 0) {
    preferredMeals = preferredMeals.filter(meal => 
      !hasSameMainProteins(meal, previousMainProteins)
    );
  }

  // Ako nema novih jela nakon variety filtra, dozvoli ponavljanje (ali ne isti ID)
  if (preferredMeals.length === 0) {
    preferredMeals = availableMeals.filter(meal => 
      !usedMealIds.has(meal.id) &&
      !usedMealNamesToday.has(meal.name.toLowerCase())
    );
  }

  // Ako i dalje nema, koristi sva dostupna jela (osim alergija)
  if (preferredMeals.length === 0) {
    preferredMeals = availableMeals;
  }

  // Preferiraj obroke s preferiranim namirnicama
  if (preferences.preferredIngredients.length > 0) {
    const mealsWithPrefs = preferredMeals.filter(meal => hasPreferredIngredient(meal, preferences.preferredIngredients));
    if (mealsWithPrefs.length > 0) {
      preferredMeals = mealsWithPrefs;
    }
  }

  // KORISTI SCORING ZA ODABIR NAJBOLJEG JELA PREMA TARGETU
  // Konvertiraj CompositeMeal u Meal format
  const mealCandidates: Meal[] = preferredMeals.map(convertToMeal);
  
  // Odaberi najbolje jelo prema targetu koristeći scoring funkciju
  const bestMeal = chooseBestMeal(
    mealCandidates,
    targetCalories,
    targetProtein,
    targetFat,
    targetCarbs,
    goalType || "maintain",
    runningMacros
  );

  if (!bestMeal) {
    // Ako nema najboljeg jela, vrati nasumično
    const randomIndex = Math.floor(Math.random() * preferredMeals.length);
    return preferredMeals[randomIndex];
  }

  // Vrati originalni CompositeMeal
  return (bestMeal as any)._compositeMeal || preferredMeals.find(m => m.id === bestMeal.id) || preferredMeals[0];
}

/**
 * Helper funkcija za generiranje obroka s automatskim tracking-om glavnih proteina
 */
function generateMealWithTracking(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  mealData: MealComponentsData,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  usedMealIds: Set<string>,
  usedMealNamesToday: Set<string>,
  usedMealNamesThisWeekBySlot: Set<string>,
  preferences: UserPreferences,
  previousMainProteins: Map<string, string[]>,
  todayMainProteins: Map<string, string[]>,
  goalType?: "lose" | "maintain" | "gain" // Mod za filtriranje jela
): GeneratedMeal | null {
  const slotKey = mealType === "snack" ? "snack" : mealType; // snack1, snack2, snack3 -> "snack"
  const prevProteins = previousMainProteins.get(slotKey) || [];
  
  const meal = generateMeal(
    mealType,
    mealData,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    usedMealIds,
    usedMealNamesToday,
    usedMealNamesThisWeekBySlot,
    preferences,
    prevProteins,
    goalType
  );
  
  if (meal) {
    // Ažuriraj tracking glavnih proteina za ovaj dan
    const mealComponents = mealData[mealType] as CompositeMeal[];
    const selectedMeal = mealComponents.find(m => m.id === meal.id);
    if (selectedMeal) {
      const mainProteins = getMainProteins(selectedMeal);
      todayMainProteins.set(slotKey, mainProteins);
    }
  }
  
  return meal;
}

/**
 * Generiraj jedan obrok - jednostavno skaliranje prema target kalorijama
 * Makroi će se fino prilagoditi u scaleAllMealsToTarget
 */
function generateMeal(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  mealData: MealComponentsData,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  usedMealIds: Set<string>,
  usedMealNamesToday: Set<string>,
  usedMealNamesThisWeekBySlot: Set<string>,
  preferences: UserPreferences,
  previousMainProteins?: string[], // Glavni proteini prethodnog dana za meal variety
  goalType?: "lose" | "maintain" | "gain" // Mod za filtriranje jela
): GeneratedMeal | null {
  const meals = mealData[mealType] as CompositeMeal[];
  const selectedMeal = selectRandomMeal(
    meals, 
    usedMealIds, 
    usedMealNamesToday, 
    usedMealNamesThisWeekBySlot, 
    preferences, 
    previousMainProteins, 
    goalType,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat
  );

  if (!selectedMeal) return null;

  // Označi kao korišten
  usedMealIds.add(selectedMeal.id);
  usedMealNamesToday.add(selectedMeal.name.toLowerCase());
  usedMealNamesThisWeekBySlot.add(selectedMeal.name.toLowerCase());

  // Izračunaj trenutne makroe (bazne vrijednosti) - KORISTI ORIGINALNE GRAMAŽE IZ BAZE
  // selectedMeal.components već ima originalne gramaže iz meal_components.json
  const baseComponents = calculateMealMacros(selectedMeal.components, 1);
  const baseTotals = calculateMealTotals(baseComponents);

  if (baseTotals.calories === 0) return null;

  // ISPRAVNA SCALING LOGIKA - skaliraj prema targetu za OVAJ OBROK, ne totalu
  // Prioritet: protein > carbs > fat
  // Porcija se skalira prema TRENUTNOM obroku, ne prema totalu dana
  // KORISTI ORIGINALNE GRAMAŽE IZ BAZE - selectedMeal.components već ima originalne vrijednosti
  
  // Izračunaj faktore skaliranja za svaki makro (target za ovaj obrok)
  const proteinFactor = baseTotals.protein > 0 ? targetProtein / baseTotals.protein : 1;
  const carbsFactor = baseTotals.carbs > 0 ? targetCarbs / baseTotals.carbs : 1;
  const fatFactor = baseTotals.fat > 0 ? targetFat / baseTotals.fat : 1;
  
  // Kombiniraj faktore s prioritetom: protein (primarni), carbs (sekundarni), fat (treći)
  // Koristi ponderirani prosjek: protein 50%, carbs 30%, fat 20%
  // NEMOJ koristiti sqrt modifikaciju - samo ponderirani prosjek
  let scaleFactor = proteinFactor * 0.5 + carbsFactor * 0.3 + fatFactor * 0.2;
  
  // U gain modu porcija može biti 10-20% veća od maintain moda, ne više
  if (goalType === "gain") {
    scaleFactor *= 1.15; // +15% u gain modu (10-20% veća)
  }
  
  // Ograniči skaliranje za realistične porcije
  // minScale = 0.7, maxScale = 1.1 (smanjeno jer će scaleAllMealsToTarget dodatno skalirati)
  // Gain može biti do 1.15x (10-20% veća od maintain)
  const minScale = 0.7;
  const maxScale = goalType === "gain" ? 1.15 : 1.1;
  scaleFactor = Math.max(minScale, Math.min(maxScale, scaleFactor));

  // Primijeni skaliranje
  let scaledComponents = calculateMealMacros(selectedMeal.components, scaleFactor);
  
  // PRIMJENI LIMITE ZA PORCIJE - provjeri svaku komponentu
  // Koristi originalne komponente za dobivanje food ID-a
  scaledComponents = scaledComponents.map((component, index) => {
    const originalComponent = selectedMeal.components[index];
    const foodId = originalComponent.food;
    const limits = getPortionLimits(foodId);
    const originalGrams = component.grams;
    // Ograniči na min/max
    const limitedGrams = Math.max(limits.min, Math.min(limits.max, originalGrams));
    
    // Ako je ograničeno, preračunaj makroe
    if (limitedGrams !== originalGrams) {
      const namirnica = findNamirnica(foodId);
      if (namirnica) {
        return {
          ...component,
          grams: limitedGrams,
          protein: (namirnica.proteinPer100g * limitedGrams) / 100,
          carbs: (namirnica.carbsPer100g * limitedGrams) / 100,
          fat: (namirnica.fatsPer100g * limitedGrams) / 100,
          calories: (namirnica.caloriesPer100g * limitedGrams) / 100,
        };
      }
    }
    return component;
  });
  
  let scaledTotals = calculateMealTotals(scaledComponents);

  // Provjeri kalorijske granice obroka (samo ako su previše ekstremne)
  const limits = MEAL_CALORIE_LIMITS[mealType];
  if (limits) {
    // Ako je previše malo (ispod minimuma), povećaj
    if (scaledTotals.calories < limits.min) {
      const adjustFactor = limits.min / scaledTotals.calories;
      scaledComponents = calculateMealMacros(selectedMeal.components, scaleFactor * adjustFactor);
      // Ponovno primijeni limite
      scaledComponents = scaledComponents.map(component => {
        const foodId = component.name; // Koristi name umjesto food
        const compLimits = getPortionLimits(foodId);
        const limitedGrams = Math.max(compLimits.min, Math.min(compLimits.max, component.grams));
        if (limitedGrams !== component.grams) {
          const namirnica = findNamirnica(foodId);
          if (namirnica) {
            return {
              ...component,
              grams: limitedGrams,
              protein: (namirnica.proteinPer100g * limitedGrams) / 100,
              carbs: (namirnica.carbsPer100g * limitedGrams) / 100,
              fat: (namirnica.fatsPer100g * limitedGrams) / 100,
              calories: (namirnica.caloriesPer100g * limitedGrams) / 100,
            };
          }
        }
        return component;
      });
      scaledTotals = calculateMealTotals(scaledComponents);
    }
    // Ako je previše veliko (više od maksimuma), smanji
    else if (scaledTotals.calories > limits.max) {
      const adjustFactor = limits.max / scaledTotals.calories;
      scaledComponents = calculateMealMacros(selectedMeal.components, scaleFactor * adjustFactor);
      // Ponovno primijeni limite
      scaledComponents = scaledComponents.map(component => {
        const foodId = component.name; // Koristi name umjesto food
        const compLimits = getPortionLimits(foodId);
        const limitedGrams = Math.max(compLimits.min, Math.min(compLimits.max, component.grams));
        if (limitedGrams !== component.grams) {
          const namirnica = findNamirnica(foodId);
          if (namirnica) {
            return {
              ...component,
              grams: limitedGrams,
              protein: (namirnica.proteinPer100g * limitedGrams) / 100,
              carbs: (namirnica.carbsPer100g * limitedGrams) / 100,
              fat: (namirnica.fatsPer100g * limitedGrams) / 100,
              calories: (namirnica.caloriesPer100g * limitedGrams) / 100,
            };
          }
        }
        return component;
      });
      scaledTotals = calculateMealTotals(scaledComponents);
    }
  }

  // Spremi originalne komponente za kasnije skaliranje u scaleAllMealsToTarget
  const originalComponents = selectedMeal.components.map(comp => ({
    food: comp.food,
    grams: comp.grams,
    displayName: comp.displayName,
  }));

  return {
    id: selectedMeal.id,
    name: selectedMeal.name,
    description: selectedMeal.description,
    image: selectedMeal.image,
    preparationTip: selectedMeal.preparationTip,
    components: scaledComponents,
    totals: scaledTotals,
    // Spremi originalne komponente za kasnije skaliranje
    _originalComponents: originalComponents,
  };
}

/**
 * TOČNO PRILAGODAVANJE - direktno skaliraj prema target_calories i target makroima iz kalkulatora
 * 
 * KAKO FUNKCIONIRA:
 * 1. Izračunava trenutne totale (zbroj svih obroka)
 * 2. Provjerava kalorije (±50 kcal) i makroe (±10%)
 * 3. Ako je sve OK → završi
 * 4. Ako nije → skaliraj sve obroke proporcionalno da se postigne TOČNO target_calories i target makroi
 * 5. Maksimalno 30 iteracija
 * 
 * OGRANIČENJA:
 * - Kalorije: target ±50 kcal (ili ±1.4% za 3600 kcal)
 * - Protein: target ±10%
 * - Carbs: target ±10%
 * - Fat: target ±10%
 * - Skaliranje: 0.8x - 1.2x za realistične porcije
 */
function scaleAllMealsToTarget(
  meals: Record<string, GeneratedMeal>,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  goalType: "lose" | "maintain" | "gain"
): Record<string, GeneratedMeal> {
  const MAX_ITERATIONS = 200; // Povećano za bolju preciznost
  const CALORIE_TOLERANCE = targetCalories * 0.15; // ±15% od targeta (realistično)
  const MACRO_TOLERANCE = 0.10; // ±10% (realistično, ali još uvijek precizno)
  
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
    
    // Zaokruži makroe na 1 decimalu
    const protein = Math.round(macroTotals.protein * 10) / 10;
    const carbs = Math.round(macroTotals.carbs * 10) / 10;
    const fat = Math.round(macroTotals.fat * 10) / 10;
    
    // UVIJEK računaj kalorije iz makroa (formula: P×4 + UH×4 + M×9)
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
      if (iteration > 0) {
        console.log(`   ✅ SVE POSTIGNUTO nakon ${iteration} iteracija:`);
        console.log(`      Kalorije: ${currentTotals.calories} kcal (target: ${targetCalories}, razlika: ${calDiff} kcal)`);
        console.log(`      Protein: ${currentTotals.protein}g (target: ${targetProtein}g, odstupanje: ${(proteinDev * 100).toFixed(1)}%)`);
        console.log(`      Carbs: ${currentTotals.carbs}g (target: ${targetCarbs}g, odstupanje: ${(carbsDev * 100).toFixed(1)}%)`);
        console.log(`      Fat: ${currentTotals.fat}g (target: ${targetFat}g, odstupanje: ${(fatDev * 100).toFixed(1)}%)`);
      }
      return currentMeals;
    }

    // Logiranje
    if (iteration < 5) {
      console.log(`   🔄 Iteracija ${iteration + 1}:`);
      console.log(`      Kalorije: ${currentTotals.calories} kcal (target: ${targetCalories}, razlika: ${calDiff} kcal) ${caloriesOK ? '✅' : '❌'}`);
      console.log(`      Protein: ${currentTotals.protein}g (target: ${targetProtein}g, odstupanje: ${(proteinDev * 100).toFixed(1)}%) ${proteinDev <= MACRO_TOLERANCE ? '✅' : '❌'}`);
      console.log(`      Carbs: ${currentTotals.carbs}g (target: ${targetCarbs}g, odstupanje: ${(carbsDev * 100).toFixed(1)}%) ${carbsDev <= MACRO_TOLERANCE ? '✅' : '❌'}`);
      console.log(`      Fat: ${currentTotals.fat}g (target: ${targetFat}g, odstupanje: ${(fatDev * 100).toFixed(1)}%) ${fatDev <= MACRO_TOLERANCE ? '✅' : '❌'}`);
    }

    // ISPRAVNA SCALING LOGIKA - skaliraj svaki makro zasebno za točno postizanje targeta
    // Prioritet: protein > carbs > fat
    // Koristi individualne faktore za svaki makro umjesto kombiniranog faktora
    
    const proteinFactor = targetProtein / currentTotals.protein;
    const carbsFactor = targetCarbs / currentTotals.carbs;
    const fatFactor = targetFat / currentTotals.fat;
    const calorieFactor = targetCalories / currentTotals.calories;
    
    // Za lose: kalorije ≤ target (nikad više!)
    // Za gain: kalorije ≥ target (nikad manje!)
    let finalCalorieFactor = calorieFactor;
    if (goalType === "lose" && currentTotals.calories > targetCalories) {
      finalCalorieFactor = Math.min(calorieFactor, 1.0); // Smanji ako je previše
    }
    if (goalType === "gain" && currentTotals.calories < targetCalories) {
      finalCalorieFactor = Math.max(calorieFactor, 1.0); // Povećaj ako je premalo
    }
    
    // KORISTI INDIVIDUALNE FAKTORE ZA SVAKI MAKRO - prioritet na najveće odstupanje
    // Pronađi makro s najvećim odstupanjem i koristi njegov faktor kao primarni
    const proteinDevValue = Math.abs(currentTotals.protein - targetProtein) / targetProtein;
    const carbsDevValue = Math.abs(currentTotals.carbs - targetCarbs) / targetCarbs;
    const fatDevValue = Math.abs(currentTotals.fat - targetFat) / targetFat;
    const calorieDevValue = Math.abs(currentTotals.calories - targetCalories) / targetCalories;
    
    // Odredi koji makro ima najveće odstupanje
    const maxDevValue = Math.max(proteinDevValue, carbsDevValue, fatDevValue, calorieDevValue);
    
    let scaleFactor: number;
    if (maxDevValue === proteinDevValue) {
      // Protein ima najveće odstupanje - koristi protein faktor
      scaleFactor = proteinFactor;
    } else if (maxDevValue === carbsDevValue) {
      // Carbs ima najveće odstupanje - koristi carbs faktor
      scaleFactor = carbsFactor;
    } else if (maxDevValue === fatDevValue) {
      // Fat ima najveće odstupanje - koristi fat faktor
      scaleFactor = fatFactor;
    } else {
      // Kalorije imaju najveće odstupanje - koristi calorie faktor
      scaleFactor = finalCalorieFactor;
    }
    
    // Ako je odstupanje veliko, dozvoli veće skaliranje
    if (maxDevValue > 0.15) {
      // Veliko odstupanje - dozvoli 0.5x - 2.0x skaliranje
      scaleFactor = Math.max(0.5, Math.min(2.0, scaleFactor));
    } else if (maxDevValue > 0.10) {
      // Srednje odstupanje - dozvoli 0.6x - 1.7x skaliranje
      scaleFactor = Math.max(0.6, Math.min(1.7, scaleFactor));
    } else {
      // Malo odstupanje - dozvoli 0.7x - 1.5x skaliranje
      scaleFactor = Math.max(0.7, Math.min(1.5, scaleFactor));
    }
    
    // Ako je odstupanje vrlo malo, koristi prosjek faktora za finu prilagodbu
    if (maxDevValue <= 0.05) {
      const avgFactor = (proteinFactor + carbsFactor + fatFactor + finalCalorieFactor) / 4;
      scaleFactor = Math.max(0.9, Math.min(1.1, avgFactor)); // Ograniči na malu prilagodbu
    }

    // Skaliraj sve obroke - KORISTI ORIGINALNE KOMPONENTE IZ BAZE
    // Ako meal ima _originalComponents, koristi ih; inače koristi trenutne komponente
    const scaledMeals: Record<string, GeneratedMeal> = {};

    for (const [mealType, meal] of Object.entries(currentMeals)) {
      // Koristi originalne komponente ako postoje, inače koristi trenutne
      const baseComponents = (meal as any)._originalComponents || meal.components;
      
      const scaledComponents = baseComponents.map((comp: any) => {
        // Ako je originalna komponenta (ima food i grams), koristi je
        const foodId = comp.food || comp.name;
        const baseGrams = comp.grams || 0;
        const namirnica = findNamirnica(foodId);
        if (!namirnica) return comp;

        // Izračunaj nove gramaže - NE ograničavaj odmah, dozvoli veće skaliranje
        let newGrams = baseGrams * scaleFactor;
        
        // Primijeni limite samo ako je potrebno (ne ograničavaj previše)
        const limits = getPortionLimits(foodId);
        // Dozvoli do 1.5x maksimuma ako je potrebno za postizanje targeta
        const maxAllowed = limits.max * 1.5;
        const minAllowed = limits.min;
        newGrams = Math.max(minAllowed, Math.min(maxAllowed, newGrams));
        
        const macros = calculateMacrosForGrams(namirnica, newGrams);

        return {
          name: foodId,
          grams: newGrams,
          calories: Math.round(macros.calories),
          protein: Math.round(macros.protein * 10) / 10,
          carbs: Math.round(macros.carbs * 10) / 10,
          fat: Math.round(macros.fat * 10) / 10,
        };
      });

      const scaledTotals = calculateMealTotals(scaledComponents);
      
      // PRO RAZINA - kalorijske granice su fleksibilne
      // Prilagodi samo ako je ekstremno (ispod minimuma ili više od 2x maksimuma)
      const limits = MEAL_CALORIE_LIMITS[mealType];
      if (limits && (scaledTotals.calories < limits.min || scaledTotals.calories > limits.max * 2)) {
        // Ako je izvan granica, prilagodi samo ovaj obrok
        let adjustFactor = 1;
        if (scaledTotals.calories < limits.min) {
          adjustFactor = limits.min / scaledTotals.calories;
        } else if (scaledTotals.calories > limits.max * 2) {
          // Dozvoli do 1.5x maksimuma za fleksibilnost
          adjustFactor = (limits.max * 1.5) / scaledTotals.calories;
        }

        const adjustedComponents = scaledComponents.map((comp: { name: string; grams: number; calories: number; protein: number; carbs: number; fat: number }) => {
          const foodId = comp.name;
          const namirnica = findNamirnica(foodId);
          if (!namirnica) return comp;

          const limits = getPortionLimits(foodId);
          const newGrams = Math.max(limits.min, Math.min(limits.max, comp.grams * adjustFactor));
          const macros = calculateMacrosForGrams(namirnica, newGrams);

          return {
            ...comp,
            grams: newGrams,
            calories: Math.round(macros.calories),
            protein: Math.round(macros.protein * 10) / 10,
            carbs: Math.round(macros.carbs * 10) / 10,
            fat: Math.round(macros.fat * 10) / 10,
          };
        });
          
          const adjustedTotals = calculateMealTotals(adjustedComponents);
        scaledMeals[mealType] = {
            ...meal,
            components: adjustedComponents,
            totals: adjustedTotals,
          };
      } else {
        scaledMeals[mealType] = {
          ...meal,
          components: scaledComponents,
          totals: scaledTotals,
        };
      }
    }

    currentMeals = scaledMeals;
  }

  // DODATNA FAZA: Fine-tuning za točno postizanje targeta
  // Ako smo unutar tolerancije ali nismo točno na targetu, pokušaj još malo prilagoditi
  const checkMacroTotals = Object.values(currentMeals).reduce(
    (totals, meal) => ({
      protein: totals.protein + meal.totals.protein,
      carbs: totals.carbs + meal.totals.carbs,
      fat: totals.fat + meal.totals.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );
  
  const checkProtein = Math.round(checkMacroTotals.protein * 10) / 10;
  const checkCarbs = Math.round(checkMacroTotals.carbs * 10) / 10;
  const checkFat = Math.round(checkMacroTotals.fat * 10) / 10;
  const checkCalories = Math.round(checkProtein * 4 + checkCarbs * 4 + checkFat * 9);
  
  // Provjeri da li smo blizu targeta ali ne točno
  const calDiff = Math.abs(checkCalories - targetCalories);
  const proteinDiff = Math.abs(checkProtein - targetProtein) / targetProtein;
  const carbsDiff = Math.abs(checkCarbs - targetCarbs) / targetCarbs;
  const fatDiff = Math.abs(checkFat - targetFat) / targetFat;
  
  // Ako smo unutar 15% ali ne točno, pokušaj još jednom fino prilagoditi
  const calDiffPercent = calDiff / targetCalories;
  if ((calDiffPercent <= 0.15) && 
      proteinDiff <= 0.10 && carbsDiff <= 0.10 && fatDiff <= 0.10 &&
      (calDiffPercent > 0.01 || proteinDiff > 0.01 || carbsDiff > 0.01 || fatDiff > 0.01)) {
    
    // Izračunaj faktore za točno postizanje targeta
    const calFactorFine = targetCalories / checkCalories;
    const proteinFactorFine = targetProtein / checkProtein;
    const carbsFactorFine = targetCarbs / checkCarbs;
    const fatFactorFine = targetFat / checkFat;
    
    // Pronađi makro s najvećim odstupanjem i koristi njegov faktor
    const proteinDevFine = Math.abs(checkProtein - targetProtein) / targetProtein;
    const carbsDevFine = Math.abs(checkCarbs - targetCarbs) / targetCarbs;
    const fatDevFine = Math.abs(checkFat - targetFat) / targetFat;
    const calorieDevFine = calDiffPercent;
    
    const maxDevFine = Math.max(proteinDevFine, carbsDevFine, fatDevFine, calorieDevFine);
    let fineTuneFactor: number;
    
    if (maxDevFine === proteinDevFine) {
      fineTuneFactor = proteinFactorFine;
    } else if (maxDevFine === carbsDevFine) {
      fineTuneFactor = carbsFactorFine;
    } else if (maxDevFine === fatDevFine) {
      fineTuneFactor = fatFactorFine;
    } else {
      fineTuneFactor = calFactorFine;
    }
    
    // Ograniči na prilagodbu (0.85x - 1.15x) za finu prilagodbu
    const fineScale = Math.max(0.85, Math.min(1.15, fineTuneFactor));
    
    // Primijeni fine-tuning
    const fineTunedMeals: Record<string, GeneratedMeal> = {};
    for (const [mealType, meal] of Object.entries(currentMeals)) {
      const fineComponents = meal.components.map(comp => {
        const namirnica = findNamirnica(comp.name);
        if (!namirnica) return comp;
        
        const newGrams = clampToPortionLimits(comp.name, comp.grams * fineScale);
        const macros = calculateMacrosForGrams(namirnica, newGrams);
        
        return {
          ...comp,
          grams: newGrams,
          calories: Math.round(macros.calories),
          protein: Math.round(macros.protein * 10) / 10,
          carbs: Math.round(macros.carbs * 10) / 10,
          fat: Math.round(macros.fat * 10) / 10,
        };
      });
      
      const fineTotals = calculateMealTotals(fineComponents);
      fineTunedMeals[mealType] = {
        ...meal,
        components: fineComponents,
        totals: fineTotals,
      };
    }
    
    currentMeals = fineTunedMeals;
  }

  // Finalna provjera (zbroji makroe, zatim izračunaj kalorije)
  const finalMacroTotals = Object.values(currentMeals).reduce(
    (totals, meal) => ({
      protein: totals.protein + meal.totals.protein,
      carbs: totals.carbs + meal.totals.carbs,
      fat: totals.fat + meal.totals.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );
  
  // Zaokruži makroe na 1 decimalu
  const finalProtein = Math.round(finalMacroTotals.protein * 10) / 10;
  const finalCarbs = Math.round(finalMacroTotals.carbs * 10) / 10;
  const finalFat = Math.round(finalMacroTotals.fat * 10) / 10;
  
  // UVIJEK računaj kalorije iz makroa (formula: P×4 + UH×4 + M×9)
  const finalCalories = Math.round(finalProtein * 4 + finalCarbs * 4 + finalFat * 9);
  
  const finalTotals = { calories: finalCalories, protein: finalProtein, carbs: finalCarbs, fat: finalFat };

  const finalCalDiff = Math.abs(finalTotals.calories - targetCalories);
  const finalProteinDev = Math.abs(finalTotals.protein - targetProtein) / targetProtein;
  const finalCarbsDev = Math.abs(finalTotals.carbs - targetCarbs) / targetCarbs;
  const finalFatDev = Math.abs(finalTotals.fat - targetFat) / targetFat;

  console.log(`\n   📊 FINALNI REZULTAT:`);
  console.log(`      Kalorije: ${finalTotals.calories} kcal (target: ${targetCalories}, razlika: ${finalCalDiff} kcal) ${finalCalDiff <= CALORIE_TOLERANCE ? '✅' : '⚠️'}`);
  console.log(`      Protein: ${finalTotals.protein}g (target: ${targetProtein}g, odstupanje: ${(finalProteinDev * 100).toFixed(1)}%) ${finalProteinDev <= MACRO_TOLERANCE ? '✅' : '⚠️'}`);
  console.log(`      Carbs: ${finalTotals.carbs}g (target: ${targetCarbs}g, odstupanje: ${(finalCarbsDev * 100).toFixed(1)}%) ${finalCarbsDev <= MACRO_TOLERANCE ? '✅' : '⚠️'}`);
  console.log(`      Fat: ${finalTotals.fat}g (target: ${targetFat}g, odstupanje: ${(finalFatDev * 100).toFixed(1)}%) ${finalFatDev <= MACRO_TOLERANCE ? '✅' : '⚠️'}`);

  return currentMeals;
}

/**
 * Odredi distribuciju kalorija I makroa po obrocima (3, 5 ili 6 obroka)
 * Vraća distribuciju za kalorije, protein, carbs i fat
 */
function getMealDistribution(
  numMeals: 3 | 5 | 6, 
  goalType: "lose" | "maintain" | "gain"
): {
  calories: Record<string, number>;
  protein: Record<string, number>;
  carbs: Record<string, number>;
  fat: Record<string, number>;
} {
  // Distribucija je ista za sve makroe (jednostavnije)
  let calorieDist: Record<string, number>;
  
  if (numMeals === 3) {
    calorieDist = {
      breakfast: 0.35,
      lunch: 0.40,
      dinner: 0.25,
    };
  } else if (numMeals === 5) {
    // 5 obroka
    if (goalType === "lose") {
      calorieDist = {
        breakfast: 0.30,
        snack1: 0.10,
        lunch: 0.30,
        snack2: 0.10,
        dinner: 0.20,
      };
    } else if (goalType === "gain") {
      calorieDist = {
        breakfast: 0.25,
        snack1: 0.12,
        lunch: 0.35,
        snack2: 0.12,
        dinner: 0.16,
      };
    } else {
      calorieDist = {
        breakfast: 0.25,
        snack1: 0.10,
        lunch: 0.35,
        snack2: 0.10,
        dinner: 0.20,
      };
    }
  } else {
    // 6 obroka
    if (goalType === "lose") {
      calorieDist = {
        breakfast: 0.25,
        snack1: 0.08,
        lunch: 0.28,
        snack2: 0.08,
        snack3: 0.08,
        dinner: 0.23,
      };
    } else if (goalType === "gain") {
      calorieDist = {
        breakfast: 0.22,
        snack1: 0.10,
        lunch: 0.30,
        snack2: 0.10,
        snack3: 0.10,
        dinner: 0.18,
      };
    } else {
      calorieDist = {
        breakfast: 0.22,
        snack1: 0.08,
        lunch: 0.30,
        snack2: 0.08,
        snack3: 0.10,
        dinner: 0.22,
      };
    }
  }

  // Ista distribucija za sve makroe
  return {
    calories: calorieDist,
    protein: calorieDist,
    carbs: calorieDist,
    fat: calorieDist,
  };
}

// ============================================
// GLAVNI GENERATOR
// ============================================

/**
 * Generiraj tjedni plan prehrane (7 dana)
 */
export async function generateWeeklyMealPlan(userId: string): Promise<WeeklyMealPlan> {
  console.log("🚀 Pokretanje profesionalnog generatora tjednog plana prehrane...");
  console.log(`📋 Korisnik ID: ${userId}`);
  
  // 1. Dohvati korisničke kalkulacije (NIKAD ne računa - samo čita!)
  const calculations = await getUserCalculations(userId);
  console.log(`✅ Kalkulacije iz DB: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`);
  console.log(`🎯 Cilj: ${calculations.goalType}`);

  // 2. Dohvati korisničke preferencije
  let preferences: UserPreferences = { avoidIngredients: [], preferredIngredients: [], desiredMealsPerDay: 5 };
  try {
    const { data: clientData } = await supabase
      .from("clients")
      .select("allergies, meal_frequency")
      .eq("id", userId)
      .single();
    
    // Prvo provjeri meal_frequency iz baze
    if (clientData?.meal_frequency) {
      const mealFreq = parseInt(clientData.meal_frequency);
      if (mealFreq === 3 || mealFreq === 5 || mealFreq === 6) {
        preferences.desiredMealsPerDay = mealFreq as 3 | 5 | 6;
        console.log(`🍽️ Broj obroka iz baze: ${preferences.desiredMealsPerDay}`);
      }
    }
    
    // Parsiraj alergije i preferencije iz allergies polja
    if (clientData?.allergies) {
      const allergiesText = typeof clientData.allergies === 'string' 
        ? clientData.allergies 
        : Array.isArray(clientData.allergies) 
          ? clientData.allergies.join(", ")
          : "";
      
      const parsedPrefs = parseUserPreferences(allergiesText);
      preferences.avoidIngredients = parsedPrefs.avoidIngredients;
      preferences.preferredIngredients = parsedPrefs.preferredIngredients;
      
      // Ako nema meal_frequency u bazi, koristi parsirano iz allergies
      if (!clientData?.meal_frequency) {
        preferences.desiredMealsPerDay = parsedPrefs.desiredMealsPerDay;
      }
      
      console.log(`🚫 Izbjegavane namirnice: ${preferences.avoidIngredients.join(", ") || "nema"}`);
      console.log(`✅ Preferirane namirnice: ${preferences.preferredIngredients.join(", ") || "nema"}`);
      console.log(`🍽️ Broj obroka: ${preferences.desiredMealsPerDay}`);
    }
  } catch (error) {
    console.log("ℹ️ Nema preferencija ili greška pri dohvaćanju:", error);
  }

  // 3. Učitaj podatke o obrocima
  const mealData = mealComponentsData as MealComponentsData;

  // 4. Odredi distribuciju kalorija I makroa po obrocima
  const mealDistribution = getMealDistribution(preferences.desiredMealsPerDay, calculations.goalType);

  // 5. Generiraj 7 dana
  const days: DailyPlan[] = [];
  const dayNames = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + daysToMonday);

  // Tracking kroz cijeli tjedan za maksimalnu različitost (po slotu)
  const weeklyUsedMealNamesBySlot: Map<string, Set<string>> = new Map();
  // Tracking ID-eva jela kroz cijeli tjedan - jelo se ne smije ponoviti unutar 7 dana
  const weeklyUsedMealIds: Set<string> = new Set();
  // Tracking glavnih namirnica (proteina) kroz dane - ista namirnica se ne smije ponoviti dva dana zaredom
  const previousDayMainProteins: Map<string, string[]> = new Map(); // slot -> lista glavnih proteina prethodnog dana

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];

    console.log(`\n📅 Generiranje dana ${i + 1}/7: ${dayNames[i]} (${dateStr})`);

    // Tracking za ovaj dan (nikad ne ponavljaj jelo unutar dana)
    const usedMealIdsToday = new Set<string>();
    const usedMealNamesToday = new Set<string>();
    // Tracking glavnih proteina za ovaj dan (za sprječavanje ponavljanja sljedeći dan)
    const todayMainProteins: Map<string, string[]> = new Map(); // slot -> lista glavnih proteina
    
    // Kombiniraj weeklyUsedMealIds s usedMealIdsToday za provjeru
    const allUsedMealIds = new Set([...weeklyUsedMealIds, ...usedMealIdsToday]);

    // Generiraj obroke prema broju obroka
    const meals: Record<string, GeneratedMeal> = {};

    if (preferences.desiredMealsPerDay === 3) {
      // 3 obroka: breakfast, lunch, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = generateMeal(
      "breakfast",
      mealData,
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        breakfastSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);
      weeklyUsedMealIds.add(breakfast.id || breakfast.name.toLowerCase()); // Dodaj u weekly tracking

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = generateMeal(
        "lunch", 
      mealData,
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        lunchSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);
      weeklyUsedMealIds.add(lunch.id || lunch.name.toLowerCase()); // Dodaj u weekly tracking

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = generateMeal(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        dinnerSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);
      weeklyUsedMealIds.add(dinner.id || dinner.name.toLowerCase()); // Dodaj u weekly tracking

    } else if (preferences.desiredMealsPerDay === 5) {
      // 5 obroka: breakfast, snack1, lunch, snack2, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = generateMeal(
        "breakfast", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        breakfastSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);
      weeklyUsedMealIds.add(breakfast.id || breakfast.name.toLowerCase()); // Dodaj u weekly tracking

      const snack1Slot = weeklyUsedMealNamesBySlot.get("snack1") || new Set<string>();
      const snack1 = generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack1,
        calculations.targetProtein * mealDistribution.protein.snack1,
        calculations.targetCarbs * mealDistribution.carbs.snack1,
        calculations.targetFat * mealDistribution.fat.snack1,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        snack1Slot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!snack1) throw new Error(`Nije moguće generirati međuobrok 1 za dan ${i + 1}`);
      meals.snack1 = snack1;
      snack1Slot.add(snack1.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack1", snack1Slot);
      weeklyUsedMealIds.add(snack1.id || snack1.name.toLowerCase()); // Dodaj u weekly tracking

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = generateMeal(
        "lunch", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        lunchSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

      const snack2Slot = weeklyUsedMealNamesBySlot.get("snack2") || new Set<string>();
      const snack2 = generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack2,
        calculations.targetProtein * mealDistribution.protein.snack2,
        calculations.targetCarbs * mealDistribution.carbs.snack2,
        calculations.targetFat * mealDistribution.fat.snack2,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        snack2Slot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!snack2) throw new Error(`Nije moguće generirati međuobrok 2 za dan ${i + 1}`);
      meals.snack2 = snack2;
      snack2Slot.add(snack2.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack2", snack2Slot);
      weeklyUsedMealIds.add(snack2.id || snack2.name.toLowerCase()); // Dodaj u weekly tracking

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = generateMeal(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        dinnerSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);
      weeklyUsedMealIds.add(dinner.id || dinner.name.toLowerCase()); // Dodaj u weekly tracking

    } else {
      // 6 obroka: breakfast, snack1, lunch, snack2, snack3, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = generateMeal(
        "breakfast", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        breakfastSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);
      weeklyUsedMealIds.add(breakfast.id || breakfast.name.toLowerCase()); // Dodaj u weekly tracking

      const snack1Slot = weeklyUsedMealNamesBySlot.get("snack1") || new Set<string>();
      const snack1 = generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack1,
        calculations.targetProtein * mealDistribution.protein.snack1,
        calculations.targetCarbs * mealDistribution.carbs.snack1,
        calculations.targetFat * mealDistribution.fat.snack1,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        snack1Slot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!snack1) throw new Error(`Nije moguće generirati međuobrok 1 za dan ${i + 1}`);
      meals.snack1 = snack1;
      snack1Slot.add(snack1.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack1", snack1Slot);
      weeklyUsedMealIds.add(snack1.id || snack1.name.toLowerCase()); // Dodaj u weekly tracking

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = generateMeal(
        "lunch", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        lunchSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

      const snack2Slot = weeklyUsedMealNamesBySlot.get("snack2") || new Set<string>();
      const snack2 = generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack2,
        calculations.targetProtein * mealDistribution.protein.snack2,
        calculations.targetCarbs * mealDistribution.carbs.snack2,
        calculations.targetFat * mealDistribution.fat.snack2,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        snack2Slot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!snack2) throw new Error(`Nije moguće generirati međuobrok 2 za dan ${i + 1}`);
      meals.snack2 = snack2;
      snack2Slot.add(snack2.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack2", snack2Slot);
      weeklyUsedMealIds.add(snack2.id || snack2.name.toLowerCase()); // Dodaj u weekly tracking

      const snack3Slot = weeklyUsedMealNamesBySlot.get("snack3") || new Set<string>();
      const snack3 = generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack3,
        calculations.targetProtein * mealDistribution.protein.snack3,
        calculations.targetCarbs * mealDistribution.carbs.snack3,
        calculations.targetFat * mealDistribution.fat.snack3,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        snack3Slot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!snack3) throw new Error(`Nije moguće generirati međuobrok 3 za dan ${i + 1}`);
      meals.snack3 = snack3;
      snack3Slot.add(snack3.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack3", snack3Slot);
      weeklyUsedMealIds.add(snack3.id || snack3.name.toLowerCase()); // Dodaj u weekly tracking

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = generateMeal(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        allUsedMealIds, // Koristi kombinirani set za provjeru
        usedMealNamesToday, 
        dinnerSlot, 
        preferences,
        undefined,
        calculations.goalType
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);
      weeklyUsedMealIds.add(dinner.id || dinner.name.toLowerCase()); // Dodaj u weekly tracking
    }

    // ITERATIVNO skaliraj sve obroke dok makroi nisu unutar ±5%
    const scaledMeals = scaleAllMealsToTarget(
      meals,
      calculations.targetCalories,
      calculations.targetProtein,
      calculations.targetCarbs,
      calculations.targetFat,
      calculations.goalType
    );

    // Izračunaj dnevne totale (zbroji makroe, zatim izračunaj kalorije)
    const dailyMacroTotals = Object.values(scaledMeals).reduce(
      (totals, meal) => ({
        protein: totals.protein + meal.totals.protein,
        carbs: totals.carbs + meal.totals.carbs,
        fat: totals.fat + meal.totals.fat,
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
    
    // Zaokruži makroe na 1 decimalu
    const dailyProtein = Math.round(dailyMacroTotals.protein * 10) / 10;
    const dailyCarbs = Math.round(dailyMacroTotals.carbs * 10) / 10;
    const dailyFat = Math.round(dailyMacroTotals.fat * 10) / 10;
    
    // UVIJEK računaj kalorije iz makroa (formula: P×4 + UH×4 + M×9)
    const dailyCalories = Math.round(dailyProtein * 4 + dailyCarbs * 4 + dailyFat * 9);
    
    const dailyTotals = {
      calories: dailyCalories,
      protein: dailyProtein,
      carbs: dailyCarbs,
      fat: dailyFat,
    };

    // Provjeri odstupanja - KORISTI TOČNE VRIJEDNOSTI IZ KALKULATORA
    const calDev = Math.abs(dailyTotals.calories - calculations.targetCalories) / calculations.targetCalories;
    const proteinDev = Math.abs(dailyTotals.protein - calculations.targetProtein) / calculations.targetProtein;
    const carbsDev = Math.abs(dailyTotals.carbs - calculations.targetCarbs) / calculations.targetCarbs;
    const fatDev = Math.abs(dailyTotals.fat - calculations.targetFat) / calculations.targetFat;
    const maxDev = Math.max(calDev, proteinDev, carbsDev, fatDev);

    // Izračunaj apsolutne razlike za detaljniju provjeru
    const calDiff = Math.abs(dailyTotals.calories - calculations.targetCalories);
    const proteinDiff = Math.abs(dailyTotals.protein - calculations.targetProtein);
    const carbsDiff = Math.abs(dailyTotals.carbs - calculations.targetCarbs);
    const fatDiff = Math.abs(dailyTotals.fat - calculations.targetFat);

    console.log(`   📊 Dnevni total: ${dailyTotals.calories} kcal, P: ${dailyTotals.protein}g, C: ${dailyTotals.carbs}g, F: ${dailyTotals.fat}g`);
    console.log(`   🎯 Target: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`);
    console.log(`   📈 Odstupanje: ${(maxDev * 100).toFixed(1)}%`);
    console.log(`   📉 Apsolutne razlike: ${calDiff.toFixed(0)} kcal, P: ${proteinDiff.toFixed(1)}g, C: ${carbsDiff.toFixed(1)}g, F: ${fatDiff.toFixed(1)}g`);

    // Provjeri da li su kalorije unutar granica za goalType
    if (calculations.goalType === "lose" && dailyTotals.calories > calculations.targetCalories) {
      console.warn(`   ⚠️ LOSE: Kalorije (${dailyTotals.calories}) > target (${calculations.targetCalories})`);
    }
    if (calculations.goalType === "gain" && dailyTotals.calories < calculations.targetCalories) {
      console.warn(`   ⚠️ GAIN: Kalorije (${dailyTotals.calories}) < target (${calculations.targetCalories})`);
    }

    days.push({
      date: dateStr,
      dayName: dayNames[i],
      meals: scaledMeals,
      dailyTotals,
    });
    
    // Ažuriraj previousDayMainProteins za sljedeći dan (meal variety)
    // Kopiraj todayMainProteins u previousDayMainProteins za svaki slot
    for (const [slot, proteins] of todayMainProteins.entries()) {
      previousDayMainProteins.set(slot, [...proteins]);
    }
  }

  // 6. Izračunaj tjedne prosjeke (zbroji makroe, zatim izračunaj kalorije)
  const totalProtein = days.reduce((sum, day) => sum + day.dailyTotals.protein, 0);
  const totalCarbs = days.reduce((sum, day) => sum + day.dailyTotals.carbs, 0);
  const totalFat = days.reduce((sum, day) => sum + day.dailyTotals.fat, 0);
  
  // Prosječni makroi (zaokruženi na 1 decimalu)
  const avgProtein = Math.round(totalProtein / 7 * 10) / 10;
  const avgCarbs = Math.round(totalCarbs / 7 * 10) / 10;
  const avgFat = Math.round(totalFat / 7 * 10) / 10;
  
  // UVIJEK računaj prosječne kalorije iz prosječnih makroa (formula: P×4 + UH×4 + M×9)
  const avgCalories = Math.round(avgProtein * 4 + avgCarbs * 4 + avgFat * 9);
  
  const weeklyTotals = {
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
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

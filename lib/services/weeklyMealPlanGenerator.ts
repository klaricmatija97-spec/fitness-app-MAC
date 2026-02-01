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
import { analyzeNutritionFromText } from "../services/edamamService";

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
    food?: string; // Originalni food key za mapiranje namirnice
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
  supplementNote: string;
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

// ============================================
// PORTION LIMITS PO CILJU (LOSE / MAINTAIN / GAIN)
// ============================================

// LOSE MODE: Više proteina, manje UH i masti
const PORTION_LIMITS_LOSE: Record<string, { min: number; max: number }> = {
  // Proteini - POVEĆANO (prioritet očuvanje mišića)
  "chicken_breast": { min: 100, max: 250 },  // Više proteina za zasićenje
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
  // UH - SMANJENO
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
  // Masti - MINIMALNO
  "avocado": { min: 30, max: 80 },
  "peanut_butter": { min: 10, max: 25 },
  "peanut butter": { min: 10, max: 25 },
  "olive_oil": { min: 5, max: 15 },
  "almonds": { min: 10, max: 25 },
  "butter": { min: 5, max: 15 },
  "butter light": { min: 5, max: 15 },
  "sour_cream": { min: 15, max: 50 },
  "sour cream": { min: 15, max: 50 },
  // Mliječni - visoko proteinski
  "greek_yogurt": { min: 100, max: 300 },
  "cottage_cheese": { min: 80, max: 250 },
  "milk": { min: 100, max: 300 },
  // Voće
  "apple": { min: 80, max: 150 },
  "blueberries": { min: 50, max: 100 },
  // Default
  "default": { min: 30, max: 200 },
};

// MAINTAIN MODE: Uravnoteženo
const PORTION_LIMITS_MAINTAIN: Record<string, { min: number; max: number }> = {
  // Proteini - umjereno
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
  // UH - umjereno
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
  // Masti - umjereno
  "avocado": { min: 40, max: 120 },
  "peanut_butter": { min: 15, max: 40 },
  "peanut butter": { min: 15, max: 40 },
  "olive_oil": { min: 5, max: 25 },
  "almonds": { min: 15, max: 40 },
  "butter": { min: 5, max: 25 },
  "butter light": { min: 5, max: 25 },
  "sour_cream": { min: 20, max: 80 },
  "sour cream": { min: 20, max: 80 },
  // Mliječni
  "greek_yogurt": { min: 100, max: 250 },
  "cottage_cheese": { min: 80, max: 200 },
  "milk": { min: 100, max: 350 },
  // Voće
  "apple": { min: 80, max: 180 },
  "blueberries": { min: 50, max: 120 },
  // Default
  "default": { min: 30, max: 250 },
};

// GAIN MODE: Više UH, manje proteina
const PORTION_LIMITS_GAIN: Record<string, { min: number; max: number }> = {
  // Proteini - SMANJENO (da ne bude previše proteina)
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
  // UH - POVEĆANO (prioritet energija)
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
  // Masti - umjereno (za dodatne kalorije)
  "avocado": { min: 40, max: 120 },
  "peanut_butter": { min: 15, max: 50 },
  "peanut butter": { min: 15, max: 50 },
  "olive_oil": { min: 10, max: 30 },
  "almonds": { min: 15, max: 40 },
  "butter": { min: 10, max: 30 },
  "butter light": { min: 10, max: 30 },
  "sour_cream": { min: 30, max: 100 },
  "sour cream": { min: 30, max: 100 },
  // Mliječni
  "greek_yogurt": { min: 80, max: 200 },
  "cottage_cheese": { min: 50, max: 150 },
  "milk": { min: 150, max: 450 },
  // Voće
  "apple": { min: 100, max: 200 },
  "blueberries": { min: 50, max: 150 },
  // Default
  "default": { min: 40, max: 350 },
};

// Aktivna PORTION_LIMITS - defaultna vrijednost (mijenja se u generateWeeklyMealPlan)
let ACTIVE_GOAL_TYPE: "lose" | "maintain" | "gain" = "maintain";

function getPortionLimitsForGoal(goalType: "lose" | "maintain" | "gain"): Record<string, { min: number; max: number }> {
  switch (goalType) {
    case "lose": return PORTION_LIMITS_LOSE;
    case "gain": return PORTION_LIMITS_GAIN;
    default: return PORTION_LIMITS_MAINTAIN;
  }
}

function getPortionLimits(foodKey: string, goalType?: "lose" | "maintain" | "gain"): { min: number; max: number } {
  const limits = getPortionLimitsForGoal(goalType || ACTIVE_GOAL_TYPE);
  const namirnica = findNamirnica(foodKey);
  
  if (!namirnica) {
    return limits["default"];
  }
  
  // Pokušaj pronaći po id
  const byId = limits[namirnica.id];
  if (byId) return byId;
  
  // Pokušaj pronaći po imenu
  const byName = limits[namirnica.name.toLowerCase()];
  if (byName) return byName;
  
  // Pokušaj pronaći po engleskom imenu
  const byNameEn = limits[namirnica.nameEn.toLowerCase()];
  if (byNameEn) return byNameEn;
  
  return limits["default"];
}

function clampToPortionLimits(foodKey: string, grams: number, goalType?: "lose" | "maintain" | "gain"): number {
  const limits = getPortionLimits(foodKey, goalType);
  // STROGA OGRANIČENJA - poštuj limite!
  const clamped = Math.max(limits.min, Math.min(limits.max, Math.round(grams / 5) * 5));
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

  return {
    targetCalories: Math.round(targetCalories),
    targetProtein: Math.round(targetProtein * 10) / 10,
    targetCarbs: Math.round(targetCarbs * 10) / 10,
    targetFat: Math.round(targetFat * 10) / 10,
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
      // POBOLJŠANJE: Pokušaj pronaći po displayName ako food nije pronađen
      const alternativeNamirnica = comp.displayName ? findNamirnica(comp.displayName) : null;
      if (alternativeNamirnica) {
        console.log(`⚠️ Namirnica pronađena po displayName: ${comp.displayName} (originalni food: ${comp.food})`);
        const scaledGrams = clampToPortionLimits(comp.displayName, comp.grams * scaleFactor);
        const macros = calculateMacrosForGrams(alternativeNamirnica, scaledGrams);
        return {
          name: comp.displayName || comp.food,
          food: comp.food,
          grams: scaledGrams,
          calories: Math.round(macros.calories),
          protein: Math.round(macros.protein * 10) / 10,
          carbs: Math.round(macros.carbs * 10) / 10,
          fat: Math.round(macros.fat * 10) / 10,
        };
      }
      
      console.warn(`⚠️ NAMIRNICA NIJE PRONAĐENA: "${comp.food}" (displayName: "${comp.displayName}") - vraćam 0 makroe!`);
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
      food: comp.food, // Spremi originalni food key za kasnije mapiranje
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
 * Validiraj jelo s Edamam API-om i koristi točnije podatke (kao u web verziji)
 */
async function validateMealWithEdamam(meal: GeneratedMeal): Promise<GeneratedMeal> {
  if (!process.env.EDAMAM_APP_ID || !process.env.EDAMAM_APP_KEY) {
    return meal; // Ako nema credentials, vrati original
  }
  
  try {
    // Formiraj tekst sastojaka za Edamam API
    const ingredientText = meal.components.map(c => 
      `${c.grams}g ${c.name}`
    ).join(", ");
    
    // Dohvati Edamam podatke
    const edamamData = await analyzeNutritionFromText(
      ingredientText,
      meal.name
    );
    
    if (edamamData) {
      // Usporedi s izračunatim vrijednostima
      const deviation = {
        calories: Math.abs(meal.totals.calories - edamamData.calories),
        protein: Math.abs(meal.totals.protein - edamamData.protein),
        carbs: Math.abs(meal.totals.carbs - edamamData.carbs),
        fat: Math.abs(meal.totals.fat - edamamData.fat),
      };
      
      // Ako je razlika > 5%, koristi Edamam podatke (točniji)
      const calorieDeviationPercent = meal.totals.calories > 0 
        ? (deviation.calories / meal.totals.calories) * 100 
        : 0;
      
      if (calorieDeviationPercent > 5 || 
          (meal.totals.protein > 0 && deviation.protein > meal.totals.protein * 0.05) ||
          (meal.totals.carbs > 0 && deviation.carbs > meal.totals.carbs * 0.05) ||
          (meal.totals.fat > 0 && deviation.fat > meal.totals.fat * 0.05)) {
        
        console.log(`✅ Edamam korekcija za ${meal.name}:`);
        console.log(`   USDA: ${meal.totals.calories.toFixed(0)} kcal | Edamam: ${edamamData.calories.toFixed(0)} kcal`);
        console.log(`   Razlika: ${deviation.calories.toFixed(0)} kcal (${calorieDeviationPercent.toFixed(1)}%)`);
        
        // Koristi Edamam podatke (točniji) - skaliraj komponente proporcionalno
        // Izračunaj faktore skaliranja za svaki makro
        const proteinScale = meal.totals.protein > 0 ? edamamData.protein / meal.totals.protein : 1;
        const carbsScale = meal.totals.carbs > 0 ? edamamData.carbs / meal.totals.carbs : 1;
        const fatScale = meal.totals.fat > 0 ? edamamData.fat / meal.totals.fat : 1;
        const calorieScale = meal.totals.calories > 0 ? edamamData.calories / meal.totals.calories : 1;
        
        // Koristi prosječni faktor za skaliranje komponenti
        const avgScale = (proteinScale + carbsScale + fatScale + calorieScale) / 4;
        
        // Ažuriraj komponente proporcionalno
        const updatedComponents = meal.components.map(comp => {
          const newProtein = Math.round(comp.protein * proteinScale * 10) / 10;
          const newCarbs = Math.round(comp.carbs * carbsScale * 10) / 10;
          const newFat = Math.round(comp.fat * fatScale * 10) / 10;
          
          // UVIJEK računaj kalorije iz makroa
          const newCalories = Math.round(newProtein * 4 + newCarbs * 4 + newFat * 9);
          
          return {
            ...comp,
            calories: newCalories,
            protein: newProtein,
            carbs: newCarbs,
            fat: newFat,
          };
        });
        
        // Izračunaj totale iz komponenti (zbroji makroe, zatim izračunaj kalorije)
        const componentTotals = updatedComponents.reduce(
          (acc, comp) => ({
            protein: acc.protein + comp.protein,
            carbs: acc.carbs + comp.carbs,
            fat: acc.fat + comp.fat,
          }),
          { protein: 0, carbs: 0, fat: 0 }
        );
        
        const totalProtein = Math.round(componentTotals.protein * 10) / 10;
        const totalCarbs = Math.round(componentTotals.carbs * 10) / 10;
        const totalFat = Math.round(componentTotals.fat * 10) / 10;
        
        // UVIJEK računaj kalorije iz makroa
        const totalCalories = Math.round(totalProtein * 4 + totalCarbs * 4 + totalFat * 9);
        
        // Ažuriraj totale s izračunatim vrijednostima (blizu Edamam podataka)
        const updatedTotals = {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        };
        
        return {
          ...meal,
          components: updatedComponents,
          totals: updatedTotals,
        };
      }
    }
  } catch (error) {
    console.warn(`⚠️ Edamam validacija neuspješna za ${meal.name}:`, error);
    // Vrati original ako validacija ne uspije
  }
  
  return meal;
}

/**
 * Odaberi nasumični obrok - koristi SVA jela, ali poštuje preferencije i meal variety
 */
function selectRandomMeal(
  meals: CompositeMeal[],
  usedMealIds: Set<string>,
  usedMealNamesToday: Set<string>,
  usedMealNamesThisWeek: Set<string>,
  preferences: UserPreferences,
  previousMainProteins?: string[] // Glavni proteini prethodnog dana za isti slot
): CompositeMeal | null {
  // PRO RAZINA - koristi SVA jela, samo filtriraj alergije
  let availableMeals = meals;

  // JEDINA HARD CONSTRAINT: alergije i "ne želim"
  if (preferences.avoidIngredients.length > 0) {
    availableMeals = availableMeals.filter(meal => !hasAvoidedIngredient(meal, preferences.avoidIngredients));
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

  // Preferiraj obroke s preferiranim namirnicama (weighted selection - 70% šansa)
  if (preferences.preferredIngredients.length > 0) {
    const mealsWithPrefs = preferredMeals.filter(meal => hasPreferredIngredient(meal, preferences.preferredIngredients));
    if (mealsWithPrefs.length > 0 && Math.random() < 0.7) {
      const randomIndex = Math.floor(Math.random() * mealsWithPrefs.length);
      return mealsWithPrefs[randomIndex];
    }
  }

  // Nasumično odaberi iz dostupnih jela
  const randomIndex = Math.floor(Math.random() * preferredMeals.length);
  return preferredMeals[randomIndex];
}

/**
 * Helper funkcija za generiranje obroka s automatskim tracking-om glavnih proteina
 */
async function generateMealWithTracking(
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
  todayMainProteins: Map<string, string[]>
): Promise<GeneratedMeal | null> {
  const slotKey = mealType === "snack" ? "snack" : mealType; // snack1, snack2, snack3 -> "snack"
  const prevProteins = previousMainProteins.get(slotKey) || [];
  
  const meal = await generateMeal(
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
    prevProteins
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
async function generateMeal(
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
  previousMainProteins?: string[] // Glavni proteini prethodnog dana za meal variety
): Promise<GeneratedMeal | null> {
  const meals = mealData[mealType] as CompositeMeal[];
  const selectedMeal = selectRandomMeal(meals, usedMealIds, usedMealNamesToday, usedMealNamesThisWeekBySlot, preferences, previousMainProteins);

  if (!selectedMeal) return null;

  // Označi kao korišten
  usedMealIds.add(selectedMeal.id);
  usedMealNamesToday.add(selectedMeal.name.toLowerCase());
  usedMealNamesThisWeekBySlot.add(selectedMeal.name.toLowerCase());

  // Izračunaj trenutne makroe (bazne vrijednosti)
  const baseComponents = calculateMealMacros(selectedMeal.components, 1);
  const baseTotals = calculateMealTotals(baseComponents);

  // POBOLJŠANJE: Ako su kalorije 0, logiraj detalje i pokušaj ponovno
  if (baseTotals.calories === 0) {
    console.error(`❌ OBROK "${selectedMeal.name}" IMA 0 KALORIJA!`);
    console.error(`   Komponente:`, selectedMeal.components.map(c => `${c.food} (${c.grams}g)`).join(', '));
    console.error(`   Izračunate komponente:`, baseComponents.map(c => `${c.name}: ${c.calories}kcal`).join(', '));
    
    // Pokušaj ručno izračunati makroe za svaku komponentu
    let manualCalories = 0;
    for (const comp of selectedMeal.components) {
      const namirnica = findNamirnica(comp.food);
      if (namirnica) {
        const macros = calculateMacrosForGrams(namirnica, comp.grams);
        manualCalories += macros.calories;
        console.log(`   ✓ ${comp.food}: pronađena namirnica, ${macros.calories.toFixed(0)} kcal`);
      } else {
        console.warn(`   ✗ ${comp.food}: NIJE PRONAĐENA U BAZI!`);
      }
    }
    
    if (manualCalories > 0) {
      console.log(`   💡 Ručno izračunato: ${manualCalories.toFixed(0)} kcal - postoji greška u calculateMealMacros!`);
    }
    
    return null;
  }

  // NOVA SCALING LOGIKA - prioritet makronutrijentima
  // Primarni faktor: protein, sekundarni: carbs, treći: fat
  // Sve mora biti unutar ±10% od dnevnih makro ciljeva
  
  // Izračunaj faktore skaliranja za svaki makro
  const proteinFactor = baseTotals.protein > 0 ? targetProtein / baseTotals.protein : 1;
  const carbsFactor = baseTotals.carbs > 0 ? targetCarbs / baseTotals.carbs : 1;
  const fatFactor = baseTotals.fat > 0 ? targetFat / baseTotals.fat : 1;
  
  // Izračunaj odstupanja za sqrt formulu
  const proteinDiff = baseTotals.protein > 0 ? Math.abs(targetProtein - baseTotals.protein) / targetProtein : 0;
  const carbDiff = baseTotals.carbs > 0 ? Math.abs(targetCarbs - baseTotals.carbs) / targetCarbs : 0;
  const fatDiff = baseTotals.fat > 0 ? Math.abs(targetFat - baseTotals.fat) / targetFat : 0;
  
  // Koristi sqrt formula za kombinirani faktor
  // scale = sqrt((proteinDiff² * 0.5) + (carbDiff² * 0.3) + (fatDiff² * 0.2))
  const combinedDiff = Math.sqrt(
    (proteinDiff * proteinDiff * 0.5) +
    (carbDiff * carbDiff * 0.3) +
    (fatDiff * fatDiff * 0.2)
  );
  
  // Kombiniraj faktore s prioritetom na protein
  // Primarni: protein (50%), sekundarni: carbs (30%), treći: fat (20%)
  let scaleFactor = proteinFactor * 0.5 + carbsFactor * 0.3 + fatFactor * 0.2;
  
  // Ograniči skaliranje (0.7x - 1.8x) za realistične porcije
  // Sprječava nerealne porcije (npr. 400g whey-a ili 300g PB)
  const minScale = 0.7;
  const maxScale = 1.8;
  scaleFactor = Math.max(minScale, Math.min(maxScale, scaleFactor));

  // Primijeni skaliranje
  let scaledComponents = calculateMealMacros(selectedMeal.components, scaleFactor);
  let scaledTotals = calculateMealTotals(scaledComponents);

  // PRO RAZINA - kalorijske granice su samo smjernice, ne stroga ograničenja
  // Prioritet je postizanje točnog dnevnog targeta!
  // Provjeri granice samo ako su previše ekstremne
  const limits = MEAL_CALORIE_LIMITS[mealType];
  if (limits) {
    // Ako je previše malo (ispod minimuma), povećaj
    if (scaledTotals.calories < limits.min) {
      const adjustFactor = limits.min / scaledTotals.calories;
      scaledComponents = calculateMealMacros(selectedMeal.components, scaleFactor * adjustFactor);
      scaledTotals = calculateMealTotals(scaledComponents);
    }
    // Ako je previše veliko (više od 2x maksimuma), smanji
    // Ali dozvoli do 1.5x maksimuma za fleksibilnost
    else if (scaledTotals.calories > limits.max * 2) {
      const adjustFactor = (limits.max * 1.5) / scaledTotals.calories;
      scaledComponents = calculateMealMacros(selectedMeal.components, scaleFactor * adjustFactor);
      scaledTotals = calculateMealTotals(scaledComponents);
    }
    // Ako je između max i 2x max, dozvoli (fleksibilnost za postizanje targeta)
  }

  const meal: GeneratedMeal = {
    id: selectedMeal.id,
    name: selectedMeal.name,
    description: selectedMeal.description,
    image: selectedMeal.image,
    preparationTip: selectedMeal.preparationTip,
    components: scaledComponents,
    totals: scaledTotals,
  };

  // VAŽNO: Edamam validacija se NE poziva ovdje jer bi uzrokovala osilacije
  // Edamam validacija će se pozvati NAKON scaleAllMealsToTarget u glavnoj petlji
  // Tako će svi obroci biti prvo skalirani na target, a zatim validirani s Edamam API-jem
  
  return meal;
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
  const MAX_ITERATIONS = 150; // Povećano za maksimalnu preciznost
  const CALORIE_TOLERANCE = 50; // ±50 kcal (povećano da osigura postizanje targeta)
  const MACRO_TOLERANCE = 0.03; // ±3% (povećano za bolje skaliranje)
  
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

    // NOVA SCALING LOGIKA - prioritet ovisi o cilju
    const proteinFactor = targetProtein / currentTotals.protein;
    const carbsFactor = targetCarbs / currentTotals.carbs;
    const fatFactor = targetFat / currentTotals.fat;
    
    // Izračunaj odstupanja za sqrt formulu
    const proteinDiff = Math.abs(currentTotals.protein - targetProtein) / targetProtein;
    const carbDiff = Math.abs(currentTotals.carbs - targetCarbs) / targetCarbs;
    const fatDiff = Math.abs(currentTotals.fat - targetFat) / targetFat;
    
    // Kombiniraj faktore OVISNO O CILJU
    let combinedFactor: number;
    if (goalType === "gain") {
      // GAIN: prioritet UGLJIKOHIDRATI > protein > fat
      combinedFactor = carbsFactor * 0.55 + proteinFactor * 0.30 + fatFactor * 0.15;
    } else if (goalType === "lose") {
      // LOSE: prioritet PROTEIN > carbs > fat  
      combinedFactor = proteinFactor * 0.50 + carbsFactor * 0.30 + fatFactor * 0.20;
    } else {
      // MAINTAIN: uravnoteženo
      combinedFactor = proteinFactor * 0.35 + carbsFactor * 0.35 + fatFactor * 0.30;
    }

    // Za lose: kalorije ≤ target (nikad više!)
    if (goalType === "lose" && currentTotals.calories > targetCalories) {
      combinedFactor = Math.min(combinedFactor, targetCalories / currentTotals.calories);
    }

    // Za gain: kalorije ≥ target (nikad manje!)
    if (goalType === "gain" && currentTotals.calories < targetCalories) {
      combinedFactor = Math.max(combinedFactor, targetCalories / currentTotals.calories);
    }

    // Za maintain: kalorije trebaju biti što bliže targetu (osiguraj da nisu preniske)
    // Ako su kalorije > 5% ispod targeta, povećaj ih
    if (goalType === "maintain" && currentTotals.calories < targetCalories * 0.95) {
      const maintainFactor = targetCalories / currentTotals.calories;
      combinedFactor = Math.max(combinedFactor, maintainFactor);
      console.log(`   ⚠️ MAINTAIN: Kalorije (${currentTotals.calories}) su ${((1 - currentTotals.calories / targetCalories) * 100).toFixed(1)}% ispod targeta, povećavam faktor na ${maintainFactor.toFixed(2)}`);
    }

    // INTELIGENTNO SKALIRANJE PO KATEGORIJAMA
    // Umjesto jednog faktora, računamo zasebne faktore za protein, carb i fat namirnice
    // Povećane granice za bolje skaliranje i manje osilacije
    // VAŽNO: Ako su kalorije preniske, povećaj granice za skaliranje
    const isCaloriesTooLow = currentTotals.calories < targetCalories * 0.90; // > 10% ispod targeta
    
    // Protein: 0.3-2.5 (povećano ako su kalorije preniske)
    const proteinScaleMax = isCaloriesTooLow ? 2.5 : 2.0;
    const proteinScale = Math.max(0.3, Math.min(proteinScaleMax, proteinFactor));
    
    // UH: 0.5-2.0 (povećano ako su kalorije preniske - carbs su glavni izvor kalorija)
    const carbsScaleMax = isCaloriesTooLow ? 2.0 : 1.8;
    const carbsScale = Math.max(0.5, Math.min(carbsScaleMax, carbsFactor));
    
    // Masti: 0.4-1.8 (povećano ako su kalorije preniske)
    const fatScaleMax = isCaloriesTooLow ? 1.8 : 1.7;
    const fatScale = Math.max(0.4, Math.min(fatScaleMax, fatFactor));
    
    if (isCaloriesTooLow) {
      console.log(`   ⚠️ Kalorije su ${((1 - currentTotals.calories / targetCalories) * 100).toFixed(1)}% ispod targeta - povećavam granice skaliranja`);
    }

    // Skaliraj sve obroke
    const scaledMeals: Record<string, GeneratedMeal> = {};

    for (const [mealType, meal] of Object.entries(currentMeals)) {
      const scaledComponents = meal.components.map(comp => {
        // Koristi comp.food (originalni food key) ako postoji, inače comp.name
        const foodKey = comp.food || comp.name || '';
        const namirnica = findNamirnica(foodKey);
        if (!namirnica) {
          console.warn(`⚠️ Namirnica nije pronađena: ${foodKey}`);
          return comp;
        }

        // Odredi kategoriju namirnice i primijeni odgovarajući faktor
        let scaleFactor = 1.0;
        const category = namirnica.category;
        
        if (category === 'protein') {
          // Protein namirnice - skaliraj prema protein faktoru
          scaleFactor = proteinScale;
        } else if (category === 'carb') {
          // UH namirnice - skaliraj prema carbs faktoru
          scaleFactor = carbsScale;
        } else if (category === 'fat') {
          // Masne namirnice - skaliraj prema fat faktoru
          scaleFactor = fatScale;
        } else {
          // Ostalo (povrće, voće, mliječni) - koristi kombinirani faktor
          scaleFactor = Math.max(0.6, Math.min(1.6, combinedFactor));
        }

        // VAŽNO: Ako su kalorije preniske, povećaj granice za portion limits
        // Ovo osigurava da se može postići target kalorija
        let newGrams = comp.grams * scaleFactor;
        
        // Ako su kalorije > 10% ispod targeta, povećaj maksimalne granice za 50%
        if (currentTotals.calories < targetCalories * 0.90) {
          const limits = getPortionLimits(foodKey, goalType);
          const adjustedMax = Math.round(limits.max * 1.5); // Povećaj max za 50%
          newGrams = Math.max(limits.min, Math.min(adjustedMax, Math.round(newGrams / 5) * 5));
        } else {
          newGrams = clampToPortionLimits(foodKey, newGrams, goalType);
        }
        const macros = calculateMacrosForGrams(namirnica, newGrams);

        return {
          ...comp,
          food: foodKey, // Spremi food key za kasnije mapiranje
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

        const adjustedComponents = scaledComponents.map(comp => {
            const foodKey = comp.food || comp.name || '';
            const namirnica = findNamirnica(foodKey);
          if (!namirnica) {
            console.warn(`⚠️ Namirnica nije pronađena za prilagodbu: ${foodKey}`);
            return comp;
          }

          const newGrams = clampToPortionLimits(foodKey, comp.grams * adjustFactor);
                  const macros = calculateMacrosForGrams(namirnica, newGrams);

              return {
                ...comp,
                food: foodKey, // Spremi food key
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
  
  // Povećana tolerancija za fine-tuning (15% umjesto 10%) i manje stroga provjera
  // Fine-tuning se izvršava ako smo unutar 15% ali izvan stroge tolerancije
  if ((calDiff <= 150 || calDiff / targetCalories <= 0.15) && 
      proteinDiff <= 0.15 && carbsDiff <= 0.15 && fatDiff <= 0.15 &&
      (calDiff > CALORIE_TOLERANCE || proteinDiff > MACRO_TOLERANCE || carbsDiff > MACRO_TOLERANCE || fatDiff > MACRO_TOLERANCE)) {
    
    // Izračunaj faktore za točno postizanje targeta
    const calFactor = targetCalories / checkCalories;
    const proteinFactor = targetProtein / checkProtein;
    const carbsFactor = targetCarbs / checkCarbs;
    const fatFactor = targetFat / checkFat;
    
    // Kombiniraj faktore s većom težinom na protein (jer je najvažniji)
    // Protein ima 40% težine, ostali 20% svaki
    const fineTuneFactor = proteinFactor * 0.4 + carbsFactor * 0.2 + fatFactor * 0.2 + calFactor * 0.2;
    
    // Smanjene granice za fine-tuning (0.90x - 1.10x) za manje osilacije u makronutrijentima
    const fineScale = Math.max(0.90, Math.min(1.10, fineTuneFactor));
    
    // Primijeni fine-tuning s različitim faktorima po kategorijama
    const fineTunedMeals: Record<string, GeneratedMeal> = {};
    for (const [mealType, meal] of Object.entries(currentMeals)) {
      const fineComponents = meal.components.map(comp => {
        const foodKey = comp.food || comp.name || '';
        const namirnica = findNamirnica(foodKey);
        if (!namirnica) {
          console.warn(`⚠️ Namirnica nije pronađena za fine-tuning: ${foodKey}`);
          return comp;
        }
        
        // Primijeni različite faktore po kategorijama za bolju preciznost
        // VAŽNO: Koristi manje agresivne faktore da se smanje osilacije
        let componentScale = fineScale;
        const category = namirnica.category;
        
        // Ograniči faktore na manji raspon (0.90-1.10) za fine-tuning da se smanje osilacije
        if (category === 'protein') {
          // Protein namirnice - koristi protein faktor direktno (ograničen na ±10%)
          componentScale = Math.max(0.90, Math.min(1.10, proteinFactor));
        } else if (category === 'carb') {
          // UH namirnice - koristi carbs faktor (ograničen na ±10%)
          componentScale = Math.max(0.90, Math.min(1.10, carbsFactor));
        } else if (category === 'fat') {
          // Masne namirnice - koristi fat faktor (ograničen na ±10%)
          componentScale = Math.max(0.90, Math.min(1.10, fatFactor));
        } else {
          // Ostalo koristi kombinirani faktor (ograničen na ±10%)
          componentScale = Math.max(0.90, Math.min(1.10, fineScale));
        }
        
        const newGrams = clampToPortionLimits(foodKey, comp.grams * componentScale);
        const macros = calculateMacrosForGrams(namirnica, newGrams);
        
        return {
          ...comp,
          food: foodKey, // Spremi food key
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
  console.log(`      Kalorije: ${finalTotals.calories} kcal (target: ${targetCalories}, razlika: ${finalCalDiff} kcal, ${((finalCalDiff / targetCalories) * 100).toFixed(2)}%) ${finalCalDiff <= CALORIE_TOLERANCE ? '✅' : '⚠️'}`);
  console.log(`      Protein: ${finalTotals.protein}g (target: ${targetProtein}g, odstupanje: ${(finalProteinDev * 100).toFixed(2)}%) ${finalProteinDev <= MACRO_TOLERANCE ? '✅' : '⚠️'}`);
  console.log(`      Carbs: ${finalTotals.carbs}g (target: ${targetCarbs}g, odstupanje: ${(finalCarbsDev * 100).toFixed(2)}%) ${finalCarbsDev <= MACRO_TOLERANCE ? '✅' : '⚠️'}`);
  console.log(`      Fat: ${finalTotals.fat}g (target: ${targetFat}g, odstupanje: ${(finalFatDev * 100).toFixed(2)}%) ${finalFatDev <= MACRO_TOLERANCE ? '✅' : '⚠️'}`);
  console.log(`      Kalorije iz makroa: ${Math.round(finalProtein * 4 + finalCarbs * 4 + finalFat * 9)} kcal (provjera: ${finalTotals.calories === Math.round(finalProtein * 4 + finalCarbs * 4 + finalFat * 9) ? '✅' : '❌'})`);

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
  
  // Provjeri broj dostupnih jela
  const mealData = mealComponentsData as MealComponentsData;
  console.log(`📊 Dostupna jela:`);
  console.log(`   - Doručak: ${mealData.breakfast.length} jela`);
  console.log(`   - Ručak: ${mealData.lunch.length} jela`);
  console.log(`   - Večera: ${mealData.dinner.length} jela`);
  console.log(`   - Međuobroci: ${mealData.snack.length} jela`);
  
  // 1. Dohvati korisničke kalkulacije (NIKAD ne računa - samo čita!)
  const calculations = await getUserCalculations(userId);
  console.log(`✅ Kalkulacije iz DB: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`);
  console.log(`🎯 Cilj: ${calculations.goalType}`);
  
  // Postavi aktivni cilj za portion limits
  ACTIVE_GOAL_TYPE = calculations.goalType;
  console.log(`📏 Aktivirani PORTION_LIMITS za: ${ACTIVE_GOAL_TYPE} mode`);

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

  // 2.5 GAIN MODE AUTOMATSKI KORISTI 6 OBROKA (ako nije eksplicitno postavljeno drugačije)
  if (calculations.goalType === "gain" && preferences.desiredMealsPerDay === 5) {
    preferences.desiredMealsPerDay = 6;
    console.log(`🍽️ GAIN MODE: Automatski povećan broj obroka na 6 za lakše postizanje kalorija`);
  }

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

    // Generiraj obroke prema broju obroka
    const meals: Record<string, GeneratedMeal> = {};

    if (preferences.desiredMealsPerDay === 3) {
      // 3 obroka: breakfast, lunch, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = await generateMealWithTracking(
      "breakfast",
      mealData,
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        usedMealIdsToday, 
        usedMealNamesToday, 
        breakfastSlot, 
        preferences,
        previousDayMainProteins,
        todayMainProteins
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = await generateMealWithTracking(
        "lunch", 
      mealData,
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        usedMealIdsToday, 
        usedMealNamesToday, 
        lunchSlot, 
        preferences,
        previousDayMainProteins,
        todayMainProteins
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = await generateMealWithTracking(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        usedMealIdsToday, 
        usedMealNamesToday, 
        dinnerSlot, 
        preferences,
        previousDayMainProteins,
        todayMainProteins
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);

    } else if (preferences.desiredMealsPerDay === 5) {
      // 5 obroka: breakfast, snack1, lunch, snack2, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = await generateMeal(
        "breakfast", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        usedMealIdsToday, 
        usedMealNamesToday, 
        breakfastSlot, 
        preferences
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);

      const snack1Slot = weeklyUsedMealNamesBySlot.get("snack1") || new Set<string>();
      const snack1 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack1,
        calculations.targetProtein * mealDistribution.protein.snack1,
        calculations.targetCarbs * mealDistribution.carbs.snack1,
        calculations.targetFat * mealDistribution.fat.snack1,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack1Slot, 
        preferences
      );
      if (!snack1) throw new Error(`Nije moguće generirati međuobrok 1 za dan ${i + 1}`);
      meals.snack1 = snack1;
      snack1Slot.add(snack1.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack1", snack1Slot);

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = await generateMeal(
        "lunch", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        usedMealIdsToday, 
        usedMealNamesToday, 
        lunchSlot, 
        preferences
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

      const snack2Slot = weeklyUsedMealNamesBySlot.get("snack2") || new Set<string>();
      const snack2 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack2,
        calculations.targetProtein * mealDistribution.protein.snack2,
        calculations.targetCarbs * mealDistribution.carbs.snack2,
        calculations.targetFat * mealDistribution.fat.snack2,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack2Slot, 
        preferences
      );
      if (!snack2) throw new Error(`Nije moguće generirati međuobrok 2 za dan ${i + 1}`);
      meals.snack2 = snack2;
      snack2Slot.add(snack2.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack2", snack2Slot);

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = await generateMeal(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        usedMealIdsToday, 
        usedMealNamesToday, 
        dinnerSlot, 
        preferences
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);

    } else {
      // 6 obroka: breakfast, snack1, lunch, snack2, snack3, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = await generateMeal(
        "breakfast", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        usedMealIdsToday, 
        usedMealNamesToday, 
        breakfastSlot, 
        preferences
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);

      const snack1Slot = weeklyUsedMealNamesBySlot.get("snack1") || new Set<string>();
      const snack1 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack1,
        calculations.targetProtein * mealDistribution.protein.snack1,
        calculations.targetCarbs * mealDistribution.carbs.snack1,
        calculations.targetFat * mealDistribution.fat.snack1,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack1Slot, 
        preferences
      );
      if (!snack1) throw new Error(`Nije moguće generirati međuobrok 1 za dan ${i + 1}`);
      meals.snack1 = snack1;
      snack1Slot.add(snack1.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack1", snack1Slot);

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = await generateMeal(
        "lunch", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        usedMealIdsToday, 
        usedMealNamesToday, 
        lunchSlot, 
        preferences
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

      const snack2Slot = weeklyUsedMealNamesBySlot.get("snack2") || new Set<string>();
      const snack2 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack2,
        calculations.targetProtein * mealDistribution.protein.snack2,
        calculations.targetCarbs * mealDistribution.carbs.snack2,
        calculations.targetFat * mealDistribution.fat.snack2,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack2Slot, 
        preferences
      );
      if (!snack2) throw new Error(`Nije moguće generirati međuobrok 2 za dan ${i + 1}`);
      meals.snack2 = snack2;
      snack2Slot.add(snack2.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack2", snack2Slot);

      const snack3Slot = weeklyUsedMealNamesBySlot.get("snack3") || new Set<string>();
      const snack3 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack3,
        calculations.targetProtein * mealDistribution.protein.snack3,
        calculations.targetCarbs * mealDistribution.carbs.snack3,
        calculations.targetFat * mealDistribution.fat.snack3,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack3Slot, 
        preferences
      );
      if (!snack3) throw new Error(`Nije moguće generirati međuobrok 3 za dan ${i + 1}`);
      meals.snack3 = snack3;
      snack3Slot.add(snack3.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack3", snack3Slot);

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = await generateMeal(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        usedMealIdsToday, 
        usedMealNamesToday, 
        dinnerSlot, 
        preferences
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);
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

    // Provjeri odstupanja
    const calDev = Math.abs(dailyTotals.calories - calculations.targetCalories) / calculations.targetCalories;
    const proteinDev = Math.abs(dailyTotals.protein - calculations.targetProtein) / calculations.targetProtein;
    const carbsDev = Math.abs(dailyTotals.carbs - calculations.targetCarbs) / calculations.targetCarbs;
    const fatDev = Math.abs(dailyTotals.fat - calculations.targetFat) / calculations.targetFat;
        const maxDev = Math.max(calDev, proteinDev, carbsDev, fatDev);

    console.log(`   📊 Dnevni total: ${dailyTotals.calories} kcal, P: ${dailyTotals.protein}g, C: ${dailyTotals.carbs}g, F: ${dailyTotals.fat}g`);
    console.log(`   🎯 Target: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`);
    console.log(`   📈 Odstupanje: ${(maxDev * 100).toFixed(1)}%`);

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

  // Napomena o suplementaciji
  const supplementNote = "💪 NAPOMENA: Između obroka i nakon treninga, sukladno vlastitim potrebama, preporuča se konzumacija whey proteina kao suplementacije i dodatka prehrani - miješati s vodom.";

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
    supplementNote,
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

/**
 * Generate weekly meal plan with direct calculations (no userId required)
 * This is a wrapper that creates a temporary user context and uses the existing generateWeeklyMealPlan logic
 */
export async function generateWeeklyMealPlanWithCalculations(
  directCalculations: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    goalType: 'lose' | 'maintain' | 'gain';
    bmr?: number;
    tdee?: number;
    preferences?: {
      allergies?: string;
      foodPreferences?: string;
      avoidIngredients?: string;
      trainingFrequency?: string;
    };
  }
): Promise<WeeklyMealPlan> {
  console.log("🚀 Pokretanje profesionalnog generatora tjednog plana prehrane (direct calculations mode)...");
  console.log(`✅ Kalkulacije: ${directCalculations.targetCalories} kcal, P: ${directCalculations.targetProtein}g, C: ${directCalculations.targetCarbs}g, F: ${directCalculations.targetFat}g`);
  console.log(`🎯 Cilj: ${directCalculations.goalType}`);
  
  try {
    // Convert to UserCalculations format
    const calculations: UserCalculations = {
      targetCalories: Math.round(directCalculations.targetCalories),
      targetProtein: Math.round(directCalculations.targetProtein * 10) / 10,
      targetCarbs: Math.round(directCalculations.targetCarbs * 10) / 10,
      targetFat: Math.round(directCalculations.targetFat * 10) / 10,
      goalType: directCalculations.goalType,
      bmr: directCalculations.bmr ? Math.round(directCalculations.bmr) : 0,
      tdee: directCalculations.tdee ? Math.round(directCalculations.tdee) : 0,
    };

    // Validacija
    if (calculations.targetCalories <= 0 || calculations.targetProtein <= 0 || calculations.targetCarbs <= 0 || calculations.targetFat <= 0) {
      throw new Error(`Nevaljane kalkulacije: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`);
    }

    // Postavi aktivni cilj za portion limits
    ACTIVE_GOAL_TYPE = calculations.goalType;
    console.log(`📏 Aktivirani PORTION_LIMITS za: ${ACTIVE_GOAL_TYPE} mode`);

    // Parse preferences from intake flow data
    let preferences: UserPreferences = {
      avoidIngredients: [],
      preferredIngredients: [],
      desiredMealsPerDay: 5,
    };

    // Parse preferences from provided data (like web version)
    if (directCalculations.preferences) {
      const { allergies, foodPreferences, avoidIngredients, trainingFrequency } = directCalculations.preferences;
      
      // Combine all allergy/preference text
      const combinedText = [
        allergies,
        foodPreferences,
        avoidIngredients,
      ].filter(Boolean).join('. ');

      if (combinedText) {
        const parsedPrefs = parseUserPreferences(combinedText);
        preferences.avoidIngredients = parsedPrefs.avoidIngredients;
        preferences.preferredIngredients = parsedPrefs.preferredIngredients;
        
        // Parse meal frequency from training frequency or preferences
        if (trainingFrequency) {
          // Training frequency might indicate meal frequency preference
          // e.g., "3-days" might mean 3 meals, "5-days" might mean 5 meals
          const freqMatch = trainingFrequency.match(/(\d+)/);
          if (freqMatch) {
            const freq = parseInt(freqMatch[1]);
            if (freq === 3 || freq === 5 || freq === 6) {
              preferences.desiredMealsPerDay = freq as 3 | 5 | 6;
            }
          }
        }
        
        // Use parsed meal frequency if available
        if (parsedPrefs.desiredMealsPerDay !== 5) {
          preferences.desiredMealsPerDay = parsedPrefs.desiredMealsPerDay;
        }
        
        console.log(`🚫 Izbjegavane namirnice: ${preferences.avoidIngredients.join(", ") || "nema"}`);
        console.log(`✅ Preferirane namirnice: ${preferences.preferredIngredients.join(", ") || "nema"}`);
      }
    }

    // GAIN MODE AUTOMATSKI KORISTI 6 OBROKA (ako nije eksplicitno postavljeno drugačije)
    if (calculations.goalType === "gain" && preferences.desiredMealsPerDay === 5) {
      preferences.desiredMealsPerDay = 6;
      console.log(`🍽️ GAIN MODE: Automatski povećan broj obroka na 6 za lakše postizanje kalorija`);
    }
    
    console.log(`🍽️ Broj obroka: ${preferences.desiredMealsPerDay}`);

  // Učitaj podatke o obrocima
  const mealData = mealComponentsData as MealComponentsData;

  // Odredi distribuciju kalorija I makroa po obrocima
  const mealDistribution = getMealDistribution(preferences.desiredMealsPerDay, calculations.goalType);

  // Generiraj 7 dana (koristi istu logiku kao generateWeeklyMealPlan)
  const days: DailyPlan[] = [];
  const dayNames = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + daysToMonday);

  // Tracking kroz cijeli tjedan
  const weeklyUsedMealNamesBySlot: Map<string, Set<string>> = new Map();
  const previousDayMainProteins: Map<string, string[]> = new Map();

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];

    console.log(`\n📅 Generiranje dana ${i + 1}/7: ${dayNames[i]} (${dateStr})`);

    const usedMealIdsToday = new Set<string>();
    const usedMealNamesToday = new Set<string>();
    const todayMainProteins: Map<string, string[]> = new Map();

    const meals: Record<string, GeneratedMeal> = {};

    // Use the same meal generation logic as generateWeeklyMealPlan
    if (preferences.desiredMealsPerDay === 3) {
      // 3 obroka: breakfast, lunch, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = await generateMealWithTracking(
        "breakfast",
        mealData,
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        usedMealIdsToday, 
        usedMealNamesToday, 
        breakfastSlot, 
        preferences,
        previousDayMainProteins,
        todayMainProteins
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = await generateMealWithTracking(
        "lunch", 
        mealData,
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        usedMealIdsToday, 
        usedMealNamesToday, 
        lunchSlot, 
        preferences,
        previousDayMainProteins,
        todayMainProteins
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = await generateMealWithTracking(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        usedMealIdsToday, 
        usedMealNamesToday, 
        dinnerSlot, 
        preferences,
        previousDayMainProteins,
        todayMainProteins
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);

    } else if (preferences.desiredMealsPerDay === 5) {
      // 5 obroka: breakfast, snack1, lunch, snack2, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = await generateMeal(
        "breakfast", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        usedMealIdsToday, 
        usedMealNamesToday, 
        breakfastSlot, 
        preferences
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);

      const snack1Slot = weeklyUsedMealNamesBySlot.get("snack1") || new Set<string>();
      const snack1 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack1,
        calculations.targetProtein * mealDistribution.protein.snack1,
        calculations.targetCarbs * mealDistribution.carbs.snack1,
        calculations.targetFat * mealDistribution.fat.snack1,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack1Slot, 
        preferences
      );
      if (!snack1) throw new Error(`Nije moguće generirati međuobrok 1 za dan ${i + 1}`);
      meals.snack1 = snack1;
      snack1Slot.add(snack1.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack1", snack1Slot);

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = await generateMeal(
        "lunch", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        usedMealIdsToday, 
        usedMealNamesToday, 
        lunchSlot, 
        preferences
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

      const snack2Slot = weeklyUsedMealNamesBySlot.get("snack2") || new Set<string>();
      const snack2 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack2,
        calculations.targetProtein * mealDistribution.protein.snack2,
        calculations.targetCarbs * mealDistribution.carbs.snack2,
        calculations.targetFat * mealDistribution.fat.snack2,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack2Slot, 
        preferences
      );
      if (!snack2) throw new Error(`Nije moguće generirati međuobrok 2 za dan ${i + 1}`);
      meals.snack2 = snack2;
      snack2Slot.add(snack2.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack2", snack2Slot);

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = await generateMeal(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        usedMealIdsToday, 
        usedMealNamesToday, 
        dinnerSlot, 
        preferences
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);

    } else {
      // 6 obroka: breakfast, snack1, lunch, snack2, snack3, dinner
      const breakfastSlot = weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
      const breakfast = await generateMeal(
        "breakfast", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.breakfast,
        calculations.targetProtein * mealDistribution.protein.breakfast,
        calculations.targetCarbs * mealDistribution.carbs.breakfast,
        calculations.targetFat * mealDistribution.fat.breakfast,
        usedMealIdsToday, 
        usedMealNamesToday, 
        breakfastSlot, 
        preferences
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);

      const snack1Slot = weeklyUsedMealNamesBySlot.get("snack1") || new Set<string>();
      const snack1 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack1,
        calculations.targetProtein * mealDistribution.protein.snack1,
        calculations.targetCarbs * mealDistribution.carbs.snack1,
        calculations.targetFat * mealDistribution.fat.snack1,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack1Slot, 
        preferences
      );
      if (!snack1) throw new Error(`Nije moguće generirati međuobrok 1 za dan ${i + 1}`);
      meals.snack1 = snack1;
      snack1Slot.add(snack1.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack1", snack1Slot);

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = await generateMeal(
        "lunch", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.lunch,
        calculations.targetProtein * mealDistribution.protein.lunch,
        calculations.targetCarbs * mealDistribution.carbs.lunch,
        calculations.targetFat * mealDistribution.fat.lunch,
        usedMealIdsToday, 
        usedMealNamesToday, 
        lunchSlot, 
        preferences
      );
      if (!lunch) throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
      meals.lunch = lunch;
      lunchSlot.add(lunch.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

      const snack2Slot = weeklyUsedMealNamesBySlot.get("snack2") || new Set<string>();
      const snack2 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack2,
        calculations.targetProtein * mealDistribution.protein.snack2,
        calculations.targetCarbs * mealDistribution.carbs.snack2,
        calculations.targetFat * mealDistribution.fat.snack2,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack2Slot, 
        preferences
      );
      if (!snack2) throw new Error(`Nije moguće generirati međuobrok 2 za dan ${i + 1}`);
      meals.snack2 = snack2;
      snack2Slot.add(snack2.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack2", snack2Slot);

      const snack3Slot = weeklyUsedMealNamesBySlot.get("snack3") || new Set<string>();
      const snack3 = await generateMeal(
        "snack", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.snack3,
        calculations.targetProtein * mealDistribution.protein.snack3,
        calculations.targetCarbs * mealDistribution.carbs.snack3,
        calculations.targetFat * mealDistribution.fat.snack3,
        usedMealIdsToday, 
        usedMealNamesToday, 
        snack3Slot, 
        preferences
      );
      if (!snack3) throw new Error(`Nije moguće generirati međuobrok 3 za dan ${i + 1}`);
      meals.snack3 = snack3;
      snack3Slot.add(snack3.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("snack3", snack3Slot);

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = await generateMeal(
        "dinner", 
        mealData, 
        calculations.targetCalories * mealDistribution.calories.dinner,
        calculations.targetProtein * mealDistribution.protein.dinner,
        calculations.targetCarbs * mealDistribution.carbs.dinner,
        calculations.targetFat * mealDistribution.fat.dinner,
        usedMealIdsToday, 
        usedMealNamesToday, 
        dinnerSlot, 
        preferences
      );
      if (!dinner) throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
      meals.dinner = dinner;
      dinnerSlot.add(dinner.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);
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

    // Validiraj sve obroke s Edamam API-om NAKON skaliranja (za točnije podatke)
    // VAŽNO: Edamam validacija se koristi samo za provjeru i logiranje, NE mijenja makroe
    // Ovo sprječava osilacije jer se makroe ne mijenjaju nakon skaliranja
    const validatedMeals: Record<string, GeneratedMeal> = {};
    for (const [mealType, meal] of Object.entries(scaledMeals)) {
      // Validiraj ali ne mijenjaj makroe (samo logiraj razlike)
      const edamamValidated = await validateMealWithEdamam(meal);
      
      // Ako je Edamam validacija promijenila makroe, provjeri razliku
      const calDiff = Math.abs(edamamValidated.totals.calories - meal.totals.calories);
      const proteinDiff = Math.abs(edamamValidated.totals.protein - meal.totals.protein);
      const carbsDiff = Math.abs(edamamValidated.totals.carbs - meal.totals.carbs);
      const fatDiff = Math.abs(edamamValidated.totals.fat - meal.totals.fat);
      
      // VAŽNO: Koristi Edamam podatke samo ako su točniji, ali provjeri da ne smanjuju kalorije previše
      // Ako Edamam smanjuje kalorije za > 5%, zadrži skalirane makroe (osigurava target)
      const edamamReducesCalories = edamamValidated.totals.calories < meal.totals.calories;
      const calorieReductionPercent = edamamReducesCalories 
        ? ((meal.totals.calories - edamamValidated.totals.calories) / meal.totals.calories) * 100
        : 0;
      
      if (calDiff > meal.totals.calories * 0.10 || 
          proteinDiff > meal.totals.protein * 0.10 ||
          carbsDiff > meal.totals.carbs * 0.10 ||
          fatDiff > meal.totals.fat * 0.10) {
        // Ako Edamam smanjuje kalorije previše (> 5%), zadrži skalirane makroe
        if (edamamReducesCalories && calorieReductionPercent > 5) {
          console.log(`⚠️ Edamam smanjuje kalorije za ${calorieReductionPercent.toFixed(1)}% u ${mealType}: zadržavam skalirane makroe`);
          validatedMeals[mealType] = meal;
        } else {
          console.log(`✅ Koristim Edamam podatke za ${mealType} (razlika: ${calDiff.toFixed(0)} kcal)`);
          validatedMeals[mealType] = edamamValidated;
        }
      } else {
        // Zadrži skalirane makroe (manje osilacije)
        validatedMeals[mealType] = meal;
      }
    }

    // DODATNO SKALIRANJE NAKON EDAMAM VALIDACIJE (samo ako je potrebno)
    // Provjeri da li su makroe unutar tolerancije
    const checkTotals = Object.values(validatedMeals).reduce(
      (totals, meal) => ({
        protein: totals.protein + meal.totals.protein,
        carbs: totals.carbs + meal.totals.carbs,
        fat: totals.fat + meal.totals.fat,
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
    
    const checkProtein = Math.round(checkTotals.protein * 10) / 10;
    const checkCarbs = Math.round(checkTotals.carbs * 10) / 10;
    const checkFat = Math.round(checkTotals.fat * 10) / 10;
    const checkCalories = Math.round(checkProtein * 4 + checkCarbs * 4 + checkFat * 9);
    
    const calDiff = Math.abs(checkCalories - calculations.targetCalories);
    const proteinDiff = Math.abs(checkProtein - calculations.targetProtein) / calculations.targetProtein;
    const carbsDiff = Math.abs(checkCarbs - calculations.targetCarbs) / calculations.targetCarbs;
    const fatDiff = Math.abs(checkFat - calculations.targetFat) / calculations.targetFat;
    
    // VAŽNO: Uvijek skaliraj ako je odstupanje > 2% (ne samo 5%)
    // Ovo osigurava da se kalorije ne smanjuju previše
    let finalMeals = validatedMeals;
    const calDiffPercent = (calDiff / calculations.targetCalories) * 100;
    
    if (calDiffPercent > 2 || proteinDiff > 0.02 || carbsDiff > 0.02 || fatDiff > 0.02) {
      console.log(`   🔄 Dodatno skaliranje nakon Edamam validacije (kalorije: ${calDiffPercent.toFixed(1)}%, P: ${(proteinDiff * 100).toFixed(1)}%, C: ${(carbsDiff * 100).toFixed(1)}%, F: ${(fatDiff * 100).toFixed(1)}%)`);
      finalMeals = scaleAllMealsToTarget(
        validatedMeals,
        calculations.targetCalories,
        calculations.targetProtein,
        calculations.targetCarbs,
        calculations.targetFat,
        calculations.goalType
      );
      
      // Provjeri da li je nakon dodatnog skaliranja još uvijek odstupanje
      const finalCheckTotals = Object.values(finalMeals).reduce(
        (totals, meal) => ({
          protein: totals.protein + meal.totals.protein,
          carbs: totals.carbs + meal.totals.carbs,
          fat: totals.fat + meal.totals.fat,
        }),
        { protein: 0, carbs: 0, fat: 0 }
      );
      
      const finalCheckProtein = Math.round(finalCheckTotals.protein * 10) / 10;
      const finalCheckCarbs = Math.round(finalCheckTotals.carbs * 10) / 10;
      const finalCheckFat = Math.round(finalCheckTotals.fat * 10) / 10;
      const finalCheckCalories = Math.round(finalCheckProtein * 4 + finalCheckCarbs * 4 + finalCheckFat * 9);
      const finalCalDiff = Math.abs(finalCheckCalories - calculations.targetCalories);
      const finalCalDiffPercent = (finalCalDiff / calculations.targetCalories) * 100;
      
      // Ako je nakon skaliranja još uvijek odstupanje > 3%, pokušaj još jednom
      if (finalCalDiffPercent > 3) {
        console.warn(`   ⚠️ Nakon skaliranja kalorije su još uvijek ${finalCalDiffPercent.toFixed(1)}% od targeta (${finalCheckCalories} vs ${calculations.targetCalories})`);
        console.log(`   🔄 Pokušavam još jednom skalirati...`);
        
        // Još jednom skaliraj s agresivnijim pristupom
        const retryMeals = scaleAllMealsToTarget(
          finalMeals,
          calculations.targetCalories,
          calculations.targetProtein,
          calculations.targetCarbs,
          calculations.targetFat,
          calculations.goalType
        );
        
        // Provjeri rezultat
        const retryTotals = Object.values(retryMeals).reduce(
          (totals, meal) => ({
            protein: totals.protein + meal.totals.protein,
            carbs: totals.carbs + meal.totals.carbs,
            fat: totals.fat + meal.totals.fat,
          }),
          { protein: 0, carbs: 0, fat: 0 }
        );
        
        const retryProtein = Math.round(retryTotals.protein * 10) / 10;
        const retryCarbs = Math.round(retryTotals.carbs * 10) / 10;
        const retryFat = Math.round(retryTotals.fat * 10) / 10;
        const retryCalories = Math.round(retryProtein * 4 + retryCarbs * 4 + retryFat * 9);
        const retryCalDiff = Math.abs(retryCalories - calculations.targetCalories);
        const retryCalDiffPercent = (retryCalDiff / calculations.targetCalories) * 100;
        
        if (retryCalDiffPercent < finalCalDiffPercent) {
          console.log(`   ✅ Poboljšanje: ${retryCalDiffPercent.toFixed(1)}% (bilo ${finalCalDiffPercent.toFixed(1)}%)`);
          finalMeals = retryMeals;
        } else {
          console.log(`   ⚠️ Nema poboljšanja, zadržavam prethodne rezultate`);
        }
      }
    }

    // Izračunaj dnevne totale (zbroji makroe, zatim izračunaj kalorije)
    // Koristi finalMeals (nakon Edamam validacije i dodatnog skaliranja)
    const dailyMacroTotals = Object.values(finalMeals).reduce(
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

    days.push({
      date: dateStr,
      dayName: dayNames[i],
      meals: finalMeals, // Koristi finalne obroke (Edamam validirani + ponovno skalirani)
      dailyTotals,
    });
    
    // Ažuriraj previousDayMainProteins za sljedeći dan (meal variety)
    for (const [slot, proteins] of todayMainProteins.entries()) {
      previousDayMainProteins.set(slot, [...proteins]);
    }
  }

  // Izračunaj tjedne prosjeke (zbroji makroe, zatim izračunaj kalorije)
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

    // Napomena o suplementaciji
    const supplementNote = "💪 NAPOMENA: Između obroka i nakon treninga, sukladno vlastitim potrebama, preporuča se konzumacija whey proteina kao suplementacije i dodatka prehrani - miješati s vodom.";

    const weeklyPlan: WeeklyMealPlan = {
      userId: 'guest',
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
      supplementNote,
    };

    console.log(`\n✅ TJEDNI PLAN GENERIRAN (direct calculations mode)!`);
    console.log(`📊 Prosječno dnevno: ${weeklyTotals.avgCalories} kcal, P: ${weeklyTotals.avgProtein}g, C: ${weeklyTotals.avgCarbs}g, F: ${weeklyTotals.avgFat}g`);

    return weeklyPlan;
  } catch (error) {
    console.error("❌ Greška u generateWeeklyMealPlanWithCalculations:", error);
    throw error;
  }
}

export default {
  generateWeeklyMealPlan,
  generateWeeklyMealPlanWithCalculations,
  saveWeeklyPlanToSupabase,
};

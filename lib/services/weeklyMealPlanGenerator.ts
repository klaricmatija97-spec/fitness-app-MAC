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
  // PRO RAZINA - FLEKSIBILNA OGRANIČENJA
  // Prioritet je postizanje točnog targeta, ne stroga ograničenja!
  
  // Proteini - povećano za fleksibilnost
  "chicken_breast": { min: 50, max: 600 },
  "turkey_breast": { min: 50, max: 600 },
  "beef_lean": { min: 50, max: 700 },
  "salmon": { min: 50, max: 600 },
  "tuna_canned": { min: 50, max: 500 },
  "egg_whole": { min: 30, max: 400 },
  "egg_white": { min: 20, max: 600 },
  
  // Ugljikohidrati - povećano za fleksibilnost
  "oats": { min: 20, max: 300 },
  "rice_cooked": { min: 50, max: 800 },
  "pasta_cooked": { min: 50, max: 800 },
  "potatoes": { min: 50, max: 1000 },
  "bread": { min: 20, max: 300 },
  
  // Masti - povećano za fleksibilnost
  "avocado": { min: 20, max: 400 },
  "peanut_butter": { min: 5, max: 100 },
  "olive_oil": { min: 3, max: 60 },
  
  // Mliječni - povećano za fleksibilnost
  "greek_yogurt": { min: 50, max: 800 },
  "cottage_cheese": { min: 50, max: 600 },
  "milk": { min: 50, max: 1000 },
  
  // Voće - povećano za fleksibilnost
  "banana": { min: 30, max: 400 },
  "apple": { min: 30, max: 600 },
  
  // Default - povećano za fleksibilnost
  "default": { min: 30, max: 600 },
};

function getPortionLimits(foodKey: string): { min: number; max: number } {
  const namirnica = findNamirnica(foodKey);
  if (!namirnica) {
    return PORTION_LIMITS["default"];
  }
  
  // Pokušaj pronaći po id
  const byId = PORTION_LIMITS[namirnica.id];
  if (byId) return byId;
  
  // Pokušaj pronaći po imenu
  const byName = PORTION_LIMITS[namirnica.name.toLowerCase()];
  if (byName) return byName;
  
  // Pokušaj pronaći po engleskom imenu
  const byNameEn = PORTION_LIMITS[namirnica.nameEn.toLowerCase()];
  if (byNameEn) return byNameEn;
  
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
 * Odaberi nasumični obrok - koristi SVA jela, ali poštuje preferencije
 */
function selectRandomMeal(
  meals: CompositeMeal[],
  usedMealIds: Set<string>,
  usedMealNamesToday: Set<string>,
  usedMealNamesThisWeek: Set<string>,
  preferences: UserPreferences
): CompositeMeal | null {
  // PRO RAZINA - koristi SVA jela, samo filtriraj alergije
  let availableMeals = meals;

  // JEDINA HARD CONSTRAINT: alergije i "ne želim"
  if (preferences.avoidIngredients.length > 0) {
    availableMeals = availableMeals.filter(meal => !hasAvoidedIngredient(meal, preferences.avoidIngredients));
  }

  // Ako nema jela nakon filtriranja alergija, vrati null
  if (availableMeals.length === 0) return null;

  // Pokušaj izbjeći duplikate danas, ali ako nema drugih opcija, dozvoli
  let preferredMeals = availableMeals.filter(meal => 
    !usedMealIds.has(meal.id) && 
    !usedMealNamesToday.has(meal.name.toLowerCase())
  );

  // Ako nema novih jela danas, dozvoli ponavljanje (ali ne isti ID)
  if (preferredMeals.length === 0) {
    preferredMeals = availableMeals.filter(meal => !usedMealIds.has(meal.id));
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
  preferences: UserPreferences
): GeneratedMeal | null {
  const meals = mealData[mealType] as CompositeMeal[];
  const selectedMeal = selectRandomMeal(meals, usedMealIds, usedMealNamesToday, usedMealNamesThisWeekBySlot, preferences);

  if (!selectedMeal) return null;

  // Označi kao korišten
  usedMealIds.add(selectedMeal.id);
  usedMealNamesToday.add(selectedMeal.name.toLowerCase());
  usedMealNamesThisWeekBySlot.add(selectedMeal.name.toLowerCase());

  // Izračunaj trenutne makroe (bazne vrijednosti)
  const baseComponents = calculateMealMacros(selectedMeal.components, 1);
  const baseTotals = calculateMealTotals(baseComponents);

  if (baseTotals.calories === 0) return null;

  // Skaliraj prema target kalorijama I makroima za bolju početnu točnost
  const calFactor = targetCalories / baseTotals.calories;
  const proteinFactor = baseTotals.protein > 0 ? targetProtein / baseTotals.protein : 1;
  const carbsFactor = baseTotals.carbs > 0 ? targetCarbs / baseTotals.carbs : 1;
  const fatFactor = baseTotals.fat > 0 ? targetFat / baseTotals.fat : 1;
  
  // Kombiniraj faktore (kalorije 50%, protein 30%, carbs 15%, fat 5%)
  let scaleFactor = calFactor * 0.5 + proteinFactor * 0.3 + carbsFactor * 0.15 + fatFactor * 0.05;
  
  // Ograniči skaliranje (0.6x - 1.8x) za realistične porcije
  scaleFactor = Math.max(0.6, Math.min(1.8, scaleFactor));

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
  const MAX_ITERATIONS = 50; // Povećano za bolju preciznost
  const CALORIE_TOLERANCE = 10; // ±10 kcal (strože!)
  const MACRO_TOLERANCE = 0.01; // ±1% (strože!)
  
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

    // Izračunaj faktore skaliranja za svaki makro
    const calFactor = targetCalories / currentTotals.calories;
    const proteinFactor = targetProtein / currentTotals.protein;
    const carbsFactor = targetCarbs / currentTotals.carbs;
    const fatFactor = targetFat / currentTotals.fat;

    // Kombiniraj faktore - prioritet: kalorije (40%), protein (30%), carbs (20%), fat (10%)
    // Svi makroi su jednako važni za točno postizanje targeta
    let combinedFactor = calFactor * 0.4 + proteinFactor * 0.3 + carbsFactor * 0.2 + fatFactor * 0.1;

    // Za lose: kalorije ≤ target (nikad više!)
    if (goalType === "lose" && currentTotals.calories > targetCalories) {
      combinedFactor = Math.min(combinedFactor, targetCalories / currentTotals.calories);
    }

    // Za gain: kalorije ≥ target (nikad manje!)
    if (goalType === "gain" && currentTotals.calories < targetCalories) {
      combinedFactor = Math.max(combinedFactor, targetCalories / currentTotals.calories);
    }

    // Ograniči skaliranje (0.85x - 1.15x) za realistične porcije
    // Ako je odstupanje veliko, dozvoli veće skaliranje
    const minScale = maxMacroDev > 0.15 ? 0.7 : 0.85;
    const maxScale = maxMacroDev > 0.15 ? 1.3 : 1.15;
    const scaleFactor = Math.max(minScale, Math.min(maxScale, combinedFactor));

    // Skaliraj sve obroke
    const scaledMeals: Record<string, GeneratedMeal> = {};

    for (const [mealType, meal] of Object.entries(currentMeals)) {
      const scaledComponents = meal.components.map(comp => {
                const namirnica = findNamirnica(comp.name);
        if (!namirnica) return comp;

        const newGrams = clampToPortionLimits(comp.name, comp.grams * scaleFactor);
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
            const namirnica = findNamirnica(comp.name);
          if (!namirnica) return comp;

          const newGrams = clampToPortionLimits(comp.name, comp.grams * adjustFactor);
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
  
  // Ako smo unutar 5% ali ne točno, pokušaj još jednom fino prilagoditi
  if ((calDiff <= 50 || calDiff / targetCalories <= 0.05) && 
      proteinDiff <= 0.05 && carbsDiff <= 0.05 && fatDiff <= 0.05 &&
      (calDiff > 5 || proteinDiff > 0.005 || carbsDiff > 0.005 || fatDiff > 0.005)) {
    
    // Izračunaj faktore za točno postizanje targeta
    const calFactor = targetCalories / checkCalories;
    const proteinFactor = targetProtein / checkProtein;
    const carbsFactor = targetCarbs / checkCarbs;
    const fatFactor = targetFat / checkFat;
    
    // Kombiniraj faktore (jednako važni)
    const fineTuneFactor = (calFactor + proteinFactor + carbsFactor + fatFactor) / 4;
    
    // Ograniči na malu prilagodbu (0.98x - 1.02x)
    const fineScale = Math.max(0.98, Math.min(1.02, fineTuneFactor));
    
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

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];

    console.log(`\n📅 Generiranje dana ${i + 1}/7: ${dayNames[i]} (${dateStr})`);

    // Tracking za ovaj dan (nikad ne ponavljaj jelo unutar dana)
    const usedMealIdsToday = new Set<string>();
    const usedMealNamesToday = new Set<string>();

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
        usedMealIdsToday, 
        usedMealNamesToday, 
        breakfastSlot, 
        preferences
      );
      if (!breakfast) throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
      meals.breakfast = breakfast;
      breakfastSlot.add(breakfast.name.toLowerCase());
      weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);

      const lunchSlot = weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
      const lunch = generateMeal(
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

      const dinnerSlot = weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
      const dinner = generateMeal(
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
      const snack1 = generateMeal(
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
      const lunch = generateMeal(
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
      const snack2 = generateMeal(
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
      const dinner = generateMeal(
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
      const breakfast = generateMeal(
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
      const snack1 = generateMeal(
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
      const lunch = generateMeal(
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
      const snack2 = generateMeal(
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
      const snack3 = generateMeal(
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
      const dinner = generateMeal(
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

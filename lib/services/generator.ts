/**
 * GENERATOR ZA DNEVNI PLAN PREHRANE
 * 
 * Koristi postojeće helper funkcije i modele za generiranje dnevnog plana prehrane.
 * Nema nasumičnosti - sve ovisi o scoring funkciji.
 */

import { chooseBestMeal, type Meal } from "./scoring";

// ============================================
// TIPOVI I INTERFACEI
// ============================================

/**
 * NutritionTargets - dnevni ciljevi za makroe
 */
export interface NutritionTargets {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * UserProfile - korisnički profil s preferencijama
 */
export interface UserProfile {
  meals_per_day: 3 | 4 | 5 | 6;
  goalType?: "lose" | "maintain" | "gain";
  allergies?: string[];
  dislikes?: string[];
  preferredIngredients?: string[];
  [key: string]: any; // Dozvoli dodatna polja
}

/**
 * Meal s tipom obroka - proširena verzija Meal interface-a
 */
export interface MealWithType extends Meal {
  id: string;
  type: string; // breakfast, lunch, dinner, snack, snack1, snack2, snack3
  [key: string]: any;
}

/**
 * DayPlan - dnevni plan prehrane
 */
export interface DayPlan {
  meals: Array<MealWithType & { mealType: string }>;
  totalKcal: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

// ============================================
// HELPER FUNKCIJE
// ============================================

/**
 * Vraća listu tipova obroka za određeni broj obroka dnevno.
 * 
 * @param mealsPerDay - Broj obroka dnevno (3, 4, 5 ili 6)
 * @returns Lista tipova obroka
 */
export function getMealTypes(mealsPerDay: 3 | 4 | 5 | 6): string[] {
  if (mealsPerDay === 3) {
    return ["breakfast", "lunch", "dinner"];
  } else if (mealsPerDay === 4) {
    return ["breakfast", "lunch", "dinner", "snack"];
  } else if (mealsPerDay === 5) {
    return ["breakfast", "snack1", "lunch", "snack2", "dinner"];
  } else {
    // 6 obroka
    return ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"];
  }
}

/**
 * Odredi distribuciju kalorija i makroa po obrocima.
 * Koristi istu logiku kao getMealDistribution iz weeklyMealPlanGenerator.ts
 */
function getMealDistribution(
  numMeals: 3 | 4 | 5 | 6,
  goalType: "lose" | "maintain" | "gain" = "maintain"
): Record<string, number> {
  if (numMeals === 3) {
    return {
      breakfast: 0.35,
      lunch: 0.40,
      dinner: 0.25,
    };
  } else if (numMeals === 4) {
    return {
      breakfast: 0.30,
      lunch: 0.35,
      snack: 0.10,
      dinner: 0.25,
    };
  } else if (numMeals === 5) {
    if (goalType === "lose") {
      return {
        breakfast: 0.30,
        snack1: 0.10,
        lunch: 0.30,
        snack2: 0.10,
        dinner: 0.20,
      };
    } else if (goalType === "gain") {
      return {
        breakfast: 0.25,
        snack1: 0.12,
        lunch: 0.35,
        snack2: 0.12,
        dinner: 0.16,
      };
    } else {
      return {
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
      return {
        breakfast: 0.25,
        snack1: 0.08,
        lunch: 0.28,
        snack2: 0.08,
        snack3: 0.08,
        dinner: 0.23,
      };
    } else if (goalType === "gain") {
      return {
        breakfast: 0.22,
        snack1: 0.10,
        lunch: 0.30,
        snack2: 0.10,
        snack3: 0.10,
        dinner: 0.18,
      };
    } else {
      return {
        breakfast: 0.22,
        snack1: 0.08,
        lunch: 0.30,
        snack2: 0.08,
        snack3: 0.10,
        dinner: 0.22,
      };
    }
  }
}

/**
 * Vraća target makroe za određeni obrok na temelju dnevnih ciljeva i distribucije.
 * 
 * @param mealType - Tip obroka (breakfast, lunch, dinner, snack, snack1, snack2, snack3)
 * @param dailyTargets - Dnevni ciljevi
 * @param mealsPerDay - Broj obroka dnevno
 * @param goalType - Tip cilja (lose, maintain, gain) - opcionalno
 * @returns Target makroe za obrok
 */
export function get_targets_for_meal(
  mealType: string,
  dailyTargets: NutritionTargets,
  mealsPerDay: 3 | 4 | 5 | 6,
  goalType: "lose" | "maintain" | "gain" = "maintain"
): NutritionTargets {
  const distribution = getMealDistribution(mealsPerDay, goalType);
  
  const ratio = distribution[mealType] || 0;
  
  // GAIN MODE: Povećaj target kalorije za 10% ako je goal "gain"
  const baseKcal = dailyTargets.kcal * ratio;
  const targetKcal = goalType === "gain" ? baseKcal * 1.10 : baseKcal;
  
  return {
    kcal: targetKcal,
    protein: dailyTargets.protein * ratio,
    fat: dailyTargets.fat * ratio,
    carbs: dailyTargets.carbs * ratio,
  };
}

/**
 * Filtrira jela na temelju korisničkih ograničenja.
 * Ako nema alergija ili dislikes, vraća sva jela.
 * 
 * @param allMeals - Sva dostupna jela
 * @param user - Korisnički profil
 * @returns Filtrirana lista jela
 */
function filter_meals(
  allMeals: MealWithType[],
  user: UserProfile
): MealWithType[] {
  // Ako nema filtera, vrati sva jela
  const allergies = user.allergies || [];
  const dislikes = user.dislikes || [];
  
  if (allergies.length === 0 && dislikes.length === 0) {
    return allMeals;
  }
  
  return allMeals.filter((meal) => {
    // Provjeri alergije - pretpostavljamo da meal ima components ili ingredients
    const mealIngredients = meal.components?.map((c: any) => c.food?.toLowerCase() || "") || 
                           meal.ingredients?.map((i: string) => i.toLowerCase()) || [];
    
    // Provjeri alergije
    for (const allergen of allergies) {
      const allergenLower = allergen.toLowerCase();
      if (mealIngredients.some((ing: string) => 
        ing.includes(allergenLower) || allergenLower.includes(ing)
      )) {
        return false;
      }
    }
    
    // Provjeri dislikes
    for (const dislike of dislikes) {
      const dislikeLower = dislike.toLowerCase();
      if (mealIngredients.some((ing: string) => 
        ing.includes(dislikeLower) || dislikeLower.includes(ing)
      )) {
        return false;
      }
    }
    
    return true;
  });
}

// ============================================
// GLAVNE FUNKCIJE
// ============================================

/**
 * Generira jedan obrok za dan na temelju tipa obroka i target makroa.
 * 
 * @param mealType - Tip obroka (breakfast, lunch, dinner, snack, snack1, snack2, snack3)
 * @param dailyTargets - Dnevni ciljevi
 * @param mealsPerDay - Broj obroka dnevno
 * @param availableMeals - Dostupna jela (već filtrirana)
 * @param usedMealIdsForDay - Set ili lista ID-ova jela već korištenih taj dan
 * @returns Odabrano jelo ili null
 */
export function generateMealForDay(
  mealType: string,
  dailyTargets: NutritionTargets,
  mealsPerDay: 3 | 4 | 5 | 6,
  availableMeals: MealWithType[],
  usedMealIdsForDay: Set<string> | string[] = new Set(),
  goalType: "lose" | "maintain" | "gain" = "maintain"
): MealWithType | null {
  // 1. Izračunaj target makroe za ovaj obrok
  const mealTargets = get_targets_for_meal(mealType, dailyTargets, mealsPerDay, goalType);
  
  // 2. Filtriraj jela po tipu obroka i već korištenim ID-ovima
  const usedIdsSet = usedMealIdsForDay instanceof Set 
    ? usedMealIdsForDay 
    : new Set(usedMealIdsForDay);
  
  // Za snack tipove (snack1, snack2, snack3), također prihvati jela s tipom "snack"
  let candidates = availableMeals.filter((meal) => {
    const isMatchingType = meal.type === mealType || 
                          (mealType.startsWith("snack") && meal.type === "snack");
    return isMatchingType && !usedIdsSet.has(meal.id);
  });
  
  // 3. Ako je lista prazna, fallback na sva jela tog tipa (ignoriraj usedMealIdsForDay)
  if (candidates.length === 0) {
    candidates = availableMeals.filter((meal) => 
      meal.type === mealType || (mealType.startsWith("snack") && meal.type === "snack")
    );
  }
  
  // 4. Ako i dalje nema kandidata, vrati null
  if (candidates.length === 0) {
    return null;
  }
  
  // 5. Koristi chooseBestMeal() s per-meal targets
  const bestMeal = chooseBestMeal(
    candidates,
    mealTargets.kcal,
    mealTargets.protein,
    mealTargets.fat,
    mealTargets.carbs,
    goalType
  );
  
  return bestMeal as MealWithType | null;
}

/**
 * Generira dnevni plan prehrane za korisnika.
 * 
 * @param user - Korisnički profil
 * @param dailyTargets - Dnevni ciljevi za makroe
 * @param allMeals - Sva dostupna jela
 * @returns Dnevni plan prehrane
 */
export function generateDayPlan(
  user: UserProfile,
  dailyTargets: NutritionTargets,
  allMeals: MealWithType[]
): DayPlan {
  // 1. Filtriraj jela na temelju korisničkih ograničenja
  const allowedMeals = filter_meals(allMeals, user);
  
  // 2. Odredi broj obroka dnevno
  const mealsPerDay = user.meals_per_day || 5;
  
  // 3. Dobij tipove obroka
  const mealTypes = getMealTypes(mealsPerDay);
  
  // 4. Inicijaliziraj
  const dayMeals: Array<MealWithType & { mealType: string }> = [];
  const usedMealIdsForDay = new Set<string>();
  let totalKcal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  
  // 5. Za svaki tip obroka, generiraj jelo
  // Mapiraj goal string na goalType ("gain_weight" -> "gain", "lose_weight" -> "lose", itd.)
  const goal = user.goal || user.goalType || "maintain";
  let goalType: "lose" | "maintain" | "gain" = "maintain";
  if (goal === "gain_weight" || goal === "gain") {
    goalType = "gain";
  } else if (goal === "lose_weight" || goal === "lose") {
    goalType = "lose";
  } else if (goal === "maintain_weight" || goal === "maintain") {
    goalType = "maintain";
  }
  for (const mealType of mealTypes) {
    const meal = generateMealForDay(
      mealType,
      dailyTargets,
      mealsPerDay,
      allowedMeals,
      usedMealIdsForDay,
      goalType
    );
    
    if (meal) {
      // Dodaj mealType u meal objekt
      const mealWithType = { ...meal, mealType };
      dayMeals.push(mealWithType);
      
      // Dodaj ID u set korištenih
      usedMealIdsForDay.add(meal.id);
      
      // Dodaj makroe u dnevne totale
      totalKcal += meal.kcal;
      totalProtein += meal.protein;
      totalFat += meal.fat;
      totalCarbs += meal.carbs;
    }
  }
  
  // 6. Kreiraj i vrati DayPlan
  return {
    meals: dayMeals,
    totalKcal: Math.round(totalKcal),
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    totalCarbs: Math.round(totalCarbs * 10) / 10,
  };
}

// ============================================
// PRILAGODAVANJE DNEVNOG PLANA
// ============================================

/**
 * Prilagođava dnevni plan da bude bliži dnevnom targetu.
 * Iterativno zamjenjuje obroke dok kalorije nisu unutar ±5% targeta.
 * 
 * GAIN MODE: Ako je goal "gain_weight", koristi agresivnije postavke:
 * - maxIterations = 8 (umjesto 5)
 * - kcalUpperMultiplier = 1.50 (umjesto 1.30)
 * 
 * @param dayPlan - Dnevni plan koji treba prilagoditi
 * @param dailyTargets - Dnevni ciljevi
 * @param allowedMeals - Filtrirana lista dozvoljenih jela
 * @param goalType - Tip cilja ("lose" | "maintain" | "gain")
 * @returns Prilagođeni dnevni plan
 */
export function tweakDayPlan(
  dayPlan: DayPlan,
  dailyTargets: NutritionTargets,
  allowedMeals: MealWithType[],
  goalType: "lose" | "maintain" | "gain" = "maintain"
): DayPlan {
  // GAIN MODE: Agresivnije postavke za gain_weight
  const maxIterations = goalType === "gain" ? 8 : 5;
  const tolerance = 0.05; // ±5%
  const kcalUpperMultiplier = goalType === "gain" ? 1.50 : 1.30;
  
  // Kreiraj kopiju dayPlan za modificiranje
  let currentPlan: DayPlan = {
    meals: [...dayPlan.meals],
    totalKcal: dayPlan.totalKcal,
    totalProtein: dayPlan.totalProtein,
    totalFat: dayPlan.totalFat,
    totalCarbs: dayPlan.totalCarbs,
  };
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // 1. Ponovno izračunaj totalKcal iz meals
    let totalKcal = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    
    for (const meal of currentPlan.meals) {
      totalKcal += meal.kcal;
      totalProtein += meal.protein;
      totalFat += meal.fat;
      totalCarbs += meal.carbs;
    }
    
    // 2. Provjeri da li je unutar tolerancije
    const diff = Math.abs(totalKcal - dailyTargets.kcal);
    const diffPercent = diff / dailyTargets.kcal;
    
    if (diffPercent <= tolerance) {
      // Unutar tolerancije, završi
      break;
    }
    
    // 3. Ako je totalKcal > target * 1.05, smanji kalorije
    if (totalKcal > dailyTargets.kcal * 1.05) {
      // Pronađi obrok s najviše kalorija
      let highestKcalMeal = currentPlan.meals[0];
      let highestKcalIndex = 0;
      
      for (let i = 0; i < currentPlan.meals.length; i++) {
        if (currentPlan.meals[i].kcal > highestKcalMeal.kcal) {
          highestKcalMeal = currentPlan.meals[i];
          highestKcalIndex = i;
        }
      }
      
      // Pronađi kandidate za zamjenu (isti tip, niže kalorije)
      const candidates = allowedMeals.filter(
        (meal) =>
          meal.type === highestKcalMeal.type &&
          meal.kcal < highestKcalMeal.kcal &&
          meal.kcal >= highestKcalMeal.kcal * 0.6 // Ne manje od 60% trenutnog
      );
      
      if (candidates.length > 0) {
        // Odaberi kandidata s najnižim kcal (ali iznad 60% trenutnog)
        let bestCandidate = candidates[0];
        for (const candidate of candidates) {
          if (candidate.kcal < bestCandidate.kcal) {
            bestCandidate = candidate;
          }
        }
        
        // Zamijeni obrok
        const mealWithType = { ...bestCandidate, mealType: highestKcalMeal.mealType };
        currentPlan.meals[highestKcalIndex] = mealWithType;
        
        // Nastavi loop (re-check totals)
        continue;
      } else {
        // Nema kandidata, završi
        break;
      }
    }
    // 4. Ako je totalKcal < target * 0.95, povećaj kalorije
    else if (totalKcal < dailyTargets.kcal * 0.95) {
      // Pronađi obrok s najmanje kalorija
      let lowestKcalMeal = currentPlan.meals[0];
      let lowestKcalIndex = 0;
      
      for (let i = 0; i < currentPlan.meals.length; i++) {
        if (currentPlan.meals[i].kcal < lowestKcalMeal.kcal) {
          lowestKcalMeal = currentPlan.meals[i];
          lowestKcalIndex = i;
        }
      }
      
      // Pronađi kandidate za zamjenu (isti tip, više kalorija)
      // GAIN MODE: Ako je goal "gain", dozvoli do 150% prosjeka po obroku (umjesto 50%)
      const avgKcalPerMeal = dailyTargets.kcal / currentPlan.meals.length;
      const maxKcalPerMeal = avgKcalPerMeal * kcalUpperMultiplier;
      
      const candidates = allowedMeals.filter(
        (meal) =>
          meal.type === lowestKcalMeal.type &&
          meal.kcal > lowestKcalMeal.kcal &&
          meal.kcal <= maxKcalPerMeal
      );
      
      if (candidates.length > 0) {
        // GAIN MODE: Ako je goal "gain", odaberi najviše kalorije (agresivnije)
        // Inače, odaberi najviše kalorije ispod limita
        let bestCandidate = candidates[0];
        for (const candidate of candidates) {
          if (candidate.kcal > bestCandidate.kcal) {
            bestCandidate = candidate;
          }
        }
        
        // Zamijeni obrok
        const mealWithType = { ...bestCandidate, mealType: lowestKcalMeal.mealType };
        currentPlan.meals[lowestKcalIndex] = mealWithType;
        
        // Nastavi loop (re-check totals)
        continue;
      } else {
        // Nema kandidata, završi
        break;
      }
    } else {
      // Unutar tolerancije, završi
      break;
    }
  }
  
  // 5. Ponovno izračunaj i ažuriraj totale
  let finalTotalKcal = 0;
  let finalTotalProtein = 0;
  let finalTotalFat = 0;
  let finalTotalCarbs = 0;
  
  for (const meal of currentPlan.meals) {
    finalTotalKcal += meal.kcal;
    finalTotalProtein += meal.protein;
    finalTotalFat += meal.fat;
    finalTotalCarbs += meal.carbs;
  }
  
  currentPlan.totalKcal = Math.round(finalTotalKcal);
  currentPlan.totalProtein = Math.round(finalTotalProtein * 10) / 10;
  currentPlan.totalFat = Math.round(finalTotalFat * 10) / 10;
  currentPlan.totalCarbs = Math.round(finalTotalCarbs * 10) / 10;
  
  return currentPlan;
}

// ============================================
// GENERIRANJE TJEDNOG PLANA
// ============================================

/**
 * Generira tjedni plan prehrane (7 dana).
 * 
 * @param user - Korisnički profil
 * @param dailyTargets - Dnevni ciljevi
 * @param allMeals - Sva dostupna jela
 * @returns Lista dnevnih planova (7 dana)
 */
export function generateWeeklyPlan(
  user: UserProfile,
  dailyTargets: NutritionTargets,
  allMeals: MealWithType[]
): DayPlan[] {
  // 1. Filtriraj jela na temelju korisničkih ograničenja
  const allowedMeals = filter_meals(allMeals, user);
  
  // 2. Kreiraj praznu listu za tjedni plan
  const weekPlans: DayPlan[] = [];
  
  // 3. Odredi goalType iz user profila
  // Mapiraj goal string na goalType ("gain_weight" -> "gain", "lose_weight" -> "lose", itd.)
  const goal = user.goal || user.goalType || "maintain";
  let goalType: "lose" | "maintain" | "gain" = "maintain";
  if (goal === "gain_weight" || goal === "gain") {
    goalType = "gain";
  } else if (goal === "lose_weight" || goal === "lose") {
    goalType = "lose";
  } else if (goal === "maintain_weight" || goal === "maintain") {
    goalType = "maintain";
  }
  
  // 4. Generiraj plan za svaki dan (7 dana)
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    // 4.1. Generiraj sirovi dnevni plan
    const rawDayPlan = generateDayPlan(user, dailyTargets, allMeals);
    
    // 4.2. Prilagodi plan (tweak) da bude bliži targetu
    const tweakedDayPlan = tweakDayPlan(rawDayPlan, dailyTargets, allowedMeals, goalType);
    
    // 4.3. Dodaj u tjedni plan
    weekPlans.push(tweakedDayPlan);
  }
  
  // 4. Vrati listu dnevnih planova
  return weekPlans;
}


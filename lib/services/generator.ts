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
 * 
 * UNIFIED MACRO SYSTEM: Ista distribucija za SVE goal tipove (lose/maintain/gain).
 * goalType parametar se ignorira - distribucija je identična za sve mode-ove.
 * goalType utječe SAMO na kalorije (GAIN MODE +10%) u get_targets_for_meal(), ne na makro distribuciju.
 */
function getMealDistribution(
  numMeals: 3 | 4 | 5 | 6,
  goalType: "lose" | "maintain" | "gain" = "maintain"
): Record<string, number> {
  // Ista distribucija za SVE goal tipove - goalType se ignorira
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
    // UNIFIED: Ista distribucija za lose/maintain/gain
    return {
      breakfast: 0.25,
      snack1: 0.10,
      lunch: 0.35,
      snack2: 0.10,
      dinner: 0.20,
    };
  } else {
    // 6 obroka - UNIFIED: Ista distribucija za lose/maintain/gain
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
 * REAL-TIME MACRO TRACKING: Prati trenutne makroe u danu i preferira jela koja minimiziraju ukupno odstupanje.
 * 
 * @param mealType - Tip obroka (breakfast, lunch, dinner, snack, snack1, snack2, snack3)
 * @param dailyTargets - Dnevni ciljevi
 * @param mealsPerDay - Broj obroka dnevno
 * @param availableMeals - Dostupna jela (već filtrirana)
 * @param usedMealIdsForDay - Set ili lista ID-ova jela već korištenih taj dan
 * @param goalType - Tip cilja ("lose" | "maintain" | "gain")
 * @param runningMacros - Opcionalno: trenutni makroi u danu (za real-time tracking)
 * @returns Odabrano jelo ili null
 */
export function generateMealForDay(
  mealType: string,
  dailyTargets: NutritionTargets,
  mealsPerDay: 3 | 4 | 5 | 6,
  availableMeals: MealWithType[],
  usedMealIdsForDay: Set<string> | string[] = new Set(),
  goalType: "lose" | "maintain" | "gain" = "maintain",
  runningMacros?: { protein: number; carbs: number; fat: number; calories: number }
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
  
  // 5. Koristi chooseBestMeal() s per-meal targets i running macros za real-time tracking
  const bestMeal = chooseBestMeal(
    candidates,
    mealTargets.kcal,
    mealTargets.protein,
    mealTargets.fat,
    mealTargets.carbs,
    goalType,
    runningMacros
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
  
  // 5. Za svaki tip obroka, generiraj jelo s REAL-TIME MACRO TRACKING
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
  
  // Real-time macro tracking: prati trenutne makroe kako se dodaju obroci
  let runningMacros: { protein: number; carbs: number; fat: number; calories: number } = {
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0
  };
  
  for (const mealType of mealTypes) {
    // Generiraj jelo s real-time macro tracking
    const meal = generateMealForDay(
      mealType,
      dailyTargets,
      mealsPerDay,
      allowedMeals,
      usedMealIdsForDay,
      goalType,
      runningMacros // Proslijedi trenutne makroe za bolji odabir
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
      
      // Ažuriraj running macros za sljedeći obrok
      runningMacros.protein += meal.protein;
      runningMacros.carbs += meal.carbs;
      runningMacros.fat += meal.fat;
      runningMacros.calories += meal.kcal;
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
// BALANSIRANJE MAKROA
// ============================================

/**
 * Balansira dnevne makroe zamjenom obroka da se postignu target makroi.
 * 
 * Ponašanje:
 * - Ako je protein > target * 1.15 → zamijeni najviše-protein obrok s niskim-protein, visokim-carb obrokom
 * - Ako je carbs < target * 0.85 → dodaj/zamijeni s visokim-carb obrokom (riža, zob, tjestenina, banana)
 * - Ako je fat < target * 0.85 → dodaj/zamijeni s visokim-fat obrokom (avokado, orašasti plodovi, jaja)
 * - Ako je fat > target * 1.15 → zamijeni masni obrok s lean obrokom
 * 
 * Loop dok makroi nisu unutar ±10% targeta ILI max iteracija (6).
 * 
 * NE mijenja kalorijsku logiku - samo prilagođava makroe.
 * 
 * @param dayPlan - Dnevni plan koji treba balansirati
 * @param dailyTargets - Dnevni ciljevi za makroe
 * @param allowedMeals - Filtrirana lista dozvoljenih jela
 * @param goalType - Tip cilja ("lose" | "maintain" | "gain")
 * @returns Balansirani dnevni plan
 */
/**
 * Balansira dnevne makroe zamjenom obroka da se postignu target makroi.
 * 
 * UNIFIED MACRO SYSTEM: Ista logika za SVE goal tipove.
 * goalType parametar se ne koristi - makroi se balansiraju prema dailyTargets.
 * 
 * @param dayPlan - Dnevni plan koji treba balansirati
 * @param dailyTargets - Dnevni ciljevi za makroe (jedini izvor istine)
 * @param allowedMeals - Filtrirana lista dozvoljenih jela
 * @param goalType - Tip cilja (ignorira se za makro balansiranje, samo za kalorije)
 * @returns Balansirani dnevni plan
 */
export function balanceDailyMacros(
  dayPlan: DayPlan,
  dailyTargets: NutritionTargets,
  allowedMeals: MealWithType[],
  goalType: "lose" | "maintain" | "gain" = "maintain"
): DayPlan {
  const maxIterations = 8; // Povećano s 6 na 8 za bolju preciznost
  const tolerance = 0.10; // ±10%
  
  let currentPlan: DayPlan = {
    meals: [...dayPlan.meals],
    totalKcal: dayPlan.totalKcal,
    totalProtein: dayPlan.totalProtein,
    totalFat: dayPlan.totalFat,
    totalCarbs: dayPlan.totalCarbs,
  };
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Izračunaj trenutne totale
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
    
    // Provjeri da li su makroi unutar tolerancije (±10%)
    const proteinDiff = Math.abs(totalProtein - dailyTargets.protein) / dailyTargets.protein;
    const carbsDiff = Math.abs(totalCarbs - dailyTargets.carbs) / dailyTargets.carbs;
    const fatDiff = Math.abs(totalFat - dailyTargets.fat) / dailyTargets.fat;
    
    if (proteinDiff <= tolerance && carbsDiff <= tolerance && fatDiff <= tolerance) {
      // Svi makroi su unutar tolerancije
      break;
    }
    
    let madeChange = false;
    
    // 1. Ako je protein > target * 1.10 (+10%), zamijeni najviše-protein obrok
    if (totalProtein > dailyTargets.protein * 1.10) {
      // Pronađi obrok s najviše proteina
      let highestProteinMeal = currentPlan.meals[0];
      let highestProteinIndex = 0;
      
      for (let i = 0; i < currentPlan.meals.length; i++) {
        if (currentPlan.meals[i].protein > highestProteinMeal.protein) {
          highestProteinMeal = currentPlan.meals[i];
          highestProteinIndex = i;
        }
      }
      
      // Pronađi zamjenu: nizak protein, visok carbs, slične kalorije
      const targetKcal = highestProteinMeal.kcal;
      const candidates = allowedMeals.filter(
        (meal) =>
          meal.type === highestProteinMeal.type &&
          meal.protein < highestProteinMeal.protein * 0.7 && // Najmanje 30% manje proteina
          meal.carbs > highestProteinMeal.carbs * 1.2 && // Najmanje 20% više carbs
          meal.kcal >= targetKcal * 0.8 &&
          meal.kcal <= targetKcal * 1.2
      );
      
      if (candidates.length > 0) {
        // Odaberi kandidata s najmanje proteina i najviše carbs
        let bestCandidate = candidates[0];
        for (const candidate of candidates) {
          if (candidate.protein < bestCandidate.protein || 
              (candidate.protein === bestCandidate.protein && candidate.carbs > bestCandidate.carbs)) {
            bestCandidate = candidate;
          }
        }
        
        const mealWithType = { ...bestCandidate, mealType: highestProteinMeal.mealType };
        currentPlan.meals[highestProteinIndex] = mealWithType;
        madeChange = true;
      }
    }
    
    // 2. Ako je carbs < target * 0.90 (-10%), zamijeni obrok s visokim-carb obrokom
    if (!madeChange && totalCarbs < dailyTargets.carbs * 0.90) {
      // Pronađi obrok s najmanje carbs
      let lowestCarbsMeal = currentPlan.meals[0];
      let lowestCarbsIndex = 0;
      
      for (let i = 0; i < currentPlan.meals.length; i++) {
        if (currentPlan.meals[i].carbs < lowestCarbsMeal.carbs) {
          lowestCarbsMeal = currentPlan.meals[i];
          lowestCarbsIndex = i;
        }
      }
      
      // Pronađi zamjenu: visok carbs, slične kalorije
      const targetKcal = lowestCarbsMeal.kcal;
      const candidates = allowedMeals.filter(
        (meal) =>
          meal.type === lowestCarbsMeal.type &&
          meal.carbs > lowestCarbsMeal.carbs * 1.5 && // Najmanje 50% više carbs
          meal.kcal >= targetKcal * 0.8 &&
          meal.kcal <= targetKcal * 1.2
      );
      
      if (candidates.length > 0) {
        // Odaberi kandidata s najviše carbs
        let bestCandidate = candidates[0];
        for (const candidate of candidates) {
          if (candidate.carbs > bestCandidate.carbs) {
            bestCandidate = candidate;
          }
        }
        
        const mealWithType = { ...bestCandidate, mealType: lowestCarbsMeal.mealType };
        currentPlan.meals[lowestCarbsIndex] = mealWithType;
        madeChange = true;
      }
    }
    
    // 3. Ako je fat < target * 0.90 (-10%), zamijeni obrok s visokim-fat obrokom
    if (!madeChange && totalFat < dailyTargets.fat * 0.90) {
      // Pronađi obrok s najmanje fat
      let lowestFatMeal = currentPlan.meals[0];
      let lowestFatIndex = 0;
      
      for (let i = 0; i < currentPlan.meals.length; i++) {
        if (currentPlan.meals[i].fat < lowestFatMeal.fat) {
          lowestFatMeal = currentPlan.meals[i];
          lowestFatIndex = i;
        }
      }
      
      // Pronađi zamjenu: visok fat, slične kalorije
      const targetKcal = lowestFatMeal.kcal;
      const candidates = allowedMeals.filter(
        (meal) =>
          meal.type === lowestFatMeal.type &&
          meal.fat > lowestFatMeal.fat * 1.5 && // Najmanje 50% više fat
          meal.kcal >= targetKcal * 0.8 &&
          meal.kcal <= targetKcal * 1.2
      );
      
      if (candidates.length > 0) {
        // Odaberi kandidata s najviše fat
        let bestCandidate = candidates[0];
        for (const candidate of candidates) {
          if (candidate.fat > bestCandidate.fat) {
            bestCandidate = candidate;
          }
        }
        
        const mealWithType = { ...bestCandidate, mealType: lowestFatMeal.mealType };
        currentPlan.meals[lowestFatIndex] = mealWithType;
        madeChange = true;
      }
    }
    
    // 4. Ako je fat > target * 1.10 (+10%), zamijeni masni obrok s lean obrokom
    if (!madeChange && totalFat > dailyTargets.fat * 1.10) {
      // Pronađi obrok s najviše fat
      let highestFatMeal = currentPlan.meals[0];
      let highestFatIndex = 0;
      
      for (let i = 0; i < currentPlan.meals.length; i++) {
        if (currentPlan.meals[i].fat > highestFatMeal.fat) {
          highestFatMeal = currentPlan.meals[i];
          highestFatIndex = i;
        }
      }
      
      // Pronađi zamjenu: nizak fat, slične kalorije
      const targetKcal = highestFatMeal.kcal;
      const candidates = allowedMeals.filter(
        (meal) =>
          meal.type === highestFatMeal.type &&
          meal.fat < highestFatMeal.fat * 0.7 && // Najmanje 30% manje fat
          meal.kcal >= targetKcal * 0.8 &&
          meal.kcal <= targetKcal * 1.2
      );
      
      if (candidates.length > 0) {
        // Odaberi kandidata s najmanje fat
        let bestCandidate = candidates[0];
        for (const candidate of candidates) {
          if (candidate.fat < bestCandidate.fat) {
            bestCandidate = candidate;
          }
        }
        
        const mealWithType = { ...bestCandidate, mealType: highestFatMeal.mealType };
        currentPlan.meals[highestFatIndex] = mealWithType;
        madeChange = true;
      }
    }
    
    // Ako nije napravljena promjena, prekini loop
    if (!madeChange) {
      break;
    }
  }
  
  // Ponovno izračunaj i ažuriraj totale
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
// HARD MACRO VALIDATION
// ============================================

/**
 * Provjeri da li je vrijednost unutar ±pct% targeta.
 */
function isWithinRange(actual: number, target: number, pct: number): boolean {
  return actual >= target * (1 - pct) && actual <= target * (1 + pct);
}

/**
 * Validira dnevne totale prema targetima.
 * 
 * @param dailyTotals - Stvarni dnevni totali
 * @param dailyTargets - Ciljni dnevni totali
 * @returns true ako su svi makroi unutar tolerancije
 */
function validateDay(dailyTotals: NutritionTargets, dailyTargets: NutritionTargets): boolean {
  return (
    isWithinRange(dailyTotals.kcal, dailyTargets.kcal, 0.15) &&
    isWithinRange(dailyTotals.protein, dailyTargets.protein, 0.10) &&
    isWithinRange(dailyTotals.carbs, dailyTargets.carbs, 0.10) &&
    isWithinRange(dailyTotals.fat, dailyTargets.fat, 0.10)
  );
}

/**
 * Rebalansira obroke da se postignu target makroi.
 * Koristi se nakon balanceDailyMacros ako validation ne prođe.
 */
function rebalanceMeals(
  meals: Array<MealWithType & { mealType: string }>,
  dailyTargets: NutritionTargets,
  allowedMeals: MealWithType[]
): Array<MealWithType & { mealType: string }> {
  // Izračunaj trenutne totale
  let totalKcal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  
  for (const meal of meals) {
    totalKcal += meal.kcal;
    totalProtein += meal.protein;
    totalFat += meal.fat;
    totalCarbs += meal.carbs;
  }
  
  const newMeals = [...meals];
  
  // Ako je protein previsok, zamijeni najviše-protein obrok
  if (totalProtein > dailyTargets.protein * 1.10) {
    let highestProteinIndex = 0;
    for (let i = 0; i < newMeals.length; i++) {
      if (newMeals[i].protein > newMeals[highestProteinIndex].protein) {
        highestProteinIndex = i;
      }
    }
    
    const targetKcal = newMeals[highestProteinIndex].kcal;
    const candidates = allowedMeals.filter(
      (meal) =>
        meal.type === newMeals[highestProteinIndex].type &&
        meal.protein < newMeals[highestProteinIndex].protein * 0.8 &&
        meal.kcal >= targetKcal * 0.7 &&
        meal.kcal <= targetKcal * 1.3
    );
    
    if (candidates.length > 0) {
      let bestCandidate = candidates[0];
      for (const candidate of candidates) {
        if (candidate.protein < bestCandidate.protein) {
          bestCandidate = candidate;
        }
      }
      newMeals[highestProteinIndex] = { ...bestCandidate, mealType: newMeals[highestProteinIndex].mealType };
    }
  }
  
  // Ako je carbs prenizak, zamijeni najniže-carbs obrok
  if (totalCarbs < dailyTargets.carbs * 0.90) {
    let lowestCarbsIndex = 0;
    for (let i = 0; i < newMeals.length; i++) {
      if (newMeals[i].carbs < newMeals[lowestCarbsIndex].carbs) {
        lowestCarbsIndex = i;
      }
    }
    
    const targetKcal = newMeals[lowestCarbsIndex].kcal;
    const candidates = allowedMeals.filter(
      (meal) =>
        meal.type === newMeals[lowestCarbsIndex].type &&
        meal.carbs > newMeals[lowestCarbsIndex].carbs * 1.3 &&
        meal.kcal >= targetKcal * 0.7 &&
        meal.kcal <= targetKcal * 1.3
    );
    
    if (candidates.length > 0) {
      let bestCandidate = candidates[0];
      for (const candidate of candidates) {
        if (candidate.carbs > bestCandidate.carbs) {
          bestCandidate = candidate;
        }
      }
      newMeals[lowestCarbsIndex] = { ...bestCandidate, mealType: newMeals[lowestCarbsIndex].mealType };
    }
  }
  
  // Ako je fat prenizak, zamijeni najniže-fat obrok
  if (totalFat < dailyTargets.fat * 0.90) {
    let lowestFatIndex = 0;
    for (let i = 0; i < newMeals.length; i++) {
      if (newMeals[i].fat < newMeals[lowestFatIndex].fat) {
        lowestFatIndex = i;
      }
    }
    
    const targetKcal = newMeals[lowestFatIndex].kcal;
    const candidates = allowedMeals.filter(
      (meal) =>
        meal.type === newMeals[lowestFatIndex].type &&
        meal.fat > newMeals[lowestFatIndex].fat * 1.3 &&
        meal.kcal >= targetKcal * 0.7 &&
        meal.kcal <= targetKcal * 1.3
    );
    
    if (candidates.length > 0) {
      let bestCandidate = candidates[0];
      for (const candidate of candidates) {
        if (candidate.fat > bestCandidate.fat) {
          bestCandidate = candidate;
        }
      }
      newMeals[lowestFatIndex] = { ...bestCandidate, mealType: newMeals[lowestFatIndex].mealType };
    }
  }
  
  // Ako je fat previsok, zamijeni najviše-fat obrok
  if (totalFat > dailyTargets.fat * 1.10) {
    let highestFatIndex = 0;
    for (let i = 0; i < newMeals.length; i++) {
      if (newMeals[i].fat > newMeals[highestFatIndex].fat) {
        highestFatIndex = i;
      }
    }
    
    const targetKcal = newMeals[highestFatIndex].kcal;
    const candidates = allowedMeals.filter(
      (meal) =>
        meal.type === newMeals[highestFatIndex].type &&
        meal.fat < newMeals[highestFatIndex].fat * 0.8 &&
        meal.kcal >= targetKcal * 0.7 &&
        meal.kcal <= targetKcal * 1.3
    );
    
    if (candidates.length > 0) {
      let bestCandidate = candidates[0];
      for (const candidate of candidates) {
        if (candidate.fat < bestCandidate.fat) {
          bestCandidate = candidate;
        }
      }
      newMeals[highestFatIndex] = { ...bestCandidate, mealType: newMeals[highestFatIndex].mealType };
    }
  }
  
  return newMeals;
}

/**
 * Ponovno izračunaj totale iz obroka.
 */
function recomputeTotals(meals: Array<MealWithType & { mealType: string }>): NutritionTargets {
  let totalKcal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  
  for (const meal of meals) {
    totalKcal += meal.kcal;
    totalProtein += meal.protein;
    totalFat += meal.fat;
    totalCarbs += meal.carbs;
  }
  
  return {
    kcal: Math.round(totalKcal),
    protein: Math.round(totalProtein * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
  };
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
  
  // 4. GAIN MODE: Prilagodi makro targete za gain mode (bez mijenjanja originalnih dailyTargets)
  // Originalni dailyTargets ostaju nepromijenjeni - koristimo adjustedTargets samo unutar generatora
  let adjustedTargets: NutritionTargets = { ...dailyTargets };
  if (goalType === "gain") {
    adjustedTargets = {
      kcal: dailyTargets.kcal, // Kalorije ostaju iste (već su prilagođene u calculatoru)
      protein: dailyTargets.protein * 1.10, // +10% proteina
      carbs: dailyTargets.carbs * 1.20, // +20% carbs
      fat: dailyTargets.fat * 1.15, // +15% fat
    };
  }
  
  // 5. Provjeri da li je debug mode aktivan
  const isDebugMode = typeof process !== "undefined" && 
    (process.env.NODE_ENV === "development" || 
     (global as any).ENABLE_MEAL_PLAN_DEBUG_TESTS === true);
  
  // 6. Generiraj plan za svaki dan (7 dana)
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    // 6.1. Generiraj sirovi dnevni plan (koristi adjustedTargets za gain mode)
    const rawDayPlan = generateDayPlan(user, adjustedTargets, allMeals);
    
    // 6.2. Prilagodi plan (tweak) da bude bliži kalorijskom targetu
    const tweakedDayPlan = tweakDayPlan(rawDayPlan, adjustedTargets, allowedMeals, goalType);
    
    // 6.3. BALANSIRAJ MAKROE: Prilagodi makroe da budu unutar ±10% adjustedTargets
    let balancedDayPlan = balanceDailyMacros(tweakedDayPlan, adjustedTargets, allowedMeals, goalType);
    
    // 6.4. HARD VALIDATION: Provjeri da li su makroi unutar tolerancije, ako ne - rebalansiraj
    let dailyTotals: NutritionTargets = {
      kcal: balancedDayPlan.totalKcal,
      protein: balancedDayPlan.totalProtein,
      carbs: balancedDayPlan.totalCarbs,
      fat: balancedDayPlan.totalFat,
    };
    
    let attempts = 0;
    while (!validateDay(dailyTotals, adjustedTargets) && attempts < 6) {
      // Rebalansiraj obroke
      balancedDayPlan.meals = rebalanceMeals(balancedDayPlan.meals, adjustedTargets, allowedMeals);
      
      // Ponovno izračunaj totale
      dailyTotals = recomputeTotals(balancedDayPlan.meals);
      
      // Ažuriraj balancedDayPlan s novim totalima
      balancedDayPlan.totalKcal = dailyTotals.kcal;
      balancedDayPlan.totalProtein = dailyTotals.protein;
      balancedDayPlan.totalCarbs = dailyTotals.carbs;
      balancedDayPlan.totalFat = dailyTotals.fat;
      
      attempts++;
    }
    
    // 6.5. Debug log (samo u development modu)
    if (isDebugMode) {
      console.log("MACRO CHECK", {
        day: dayIndex + 1,
        goalType: goalType,
        target: {
          kcal: adjustedTargets.kcal,
          protein: adjustedTargets.protein,
          carbs: adjustedTargets.carbs,
          fat: adjustedTargets.fat,
        },
        actual: dailyTotals,
        diffPercent: {
          protein: ((dailyTotals.protein / adjustedTargets.protein - 1) * 100).toFixed(1) + "%",
          carbs: ((dailyTotals.carbs / adjustedTargets.carbs - 1) * 100).toFixed(1) + "%",
          fat: ((dailyTotals.fat / adjustedTargets.fat - 1) * 100).toFixed(1) + "%",
        },
        validated: validateDay(dailyTotals, adjustedTargets),
        rebalanceAttempts: attempts,
      });
    }
    
    // 6.6. Dodaj u tjedni plan
    weekPlans.push(balancedDayPlan);
  }
  
  // 6. Vrati listu dnevnih planova
  return weekPlans;
}


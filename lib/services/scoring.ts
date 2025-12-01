/**
 * SCORING FUNKCIJE ZA ODABIR OBROKA
 * 
 * Funkcije za scoring i odabir najboljeg obroka na temelju target makroa.
 * Niži score = bolje jelo.
 */

/**
 * Meal interface - struktura obroka s makroima
 */
export interface Meal {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  [key: string]: any; // Dozvoli dodatna polja
}

/**
 * Izračunaj score za jelo na temelju odstupanja od targeta.
 * Niži score = bolje jelo (bliže targetu).
 * 
 * Formula:
 * score = abs(meal.kcal - targetKcal) * weight +
 *         abs(meal.protein - targetProtein) * 0.9 +
 *         abs(meal.fat - targetFat) * 0.6 +
 *         abs(meal.carbs - targetCarbs) * 0.4
 * 
 * MACRO-BASED DEVIATION PENALTIES:
 * - proteinDiff * 1.5 (penalty za protein odstupanje)
 * - carbsDiff * 1.2 (penalty za carbs odstupanje)
 * - fatDiff * 1.2 (penalty za fat odstupanje)
 * 
 * GAIN MODE: Ako je goal "gain_weight", weight za kcal je 1.3 (umjesto 1.0)
 * 
 * @param meal - Jelo s makroima (kcal, protein, fat, carbs)
 * @param targetKcal - Ciljne kalorije
 * @param targetProtein - Ciljni proteini (g)
 * @param targetFat - Ciljne masti (g)
 * @param targetCarbs - Ciljni ugljikohidrati (g)
 * @param goalType - Tip cilja ("lose" | "maintain" | "gain")
 * @param runningMacros - Opcionalno: trenutni makroi u danu (za real-time tracking)
 * @returns Numerički score (niži = bolje)
 */
export function scoreMeal(
  meal: Meal,
  targetKcal: number,
  targetProtein: number,
  targetFat: number,
  targetCarbs: number,
  goalType: "lose" | "maintain" | "gain" = "maintain",
  runningMacros?: { protein: number; carbs: number; fat: number; calories: number }
): number {
  let score: number;
  
  // STARO PONAŠANJE - prioritet: protein > carbs > fat
  // Formula: protein * 0.9 + carbs * 0.4 + fat * 0.6 + kcal * weight
  // Niži score = bolje jelo
  
  const proteinPenalty = Math.abs(meal.protein - targetProtein);
  const carbPenalty = Math.abs(meal.carbs - targetCarbs);
  const fatPenalty = Math.abs(meal.fat - targetFat);
  const caloriePenalty = Math.abs(meal.kcal - targetKcal);
  
  // Weight za kalorije ovisi o modu
  const kcalWeight = goalType === "gain" ? 1.3 : 1.0;
  
  // Osnovni score s prioritetom: protein (primarni), zatim carbs, zatim fat
  score =
    proteinPenalty * 0.9 +
    carbPenalty * 0.4 +
    fatPenalty * 0.6 +
    caloriePenalty * kcalWeight;
  
  // GAIN MODE: Dodatni penalty za ekstremno visok fat (izbjegavamo previše masti)
  if (goalType === "gain") {
    // Penaliziraj ekstremno visok fat (ako je fat > target * 1.5, dodaj veliki penalty)
    if (meal.fat > targetFat * 1.5) {
      score += (meal.fat - targetFat * 1.5) * 5.0; // Veliki penalty za ekstremno visok fat
    }
  }

  // MACRO-BASED DEVIATION PENALTIES: Dodaj penalty za makro odstupanja
  // Niži score = bolje, pa veća odstupanja = veći score (penalty)
  // GAIN MODE: Posebna logika za gain mode - preferiraj visok protein/carbs, izbjegavaj ekstremno visok fat
  if (runningMacros) {
    // Ako imamo running macros, računaj ukupno odstupanje nakon dodavanja ovog obroka
    const totalProtein = runningMacros.protein + meal.protein;
    const totalCarbs = runningMacros.carbs + meal.carbs;
    const totalFat = runningMacros.fat + meal.fat;
    
    // Izračunaj trenutna odstupanja (prije dodavanja ovog obroka)
    const currentProteinDiff = Math.abs(runningMacros.protein - targetProtein);
    const currentCarbsDiff = Math.abs(runningMacros.carbs - targetCarbs);
    const currentFatDiff = Math.abs(runningMacros.fat - targetFat);
    
    // Izračunaj nova odstupanja (nakon dodavanja ovog obroka)
    const newProteinDiff = Math.abs(totalProtein - targetProtein);
    const newCarbsDiff = Math.abs(totalCarbs - targetCarbs);
    const newFatDiff = Math.abs(totalFat - targetFat);
    
    // HEAVY PENALTY: Ako jelo gura makro DALJE od targeta (pogoršanje)
    if (goalType === "gain") {
      // GAIN MODE: Posebna logika - preferiraj visok protein/carbs, izbjegavaj ekstremno visok fat
      // Ako protein već prelazi target i jelo dodaje još proteina → penalty (ali manji nego za lose/maintain)
      if (runningMacros.protein > targetProtein && meal.protein > 0) {
        const worsening = newProteinDiff - currentProteinDiff;
        if (worsening > 0) {
          score += worsening * 2.0; // Manji penalty za gain mode (jer preferiramo visok protein)
        }
      }
      // Ako carbs već prelaze target i jelo dodaje još carbs → penalty (ali manji)
      if (runningMacros.carbs > targetCarbs && meal.carbs > 0) {
        const worsening = newCarbsDiff - currentCarbsDiff;
        if (worsening > 0) {
          score += worsening * 1.5; // Manji penalty za gain mode (jer preferiramo visok carbs)
        }
      }
      // Ako fat već prelazi target i jelo dodaje još fat → VELIKI penalty (izbjegavamo ekstremno visok fat)
      if (runningMacros.fat > targetFat && meal.fat > 0) {
        const worsening = newFatDiff - currentFatDiff;
        if (worsening > 0) {
          score += worsening * 5.0; // VELIKI penalty za gain mode (izbjegavamo ekstremno visok fat)
        }
      }
      
      // BONUS: Ako makroi su ispod targeta, preferiraj jela koja ih povećavaju
      if (runningMacros.protein < targetProtein) {
        const needed = targetProtein - runningMacros.protein;
        // Preferiraj jela koja dodaju protein (manji penalty ako dodaju previše)
        if (meal.protein > needed * 1.5) {
          score += Math.abs(meal.protein - needed) * 0.8; // Manji penalty za gain mode
        }
      }
      if (runningMacros.carbs < targetCarbs) {
        const needed = targetCarbs - runningMacros.carbs;
        if (meal.carbs > needed * 1.5) {
          score += Math.abs(meal.carbs - needed) * 0.6; // Manji penalty za gain mode
        }
      }
      if (runningMacros.fat < targetFat) {
        const needed = targetFat - runningMacros.fat;
        // Fat je manje prioritetan u gain mode
        if (meal.fat > needed * 1.5) {
          score += Math.abs(meal.fat - needed) * 1.0;
        }
      }
      
      // Standardni penalties za ukupno odstupanje (s prilagođenim težinama za gain mode)
      score += newProteinDiff * 1.3; // Veća težina za protein u gain mode
      score += newCarbsDiff * 1.1; // Veća težina za carbs u gain mode
      score += newFatDiff * 1.0; // Standardna težina za fat
    } else {
      // LOSE/MAINTAIN MODE: Standardna logika
      if (runningMacros.protein > targetProtein && meal.protein > 0) {
        const worsening = newProteinDiff - currentProteinDiff;
        if (worsening > 0) {
          score += worsening * 4.0; // Veliki penalty za pogoršanje proteina
        }
      }
      if (runningMacros.carbs > targetCarbs && meal.carbs > 0) {
        const worsening = newCarbsDiff - currentCarbsDiff;
        if (worsening > 0) {
          score += worsening * 3.0; // Veliki penalty za pogoršanje carbs
        }
      }
      if (runningMacros.fat > targetFat && meal.fat > 0) {
        const worsening = newFatDiff - currentFatDiff;
        if (worsening > 0) {
          score += worsening * 3.0; // Veliki penalty za pogoršanje fat
        }
      }
      
      // BONUS: Ako makroi su ispod targeta, preferiraj jela koja ih povećavaju (ali ne previše)
      if (runningMacros.protein < targetProtein) {
        const needed = targetProtein - runningMacros.protein;
        if (meal.protein > needed * 1.3) {
          score += Math.abs(meal.protein - needed) * 1.5; // Penalty za previše proteina
        }
      }
      if (runningMacros.carbs < targetCarbs) {
        const needed = targetCarbs - runningMacros.carbs;
        if (meal.carbs > needed * 1.3) {
          score += Math.abs(meal.carbs - needed) * 1.2; // Penalty za previše carbs
        }
      }
      if (runningMacros.fat < targetFat) {
        const needed = targetFat - runningMacros.fat;
        if (meal.fat > needed * 1.3) {
          score += Math.abs(meal.fat - needed) * 1.2; // Penalty za previše fat
        }
      }
      
      // Standardni penalties za ukupno odstupanje (uvijek se primjenjuju)
      score += newProteinDiff * 1.5;
      score += newCarbsDiff * 1.2;
      score += newFatDiff * 1.2;
    }
  } else {
    // Ako nema running macros, koristi standardne penalties
    // Već su izračunati gore, samo dodaj standardne penalties
    score += proteinPenalty * 1.0;
    score += carbPenalty * 0.8;
    score += fatPenalty * 0.8;
  }

  return score;
}

/**
 * Odaberi najbolje jelo iz liste kandidata na temelju scoring funkcije.
 * 
 * Ponašanje:
 * 1. Filtriraj kandidate na one s kalorijama između 70% i 130% targetKcal
 * 2. Ako je filtrirana lista prazna, koristi originalne kandidate
 * 3. Za svako jelo izračunaj scoreMeal()
 * 4. Vrati jelo s NAJNIŽIM score-om
 * 5. Nema nasumičnosti
 * 6. Funkcija je pure (ne mijenja vanjsko stanje)
 * 
 * @param candidates - Lista kandidata (jela)
 * @param targetKcal - Ciljne kalorije
 * @param targetProtein - Ciljni proteini (g)
 * @param targetFat - Ciljne masti (g)
 * @param targetCarbs - Ciljni ugljikohidrati (g)
 * @param goalType - Tip cilja ("lose" | "maintain" | "gain")
 * @param runningMacros - Opcionalno: trenutni makroi u danu (za real-time tracking)
 * @returns Najbolje jelo (s najnižim score-om) ili null ako nema kandidata
 */
export function chooseBestMeal(
  candidates: Meal[],
  targetKcal: number,
  targetProtein: number,
  targetFat: number,
  targetCarbs: number,
  goalType: "lose" | "maintain" | "gain" = "maintain",
  runningMacros?: { protein: number; carbs: number; fat: number; calories: number }
): Meal | null {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // 1. Filtriraj kandidate na one s kalorijama između 70% i 130% targetKcal
  const minKcal = targetKcal * 0.7;
  const maxKcal = targetKcal * 1.3;

  const filteredCandidates = candidates.filter(
    (meal) => meal.kcal >= minKcal && meal.kcal <= maxKcal
  );

  // 2. Ako je filtrirana lista prazna, koristi originalne kandidate
  const candidatesToUse =
    filteredCandidates.length > 0 ? filteredCandidates : candidates;

  // 3. Za svako jelo izračunaj scoreMeal() s running macros ako su dostupni
  let bestMeal: Meal | null = null;
  let bestScore = Infinity;

  for (const meal of candidatesToUse) {
    const score = scoreMeal(
      meal,
      targetKcal,
      targetProtein,
      targetFat,
      targetCarbs,
      goalType,
      runningMacros
    );

    // 4. Vrati jelo s NAJNIŽIM score-om
    if (score < bestScore) {
      bestScore = score;
      bestMeal = meal;
    }
  }

  return bestMeal;
}


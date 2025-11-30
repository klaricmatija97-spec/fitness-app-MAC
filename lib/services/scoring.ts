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
 * GAIN MODE: Ako je goal "gain_weight", weight za kcal je 1.3 (umjesto 1.0)
 * 
 * @param meal - Jelo s makroima (kcal, protein, fat, carbs)
 * @param targetKcal - Ciljne kalorije
 * @param targetProtein - Ciljni proteini (g)
 * @param targetFat - Ciljne masti (g)
 * @param targetCarbs - Ciljni ugljikohidrati (g)
 * @param goalType - Tip cilja ("lose" | "maintain" | "gain")
 * @returns Numerički score (niži = bolje)
 */
export function scoreMeal(
  meal: Meal,
  targetKcal: number,
  targetProtein: number,
  targetFat: number,
  targetCarbs: number,
  goalType: "lose" | "maintain" | "gain" = "maintain"
): number {
  // GAIN MODE: Povećaj weight za kcal na 1.3 ako je goal "gain"
  const kcalWeight = goalType === "gain" ? 1.3 : 1.0;
  
  const score =
    Math.abs(meal.kcal - targetKcal) * kcalWeight +
    Math.abs(meal.protein - targetProtein) * 0.9 +
    Math.abs(meal.fat - targetFat) * 0.6 +
    Math.abs(meal.carbs - targetCarbs) * 0.4;

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
 * @returns Najbolje jelo (s najnižim score-om) ili null ako nema kandidata
 */
export function chooseBestMeal(
  candidates: Meal[],
  targetKcal: number,
  targetProtein: number,
  targetFat: number,
  targetCarbs: number,
  goalType: "lose" | "maintain" | "gain" = "maintain"
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

  // 3. Za svako jelo izračunaj scoreMeal()
  let bestMeal: Meal | null = null;
  let bestScore = Infinity;

  for (const meal of candidatesToUse) {
    const score = scoreMeal(
      meal,
      targetKcal,
      targetProtein,
      targetFat,
      targetCarbs,
      goalType
    );

    // 4. Vrati jelo s NAJNIŽIM score-om
    if (score < bestScore) {
      bestScore = score;
      bestMeal = meal;
    }
  }

  return bestMeal;
}


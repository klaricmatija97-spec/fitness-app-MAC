/**
 * PRO Meal Plan Generator - Edamam Only Mode
 * 
 * Varijanta koja koristi SAMO Edamam API kao izvor podataka
 * 
 * PREDNOSTI:
 * - Točniji podaci za kompozitna jela (Edamam analizira cijelo jelo)
 * - Uzima u obzir način pripreme (kuhanje, pečenje, itd.)
 * - Real-time podaci (ažurirani)
 * 
 * NEDOSTACI:
 * - Troškovi: ~$0.001 po pozivu (nakon free tier-a)
 * - Sporije (API pozivi traju ~1-2 sekunde)
 * - Rate limiting: 50 poziva/min
 * - Ovisnost o internet vezi
 * 
 * TROŠKOVI:
 * - Tjedni plan (7 dana, 5 obroka/dan): ~35 poziva = $0.035
 * - Mjesečno (100 planova): ~3,500 poziva = $3.50 (nakon free tier-a)
 * - Free tier: 10,000 poziva/mjesec besplatno
 */

import { analyzeNutritionFromText } from "../services/edamamService";
import { translateFoodName } from "../utils/foodTranslations";
import { mealComponents, type MealComponentsConfig, type GoalType, getMealsForGoal } from "../data/meal_components";

/**
 * Build composite meal using ONLY Edamam API
 * 
 * Ova funkcija koristi Edamam API za izračun makronutrijenata umjesto USDA baze
 */
export async function buildCompositeMealWithEdamamOnly(
  mealComponents: Array<{ food: string; grams: number }>,
  mealName: string,
  targetCalories: number
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  componentDetails: Array<{ foodName: string; grams: number; displayText: string }>;
} | null> {
  if (!process.env.EDAMAM_APP_ID || !process.env.EDAMAM_APP_KEY) {
    throw new Error("Edamam API credentials nisu konfigurirani!");
  }

  // Formiraj tekst sastojaka za Edamam
  const ingredientText = mealComponents
    .filter(c => !c.food.toLowerCase().includes('water') && !c.food.toLowerCase().includes('voda'))
    .map(c => `${c.grams}g ${translateFoodName(c.food)}`)
    .join(", ");

  if (!ingredientText) {
    return null;
  }

  // Dohvati podatke iz Edamam API-ja
  const edamamData = await analyzeNutritionFromText(ingredientText, mealName);

  if (!edamamData) {
    console.warn(`⚠️ Edamam API nije vratio podatke za ${mealName}`);
    return null;
  }

  // Prilagodi gramaže prema target kalorijama ako je potrebno
  let scaleFactor = 1;
  if (targetCalories > 0 && edamamData.calories > 0) {
    scaleFactor = targetCalories / edamamData.calories;
    scaleFactor = Math.max(0.7, Math.min(1.3, scaleFactor)); // Ograniči na ±30%
  }

  // Kreiraj component details s prilagođenim gramažama
  const componentDetails = mealComponents
    .filter(c => !c.food.toLowerCase().includes('water') && !c.food.toLowerCase().includes('voda'))
    .map(c => ({
      foodName: translateFoodName(c.food),
      grams: Math.round(c.grams * scaleFactor * 10) / 10,
      displayText: `${translateFoodName(c.food)} (${Math.round(c.grams * scaleFactor * 10) / 10}g)`,
    }));

  return {
    calories: Math.round(edamamData.calories * scaleFactor),
    protein: Math.round(edamamData.protein * scaleFactor * 10) / 10,
    carbs: Math.round(edamamData.carbs * scaleFactor * 10) / 10,
    fat: Math.round(edamamData.fat * scaleFactor * 10) / 10,
    componentDetails,
  };
}


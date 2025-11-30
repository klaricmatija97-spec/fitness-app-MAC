/**
 * PROVJERA DOSTUPNOSTI JELA
 * 
 * Provjerava ima li dovoljno jela nakon filtriranja za sigurno generiranje plana.
 */

import { getMealTypes, type UserProfile } from "./generator";
import type { Meal } from "./scoring";

/**
 * Meal s tipom obroka - proširena verzija Meal interface-a
 */
export interface MealWithType extends Meal {
  id: string;
  type: string; // breakfast, lunch, dinner, snack, snack1, snack2, snack3
  [key: string]: any;
}

/**
 * Provjerava ima li dovoljno jela nakon filtriranja za generiranje plana.
 * 
 * @param user - Korisnički profil
 * @param filteredMeals - Filtrirana lista jela (nakon primjene alergija/dislikes)
 * @param mealsPerDay - Broj obroka dnevno
 * @returns Lista grešaka (prazna ako ima dovoljno jela)
 */
export function checkMealAvailability(
  user: UserProfile,
  filteredMeals: MealWithType[],
  mealsPerDay: 3 | 4 | 5 | 6
): string[] {
  const errors: string[] = [];

  // 1. Dobij potrebne tipove obroka
  const requiredMealTypes = getMealTypes(mealsPerDay);

  // 2. Izbroji jela po tipu
  const mealsByType: Record<string, number> = {};
  
  for (const meal of filteredMeals) {
    const mealType = meal.type;
    if (mealType) {
      mealsByType[mealType] = (mealsByType[mealType] || 0) + 1;
    }
  }

  // 3. Provjeri svaki potrebni tip obroka
  for (const mealType of requiredMealTypes) {
    const count = mealsByType[mealType] || 0;

    // Ako nema nijednog jela tog tipa
    if (count === 0) {
      errors.push(
        `Nema nijednog jela tipa '${mealType}' nakon primjene alergija i zabrana. Dodajte više jela u bazu ili smanjite restrikcije.`
      );
    }
    // Ako ima manje od 3 jela tog tipa
    else if (count < 3) {
      errors.push(
        `Nema dovoljno jela tipa '${mealType}' za raznolik plan. Potrebno je barem 3 jela tog tipa.`
      );
    }
  }

  // 4. Globalna provjera - ukupan broj jela
  const totalMeals = filteredMeals.length;
  const minRequiredMeals = mealsPerDay * 2;

  if (totalMeals < minRequiredMeals) {
    errors.push(
      `Nema dovoljno jela u bazi za izradu plana uz zadane alergije i zabrane. Dodajte više jela ili smanjite restrikcije.`
    );
  }

  // 5. Vrati listu grešaka
  return errors;
}


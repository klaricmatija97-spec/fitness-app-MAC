/**
 * VALIDACIJA KORISNIČKIH PODATAKA
 * 
 * Provjerava korisničke podatke prije generiranja plana prehrane.
 */

import type { UserProfile } from "./generator";

/**
 * Validira korisničke podatke i vraća listu grešaka.
 * Ako je lista prazna, podaci su valjani.
 * 
 * @param user - Korisnički profil
 * @returns Lista grešaka (prazna ako su podaci valjani)
 */
export function validateUserInput(user: UserProfile): string[] {
  const errors: string[] = [];

  // 1. Provjeri dob (age)
  if (user.age !== undefined && user.age !== null) {
    if (typeof user.age !== "number" || user.age < 16 || user.age > 80) {
      errors.push("Dob mora biti između 16 i 80 godina.");
    }
  }

  // 2. Provjeri visinu (height) - u cm
  if (user.height !== undefined && user.height !== null) {
    if (typeof user.height !== "number" || user.height < 130 || user.height > 230) {
      errors.push("Visina mora biti između 130 i 230 cm.");
    }
  }

  // 3. Provjeri težinu (weight) - u kg
  if (user.weight !== undefined && user.weight !== null) {
    if (typeof user.weight !== "number" || user.weight < 40 || user.weight > 200) {
      errors.push("Težina mora biti između 40 i 200 kg.");
    }
  }

  // 4. Provjeri broj obroka dnevno (meals_per_day)
  if (user.meals_per_day !== undefined && user.meals_per_day !== null) {
    const validMealsPerDay = [3, 4, 5, 6];
    if (!validMealsPerDay.includes(user.meals_per_day)) {
      errors.push("Broj obroka mora biti 3, 4, 5 ili 6.");
    }
  }

  // 5. Provjeri razinu aktivnosti (activityLevel ili activity_level)
  const activityLevel = user.activityLevel || user.activity_level;
  if (activityLevel !== undefined && activityLevel !== null) {
    const validActivityLevels = ["low", "moderate", "high", "very_high"];
    if (typeof activityLevel !== "string" || !validActivityLevels.includes(activityLevel)) {
      errors.push("Razina aktivnosti nije ispravna.");
    }
  }

  // 6. Provjeri cilj (goal ili goalType)
  const goal = user.goal || user.goalType;
  if (goal !== undefined && goal !== null) {
    const validGoals = ["lose_weight", "maintain_weight", "gain_weight"];
    // Također provjeri alternativne vrijednosti (lose, maintain, gain)
    const validGoalAliases = ["lose", "maintain", "gain"];
    
    if (typeof goal === "string") {
      const goalLower = goal.toLowerCase();
      const isValidGoal = validGoals.includes(goalLower) || 
                         validGoalAliases.includes(goalLower) ||
                         goalLower === "lose_weight" || 
                         goalLower === "maintain_weight" || 
                         goalLower === "gain_weight";
      
      if (!isValidGoal) {
        errors.push("Cilj nije ispravno definiran.");
      }
    } else {
      errors.push("Cilj nije ispravno definiran.");
    }
  }

  // 7. Provjeri allergies, dislikes, favorites - moraju biti liste stringova
  const allergies = user.allergies;
  if (allergies !== undefined && allergies !== null) {
    if (!Array.isArray(allergies) || !allergies.every(item => typeof item === "string")) {
      errors.push("Allergies/dislikes/favorites moraju biti liste stringova.");
    }
  }

  const dislikes = user.dislikes;
  if (dislikes !== undefined && dislikes !== null) {
    if (!Array.isArray(dislikes) || !dislikes.every(item => typeof item === "string")) {
      errors.push("Allergies/dislikes/favorites moraju biti liste stringova.");
    }
  }

  const favorites = user.favorites || user.preferredIngredients;
  if (favorites !== undefined && favorites !== null) {
    if (!Array.isArray(favorites) || !favorites.every(item => typeof item === "string")) {
      errors.push("Allergies/dislikes/favorites moraju biti liste stringova.");
    }
  }

  return errors;
}


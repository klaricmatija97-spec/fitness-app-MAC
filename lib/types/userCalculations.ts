/**
 * Tipovi za korisničke kalkulacije
 * 
 * Bez fs modula - samo tipovi i helper funkcije
 */

export interface UserCalculations {
  totalCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  bmr?: number;
  tdee?: number;
  goalType?: "lose" | "maintain" | "gain";
  activityLevel?: string;
}

export interface UserCalculationsClient {
  totalCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  bmr?: number;
  tdee?: number;
  goalType?: "lose" | "maintain" | "gain";
  activityLevel?: string;
}

/**
 * Validiraj kalkulacije
 */
export function validateUserCalculations(calc: Partial<UserCalculations>): calc is UserCalculations {
  return (
    typeof calc.totalCalories === "number" &&
    calc.totalCalories > 0 &&
    typeof calc.proteinGrams === "number" &&
    calc.proteinGrams > 0 &&
    typeof calc.carbGrams === "number" &&
    calc.carbGrams > 0 &&
    typeof calc.fatGrams === "number" &&
    calc.fatGrams > 0
  );
}




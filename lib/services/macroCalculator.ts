/**
 * Macro Calculator Service
 * 
 * Izračunava kalorije i makronutrijente na osnovu korisničkih podataka
 * Koristi Mifflin-St Jeor BMR formulu
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export type Gender = "male" | "female";
export type GoalType = "lose" | "maintain" | "gain";

export interface User {
  age: number;
  gender: Gender;
  weight: number; // u kg
  height: number; // u cm
  activityLevel: number; // 1-5 (1 = sedentary, 5 = very active)
  goal: GoalType; // "lose" | "maintain" | "gain"
}

export interface MacroResult {
  calories: number;
  protein: number; // grami
  carbs: number; // grami
  fat: number; // grami
}

// ============================================
// ACTIVITY LEVEL MULTIPLIERS (1-5)
// ============================================

const ACTIVITY_MULTIPLIERS: Record<number, number> = {
  1: 1.2,   // Sedentary - malo ili nimalo vježbanja
  2: 1.375, // Light - lagano vježbanje 1-3 dana/tjedno
  3: 1.55,  // Moderate - umjereno vježbanje 3-5 dana/tjedno
  4: 1.725, // Active - teško vježbanje 6-7 dana/tjedno
  5: 1.9,   // Very Active - vrlo teško vježbanje, fizički posao
};

// ============================================
// MAIN FUNCTION: calculateMacros
// ============================================

/**
 * Izračunava kalorije i makronutrijente za korisnika
 * 
 * @param user - Korisnički podaci (age, gender, weight, height, activityLevel, goal)
 * @returns MacroResult - Objekt sa calories, protein, carbs, fat
 * 
 * @example
 * const result = calculateMacros({
 *   age: 30,
 *   gender: "male",
 *   weight: 80,
 *   height: 180,
 *   activityLevel: 3,
 *   goal: "lose"
 * });
 */
export function calculateMacros(user: User): MacroResult {
  // 1. Izračunaj BMR koristeći Mifflin-St Jeor formulu
  const bmr = calculateBMR(user.weight, user.height, user.age, user.gender);

  // 2. Pomnoži BMR sa activity level multiplikatorom
  const activityMultiplier = ACTIVITY_MULTIPLIERS[user.activityLevel] || 1.2;
  const tdee = bmr * activityMultiplier;

  // 3. Primijeni goal adjustment
  let targetCalories: number;
  switch (user.goal) {
    case "lose":
      targetCalories = tdee * 0.8; // -20%
      break;
    case "gain":
      targetCalories = tdee * 1.15; // +15%
      break;
    case "maintain":
    default:
      targetCalories = tdee;
      break;
  }

  // 4. Izračunaj makronutrijente
  // Proteini: 2g po kg
  const protein = Math.round(user.weight * 2);

  // Masti: 25% kalorija (1g masti = 9 kalorija)
  const fat = Math.round((targetCalories * 0.25) / 9);

  // Ugljikohidrati: ostatak kalorija
  // (protein * 4) + (carbs * 4) + (fat * 9) = total calories
  // carbs = (total calories - protein * 4 - fat * 9) / 4
  const carbs = Math.round((targetCalories - (protein * 4) - (fat * 9)) / 4);

  // Zaokruži kalorije
  const calories = Math.round(targetCalories);

  return {
    calories,
    protein,
    carbs,
    fat,
  };
}

// ============================================
// HELPER FUNCTION: calculateBMR
// ============================================

/**
 * Izračunava BMR (Basal Metabolic Rate) koristeći Mifflin-St Jeor formulu
 * 
 * Formula:
 * - Muškarci: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
 * - Žene: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
 * 
 * @param weight - Težina u kg
 * @param height - Visina u cm
 * @param age - Dob u godinama
 * @param gender - Spol ("male" | "female")
 * @returns BMR u kalorijama
 */
function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;
  
  if (gender === "male") {
    return baseBMR + 5;
  } else {
    return baseBMR - 161;
  }
}

// ============================================
// EXPORT
// ============================================

export default {
  calculateMacros,
};

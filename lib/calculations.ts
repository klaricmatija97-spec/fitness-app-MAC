// Kalkulatori za kalorije i makroe

export type Gender = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

export interface ClientData {
  age: number;
  gender: Gender;
  weight: number; // u kg
  height: number; // u cm
  activityLevel?: ActivityLevel; // Opcionalno, može se izračunati
  activities: string[]; // Za određivanje activity level
  goals: string[];
}

// BMR (Basal Metabolic Rate) - Mifflin-St Jeor formula
export function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// TDEE (Total Daily Energy Expenditure) - BMR * Activity Multiplier
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2, // Malo ili nimalo vježbanja
    light: 1.375, // Lagano vježbanje 1-3 dana/tjedno
    moderate: 1.55, // Umjereno vježbanje 3-5 dana/tjedno
    active: 1.725, // Teško vježbanje 6-7 dana/tjedno
    very_active: 1.9, // Vrlo teško vježbanje, fizički posao
  };
  
  return Math.round(bmr * multipliers[activityLevel]);
}

// Cilj kalorije ovisno o cilju
export function calculateTargetCalories(tdee: number, goalType: GoalType): number {
  switch (goalType) {
    case "lose":
      return Math.round(tdee - 500); // 500 kalorija manje za gubitak 0.5kg tjedno
    case "gain":
      return Math.round(tdee + 500); // 500 kalorija više za dobivanje
    case "maintain":
    default:
      return Math.round(tdee);
  }
}

// Određivanje cilja na osnovu goals array-a
export function determineGoalType(goals: string[]): GoalType {
  if (goals.includes("lose-fat")) {
    return "lose";
  } else if (goals.includes("gain-muscle")) {
    return "gain";
  } else {
    return "maintain";
  }
}

// Kalkulator makroa ovisno o cilju
export interface Macros {
  protein: number; // grami
  carbs: number; // grami
  fats: number; // grami
}

export function calculateMacros(targetCalories: number, goalType: GoalType, weight: number): Macros {
  let protein: number;
  let carbs: number;
  let fats: number;

  // Proteini: 1.9 do 2.2 grama po kg tjelesne mase (ovisno o cilju)
  switch (goalType) {
    case "lose":
      protein = Math.round(weight * 2.2); // 2.2g po kg za očuvanje mišića tijekom gubitka
      break;
    case "gain":
      protein = Math.round(weight * 2.0); // 2.0g po kg za rast mišića
      break;
    case "maintain":
    default:
      protein = Math.round(weight * 1.9); // 1.9g po kg za održavanje
      break;
  }

  // Masti: 0.8 do 1 gram po kg tjelesne mase
  // Koristimo 0.9g/kg kao srednju vrijednost u rasponu 0.8-1.0g/kg
  fats = Math.round(weight * 0.9);

  // Ostatak kalorija ide u ugljikohidrate
  const proteinCalories = protein * 4;
  const fatsCalories = fats * 9;
  const remainingCalories = targetCalories - proteinCalories - fatsCalories;
  carbs = Math.round(remainingCalories / 4);

  // Osiguraj da carbs nije negativan (ako targetCalories nije dovoljno visok)
  if (carbs < 0) {
    carbs = 0;
  }

  return { protein, carbs, fats };
}

// Aktivnost level na osnovu activities array-a
export function determineActivityLevel(activities: string[]): ActivityLevel {
  const activityCount = activities.length;
  
  if (activityCount === 0) return "sedentary";
  if (activityCount <= 2) return "light";
  if (activityCount <= 4) return "moderate";
  if (activityCount <= 6) return "active";
  return "very_active";
}

// Glavna funkcija za izračun svega
export function calculateAll(clientData: ClientData) {
  const bmr = calculateBMR(
    clientData.weight,
    clientData.height,
    clientData.age,
    clientData.gender
  );
  
  const activityLevel = clientData.activityLevel || determineActivityLevel(clientData.activities);
  const tdee = calculateTDEE(bmr, activityLevel);
  
  const goalType = determineGoalType(clientData.goals);
  const targetCalories = calculateTargetCalories(tdee, goalType);
  
  const macros = calculateMacros(targetCalories, goalType, clientData.weight);
  
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    goalType,
    macros,
    activityLevel,
  };
}


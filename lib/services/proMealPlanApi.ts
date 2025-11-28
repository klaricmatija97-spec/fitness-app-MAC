/**
 * PRO Meal Plan API Client
 * 
 * Frontend API layer za komunikaciju sa PRO meal plan endpointima
 */

// ============================================
// TYPES
// ============================================

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Meal {
  id: string;
  type: "recipe" | "food";
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  score: number;
  scoreBreakdown: {
    calorieMatch: number;
    macroMatch: number;
    healthBonus: number;
    varietyPenalty: number;
    total: number;
  };
  meta: {
    recipe?: any;
    food?: any;
    quantity?: number;
    cuisine?: string | null;
    prepTime?: number | null;
    difficulty?: string | null;
    healthScore?: number | null;
    tags?: string[];
    goalTags?: string[];
    dietTags?: string[];
  };
}

export interface ProMealPlanTotal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  deviation: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    total: number;
  };
}

export interface ProMealPlan {
  date: string;
  clientId: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
  total: ProMealPlanTotal;
}

export interface SwapMealResponse {
  ok: boolean;
  mealType: MealType;
  meal: Meal;
  total?: ProMealPlanTotal;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Dohvati PRO plan prehrane za korisnika
 */
export async function fetchProMealPlan(userId: string): Promise<ProMealPlan> {
  const res = await fetch("/api/meal-plan/pro/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Neuspješno generiranje PRO plana");
  }

  const data = await res.json();

  if (!data.ok || !data.plan) {
    throw new Error(data.message || "API nije vratio plan");
  }

  return data.plan as ProMealPlan;
}

/**
 * Zamijeni određeni obrok u planu
 */
export async function swapMeal(
  userId: string,
  mealType: MealType
): Promise<SwapMealResponse> {
  const res = await fetch("/api/meal-plan/pro/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, mealType }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Neuspješna zamjena obroka");
  }

  const data = await res.json();

  if (!data.ok || !data.meal) {
    throw new Error(data.message || "API nije vratio meal");
  }

  return data as SwapMealResponse;
}


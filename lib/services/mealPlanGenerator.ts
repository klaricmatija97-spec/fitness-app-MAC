/**
 * Meal Plan Generator Service
 * 
 * Generiše dnevni plan prehrane na temelju baze foods, recipes i korisničkih kalkulacija
 * Distribuira kalorije i makronutrijente kroz obroke (doručak, ručak, večera, užine)
 */

import { createServiceClient } from "@/lib/supabase";
import { getRecipes, getFoods } from "@/lib/db/queries";
import type { Recipe, Food } from "@/lib/db/models";

const supabase = createServiceClient();

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ClientCalculations {
  client_id: string;
  bmr: number;
  tdee: number;
  target_calories: number;
  goal_type: "lose" | "maintain" | "gain";
  protein_grams: number;
  carbs_grams: number;
  fats_grams: number;
}

export interface MealItem {
  id: string;
  name: string;
  type: "recipe" | "food";
  quantity: number; // grami za food, ili portion size za recipe
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipe_id?: string; // ako je recipe
  food_id?: string; // ako je food
}

export interface DailyMeal {
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snacks: MealItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface DailyMealPlan {
  date: string; // ISO date string
  meals: DailyMeal;
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Dohvati korisničke kalkulacije iz Supabase
 */
async function getClientCalculations(clientId: string): Promise<ClientCalculations | null> {
  try {
    const { data, error } = await supabase
      .from("client_calculations")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No rows found
      }
      throw error;
    }

    return {
      client_id: data.client_id,
      bmr: parseFloat(data.bmr),
      tdee: parseFloat(data.tdee),
      target_calories: parseFloat(data.target_calories),
      goal_type: data.goal_type,
      protein_grams: parseFloat(data.protein_grams),
      carbs_grams: parseFloat(data.carbs_grams),
      fats_grams: parseFloat(data.fats_grams),
    };
  } catch (error) {
    console.error("Error fetching client calculations:", error);
    throw error;
  }
}

/**
 * Izračunaj makronutrijente za količinu namirnice u gramima
 */
function calculateFoodMacros(food: Food, grams: number) {
  const ratio = grams / 100;
  return {
    calories: Math.round((food.calories_per_100g * ratio) * 10) / 10,
    protein: Math.round((food.protein_per_100g * ratio) * 10) / 10,
    carbs: Math.round((food.carbs_per_100g * ratio) * 10) / 10,
    fat: Math.round((food.fat_per_100g * ratio) * 10) / 10,
  };
}

/**
 * Izračunaj makronutrijente za recept sa skaliranjem
 */
function calculateRecipeMacros(recipe: Recipe, scaleFactor: number = 1) {
  return {
    calories: Math.round((recipe.total_calories * scaleFactor) * 10) / 10,
    protein: Math.round((recipe.total_protein * scaleFactor) * 10) / 10,
    carbs: Math.round((recipe.total_carbs * scaleFactor) * 10) / 10,
    fat: Math.round((recipe.total_fat * scaleFactor) * 10) / 10,
  };
}

/**
 * Dodaj makronutrijente
 */
function addMacros(macro1: { calories: number; protein: number; carbs: number; fat: number }, macro2: { calories: number; protein: number; carbs: number; fat: number }) {
  return {
    calories: macro1.calories + macro2.calories,
    protein: macro1.protein + macro2.protein,
    carbs: macro1.carbs + macro2.carbs,
    fat: macro1.fat + macro2.fat,
  };
}

/**
 * Izračunaj razliku između target i current makroa
 */
function getMacroDifference(
  target: { calories: number; protein: number; carbs: number; fat: number },
  current: { calories: number; protein: number; carbs: number; fat: number }
) {
  return {
    calories: target.calories - current.calories,
    protein: target.protein - current.protein,
    carbs: target.carbs - current.carbs,
    fat: target.fat - current.fat,
  };
}

/**
 * Distribucija kalorija kroz obroke (prema cilju)
 */
function getMealDistribution(goalType: "lose" | "maintain" | "gain") {
  // Standardna distribucija: doručak 25%, ručak 35%, večera 30%, užine 10%
  // Za lose: manje ugljikohidrata navečer, više proteina
  // Za gain: više ugljikohidrata kroz dan
  
  if (goalType === "lose") {
    return {
      breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
      lunch: { calories: 0.35, protein: 0.35, carbs: 0.40, fat: 0.35 },
      dinner: { calories: 0.25, protein: 0.30, carbs: 0.20, fat: 0.30 },
      snacks: { calories: 0.15, protein: 0.10, carbs: 0.10, fat: 0.10 },
    };
  } else if (goalType === "gain") {
    return {
      breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.20 },
      lunch: { calories: 0.30, protein: 0.30, carbs: 0.35, fat: 0.30 },
      dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.35 },
      snacks: { calories: 0.15, protein: 0.15, carbs: 0.10, fat: 0.15 },
    };
  } else {
    // maintain - uravnoteženo
    return {
      breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
      lunch: { calories: 0.35, protein: 0.35, carbs: 0.35, fat: 0.35 },
      dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.30 },
      snacks: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 },
    };
  }
}

/**
 * Generiše dnevni plan prehrane za korisnika
 * 
 * @param clientId - UUID korisnika
 * @returns Promise<DailyMealPlan> - Dnevni plan prehrane
 * 
 * @example
 * const plan = await generateDailyMealPlanForClient("client-uuid");
 */
export async function generateDailyMealPlanForClient(
  clientId: string
): Promise<DailyMealPlan> {
  try {
    // 1. Dohvati korisničke kalkulacije
    const calculations = await getClientCalculations(clientId);
    if (!calculations) {
      throw new Error(`Nisu pronađene kalkulacije za korisnika ${clientId}`);
    }

    // 2. Dohvati recepte i namirnice iz baze
    const recipes = await getRecipes();
    const foods = await getFoods();

    if (recipes.length === 0 && foods.length === 0) {
      throw new Error("Baza namirnica i recepata je prazna. Molimo dodajte namirnice i recepte.");
    }

    // 3. Definiraj target makroe
    const targetMacros = {
      calories: calculations.target_calories,
      protein: calculations.protein_grams,
      carbs: calculations.carbs_grams,
      fat: calculations.fats_grams,
    };

    // 4. Dohvati distribuciju kalorija po obrocima
    const mealDistribution = getMealDistribution(calculations.goal_type);

    // 5. Generiši plan za svaki obrok
    const dailyMeal: DailyMeal = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };

    // ============================================
    // DORUČAK (Breakfast)
    // ============================================
    const breakfastTarget = {
      calories: Math.round(targetMacros.calories * mealDistribution.breakfast.calories),
      protein: Math.round(targetMacros.protein * mealDistribution.breakfast.protein * 10) / 10,
      carbs: Math.round(targetMacros.carbs * mealDistribution.breakfast.carbs * 10) / 10,
      fat: Math.round(targetMacros.fat * mealDistribution.breakfast.fat * 10) / 10,
    };

    dailyMeal.breakfast = await generateMeal(
      "breakfast",
      breakfastTarget,
      recipes,
      foods,
      calculations.goal_type
    );

    // Izračunaj trenutne makroe doručka
    let breakfastTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dailyMeal.breakfast.forEach((item) => {
      breakfastTotals = addMacros(breakfastTotals, {
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      });
    });

    // ============================================
    // RUČAK (Lunch)
    // ============================================
    const lunchTarget = {
      calories: Math.round(targetMacros.calories * mealDistribution.lunch.calories),
      protein: Math.round(targetMacros.protein * mealDistribution.lunch.protein * 10) / 10,
      carbs: Math.round(targetMacros.carbs * mealDistribution.lunch.carbs * 10) / 10,
      fat: Math.round(targetMacros.fat * mealDistribution.lunch.fat * 10) / 10,
    };

    dailyMeal.lunch = await generateMeal(
      "lunch",
      lunchTarget,
      recipes,
      foods,
      calculations.goal_type
    );

    // Izračunaj trenutne makroe ručka
    let lunchTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dailyMeal.lunch.forEach((item) => {
      lunchTotals = addMacros(lunchTotals, {
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      });
    });

    // ============================================
    // VEČERA (Dinner)
    // ============================================
    const dinnerTarget = {
      calories: Math.round(targetMacros.calories * mealDistribution.dinner.calories),
      protein: Math.round(targetMacros.protein * mealDistribution.dinner.protein * 10) / 10,
      carbs: Math.round(targetMacros.carbs * mealDistribution.dinner.carbs * 10) / 10,
      fat: Math.round(targetMacros.fat * mealDistribution.dinner.fat * 10) / 10,
    };

    dailyMeal.dinner = await generateMeal(
      "dinner",
      dinnerTarget,
      recipes,
      foods,
      calculations.goal_type
    );

    // Izračunaj trenutne makroe večere
    let dinnerTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dailyMeal.dinner.forEach((item) => {
      dinnerTotals = addMacros(dinnerTotals, {
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      });
    });

    // ============================================
    // UŽINE (Snacks)
    // ============================================
    const snacksTarget = {
      calories: Math.round(targetMacros.calories * mealDistribution.snacks.calories),
      protein: Math.round(targetMacros.protein * mealDistribution.snacks.protein * 10) / 10,
      carbs: Math.round(targetMacros.carbs * mealDistribution.snacks.carbs * 10) / 10,
      fat: Math.round(targetMacros.fat * mealDistribution.snacks.fat * 10) / 10,
    };

    dailyMeal.snacks = await generateMeal(
      "snacks",
      snacksTarget,
      recipes,
      foods,
      calculations.goal_type
    );

    // Izračunaj trenutne makroe užina
    let snacksTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dailyMeal.snacks.forEach((item) => {
      snacksTotals = addMacros(snacksTotals, {
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      });
    });

    // ============================================
    // IZRAČUNAJ UKUPNE MAKROE
    // ============================================
    dailyMeal.totals = addMacros(
      addMacros(breakfastTotals, lunchTotals),
      addMacros(dinnerTotals, snacksTotals)
    );

    // Vrati dnevni plan
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    return {
      date: today,
      meals: dailyMeal,
      dailyTotals: dailyMeal.totals,
    };
  } catch (error) {
    console.error("Error generating daily meal plan:", error);
    throw error;
  }
}

/**
 * Generiše plan za određeni obrok (doručak, ručak, večera, užine)
 */
async function generateMeal(
  mealType: "breakfast" | "lunch" | "dinner" | "snacks",
  target: { calories: number; protein: number; carbs: number; fat: number },
  recipes: Recipe[],
  foods: Food[],
  goalType: "lose" | "maintain" | "gain"
): Promise<MealItem[]> {
  const mealItems: MealItem[] = [];
  let currentMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const tolerance = 0.1; // 10% tolerancija

  // Filtriraj recepte po meal type tagovima
  const mealTagMap: Record<string, string> = {
    breakfast: "doručak",
    lunch: "ručak",
    dinner: "večera",
    snacks: "užina",
  };

  const mealTag = mealTagMap[mealType];
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.tags.includes(mealTag)
  );

  // Prioritiziraj recepte ako postoje
  if (filteredRecipes.length > 0) {
    // Pokušaj dodati 1-2 recepta
    const maxRecipes = mealType === "snacks" ? 1 : 2;
    let recipesAdded = 0;

    for (const recipe of filteredRecipes.slice(0, 5)) {
      if (recipesAdded >= maxRecipes) break;

      const recipeMacros = calculateRecipeMacros(recipe, 1);
      const newTotals = addMacros(currentMacros, recipeMacros);

      // Provjeri da li dodavanje recepta ne prelazi target previše
      if (
        newTotals.calories <= target.calories * (1 + tolerance) &&
        newTotals.protein <= target.protein * (1 + tolerance) &&
        newTotals.carbs <= target.carbs * (1 + tolerance) &&
        newTotals.fat <= target.fat * (1 + tolerance)
      ) {
        // Dodaj recept u plan
        mealItems.push({
          id: recipe.id,
          name: recipe.name,
          type: "recipe",
          quantity: 1, // 1 portion
          calories: recipeMacros.calories,
          protein: recipeMacros.protein,
          carbs: recipeMacros.carbs,
          fat: recipeMacros.fat,
          recipe_id: recipe.id,
        });

        currentMacros = newTotals;
        recipesAdded++;
      }
    }
  }

  // Ako nema recepta ili treba dopuniti, dodaj namirnice
  const remaining = getMacroDifference(target, currentMacros);

  // Dodaj namirnice dok ne postignemo target (ili blizu)
  if (
    remaining.calories > 50 ||
    remaining.protein > 5 ||
    remaining.carbs > 5 ||
    remaining.fat > 2
  ) {
    // Filtriraj namirnice po meal type (opcionalno)
    const suitableFoods = foods.filter((food) => {
      // Za doručak: jaja, žitarice, voće, mliječni proizvodi
      if (mealType === "breakfast") {
        return (
          food.category === "jaja" ||
          food.category === "žitarice" ||
          food.category === "mliječni proizvodi" ||
          food.tags.includes("breakfast") ||
          food.tags.includes("doručak")
        );
      }
      // Za ručak: meso, povrće, žitarice
      if (mealType === "lunch") {
        return (
          food.category === "meso" ||
          food.category === "povrće" ||
          food.category === "žitarice" ||
          food.tags.includes("lunch") ||
          food.tags.includes("ručak")
        );
      }
      // Za večeru: meso, povrće, morski plodovi
      if (mealType === "dinner") {
        return (
          food.category === "meso" ||
          food.category === "morski plodovi" ||
          food.category === "povrće" ||
          food.tags.includes("dinner") ||
          food.tags.includes("večera")
        );
      }
      // Za užine: voće, orašasti plodovi
      if (mealType === "snacks") {
        return (
          food.category === "voće" ||
          food.category === "orašasti plodovi" ||
          food.tags.includes("snack") ||
          food.tags.includes("užina")
        );
      }
      return true; // Ako nema filtera, koristi sve
    });

    // Dodaj namirnice iterativno
    for (const food of suitableFoods.slice(0, 10)) {
      // Izračunaj optimalnu količinu (grami) bazirano na preostalim proteinima
      const proteinRatio = remaining.protein / food.protein_per_100g;
      const carbsRatio = remaining.carbs / food.carbs_per_100g;
      const caloriesRatio = remaining.calories / food.calories_per_100g;

      // Koristi srednju vrijednost između omjera
      const avgRatio = (proteinRatio + carbsRatio + caloriesRatio) / 3;
      let grams = Math.round(avgRatio * 100);

      // Limitiraj količinu (min 20g, max 500g po namirnici)
      grams = Math.max(20, Math.min(500, grams));

      const foodMacros = calculateFoodMacros(food, grams);
      const newTotals = addMacros(currentMacros, foodMacros);

      // Provjeri da li dodavanje ne prelazi target previše
      if (
        newTotals.calories <= target.calories * (1 + tolerance * 2) &&
        newTotals.protein <= target.protein * (1 + tolerance * 2)
      ) {
        mealItems.push({
          id: food.id,
          name: food.name,
          type: "food",
          quantity: grams,
          calories: foodMacros.calories,
          protein: foodMacros.protein,
          carbs: foodMacros.carbs,
          fat: foodMacros.fat,
          food_id: food.id,
        });

        currentMacros = newTotals;
        remaining.calories -= foodMacros.calories;
        remaining.protein -= foodMacros.protein;
        remaining.carbs -= foodMacros.carbs;
        remaining.fat -= foodMacros.fat;

        // Ako smo blizu targeta, zaustavi
        if (
          Math.abs(remaining.calories) < target.calories * tolerance &&
          Math.abs(remaining.protein) < target.protein * tolerance
        ) {
          break;
        }
      }
    }
  }

  return mealItems;
}

// ============================================
// SAVE FUNCTION: saveDailyMealPlanToSupabase
// ============================================

/**
 * Spremi generirani dnevni plan prehrane u Supabase tablicu meal_plans
 * 
 * Napomena: meal_plans tablica očekuje tjedni plan (7 dana).
 * Ova funkcija sprema dnevni plan kao tjedni plan (isti dan se ponavlja 7 puta).
 * 
 * @param clientId - UUID klijenta
 * @param plan - Generirani dnevni plan prehrane
 * @returns Promise<Record<string, any>> - Spremljeni zapis iz meal_plans
 * 
 * @example
 * const savedPlan = await saveDailyMealPlanToSupabase(clientId, plan);
 */
export async function saveDailyMealPlanToSupabase(
  clientId: string,
  plan: DailyMealPlan
): Promise<Record<string, any>> {
  try {
    // meal_plans tablica očekuje tjedni plan (array od 7 dana)
    // Stvaramo tjedni plan tako da ponavljamo isti dan 7 puta
    const weekPlan = Array(7).fill(plan.meals);

    // Izračunaj ukupne makroe (za jedan dan, ali koristimo za cijeli tjedan)
    const totalCalories = plan.dailyTotals.calories * 7;
    const totalProtein = plan.dailyTotals.protein * 7;
    const totalCarbs = plan.dailyTotals.carbs * 7;
    const totalFats = plan.dailyTotals.fat * 7;

    // Odredi tjedan start date (ponedjeljak)
    const today = new Date(plan.date);
    const dayOfWeek = today.getDay(); // 0 = nedjelja, 1 = ponedjeljak, ...
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ako je nedjelja, vrati se 6 dana unazad
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + daysToMonday);
    const weekStartDate = weekStart.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Spremi u bazu
    const { data, error } = await supabase
      .from("meal_plans")
      .insert({
        client_id: clientId,
        week_start_date: weekStartDate,
        meals: weekPlan, // Array od 7 dana (isti dan ponavljan 7 puta)
        total_calories: Math.round(totalCalories),
        total_protein: Math.round(totalProtein),
        total_carbs: Math.round(totalCarbs),
        total_fats: Math.round(totalFats),
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving meal plan to Supabase:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in saveDailyMealPlanToSupabase:", error);
    throw error;
  }
}

// ============================================
// EXPORT
// ============================================

export default {
  generateDailyMealPlanForClient,
  saveDailyMealPlanToSupabase,
};

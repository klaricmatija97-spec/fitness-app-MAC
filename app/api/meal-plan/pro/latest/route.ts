/**
 * GET /api/meal-plan/pro/latest
 * 
 * Dohvaća zadnji spremljeni PRO plan prehrane za klijenta
 * 
 * Query: userId (UUID)
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod";
import { findNamirnica, calculateMacrosForGrams } from "@/lib/data/foods-database";
import mealComponentsData from "@/lib/data/meal_components.json";

// Helper funkcija za recalkulaciju makroa ako su 0
function recalculateMealMacros(meal: any): any {
  if (!meal || !meal.totals) return meal;
  
  // Ako totals.calories nije 0, vrati originalni meal
  if (meal.totals.calories > 0) return meal;
  
  // Pokušaj pronaći recept iz meal_components.json po imenu
  const allMeals = [
    ...(mealComponentsData.breakfast || []),
    ...(mealComponentsData.lunch || []),
    ...(mealComponentsData.dinner || []),
    ...(mealComponentsData.snack || []),
  ];
  
  const recipe = allMeals.find((m: any) => m.name === meal.name);
  if (!recipe || !recipe.components) {
    console.warn(`[recalculateMealMacros] Recept nije pronađen za: ${meal.name}`);
    return meal;
  }
  
  // Izračunaj makroe iz komponenti
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  
  const recalculatedComponents = recipe.components.map((comp: any) => {
    const namirnica = findNamirnica(comp.food);
    if (!namirnica) {
      console.warn(`[recalculateMealMacros] Namirnica nije pronađena: ${comp.food}`);
      return {
        name: comp.displayName || comp.food,
        grams: comp.grams,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }
    
    const macros = calculateMacrosForGrams(namirnica, comp.grams);
    totalCalories += macros.calories;
    totalProtein += macros.protein;
    totalCarbs += macros.carbs;
    totalFat += macros.fat;
    
    return {
      name: comp.displayName || comp.food,
      grams: comp.grams,
      calories: Math.round(macros.calories),
      protein: Math.round(macros.protein * 10) / 10,
      carbs: Math.round(macros.carbs * 10) / 10,
      fat: Math.round(macros.fat * 10) / 10,
    };
  });
  
  console.log(`[recalculateMealMacros] Recalkulirano za "${meal.name}": ${Math.round(totalCalories)} kcal`);
  
  return {
    ...meal,
    components: recalculatedComponents,
    totals: {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    },
  };
}

// Helper za recalkulaciju svih obroka u danu
function recalculateDayMeals(day: any): any {
  if (!day || !day.meals) return day;
  
  const recalculatedMeals: any = {};
  let dailyCalories = 0;
  let dailyProtein = 0;
  let dailyCarbs = 0;
  let dailyFat = 0;
  
  for (const [mealType, meal] of Object.entries(day.meals)) {
    const recalculated = recalculateMealMacros(meal);
    recalculatedMeals[mealType] = recalculated;
    
    if (recalculated?.totals) {
      dailyCalories += recalculated.totals.calories || 0;
      dailyProtein += recalculated.totals.protein || 0;
      dailyCarbs += recalculated.totals.carbs || 0;
      dailyFat += recalculated.totals.fat || 0;
    }
  }
  
  return {
    ...day,
    meals: recalculatedMeals,
    dailyTotals: {
      calories: Math.round(dailyCalories),
      protein: Math.round(dailyProtein * 10) / 10,
      carbs: Math.round(dailyCarbs * 10) / 10,
      fat: Math.round(dailyFat * 10) / 10,
    },
  };
}

const querySchema = z.object({
  userId: z.string().uuid("userId mora biti validan UUID"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Validiraj userId
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "userId je obavezan query parametar",
        },
        { status: 400 }
      );
    }

    const validatedData = querySchema.parse({ userId });

    const supabase = createServiceClient();

    // Dohvati zadnji PRO plan prehrane za klijenta
    const { data, error } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("client_id", validatedData.userId)
      .eq("plan_type", "pro")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // Ako nema zapisa
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          message: "Nije pronađen PRO plan prehrane za ovog klijenta",
        },
        { status: 404 }
      );
    }

    // POBOLJŠANJE: Recalkuliraj makroe za obroke koji imaju 0 kalorija
    let planData = data;
    if (data.meals && Array.isArray(data.meals)) {
      let hasZeroCalorieMeals = false;
      
      // Provjeri da li postoje obroci s 0 kalorija
      for (const day of data.meals) {
        if (day?.meals) {
          for (const meal of Object.values(day.meals)) {
            if ((meal as any)?.totals?.calories === 0) {
              hasZeroCalorieMeals = true;
              break;
            }
          }
        }
        if (hasZeroCalorieMeals) break;
      }
      
      // Ako postoje obroci s 0 kalorija, recalkuliraj
      if (hasZeroCalorieMeals) {
        console.log(`[meal-plan/pro/latest] Pronađeni obroci s 0 kalorija, recalkuliram...`);
        const recalculatedDays = data.meals.map((day: any) => recalculateDayMeals(day));
        planData = {
          ...data,
          meals: recalculatedDays,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      plan: planData,
    });
  } catch (error) {
    console.error("[meal-plan/pro/latest] error:", error);

    // Ako je validacijska greška
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Neispravni podaci",
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    // Opća greška
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Greška pri dohvaćanju PRO plana prehrane",
      },
      { status: 500 }
    );
  }
}


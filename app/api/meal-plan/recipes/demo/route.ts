/**
 * API Route: GET /api/meal-plan/recipes/demo
 * 
 * Demo endpoint - generira plan s demo podacima (bez potrebe za bazom)
 */

import { NextResponse } from "next/server";
import { searchRecipes } from "@/lib/services/edamamRecipeService";

export async function GET() {
  try {
    console.log("🚀 Demo Recipe Plan Generator...");

    // Demo targets
    const targets = {
      calories: 2200,
      protein: 165,
      carbs: 220,
      fat: 73,
    };

    // Generiraj jedan dan kao demo
    const meals = [];

    // Doručak (~25% = 550 kcal)
    const breakfastRecipes = await searchRecipes({
      query: "eggs protein breakfast",
      mealType: "Breakfast",
      diet: "high-protein",
      calories: { min: 400, max: 650 },
      limit: 3,
    });

    if (breakfastRecipes.length > 0) {
      meals.push({
        slot: "Doručak",
        recipe: breakfastRecipes[0],
      });
    }

    // Ručak (~35% = 770 kcal)
    const lunchRecipes = await searchRecipes({
      query: "chicken breast lunch",
      mealType: "Lunch",
      diet: "high-protein",
      calories: { min: 600, max: 900 },
      limit: 3,
    });

    if (lunchRecipes.length > 0) {
      meals.push({
        slot: "Ručak",
        recipe: lunchRecipes[0],
      });
    }

    // Večera (~30% = 660 kcal)
    const dinnerRecipes = await searchRecipes({
      query: "salmon dinner healthy",
      mealType: "Dinner",
      diet: "high-protein",
      calories: { min: 500, max: 800 },
      limit: 3,
    });

    if (dinnerRecipes.length > 0) {
      meals.push({
        slot: "Večera",
        recipe: dinnerRecipes[0],
      });
    }

    // Užina (~10% = 220 kcal)
    const snackRecipes = await searchRecipes({
      query: "greek yogurt protein snack",
      mealType: "Snack",
      calories: { min: 150, max: 300 },
      limit: 3,
    });

    if (snackRecipes.length > 0) {
      meals.push({
        slot: "Užina",
        recipe: snackRecipes[0],
      });
    }

    // Izračunaj totale
    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.recipe.calories,
        protein: acc.protein + m.recipe.protein,
        carbs: acc.carbs + m.recipe.carbs,
        fat: acc.fat + m.recipe.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return NextResponse.json({
      success: true,
      message: "Demo dnevni plan s receptima",
      targets,
      totals,
      meals: meals.map(m => ({
        slot: m.slot,
        name: m.recipe.name,
        image: m.recipe.image,
        calories: m.recipe.calories,
        protein: m.recipe.protein,
        carbs: m.recipe.carbs,
        fat: m.recipe.fat,
        ingredients: m.recipe.ingredients.slice(0, 5),
        source: m.recipe.source,
      })),
    });

  } catch (error) {
    console.error("Demo error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}


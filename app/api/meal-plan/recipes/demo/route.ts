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

    // Doručak - jednostavniji query
    const breakfastRecipes = await searchRecipes({
      query: "scrambled eggs bacon",
      random: true,
      limit: 10,
    });

    console.log(`Breakfast recipes found: ${breakfastRecipes.length}`);
    
    if (breakfastRecipes.length > 0) {
      const filtered = breakfastRecipes.filter(r => r.calories >= 250 && r.calories <= 800);
      meals.push({
        slot: "Doručak",
        recipe: filtered[0] || breakfastRecipes[0],
      });
    }

    // Ručak
    const lunchRecipes = await searchRecipes({
      query: "grilled chicken salad",
      mealType: "Lunch",
      diet: "high-protein",
      random: true,
      limit: 5,
    });

    if (lunchRecipes.length > 0) {
      const filtered = lunchRecipes.filter(r => r.calories >= 400 && r.calories <= 900);
      meals.push({
        slot: "Ručak",
        recipe: filtered[0] || lunchRecipes[0],
      });
    }

    // Večera
    const dinnerRecipes = await searchRecipes({
      query: "salmon lemon dinner",
      mealType: "Dinner",
      diet: "high-protein",
      random: true,
      limit: 5,
    });

    if (dinnerRecipes.length > 0) {
      const filtered = dinnerRecipes.filter(r => r.calories >= 350 && r.calories <= 800);
      meals.push({
        slot: "Večera",
        recipe: filtered[0] || dinnerRecipes[0],
      });
    }

    // Užina
    const snackRecipes = await searchRecipes({
      query: "greek yogurt berries",
      mealType: "Snack",
      random: true,
      limit: 5,
    });

    if (snackRecipes.length > 0) {
      const filtered = snackRecipes.filter(r => r.calories >= 100 && r.calories <= 350);
      meals.push({
        slot: "Užina",
        recipe: filtered[0] || snackRecipes[0],
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


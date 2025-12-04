/**
 * API Route: GET /api/recipes/test
 * 
 * Testira Edamam Recipe Search API
 */

import { NextResponse } from "next/server";
import { searchRecipes, testRecipeApi } from "@/lib/services/edamamRecipeService";

export async function GET() {
  try {
    console.log("🧪 Testing Recipe Search API...");
    
    // Test pretraga
    const results = await searchRecipes({
      query: "grilled chicken breast",
      mealType: "Lunch",
      diet: "high-protein",
      calories: { min: 300, max: 600 },
      limit: 3,
    });

    if (results.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Recipe Search API radi!",
        count: results.length,
        recipes: results.map(r => ({
          name: r.name,
          image: r.image,
          calories: r.calories,
          protein: r.protein,
          carbs: r.carbs,
          fat: r.fat,
          totalWeight: r.totalWeight,
          ingredientsWithGrams: r.ingredientsWithGrams?.slice(0, 5),
          ingredients: r.ingredients.slice(0, 5),
          source: r.source,
        })),
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Recipe API nije vratio rezultate",
        hint: "Provjeri EDAMAM_RECIPE_APP_ID i EDAMAM_RECIPE_APP_KEY u .env.local",
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Recipe test error:", error);
    return NextResponse.json({
      success: false,
      message: "Greška pri testiranju Recipe API",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

